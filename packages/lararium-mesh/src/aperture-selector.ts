/**
 * aperture-selector — the machina's first PERCEIVER→AGENT move: the sensorium stops reading at a
 * FIXED grain and CHOOSES its aperture band. The scale-selector twin of the Fisher-Rao drift-lens.
 *
 * ## The one tensor, read two ways (the ground)
 *
 * `AᵀΣ⁻¹A` IS a FISHER-INFORMATION matrix of a local linear-Gaussian band model `x_{t+1} = A·x_t + e`,
 * `e ~ N(0,Σ)`. The drift-lens (Fisher-Rao) reads it as a metric — how far the reading-state drifts
 * WITHIN a scale; the aperture-selector reads its SINGULAR SPECTRUM to CHOOSE the scale. Same matrix,
 * two questions: drift-within vs which-scale. This module is the second reading.
 *
 * ## The SVD-based causal-emergence gradient (arXiv 2502.08261)
 *
 * For a band's local linear-Gaussian model `(A_k, Σ_k)`, a reversibility-like readout:
 *
 *   γ_α = (1/n)·[ (½ − α/4)·Σ_i ln sᵢ  +  (α/4)·Σ_i ln κᵢ ]
 *
 * where `sᵢ = svd(AᵀΣ⁻¹A)` (the Fisher spectrum), `κᵢ = svd(Σ⁻¹)` (the precision spectrum), `α∈(0,2)`,
 * and `n` = the model dimension. `AᵀΣ⁻¹A` and `Σ⁻¹` are symmetric PSD, so their singular values ARE
 * their eigenvalues — one Jacobi eigendecomposition each ({@link jacobiEigen}, reused from ffz-project).
 *
 * The COARSE-GRAINING at threshold `ε`: keep the Fisher directions with `sᵢ ≥ ε`, DROP the rest. The
 * projector `W*` onto the retained Fisher eigenvectors IS the coarse-graining — "for free" from the
 * eigendecomposition (the paper's second SVD). The reduced (macro) model's γ is `γ_k(ε)`, and
 *
 *   ΔΓ_k(ε) = γ_k(ε) − γ_k
 *
 * When `ΔΓ_k(ε) > 0`, dropping the sub-ε dimensions RAISES reversibility ⇒ the MACRO beats the MICRO
 * ⇒ steer the aperture COARSER. `argmax_k γ_k(ε)` names the EMERGENT band across the pulse→theme ladder.
 *
 * THE NAMED FUTURE WITH A PRICE: the coarse read buys reversibility by DISCARDING the sub-ε Fisher
 * directions; the price it pays is `Σ ln sᵢ` over exactly those discarded singulars — the micro
 * log-information surrendered to name the macro.
 *
 * ## The Emergent-Complexity HUD gauge
 *
 * The ENTROPY of the `|ΔΓ_k|` profile across the pulse→theme ladder ({@link emergentComplexity}):
 * TOP-HEAVY (mass on one band) ⇒ one true scale, low entropy; SPREAD ⇒ live mesoscale structure,
 * high entropy. Rendered on the 0..20 register beside the other sensorium gauges.
 *
 * ## Regime
 *
 * GAUSSIAN ONLY — the readout is exact for a linear-Gaussian band model and an honest APPROXIMATION
 * elsewhere. A non-Gaussian / strongly-nonlinear band is the marked HORIZON (escalation to a
 * KSG/kernel estimator rides the sidecar, not here). The fit is a THIN cap: it fits `(A_k, Σ_k)` by
 * one multivariate least-squares pass and reads the spectra — no iteration, no sidecar, no deps.
 *
 * Platform-blind, pure. Meme: lar:///ha.ka.ba/lares/api/pono/scale-architecture (the EI-selection
 * north-star, here BUILT) · lar:///ha.ka.ba/lares/api/pono/sensorium-rhymes#the-predictive-upgrade
 */

import { jacobiEigen } from "./ffz-project.js";

const EPS = 1e-12;
/** Ridge floor on eigenvalues before a log / an inverse — keeps a rank-deficient band finite. */
const EIG_FLOOR = 1e-9;

