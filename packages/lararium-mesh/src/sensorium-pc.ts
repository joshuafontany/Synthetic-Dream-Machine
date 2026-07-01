/**
 * sensorium-pc — the sensorium's PREDICTIVE-CODING core, native + VM-free (the dependency-light
 * hot path). Turns any plane from a feedforward DESCRIBER into a predict → error → precision →
 * update LOOP, and computes the variational free-energy objective
 *   F = Σ_i ½(π_i·ε_i² − ln π_i)  +  Σ_i KL[q_i(x) ‖ p_i(x)].
 *
 * ## Two crucible fixes (li-ki-integrities.md #crucible-tested, 2026-07-01)
 *
 * The crucible demoted the old `F = Σπε² + complexity`: it earned only "the ACCURACY term of VFE"
 * because (1) it omitted the `−ln π` log-precision term — the tell — so precision had no interior
 * optimum, and (2) its complexity was an MDL param-cost, a description-length, NOT a real
 * `KL[q(x)‖p(x)]` to a NAMED prior over causes (so it read as precision-weighted regression in FEP
 * costume). Both are now carried:
 *
 *   FIX 1 — the `−ln π` penalty. The full Gaussian precision term is `½(π·ε² − ln π)`. The `−ln π`
 *   is a prior ON PRECISION: it competes with `½π·ε²` and gives the precision/confidence gain a
 *   UNIQUE INTERIOR optimum `π* = 1/ε̄²` instead of running to a boundary (`{@link vfePrecisionTerm}`,
 *   `{@link optimalPrecision}`, `{@link settlePrecision}`). Without it the objective is monotone in π
 *   — the gain pins at the max (everything maximally salient). It stays inert (`−ln 1 = 0`) in pure
 *   bottom-up ESTIMATE mode (gain 1); it bites a top-down VOW, regularizing over-confident attention.
 *
 *   FIX 2 — the complexity is a REAL KL to a NAMED per-plane prior. Default per plane: the TEMPORAL
 *   / PREDICTIVE prior — the PREVIOUS frame's posterior is THIS frame's prior — so complexity =
 *   Σ_t KL[q_t ‖ q_{t-1}], the belief-movement cost of the running generative model (fits the
 *   streaming sensorium natively). See `{@link gaussianKL}` / `{@link temporalKL}`. Named priors:
 *     · content · structure · bands · coupling  → TEMPORAL predictive prior (real Gaussian KL).
 *     · form (with `formComplexityBits`)         → the induction MDL universal-CODING prior — a
 *       description-length (a coding cross-entropy BOUND on KL), marked `priorKind: "mdl-coding"`,
 *       NOT a Gaussian KL (honest: the two-part code is `−log p` under a coding prior).
 *     · any plane in `approxPriorPlanes` (e.g. COUPLING, the ki cosheaf side) is marked
 *       `priorKind: "temporal-approx"` — a genuine prior over the cross-stream coupling LATENT is
 *       aspirational (its conditional independence fails during coupling, #crucible-tested); the
 *       temporal-KL is honestly flagged as a stand-in, not faked into a coupling KL.
 *
 * The heavy predictive-coding nets + the R early-warning route live behind the python/R sidecars
 * (predictive_coding.py · bands_sidecar.forecast_ews) across the causal-island boundary; THIS
 * module is the pure, numpy-free twin that keeps the online loop dependency-light and puts the
 * ONE load-bearing mapping — precision = the confidence register (0..20) read as a GAIN — where
 * the register conceptually lives (beside ffz-project's confidence ladder).
 *
 * ## The loop (sensorium-rhymes.md #the-predictive-upgrade)
 *
 *   PREDICT   a lightweight generative model g (EWMA / AR(1)) emits the next frame's forecast.
 *   ERROR     ε = obs − pred — what the model got wrong.
 *   PRECISION π, the confidence-as-gain: a top-down confidence VOW SETS it (attention), else a
 *             bottom-up variance-explained estimate REPORTS it. The residual is standardized
 *             (z = ε/σ) so π·z² is dimensionless and the planes sum into ONE comparable F.
 *   UPDATE    g has absorbed each observation online — the loop closes.
 *
 *   F = Σ_i ½(π_i·ε_i² − ln π_i)  +  Σ_i KL[q_i(x) ‖ p_i(x)]   (accuracy − complexity = free
 *   energy = the past-future predictive information the sensorium was always estimating)
 *
 * ## The predictive BANDS leg (the dynamical rhyme)
 *
 * {@link forecastEws} reads critical-slowing-down early-warning signals — rising lag-1
 * autocorrelation + variance (Kendall-τ trend) — to forecast a regime-shift's APPROACH before it
 * commits, guarded by the R keel: it FIRES only on SURROGATE-significance (the τ beats an AR(1)
 * null) AND multi-scale agreement (dyadic bands trend up together). Either alone stays a WATCH.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/sensorium-rhymes#the-predictive-upgrade
 */

