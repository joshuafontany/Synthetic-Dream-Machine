/**
 * `lares promote <uri> --to <bag> [--from <bag>] [--yes]`
 *
 * Canon-promotion ceremony. Connects to the running `lares serve` daemon as
 * an Automerge-repo WebSocket vessel, writes a recipe-presence query first
 * (so the operator confirms the source bag), then writes the actual promote
 * job. Both flow through the admin doc; the daemon's dispatcher reacts.
 *
 * Attach mode only — operator chose this for B.5. If no daemon is up, the
 * CLI exits with a clear error rather than booting an in-process node.
 *
 * Flags:
 *   --to <bag>     target bag id (required)
 *   --from <bag>   optional explicit source; refused on mismatch with record.bag
 *   --yes          skip the confirmation prompt
 *   --port <n>     daemon port (defaults to LAR_PORT or 8080)
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { join } from "node:path";
import { loadOperatorVerifyingKey } from "@lararium/node";
import { repoRoot } from "@lararium/mesh/node";
import { connectAdminVessel, submitVerb, summaryOutput } from "../admin-connector.js";
import type { ParsedArgs } from "../parse-args.js";

/** Load the operator's DID — `0x` + verifyingKey hex — for signing the
 *  job's requestedBy field. The daemon's dispatcher hands this DID
 *  to ctx.cap when verifying handler-level capability proofs. */
async function operatorDid(): Promise<string> {
  const root    = process.env["LAR_ROOT"] ?? join(repoRoot, "packages", "lararium-node");
  const dataDir = join(root, ".lararium");
  return "0x" + (await loadOperatorVerifyingKey(dataDir));
}

export async function cmdPromote(args: ParsedArgs): Promise<number> {
  const tiddler = args.positional[0];
  const toBag   = args.options["to"];
  const fromBag = args.options["from"];

  if (!tiddler) {
    console.error("usage: lares promote <uri> --to <bag> [--from <bag>] [--yes]");
    return 2;
  }
  if (!toBag) {
    console.error("--to <bag> is required");
    return 2;
  }

  const portOpt = args.options["port"];
  const root    = process.env["LAR_ROOT"];
  const connectOpts: Parameters<typeof connectAdminVessel>[0] = {
    ...(portOpt ? { port: Number(portOpt) } : {}),
    ...(root    ? { bootstrapPath: join(root, "genesis", "social-bootstrap.json") } : {}),
  };

  let did: string;
  try {
    did = await operatorDid();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`lares promote: ${msg}`);
    return 3;
  }

  let vessel;
  try {
    vessel = await connectAdminVessel(connectOpts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`lares promote: ${msg}`);
    console.error("  Start the daemon with `lares serve` and try again.");
    return 3;
  }

  try {
    // 1. Recipe-presence preview.
    const where = await submitVerb(vessel, "where", { tiddler }, did);
    if (where.status === "error") {
      console.error(`recipe-presence query failed: ${where.errorMessage ?? "unknown"}`);
      return 4;
    }
    const whereSummary = summaryOutput(where) ?? {};
    const bags = (whereSummary["bags"] ?? []) as string[];
    const primary = whereSummary["primaryBag"] as string | null;

    if (!primary) {
      console.error(`tiddler not found in any bag: ${tiddler}`);
      return 5;
    }
    if (fromBag && fromBag !== primary) {
      console.error(`source mismatch: --from=${fromBag}, but tiddler lives in ${primary}`);
      return 5;
    }
    if (primary === toBag) {
      console.error(`tiddler already lives in ${toBag} — nothing to promote`);
      return 5;
    }

    console.log("");
    console.log(`  tiddler:   ${tiddler}`);
    console.log(`  currently: ${bags.join(", ")}`);
    console.log(`  promote:   ${primary} → ${toBag}`);
    console.log("");

    // 2. Confirmation.
    if (!args.flags["yes"]) {
      const rl = createInterface({ input: stdin, output: stdout });
      const answer = await rl.question("Proceed? [y/N] ");
      rl.close();
      if (answer.trim().toLowerCase() !== "y") {
        console.log("aborted.");
        return 0;
      }
    }

    // 3. Promote.
    const promoteResult = await submitVerb(
      vessel, "promote",
      { tiddler, toBag, fromBag: primary },
      did,
    );

    if (promoteResult.status === "error") {
      console.error(`promotion failed: ${promoteResult.errorMessage ?? "unknown"}`);
      return 6;
    }

    const result = summaryOutput(promoteResult) ?? {};
    console.log(`promoted: ${tiddler}`);
    console.log(`  ${result["promotedFrom"]} → ${result["promotedTo"]}`);
    console.log(`  at: ${result["promotedAt"]}`);
    const children = (result["childrenPromoted"] ?? []) as string[];
    if (children.length > 0) {
      console.log(`  children: ${children.length} slot${children.length === 1 ? "" : "s"} co-promoted`);
      for (const c of children) console.log(`    ${c}`);
    }
    console.log(`  audit: lar:///ha.ka.ba/@admin/log/${promoteResult.requestId}`);
    return 0;
  } finally {
    await vessel.disconnect();
  }
}
