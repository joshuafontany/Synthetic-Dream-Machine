/**
 * `lares act <VERB> [flags...]` — Residency Model ACTION verb operator surface.
 *
 * VERB ∈ { ADD, COPY, MOVE, CLEAR, DROP, LOAD }
 *
 * Args per verb (kebab-case CLI flags):
 *
 *   ADD / COPY / MOVE
 *     --title <t>       tiddler title (Work-level identity)
 *     --from <bag>      source bag URI
 *     --to <bag>        destination bag URI
 *     --change-id <id>  (optional) explicit change-id; defaults to newChangeId()
 *
 *   CLEAR / DROP
 *     --bag <bag>       target bag URI
 *
 *   LOAD
 *     --source-uri <u>  external content source (https://... etc.)
 *     --to <bag>        destination bag URI
 *     --change-id <id>  (optional) explicit change-id; defaults to newChangeId()
 *
 * Common flags:
 *   --yes             skip confirmation prompt
 *   --port <n>        admin daemon port
 *
 * Each invocation submits a verb-tiddler to the admin vessel; the wiki island's
 * action-handler family executes the residency mutation wrapped in
 * withEffectRecord (writes the archival audit tiddlers).
 *
 * Sprint:  Residency Model Epic — S5.4
 * Meme:    lar:///ha.ka.ba/@lares/v0.1/api/lararium/residency-model
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { join } from "node:path";
import { loadOperatorVerifyingKey } from "@lararium/node";
import { repoRoot } from "@lararium/mesh/node";
import { ACTION_VERBS, isActionVerb, isTransferVerb, isBagVerb, newChangeId } from "@lararium/mesh";
import { connectAdminVessel, submitVerb, summaryOutput } from "../admin-connector.js";
import type { ParsedArgs } from "../parse-args.js";

async function operatorDid(): Promise<string> {
  const dataDir = join(repoRoot, "packages", "lararium-node", ".lararium");
  return "0x" + (await loadOperatorVerifyingKey(dataDir));
}

function printUsage(): void {
  console.error("usage: lares act <VERB> [flags...]");
  console.error("");
  console.error(`  VERB ∈ { ${ACTION_VERBS.join(", ")} }`);
  console.error("");
  console.error("  ADD / COPY / MOVE  --title <t> --from <bag> --to <bag> [--change-id <id>]");
  console.error("  CLEAR / DROP       --bag <bag>");
  console.error("  LOAD               --source-uri <u> --to <bag> [--change-id <id>]");
  console.error("");
  console.error("  --yes              skip confirmation prompt");
  console.error("  --port <n>         admin daemon port");
}

export async function cmdAct(args: ParsedArgs): Promise<number> {
  const verbRaw = args.positional[0];
  if (!verbRaw) { printUsage(); return 2; }
  if (!isActionVerb(verbRaw)) {
    console.error(`lares act: "${verbRaw}" is not an ACTION verb`);
    console.error(`  ACTION verbs: ${ACTION_VERBS.join(", ")}`);
    return 2;
  }
  const verb = verbRaw;

  // Build the kebab-case args bag per residency-actions encoding.
  const actionArgs: Record<string, string> = {};
  if (isTransferVerb(verb)) {
    const title    = args.options["title"];
    const fromBag  = args.options["from"];
    const toBag    = args.options["to"];
    const changeId = args.options["change-id"] ?? newChangeId();
    if (!title || !fromBag || !toBag) {
      console.error(`lares act ${verb}: --title, --from, --to all required`);
      return 2;
    }
    actionArgs["title"]      = title;
    actionArgs["from-bag"]   = fromBag;
    actionArgs["to-bag"]     = toBag;
    actionArgs["change-id"]  = changeId;
  } else if (isBagVerb(verb)) {
    const bag = args.options["bag"];
    if (!bag) {
      console.error(`lares act ${verb}: --bag required`);
      return 2;
    }
    actionArgs["bag"] = bag;
  } else {
    // verb === "LOAD"
    const sourceUri = args.options["source-uri"];
    const toBag     = args.options["to"];
    const changeId  = args.options["change-id"] ?? newChangeId();
    if (!sourceUri || !toBag) {
      console.error(`lares act LOAD: --source-uri and --to required`);
      return 2;
    }
    actionArgs["source-uri"] = sourceUri;
    actionArgs["to-bag"]     = toBag;
    actionArgs["change-id"]  = changeId;
  }

  // ── Connect to the admin vessel ───────────────────────────────────────
  const portOpt = args.options["port"];
  const connectOpts: Parameters<typeof connectAdminVessel>[0] = portOpt
    ? { port: Number(portOpt) }
    : {};

  let did: string;
  try {
    did = await operatorDid();
  } catch (err) {
    console.error(`lares act: ${err instanceof Error ? err.message : String(err)}`);
    return 3;
  }

  let vessel;
  try {
    vessel = await connectAdminVessel(connectOpts);
  } catch (err) {
    console.error(`lares act: ${err instanceof Error ? err.message : String(err)}`);
    console.error("  Start the daemon with `lares serve` and try again.");
    return 3;
  }

  // ── Confirm + submit ──────────────────────────────────────────────────
  try {
    console.log("");
    console.log(`  ${verb}`);
    for (const [k, v] of Object.entries(actionArgs)) {
      console.log(`    ${k.padEnd(12)} ${v}`);
    }
    console.log("");

    if (!args.flags["yes"]) {
      const rl = createInterface({ input: stdin, output: stdout });
      const answer = await rl.question("Proceed? [y/N] ");
      rl.close();
      if (!/^y(es)?$/i.test(answer.trim())) {
        console.log("aborted");
        return 1;
      }
    }

    const result = await submitVerb(vessel, verb, actionArgs, did);
    if (result.status === "error") {
      console.error(`${verb} failed: ${result.errorMessage ?? "unknown"}`);
      return 4;
    }

    const summary = summaryOutput(result) ?? {};
    console.log(`${verb} done`);
    for (const [k, v] of Object.entries(summary)) {
      console.log(`  ${k.padEnd(12)} ${typeof v === "string" ? v : JSON.stringify(v)}`);
    }
    console.log(`  audit:       lar:///ha.ka.ba/@admin/outcomes/${result.requestId}`);
    return 0;
  } finally {
    await vessel.disconnect();
  }
}
