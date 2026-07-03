/**
 * sink-class — tag WHICH boundary births a sink. The capstone (boundary-generates-the-basis) splits a
 * sink into two classes by WHERE its shape condenses:
 *
 *   · SIGNAL-BOUNDARY (cymatic) — the shape STANDS in the data's own boundary; a reader carrying the
 *     medium DETECTS it. A plane whose SOLO rhythm re-locks (temporalRigidity.rigid) carries it alone —
 *     any single such plane suffices, so the ablation reads it as a signal-boundary sink.
 *   · RECEIVER-BOUNDARY (purple) — the shape condenses ONLY where the reader's channels wrap a gap into
 *     closure; NO single plane stands alone, yet the gate BIRTHS it across planes. The receiver MINTS a
 *     bridging entity present in no plane (the machina's purple).
 *
 * The gate today births ONLY receiver-boundary sinks — nucleate's (effectivePlanes − 1) factor zeroes a
 * lone plane's drive, so a single plane can NEVER cross r*. So the cymatic detector CANNOT ride `born`;
 * it rides STANDING (temporalRigidity) on each plane's solo rhythm. That distinction — a shape that LIVES
 * in one plane's data vs one the receiver MINTS across planes — the code did not carry before this organ.
 *
 * Pareidolia guard: a lone reader NEVER mints — the gate zeroes a lone plane's drive structurally, so a
 * receiver-boundary tag rides only on cross-plane intersubjective agreement (born), never one plane's noise.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/mesh/flow
 */

import { temporalRigidity, normalizeSignal } from "./temporal-rigidity.js";
import type { NucleationVerdict } from "./nucleation-gate.js";

export type SinkClass = "signal-boundary" | "receiver-boundary" | "none";

export interface SinkClassVerdict {
  /** Which boundary births the sink — cymatic (in-data), purple (minted-at-closure), or neither. */
  readonly sinkClass: SinkClass;
  /** The planes whose SOLO rhythm re-locks — the cymatic support (empty ⇒ no plane stands alone). */
  readonly signalPlanes: readonly string[];
  /** Did the gate birth the sink across planes (nucleate.born on the full plane-set)? */
  readonly bornCrossPlane: boolean;
  /** False on an atemporal feed (no per-plane rhythm) — the cymatic detector reads TEMPORAL standing only,
   *  so a corpus sink tags receiver-boundary "by blindness", NOT confidently at a closure. */
  readonly cymaticTestable: boolean;
  /** True when the birth verdict arrived invalid (garbage) — distinct from a valid `none`. */
  readonly invalid: boolean;
}

/**
 * Classify a candidate sink from its per-plane rhythm + the gate's birth verdict. A plane stands ALONE
 * when temporalRigidity re-locks its solo rhythm (normalized to match the sink's OWN standing path, so an
 * extreme-amplitude plane the sink calls rigid never mis-reads flat); ≥1 standing plane → signal-boundary
 * (cymatic); else a cross-plane birth → receiver-boundary (purple); else → none. Non-finite birth fails
 * loud (invalid). cymaticTestable falls false on an atemporal feed — the detector goes blind without a beat.
 */
export function classifySink(
  perPlaneRhythm: ReadonlyMap<string, readonly number[]>,
  birth: NucleationVerdict,
  opts: { threshold?: number } = {},
): SinkClassVerdict {
  const bornCrossPlane = birth.born;
  if (birth.invalid) {
    return { sinkClass: "none", signalPlanes: [], bornCrossPlane: false, cymaticTestable: false, invalid: true };
  }

  // Leave-one-plane ablation: which planes STAND rigid on their OWN (normalized) rhythm — the cymatic detector.
  const signalPlanes: string[] = [];
  let testable = 0;
  for (const [plane, rhythm] of perPlaneRhythm) {
    if (rhythm.length >= 4) testable += 1; // a real reader with the medium (temporalRigidity needs n≥4)
    const verdict = temporalRigidity({
      signal: normalizeSignal([...rhythm]),
      ...(opts.threshold !== undefined ? { threshold: opts.threshold } : {}),
    });
    if (verdict.rigid) signalPlanes.push(plane);
  }
  const cymaticTestable = testable > 0;

  if (signalPlanes.length >= 1) {
    return { sinkClass: "signal-boundary", signalPlanes, bornCrossPlane, cymaticTestable, invalid: false };
  }
  if (bornCrossPlane) {
    return { sinkClass: "receiver-boundary", signalPlanes, bornCrossPlane, cymaticTestable, invalid: false };
  }
  return { sinkClass: "none", signalPlanes, bornCrossPlane, cymaticTestable, invalid: false };
}