/** The aperture ladder, fine→coarse (noosphere-boot #law-of-5s, the Aperture ladder-0 bands). */
export const APERTURE_LADDER = ["Pulse", "Beat", "Measure", "Arc", "Theme"] as const;
export type ApertureBand = (typeof APERTURE_LADDER)[number];

// ── the thin per-band linear-Gaussian fit — `x_{t+1} = A·x_t + e`, `e ~ N(0,Σ)` ──────────────

/** A band's fitted local linear-Gaussian model — the Fisher fit the selector rides as a thin cap. */
export interface LinearGaussianBand {
  /** the d×d one-step transition A (least-squares VAR(1)). */
  readonly A: number[][];
  /** the d×d residual covariance Σ = cov(x_{t+1} − A·x_t). */
  readonly Sigma: number[][];
  /** the model dimension (number of planes / embedding dims). */
  readonly d: number;
  /** the transition pairs the fit consumed. */
  readonly nPairs: number;
  /** true ⇒ too few pairs / rank-deficient regressor: A fell back toward persistence (A≈I). */
  readonly degenerate: boolean;
}

/** Coerce a signal to a frames×dims matrix (a scalar series ⇒ a single column). */
function asFrames(signal: readonly number[] | readonly (readonly number[])[]): number[][] {
  if (signal.length === 0) return [];
  return Array.isArray(signal[0])
    ? (signal as readonly (readonly number[])[]).map((r) => [...r])
    : (signal as readonly number[]).map((v) => [v]);
}

function zeros(n: number, m: number): number[][] {
  return Array.from({ length: n }, () => new Array<number>(m).fill(0));
}
function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
}
/** C = A·B (a:n×k, b:k×m). */
function matMul(a: readonly (readonly number[])[], b: readonly (readonly number[])[]): number[][] {
  const n = a.length;
  const k = n > 0 ? a[0]!.length : 0;
  const m = b.length > 0 ? b[0]!.length : 0;
  const out = zeros(n, m);
  for (let i = 0; i < n; i++) {
    for (let p = 0; p < k; p++) {
      const aip = a[i]![p]!;
      if (aip === 0) continue;
      const bp = b[p]!;
      for (let j = 0; j < m; j++) out[i]![j]! += aip * (bp[j] ?? 0);
    }
  }
  return out;
}
/** Aᵀ. */
function transpose(a: readonly (readonly number[])[]): number[][] {
  const n = a.length;
  const m = n > 0 ? a[0]!.length : 0;
  const out = zeros(m, n);
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) out[j]![i]! = a[i]![j]!;
  return out;
}

/**
 * Symmetric-PSD inverse via the eigendecomposition: `Σ⁻¹ = V·diag(1/max(λ,floor))·Vᵀ`. Ridge-floored
 * so a near-singular / rank-deficient band stays invertible (never blows to ∞). Returns the inverse
 * AND the eigenvalues (the κ spectrum of Σ⁻¹ is `1/λ(Σ)`, floored — surfaced to skip a second decomp).
 */
function symInverse(sym: readonly (readonly number[])[], floor = EIG_FLOOR): { inv: number[][]; precEig: number[] } {
  const n = sym.length;
  if (n === 0) return { inv: [], precEig: [] };
  const { values, vecs } = jacobiEigen(sym);
  const invEig = values.map((l) => 1 / Math.max(l, floor)); // = κ spectrum of Σ⁻¹
  const inv = zeros(n, n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += (vecs[i]?.[k] ?? 0) * (invEig[k] ?? 0) * (vecs[j]?.[k] ?? 0);
      inv[i]![j]! = s;
    }
  }
  return { inv, precEig: invEig };
}

/** Sample covariance (d×d) of residual rows (rows = obs, cols = dims). */
function covarianceOf(rows: readonly (readonly number[])[]): number[][] {
  const m = rows.length;
  const d = m > 0 ? rows[0]!.length : 0;
  if (d === 0 || m < 2) return zeros(d, d);
  const mean = new Array<number>(d).fill(0);
  for (const r of rows) for (let j = 0; j < d; j++) mean[j]! += (r[j] ?? 0) / m;
  const cov = zeros(d, d);
  for (const r of rows) {
    for (let a = 0; a < d; a++) {
      const da = (r[a] ?? 0) - mean[a]!;
      for (let b = a; b < d; b++) cov[a]![b]! += (da * ((r[b] ?? 0) - mean[b]!)) / (m - 1);
    }
  }
  for (let a = 0; a < d; a++) for (let b = a + 1; b < d; b++) cov[b]![a]! = cov[a]![b]!;
  return cov;
}

