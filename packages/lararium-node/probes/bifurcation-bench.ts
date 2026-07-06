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

import { makeArlDial, type ArlDialOpts } from "@lararium/mesh";
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
  console.log("[bifurcation-bench] S0 — the minimal Bifurcation Bench (Trace #1 = H¹)");
  console.log("[bifurcation-bench] =========================================================");

  const triangles = 6;
  const corpus = buildBifurcationCorpus({ triangles, seed: 0x5eed });
  // strict → loose: ARL₀ 200 (α≈0.005, below every gap) down to 1.6 (α≈0.625, above every gap).
  const arl0s = geomArl0Range(200, 1.6, 28);
  const rows = sweepArl(corpus, [h1ObstructionTrace], arl0s);
  const h1 = rows.map((r) => r.h1_dimH1!);

  // ── STAGE 1 — the rows come out well-formed ────────────────────────────────────
  const wellFormed = rows.every(
    (r) => Number.isFinite(r.arl0) && Number.isFinite(r.alpha) && Number.isInteger(r.h1_dimH1)
      && Math.abs(r.alpha! - 1 / r.arl0!) < 1e-12,
  );
  stage("1 WELL-FORMED — every row carries finite arl0, α=1/ARL₀, and an integer dim H¹",
    wellFormed && rows.length === 28, `rows=${String(rows.length)}`);

  // ── STAGE 2 — the H¹ order parameter MOVES with α (a non-flat curve) ────────────
  const distinct = new Set(h1).size;
  const lo = h1[0]!, hi = h1[h1.length - 1]!;
  stage("2 NON-FLAT — dim H¹ moves across the α-sweep (strict→loose)",
    distinct > 1 && lo === 0 && hi === triangles,
    `distinct=${String(distinct)} first=${String(lo)} last=${String(hi)}`);

  // ── STAGE 3 — the staircase CLIMBS monotonically as α loosens ──────────────────
  let monotone = true;
  for (let i = 1; i < h1.length; i++) if (h1[i]! < h1[i - 1]!) monotone = false;
  stage("3 MONOTONE — the bifurcation staircase never descends as α loosens", monotone,
    `trace=[${h1.join(",")}]`);

  // ── STAGE 4 — the same seed regenerates the same sweep (deterministic) ──────────
  const rowsB = sweepArl(buildBifurcationCorpus({ triangles, seed: 0x5eed }), [h1ObstructionTrace], arl0s);
  const deterministic = toCsv(rows) === toCsv(rowsB);
  stage("4 DETERMINISTIC — the seeded corpus regenerates the identical sweep", deterministic);

  // ── the data-out: NUMBERS ONLY (JSON + CSV; the figure renders downstream) ──────
  console.log("[bifurcation-bench] --- data-out (JSON rows) ---");
  console.log(JSON.stringify(rows, null, 0));
  console.log("[bifurcation-bench] --- data-out (CSV) ---");
  console.log(toCsv(rows));

  console.log("[bifurcation-bench] =========================================================");
  if (failures === 0) {
    console.log("[bifurcation-bench] ALL STAGES PASS — the H¹ order parameter bifurcates with α.");
    console.log("[bifurcation-bench] The Bench stands: later strands plug their OrderParameter onto this axis.");
  } else {
    console.log(`[bifurcation-bench] ${String(failures)} STAGE(S) FAILED.`);
    process.exit(1);
  }
}

main();