const EPS = 1e-9;

/** The confidence-register ceiling (0..20; noosphere-boot #law-of-5s). */
export const CONFIDENCE_MAX = 20;

// ── the π ↔ confidence map — precision IS confidence-as-gain (the load-bearing mapping) ────

/**
 * A top-down confidence VOW (0..20) SETS the precision gain: `π = N/(20−N)` (the odds form).
 * A neutral 10/20 ⇒ gain 1 (the error weighted as-is); 15/20 ⇒ 3; 19/20 ⇒ 19; 0 ⇒ 0. This is
 * how an attention/confidence vow modulates how hard a plane's error pushes on F.
 */
export function confidenceToPrecision(confidence: number): number {
  const c = Math.min(Math.max(confidence, 0), CONFIDENCE_MAX - 1e-6);
  return c / (CONFIDENCE_MAX - c);
}

/**
 * A bottom-up precision ESTIMATE (≥0) expressed as a confidence band (0..20): `conf = 20·π/(1+π)`.
 * The exact inverse of {@link confidenceToPrecision}; π=1 ⇒ 10/20 (neutral), π→∞ ⇒ 20/20. How a
 * plane REPORTS trust in its own prediction.
 */
export function precisionToConfidence(precision: number): number {
  const p = Math.max(0, precision);
  return (CONFIDENCE_MAX * p) / (1 + p);
}

// ── the −ln π precision penalty — the log-precision term that CREATES an interior optimum ───

/**
 * The full Gaussian PRECISION term of VFE, per plane: `½(π·ε̄² − ln π)` (`ε̄²` = the mean squared
 * standardized error). The `−½ ln π` (FIX 1, #crucible-tested) is a prior ON precision. As a
 * function of π it is strictly CONVEX (second derivative `½/π² > 0`) with a UNIQUE interior
 * minimum at `π* = 1/ε̄²` ({@link optimalPrecision}). Drop the `−ln π` and only `½π·ε̄²` remains —
 * MONOTONE increasing in π (min at the π→0 boundary; the salience `π·ε̄²` it weights runs to +∞ as
 * π→∞): no interior optimum, the gain pins at a boundary. `ln 2π` is dropped as a constant.
 */
export function vfePrecisionTerm(precision: number, meanSqErr: number): number {
  const p = Math.max(EPS, precision);
  return 0.5 * (p * meanSqErr - Math.log(p));
}

/** The precision that minimizes {@link vfePrecisionTerm}: `argmin_π ½(π·ε̄² − ln π) = 1/ε̄²`. */
export function optimalPrecision(meanSqErr: number): number {
  return 1 / Math.max(EPS, meanSqErr);
}

export interface PrecisionSettle {
  /** the settled precision. */
  readonly precision: number;
  /** true ⇒ a stationary interior optimum was reached (|∂F/∂π| below tol AND finite). */
  readonly settled: boolean;
  readonly iters: number;
  readonly grad: number;
}

/**
 * SETTLE a plane's precision by gradient flow on the free-energy precision term (FIX 1 in action).
 * With the `−ln π` penalty the gradient `∂/∂π ½(π·ε̄² − ln π) = ½(ε̄² − 1/π)` has a stable interior
 * zero at `π* = 1/ε̄²`, so the flow CONVERGES and STOPS there. Pass `withLogPrecision: false` to
 * drop the penalty: the gradient becomes the constant `½·ε̄² > 0`, the flow slides monotonically to
 * the `π→0` floor and never settles at an interior point — the runaway the penalty cures.
 */