/**
 * Fit one band's local linear-Gaussian model `x_{t+1} = A·x_t + e`, `e ~ N(0,Σ)`, by multivariate
 * least squares: `A = (Σ x₁x₀ᵀ)·(Σ x₀x₀ᵀ)⁻¹` (ridge-regularized regressor Gram), `Σ = cov(residuals)`.
 * NO Gaussian VAR fit existed in the sensorium (sensorium-pc fits SCALAR AR(1)/EWMA per column;
 * gaussian-cmi has covariances but no transition) — so this is the thin estimator BUILT for the
 * selector. Graceful: `< 3` pairs or an empty signal ⇒ a persistence fallback (`A = I`, `degenerate`).
 */
export function fitLinearGaussianBand(
  signal: readonly number[] | readonly (readonly number[])[],
  opts: { ridge?: number } = {},
): LinearGaussianBand {
  const ridge = opts.ridge ?? 1e-6;
  const X = asFrames(signal);
  const T = X.length;
  const d = T > 0 ? X[0]!.length : 0;
  if (d === 0) return { A: [], Sigma: [], d: 0, nPairs: 0, degenerate: true };
  const nPairs = Math.max(0, T - 1);
  if (nPairs < 3) {
    // persistence fallback: x̂_{t+1} = x_t; residual covariance from the one-step differences.
    const resid = X.slice(1).map((row, t) => row.map((v, j) => v - (X[t]![j] ?? 0)));
    return { A: identity(d), Sigma: covarianceOf(resid), d, nPairs, degenerate: true };
  }
  const X0 = X.slice(0, -1); // regressors x_t
  const X1 = X.slice(1); // targets x_{t+1}
  // Gram matrices: G = Σ x₀x₀ᵀ (d×d, symmetric PSD), C = Σ x₁x₀ᵀ (d×d).
  const G = zeros(d, d);
  const C = zeros(d, d);
  for (let t = 0; t < X0.length; t++) {
    const a = X0[t]!;
    const b = X1[t]!;
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        G[i]![j]! += (a[i] ?? 0) * (a[j] ?? 0);
        C[i]![j]! += (b[i] ?? 0) * (a[j] ?? 0);
      }
    }
  }
  // ridge the regressor Gram (relative to its trace) so a low-variance band still inverts.
  let tr = 0;
  for (let i = 0; i < d; i++) tr += G[i]![i]!;
  const lambda = ridge * (tr / Math.max(1, d) + EPS);
  for (let i = 0; i < d; i++) G[i]![i]! += lambda;
  const { inv: Ginv } = symInverse(G);
  const A = matMul(C, Ginv); // A = C·G⁻¹
  // residuals e_t = x_{t+1} − A·x_t
  const resid = X1.map((b, t) => {
    const a = X0[t]!;
    return b.map((v, i) => v - A[i]!.reduce((s, aij, j) => s + aij * (a[j] ?? 0), 0));
  });
  const rankOk = tr > EPS;
  return { A, Sigma: covarianceOf(resid), d, nPairs, degenerate: !rankOk };
}

// ── the aperture-selection gradient — γ_α, γ_k(ε), ΔΓ_k(ε), the projector W*, the price ──────

/** One band's causal-emergence read — the full γ, the coarse-grained γ(ε), and the price of coarsening. */
export interface BandEmergence {
  readonly band?: ApertureBand | string;
  /** γ_α of the full micro model. */
  readonly gamma: number;
  /** γ_α of the coarse-grained macro model (sub-ε Fisher dims dropped). */
  readonly gammaCoarse: number;
  /** ΔΓ_k(ε) = γ(ε) − γ — `> 0` ⇒ macro beats micro ⇒ steer coarser. */
  readonly deltaGamma: number;
  /** the Fisher singular spectrum `sᵢ = svd(AᵀΣ⁻¹A)`, descending. */
  readonly fisherSpectrum: number[];
  /** the precision singular spectrum `κᵢ = svd(Σ⁻¹)`, descending. */
  readonly precisionSpectrum: number[];
  /** the retained Fisher dimension count (sᵢ ≥ ε). */
  readonly kept: number;
  /** the discarded count (sᵢ < ε). */
  readonly dropped: number;
  /** the coarse-graining projector W* — columns are the retained Fisher eigenvectors (d×kept). */
  readonly projector: number[][];
  /** the named-future PRICE: `Σ ln sᵢ` over the discarded sub-ε singulars. */
  readonly price: number;
}

