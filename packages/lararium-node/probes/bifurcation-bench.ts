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
 * Meme: lar:///ha.ka.ba/@lares/api/pono/li-ki-integrities#crucible-tested
 */

import { makeArlDial, freeEnergy, iidShuffle, makeRng, type ArlDialOpts } from "@lararium/mesh";
import { cohomologyObstruction, type SheafAssignment } from "../src/sensorium-fusion.js";
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
  console.log("[bifurcation-bench] S1 — the Bifurcation Bench, THREE traces (H¹ · ΔF · excess-entropy)");
  console.log("[bifurcation-bench] =========================================================");

  const triangles = 6;
  const corpus = buildBenchCorpus({ triangles, seed: 0x5eed });
  // strict → loose: ARL₀ 200 (α≈0.005, below every gap) down to 1.6 (α≈0.625, above every gap).
  const arl0s = geomArl0Range(200, 1.6, 28);
  const traces = [h1BenchTrace, deltaFTrace, complexityEntropyTrace];
  const rows = sweepArl(corpus, traces, arl0s);
  const h1 = rows.map((r) => r.h1_dimH1!);
  const dF = rows.map((r) => r.deltaF!);
  const cE = rows.map((r) => r.complexity!);

  // ── STAGE 1 — the rows come out well-formed (three finite columns) ──────────────
  const wellFormed = rows.every(
    (r) => Number.isFinite(r.arl0) && Number.isFinite(r.alpha) && Number.isInteger(r.h1_dimH1)
      && Number.isFinite(r.deltaF) && Number.isFinite(r.complexity)
      && Math.abs(r.alpha! - 1 / r.arl0!) < 1e-12,
  );
  stage("1 WELL-FORMED — every row carries finite arl0, α=1/ARL₀, integer dim H¹, finite ΔF + excess-E",
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

  // ── the data-out: NUMBERS ONLY (JSON + CSV; the figure renders downstream) ──────
  console.log("[bifurcation-bench] --- data-out (JSON rows: arl0, alpha, h1_dimH1, deltaF, complexity) ---");
  console.log(JSON.stringify(rows, null, 0));
  console.log("[bifurcation-bench] --- data-out (CSV) ---");
  console.log(toCsv(rows));

  console.log("[bifurcation-bench] =========================================================");
  if (failures === 0) {
    console.log("[bifurcation-bench] ALL STAGES PASS — three order parameters bifurcate on ONE α axis.");
    console.log("[bifurcation-bench] The Bench carries H¹ · ΔF · excess-entropy; S2 (RQA/bands) plugs onto the same axis.");
  } else {
    console.log(`[bifurcation-bench] ${String(failures)} STAGE(S) FAILED.`);
    process.exit(1);
  }
}

main();
