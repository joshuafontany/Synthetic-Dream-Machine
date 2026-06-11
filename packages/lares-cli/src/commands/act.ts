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
 * Meme:    lar:///ha.ka.ba/@lararium/v0.1/api/residency-model
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { join } from "node:path";
import { statSync, readdirSync, readFileSync } from "node:fs";
import { loadOperatorVerifyingKey } from "@lararium/node";
import { repoRoot } from "@lararium/mesh/node";
import { ACTION_VERBS, isActionVerb, isTransferVerb, isBagVerb, newChangeId, taskContentId } from "@lararium/mesh";
import { connectAdminVessel, submitVerb, summaryOutput } from "../admin-connector.js";
import { emit, wantsJson } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

async function operatorDid(): Promise<string> {
  const larRoot = process.env["LAR_ROOT"] ?? join(repoRoot, "packages", "lararium-node");
  return "0x" + (await loadOperatorVerifyingKey(join(larRoot, ".lararium")));
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
  const actionArgs: Record<string, unknown> = {};
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

    // The disk grant lives HERE — the operator gesture reads the carriers and
    // sends content WITH the verb (islands hold no fetch capability). A local
    // .md file or a directory of .md memes packs into args.carriers.
    try {
      const st = statSync(sourceUri);
      const files = st.isDirectory()
        ? (readdirSync(sourceUri, { recursive: true }) as string[])
            .filter((f) => f.endsWith(".md"))
            .map((f) => join(sourceUri, f))
        : [sourceUri];
      const carriers = files.map((f) => ({ text: readFileSync(f, "utf8") }));
      if (carriers.length > 0) actionArgs["carriers"] = carriers;
    } catch {
      // Honesty at the gesture: a non-resolving local path probably means a
      // typo — the island will refuse a carrier-less LOAD loudly either way.
      console.error(`lares act LOAD: "${sourceUri}" does not resolve locally — sending provenance-only LOAD (no carriers)`);
    }
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
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, { ok: false, error: msg, human: () => console.error(`lares act: ${msg}`) });
    return 3;
  }

  let vessel;
  try {
    vessel = await connectAdminVessel(connectOpts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(args, {
      ok: false, error: msg,
      human: () => {
        console.error(`lares act: ${msg}`);
        console.error("  Start the daemon with `lares serve` and try again.");
      },
    });
    return 3;
  }

  // ── Confirm + submit ──────────────────────────────────────────────────
  try {
    // The confirmation prompt belongs to the HUMAN/TTY path only. An agent (JSON
    // / off-TTY) cannot answer y/N — it MUST carry intent explicitly via --yes;
    // refusing the prompt keeps the surface non-interactive for unattended actors.
    if (!args.flags["yes"]) {
      if (wantsJson(args)) {
        emit(args, {
          ok: false, error: "confirmation required: pass --yes for non-interactive (agent) invocation",
          human: () => { /* unreachable on the JSON path */ },
        });
        return 1;
      }
      console.log("");
      console.log(`  ${verb}`);
      for (const [k, v] of Object.entries(actionArgs)) {
        console.log(`    ${k.padEnd(12)} ${v}`);
      }
      console.log("");
      const rl = createInterface({ input: stdin, output: stdout });
      const answer = await rl.question("Proceed? [y/N] ");
      rl.close();
      if (!/^y(es)?$/i.test(answer.trim())) {
        console.log("aborted");
        return 1;
      }
    }

    // V1 — content-address this idempotent residency change (empty nonce). The
    // subject names the bag the change lands in; re-issuing the SAME logical change
    // (same change-id + verb + target) collapses to one requestId, and the
    // dispatcher's outcome-keyed dedup then gives exactly-once EFFECT. A fresh
    // change-id (the --change-id default) means a genuinely distinct change → runs.
    const subject   = String(actionArgs["to-bag"] ?? actionArgs["bag"] ?? "");
    const requestId = await taskContentId({ subject, command: verb, args: actionArgs, nonce: "" });
    const result = await submitVerb(vessel, verb, actionArgs, did, { requestId });
    if (result.status === "error") {
      const msg = result.errorMessage ?? "unknown";
      emit(args, {
        ok: false, requestId: result.requestId, error: msg,
        human: () => console.error(`${verb} failed: ${msg}`),
      });
      return 4;
    }

    const summary = summaryOutput(result) ?? {};
    const auditUri = `lar:///ha.ka.ba/@admin/outcomes/${result.requestId}`;
    emit(args, {
      ok: true,
      requestId: result.requestId,
      data: { verb, ...summary, audit: auditUri },
      human: () => {
        console.log(`${verb} done`);
        for (const [k, v] of Object.entries(summary)) {
          console.log(`  ${k.padEnd(12)} ${typeof v === "string" ? v : JSON.stringify(v)}`);
        }
        console.log(`  audit:       ${auditUri}`);
      },
    });
    return 0;
  } finally {
    await vessel.disconnect();
  }
}
