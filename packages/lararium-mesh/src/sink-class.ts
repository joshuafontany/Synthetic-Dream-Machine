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

import { temporalRigidity } from "./temporal-rigidity.js";
import type { NucleationVerdict } from "./nucleation-gate.js";

export type SinkClass = "signal-boundary" | "receiver-boundary" | "none";

export interface SinkClassVerdict {
  /** Which boundary births the sink — cymatic (in-data), purple (minted-at-closure), or neither. */
  readonly sinkClass: SinkClass;
  /** The planes whose SOLO rhythm re-locks — the cymatic support (empty ⇒ no plane stands alone). */
  readonly signalPlanes: readonly string[];
  /** Did the gate birth the sink across planes (nucleate.born on the full plane-set)? */
  readonly bornCrossPlane: boolean;
  /** 0 = fully in-data (every plane stands) … 1 = fully minted-at-closure (no plane stands, born cross-plane). */
  readonly observerDependence: number;
  /** True when the birth verdict arrived invalid (garbage) — distinct from a valid `none`. */
  readonly invalid: boolean;
}

const NONE: SinkClassVerdict = {
  sinkClass: "none", signalPlanes: [], bornCrossPlane: false, observerDependence: 0, invalid: false,
};

/**
 * Classify a candidate sink from its per-plane rhythm + the gate's birth verdict. A plane stands ALONE
 * when temporalRigidity re-locks its solo rhythm; ≥1 standing plane → signal-boundary (cymatic); else a
 * cross-plane birth → receiver-boundary (purple); else → none. Non-finite birth fails loud (invalid).
 */
export function classifySink(
  perPlaneRhythm: ReadonlyMap<string, readonly number[]>,
  birth: NucleationVerdict,
  opts: { threshold?: number } = {},
): SinkClassVerdict {
  if (birth.invalid) return { ...NONE, invalid: true };

  const bornCrossPlane = birth.born;
  const nPlanes = perPlaneRhythm.size;

  // Leave-one-plane ablation: which planes STAND rigid on their OWN rhythm (the cymatic detector)?
  const signalPlanes: string[] = [];
  for (const [plane, rhythm] of perPlaneRhythm) {
    const verdict = temporalRigidity({ signal: [...rhythm], ...(opts.threshold !== undefined ? { threshold: opts.threshold } : {}) });
    if (verdict.rigid) signalPlanes.push(plane);
  }

  // The mint-fraction — how much of the shape the receiver bridges rather than reads from a plane.
  const observerDependence = nPlanes > 0 ? 1 - signalPlanes.length / nPlanes : 0;

  if (signalPlanes.length >= 1) {
    return { sinkClass: "signal-boundary", signalPlanes, bornCrossPlane, observerDependence, invalid: false };
  }
  if (bornCrossPlane) {
    return { sinkClass: "receiver-boundary", signalPlanes, bornCrossPlane, observerDependence: 1, invalid: false };
  }
  return { ...NONE, bornCrossPlane };
}
