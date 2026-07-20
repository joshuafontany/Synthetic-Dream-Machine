/**
 * `lares sense ki` (alias `couple`) — the Ki (氣) corpus-coupling verdict: does the memetic-wikitext
 * sensorium's formal ⋈ informal peers RECONCILE, and does the reconciliation hold power? A first-class
 * read of the H¹-gated coupling `lares status` already surfaces — promoted to its own verb so a human can
 * ask the coupling plane directly.
 *
 * The read is TS-NATIVE (no python subprocess, no daemon): `readMemeticWikitextCoupling` resolves the stood
 * memetic-wikitext sensorium, reads each peer's salience section over the shared stalk, and runs the H¹
 * gate — FUSE (H¹=0: the peers admit a global section, red steers black) or HOLD-OPEN (H¹≠0: a genuine
 * cocycle, routed to Talk-Story, never a silent average). Until the peer salience sidecars fill it reports
 * the honest insufficient/no-coupling.
 *
 *   lares sense ki        the coupling verdict — readable peers · shared units · fuse|hold-open · note
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/cohomological-gate
 */

import { readMemeticWikitextCoupling } from "@lararium/node";
import { emit } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

export function cmdKi(args: ParsedArgs): number {
  const coupling = readMemeticWikitextCoupling();
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