export function settlePrecision(
  meanSqErr: number,
  opts: { init?: number; lr?: number; iters?: number; tol?: number; withLogPrecision?: boolean } = {},
): PrecisionSettle {
  const m = Math.max(EPS, meanSqErr);
  const lr = opts.lr ?? 0.5;
  const maxIters = opts.iters ?? 100_000;
  const tol = opts.tol ?? 1e-9;
  const withLog = opts.withLogPrecision ?? true;
  let p = Math.max(EPS, opts.init ?? 1);
  let grad = 0;
  let i = 0;
  for (; i < maxIters; i++) {
    // ∂/∂π ½(π·ε̄² − ln π) = ½(ε̄² − 1/π); drop the −ln π ⇒ ½·ε̄² (constant, never zero).
    grad = withLog ? 0.5 * (m - 1 / p) : 0.5 * m;
    if (Math.abs(grad) <= tol) break;
    p = Math.max(EPS, p - lr * grad);
  }
  return { precision: p, settled: withLog && Math.abs(grad) <= tol && Number.isFinite(p), iters: i, grad };
}

// ── the KL complexity — a REAL KL[q(x)‖p(x)] to a NAMED per-plane prior (FIX 2) ─────────────

/**
 * KL divergence between two univariate Gaussians, `KL[N(μq,σq²) ‖ N(μp,σp²)]` in NATS:
 * `ln(σp/σq) + (σq² + (μq−μp)²)/(2σp²) − ½`. The honest complexity currency: how far a plane's
 * POSTERIOR `q` moved from its named PRIOR `p` over causes.
 */
export function gaussianKL(muQ: number, varQ: number, muP: number, varP: number): number {
  const vq = Math.max(EPS, varQ);
  const vp = Math.max(EPS, varP);
  return 0.5 * Math.log(vp / vq) + (vq + (muQ - muP) * (muQ - muP)) / (2 * vp) - 0.5;
}

/**
 * The TEMPORAL / PREDICTIVE prior's complexity (FIX 2): `Σ_t KL[q_t ‖ q_{t-1}]` over the plane's
 * belief trajectory `means` (the running generative model's per-frame posterior mean), the PREVIOUS
 * frame's posterior serving as THIS frame's prior. Equal-variance case (both `σ²`) ⇒ each step
 * reduces to the belief-MOVEMENT cost `½(Δμ/σ)²`. Real KL to a real, named prior — not an MDL code.
 */
export function temporalKL(means: readonly number[], variance = 1): number {
  const v = Math.max(EPS, variance);
  let kl = 0;
  for (let t = 1; t < means.length; t++) kl += gaussianKL(means[t]!, v, means[t - 1]!, v);
  return kl;
}

// ── the generative models `g_i` — lightweight one-step predictors ──────────────────────────

/** Coerce a plane's observations to a column-major `number[][]` (frames × dims). */
function asMatrix(obs: readonly number[] | readonly (readonly number[])[]): number[][] {
  if (obs.length === 0) return [];
  return Array.isArray(obs[0]) ? (obs as readonly (readonly number[])[]).map((r) => [...r]) : (obs as readonly number[]).map((v) => [v]);
}

function column(M: number[][], j: number): number[] {
  return M.map((r) => r[j] ?? 0);
}

/**
 * EWMA one-step-ahead prediction: `pred[t]` = the exponentially-weighted mean of `x[:t]` (the
 * running generative model's forecast of the next frame BEFORE it arrives). `pred[0]` opens at
 * `x[0]`. The state UPDATES online each step — the predict→update loop's generative model.
 */
export function ewmaPredict(x: readonly number[], alpha = 0.3): number[] {
  const n = x.length;
  const pred = new Array<number>(n).fill(0);
  if (n === 0) return pred;
  let s = x[0]!;
  pred[0] = s;
  for (let t = 1; t < n; t++) {
    pred[t] = s; // predict from the state BEFORE seeing x[t]
    s = (1 - alpha) * s + alpha * x[t]!; // UPDATE with the observation
  }
  return pred;
}

/**
 * AR(1) one-step prediction: fit `x[t] ≈ a·x[t-1] + b` by least squares, then predict. Returns
 * the predictions + the fitted-parameter count (2, or 0 for a too-short/degenerate column that
 * falls back to predict-previous).
 */
