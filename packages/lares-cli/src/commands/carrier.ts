/**
 * `lares carrier <verb>` — THE CARRIER DOOR, over the file a meme travels as.
 *
 * ONE NAMESPACE PER CAUSAL ISLAND, and these three verbs name NO island. `normalize`, `repack` and
 * `project-md` open a path on disk, read its bytes, and write bytes back: no daemon, no store, no cap
 * gate, no effect record. They act on the CARRIER — the file — rather than on any bag, wiki or vessel.
 *
 * WHY THEY NEEDED A DOOR AT ALL. A plane with no door has nowhere to put new capability but the top
 * level, so the verb count grows back exactly where the law never reached. `project-md` landed flat for
 * precisely that reason. The carrier is a plane; it now has a door, and the next carrier tool arrives
 * here rather than beside `vessel`.
 *
 * AND THE NEIGHBOURING PLANES KEEP THEIR OWN DOORS, because they answer different questions:
 *   · `lares bag`  — `bags/slug`, one CRDT surface. A KIND-plane in `lar:` law, first path segment.
 *   · `lares wiki` — `wikis/slug`, a #has bag-stack. The other KIND-plane, and the edit/publish shore.
 *   · `lares act`  — the residency ACTION rail (VERB → SUMMONS → OUTCOME), audit and cap-gate included.
 *   · `lares ingest` — an ACTION verb whose arguments the generic rail surface cannot carry.
 * Folding any of those in here would put a name in front of a distinction the URI law puts first.
 */

import { cmdNormalize }  from "./normalize.js";
import { cmdProjectMd }  from "./project-md.js";
import { cmdRepack }     from "./repack.js";
import type { ParsedArgs } from "../parse-args.js";

type Sub = (args: ParsedArgs) => Promise<number>;

/** Hand the sub-door's own args down, with the sub-door NAME consumed. */
const under = (args: ParsedArgs): ParsedArgs => ({ ...args, positional: args.positional.slice(1) });

const SUBS: Readonly<Record<string, { readonly summary: string; readonly run: Sub }>> = {
  normalize:    { summary: "canonicalize a carrier's framing so the round-trip laws hold — `--check` reports drift without writing", run: (a) => cmdNormalize(under(a)) },
  "project-md": { summary: "render a spec carrier to its submission pair — <name>.md + <name>.md.meta, deterministic, no clock", run: (a) => cmdProjectMd(under(a)) },
  repack:       { summary: "re-render a multi-tiddler bundle from its aside provenance — the round-trip before an upstream PR", run: (a) => cmdRepack(under(a)) },
};

function printCarrierHelp(): void {
  console.log("lares carrier — the carrier's own door (a file on disk, no island beneath it)\n");
  for (const [name, s] of Object.entries(SUBS)) {
    console.log(`  ${name.padEnd(12)} ${s.summary}`);
  }
  console.log("\n  A bag, a wiki or a vessel answers at its own door — this one reads and writes bytes.");
}

export async function cmdCarrier(args: ParsedArgs): Promise<number> {
  const sub = args.positional[0];
  if (!sub || sub === "help" || (args.flags["help"] && !SUBS[sub])) {
    printCarrierHelp();
    return sub ? 0 : 2;
  }
  const entry = SUBS[sub];
  if (!entry) {
    console.error(`lares carrier: unknown verb "${sub}". Run \`lares carrier help\` for the list.`);
    return 2;
  }
  return await entry.run(args);
}
