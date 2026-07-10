/**
 * signed-innovation — the wire's signal, made real: couple on the
 * SIGNED prediction residual, never the squared surprise. Each child's raw vector signal is reduced
 * per-dimension to its innovation ε = actual − predicted (one-step EWMA forecast) — the white,
 * dimensionless residual that is the *sufficient statistic for the new information*, and the correct
 * prewhitening for Transfer Entropy (Behrendt 2022: raw TE fails on self-predictable targets;
 * reducing to innovations recovers the true effect). The SIGN is kept (unlike Σπε²), so the
 * directional coupling the TE feeds on survives the reduction.
 *
 * Rides the parallel session's predictive core (ewmaPredict) — the same one-step predictor the
 * sensorium uses; here we keep its SIGNED residual instead of squaring it into surprise.
 *
 * Platform-blind: composes ./sensorium-pc. Feeds ./mesh-coupling-mv. Meme: lar:///ha.ka.ba/lararium/mesh/flow
 */

import { ewmaPredict } from "./sensorium-pc.js";
import { type ChildSignalMV } from "./mesh-coupling-mv.js";

/**
 * The signed innovation of a continuous vector series (rows = time, cols = dims): per dimension,
 * the one-step EWMA forecast is subtracted, leaving the signed residual. The first frame (no
 * history) yields 0. `alpha` is the EWMA smoothing (0.3 default, matching the sensorium's predictor).
 */
export function signedInnovation(signal: readonly (readonly number[])[], alpha = 0.3): number[][] {
  const T = signal.length;
  if (T === 0) return [];
  const dims = signal[0]!.length;
  const resids: number[][] = [];           // per-dimension residual series
  for (let d = 0; d < dims; d++) {
    const col = signal.map((row) => row[d] ?? 0);
    const pred = ewmaPredict(col, alpha);
    resids.push(col.map((v, t) => v - (pred[t] ?? v)));   // signed residual; no prediction → 0
  }
  const out: number[][] = [];
  for (let t = 0; t < T; t++) out.push(resids.map((c) => c[t] ?? 0));
  return out;
}

/** Reduce a child's raw signal to its signed-innovation signal, ready for coupleMeshChildrenMV. */
export function whitenChild(child: ChildSignalMV, alpha = 0.3): ChildSignalMV {
  return { name: child.name, signal: signedInnovation(child.signal, alpha) };
}

/** Whiten every child — the standard pre-coupling reduction across the mesh's children. */
export function whitenChildren(children: readonly ChildSignalMV[], alpha = 0.3): ChildSignalMV[] {
  return children.map((c) => whitenChild(c, alpha));
}
