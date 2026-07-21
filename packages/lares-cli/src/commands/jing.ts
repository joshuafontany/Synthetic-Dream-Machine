/**
 * `lares sense jing` (勁) — the coherence verdict at the li∘ki JOINT: do a child-hosting sensorium's lobes
 * express ONE coherent trained force, or does the grain fail to round-trip with the flow? Squaring is a cap
 * a child-hosting sensorium `#has` — any sensorium with ≥2 `coupling.children` answers; one without reports
 * the honest no-square. Bare `lares sense jing` reads the MESH — the load-bearing sensorium that hosts the
 * WHO ⊥ AUTHORITY ⊥ FLOW lobes a node federates onto DreamNet; `lares sense <sensorium> jing` squares any
 * operator-designed child-set. No sensorium is hardcoded beyond the mesh default.
 *
 * The read is TS-NATIVE (no python, no daemon compute): `readJing` EXTENDS the lobes to a reconciled self
 * (the ki `fuse`), RESTRICTS it back to each lobe, and reads the round-trip. Coheres ⟺ extend-then-restrict
 * returns the identity — every lobe's local view equals the reconciled self restricted back. A residual
 * localizes to the offending lobe: the self stops cohering THERE (the map the node shows the mesh diverges
 * from the territory it holds). A held-open extension means the lobes admit no common self at all.
 *
 *   lares sense [<sensorium>] jing   the coherence verdict — readable lobes · coheres · radius · offending lobe · note
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/mesh-palace · lar:///ha.ka.ba/lares/api/pono/li-ki-integrities#the-lattice
 */

import { readJing, meshSensoriumDir } from "@lararium/node";
import { emit } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

export function cmdJing(args: ParsedArgs): number {
  // the sense addressing threads `sensorium-root` when a sensorium is named; bare jing squares the MESH.
  const root = typeof args.options["sensorium-root"] === "string" ? args.options["sensorium-root"] : meshSensoriumDir();
  const jing = readJing(root);

  emit(args, {
    ok: true,
    data: {
      sensorium: jing.sensorium,
      readable: jing.readable,
      coheres: jing.coheres,
      radius: jing.radius,
      ...(jing.offendingLobe ? { offendingLobe: jing.offendingLobe } : {}),
      lobes: jing.lobes.map((l) => ({ lobe: l.lobe, read: l.read, disagreement: l.disagreement })),
      note: jing.note,
    },
    human: () => {
      console.log(`lares sense jing — the li∘ki square (${jing.sensorium})`);
      console.log(`  coheres:      ${jing.coheres ? "yes — the jing lands" : "no"}`);
      console.log(`  readable:     ${jing.readable} lobe(s) · round-trip radius ${jing.radius.toFixed(3)}`);
      if (jing.offendingLobe) console.log(`  diverges at:  ${jing.offendingLobe}`);
      for (const l of jing.lobes) {
        console.log(`    ${l.read ? "·" : "×"} ${l.lobe}${l.read ? ` — Δ ${l.disagreement.toFixed(3)}` : " (no section)"}`);
      }
      console.log(`  ${jing.note}`);
    },
  });
  return 0;
}
