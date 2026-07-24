/**
 * rank-te — the PRINCIPLED escalation the linearity-gate reaches for when the Gaussian default
 * (gaussian-cmi, TE = GC/2) under-reads a monotone-nonlinear or heavy-tailed coupling. It reads
 * ORDER, never magnitude: each stream gets Bandt-Pompe ordinal-pattern (permutation) symbols, then
 * transfer entropy runs on the rank/symbol vectors (Staniek-Lehnert symbolic TE; Papana rank-vector
 * partial TE for the conditioned form). Because a monotone map preserves every ordinal pattern, the
 * estimator stays invariant to monotone re-scaling AND shrugs off heavy tails — where the Gaussian
 * covariance dilutes the coupling, the ordinal read still catches it.
 *
 * HONEST VERB (Lizier-Prokopenko, carried from transfer-entropy): TE proves directed
 * *predictability*, NOT drive/causation. Read every edge as "source INFORMS target's next symbol".
 *
 * SMALL-SAMPLE BIAS: the plug-in entropy over-counts information at short windows (m! symbols
 * fills sparsely). Miller-Madow corrects each entropy by (K−1)/(2N) over its occupied bins
 * (default on). CAVEAT: MM only softens the leading bias term — for a genuinely thin window
 * (N ≲ a few × (m!)²) prefer order=3 and lean on the surrogate test, never the raw number.
 *
 * SIGNIFICANCE: pass `surrogates>0` to shuffle the source symbols (destroying the cross-coupling,
 * keeping the target's self-history) and read the observed TE against that null — mean, std, z, and
 * a one-sided add-one p-value. An independent pair lands inside the surrogate cloud; a real edge
 * clears it.
 *
 * Platform-blind: pure arithmetic. NO imports (self-contained symbolic-TE core, so it can carry
 * Miller-Madow and the ordinal-shuffle surrogate natively). Meme: lar:///ha.ka.ba/lararium/mesh/flow
 */

const LN2 = Math.log(2);

/** Factorial for the permutation-index radix (m stays small — order ≤ ~6). */
function factorial(n: number): number {
  let f = 1;
  for (let k = 2; k <= n; k++) f *= k;
  return f;
}

/**
 * Encode one embedding window as its Bandt-Pompe permutation index (Lehmer code over the factorial
 * number system) — an integer in [0, m!). Ties resolve by position (stable), so the map stays total.
 */
function encodePattern(window: readonly number[]): number {
  const m = window.length;
  let code = 0;
  for (let i = 0; i < m; i++) {
    let smaller = 0;
    for (let j = i + 1; j < m; j++) {
      // count later entries that rank below i — equal values fall to the earlier index (stable)
      if (window[j]! < window[i]!) smaller++;
    }
    code += smaller * factorial(m - 1 - i);
  }
  return code;
}

/**
 * Symbolize a scalar series into Bandt-Pompe ordinal patterns. `order` names the embedding
 * dimension m (pattern length, default 3 → 6 symbols); `delay` names the embedding lag τ
 * (default 1). Returns one symbol per window; the k-th symbol reads the window ending at index
 * k + (order−1)·delay. A series shorter than one window yields [].
 */
export function ordinalSymbolize(x: readonly number[], order = 3, delay = 1): number[] {
  const m = Math.max(2, Math.floor(order));
  const tau = Math.max(1, Math.floor(delay));
  const span = (m - 1) * tau;
  const out: number[] = [];
  for (let t = span; t < x.length; t++) {
    const window: number[] = [];
    for (let i = 0; i < m; i++) window.push(x[t - (m - 1 - i) * tau]!);
    out.push(encodePattern(window));
  }
  return out;
}

