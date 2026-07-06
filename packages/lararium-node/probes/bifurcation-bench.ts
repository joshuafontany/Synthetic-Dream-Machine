/**
 * BIFURCATION BENCH (S0) — the integrative witness-sink the dreaming-Markov-blanket paper figure plots
 * onto. The bench SWEEPS the ARL₀ dial and, at each α, READS one or more scalar "order parameters" off a
 * corpus. When an order parameter MOVES across the sweep — a non-flat curve, a staircase, a jump — it
 * WITNESSES a bifurcation: the system re-organizes as the control budget crosses a threshold.
 *
 * S0 ships the Bench + ONE trace:
 *   • the {@link OrderParameter} CONTRACT every later strand plugs into (ΔF, complexity-entropy, the
 *     EFE gate-flip each implement this SAME shape over their own corpus type — built in later sprints);
 *   • the ARL₀ sweep, riding the BUILT {@link makeArlDial} (α = 1/ARL₀);
 *   • Trace #1 = H¹, riding the BUILT {@link cohomologyObstruction} — dim H¹ of the agreement nerve read
 *     at agreement-tolerance α.
 *
 * The output carries NUMBERS ONLY — a rows-array (JSON) / CSV of `{ arl0, alpha, <trace>: scalar }`. NO
 * plotting: the figure renders downstream of the numbers. The witness = the numbers move with α.
 *
 * Run: pnpm exec tsx packages/lararium-node/probes/bifurcation-bench.ts
 *
 * PORT-STATUS — this bench stands the S0-S3 CONCEPT-WITNESS + the TS↔py parity oracle; the production sweep
 * compute ports to py (the RUN arc). py counterparts EXIST: `predictive_coding.py` (the F primitive) +
 * `bands_sidecar.py`. OWED in py: the H¹ gate · the EFE keystone · THESE bench strands.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/li-ki-integrities#crucible-tested
 */

import {
  makeArlDial, freeEnergy, iidShuffle, makeRng,
  surrogateNull, maxTNull, phaseScramble, timeReversalAsymmetry,
  type ArlDialOpts, type MaxTVerdict,
} from "@lararium/mesh";
import { cohomologyObstruction, type SheafAssignment } from "../src/sensorium-fusion.js";
import { efeGate, efeSelect, type VerbDelta, type CVector } from "../src/sensorium-efe.js";
import type { PlaneRestriction, ComparisonStalk } from "../src/sensorium-consistency.js";

// ── the CONTRACT: one scalar order parameter per α, over a corpus ───────────────────────────────────

/**
 * OrderParameter — the scalar-per-α contract every bifurcation trace plugs into. A trace READS a `corpus`
 * and a control budget `alpha` (= 1/ARL₀, the conformal miscoverage rate) and RETURNS ONE scalar: the
 * order parameter whose movement across the α-sweep witnesses a bifurcation. Each trace OWNS how it reads
 * α — the H¹ trace reads it as an agreement tolerance; a later ΔF trace reads it as a control limit — so
 * the contract stays a bare `(corpus, alpha) → scalar` and the interpretation rides inside the measure.
 * Later strands (ΔF, complexity-entropy, the EFE gate-flip) implement this SAME shape over their own
 * corpus type; the Bench then plots every strand on the one α axis.
 */
export type OrderParameter<Corpus> = (corpus: Corpus, alpha: number) => number;

/** A named trace pairs a scalar column-name with the measure that fills it. */
export interface NamedTrace<Corpus> {
  /** the column name the scalar lands under in each swept row. */
  readonly name: string;
  /** the measure the trace reads at each swept α. */
  readonly measure: OrderParameter<Corpus>;
}

// ── the sweep: turn a ladder of ARL₀ into rows of scalars ──────────────────────────────────────────

/** One swept row — `arl0` and `alpha` name the dial rung; each trace adds its own scalar column. */
export type SweepRow = Record<string, number>;

/**
 * Sweep the ARL₀ dial across `arl0s`, reading every trace at each rung's derived α. Each rung rides the
 * BUILT {@link makeArlDial} (α = 1/ARL₀), so the bench consumes the same dial every gate reads rather than
 * re-deriving α. Returns one {@link SweepRow} per rung, carrying `arl0`, `alpha`, and a column per trace.
 */
export function sweepArl<Corpus>(
  corpus: Corpus,
  traces: readonly NamedTrace<Corpus>[],
  arl0s: readonly number[],
  dialOpts: ArlDialOpts = {},
): SweepRow[] {
  return arl0s.map((arl0) => {
    const dial = makeArlDial(arl0, dialOpts);
    const row: SweepRow = { arl0: dial.arl0, alpha: dial.alpha };
    for (const trace of traces) row[trace.name] = trace.measure(corpus, dial.alpha);
    return row;
  });
}

/**
 * A geometric ladder of ARL₀ values descending from `hi` (strict — tiny α) to `lo` (loose — large α), `n`
 * rungs. Ordering the sweep strict→loose runs α ASCENDING, so a bifurcation reads as a rising curve.
 */
export function geomArl0Range(hi: number, lo: number, n: number): number[] {
  if (n <= 1) return [hi];
  const ratio = Math.pow(lo / hi, 1 / (n - 1));
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(hi * Math.pow(ratio, i));
  return out;
}

// ── the seeded synthetic corpus (a tunable bifurcation source) ─────────────────────────────────────

/** Mulberry32 — a tiny deterministic PRNG; a fixed seed regenerates the exact same corpus every run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Controls the synthetic corpus the H¹ trace bifurcates over. */
export interface BifurcationCorpusOptions {
  /** how many independent hollow-triangle cocycles the corpus carries (each a potential H¹ generator). */
  readonly triangles?: number;
  /** the PRNG seed — a fixed seed makes the corpus (and so the whole sweep) deterministic. */
  readonly seed?: number;
  /** the smallest pairwise-disagreement gap across the triangles (the first to glue as α loosens). */
  readonly gapLo?: number;
  /** the largest pairwise-disagreement gap (the last to glue). Keep `base + gapHi ≤ 1` for valid salience. */
  readonly gapHi?: number;
  /** the base salience each shared unit sits at before a gap offsets it. */
  readonly base?: number;
}

const sheafPlane = (plane: string, value: Record<string, number>): PlaneRestriction =>
  ({ plane, variance: "sheaf", value: new Map(Object.entries(value)) });

/**
 * Build the synthetic corpus: `triangles` INDEPENDENT hollow-triangle cocycles on disjoint unit/plane
 * sets. Each triangle `i` carries a seeded pairwise-disagreement gap `gᵢ` — its three planes agree on
 * every overlap only WITHIN tolerance `gᵢ`. As the sweep's agreement-tolerance α crosses `gᵢ`, the three
 * edges appear together and the triangle stands hollow (no common witness unit), MINTING one H¹ generator.
 * So `dim H¹(α) = #{ i : gᵢ ≤ α }` — a staircase the sweep climbs. Gaps spread evenly across
 * `[gapLo, gapHi]` with a small seeded jitter, so the staircase steps steadily across the α range.
 */