export function ar1FitPredict(x: readonly number[]): { pred: number[]; nParams: number } {
  const n = x.length;
  const pred = new Array<number>(n).fill(0);
  if (n < 3) {
    for (let t = 1; t < n; t++) pred[t] = x[t - 1]!;
    pred[0] = n ? x[0]! : 0;
    return { pred, nParams: 0 };
  }
  // least squares of x1 = a·x0 + b
  const x0 = x.slice(0, -1);
  const x1 = x.slice(1);
  const m = x0.length;
  const mx = x0.reduce((s, v) => s + v, 0) / m;
  const my = x1.reduce((s, v) => s + v, 0) / m;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < m; i++) {
    sxx += (x0[i]! - mx) * (x0[i]! - mx);
    sxy += (x0[i]! - mx) * (x1[i]! - my);
  }
  const a = sxx > EPS ? sxy / sxx : 1;
  const b = my - a * mx;
  pred[0] = x[0]!;
  for (let t = 1; t < n; t++) pred[t] = a * x[t - 1]! + b;
  return { pred, nParams: 2 };
}

/**
 * The complexity term of F, in BITS — a two-part-code param cost `½·k·log2(n)` (the BIC/MDL
 * penalty). The SAME MDL spirit the FORM plane's induction ledger prices a grammar with
 * (form_induction.description_length), lifted to a generative model's parameter count.
 */
export function modelComplexity(nParams: number, nObs: number): number {
  if (nParams <= 0 || nObs <= 1) return 0;
  return 0.5 * nParams * Math.log2(Math.max(2, nObs));
}

// ── the per-plane predict → error → precision → update loop ────────────────────────────────

export interface PlaneRead {
  readonly n: number;
  readonly model: "ewma" | "ar1";
  readonly nParams: number;
  /** the GAIN π that weights ε² in F (= confidence-as-gain). */
  readonly precision: number;
  /** the confidence the plane carries (the vow, or the bottom-up estimate). */
  readonly confidence: number;
  readonly confidenceSource: "vow" | "estimate";
  /** the bottom-up variance-explained self-report, always exposed. */
  readonly estConfidence: number;
  /** surprise = π · mean(z²) — the precision-weighted-error part of the accuracy term. */
  readonly surprise: number;
  /** the `−½ ln π` log-precision penalty (FIX 1) — the interior-optimum term; 0 at gain 1. */
  readonly logPrecisionPenalty: number;
  /** the MDL param-cost `½·k·log₂ n` (a description-length, kept for reference / the form override). */
  readonly complexity: number;
  /** the REAL KL complexity (FIX 2): Σ_t KL[q_t ‖ q_{t-1}] to the TEMPORAL predictive prior. */
  readonly complexityKL: number;
  readonly meanSqZ: number;
  /** the precision-weighted residual the plane EMITS instead of the raw feature. */
  readonly output: number[];
}

export interface PlanePcOptions {
  readonly model?: "ewma" | "ar1";
  readonly alpha?: number;
  /** a top-down confidence VOW (0..20) that SETS the precision gain; absent ⇒ neutral gain 1. */
  readonly confidence?: number;
  /** opening frames excluded from the surprise (no history to predict from). */
  readonly warmup?: number;
}

/**
 * ONE plane's predictive-coding loop. Emits the SURPRISE (prediction-error energy), not the raw
 * features. Precision = confidence-as-gain, wired both ways: a `confidence` vow SETS the gain,
 * else the plane REPORTS a bottom-up variance-explained confidence and the gain stays neutral
 * (1) — the error un-modulated. Graceful (surprise 0) on an empty / single-frame plane.
 */
