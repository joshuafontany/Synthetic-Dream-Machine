/**
 * linearity-gate — the Tier-0 cheap screen that decides whether the Gaussian coupling default is
 * leaving nonlinear signal on the table, and the heavy KSG-multivariate holder should be paid for.
 * Two near-free signals from what the Gaussian fit already computes:
 *
 *   · the dCor − |Pearson| GAP — distance correlation sees linear AND nonlinear dependence, Pearson
 *     only linear; a large gap means nonlinear structure the Gaussian estimator can't read.
 *   · the innovation EXCESS-KURTOSIS — the Gaussian estimator assumes joint Gaussianity, so a
 *     heavy-tailed linear residual violates it (and fingerprints nonlinear generating structure).
 *
 * PONO-GROUND (load-bearing): gate on EFFECT SIZE (|excess-kurtosis| floor), NOT a
 * raw p-value — a normality test rejects on trivial deviations at large N, so a p-gate would fire
 * KSG needlessly on every long window. The effect-size floor is the non-noise version.
 *
 * KNOWN HOLE, logged (do not pretend closed): dCor here is PAIRWISE/unconditional — it can miss
 * nonlinearity living in the CONDITIONAL relationship (what conditional-TE targets), and pure
 * higher-moment coupling with symmetric marginals slips both screens. Closed only by the Tier-1
 * IAAFT confirm or periodic Gaussian-vs-KSG calibration — a separate instrument, not this gate.
 *
 * Platform-blind: pure arithmetic. NO imports. Meme: lar:///ha.ka.ba/lararium/mesh/flow
 */

const EPS = 1e-12;

const mean = (x: readonly number[]): number => x.reduce((a, b) => a + b, 0) / (x.length || 1);

/** Pearson linear correlation of two scalar series. */
export function pearson(x: readonly number[], y: readonly number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = x[i]! - mx, dy = y[i]! - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  const d = Math.sqrt(sxx * syy);
  return d > EPS ? sxy / d : 0;
}

/** The double-centered distance matrix of a scalar series (Székely). */
function doubleCentered(v: readonly number[]): number[][] {
  const n = v.length;
  const a = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const rowMean = new Array<number>(n).fill(0);
  let grand = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const d = Math.abs(v[i]! - v[j]!); a[i]![j]! = d; rowMean[i]! += d / n; grand += d / (n * n); }
  const A = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) A[i]![j]! = a[i]![j]! - rowMean[i]! - rowMean[j]! + grand;  // symmetric ⇒ colMean = rowMean
  return A;
}

/** Distance correlation ∈ [0,1] — 0 iff independent; sees nonlinear dependence Pearson misses. */
export function distanceCorrelation(x: readonly number[], y: readonly number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const A = doubleCentered(x.slice(0, n)), B = doubleCentered(y.slice(0, n));
  let dcov2 = 0, dvarx2 = 0, dvary2 = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { dcov2 += A[i]![j]! * B[i]![j]!; dvarx2 += A[i]![j]! ** 2; dvary2 += B[i]![j]! ** 2; }
  const denom = Math.sqrt(dvarx2 * dvary2);
  const dcor2 = denom > EPS ? dcov2 / denom : 0;
  return Math.sqrt(Math.max(0, dcor2));
}

/** Excess kurtosis (kurtosis − 3; 0 for Gaussian) of a scalar series. */
export function excessKurtosis(x: readonly number[]): number {
  const n = x.length;
  if (n < 4) return 0;
  const m = mean(x);
  let m2 = 0, m4 = 0;
  for (const v of x) { const e = v - m; m2 += (e * e) / n; m4 += (e * e * e * e) / n; }
  return m2 > EPS ? m4 / (m2 * m2) - 3 : 0;
}

/** OLS residual of y on x — y − (a + b·x), the linear model's innovation. */
function linearResidual(x: readonly number[], y: readonly number[]): number[] {
  const n = Math.min(x.length, y.length);
  const mx = mean(x.slice(0, n)), my = mean(y.slice(0, n));
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { const dx = x[i]! - mx; sxy += dx * (y[i]! - my); sxx += dx * dx; }
  const b = sxx > EPS ? sxy / sxx : 0;
  const a = my - b * mx;
  const res: number[] = [];
  for (let i = 0; i < n; i++) res.push(y[i]! - (a + b * x[i]!));
  return res;
}

export interface LinearityReading {
  /** escalate to KSG — nonlinear structure the Gaussian default would miss. */
  readonly escalate: boolean;
  /** dCor − |Pearson| — the nonlinear-beyond-linear signal. */
  readonly dCorGap: number;
  /** |excess kurtosis| of the linear residual — the non-Gaussianity signal. */
  readonly excessKurtosis: number;
}

/**
 * The Tier-0 gate: escalate if the dCor-gap exceeds `gapDelta` (default 0.1) OR the residual's
 * |excess-kurtosis| exceeds `kurtFloor` (default 1 — an EFFECT-SIZE floor, never a raw p-value).
 * Calibrate the thresholds on synthetic ground truth (linear-VAR vs Hénon), not as inherited law.
 */
export function linearityGate(
  x: readonly number[], y: readonly number[],
  opts: { gapDelta?: number; kurtFloor?: number } = {},
): LinearityReading {
  const gapDelta = opts.gapDelta ?? 0.1;
  const kurtFloor = opts.kurtFloor ?? 1;
  const gap = distanceCorrelation(x, y) - Math.abs(pearson(x, y));
  const ek = Math.abs(excessKurtosis(linearResidual(x, y)));
  return { escalate: gap > gapDelta || ek > kurtFloor, dCorGap: gap, excessKurtosis: ek };
}