/** Tally a key into a count map. */
function inc(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

/** Plug-in entropy (bits) of a count map over `n` samples, plus its occupied-bin count K. */
function entropyBits(counts: Map<string, number>, n: number): { h: number; k: number } {
  let h = 0;
  for (const c of counts.values()) {
    const p = c / n;
    if (p > 0) h -= p * Math.log2(p);
  }
  return { h, k: counts.size };
}

interface SymbolicTE {
  readonly te: number; // MM-corrected when `mm` is set, else the plug-in
  readonly tePlugin: number;
  readonly samples: number;
}

/**
 * The symbolic-TE core over aligned symbol streams: TE(source→target | conds) as a difference of
 * four entropies — H(Yₙ₊₁,Yₙ) − H(Yₙ) − H(Yₙ₊₁,Yₙ,Xₙ,·conds) + H(Yₙ,Xₙ,·conds) — so the
 * Miller-Madow correction folds in per-entropy by occupied-bin count. `conds=[]` gives the directed
 * form; `conds=[z]` gives the Papana rank-vector partial TE(source→target | z).
 */
function symbolicTE(
  source: readonly number[],
  target: readonly number[],
  conds: readonly (readonly number[])[],
  mm: boolean,
): SymbolicTE {
  let N = Math.min(source.length, target.length);
  for (const c of conds) N = Math.min(N, c.length);
  if (N < 2) return { te: 0, tePlugin: 0, samples: 0 };

  const cYnYtarget = new Map<string, number>(); // (Yₙ₊₁, Yₙ)
  const cYtarget = new Map<string, number>(); // (Yₙ)
  const cTriple = new Map<string, number>(); // (Yₙ₊₁, Yₙ, Xₙ, ·conds)
  const cCond = new Map<string, number>(); // (Yₙ, Xₙ, ·conds)
  let n = 0;

  for (let t = 0; t < N - 1; t++) {
    const yn = target[t]!;
    const ynext = target[t + 1]!;
    const xn = source[t]!;
    const condsAt = conds.map((c) => c[t]!).join(",");
    inc(cYnYtarget, `${ynext}|${yn}`);
    inc(cYtarget, `${yn}`);
    inc(cTriple, `${ynext}|${yn}|${xn}|${condsAt}`);
    inc(cCond, `${yn}|${xn}|${condsAt}`);
    n++;
  }

  const a = entropyBits(cYnYtarget, n);
  const b = entropyBits(cYtarget, n);
  const c = entropyBits(cTriple, n);
  const d = entropyBits(cCond, n);
  const tePlugin = a.h - b.h - c.h + d.h; // theoretically ≥ 0; a tiny negative reads finite-sample noise
  // Miller-Madow: each entropy lifts by (K−1)/(2N); the signs carry through the TE combination.
  const mmTerm = (a.k - b.k - c.k + d.k) / (2 * n * LN2);
  return { te: mm ? tePlugin + mmTerm : tePlugin, tePlugin, samples: n };
}

/** A deterministic Fisher-Yates shuffle (seeded LCG) — so the surrogate null stays reproducible. */
function seededShuffle(arr: readonly number[], seed: number): number[] {
  const a = arr.slice();
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = Math.floor((s / 4294967296) * (i + 1)); // HIGH bits — the LCG's low bit has period 2
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

/** The surrogate significance read against a shuffled-source null. */
export interface RankTESurrogate {
  /** Mean symbolic TE over the shuffled-source surrogates (the finite-sample bias floor). */
  readonly mean: number;
  /** Spread of the surrogate cloud. */
  readonly std: number;
  /** (observed − mean) / std — how far the edge clears the null, in surrogate-σ. */
  readonly z: number;
  /** One-sided add-one p-value: (#{surrogate ≥ observed} + 1) / (surrogates + 1). */
  readonly pValue: number;
  /** How many surrogates the null drew. */
  readonly count: number;
}

/** Tunables for the ordinal symbolization and the estimator. */
export interface RankTEOptions {
  /** Bandt-Pompe embedding dimension m (pattern length), default 3. */
  readonly order?: number;
  /** Embedding delay τ, default 1. */
  readonly delay?: number;
  /** Miller-Madow small-sample entropy-bias correction, default true. */
  readonly millerMadow?: boolean;
  /** >0 runs a shuffled-source surrogate significance test, default 0 (off). */
  readonly surrogates?: number;
  /** Deterministic surrogate seed, default 1. */
  readonly seed?: number;
}

/** The rank-TE read — the corrected estimate, the raw plug-in, the symbolization, and (optional) the null. */
export interface RankTEResult {
  /** Symbolic TE(source→target) in bits (Miller-Madow-corrected when enabled). */
  readonly te: number;
  /** The uncorrected plug-in estimate. */
  readonly tePlugin: number;
  /** The embedding dimension the read used. */
  readonly order: number;
  /** The embedding delay the read used. */
  readonly delay: number;
  /** Usable symbol transitions the estimate stood on. */
  readonly samples: number;
  /** The surrogate significance read, or null when `surrogates` stays 0. */
  readonly surrogate: RankTESurrogate | null;
}

/** Run the surrogate null by shuffling the SOURCE symbols; the target keeps its self-history intact. */
function runSurrogate(
  sourceSym: readonly number[],
  targetSym: readonly number[],
  conds: readonly (readonly number[])[],
  observed: number,
  mm: boolean,
  count: number,
  seed: number,
): RankTESurrogate {
  const vals: number[] = [];
  for (let k = 0; k < count; k++) {
    vals.push(symbolicTE(seededShuffle(sourceSym, seed + k * 2654435761), targetSym, conds, mm).te);
  }
  const mean = vals.reduce((p, v) => p + v, 0) / count;
  const variance = vals.reduce((p, v) => p + (v - mean) * (v - mean), 0) / Math.max(1, count - 1);
  const std = Math.sqrt(variance);
  const z = std > 1e-12 ? (observed - mean) / std : 0;
  let atLeast = 0;
  for (const v of vals) if (v >= observed) atLeast++;
  const pValue = (atLeast + 1) / (count + 1);
  return { mean, std, z, pValue, count };
}

/**
 * Symbolic (ordinal-pattern) transfer entropy TE(source→target) in bits — the order-reading
 * escalation for a monotone-nonlinear or heavy-tailed coupling the Gaussian default under-reads.
 * Symbolizes both scalar series via Bandt-Pompe, then runs symbolic TE on the rank vectors. Set
 * `surrogates>0` to attach a shuffled-source significance read.
 */
export function rankTransferEntropy(
  source: readonly number[],
  target: readonly number[],
  opts: RankTEOptions = {},
): RankTEResult {
  const order = Math.max(2, Math.floor(opts.order ?? 3));
  const delay = Math.max(1, Math.floor(opts.delay ?? 1));
  const mm = opts.millerMadow ?? true;
  const surrogates = opts.surrogates ?? 0;
  const seed = opts.seed ?? 1;

  const sx = ordinalSymbolize(source, order, delay);
  const sy = ordinalSymbolize(target, order, delay);
  const core = symbolicTE(sx, sy, [], mm);
  const surrogate =
    surrogates > 0 ? runSurrogate(sx, sy, [], core.te, mm, surrogates, seed) : null;

  return { te: core.te, tePlugin: core.tePlugin, order, delay, samples: core.samples, surrogate };
}

/**
 * Papana rank-vector PARTIAL TE — symbolic TE(source→target | cond), conditioning additionally on a
 * third series' ordinal patterns to remove the phantom coupling a hidden common driver would inject.
 * Reach for this, not the pairwise form, whenever a third stream could drive both.
 */
export function rankConditionalTransferEntropy(
  source: readonly number[],
  target: readonly number[],
  cond: readonly number[],
  opts: RankTEOptions = {},
): RankTEResult {
  const order = Math.max(2, Math.floor(opts.order ?? 3));
  const delay = Math.max(1, Math.floor(opts.delay ?? 1));
  const mm = opts.millerMadow ?? true;
  const surrogates = opts.surrogates ?? 0;
  const seed = opts.seed ?? 1;

  const sx = ordinalSymbolize(source, order, delay);
  const sy = ordinalSymbolize(target, order, delay);
  const sz = ordinalSymbolize(cond, order, delay);
  const core = symbolicTE(sx, sy, [sz], mm);
  const surrogate =
    surrogates > 0 ? runSurrogate(sx, sy, [sz], core.te, mm, surrogates, seed) : null;

  return { te: core.te, tePlugin: core.tePlugin, order, delay, samples: core.samples, surrogate };
}