export function planePc(
  obs: readonly number[] | readonly (readonly number[])[],
  opts: PlanePcOptions = {},
): PlaneRead {
  const model = opts.model ?? "ewma";
  const alpha = opts.alpha ?? 0.3;
  const warmup = opts.warmup ?? 1;
  const M = asMatrix(obs);
  const n = M.length;
  if (n === 0) {
    return { n: 0, model, nParams: 0, precision: 0, confidence: 0, confidenceSource: "estimate", estConfidence: 0, surprise: 0, logPrecisionPenalty: 0, complexity: 0, complexityKL: 0, meanSqZ: 0, output: [] };
  }
  const dims = M[0]!.length;

  // PREDICT + implicit UPDATE, per column; accumulate the standardized squared error AND the
  // TEMPORAL-prior KL (the belief-movement cost Σ_t KL[q_t ‖ q_{t-1}] of the running g, FIX 2).
  let nParams = 0;
  const w = Math.max(0, Math.min(warmup, n));
  let sumSq = 0;
  let count = 0;
  let klSum = 0;
  const outAgg = new Array<number>(n).fill(0);
  for (let j = 0; j < dims; j++) {
    const col = column(M, j);
    let pred: number[];
    if (model === "ar1") {
      const r = ar1FitPredict(col);
      pred = r.pred;
      nParams += r.nParams;
    } else {
      pred = ewmaPredict(col, alpha);
      nParams += 1;
    }
    // standardize by the column's own scale so z² is dimensionless / cross-plane comparable
    const mean = col.reduce((s, v) => s + v, 0) / n;
    const varc = col.reduce((s, v) => s + (v - mean) * (v - mean), 0) / n;
    const sigma = Math.sqrt(varc) < EPS ? 1 : Math.sqrt(varc);
    for (let t = 0; t < n; t++) {
      const z = (col[t]! - pred[t]!) / sigma;
      outAgg[t]! += z; // aggregated precision-weighted residual (scaled below)
      if (t >= w) {
        sumSq += z * z;
        count++;
      }
    }
    // the running generative belief `pred` (standardized) is the sequence of posterior means; the
    // previous frame's posterior is this frame's prior ⇒ complexity = Σ_t KL[q_t ‖ q_{t-1}].
    klSum += temporalKL(pred.map((p) => p / sigma), 1);
  }
  const meanSqZ = count > 0 ? sumSq / count / Math.max(1, dims) : 0;
  const complexityKL = klSum / Math.max(1, dims);

  // BOTTOM-UP self-report: variance-explained precision π̂ = 1/mean(z²), as a confidence band.
  const estPrecision = 1 / (meanSqZ + EPS);
  const estConfidence = precisionToConfidence(estPrecision);

  // THE GAIN π: a top-down vow SETS it; absent, the gain stays neutral (1) and the plane
  // reports its estimated confidence. Both ride the one π↔confidence map (precision-as-gain).
  let gain: number;
  let confidence: number;
  let confidenceSource: "vow" | "estimate";
  if (opts.confidence != null) {
    gain = confidenceToPrecision(opts.confidence);
    confidence = Math.min(Math.max(opts.confidence, 0), CONFIDENCE_MAX);
    confidenceSource = "vow";
  } else {
    gain = 1;
    confidence = estConfidence;
    confidenceSource = "estimate";
  }

  const surprise = gain * meanSqZ; // π · mean(z²) — the precision-weighted error
  // FIX 1: the −½ ln π log-precision penalty. Inert at gain 1 (−ln 1 = 0, estimate mode); it bites
  // a top-down VOW, giving the vowed precision an interior optimum instead of pinning at max.
  const logPrecisionPenalty = -0.5 * Math.log(Math.max(EPS, gain));
  const complexity = modelComplexity(nParams, n);
  const output = outAgg.map((z) => (gain * z) / Math.max(1, dims));

  return { n, model, nParams, precision: gain, confidence, confidenceSource, estConfidence, surprise, logPrecisionPenalty, complexity, complexityKL, meanSqZ, output };
}

// ── the free-energy objective F = Σ ½(π·ε² − ln π) + Σ KL[q‖p] over the planes ──────────────

/** Which named prior priced a plane's complexity term (FIX 2, #crucible-tested). */
export type PriorKind = "temporal" | "mdl-coding" | "temporal-approx";

export interface FreeEnergy {
  readonly F: number;
  /** the precision-weighted-error part of accuracy, `Σ π·ε̄²`. */
  readonly accuracy: number;
  /** the `Σ −½ ln π` log-precision penalty (FIX 1) — 0 unless a plane carries a vow. */
  readonly precisionPenalty: number;
  /** the complexity term, `Σ KL[q‖p]` to the named per-plane priors (FIX 2). */
  readonly complexity: number;
  readonly perPlane: Record<string, { surprise: number; logPrecisionPenalty: number; complexity: number; priorKind: PriorKind; precision: number; confidence: number; confidenceSource: "vow" | "estimate"; n: number }>;
}

