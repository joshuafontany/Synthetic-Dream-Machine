/**
 * `lares draft <uri> [--to <bag>] [--yes]`
 *
 * Pull-into-draft ceremony — copies a tiddler currently resolving from a
 * lower bag into a writable draft bag (default: the active room's draft /
 * composite default writable). The source bag stays intact; the new copy
 * overlays via composite priority. Operator can then edit the draft and
 * land it into another bag through a residency ACTION verb (Sprint 5 of
 * the Residency Model Epic ships `lares act` for that purpose).
 *
 * Flags:
 *   --to <bag>     target draft bag (default: active room's draft)
 *   --yes          skip confirmation
 *   --port <n>     daemon port
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { join } from "node:path";
import { loadOperatorVerifyingKey } from "@lararium/node";
import { repoRoot } from "@lararium/mesh/node";
import { connectAdminVessel, submitVerb, summaryOutput } from "../admin-connector.js";
import type { ParsedArgs } from "../parse-args.js";

async function operatorDid(): Promise<string> {
  const dataDir = join(repoRoot, "packages", "lararium-node", ".lararium");
  return "0x" + (await loadOperatorVerifyingKey(dataDir));
}

export async function cmdDraft(args: ParsedArgs): Promise<number> {
  const tiddler = args.positional[0];
  const toBag   = args.options["to"];

  if (!tiddler) {
    console.error("usage: lares draft <uri> [--to <bag>] [--yes]");
    return 2;
  }

  const portOpt = args.options["port"];
  const connectOpts: Parameters<typeof connectAdminVessel>[0] = portOpt
    ? { port: Number(portOpt) }
    : {};

  let did: string;
  try {
    did = await operatorDid();
  } catch (err) {
    console.error(`lares draft: ${err instanceof Error ? err.message : String(err)}`);
    return 3;
  }

  let vessel;
  try {
    vessel = await connectAdminVessel(connectOpts);
  } catch (err) {
    console.error(`lares draft: ${err instanceof Error ? err.message : String(err)}`);
    console.error("  Start the daemon with `lares serve` and try again.");
    return 3;
  }

  try {
    const where = await submitVerb(vessel, "where", { tiddler }, did);
    if (where.status === "error") {
      console.error(`recipe-presence query failed: ${where.errorMessage ?? "unknown"}`);
      return 4;
    }
    const whereSummary = summaryOutput(where) ?? {};
    const bags    = (whereSummary["bags"] ?? []) as string[];
    const primary = whereSummary["primaryBag"] as string | null;
    if (!primary) {
      console.error(`tiddler not found in any bag: ${tiddler}`);
      return 5;
    }

    console.log("");
    console.log(`  tiddler:   ${tiddler}`);
    console.log(`  currently: ${bags.join(", ")}`);
    console.log(`  draft to:  ${toBag ?? "(active room draft)"}`);
    console.log("");

    if (!args.flags["yes"]) {
      const rl = createInterface({ input: stdin, output: stdout });
      const answer = await rl.question("Proceed? [y/N] ");
      rl.close();
      if (answer.trim().toLowerCase() !== "y") {
        console.log("aborted.");
        return 0;
      }
    }

    const draftArgs: Record<string, string> = { tiddler };
    if (toBag) draftArgs["toBag"] = toBag;

    const result = await submitVerb(vessel, "draft", draftArgs, did);
    if (result.status === "error") {
      console.error(`draft failed: ${result.errorMessage ?? "unknown"}`);
      return 6;
    }

    const r = summaryOutput(result) ?? {};
    console.log(`drafted: ${tiddler}`);
    console.log(`  ${r["fromBag"] ?? "(none)"} → ${r["toBag"]}`);
    console.log(`  status: ${r["status"]}`);
    console.log(`  audit:  lar:///ha.ka.ba/@admin/log/${result.requestId}`);
    return 0;
  } finally {
    await vessel.disconnect();
  }
}
