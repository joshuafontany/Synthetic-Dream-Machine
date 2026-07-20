/**
 * `lares sense ki` (alias `couple`) — the Ki (氣) coupling verdict: do the ADDRESSED sensorium's coupled
 * peers RECONCILE, and does the reconciliation hold power? Coupling is a GENERAL cap a sensorium `#has` —
 * any sensorium whose manifest declares `coupling.children` answers; one without reports the honest
 * "no coupling children". `lares sense <sensorium> ki` reads that sensorium (the memetic-wikitext testbed
 * carries formal ⋈ informal peers today); bare `lares sense ki` reads the memory default, which carries no
 * coupling cap. No sensorium is hardcoded.
 *
 * The read is TS-NATIVE (no python, no daemon): `readCoupling` resolves the sensorium's `coupling.children`,
 * reads each child's salience section over the shared stalk, and runs the H¹ gate — FUSE (H¹=0: the peers
 * admit a global section) or HOLD-OPEN (H¹≠0: a genuine cocycle, routed to Talk-Story, never a silent
 * average). Until the child salience sidecars fill it reports the honest insufficient/no-coupling.
 *
 *   lares sense <sensorium> ki   the coupling verdict — readable peers · shared units · fuse|hold-open · note
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/cohomological-gate
 */

import { readCoupling, memorySensoriumDir } from "@lararium/node";
import { emit } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

export function cmdKi(args: ParsedArgs): number {
  // The sense addressing threads `sensorium-root` when a sensorium is named; bare ki reads the memory default.
  const root = typeof args.options["sensorium-root"] === "string" ? args.options["sensorium-root"] : memorySensoriumDir();
  const coupling = readCoupling(root);
  const verdict = coupling.fusion ? coupling.fusion.verdict : "insufficient";

  emit(args, {
    ok: true,
    data: {
      sensorium: coupling.sensorium,
      readable: coupling.readable,
      sharedUnits: coupling.sharedUnits,
      verdict,
      ...(coupling.fusion && coupling.fusion.verdict === "hold-open"
        ? { obstruction: { dimH1: coupling.fusion.obstruction.dimH1, cost: coupling.fusion.obstruction.cost } }
        : {}),
      note: coupling.note,
    },
    human: () => {
      console.log(`lares sense ki — coupling (${coupling.sensorium})`);
      console.log(`  verdict:      ${verdict}`);
      console.log(`  readable:     ${coupling.readable} peer(s) · ${coupling.sharedUnits} shared unit(s)`);
      if (coupling.fusion && coupling.fusion.verdict === "hold-open") {
        console.log(`  obstruction:  H¹=${coupling.fusion.obstruction.dimH1} · cost ${coupling.fusion.obstruction.cost.toFixed(3)} → route to Talk-Story`);
      }
      console.log(`  ${coupling.note}`);
    },
  });
  return 0;
}