export interface FreeEnergyOptions {
  readonly model?: "ewma" | "ar1";
  readonly alpha?: number;
  /** per-plane top-down confidence vows (0..20) SETTING that plane's precision gain. */
  readonly confidences?: Record<string, number>;
  /**
   * the FORM plane's complexity supplied DIRECTLY as the induction MDL description-length (bits) —
   * the universal-CODING prior (`−log p` under a two-part code, a cross-entropy BOUND on KL, not a
   * Gaussian KL). Replaces that plane's temporal-KL and marks it `priorKind: "mdl-coding"`.
   */
  readonly formComplexityBits?: number;
  /**
   * Planes whose temporal-KL is only an APPROXIMATE prior — e.g. COUPLING (the ki cosheaf side): a
   * genuine prior over the cross-stream coupling LATENT is aspirational, its conditional
   * independence fails during coupling (#crucible-tested). Marked `priorKind: "temporal-approx"`,
   * honestly flagged rather than faked into a coupling KL.
   */
  readonly approxPriorPlanes?: readonly string[];
}

/**
 * The sensorium's per-frame OBJECTIVE: `F = Σ_i ½(π_i·ε_i² − ln π_i) + Σ_i KL[q_i ‖ p_i]` over the
 * planes. Each plane runs its own {@link planePc}; `accuracy` sums the precision-weighted surprises,
 * `precisionPenalty` sums the `−½ ln π` log-precision terms (FIX 1, non-zero only where a plane
 * carries a top-down vow), and `complexity` sums each plane's REAL KL to its NAMED prior (FIX 2) —
 * the temporal predictive prior by default. `formComplexityBits` swaps the FORM plane's KL for the
 * induction ledger's MDL coding-bits (`priorKind: "mdl-coding"`); `approxPriorPlanes` marks planes
 * (e.g. coupling) whose temporal-KL stands in for an aspirational latent prior.
 */
export function freeEnergy(
  planes: Record<string, readonly number[] | readonly (readonly number[])[]>,
  opts: FreeEnergyOptions = {},
): FreeEnergy {
  const confidences = opts.confidences ?? {};
  const approx = new Set(opts.approxPriorPlanes ?? []);
  const perPlane: FreeEnergy["perPlane"] = {};
  let accuracy = 0;
  let precisionPenalty = 0;
  let complexity = 0;
  for (const [name, obs] of Object.entries(planes)) {
    const conf = confidences[name];
    const r = planePc(obs, {
      ...(opts.model !== undefined ? { model: opts.model } : {}),
      ...(opts.alpha !== undefined ? { alpha: opts.alpha } : {}),
      ...(conf !== undefined ? { confidence: conf } : {}),
    });
    // complexity = a REAL KL to a NAMED prior (FIX 2). Default: the temporal predictive prior.
    let planeComplexity = r.complexityKL;
    let priorKind: PriorKind = approx.has(name) ? "temporal-approx" : "temporal";
    // form's induction MDL bits swap in a universal-CODING prior (a description-length, not a KL).
    if (name === "form" && opts.formComplexityBits != null) {
      planeComplexity = opts.formComplexityBits;
      priorKind = "mdl-coding";
    }
    perPlane[name] = { surprise: r.surprise, logPrecisionPenalty: r.logPrecisionPenalty, complexity: planeComplexity, priorKind, precision: r.precision, confidence: r.confidence, confidenceSource: r.confidenceSource, n: r.n };
    accuracy += r.surprise;
    precisionPenalty += r.logPrecisionPenalty;
    complexity += planeComplexity;
  }
  return { F: accuracy + precisionPenalty + complexity, accuracy, precisionPenalty, complexity, perPlane };
}

// ── the predictive BANDS leg — critical-slowing-down early-warning signals (native) ─────────

/** Kendall's τ-b of a series against its time index — the monotone-TREND statistic (rising ⇒ τ>0). */
export function kendallTau(y: readonly number[]): number {
  const n = y.length;
  if (n < 3) return 0;
  let conc = 0;
  let disc = 0;
  let ty = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = y[j]! - y[i]!;
      if (d > 0) conc++;
      else if (d < 0) disc++;
      else ty++;
    }
  }
  const n0 = (n * (n - 1)) / 2;
  const denom = Math.sqrt(Math.max(1, n0 - ty) * n0);
  return denom > 0 ? (conc - disc) / denom : 0;
}

