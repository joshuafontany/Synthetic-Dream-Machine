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
