/**
 * `lares bag <verb> [args...]` — operator surface for individual bag operations.
 *
 * Subcommand-style dispatcher. Operates on a single Automerge bag (one doc,
 * one sync surface). Wiki-level operations (whole-recipe pins, composition,
 * Epoch-on-the-stack) live under `lares wiki <verb>`; bag-level lives here.
 *
 * TWO HALVES, and they answer different questions. The RUNTIME half (pin · unpin · stats · register-cold ·
 * epoch) answers //is this doc in RAM//. The LIFECYCLE half (list · show · declare · home · repo) answers
 * what a bag IS, who may read it, where it belongs, and how to move it — none of which a bag could answer
 * about itself until it carried a declaration of its own.
 *
 * Verbs:
 *   pin <url> [--reason <text>]   — never evict this bag from RAM
 *   unpin <url>                   — remove the cooling exemption (bag rejoins the LRU sweep)
 *   stats                         — pinned / wela / anu residency snapshot
 *   register-cold <url>           — mark URL as known-but-not-loaded (oracle stub)
 *   compact <url>                 — DXOS-style snapshot-restart; bounds history
 *   list                          — every bag: declared tier + home, and whether it sits where it belongs
 *   show <bag>                    — one bag's declaration, resolved on this vessel
 *   declare <bag> --tier --home   — write/amend the declaration (moves no bytes)
 *   home <bag> --to <home> --approve  — MOVE the bytes and re-anchor the declaration together
 *   repo <list|add|drop>          — the repo registry; bags name IDs, never paths
 */

import { vesselDid } from "../env.js";
import {
  cmdPin, cmdUnpin, cmdRegisterCold, cmdResidency,
} from "./residency.js";
import {
  cmdBagList, cmdBagShow, cmdBagDeclare, cmdBagHome, cmdBagRepo, bagLifecycle,
} from "./bag-declare-cmd.js";
import { summaryOutput } from "../verb-result.js";
import { runVerb } from "../verb-call.js";
import type { ParsedArgs } from "../parse-args.js";

/** `lares bag compact <bag-url>` — DXOS-style snapshot-restart on one bag.
 *
 *  NAMED FOR WHAT IT DOES, and for whose word it borrows. The ceremony is DXOS's, and `epoch` in this
 *  house is RESERVED for the monotone fencing frontier a grant binds to. A compaction CUTS history and
 *  fences nobody, so it carries the qualifier and leaves the bare word to the fence
 *  (lar:///ha.ka.ba/lararium/mesh/epoch-binding-surfaces#whose-word-is-it). */
export async function cmdBagCompact(args: ParsedArgs): Promise<number> {
  const bagUrl = args.positional[0];
  if (!bagUrl) {
    console.error("usage: lares bag epoch <bag-url>");
    return 2;
  }
  const did = await vesselDid();
  let r;
  try {
    // UDS fast path, WS fallback (the lares↔lararium binding).
    r = await runVerb("bag-compact", { bagUrl }, did, { timeoutMs: 30_000 });
  } catch (err) {
    console.error(`lares bag: ${err instanceof Error ? err.message : String(err)}`);
    console.error("  Start the daemon with `lares serve` and try again.");
    return 3;
  }
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
}

type BagSubcommand = (args: ParsedArgs) => Promise<number>;

const SUBCOMMANDS: Readonly<Record<string, { handler: BagSubcommand; summary: string }>> = {
  "pin":           { handler: cmdPin,          summary: "Pin a bag URL — daemon never evicts it. Needs `lares serve`." },
  "unpin":         { handler: cmdUnpin,        summary: "Unpin a bag URL — removes the cooling exemption; the bag rejoins the LRU sweep. Needs `lares serve`." },
  "stats":         { handler: cmdResidency,    summary: "Print the daemon's bag residency snapshot. Needs `lares serve`." },
  "register-cold": { handler: cmdRegisterCold, summary: "Mark a bag URL as known-but-not-loaded (oracle stub). Needs `lares serve`." },
  "compact":       { handler: cmdBagCompact,     summary: "DXOS-style snapshot-restart on one bag. Bounds history; lossy by design." },
  // ── The LIFECYCLE half. Everything above answers a RUNTIME question (is this doc in RAM); these answer
  // what a bag IS, who may read it, where it belongs, and how to move it — the questions a bag could not
  // answer about itself at all until it carried a declaration.
  "list":          { handler: bagLifecycle(cmdBagList),    summary: "Every bag: its declared cap-tier + home, and whether it sits where it says it belongs." },
  "show":          { handler: bagLifecycle(cmdBagShow),    summary: "One bag's declaration, and where that resolves on THIS vessel." },
  "declare":       { handler: bagLifecycle(cmdBagDeclare), summary: "Write/amend a bag's own declaration (--tier --home --repo --role). Moves no bytes." },
  "home":          { handler: bagLifecycle(cmdBagHome),    summary: "MOVE a bag to a home (--to, --repo). Plans by default; --approve performs it." },
  "repo":          { handler: bagLifecycle(cmdBagRepo),    summary: "The repo registry: `list` | `add <id> --root <path>` | `drop <id>`. Bags name IDs, never paths." },
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