function sortDesc(xs: readonly number[]): number[] {
  return [...xs].sort((a, b) => b - a);
}

/**
 * γ_α of a spectrum pair: `(1/n)·[ (½ − α/4)·Σ ln sᵢ + (α/4)·Σ ln κᵢ ]`. Each singular is floored at
 * `EIG_FLOOR` before the log so a zero eigenvalue never sends γ to −∞. `n` = the Fisher spectrum size.
 */
function gammaAlpha(fisher: readonly number[], precision: readonly number[], alpha: number): number {
  const n = fisher.length;
  if (n === 0) return 0;
  const wS = 0.5 - alpha / 4;
  const wK = alpha / 4;
  let sumS = 0;
  for (const s of fisher) sumS += Math.log(Math.max(s, EIG_FLOOR));
  let sumK = 0;
  for (const k of precision) sumK += Math.log(Math.max(k, EIG_FLOOR));
  return (wS * sumS + wK * sumK) / n;
}

/**
 * The full aperture-emergence read of ONE band's linear-Gaussian model. Builds `Fisher = AᵀΣ⁻¹A` and
 * `Σ⁻¹`, reads their (symmetric-PSD) spectra, computes γ (micro), then coarse-grains at `ε`: retain
 * the Fisher directions with `sᵢ ≥ ε`, project `Σ⁻¹` into that subspace via the retained eigenvectors
 * `W*`, and recompute γ(ε) (macro). Returns ΔΓ, W*, and the price `Σ_{dropped} ln sᵢ`.
 *
 * `ε` defaults RELATIVE to the top Fisher singular (`epsilonRel · s_max`), so the threshold tracks the
 * band's own scale rather than an absolute floor (an absolute ε is scale-blind across bands). Pass
 * `epsilonAbs` to override with an absolute cut.
 */
export function bandEmergence(
  band: LinearGaussianBand,
  opts: { alpha?: number; epsilonRel?: number; epsilonAbs?: number } = {},
): BandEmergence {
  const alpha = opts.alpha ?? 1; // α=1 ⇒ the symmetric ½·ln s + ¼·(ln κ − ln s) balance
  const d = band.d;
  if (d === 0) {
    return { gamma: 0, gammaCoarse: 0, deltaGamma: 0, fisherSpectrum: [], precisionSpectrum: [], kept: 0, dropped: 0, projector: [], price: 0 };
  }
  const { inv: SigmaInv, precEig } = symInverse(band.Sigma);
  // Fisher = AᵀΣ⁻¹A (symmetric PSD).
  const At = transpose(band.A);
  const fisherMat = matMul(matMul(At, SigmaInv), band.A);
  const { values: fVals, vecs: fVecs } = jacobiEigen(fisherMat);
  const fisherSpectrum = sortDesc(fVals.map((v) => Math.max(0, v)));
  const precisionSpectrum = sortDesc(precEig.map((v) => Math.max(0, v)));

  const gamma = gammaAlpha(fisherSpectrum, precisionSpectrum, alpha);

  const sMax = fisherSpectrum[0] ?? 0;
  const eps = opts.epsilonAbs ?? (opts.epsilonRel ?? 1e-3) * sMax;
  // retained = Fisher directions with eigenvalue ≥ eps; keep their eigenvectors as W*.
  const idxByVal = fVals.map((v, i) => ({ v: Math.max(0, v), i })).sort((a, b) => b.v - a.v);
  const keepIdx = idxByVal.filter((e) => e.v >= eps).map((e) => e.i);
  const dropVals = idxByVal.filter((e) => e.v < eps).map((e) => e.v);
  const kept = keepIdx.length;
  const dropped = d - kept;

  // W* — d×kept, columns = retained Fisher eigenvectors.
  const projector = zeros(d, Math.max(0, kept));
  keepIdx.forEach((col, c) => {
    for (let r = 0; r < d; r++) projector[r]![c]! = fVecs[r]?.[col] ?? 0;
  });

  // the macro spectra: Fisher_macro eigenvalues = the retained sᵢ (W* diagonalizes Fisher); the
  // macro precision κ = eig(W*ᵀ·Σ⁻¹·W*) — the reduced-subspace precision, generally NOT the top κᵢ.
  let gammaCoarse = 0;
  if (kept > 0) {
    const Wt = transpose(projector);
    const precMacro = matMul(matMul(Wt, SigmaInv), projector); // kept×kept
    const { values: kMacro } = jacobiEigen(precMacro);
    const fisherMacro = sortDesc(keepIdx.map((i) => Math.max(0, fVals[i] ?? 0)));
    gammaCoarse = gammaAlpha(fisherMacro, sortDesc(kMacro.map((v) => Math.max(0, v))), alpha);
  }

  // price = Σ ln sᵢ over the discarded sub-ε singulars (the micro log-info surrendered).
  const price = dropVals.reduce((s, v) => s + Math.log(Math.max(v, EIG_FLOOR)), 0);

  return {
    gamma,
    gammaCoarse,
    deltaGamma: gammaCoarse - gamma,
    fisherSpectrum,
    precisionSpectrum,
    kept,
    dropped,
    projector,
    price,
  };
}

