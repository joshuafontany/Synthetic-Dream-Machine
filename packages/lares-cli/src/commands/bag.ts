/**
 * `lares bag <verb> [args...]` — operator surface for individual bag operations.
 *
 * Subcommand-style dispatcher. Operates on a single Automerge bag (one doc,
 * one sync surface). Wiki-level operations (whole-recipe pins, composition,
 * Epoch-on-the-stack) live under `lares wiki <verb>`; bag-level lives here.
 *
 * Verbs:
 *   pin <url> [--reason <text>]   — never evict this bag from RAM
 *   unpin <url>                   — demote pinned bag to hot LRU
 *   stats                         — pinned / hot / cold residency snapshot
 *   register-cold <url>           — mark URL as known-but-not-loaded (oracle stub)
 *
 * E.1 ships these four; E.8 adds `bag epoch <url>` (DXOS-style snapshot-restart).
 */

import { join } from "node:path";
import { loadOperatorVerifyingKey } from "@lararium/node";
import { repoRoot } from "@lararium/mesh/node";
import {
  cmdPin, cmdUnpin, cmdRegisterCold, cmdResidency,
} from "./residency.js";
import { connectAdminVessel, submitVerb, summaryOutput } from "../admin-connector.js";
import type { ParsedArgs } from "../parse-args.js";

async function operatorDid(): Promise<string> {
  const root    = process.env["LAR_ROOT"] ?? join(repoRoot, "packages", "lararium-node");
  const dataDir = join(root, ".lararium");
  return "0x" + (await loadOperatorVerifyingKey(dataDir));
}

async function tryConnect() {
  try {
    const root = process.env["LAR_ROOT"];
    const extra = root ? { bootstrapPath: join(root, "genesis", "social-bootstrap.json") } : {};
    return await connectAdminVessel(extra);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`lares bag: ${msg}`);
    console.error("  Start the daemon with `lares serve` and try again.");
    return null;
  }
}

/** `lares bag epoch <bag-url>` — DXOS-style snapshot-restart on one bag. */
export async function cmdBagEpoch(args: ParsedArgs): Promise<number> {
  const bagUrl = args.positional[0];
  if (!bagUrl) {
    console.error("usage: lares bag epoch <bag-url>");
    return 2;
  }
  const did    = await operatorDid().catch(() => "lares-cli");
  const vessel = await tryConnect();
  if (!vessel) return 3;
  try {
    const r = await submitVerb(vessel, "bag-epoch", { bagUrl }, did, { timeoutMs: 30_000 });
    if (r.status === "error") {
      console.error(`bag epoch failed: ${r.errorMessage ?? "unknown"}`);
      return 4;
    }
    const result = summaryOutput(r) ?? {};
    console.log("");
    console.log(`bag epoch: ${result["bagUrl"]}`);
    console.log(`  old doc:  ${result["oldDocUrl"]}`);
    console.log(`  new doc:  ${result["newDocUrl"]}`);
    console.log(`  tiddlers: ${result["tiddlerCount"]}  tombstones: ${result["tombstoneCount"]}`);
    console.log(`  layer:    ${result["layerSwapped"] ? "swapped in composite" : "not mounted"}`);
    if (result["note"]) console.log(`  note:     ${result["note"]}`);
    console.log("");
    return 0;
  } finally {
    await vessel.disconnect();
  }
}

type BagSubcommand = (args: ParsedArgs) => Promise<number>;

const SUBCOMMANDS: Readonly<Record<string, { handler: BagSubcommand; summary: string }>> = {
  "pin":           { handler: cmdPin,          summary: "Pin a bag URL — daemon never evicts it. Needs `lares serve`." },
  "unpin":         { handler: cmdUnpin,        summary: "Unpin a bag URL — demotes from pinned to hot LRU. Needs `lares serve`." },
  "stats":         { handler: cmdResidency,    summary: "Print the daemon's bag residency snapshot. Needs `lares serve`." },
  "register-cold": { handler: cmdRegisterCold, summary: "Mark a bag URL as known-but-not-loaded (oracle stub). Needs `lares serve`." },
  "epoch":         { handler: cmdBagEpoch,     summary: "DXOS-style snapshot-restart on one bag. Bounds history; lossy by design." },
};

function printBagHelp(): void {
  console.log("lares bag <verb> [args...]\n");
  console.log("Verbs:");
  for (const [verb, entry] of Object.entries(SUBCOMMANDS)) {
    console.log(`  ${verb.padEnd(15)} ${entry.summary}`);
  }
}

export async function cmdBag(args: ParsedArgs): Promise<number> {
  const verb = args.positional[0];
  if (!verb || verb === "help" || args.flags["help"]) {
    printBagHelp();
    return verb ? 0 : 2;
  }
  const entry = SUBCOMMANDS[verb];
  if (!entry) {
    console.error(`lares bag: unknown verb "${verb}". Run \`lares bag help\` for the list.`);
    return 2;
  }
  // Shift positional so the inner handler sees args without the verb.
  const inner: ParsedArgs = {
    command:    "bag",
    positional: args.positional.slice(1),
    options:    args.options,
    flags:      args.flags,
  };
  return await entry.handler(inner);
}
