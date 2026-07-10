/**
 * transfer-entropy — R, the coupling keel: directed, interior-conditioned information flow
 * between sovereign sensoria. TE(source→target) = the information the source's past adds
 * about the target's NEXT symbol, BEYOND the target's own past (a conditional mutual
 * information). The self-history is conditioned OUT — only the cross-flow is reported. That
 * is, structurally, "couple-then-decouple, never merge": the interior never crosses.
 *
 * HONEST VERB (Lizier-Prokopenko): TE proves directed *predictability*, NOT
 * *drive/causation*. Read every edge as "source INFORMS target's future", never "source
 * causes target". High TE can sit atop zero causal effect.
 *
 * TWO MANDATORY GUARDRAILS:
 *   · CONDITIONAL TE — pairwise TE hallucinates coupling through a hidden common driver;
 *     conditioning on the other series (conditionalTransferEntropy) removes the phantom.
 *   · EFFECTIVE TE — raw TE carries a positive finite-sample bias; subtract the mean over
 *     shuffled-source estimates (effectiveTransferEntropy) to recover the honest zero.
 *
 * Discrete plug-in estimator over integer symbols (the caller discretizes), base-2 (bits),
 * Markov order 1 (lag=1) by default. Where a channel is near-linear/Gaussian, TE = Granger —
 * so R earns its keep only in the nonlinear, data-rich, stationary regime (caller's call).
 *
 * Platform-blind: pure arithmetic. NO imports.
 * Meme: lar:///ha.ka.ba/lares/api/pono/the-veil-ladder
 */

type Sym = number;

function inc(m: Map<string, number>, k: string): void { m.set(k, (m.get(k) ?? 0) + 1); }

/**
 * The core: TE(source → target) conditioned on the target's history AND every series in
 * `conds`. `conds=[]` gives plain TE; `conds=[z]` gives conditional TE(source→target | z).
 * History length = 1 (Markov-1). Returns bits.
 */
function teCore(source: readonly Sym[], target: readonly Sym[], conds: readonly (readonly Sym[])[]): number {
  let N = Math.min(source.length, target.length);
  for (const c of conds) N = Math.min(N, c.length);
  if (N < 2) return 0;

  const pYnHX = new Map<string, number>();   // (targetNext, history, source)
  const pHX = new Map<string, number>();     // (history, source)
  const pYnH = new Map<string, number>();    // (targetNext, history)
  const pH = new Map<string, number>();      // (history)
  let n = 0;

  for (let t = 0; t < N - 1; t++) {
    const yn = target[t + 1];
    const h = [target[t], ...conds.map((c) => c[t])].join("|");   // history = target_t + conds_t
    const x = source[t];
    inc(pYnHX, `${String(yn)}#${h}#${String(x)}`);
    inc(pHX, `${h}#${String(x)}`);
    inc(pYnH, `${String(yn)}#${h}`);
    inc(pH, h);
    n++;
  }

  let te = 0;
  for (const [key, c] of pYnHX) {
    const [yn, h, x] = key.split("#") as [string, string, string];
    const p = c / n;
    const pHx = (pHX.get(`${h}#${x}`) ?? 0) / n;
    const pYnh = (pYnH.get(`${yn}#${h}`) ?? 0) / n;
    const pHv = (pH.get(h) ?? 0) / n;
    if (p > 0 && pHx > 0 && pYnh > 0 && pHv > 0) te += p * Math.log2((p * pHv) / (pYnh * pHx));
  }
  return te;   // theoretically ≥ 0; a tiny negative is finite-sample noise
}

/** TE(source → target) in bits — directed predictability, interior conditioned out. */
export function transferEntropy(source: readonly Sym[], target: readonly Sym[]): number {
  return teCore(source, target, []);
}

/**
 * Conditional TE(source → target | cond) — conditions additionally on `cond`, removing the
 * PHANTOM coupling a hidden common driver would inject into the pairwise estimate. Use this,
 * not pairwise, whenever a third series could drive both.
 */
export function conditionalTransferEntropy(source: readonly Sym[], target: readonly Sym[], cond: readonly Sym[]): number {
  return teCore(source, target, [cond]);
}

/** A deterministic Fisher-Yates shuffle (seeded LCG) — so effective-TE is reproducible. */
function seededShuffle(arr: readonly Sym[], seed: number): Sym[] {
  const a = arr.slice();
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = Math.floor((s / 4294967296) * (i + 1));   // HIGH bits — the LCG's low bit has period 2
    const tmp = a[i]!; a[i] = a[j]!; a[j] = tmp;
  }
  return a;
}

/**
 * EFFECTIVE TE — raw TE minus the mean over `shuffles` source-permutations (which destroy the
 * cross-dependence → estimate the finite-sample bias floor). The honest zero: an independent
 * pair reads ≈ 0, not the raw positive bias. Deterministic (seeded).
 */
export function effectiveTransferEntropy(
  source: readonly Sym[], target: readonly Sym[],
  opts: { shuffles?: number; seed?: number } = {},
): number {
  const shuffles = opts.shuffles ?? 20;
  const seed = opts.seed ?? 1;
  const raw = transferEntropy(source, target);
  let bias = 0;
  for (let k = 0; k < shuffles; k++) bias += transferEntropy(seededShuffle(source, seed + k), target);
  return raw - bias / shuffles;
}
