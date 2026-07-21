/**
 * `lares sense li` (alias `cohere`) — the Li (理) gluing verdict: do the ADDRESSED sensorium's sheaf
 * planes GLUE, and does a global section stand? Cohering is a GENERAL cap a sensorium `#has` — any
 * sensorium that declares ≥2 sheaf planes answers; one without reports the honest "no cover". `lares
 * sense <sensorium> li` reads that sensorium; bare `lares sense li` reads the memory default. No
 * sensorium is hardcoded, and the read keys by cid — media-general, text first.
 *
 * The read is TS-NATIVE (no python, no daemon compute): `readCohere` enumerates the sheaf planes, reads
 * each plane's section over the shared cid stalk, and runs the Robinson li-radius AND the H¹ gate — FUSE
 * (H¹=0: a global section glues) or HOLD-OPEN (H¹≠0: a genuine cocycle, routed to Talk-Story).
 *
 * THE BOUNDARY, NOT THE CODOMAIN. The default read glues a sensorium's OWN `content ↠ structure ↠ form`
 * planes, which NEST and agree by construction — so it carries `dependenceRisk: "nested-cover"` and reads
 * as a PLUMBING witness, never a health verdict. The radius certifies only at a LIVE boundary (the same
 * plane across two contexts). This verb surfaces that flag loud so a nested 0 never masquerades as health.
 *
 *   lares sense <sensorium> li   the gluing verdict — readable planes · shared cids · radius · fuse|hold-open · note
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/cohomological-gate
 */

import { readCohere, memorySensoriumDir } from "@lararium/node";
import { emit } from "../render.js";
import type { ParsedArgs } from "../parse-args.js";

export function cmdLi(args: ParsedArgs): number {
  // The sense addressing threads `sensorium-root` when a sensorium is named; bare li reads the memory default.
  const root = typeof args.options["sensorium-root"] === "string" ? args.options["sensorium-root"] : memorySensoriumDir();
  const cohere = readCohere(root);
  const verdict = cohere.fusion ? cohere.fusion.verdict : "insufficient";

  emit(args, {
    ok: true,
    data: {
      sensorium: cohere.sensorium,
      readable: cohere.readable,
      sharedUnits: cohere.sharedUnits,
      verdict,
      ...(cohere.consistency ? { radius: cohere.consistency.radius, glues: cohere.consistency.glues } : {}),
      ...(cohere.fusion && cohere.fusion.verdict === "hold-open"
        ? { obstruction: { dimH1: cohere.fusion.obstruction.dimH1, cost: cohere.fusion.obstruction.cost } }
        : {}),
      ...(cohere.dependenceRisk ? { dependenceRisk: cohere.dependenceRisk } : {}),
      note: cohere.note,
    },
    human: () => {
      console.log(`lares sense li — cohere (${cohere.sensorium})`);
      console.log(`  verdict:      ${verdict}`);
      console.log(`  readable:     ${cohere.readable} plane(s) · ${cohere.sharedUnits} shared cid(s)`);
      if (cohere.consistency) {
        console.log(`  li-radius:    ${cohere.consistency.radius.toFixed(3)}${cohere.consistency.glues ? " (glues)" : ""}`);
      }
      if (cohere.fusion && cohere.fusion.verdict === "hold-open") {
        console.log(`  obstruction:  H¹=${cohere.fusion.obstruction.dimH1} · cost ${cohere.fusion.obstruction.cost.toFixed(3)} → route to Talk-Story`);
      }
      if (cohere.dependenceRisk === "nested-cover") {
        console.log(`  ⚠ dependence: nested-cover — a PLUMBING witness, not health (gate at a live boundary)`);
      }
      console.log(`  ${cohere.note}`);
    },
  });
  return 0;
}