/** A right-aligned rolling map (fn over each length-`window` slice) → the indicator series. */
function rolling(x: readonly number[], window: number, fn: (s: number[]) => number): number[] {
  const n = x.length;
  if (n < window || window < 2) return [];
  const out: number[] = [];
  for (let i = window - 1; i < n; i++) out.push(fn(x.slice(i - window + 1, i + 1)));
  return out;
}

function variance(s: readonly number[]): number {
  const m = s.reduce((a, v) => a + v, 0) / s.length;
  return s.reduce((a, v) => a + (v - m) * (v - m), 0) / s.length;
}

/** Lag-1 autocorrelation of a window — the critical-slowing-down precursor. */
function lag1Ac(s: readonly number[]): number {
  const m = s.reduce((a, v) => a + v, 0) / s.length;
  let d = 0;
  let num = 0;
  for (let i = 0; i < s.length; i++) d += (s[i]! - m) * (s[i]! - m);
  for (let i = 0; i < s.length - 1; i++) num += (s[i]! - m) * (s[i + 1]! - m);
  return d < EPS ? 0 : num / d;
}

/** A tiny xorshift PRNG (deterministic, dependency-free) + a Box-Muller normal draw. */
function rng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
}
function normal(u: () => number): number {
  const a = Math.max(u(), 1e-12);
  const b = u();
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
}

/**
 * One AR(1)-null SURROGATE of `x`: fit `x[t] ≈ a·x[t-1]` (+ residual σ), then simulate a fresh
 * series with the SAME a, σ, and INITIAL condition (so a burn-in transient rides the null too —
 * the surrogate stays a FAIR test of a rising trend, not fooled by from-equilibrium starts).
 */
export function ar1Surrogate(x: readonly number[], u: () => number): number[] {
  const n = x.length;
  if (n < 3) return [...x];
  const mean = x.reduce((a, v) => a + v, 0) / n;
  const xc = x.map((v) => v - mean);
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n - 1; i++) {
    sxx += xc[i]! * xc[i]!;
    sxy += xc[i]! * xc[i + 1]!;
  }
  let a = sxx > EPS ? sxy / sxx : 0;
  a = Math.min(Math.max(a, -0.999), 0.999);
  let rv = 0;
  for (let i = 0; i < n - 1; i++) {
    const r = xc[i + 1]! - a * xc[i]!;
    rv += r * r;
  }
  const sd = Math.sqrt(rv / Math.max(1, n - 1)) || 1e-6;
  const s = new Array<number>(n).fill(0);
  s[0] = xc[0]!; // match the observed initial condition (fair null under burn-in)
  for (let t = 1; t < n; t++) s[t] = a * s[t - 1]! + sd * normal(u);
  return s.map((v) => v + mean);
}

/**
 * One-sided surrogate p-value for a RISING indicator trend: the fraction of AR(1)-null surrogates
 * whose indicator Kendall-τ is ≥ the observed τ. Small p ⇒ the rising trend is unlikely under an
 * AR(1) null with the same autocorrelation (the R-keel: detection that survives its own null).
 */
export function surrogatePValue(
  x: readonly number[],
  window: number,
  indicator: "ar1" | "variance",
  nSurr = 200,
  seed = 1,
): number {
  const fn = indicator === "ar1" ? lag1Ac : variance;
  const series = rolling(x, window, fn);
  if (series.length < 3) return 1;
  const obs = kendallTau(series);
  const u = rng(seed);
  let ge = 1; // +1 (the observed itself) — a conservative, never-zero p
  for (let k = 0; k < nSurr; k++) {
    const sur = ar1Surrogate(x, u);
    if (kendallTau(rolling(sur, window, fn)) >= obs) ge++;
  }
  return ge / (nSurr + 1);
}

export interface ForecastRead {
  readonly fired: boolean;
  readonly state: "FORECAST" | "WATCH" | "QUIET";
  readonly n: number;
  readonly window: number;
  readonly ar1Tau: number;
  readonly ar1P: number;
  readonly varTau: number;
  readonly varP: number;
  readonly surrogateSignificant: boolean;
  readonly multiBandAgreement: boolean;
  readonly bandsRising: number;
  readonly note: string;
}

