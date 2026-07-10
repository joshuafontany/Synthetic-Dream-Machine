/**
 * gaussian-cmi — the native, closed-form DEFAULT multivariate coupling estimator (the
 * locked keel: Gaussian-CMI / conditional-Granger). For jointly-Gaussian variables the conditional
 * mutual information has a closed form in covariance log-determinants, and Transfer Entropy equals
 * a conditional MI (Barnett-Barrett-Seth 2009: TE = GC/2 for Gaussians). So this needs NO kNN, NO
 * sidecar, NO discretization — just covariances — and is reliable at N ≳ 10-20 × d_joint, INSIDE a
 * short mesh window. The signed-innovation reduction feeding it already linearizes the residual,
 * so the Gaussian read carries the second-order structure natively.
 *
 * Escalation to KSG-multivariate (nonlinear coupling) rides the IDTxl sidecar behind a linearity
 * gate — NOT here. This file is the dependency-light default the whole mesh couples through.
 *
 * Vectors are CONTINUOUS real-valued (the wire contract) — never discretized (that would be the
 * discrete twin's job, and it destroys the Gaussian covariance the same way it kills kNN geometry).
 *
 *   I(X;Y|Z) = ½·[ logdet Σ_XZ + logdet Σ_YZ − logdet Σ_Z − logdet Σ_XYZ ]   (nats; ÷ln2 → bits)
 *
 * Platform-blind: pure linear algebra, NO imports. Meme: lar:///ha.ka.ba/@lararium/mesh/flow
 */

/** Ridge added to a covariance diagonal for numerical stability (near-singular / short windows). */
const RIDGE = 1e-9;
const LN2 = Math.log(2);

/** An observation matrix: rows = observations (time), cols = the variable's dimensions. */
type Obs = readonly (readonly number[])[];

/** Horizontally concatenate the columns of several observation blocks (same row count). */
function concatCols(blocks: readonly Obs[], rows: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < rows; i++) {
    const row: number[] = [];
    for (const b of blocks) row.push(...(b[i] ?? []));
    out.push(row);
  }
  return out;
}

/** Sample covariance (d×d) of an observation matrix (rows = obs, cols = dims). Empty dims → []. */
function covariance(rows: number[][]): number[][] {
  const m = rows.length;
  const d = m > 0 ? rows[0]!.length : 0;
  if (d === 0 || m < 2) return Array.from({ length: d }, () => new Array<number>(d).fill(0));
  const mean = new Array<number>(d).fill(0);
  for (const r of rows) for (let j = 0; j < d; j++) mean[j]! += r[j]! / m;
  const cov = Array.from({ length: d }, () => new Array<number>(d).fill(0));
  for (const r of rows) {
    for (let a = 0; a < d; a++) {
      const da = r[a]! - mean[a]!;
      for (let b = a; b < d; b++) {
        cov[a]![b]! += (da * (r[b]! - mean[b]!)) / (m - 1);
      }
    }
  }
  for (let a = 0; a < d; a++) for (let b = a + 1; b < d; b++) cov[b]![a]! = cov[a]![b]!;
  return cov;
}

/** log|Σ| via Cholesky (Σ = L·Lᵀ ⇒ log det = 2·Σ log L_ii), ridge-stabilized. Empty Σ ⇒ 0. */
function logDet(cov: number[][]): number {
  const n = cov.length;
  if (n === 0) return 0;
  const L = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = cov[i]![j]! + (i === j ? RIDGE : 0);
      for (let k = 0; k < j; k++) sum -= L[i]![k]! * L[j]![k]!;
      if (i === j) {
        if (sum <= 0) return NaN;             // not positive-definite even after ridge
        L[i]![j]! = Math.sqrt(sum);
      } else {
        L[i]![j]! = sum / L[j]![j]!;
      }
    }
  }
  let ld = 0;
  for (let i = 0; i < n; i++) ld += Math.log(L[i]![i]!);
  return 2 * ld;
}

/** logdet of the covariance of the concatenated blocks. */
function blockLogDet(blocks: readonly Obs[], rows: number): number {
  return logDet(covariance(concatCols(blocks, rows)));
}

/**
 * Gaussian conditional mutual information I(X;Y|Z) in BITS. X, Y, Z are observation matrices
 * (rows = same observations, cols = each variable's dims); Z may be empty (0 cols) ⇒ plain MI.
 * A tiny negative return is finite-sample noise around the true zero (report as-is; clamp upstream).
 */
export function gaussianCMI(X: Obs, Y: Obs, Z: Obs): number {
  const rows = Math.min(X.length, Y.length, Z.length);
  const xz = blockLogDet([X, Z], rows);
  const yz = blockLogDet([Y, Z], rows);
  const z = blockLogDet([Z], rows);
  const xyz = blockLogDet([X, Y, Z], rows);
  const nats = 0.5 * (xz + yz - z - xyz);
  return nats / LN2;
}

/**
 * Gaussian conditional Transfer Entropy TE(source → target | conds) in bits, at history length
 * `lag`. TE = I(target_t ; source_past | target_past, conds_past) — the target's own history AND
 * every conditioning child enter jointly (the full-N-way, synergy-safe conditioning).
 * Signals are CONTINUOUS vector series (rows = time, cols = dims). `conds=[]` ⇒ bivariate.
 */
export function gaussianConditionalTE(
  source: Obs, target: Obs, conds: readonly Obs[] = [], lag = 1,
): number {
  let T = Math.min(source.length, target.length);
  for (const c of conds) T = Math.min(T, c.length);
  if (T <= lag + 1) return 0;

  const X: number[][] = [];   // source past
  const Y: number[][] = [];   // target future
  const Z: number[][] = [];   // target past + conds past (jointly)
  for (let t = lag; t < T; t++) {
    Y.push([...(target[t] ?? [])]);
    const xp: number[] = [];
    const zp: number[] = [];
    for (let l = 1; l <= lag; l++) {
      xp.push(...(source[t - l] ?? []));
      zp.push(...(target[t - l] ?? []));
    }
    for (const c of conds) for (let l = 1; l <= lag; l++) zp.push(...(c[t - l] ?? []));
    X.push(xp);
    Z.push(zp);
  }
  return gaussianConditionalTE_core(X, Y, Z);
}

function gaussianConditionalTE_core(X: Obs, Y: Obs, Z: Obs): number {
  return gaussianCMI(X, Y, Z);
}
