/**
 * null-harness — the self-emergent-threshold engine (null-calibration sprint keystone). A threshold EMERGES
 * from a surrogate null rather than a hardcoded constant: surrogate the data to destroy the structure under
 * test, recompute the instrument statistic over the surrogates, read the (1−α) quantile as the threshold. A
 * real signal EXCEEDS its null; noise sits within it.
 *
 * THE SPINE (informational, NEVER literal heat — the H-vs-S ward): the surrogate null generates the
 * EQUILIBRIUM distribution — structure dissolved, informational entropy H maximal. A live pattern holds a
 * NON-equilibrium steady-state ABOVE that null, sustained by the negentropy inflow (the operator's attention
 * holding the agent-persona against drift-toward-equilibrium — the degenerate/nameless-cluster collapse). The
 * gap (observed − null-quantile) reads the informational ΔS the pattern maintains, behind the causal-island
 * (Markov-blanket) boundary. This spends SHANNON-H, never thermodynamic-S; conflating the two repeats the
 * recurring category error (see the informational-NESS-not-heat ward). Stated informational, it stands.
 *
 * Two surrogate families destroy DIFFERENT structure → test a different NESS:
 *  - iid-shuffle — permute the samples, destroying ALL temporal/cross-sample order (the structure/Qα null).
 *  - phase-scramble (Fourier/AAFT, a later increment — needs a small-n DFT) — randomize phases, PRESERVING the
 *    power spectrum, destroying only phase structure (the rigidity/rhythm null: real lock vs spectral artifact).
 *
 * The PRNG rides a local seed (mulberry32) — deterministic, reproducible, no global-now Math.random; the seed
 * lives per-call (a causal-island-local instrument, never a shared clock).
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/mesh/flow
 */

import type { ArlDial } from "./arl-dial.js";

/** A deterministic PRNG (mulberry32) from a local seed — reproducible nulls, no global randomness. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** iid-shuffle surrogate — Fisher-Yates permute, destroying all order (the equilibrium of a structure test). */
export function iidShuffle(series: readonly number[], rng: () => number): number[] {
  const out = series.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

export interface NullVerdict {
  /** The (1−α) quantile of the statistic under the surrogate null — the self-emergent threshold (the
   *  equilibrium ceiling; no hardcoded constant). */
  readonly threshold: number;
  /** statistic(series) — the observed value the live pattern carries. */
  readonly observed: number;
  /** Right-tail p-value = (#{null ≥ observed} + 1)/(trials + 1) — the +1 finite-sample correction (North et
   *  al. 1982), conservative, never 0. */
  readonly pValue: number;
  /** observed > threshold — a NESS departure from the equilibrium null (structure holds above the noise floor). */
  readonly exceeds: boolean;
}

/**
 * Calibrate a self-emergent threshold for an instrument `statistic` against a `surrogate` null: recompute the
 * statistic over `trials` surrogates, read the (1−α) quantile as the threshold + a right-tail p-value. The
 * observed value exceeding the threshold names a non-equilibrium steady-state — informational structure the
 * negentropy inflow holds above the surrogate's max-entropy equilibrium. No hardcoded threshold: it EMERGES.
 */
export function surrogateNull(
  series: readonly number[],
  statistic: (s: readonly number[]) => number,
  surrogate: (s: readonly number[], rng: () => number) => number[],
  opts: { trials?: number; alpha?: number; seed?: number } = {},
): NullVerdict {
  const trials = Math.max(1, opts.trials ?? 200);
  const alpha = opts.alpha ?? 0.05;
  const rng = makeRng(opts.seed ?? 1);
  const observed = statistic(series);
  const nullStat: number[] = [];
  let ge = 0;
  for (let t = 0; t < trials; t++) {
    const s = statistic(surrogate(series, rng));
    nullStat.push(s);
    if (s >= observed) ge += 1;
  }
  nullStat.sort((a, b) => a - b);
  const idx = Math.min(nullStat.length - 1, Math.max(0, Math.ceil((1 - alpha) * nullStat.length) - 1));
  const threshold = nullStat[idx]!;
  const pValue = (ge + 1) / (trials + 1);
  return { threshold, observed, pValue, exceeds: observed > threshold };
}

/**
 * Wire the surrogate-null into the ONE dial: the ARL₀ dial's α sets the (1−α) quantile the surrogate-null
 * reads, so the threshold turns SELF-EMERGENT (data-driven from the null) AND dialed (its rate rides ARL₀).
 * This replaces a hardcoded threshold (rigidity, γ, basinRadius) with one the null calibrates at the dial's
 * α — the ΔS instrument feeding the one operator dial. A stricter ARL₀ (smaller α) raises the null quantile,
 * so the emergent threshold rises (harder to exceed) — the dial governs the self-emergent gate, monotone.
 */
export function calibrateThreshold(
  dial: ArlDial,
  refSeries: readonly number[],
  statistic: (s: readonly number[]) => number,
  surrogate: (s: readonly number[], rng: () => number) => number[],
  opts: { trials?: number; seed?: number } = {},
): NullVerdict {
  return surrogateNull(refSeries, statistic, surrogate, {
    alpha: dial.alpha,
    trials: opts.trials ?? 200,
    seed: opts.seed ?? 1,
  });
}

/** A structure statistic — lag-1 autocorrelation. High on a temporally-ordered (NESS) series, ≈0 on iid
 *  noise (equilibrium); the canonical probe the iid-shuffle null calibrates against. */
export function lag1Autocorr(series: readonly number[]): number {
  const n = series.length;
  if (n < 2) return 0;
  const mean = series.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const d = series[i]! - mean;
    den += d * d;
    if (i > 0) num += d * (series[i - 1]! - mean);
  }
  return den > 0 ? num / den : 0;
}