// ── the ladder selector — fit the pulse→theme bands, pick the emergent one ───────────────────

/** The whole aperture-selection read across the ladder — the perceiver→agent move made concrete. */
export interface ApertureSelection {
  /** per-band emergence reads, labeled by ladder position. */
  readonly bands: ReadonlyArray<BandEmergence & { band: ApertureBand | string }>;
  /** the emergent band = `argmax_k γ_k(ε)`. */
  readonly emergentBand: ApertureBand | string;
  readonly emergentIndex: number;
  /** the aperture STEER: coarser when the emergent band's ΔΓ > 0 (macro beats micro), else finer/hold. */
  readonly steer: "coarser" | "finer" | "hold";
  /** W* of the emergent band — the coarse-graining projector, "for free". */
  readonly projector: number[][];
  /** the price of the emergent coarsening (`Σ ln sᵢ` over its discarded singulars). */
  readonly price: number;
  /** the Emergent-Complexity HUD gauge over the ΔΓ profile. */
  readonly emergentComplexity: EmergentComplexity;
}

/**
 * Select the aperture band from a set of per-band linear-Gaussian models. Reads each band's
 * {@link bandEmergence}, then picks `argmax_k γ_k(ε)` as the emergent band and reads the steer from
 * that band's ΔΓ (coarser when macro beats micro). Labels bands by {@link APERTURE_LADDER} position
 * (fine→coarse) unless the caller supplies names. Graceful on an empty ladder (holds).
 */
export function selectAperture(
  bands: readonly LinearGaussianBand[],
  opts: { alpha?: number; epsilonRel?: number; epsilonAbs?: number; steerTol?: number; names?: readonly string[] } = {},
): ApertureSelection {
  const steerTol = opts.steerTol ?? 0;
  const reads = bands.map((b, i) => {
    const e = bandEmergence(b, opts);
    const name = opts.names?.[i] ?? APERTURE_LADDER[i] ?? `band${i}`;
    return { ...e, band: name };
  });
  if (reads.length === 0) {
    return { bands: [], emergentBand: "hold", emergentIndex: -1, steer: "hold", projector: [], price: 0, emergentComplexity: emergentComplexity([]) };
  }
  let emergentIndex = 0;
  for (let i = 1; i < reads.length; i++) if ((reads[i]!.gammaCoarse) > (reads[emergentIndex]!.gammaCoarse)) emergentIndex = i;
  const winner = reads[emergentIndex]!;
  const steer: ApertureSelection["steer"] = winner.deltaGamma > steerTol ? "coarser" : winner.deltaGamma < -steerTol ? "finer" : "hold";
  return {
    bands: reads,
    emergentBand: winner.band,
    emergentIndex,
    steer,
    projector: winner.projector,
    price: winner.price,
    emergentComplexity: emergentComplexity(reads.map((r) => r.deltaGamma)),
  };
}