export function buildBifurcationCorpus(opts: BifurcationCorpusOptions = {}): SheafAssignment {
  const triangles = opts.triangles ?? 6;
  const seed = opts.seed ?? 0x5eed;
  const gapLo = opts.gapLo ?? 0.05;
  const gapHi = opts.gapHi ?? 0.45;
  const base = opts.base ?? 0.5;
  const rng = mulberry32(seed);

  const restrictions: PlaneRestriction[] = [];
  const units: string[] = [];
  const span = gapHi - gapLo;

  for (let i = 0; i < triangles; i++) {
    // spread the gap evenly across [gapLo, gapHi], jittered inside its own slot so no two coincide.
    const slot = triangles > 1 ? i / (triangles - 1) : 0;
    const jitter = (rng() - 0.5) * (span / Math.max(1, triangles)) * 0.6;
    const gap = Math.min(gapHi, Math.max(gapLo, gapLo + slot * span + jitter));

    const a = `a${String(i)}`, b = `b${String(i)}`, c = `c${String(i)}`;
    units.push(a, b, c);
    // the classic cocycle: three planes pairwise-overlap on ONE unit each, DISAGREEING there by exactly
    // `gap`, and NO unit lies in all three domains — pairwise-reconcilable within `gap`, globally obstructed.
    restrictions.push(sheafPlane(`content${String(i)}`, { [a]: base, [b]: base }));
    restrictions.push(sheafPlane(`structure${String(i)}`, { [b]: base + gap, [c]: base }));
    restrictions.push(sheafPlane(`form${String(i)}`, { [c]: base + gap, [a]: base + gap }));
  }

  const stalk: ComparisonStalk = { units };
  return { restrictions, stalk };
}

// ── Trace #1 — H¹ (the first order parameter) ──────────────────────────────────────────────────────

/**
 * Trace #1 — H¹. Reads α as the agreement tolerance and returns dim H¹ of the agreement nerve: the raw
 * count of ontological obstruction generators. As α loosens, disagreeing pairs cross into agreement,
 * hollow triangles form, and dim H¹ climbs — the bench's first bifurcation order parameter. Swap `.dimH1`
 * → `.cost` to read the reconciliation cost R*_sem = log₂ dim H¹ (Thomas–Chen) instead.
 */
export const h1ObstructionTrace: NamedTrace<SheafAssignment> = {
  name: "h1_dimH1",
  measure: (corpus, alpha) => cohomologyObstruction(corpus, { agreementTolerance: alpha }).dimH1,
};

// ══ S1 ═══════════════════════════════════════════════════════════════════════════════════════════════
// Two more order parameters ride the SAME α-sweep beside H¹: ΔF (model-comparison free energy) and the
// complexity-entropy (excess entropy). Both plug into {@link sweepArl} over ONE combined corpus, so a
// single sweep now carries three columns. Each trace OWNS how it reads α (the OrderParameter contract).
// ══════════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The combined bench corpus — one seed-regenerated bundle three traces each read their own slice of: the
 * hollow-triangle `sheaf` (H¹), the predictive `planes` (ΔF), and the `symbols` stream (complexity-entropy).
 * A single `structure` knob tunes ALL of them together, so the whole bench moves with one order parameter.
 */
export interface BenchCorpus {
  /** the hollow-triangle sheaf the H¹ trace reads (the S0 corpus). */
  readonly sheaf: SheafAssignment;
  /** per-plane frame series the ΔF trace fits a temporal model to (structured ⇒ predictable). */
  readonly planes: Record<string, number[]>;
  /** the symbol stream the complexity-entropy trace symbolizes + reads block-entropy off. */
  readonly symbols: number[];
  /** the alphabet the symbol stream draws from (the resample pool). */
  readonly alphabet: number;
  /** the PRNG seed — regenerates the whole corpus (and so the sweep) identically. */
  readonly seed: number;
}

/** Controls the combined corpus. Extends the S0 sheaf options with the predictive/symbolic knobs. */
export interface BenchCorpusOptions extends BifurcationCorpusOptions {
  /** structure strength 0..1: 1 ⇒ strongly-predictable planes + a clean periodic symbol backbone; 0 ⇒ iid
   *  noise (the structureless CONTROL that collapses ΔF → 0 and flattens excess entropy — the specificity test). */
  readonly structure?: number;
  /** how many frames each predictive plane carries. */
  readonly frames?: number;
  /** how many symbols the complexity stream carries. */
  readonly symbolCount?: number;
  /** the period of the ordered symbol backbone. */
  readonly period?: number;
  /** the symbol alphabet size. */
  readonly alphabet?: number;
}

