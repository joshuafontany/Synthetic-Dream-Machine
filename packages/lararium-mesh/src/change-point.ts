/**
 * change-point — the distribution-shift detector that makes the coupling window's stationarity
 * LOCALLY TRUE (Window-crucible): a Gaussian conditional-TE estimate is only valid while the
 * window sits inside ONE regime; a regime shift IS a change in the distribution the estimator
 * assumes stable. So the runtime resets the window at a detected shift rather than averaging a
 * meaningless estimate across a break.
 *
 * It detects BOTH shifts that break the estimator — MEAN and VARIANCE — because a covariance
 * regime change is as fatal to the Gaussian read as a mean one, and a mean-only detector would
 * silently pass a variance break (the pono-ground reason not to ship the easy mean-only version).
 * Per dimension: standardized mean-shift z + |log variance-ratio|; the score is the worst dim.
 *
 * Platform-blind: pure arithmetic. NO imports. Meme: lar:///ha.ka.ba/@lararium/mesh/flow
 */

const EPS = 1e-12;

/** A distribution-shift reading between a reference window and a recent window. */
export interface ChangePointReading {
  /** score > threshold — the windows sit in different regimes; reset. */
  readonly shifted: boolean;
  /** max over dims of (standardized mean-shift + |log variance-ratio|). */
  readonly score: number;
  /** the dimension carrying the worst shift (−1 when empty). */
  readonly dim: number;
}

/** Per-dimension mean and (population) variance of an observation matrix (rows = obs, cols = dims). */
export function meanVar(rows: readonly (readonly number[])[], dims: number): { mean: number[]; var: number[] } {
  const m = rows.length;
  const mean = new Array<number>(dims).fill(0);
  const varr = new Array<number>(dims).fill(0);
  if (m === 0) return { mean, var: varr };
  for (const r of rows) for (let d = 0; d < dims; d++) mean[d]! += (r[d] ?? 0) / m;
  for (const r of rows) for (let d = 0; d < dims; d++) { const e = (r[d] ?? 0) - mean[d]!; varr[d]! += (e * e) / m; }
  return { mean, var: varr };
}

/**
 * Detect a distribution shift between a REFERENCE window (older regime) and a RECENT window.
 * Per dim: `z = |μ_recent − μ_ref| / pooled_sd` (mean shift) + `|ln(σ²_recent / σ²_ref)|`
 * (variance shift). `shifted` when the worst dimension's score exceeds `threshold` (default 3:
 * ~a 3σ mean move, or a variance change of ~e^3). Empty / single-sample windows → not shifted.
 */
export function detectShift(
  reference: readonly (readonly number[])[],
  recent: readonly (readonly number[])[],
  threshold = 3,
): ChangePointReading {
  const dims = reference[0]?.length ?? recent[0]?.length ?? 0;
  if (dims === 0 || reference.length < 2 || recent.length < 2) return { shifted: false, score: 0, dim: -1 };
  const a = meanVar(reference, dims);
  const b = meanVar(recent, dims);
  let score = 0, worst = -1;
  for (let d = 0; d < dims; d++) {
    const pooledSd = Math.sqrt((a.var[d]! + b.var[d]!) / 2 + EPS);
    const z = Math.abs(b.mean[d]! - a.mean[d]!) / pooledSd;
    const lvr = Math.abs(Math.log((b.var[d]! + EPS) / (a.var[d]! + EPS)));
    const s = z + lvr;
    if (s > score) { score = s; worst = d; }
  }
  return { shifted: score > threshold, score, dim: worst };
}