/**
 * Block-mean coarse-graining by `factor` — a lightweight multi-scale decimation (no wavelet dep).
 * The rising-AC1 critical-slowing-down signal PERSISTS under coarse-graining, so agreement across
 * scales is the anti-apophenia guard's multi-band analog (robust even when the total variance is
 * held flat, unlike a variance-only band read).
 */
function coarseGrain(x: readonly number[], factor: number): number[] {
  if (factor <= 1) return [...x];
  const out: number[] = [];
  for (let i = 0; i + factor <= x.length; i += factor) {
    let s = 0;
    for (let j = 0; j < factor; j++) s += x[i + j]!;
    out.push(s / factor);
  }
  return out;
}

/**
 * The PREDICTIVE bands leg — forecast an approaching bifurcation from critical-slowing-down.
 * The pooled signal carries the PRIMARY indicators (rolling lag-1-AC + variance + their Kendall-τ,
 * each with an AR(1)-surrogate p-value); dyadic bands carry the multi-scale agreement guard.
 *
 * THE GUARD (the R keel, LOAD-BEARING): FIRES only on (1) SURROGATE-significance — the AC1 or
 * variance rising trend beats the AR(1) null (p ≤ alpha) — AND (2) MULTI-BAND agreement — ≥
 * `minBands` dyadic bands show a rising variance-τ. Either alone stays a WATCH (the apophenia
 * guard). Graceful (QUIET, un-fired) on too-few samples.
 */
export function forecastEws(
  signal: readonly number[] | readonly (readonly number[])[],
  opts: { window?: number; nSurr?: number; alpha?: number; minBands?: number; seed?: number } = {},
): ForecastRead {
  const M = asMatrix(signal);
  const n = M.length;
  const pooled = M.map((r) => r.reduce((a, v) => a + v, 0) / r.length);
  const window = n >= 10 ? Math.max(5, Math.min(opts.window ?? 50, Math.floor(n / 2))) : 0;
  if (n < 12 || window < 5) {
    return { fired: false, state: "QUIET", n, window, ar1Tau: 0, ar1P: 1, varTau: 0, varP: 1, surrogateSignificant: false, multiBandAgreement: false, bandsRising: 0, note: "ews-skipped: too few samples (<12)" };
  }
  const alpha = opts.alpha ?? 0.05;
  const minBands = opts.minBands ?? 2;
  const nSurr = opts.nSurr ?? 200;
  const seed = opts.seed ?? 1;

  const ar1Tau = kendallTau(rolling(pooled, window, lag1Ac));
  const varTau = kendallTau(rolling(pooled, window, variance));
  const ar1P = surrogatePValue(pooled, window, "ar1", nSurr, seed);
  const varP = surrogatePValue(pooled, window, "variance", nSurr, seed);

  // MULTI-SCALE agreement: the rising lag-1-AC must persist across block-mean coarse-grainings
  // (the robust CSD signal survives decimation). Count the scales whose AC1 trends UP.
  let bandsRising = 0;
  for (const factor of [1, 2, 3, 4]) {
    const cg = coarseGrain(pooled, factor);
    const cwin = Math.max(5, Math.min(window, Math.floor(cg.length / 2)));
    if (cg.length >= 12 && kendallTau(rolling(cg, cwin, lag1Ac)) > 0) bandsRising++;
  }

  const surrogateSignificant = ar1P <= alpha || varP <= alpha;
  const multiBandAgreement = bandsRising >= minBands;
  const fired = surrogateSignificant && multiBandAgreement;
  const state: ForecastRead["state"] = fired ? "FORECAST" : surrogateSignificant || multiBandAgreement ? "WATCH" : "QUIET";
  return {
    fired,
    state,
    n,
    window,
    ar1Tau,
    ar1P,
    varTau,
    varP,
    surrogateSignificant,
    multiBandAgreement,
    bandsRising,
    note: `critical-slowing-down ${state}: AR1-τ ${ar1Tau.toFixed(2)} (p=${ar1P.toFixed(3)}) · var-τ ${varTau.toFixed(2)} (p=${varP.toFixed(3)}) · ${bandsRising} bands rising`,
  };
}