/** Box-Muller normal draw off a mulberry32 uniform stream — a seeded standard-normal, no global randomness. */
function seededNormal(rng: () => number): number {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * One seeded AR(1) series `x[t] = φ·x[t-1] + σ·ξ` — φ near 1 CARRIES strong temporal structure a fitted
 * model PREDICTS (low surprise); φ = 0 DROPS to iid noise no model beats its own null on. `σ = √(1−φ²)`
 * holds the stationary variance at ≈1 across φ, so the planes stay scale-comparable.
 */
function ar1Series(n: number, phi: number, seed: number): number[] {
  const rng = mulberry32(seed);
  const x = new Array<number>(n).fill(0);
  if (n === 0) return x;
  x[0] = seededNormal(rng);
  const sigma = Math.sqrt(Math.max(1e-6, 1 - phi * phi));
  for (let t = 1; t < n; t++) x[t] = phi * x[t - 1]! + sigma * seededNormal(rng);
  return x;
}

/**
 * The ordered symbol backbone — a period-`period` cycle over the alphabet, perfectly predictable (entropy
 * rate hμ → 0) yet CARRYING log₂(period) bits of excess entropy (the phase memory) before any noise
 * dissolves it. The complexity-entropy trace mixes noise INTO this at each α.
 */
function periodicSymbols(n: number, period: number, alphabet: number): number[] {
  const out = new Array<number>(n).fill(0);
  // floor((phase·alphabet)/period) lays the phases as RUNS (e.g. period 4, alphabet 2 ⇒ 0,0,1,1), so the
  // `period` cyclic phases stay DISTINCT ⇒ excess entropy opens at log₂(period) bits, undiluted.
  for (let t = 0; t < n; t++) out[t] = Math.floor(((t % period) * alphabet) / period);
  return out;
}

/**
 * Build the combined corpus off one seed + `structure` knob. The sheaf REUSES the S0 builder (H¹ reads it
 * unchanged); the planes RIDE AR(1) at φ ∝ structure; the symbols HOLD the period cycle (structure > 0) or
 * fall to iid uniform (structure = 0, the flat-excess-entropy control).
 */
export function buildBenchCorpus(opts: BenchCorpusOptions = {}): BenchCorpus {
  const structure = Math.min(1, Math.max(0, opts.structure ?? 1));
  const seed = opts.seed ?? 0x5eed;
  const frames = opts.frames ?? 240;
  const symbolCount = opts.symbolCount ?? 4000;
  const period = opts.period ?? 4;
  const alphabet = opts.alphabet ?? 2;
  const phi = 0.92 * structure; // structure 1 ⇒ strongly autocorrelated · 0 ⇒ iid (φ=0)

  const sheaf = buildBifurcationCorpus(opts); // the S0 hollow-triangle corpus (H¹ trace reads it)

  const planeNames = ["content", "structure", "form"];
  const planes: Record<string, number[]> = {};
  planeNames.forEach((name, i) => { planes[name] = ar1Series(frames, phi, seed + 101 * (i + 1)); });

  const symbols = structure > 0
    ? periodicSymbols(symbolCount, period, alphabet)
    : ((): number[] => {
        const r = mulberry32(seed + 7);
        return Array.from({ length: symbolCount }, () => Math.floor(r() * alphabet));
      })();

  return { sheaf, planes, symbols, alphabet, seed };
}

// ── Trace #1 (adapter) — H¹ over the combined corpus ────────────────────────────────────────────────

/** The S0 H¹ trace, re-homed onto {@link BenchCorpus} — it reads `corpus.sheaf` and delegates to the
 *  built {@link h1ObstructionTrace}, so the one three-column sweep carries the S0 order parameter unchanged. */
export const h1BenchTrace: NamedTrace<BenchCorpus> = {
  name: "h1_dimH1",
  measure: (corpus, alpha) => h1ObstructionTrace.measure(corpus.sheaf, alpha),
};

// ── Trace #2 — ΔF (model-comparison free energy; the Strand-P keystone) ──────────────────────────────

/**
 * Map the sweep's miscoverage α (= 1/ARL₀) onto a top-down confidence VOW (0..20) the ΔF trace hands the
 * built {@link freeEnergy} as the precision GAIN. Strict α (small) ⇒ a high vow (sharp gain) that weights
 * the fitted model's prediction-error advantage hard; loose α ⇒ a softer vow. So ΔF MOVES with α by
 * construction. The floor (10) keeps the gain ≥ 1 so the accuracy advantage dominates the belief-movement
 * gap across the whole sweep (ΔF stays > 0 where earned).
 */
function alphaToConfidence(alpha: number): number {
  return Math.min(18, Math.max(10, 18 - 10 * Math.min(1, Math.max(0, alpha))));
}

/**
 * The structure-destroyed NULL: reorder every plane's frames by ONE shared seeded permutation. The
 * instantaneous cross-plane joint STAYS intact; the temporal order the fitted model exploits DISSOLVES.
 * A fitted model no longer beats this null ⇒ ΔF collapses toward 0 (the model earned nothing).
 */
function shufflePlanes(planes: Record<string, number[]>, seed: number): Record<string, number[]> {
  const names = Object.keys(planes);
  const n = names.length ? planes[names[0]!]!.length : 0;
  const perm = iidShuffle(Array.from({ length: n }, (_, i) => i), makeRng(seed));
  const out: Record<string, number[]> = {};
  for (const name of names) out[name] = perm.map((j) => planes[name]![j]!);
  return out;
}

/**
 * Trace #2 — ΔF (model-comparison free energy). Reads α as the precision-gain control and RETURNS the
 * operator's model-comparison free energy over a structure-destroyed null:
 *   ΔF = F(fitted) − F(null),  F from the built {@link freeEnergy} (model "ar1", the temporal prior).
 * On a STRUCTURED corpus the fitted model TRACKS real dynamics, so it spends the belief-movement KL
 * complexity (`Σ_t KL[q_t‖q_{t-1}]`) the structure-destroyed null cannot — F(fitted) rides ABOVE F(null)
 * and ΔF > 0. That gap IS the model earning its free energy: it invests evidence precisely where structure
 * stands to be tracked. On a STRUCTURELESS corpus the fitted model finds nothing to track (φ̂ ≈ 0, flat
 * beliefs), so F(fitted) ≈ F(null) ⇒ ΔF ≈ 0 — the model-SPECIFICITY test, non-vacuous where absolute F is
 * not (it pre-empts FEP-vacuity by construction). The precision-penalty cancels (one shared vow), so α
 * modulates only the surprise weight ⇒ ΔF MOVES with α while holding its sign.
 */
export const deltaFTrace: NamedTrace<BenchCorpus> = {
  name: "deltaF",
  measure: (corpus, alpha) => {
    const conf = alphaToConfidence(alpha);
    const confidences: Record<string, number> = {};
    for (const name of Object.keys(corpus.planes)) confidences[name] = conf;
    const fFit = freeEnergy(corpus.planes, { model: "ar1", confidences }).F;
    const fNull = freeEnergy(shufflePlanes(corpus.planes, corpus.seed), { model: "ar1", confidences }).F;
    return fFit - fNull;
  },
};

// ── Trace #3 — complexity-entropy (excess entropy E, Feldman–Crutchfield 0806.4789) ──────────────────

/**
 * Shannon block entropy H(L) in BITS — the plug-in entropy of the length-L block distribution (a sliding
 * window over the symbol stream). Pure Shannon-H over symbol counts, NEVER a thermodynamic S (the H-vs-S
 * ward — the informational reading holds, the heat reading sinks the paper).
 */
function blockEntropyBits(symbols: readonly number[], L: number): number {
  const m = symbols.length - L + 1;
  if (L <= 0 || m <= 0) return 0;
  const counts = new Map<string, number>();
  for (let i = 0; i < m; i++) {
    const key = symbols.slice(i, i + L).join(",");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let H = 0;
  for (const c of counts.values()) { const p = c / m; H -= p * Math.log2(p); }
  return H;
}

/**
 * Excess entropy E in BITS (Feldman–Crutchfield 0806.4789): `E = Σ_{L=1..Lmax} (h(L) − hμ)`, the length-L
 * entropy rates `h(L) = H(L) − H(L−1)` summed over their EXCESS above the rate estimate `hμ ≈ h(Lmax)`. E
 * measures the MEMORY (mutual information past↔future) the stream carries — high on an ordered stream,
 * decaying → 0 as noise dissolves the correlation. The pure-Shannon complexity-entropy order parameter.
 */
function excessEntropyBits(symbols: readonly number[], Lmax: number): number {
  const H: number[] = [0];
  for (let L = 1; L <= Lmax; L++) H.push(blockEntropyBits(symbols, L));
  const h: number[] = [];
  for (let L = 1; L <= Lmax; L++) h.push(H[L]! - H[L - 1]!);
  const hmu = h[h.length - 1] ?? 0;
  let E = 0;
  for (const hL of h) E += hL - hmu;
  return E;
}

/**
 * Symbolize the corpus at control α: resample each symbol from the flat alphabet with probability
 * `ε(α) = min(0.95, 1.4·α)` — noise RISING with α dissolves the ordered backbone. Deterministic (seeded on
 * `corpus.seed` and the α rung), so the sweep regenerates identically.
 */
function noisyReadout(corpus: BenchCorpus, alpha: number): number[] {
  const eps = Math.min(0.95, alpha * 1.4);
  const rng = mulberry32((corpus.seed ^ Math.round(alpha * 1e6)) >>> 0);
  return corpus.symbols.map((s) => (rng() < eps ? Math.floor(rng() * corpus.alphabet) : s));
}

/**
 * Trace #3 — complexity-entropy. Reads α as the disorder control and RETURNS the excess entropy of the
 * α-symbolized stream: high where the ordered backbone stands (strict α), decaying across the sweep as
 * noise dissolves the correlation — a non-flat curve that TRANSITIONS through the order→disorder boundary.
 */
export const complexityEntropyTrace: NamedTrace<BenchCorpus> = {
  name: "complexity",
  measure: (corpus, alpha) => excessEntropyBits(noisyReadout(corpus, alpha), 6),
};

// ══ S3 — the EFE-gate regime (the thesis organ B×C acting) ═════════════════════════════════════════════
// A 4th order parameter rides the SAME α-sweep: the EFE-gate REGIME. At each α the gate reads H¹ over the
// corpus sheaf, then forks — H¹=0 → efeSelect (a global EFE, regime 0) · H¹≠0 → surfaceDisagreement (no
// global section, regime 1). The trace routes THROUGH the built `efeGate` (the mechanism, not a threshold on
// H¹), so the RUN shows the gate FLIPPING regime at the SAME critical α the H¹/ΔF/complexity jumps land —
// the "mechanism acting" window, the co-incident 4th signal.
// ══════════════════════════════════════════════════════════════════════════════════════════════════════

/** A tiny fixed verb-set the bench's EFE gate scores when H¹=0. Each carries a servo affine Δ (per-island):
 *  · hold — identity (the autonomous forecast passes through) · align — steer the mean to the C set-point (0)
 *  · collapse — a large precision gain (σ²→0, options collapse: IRREVERSIBLE) · expand — a tiny gain (σ² opens).
 *  The set exercises both reversibility signs, so efeSelect's argmin + the derived sign(optionLoss) both read. */
const BENCH_VERBS: readonly VerbDelta[] = [
  { verb: "hold", scale: 1, shift: 0, precisionGain: 1 },
  { verb: "align", scale: 0, shift: 0, precisionGain: 1 },      // mean → 0 = the C set-point
  { verb: "collapse", scale: 1, shift: 0, precisionGain: 1e4 }, // σ²→0 ⇒ optionLoss high ⇒ EFE high ⇒ passed over
  { verb: "expand", scale: 1, shift: 0, precisionGain: 1e-3 },  // σ² opens ⇒ optionLoss negative ⇒ reversible
];

/** The bench C-vector — a quiescent set-point (mean 0) on every predictive plane; `align` reaches it. */
const BENCH_C: CVector = { mu: { content: 0, structure: 0, form: 0 } };

/**
 * Trace #4 — the EFE-gate regime. Reads α as the agreement tolerance the gate hands H¹, and RETURNS the
 * regime the gate lands in: 0 while H¹=0 (efeSelect runs — a global EFE stands well-posed), 1 once H¹≠0
 * (surfaceDisagreement runs — no global section). The flip is CO-INCIDENT with the H¹ staircase leaving 0
 * (the gate reads the SAME `cohomologyObstruction` at the SAME α), so the bench witnesses the mechanism
 * acting at the critical control budget.
 */
export const efeGateTrace: NamedTrace<BenchCorpus> = {
  name: "efe_gate",
  measure: (corpus, alpha) => {
    const res = efeGate(corpus.sheaf, corpus.planes, BENCH_VERBS, BENCH_C, { agreementTolerance: alpha });
    return res.verdict === "surface-disagreement" ? 1 : 0;
  },
};

// ══ S2 ═══════════════════════════════════════════════════════════════════════════════════════════════
// The paper's RIGOR FLOOR — significance, not eyeballing. Every trace's jump reads SIGNIFICANT-ABOVE-NULL
// against a surrogate-null band (not a curve read by eye), and the AAFT discriminator separates a STRUCTURAL
// membership signature from a mere temporal-beat artifact. All of it RIDES the built null-harness organs
// (surrogateNull, maxTNull, phaseScramble, iidShuffle) — the bench composes them, never re-rolls a quantile.
//
// THE BRIDGE: the null-harness organs run over a `series → scalar`; a bench trace reads a whole corpus and
// returns a scalar-per-α. A {@link TraceSurrogate} bridges the two — it EXTRACTS the real-valued corpus slice
// the trace's structure lives on (the thing a surrogate destroys) and REBUILDS the whole corpus around a
// surrogated slice, so a surrogateNull over that slice literally "draws a surrogate corpus and recomputes the
// trace." The observed value it reports on the un-surrogated slice re-derives the trace's own swept value.
// ══════════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * A trace's SURROGATE ADAPTER — the bridge from the null-harness's `series → scalar` organs to a bench trace
 * that reads a whole {@link BenchCorpus}. `series` extracts the corpus slice the trace's structure lives on
 * (the null acts there); `rebuild` swaps a surrogated slice back; `bandStatistic` reads the significance
 * statistic off the rebuilt corpus; `surrogate` is the STRUCTURAL null that dissolves this trace's structure.
 *
 * The band statistic is NOT always the trace value: ΔF is ALREADY a fitted-vs-shuffled DIFFERENCE, so wrapping
 * it in a second shuffle-null double-counts (a shuffled corpus's own ΔF ≈ its structured ΔF) — its band reads
 * the RAW fitted free energy F instead, which the shuffle genuinely collapses. And H¹'s obstruction count is
 * SHUFFLE-INVARIANT (a random agreement-nerve obstructs comparably), so its structural null JITTERS the
 * salience (dissolving the coordinated disagreement gaps) rather than permuting it. Each trace names the null
 * that actually destroys ITS structure — the discipline the paper's rigor floor demands.
 */
interface TraceSurrogate {
  /** the trace column-name the band/p/sig columns key onto. */
  readonly name: string;
  /** extract the real-valued corpus slice whose structure the trace depends on (the surrogate destroys it). */
  readonly series: (c: BenchCorpus) => number[];
  /** swap a surrogated slice back into the corpus and hand back the rebuilt whole. */
  readonly rebuild: (c: BenchCorpus, slice: readonly number[]) => BenchCorpus;
  /** the significance statistic read off a (rebuilt) corpus at α — the quantity the null bands. */
  readonly bandStatistic: (c: BenchCorpus, alpha: number) => number;
  /** the STRUCTURAL null that dissolves THIS trace's structure (iid-shuffle for ΔF/complexity, jitter for H¹). */
  readonly surrogate: (slice: readonly number[], rng: () => number) => number[];
}

// ── slice extract/rebuild per trace (flatten a corpus slice → swap a surrogated slice back) ───────────

/** Flatten every sheaf-restriction's per-unit salience into one vector, restriction+key insertion order. */
function flattenSheaf(sheaf: SheafAssignment): number[] {
  const out: number[] = [];
  for (const r of sheaf.restrictions) for (const v of r.value.values()) out.push(v);
  return out;
}
/** Swap a flattened salience vector back onto the SAME restriction/key skeleton (order matches the flatten). */
function rebuildSheaf(sheaf: SheafAssignment, flat: readonly number[]): SheafAssignment {
  let k = 0;
  const restrictions = sheaf.restrictions.map((r) => {
    const value = new Map<string, number>();
    for (const key of r.value.keys()) value.set(key, flat[k++] ?? 0);
    return { plane: r.plane, variance: r.variance, value };
  });
  return { restrictions, stalk: sheaf.stalk };
}

const PLANE_ORDER = ["content", "structure", "form"] as const;
/** Concatenate the three predictive planes' frames in a fixed order into one vector. */
function flattenPlanes(planes: Record<string, number[]>): number[] {
  return PLANE_ORDER.flatMap((n) => planes[n] ?? []);
}
/** Split a concatenated frame vector back into the three planes (equal even slices). */
function rebuildPlanes(flat: readonly number[]): Record<string, number[]> {
  const per = Math.floor(flat.length / PLANE_ORDER.length);
  const out: Record<string, number[]> = {};
  PLANE_ORDER.forEach((n, i) => { out[n] = flat.slice(i * per, (i + 1) * per); });
  return out;
}

/** The jitter amplitude the H¹ structural null adds — above `gapHi` (0.45) so the coordinated disagreement
 *  gaps that mint the hollow triangles DISSOLVE, while each salience stays near its own magnitude. */
const H1_JITTER_AMP = 0.5;

/** The JITTER surrogate — add uniform ±`amp` noise to each value. Unlike a permutation (which preserves the
 *  value multiset and so leaves H¹'s obstruction count near-invariant), jitter dissolves the COORDINATED
 *  disagreement gaps the hollow triangles rest on — the structural null H¹ genuinely stands above. */
function jitterSurrogate(amp: number): (slice: readonly number[], rng: () => number) => number[] {
  return (slice, rng) => slice.map((v) => v + (rng() * 2 - 1) * amp);
}

/** ΔF's band statistic — the RAW fitted free energy F (NOT the fitted-minus-shuffled difference). The trace
 *  value ΔF is already null-differenced, so a second shuffle-null double-counts; the raw F rides high on a
 *  tracked model and collapses under the shuffle, so its surrogate-null band discriminates cleanly. */
function fittedFreeEnergy(planes: Record<string, number[]>, alpha: number): number {
  const conf = alphaToConfidence(alpha);
  const confidences: Record<string, number> = {};
  for (const name of Object.keys(planes)) confidences[name] = conf;
  return freeEnergy(planes, { model: "ar1", confidences }).F;
}

/** The three trace surrogate-adapters — one per column, each naming the null that dissolves ITS structure. */
const traceSurrogates: readonly TraceSurrogate[] = [
  {
    // H¹ — its obstruction count is SHUFFLE-INVARIANT, so the structural null JITTERS the salience.
    name: "h1_dimH1",
    series: (c) => flattenSheaf(c.sheaf),
    rebuild: (c, slice) => ({ ...c, sheaf: rebuildSheaf(c.sheaf, slice) }),
    bandStatistic: (c, alpha) => h1BenchTrace.measure(c, alpha),
    surrogate: jitterSurrogate(H1_JITTER_AMP),
  },
  {
    // ΔF — the band reads the RAW fitted F (the trace ΔF is already null-differenced); iid-shuffle collapses it.
    name: "deltaF",
    series: (c) => flattenPlanes(c.planes),
    rebuild: (c, slice) => ({ ...c, planes: rebuildPlanes(slice) }),
    bandStatistic: (c, alpha) => fittedFreeEnergy(c.planes, alpha),
    surrogate: iidShuffle,
  },
  {
    // excess-entropy — a plain statistic of the symbol stream; iid-shuffle destroys the ordered backbone.
    name: "complexity",
    series: (c) => c.symbols.slice(),
    rebuild: (c, slice) => ({ ...c, symbols: slice.slice() }),
    bandStatistic: (c, alpha) => complexityEntropyTrace.measure(c, alpha),
    surrogate: iidShuffle,
  },
];

// ── the AAFT surrogate (structural-vs-temporal discriminator) ─────────────────────────────────────────

/**
 * AAFT surrogate (amplitude-adjusted Fourier transform, Theiler et al. 1992) — phase-scramble the slice, then
 * RANK-REMAP the result onto the ORIGINAL value multiset. Composes the BUILT {@link phaseScramble}. Preserving
 * the power spectrum keeps the linear temporal beat (the autocorrelation); the rank-remap keeps the amplitude
 * distribution (so surrogated symbols/salience stay VALID); only the nonlinear phase organization dissolves.
 * So a statistic that stays ABOVE this null reads a STRUCTURAL-membership signature — a nonlinear organization
 * AAFT destroys — rather than a linear-spectral (temporal-beat) artifact AAFT preserves.
 */
function aaftSurrogate(series: readonly number[], rng: () => number): number[] {
  const scrambled = phaseScramble(series, rng);
  // rank the scrambled positions; drop the sorted originals onto those ranks → the original multiset, re-ordered.
  const order = scrambled.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
  const sortedOrig = series.slice().sort((a, b) => a - b);
  const out = new Array<number>(series.length).fill(0);
  order.forEach((pos, rank) => { out[pos] = sortedOrig[rank]!; });
  return out;
}

/** A deterministic logistic-map orbit `xₜ = r·xₜ₋₁·(1−xₜ₋₁)` (r=3.99) — broadband spectrum, STRONG nonlinear
 *  phase structure (time-reversal asymmetry). The AAFT discriminator's positive control: it SURVIVES AAFT. */
function logisticOrbit(n: number, x0: number): number[] {
  const x = new Array<number>(n).fill(0);
  x[0] = x0;
  for (let t = 1; t < n; t++) x[t] = 3.99 * x[t - 1]! * (1 - x[t - 1]!);
  return x;
}

// ── significance instruments (per-rung bands · AAFT verdicts · family-wise maxT) ──────────────────────

/** Options steering the surrogate-null significance sweep. */
interface SigOpts {
  /** surrogate draws per null (per rung, per trace). */
  readonly trials: number;
  /** the significance rate α_sig — the band reads the (1 − α_sig) quantile of the null. */
  readonly alphaSig: number;
  /** the base PRNG seed — each rung offsets it, so the whole significance sweep regenerates deterministically. */
  readonly seed: number;
}

/**
 * Attach a surrogate-null significance band to EVERY row: for each (trace, rung), recompute the trace's band
 * statistic over `trials` structural-null surrogate corpora at that rung's α, read the (1 − α_sig) quantile as
 * the band, and mark the observed value SIGNIFICANT where it exceeds the band. Each trace rides ITS OWN
 * structural null (jitter for H¹, iid-shuffle for ΔF/complexity — see {@link TraceSurrogate}). Rides the BUILT
 * {@link surrogateNull}; a per-rung seed offset keeps it deterministic. Adds `<trace>_band/_p/_sig` columns.
 */
function attachSignificanceBands(
  rows: SweepRow[], corpus: BenchCorpus, surrogates: readonly TraceSurrogate[], opts: SigOpts,
): void {
  rows.forEach((row, r) => {
    const alpha = row.alpha!;
    for (const s of surrogates) {
      const stat = (slice: readonly number[]): number => s.bandStatistic(s.rebuild(corpus, slice), alpha);
      const v = surrogateNull(s.series(corpus), stat, s.surrogate, {
        alpha: opts.alphaSig, trials: opts.trials, seed: opts.seed + r,
      });
      row[`${s.name}_band`] = v.threshold;
      row[`${s.name}_p`] = v.pValue;
      row[`${s.name}_sig`] = v.exceeds ? 1 : 0;
    }
  });
}

/** One AAFT verdict — the observed statistic, its spectrum-preserving AAFT band, and survives-AAFT. */
interface AaftVerdict {
  readonly name: string;
  readonly observed: number;
  /** the (1 − α_sig) quantile of the statistic under the AAFT (spectrum-preserving) null. */
  readonly aaftBand: number;
  readonly pValue: number;
  /** observed > AAFT-band ⇒ a STRUCTURAL signature (survives the spectrum-preserving surrogate). */
  readonly survivesAaft: boolean;
}

/** Peak rung of a trace across the swept rows — where |observed| stands strongest (its signal peak). */
function peakRung(rows: readonly SweepRow[], name: string): number {
  let peak = 0, best = -Infinity;
  rows.forEach((row, r) => { const v = Math.abs(row[name] ?? 0); if (v > best) { best = v; peak = r; } });
  return peak;
}

/**
 * The AAFT discriminator's CONTROL PAIR — a nonlinear positive control vs a linear negative control, proving
 * the machinery separates structure from spectrum. A deterministic logistic orbit (broadband, strongly
 * nonlinear) SURVIVES the AAFT null; a linear-Gaussian AR(1) (its whole signal IS the power spectrum AAFT
 * preserves) does NOT. Both read the BUILT {@link timeReversalAsymmetry} (the nonlinearity statistic the
 * phase-scramble null calibrates) through the BUILT {@link surrogateNull} + the {@link aaftSurrogate}.
 */
function aaftControlPair(opts: SigOpts): { nonlinear: AaftVerdict; linear: AaftVerdict } {
  const absTra = (s: readonly number[]): number => Math.abs(timeReversalAsymmetry(s));
  const nl = surrogateNull(logisticOrbit(512, 0.31), absTra, aaftSurrogate,
    { alpha: opts.alphaSig, trials: opts.trials, seed: opts.seed });
  const ln = surrogateNull(ar1Series(512, 0.9, 42), absTra, aaftSurrogate,
    { alpha: opts.alphaSig, trials: opts.trials, seed: opts.seed });
  return {
    nonlinear: { name: "logistic(nonlinear)", observed: nl.observed, aaftBand: nl.threshold, pValue: nl.pValue, survivesAaft: nl.exceeds },
    linear: { name: "ar1(linear)", observed: ln.observed, aaftBand: ln.threshold, pValue: ln.pValue, survivesAaft: ln.exceeds },
  };
}

/**
 * The family-wise (maxT) band across the three traces (Westfall–Young multiplicity, strong control). The three
 * traces carry INCOMMENSURABLE band statistics (a dim count, a free energy, a bit-rate), so each is STUDENTIZED
 * against its own structural null (z = (observed − nullMean)/nullStd) into a common scale before the max. Then
 * {@link maxTNull} reads ONE family-wise threshold off the null of the MAX studentized deviation across the
 * three — the multiplicity inflation every trace must clear at once, no per-trace α inflation. Each node rides
 * an index token; the shared surrogate re-draws that trace's studentized statistic, so the organ carries the
 * heterogeneous family unchanged.
 */
function familyWiseMaxT(
  corpus: BenchCorpus, surrogates: readonly TraceSurrogate[], rows: readonly SweepRow[], opts: SigOpts,
): MaxTVerdict {
  const peakAlpha: number[] = [];
  const nullMean: number[] = [];
  const nullStd: number[] = [];
  const zObserved: number[] = [];
  surrogates.forEach((s, i) => {
    const alpha = rows[peakRung(rows, s.name)]!.alpha!;
    peakAlpha[i] = alpha;
    const base = s.series(corpus);
    const observed = s.bandStatistic(s.rebuild(corpus, base), alpha);
    const momRng = makeRng(opts.seed + 1000 + i);
    const draws: number[] = [];
    for (let m = 0; m < opts.trials; m++) draws.push(s.bandStatistic(s.rebuild(corpus, s.surrogate(base, momRng)), alpha));
    const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
    const varr = draws.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, draws.length - 1);
    nullMean[i] = mean;
    nullStd[i] = Math.sqrt(varr) + 1e-9;
    zObserved[i] = (observed - mean) / nullStd[i]!;
  });
  const tokens = surrogates.map((_, i) => [i]);
  // observed path: statistic([i]) → z_i ; surrogate path: statistic([i, z]) → z (the studentized draw rides arr[1]).
  const statistic = (arr: readonly number[]): number => (arr.length === 1 ? zObserved[arr[0]!]! : arr[1]!);
  const surrogate = (arr: readonly number[], rng: () => number): number[] => {
    const i = arr[0]!;
    const s = surrogates[i]!;
    const raw = s.bandStatistic(s.rebuild(corpus, s.surrogate(s.series(corpus), rng)), peakAlpha[i]!);
    return [i, (raw - nullMean[i]!) / nullStd[i]!];
  };
  return maxTNull(tokens, statistic, surrogate, { alpha: opts.alphaSig, trials: opts.trials, seed: opts.seed });
}

/** Destroy a corpus's SHEAF structure too (JITTER its salience, matching the H¹ structural null), so a
 *  structure:0 corpus reads structureless on ALL three traces — the H¹ sheaf otherwise ignores the `structure`
 *  knob. The full-null control the significance machinery must read as NOT-significant. */
function destructureSheaf(corpus: BenchCorpus, seed: number): BenchCorpus {
  const flat = jitterSurrogate(H1_JITTER_AMP)(flattenSheaf(corpus.sheaf), makeRng(seed));
  return { ...corpus, sheaf: rebuildSheaf(corpus.sheaf, flat) };
}

// ── data-out (numbers only; NO plotting) ────────────────────────────────────────────────────────────

/** Render the swept rows as CSV — a stable column order (`arl0`, `alpha`, then the trace columns). */
export function toCsv(rows: readonly SweepRow[]): string {
  if (rows.length === 0) return "";
  const lead = ["arl0", "alpha"];
  const rest = Object.keys(rows[0]!).filter((k) => !lead.includes(k)).sort();
  const cols = [...lead, ...rest];
  const head = cols.join(",");
  const body = rows.map((r) => cols.map((c) => String(r[c] ?? "")).join(","));
  return [head, ...body].join("\n");
}

// ── the WITNESS ─────────────────────────────────────────────────────────────────────────────────────

let failures = 0;
function stage(name: string, ok: boolean, detail = ""): void {
  if (!ok) failures++;
  console.log(`[bifurcation-bench] ${ok ? "PASS" : "FAIL"} — ${name}${detail ? `  (${detail})` : ""}`);
}

function main(): void {
  console.log("[bifurcation-bench] =========================================================");
  console.log("[bifurcation-bench] S3 — FOUR traces (H¹ · ΔF · excess-E · EFE-gate) + surrogate-null significance + AAFT");
  console.log("[bifurcation-bench] =========================================================");

  const triangles = 6;
  const corpus = buildBenchCorpus({ triangles, seed: 0x5eed });
  // strict → loose: ARL₀ 200 (α≈0.005, below every gap) down to 1.6 (α≈0.625, above every gap).
  const arl0s = geomArl0Range(200, 1.6, 28);
  const traces = [h1BenchTrace, deltaFTrace, complexityEntropyTrace, efeGateTrace];
  const rows = sweepArl(corpus, traces, arl0s);
  const h1 = rows.map((r) => r.h1_dimH1!);
  const dF = rows.map((r) => r.deltaF!);
  const cE = rows.map((r) => r.complexity!);
  const efeGateRegime = rows.map((r) => r.efe_gate!);

  // ── STAGE 1 — the rows come out well-formed (three finite columns) ──────────────
  const wellFormed = rows.every(
    (r) => Number.isFinite(r.arl0) && Number.isFinite(r.alpha) && Number.isInteger(r.h1_dimH1)
      && Number.isFinite(r.deltaF) && Number.isFinite(r.complexity)
      && (r.efe_gate === 0 || r.efe_gate === 1)
      && Math.abs(r.alpha! - 1 / r.arl0!) < 1e-12,
  );
  stage("1 WELL-FORMED — every row carries finite arl0, α=1/ARL₀, integer dim H¹, finite ΔF + excess-E, binary EFE-gate",
    wellFormed && rows.length === 28, `rows=${String(rows.length)}`);

  // ── STAGE 2 — the H¹ order parameter MOVES with α (a non-flat curve) ────────────
  const distinctH1 = new Set(h1).size;
  const loH1 = h1[0]!, hiH1 = h1[h1.length - 1]!;
  stage("2 H¹ NON-FLAT — dim H¹ moves across the α-sweep (strict→loose)",
    distinctH1 > 1 && loH1 === 0 && hiH1 === triangles,
    `distinct=${String(distinctH1)} first=${String(loH1)} last=${String(hiH1)}`);

  // ── STAGE 3 — the H¹ staircase CLIMBS monotonically as α loosens ────────────────
  let monotone = true;
  for (let i = 1; i < h1.length; i++) if (h1[i]! < h1[i - 1]!) monotone = false;
  stage("3 H¹ MONOTONE — the bifurcation staircase never descends as α loosens", monotone,
    `trace=[${h1.join(",")}]`);

  // ── STAGE 4 — the same seed regenerates the same three-column sweep ─────────────
  const rowsB = sweepArl(buildBenchCorpus({ triangles, seed: 0x5eed }), traces, arl0s);
  const deterministic = toCsv(rows) === toCsv(rowsB);
  stage("4 DETERMINISTIC — the seeded corpus regenerates the identical three-column sweep", deterministic);

  // ── STAGE 5 — ΔF MOVES with α (the model-comparison trace is non-flat) ──────────
  const dFmax = Math.max(...dF), dFmin = Math.min(...dF);
  const dFspread = dFmin > 0 ? dFmax / dFmin : Infinity;
  stage("5 ΔF MOVES — the model-comparison free energy is non-flat across α",
    new Set(dF.map((v) => v.toFixed(4))).size > 5 && dFspread > 1.5,
    `min=${dFmin.toFixed(3)} max=${dFmax.toFixed(3)} max/min=${dFspread.toFixed(2)}`);

  // ── STAGE 6 — ΔF > 0 across the sweep (the fitted model EARNS its evidence) ─────
  const dFearned = dF.every((v) => v > 0);
  stage("6 ΔF EARNED — F(fitted) − F(null) > 0 at every rung (structure ⇒ the model earns F)",
    dFearned, `first=${dF[0]!.toFixed(3)} last=${dF[dF.length - 1]!.toFixed(3)}`);

  // ── STAGE 7 — excess entropy NON-FLAT and TRANSITIONS order→disorder ────────────
  const cEmax = Math.max(...cE), cEmin = Math.min(...cE);
  const cEtransitions = cE[0]! > cE[cE.length - 1]! + 0.5; // ordered (strict α) carries more memory
  stage("7 EXCESS-E TRANSITIONS — non-flat, decaying through the order→disorder boundary",
    new Set(cE.map((v) => v.toFixed(4))).size > 5 && cEmax - cEmin > 0.5 && cEtransitions,
    `first=${cE[0]!.toFixed(3)} last=${cE[cE.length - 1]!.toFixed(3)} range=${(cEmax - cEmin).toFixed(3)}`);

  // ── STAGE 8 — SPECIFICITY: a structureless corpus collapses BOTH order parameters ─
  const nullCorpus = buildBenchCorpus({ triangles, seed: 0x5eed, structure: 0 });
  const nullRows = sweepArl(nullCorpus, [deltaFTrace, complexityEntropyTrace], arl0s);
  const dFnull = nullRows.map((r) => r.deltaF!);
  const cEnull = nullRows.map((r) => r.complexity!);
  const dFnullMaxAbs = Math.max(...dFnull.map(Math.abs));
  const cEnullMax = Math.max(...cEnull);
  // complete separation: the WORST structured rung still reads higher ΔF than the BEST structureless rung,
  // and structureless excess entropy sits below half the structured peak — the comparative test lands clean.
  const specific = dFnullMaxAbs < dFmin && cEnullMax < 0.5 * cEmax;
  stage("8 SPECIFICITY — structureless corpus ⇒ ΔF collapses below the structured floor AND excess-E flat",
    specific,
    `ΔF|null|max=${dFnullMaxAbs.toFixed(3)} (vs structured ΔF∈[${dFmin.toFixed(1)},${dFmax.toFixed(1)}]) · excess-E|null|max=${cEnullMax.toFixed(3)} (vs peak ${cEmax.toFixed(3)})`);

  // ══ S2 — SIGNIFICANCE, not eyeballing ═══════════════════════════════════════════════════════════════
  const sigOpts: SigOpts = { trials: 60, alphaSig: 0.05, seed: 0x51611 };
  const names = ["h1_dimH1", "deltaF", "complexity"] as const;

  // attach the per-(trace,rung) surrogate-null bands onto the STRUCTURED rows (adds *_band/*_p/*_sig columns).
  attachSignificanceBands(rows, corpus, traceSurrogates, sigOpts);
  const sigCount: Record<string, number> = {};
  for (const n of names) sigCount[n] = rows.reduce((a, row) => a + (row[`${n}_sig`] === 1 ? 1 : 0), 0);

  // the full-null CONTROL: structure:0 AND a jitter-destructured sheaf, so ALL three traces read structureless.
  const fullNull = destructureSheaf(buildBenchCorpus({ triangles, seed: 0x5eed, structure: 0 }), 0xc0117401);
  const nullSweep = sweepArl(fullNull, traces, arl0s);
  attachSignificanceBands(nullSweep, fullNull, traceSurrogates, sigOpts);
  const nullSigCount: Record<string, number> = {};
  for (const n of names) nullSigCount[n] = nullSweep.reduce((a, row) => a + (row[`${n}_sig`] === 1 ? 1 : 0), 0);

  // ── STAGE 9 — SIGNIFICANCE: every structured trace jumps SIGNIFICANT above its surrogate-null band ──
  const allSignificant = names.every((n) => (sigCount[n] ?? 0) > 0);
  stage("9 SIGNIFICANT-ABOVE-NULL — each structured trace clears its surrogate-null band at ≥1 rung",
    allSignificant,
    names.map((n) => `${n}:${String(sigCount[n])}/${String(rows.length)}`).join(" "));

  // ── STAGE 10 — the structureless CONTROL sits INSIDE its bands (the machinery discriminates) ─────────
  //    expect ≤ ⌈α_sig · rungs⌉ false positives per trace (α_sig=0.05, 28 rungs ⇒ ≤ 2).
  const fpFloor = Math.ceil(sigOpts.alphaSig * nullSweep.length);
  const nullInside = names.every((n) => (nullSigCount[n] ?? 0) <= fpFloor);
  stage("10 CONTROL INSIDE BANDS — the structureless corpus reads NOT-significant (≤ false-positive floor)",
    nullInside,
    `floor=${String(fpFloor)} · ${names.map((n) => `${n}:${String(nullSigCount[n])}`).join(" ")}`);

  // ── STAGE 11 — the AAFT structural-vs-temporal discriminator (proven on a control pair) ──────────────
  //    The three bench traces read SPECTRAL/topological on THIS corpus (AR(1) linear-spectral · periodic
  //    backbone spectral · H¹ shuffle-invariant), so they do NOT survive AAFT — an honest sub-finding, NOT
  //    a bug. The discriminator's DISCRIMINATING POWER is witnessed on a control pair: a nonlinear logistic
  //    orbit SURVIVES AAFT, a linear-Gaussian AR(1) does NOT. (To make a bench trace itself survive AAFT, its
  //    corpus backbone would need nonlinear-phase structure — an S0/S1 corpus change deferred to the operator.)
  const ctrl = aaftControlPair(sigOpts);
  const discriminates = ctrl.nonlinear.survivesAaft && !ctrl.linear.survivesAaft;
  stage("11 AAFT DISCRIMINATOR — nonlinear control SURVIVES AAFT, linear control reads SPECTRAL",
    discriminates,
    `NL:${ctrl.nonlinear.survivesAaft ? "survives" : "spectral"}(obs=${ctrl.nonlinear.observed.toFixed(2)} band=${ctrl.nonlinear.aaftBand.toFixed(2)} p=${ctrl.nonlinear.pValue.toFixed(3)})`
      + ` LN:${ctrl.linear.survivesAaft ? "survives" : "spectral"}(obs=${ctrl.linear.observed.toFixed(2)} band=${ctrl.linear.aaftBand.toFixed(2)})`);

  // ── STAGE 12 — the family-wise (maxT) band across the three traces (studentized Westfall–Young) ──────
  const fam = familyWiseMaxT(corpus, traceSurrogates, rows, { ...sigOpts, trials: 200 });
  const nullFam = familyWiseMaxT(fullNull, traceSurrogates, nullSweep, { ...sigOpts, trials: 200 });
  const famAll = fam.exceeds.every((e) => e);
  const nullFamNone = nullFam.exceeds.every((e) => !e);
  stage("12 FAMILY-WISE (maxT) — all three structured traces clear ONE family-wise band; control clears none",
    famAll && nullFamNone,
    `thr=${fam.threshold.toFixed(3)} · struct-z=[${fam.observed.map((o) => o.toFixed(2)).join(",")}] exceeds=[${fam.exceeds.map((e) => (e ? 1 : 0)).join(",")}]`
      + ` · null-z=[${nullFam.observed.map((o) => o.toFixed(2)).join(",")}] null-exceeds=[${nullFam.exceeds.map((e) => (e ? 1 : 0)).join(",")}]`);

  // ══ S3 — the EFE organ + its gate-flip trace ═════════════════════════════════════════════════════════

  // ── STAGE 13 — the EFE-gate regime FLIPS co-incident with the H¹ obstruction crossing 0→nonzero ──────
  //    both read the SAME cohomologyObstruction at the SAME α, so the gate's 0→1 flip lands at the exact rung
  //    the H¹ staircase leaves 0 — the "mechanism acting" window on the one α axis.
  const firstH1Nonzero = h1.findIndex((v) => v > 0);
  const firstGateFlip = efeGateRegime.findIndex((v) => v === 1);
  const gateBinary = efeGateRegime.every((v) => v === 0 || v === 1);
  const gateCoincident = firstH1Nonzero >= 0 && firstGateFlip === firstH1Nonzero
    && efeGateRegime.every((v, i) => v === (h1[i]! > 0 ? 1 : 0));
  stage("13 EFE-GATE FLIP — the gate regime flips 0→1 co-incident with H¹ crossing 0→nonzero",
    gateBinary && gateCoincident,
    `H¹-leaves-0@rung=${String(firstH1Nonzero)} (α=${rows[firstH1Nonzero]?.alpha?.toFixed(4) ?? "—"}) · gate-flip@rung=${String(firstGateFlip)} · regime=[${efeGateRegime.join("")}]`);

  // ── STAGE 14 — efeSelect picks the min-EFE verb; the irreversible verb is penalized (derived, not vetoed) ─
  //    Score the four bench verbs over the corpus planes. `align` (steer to the C set-point, options intact)
  //    reads lowest EFE and wins; `collapse` (σ²→0) reads high optionLoss → high EFE → passed over, and its
  //    reversibility FALLS OUT as sign(optionLoss) > 0 (irreversible); `expand` opens options (reversible).
  const sel = efeSelect(corpus.planes, BENCH_VERBS, BENCH_C);
  const byVerb: Record<string, (typeof sel.ranked)[number]> = {};
  for (const s of sel.ranked) byVerb[s.verb] = s;
  const collapse = byVerb.collapse!, expand = byVerb.expand!, align = byVerb.align!;
  const selectPicksAlign = sel.chosen.verb === "align";
  const collapsePenalized = collapse.optionLoss > 0 && !collapse.reversible && collapse.efe > align.efe;
  const expandReversible = expand.optionLoss < 0 && expand.reversible;
  stage("14 EFE-SELECT — argmin picks the C-reaching verb; the σ²→0 verb reads irreversible + is passed over",
    selectPicksAlign && collapsePenalized && expandReversible,
    `chosen=${sel.chosen.verb} (EFE=${align.efe.toFixed(2)}) · collapse: optionLoss=${collapse.optionLoss.toFixed(2)} EFE=${collapse.efe.toFixed(2)} reversible=${String(collapse.reversible)}`
      + ` · expand: optionLoss=${expand.optionLoss.toFixed(2)} reversible=${String(expand.reversible)}`);

  // ── STAGE 15 — the KEYSTONE GATE branches: H¹=0 → select · H¹≠0 → surface-disagreement(R*_sem) ────────
  //    A strict-α gate (α below every gap ⇒ H¹=0) SELECTS a verb; a loose-α gate (α above every gap ⇒ H¹≠0)
  //    SURFACES the disagreement carrying R*_sem = log₂ dim H¹ (never a reconcile move).
  const strictGate = efeGate(corpus.sheaf, corpus.planes, BENCH_VERBS, BENCH_C, { agreementTolerance: 0.001 });
  const looseGate = efeGate(corpus.sheaf, corpus.planes, BENCH_VERBS, BENCH_C, { agreementTolerance: 0.9 });
  const selects = strictGate.verdict === "select" && strictGate.selection !== null;
  const surfaces = looseGate.verdict === "surface-disagreement" && looseGate.disagreement !== null
    && looseGate.disagreement.dimH1 > 0
    && Math.abs(looseGate.disagreement.cost - Math.log2(looseGate.disagreement.dimH1)) < 1e-9;
  stage("15 KEYSTONE GATE — H¹=0 branch selects a verb; H¹≠0 branch surfaces disagreement with R*_sem",
    selects && surfaces,
    `strict(α=0.001): ${strictGate.verdict}${strictGate.verdict === "select" ? ` → ${strictGate.selection.chosen.verb}` : ""}`
      + ` · loose(α=0.9): ${looseGate.verdict}${looseGate.verdict === "surface-disagreement" ? ` dimH1=${String(looseGate.disagreement.dimH1)} R*_sem=${looseGate.disagreement.cost.toFixed(3)}` : ""}`);

  // ── the data-out: NUMBERS ONLY (JSON + CSV; the figure renders downstream) ──────
  console.log("[bifurcation-bench] --- AAFT verdicts (control pair: nonlinear survives-AAFT vs linear spectral) ---");
  console.log(JSON.stringify({ control: [ctrl.nonlinear, ctrl.linear] }, null, 0));
  console.log("[bifurcation-bench] --- family-wise maxT (nodes = the three traces; studentized band statistic) ---");
  console.log(JSON.stringify({ threshold: fam.threshold, traces: names, studentizedObserved: fam.observed, exceeds: fam.exceeds, pValues: fam.pValues }, null, 0));
  console.log("[bifurcation-bench] --- data-out (JSON rows: arl0, alpha, h1_dimH1, deltaF, complexity, *_band, *_p, *_sig) ---");
  console.log(JSON.stringify(rows, null, 0));
  console.log("[bifurcation-bench] --- data-out (CSV) ---");
  console.log(toCsv(rows));

  console.log("[bifurcation-bench] =========================================================");
  if (failures === 0) {
    console.log("[bifurcation-bench] ALL STAGES PASS — FOUR order parameters bifurcate on ONE α axis (three SIGNIFICANTLY + the EFE-gate regime).");
    console.log("[bifurcation-bench] Each jump reads significant-above-null; the AAFT discriminator separates structural from spectral; the EFE gate flips regime co-incident with H¹.");
  } else {
    console.log(`[bifurcation-bench] ${String(failures)} STAGE(S) FAILED.`);
    process.exit(1);
  }
}

main();
