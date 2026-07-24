/**
 * daemon-flow-tiddlers — seed the pet-named FLOW tiddlers into the @daemon bag.
 *
 * Each seed FLOW (crystal · rhythm · couple) lands as one tiddler addressed by its own `lar:` URI pet-name
 * (buildFlowTiddler stamps title/authority/bag). The daemon dispatcher reads them — the verb-tiddler
 * protocol — to run a flow by pet-name; the runner ALSO reads FLOW_SEEDS from code, so a vessel that never
 * seeds still runs every flow (the tiddlers make the flow-set ADDRESSABLE in the bag, not runnable).
 *
 * The capStack rides the COMPACT `instrument:hull …` list-string form parseCapStack reads back (never a JSON
 * blob in a tiddler field). Idempotent (setTiddler overwrites). Seed alongside the other @daemon seeds,
 * BEFORE the projection's first render.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/flow
 */

import { FLOW_SEEDS, buildFlowTiddler } from "@lararium/mesh";
import type { TW5Engine } from "./tw5-vm.js";

/** A stable seed timestamp — the flow tiddlers ride the cache-stable boot, so they carry a FIXED marker,
 *  never a wall-clock stamp (a Date.now() would break the deterministic genesis quine). */
const FLOW_SEED_STAMP = "seed";

/** Seed the FLOW tiddlers into the live @daemon wiki. `authority` names the writer (defaults to the seed). */
export function seedDaemonFlowTiddlers(tw5: TW5Engine, authority = "lararium-seed"): void {
  for (const seed of FLOW_SEEDS) {
    const t = buildFlowTiddler(seed, authority, FLOW_SEED_STAMP);
    tw5.setTiddler({
      title:     t.title,
      petname:   t.petname,
      summary:   t.summary,
      arity:     t.arity,
      authority: t.authority,
      bag:       t.bag,
      updatedAt: t.updatedAt,
      // The compact list form: `instrument:hull instrument:hull …` (parseCapStack reads it back).
      capStack:  t.capStack.map((s) => `${s.instrument}:${s.hull}`).join(" "),
      "flow-seed": "true",
    });
  }
}
