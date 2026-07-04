/**
 * arl-dial — ONE interpretable operator dial for the whole gate: ARL₀ = "one false sink per N frames".
 * The nine-wave braid ruled every threshold self-emergent from ONE scalar (α = 1/ARL₀); this exposes that
 * dial. α = the per-frame false-positive budget; the cross-plane AND (birth needs ≥2 nodes) then refracts
 * a per-node α to the conjunction ≈ α^k, so a per-node α of 1/ARL₀ runs conservative at the birth level —
 * a matched-dial names α_node = ARL₀^(−1/k). `alphaNode` rides EXPOSED-but-unconsumed on purpose: controlLimit
 * reads the conservative per-frame α, and the birth-matched swap awaits the shuffle-null that measures the
 * ACTUAL birth rate under plane correlation (the open ruling lives at sink-flow's α wire — never swap by fiat).
 * Downstream reads α (controlLimit) + basinRadius (the minter's dedup/grow/birth radius); the deeper
 * self-emergence rides the deferred sprint — basinRadius from the closure-distance null · γ back-solve ·
 * Mondrian per-island calibration · the ACI drift-servo (Gibbs-Candès online α-adaptation) · the DDSketch/
 * DSPOT streaming held-null · the shuffle/surrogate-null harness (entrainment-conditional for rigidity).
 * A static derive-once dial today; the deferred sprint makes each threshold EMERGE. This replaces the
 * scattered α=0.05 + quantum-0.1 constants with one number now (γ + rigidity await the null-calibration).
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/mesh/flow
 */

export interface ArlDial {
  /** The operator's dial: expected frames between false sinks (ARL₀). Larger → stricter. */
  readonly arl0: number;
  /** The per-frame false-positive budget α = 1/ARL₀ (the conformal miscoverage rate). */
  readonly alpha: number;
  /** The per-node budget refracted through the cross-plane AND: α_node = ARL₀^(−1/k), k co-attesting planes. */
  readonly alphaNode: number;
  /** The dedup/grow/birth radius the minter reads — one nearest-basin query gates all three. */
  readonly basinRadius: number;
}

export interface ArlDialOpts {
  /** Co-attesting planes a birth needs (the cross-plane AND exponent). Default 2. */
  readonly k?: number;
  /** Closure-vector basin radius (dedup grain). Default 0.1 — the deferred null-calibration makes it emerge. */
  readonly basinRadius?: number;
}

/** Turn the ARL₀ dial into the derived budgets every threshold reads. */
export function makeArlDial(arl0: number, opts: ArlDialOpts = {}): ArlDial {
  const safeArl = Math.max(1, arl0);
  const alpha = 1 / safeArl;
  const k = Math.max(1, opts.k ?? 2);
  const alphaNode = Math.pow(safeArl, -1 / k);
  const basinRadius = opts.basinRadius ?? DEFAULT_BASIN_RADIUS;
  return { arl0: safeArl, alpha, alphaNode, basinRadius };
}

/** The reference ARL₀ that reproduces the prior per-node α=0.05 default (α=1/20). */
export const ARL0_REFERENCE = 20;

/** The single home for the dedup grain. NOTE: this carried the NUMBER of the retired grid `quantum` (0.1),
 *  NOT its meaning — quantum set a per-axis CELL width (±0.05/axis); this sets a Euclidean RADIUS on the raw
 *  agreement vector, so across d planes the effective dedup tightens ~√d. A placeholder until the deferred
 *  closure-distance null makes the grain emerge per-island. The minter reads it through the dial. */
export const DEFAULT_BASIN_RADIUS = 0.1;
