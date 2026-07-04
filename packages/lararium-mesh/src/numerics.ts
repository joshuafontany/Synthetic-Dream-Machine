/**
 * numerics — shared scalar primitives, folded here so two same-shape idioms stop re-rolling across the
 * mesh (a YIN isomorphic collapse). Machine-epsilon floors (EIG_FLOOR, underflow guards) stay LOCAL —
 * those guard rounding, not significance, a different semantic; this module holds only the scale-relative
 * significance floor + the saturating soft-gate.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/mesh/flow
 */

/**
 * A scale-relative significance floor — max(absFloor, relTol·|scale|). It tracks the data's OWN scale, so
 * an absolute epsilon never towers over a small-scale signal (masking real structure) nor reads inert on a
 * large one. Collapses the twin absolute-floor bugs: the boundary's λ-triviality cut (scale = max|λ|) and
 * the residual's Qα energy floor (scale = the reference residual/signal energy).
 */
export function relativeFloor(absFloor: number, scale: number, relTol = 1e-6): number {
  return Math.max(absFloor, relTol * Math.abs(scale));
}

/**
 * The saturating soft-gate x/(x+halfSat) ∈ [0,1): reads 0.5 exactly at x=halfSat, →1 above, →0 below;
 * 0 when x+halfSat ≤ 0. One shape for a fill ratio (support vs r*), a surprise agreement (SPE vs Qα), any
 * bounded "how far past the threshold" read.
 */
export function softGate(x: number, halfSat: number): number {
  return x + halfSat > 0 ? x / (x + halfSat) : 0;
}