/**
 * Decompose a multivariate signal into the aperture ladder (dyadic block-mean coarse-grainings:
 * Pulse=raw, Beat=×2, Measure=×4, Arc=×8, Theme=×16 — the same multi-scale decimation the sensorium's
 * critical-slowing-down guard uses), fit a linear-Gaussian model per band, and select the aperture.
 * A coarser band with too few surviving pairs fits its persistence fallback (marked degenerate) —
 * never drops out of the ladder. Convenience over {@link fitLinearGaussianBand} + {@link selectAperture}.
 */
export function selectApertureFromSignal(
  signal: readonly number[] | readonly (readonly number[])[],
  opts: { alpha?: number; epsilonRel?: number; epsilonAbs?: number; steerTol?: number; ridge?: number } = {},
): ApertureSelection {
  const X = asFrames(signal);
  const factors = [1, 2, 4, 8, 16];
  const bands = factors.map((f) => fitLinearGaussianBand(blockMean(X, f), { ...(opts.ridge != null ? { ridge: opts.ridge } : {}) }));
  return selectAperture(bands, opts);
}

/** Block-mean coarse-graining of a multivariate signal by `factor` (non-overlapping windows). */
function blockMean(X: readonly (readonly number[])[], factor: number): number[][] {
  if (factor <= 1) return X.map((r) => [...r]);
  const d = X.length > 0 ? X[0]!.length : 0;
  const out: number[][] = [];
  for (let i = 0; i + factor <= X.length; i += factor) {
    const acc = new Array<number>(d).fill(0);
    for (let j = 0; j < factor; j++) for (let c = 0; c < d; c++) acc[c]! += (X[i + j]![c] ?? 0) / factor;
    out.push(acc);
  }
  return out;
}

// ── the Emergent-Complexity HUD gauge — entropy of the ΔΓ profile across the ladder ──────────

/** The Emergent-Complexity gauge — how spread the mesoscale structure is across the aperture ladder. */
export interface EmergentComplexity {
  /** Shannon entropy (nats) of the normalized |ΔΓ_k| profile. */
  readonly entropy: number;
  /** entropy normalized to 0..1 by ln(K) — 0 ⇒ one true scale, 1 ⇒ fully spread mesoscale. */
  readonly normalized: number;
  /** the 0..20 register reading (noosphere-boot #law-of-5s) — `normalized · 20`. */
  readonly reading: number;
  /** the aperture band whose |ΔΓ| carries the most profile mass (the dominant scale). */
  readonly dominantIndex: number;
  /** true when the profile is TOP-HEAVY (one band > half the mass) ⇒ a single true scale. */
  readonly singleScale: boolean;
}

/**
 * The Emergent-Complexity gauge: the entropy of the `|ΔΓ_k|` profile across the pulse→theme ladder.
 * A TOP-HEAVY profile (mass on one band) reads LOW entropy ⇒ one true scale; a SPREAD profile reads
 * HIGH entropy ⇒ live mesoscale structure (several scales genuinely emergent at once). An all-zero /
 * empty profile reads 0 (no emergence detected). The 0..20 `reading` seats it beside the sensorium's
 * other gauges (the confidence register grain).
 */
export function emergentComplexity(deltaGammas: readonly number[]): EmergentComplexity {
  const mags = deltaGammas.map((d) => Math.abs(d));
  const total = mags.reduce((s, v) => s + v, 0);
  const K = mags.length;
  if (K === 0 || total < EPS) {
    return { entropy: 0, normalized: 0, reading: 0, dominantIndex: -1, singleScale: K > 0 };
  }
  const p = mags.map((v) => v / total);
  let entropy = 0;
  for (const pi of p) if (pi > 0) entropy -= pi * Math.log(pi);
  const normalized = K > 1 ? entropy / Math.log(K) : 0;
  let dominantIndex = 0;
  for (let i = 1; i < p.length; i++) if (p[i]! > p[dominantIndex]!) dominantIndex = i;
  return {
    entropy,
    normalized,
    reading: normalized * 20,
    dominantIndex,
    singleScale: (p[dominantIndex] ?? 0) > 0.5,
  };
}