// ── the phase-scramble (Fourier) surrogate: preserve the POWER SPECTRUM, destroy the PHASE — the rigidity
//    null for "a real nonlinear/deterministic lock vs a linear-Gaussian spectral artifact" (Theiler et al.
//    1992, the FT surrogate). Small-n DFT (O(n²), fine at mesh scale; no proven JS FFT needed per the
//    tool-scout). Preserving the power spectrum preserves the linear autocorrelation, so ONLY a departure
//    beyond the linear-Gaussian equilibrium (a nonlinear lock) exceeds this null. ──

function dft(x: readonly number[]): { re: number[]; im: number[] } {
  const n = x.length;
  const re = new Array<number>(n).fill(0);
  const im = new Array<number>(n).fill(0);
  for (let k = 0; k < n; k++) {
    for (let t = 0; t < n; t++) {
      const ang = (-2 * Math.PI * k * t) / n;
      re[k]! += x[t]! * Math.cos(ang);
      im[k]! += x[t]! * Math.sin(ang);
    }
  }
  return { re, im };
}

function idftReal(re: readonly number[], im: readonly number[]): number[] {
  const n = re.length;
  const out = new Array<number>(n).fill(0);
  for (let t = 0; t < n; t++) {
    let s = 0;
    for (let k = 0; k < n; k++) {
      const ang = (2 * Math.PI * k * t) / n;
      s += re[k]! * Math.cos(ang) - im[k]! * Math.sin(ang);
    }
    out[t] = s / n;
  }
  return out;
}

/** Phase-scramble (Fourier) surrogate — keep each frequency's MAGNITUDE, randomize its PHASE under conjugate
 *  symmetry (so the inverse stays real). Preserves the power spectrum (hence the linear autocorrelation) and
 *  destroys only the phase structure: the equilibrium null for a nonlinear/deterministic lock (Theiler 1992). */
export function phaseScramble(series: readonly number[], rng: () => number): number[] {
  const n = series.length;
  const { re, im } = dft(series);
  const mag = re.map((r, k) => Math.hypot(r, im[k]!));
  const phase = new Array<number>(n).fill(0);
  const half = Math.floor(n / 2);
  for (let k = 1; k <= half; k++) {
    const p = (rng() * 2 - 1) * Math.PI;
    phase[k] = p;
    if (k < n - k) phase[n - k] = -p; // conjugate symmetry → a real surrogate
  }
  if (n % 2 === 0) phase[half] = 0; // the Nyquist bin stays real
  const re2 = mag.map((m, k) => m * Math.cos(phase[k]!));
  const im2 = mag.map((m, k) => m * Math.sin(phase[k]!));
  return idftReal(re2, im2);
}

/** Time-reversal asymmetry — the normalized third moment of increments, ⟨(xₜ−xₜ₋₁)³⟩/⟨(xₜ−xₜ₋₁)²⟩^{3/2}. ≈0
 *  for a time-symmetric linear-Gaussian process; large for a nonlinear/irreversible lock (a relaxation cycle,
 *  a sawtooth). The discriminator the phase-scramble null calibrates against (Schreiber & Schmitz 1997) — a
 *  real deterministic lock beats its spectrum-matched surrogate here, a spectral artifact does not. */
export function timeReversalAsymmetry(series: readonly number[]): number {
  const n = series.length;
  if (n < 2) return 0;
  let m3 = 0;
  let m2 = 0;
  for (let t = 1; t < n; t++) {
    const d = series[t]! - series[t - 1]!;
    m3 += d * d * d;
    m2 += d * d;
  }
  const c = n - 1;
  const var2 = m2 / c;
  return var2 > 0 ? m3 / c / Math.pow(var2, 1.5) : 0;
}
