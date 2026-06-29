/**
 * multi-graph-recall — P4 of the living-grammar palace: the RRF MULTI-graph query that FUSES the
 * palace's several graphs into ONE ranking. Today the two live legs are the CONTENT graph (the
 * verbatim mempalace — dense embeddings, the drawers) and the FORM graph (the `.formpalace` "form"
 * collection — sparse fuzzy-constructicon vectors, the moves); the STRUCTURE (`.astpalace`),
 * worldline, and federation graphs slot in as further legs with ZERO core change.
 *
 * The graphs stay ORTHOGONAL (each asks a different question — *what was said* · *how the grammar
 * moved* · *what shape recurred* · …); they rejoin ONLY here, in app code, on one shared key — the
 * `verbatim_sha` — fused by Reciprocal Rank Fusion (k=60). "Fusion IS the hash-join" (living-grammar-
 * palace #dual-graph). A drawer ranking in MORE legs accrues more RRF contributions, so a cross-
 * confirmed move naturally outranks one present in a single graph at comparable rank.
 *
 * The fold is split in two:
 *   - {@link fuseMultiGraph} — the PURE N-ary rank-fusion + verbatim_sha join (no I/O; the testable
 *     core). It takes a LIST of weighted, ranked graph legs and RRFs over all of them.
 *   - {@link multiGraphRecall} — the orchestrator: run the injected searches (content + form live by
 *     default, plus any extra graphs), build their legs, then fuse. The APERTURE knobs ride here:
 *     `formWeight` tilts the form leg, `register`/`grammarLayer` scope it by metadata where-filter,
 *     and `apertureGrain` (P6) re-weights the fused ranking toward the paragraph-scale basin-peak.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/living-grammar-palace#dual-graph (+ #multi-aperture)
 */

import type { SearchArgs, SearchHit, SearchResult } from "@lararium/mempalace";
import type { BearingFacets, MoveSkeleton } from "@lararium/tw5/form-layer";
import { parseBearing, bearingFacets } from "@lararium/tw5/form-layer";

import type { FormMatch, FormPalace, SerializedBasis } from "./formpalace.js";

/** RRF damping constant. k=60 is the standard (Cormack et al.) — large enough that top-rank
 *  differences don't dominate, small enough that rank still matters. */
export const DEFAULT_RRF_K = 60;

export interface MultiGraphOptions {
  /** RRF damping constant; default {@link DEFAULT_RRF_K} (60). */
  readonly k?: number;
}

// ---------------------------------------------------------------------------
// the N-ary graph legs — each a named, weighted, ranked list joined on one key
// ---------------------------------------------------------------------------

/** One ranked item in a graph leg: its cross-graph join key + the sha to report + the native hit. */
export interface GraphItem {
  /** the join key — the verbatim sha when known, else a synthetic key that NEVER collides with a
   *  real 64-hex sha (so an unjoinable item still rides the fusion as its own row). */
  readonly key: string;
  /** the verbatim sha256 to report on the fused row, or "" when this item carried none to join on. */
  readonly sha: string;
  /** the graph's native hit payload (a SearchHit, a FormMatch, …) — surfaced under the graph name. */
  readonly payload: unknown;
}

/** One graph fed to the fusion: a name (the key its scores/ranks/payloads file under), an RRF weight
 *  (the aperture tilt; default 1), and its hits already in rank order. */
export interface GraphLeg {
  readonly name: string;
  readonly weight?: number;
  readonly items: readonly GraphItem[];
}

/** One fused row of the multi-graph ranking — the per-graph RRF contributions, ranks, and native
 *  payloads, keyed by graph name, plus the fused total and the set of graphs it joined across. A
 *  graph name is ABSENT from `scores`/`ranks`/`payloads` where the drawer did not ride that graph. */
export interface MultiGraphHit {
  /** the join key — the verbatim sha256 when known on any leg, else "" (an unjoinable single-leg hit). */
  readonly verbatimSha: string;
  /** the fused RRF score = Σ over the legs it appears in (higher ranks first). */
  readonly fusedScore: number;
  /** per-graph RRF contribution, keyed by graph name (absent graphs omitted). */
  readonly scores: Readonly<Record<string, number>>;
  /** per-graph 1-based rank, keyed by graph name (absent graphs omitted). */
  readonly ranks: Readonly<Record<string, number>>;
  /** the graph names this row appeared in, in leg order (the cross-confirmed set; ≥2 = corroborated). */
  readonly presentIn: readonly string[];
  /** the native hit payload per graph, keyed by graph name (absent graphs omitted). */
  readonly payloads: Readonly<Record<string, unknown>>;
}

/** Mutable accumulator while folding the legs; frozen into {@link MultiGraphHit} on emit. */
interface Row {
  verbatimSha: string;
  scores: Record<string, number>;
  ranks: Record<string, number>;
  payloads: Record<string, unknown>;
}

/** The join key for a content hit: its `lar_verbatim_sha` (the cross-graph key the routing split
 *  stamped, node-capture-engine#makeFormSplitFlush) when present; otherwise a synthetic content-only
 *  key that NEVER collides with a real 64-hex sha, so a content drawer with no form partner still
 *  rides the fusion as its own row. */
export function contentKeyOf(hit: SearchHit, index: number): { key: string; sha: string } {
  const raw = hit["lar_verbatim_sha"];
  if (typeof raw === "string" && raw) return { key: raw, sha: raw };
  const src =
    (typeof hit.source_path === "string" && hit.source_path) ||
    (typeof hit.source_file === "string" && hit.source_file) ||
    "?";
  return { key: `content-only:${index}:${src}`, sha: "" };
}

/** Build a CONTENT graph leg from mempalace search hits (the verbatim_sha join key per hit). */
export function contentLeg(name: string, hits: readonly SearchHit[], weight?: number): GraphLeg {
  return {
    name,
    ...(weight !== undefined ? { weight } : {}),
    items: hits.map((hit, i) => {
      const { key, sha } = contentKeyOf(hit, i);
      return { key, sha, payload: hit };
    }),
  };
}

/** Build a FORM graph leg from form-similarity matches (the match `key` IS the verbatim_sha). */
export function formLeg(name: string, matches: readonly FormMatch[], weight?: number): GraphLeg {
  return {
    name,
    ...(weight !== undefined ? { weight } : {}),
    items: matches.map((m) => ({ key: m.key, sha: m.key, payload: m })),
  };
}

function newRow(verbatimSha: string): Row {
  return { verbatimSha, scores: {}, ranks: {}, payloads: {} };
}

/** The best (smallest) per-graph rank a row holds — the fusion tiebreak. */
function bestRank(h: MultiGraphHit): number {
  let m = Infinity;
  for (const r of Object.values(h.ranks)) if (r < m) m = r;
  return m;
}

/** The total fused-ranking order: fused score desc, then the best single rank, then sha (stable). */
function compareHits(a: MultiGraphHit, b: MultiGraphHit): number {
  if (b.fusedScore !== a.fusedScore) return b.fusedScore - a.fusedScore;
  const ar = bestRank(a);
  const br = bestRank(b);
  if (ar !== br) return ar - br;
  return a.verbatimSha < b.verbatimSha ? -1 : a.verbatimSha > b.verbatimSha ? 1 : 0;
}

/**
 * PURE N-ary Reciprocal Rank Fusion + verbatim_sha join. Given a list of weighted, already-ranked
 * graph legs, fold them into one fused ranking:
 *
 *   score(d) = Σ_g  weight_g / (k + rank_g(d))      over the legs d appears in   (rank 1-based)
 *
 * The shared join key (a real verbatim_sha, or a leg's synthetic single-leg key) keys the legs
 * together: a drawer present in MORE legs sums more contributions → it outranks a same-rank single-
 * leg drawer. Returns rows sorted by fused score descending (ties broken by the best single rank,
 * then by sha for determinism). Two legs reproduce the former dual-graph fusion exactly.
 */
export function fuseMultiGraph(
  legs: readonly GraphLeg[],
  opts: MultiGraphOptions = {},
): MultiGraphHit[] {
  const k = opts.k ?? DEFAULT_RRF_K;
  const rows = new Map<string, Row>();
  const order = legs.map((l) => l.name);

  for (const leg of legs) {
    const weight = leg.weight ?? 1;
    leg.items.forEach((item, i) => {
      const rank = i + 1;
      const row = rows.get(item.key) ?? newRow(item.sha);
      // Keep the best-known sha: a later leg may carry the real sha where an earlier synthetic key
      // did not (legs join on the same key, so a real sha overwrites an empty one).
      if (!row.verbatimSha && item.sha) row.verbatimSha = item.sha;
      row.scores[leg.name] = weight / (k + rank);
      row.ranks[leg.name] = rank;
      row.payloads[leg.name] = item.payload;
      rows.set(item.key, row);
    });
  }

  const out: MultiGraphHit[] = [];
  for (const row of rows.values()) {
    let fusedScore = 0;
    for (const s of Object.values(row.scores)) fusedScore += s;
    const presentIn = order.filter((n) => n in row.scores);
    out.push({
      verbatimSha: row.verbatimSha,
      fusedScore,
      scores: row.scores,
      ranks: row.ranks,
      presentIn,
      payloads: row.payloads,
    });
  }

  out.sort(compareHits);
  return out;
}

/**
 * Build the FORM-leg metadata where-filter from the aperture knobs PLUS the bearing facets. The
 * "form" collection stamps `register` + `grammar_layer` on every drawer AND carries the descended
 * aim/yield bearing facets (bearing_w1/w2/w3/root/path/frag/grade, formpalace#FormMetadata), so a
 * recall scopes by a register/grammar-layer aperture (living-grammar-palace#multi-aperture) AND/OR
 * by a bearing clause (the structured bearing recall). Each PRESENT bearing_* facet becomes its own
 * equality clause. Returns a ChromaDB-shaped where clause (a flat clause for one, an `$and` for
 * several), or undefined when nothing is asked.
 */
export function buildFormWhere(
  register?: string,
  grammarLayer?: string,
  bearing?: Partial<BearingFacets>,
): Record<string, unknown> | undefined {
  const clauses: Record<string, unknown>[] = [];
  if (register) clauses.push({ register });
  if (grammarLayer) clauses.push({ grammar_layer: grammarLayer });
  if (bearing) {
    for (const [key, val] of Object.entries(bearing)) {
      if (val) clauses.push({ [key]: val });
    }
  }
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
}

/**
 * AND any number of ChromaDB where-clauses (undefined ignored), flattening one level of `$and` so a
 * pre-built aperture `$and` and a bearing clause combine into ONE flat `$and` (never a nested tower).
 * Returns undefined when nothing remains, the lone clause when one, else `{ $and: [...] }`.
 */
export function combineWhere(
  ...clauses: (Record<string, unknown> | undefined)[]
): Record<string, unknown> | undefined {
  const flat: Record<string, unknown>[] = [];
  for (const c of clauses) {
    if (!c) continue;
    const and = (c as { $and?: unknown }).$and;
    if (Array.isArray(and)) flat.push(...(and as Record<string, unknown>[]));
    else flat.push(c);
  }
  if (flat.length === 0) return undefined;
  if (flat.length === 1) return flat[0];
  return { $and: flat };
}

// ---------------------------------------------------------------------------
// the FORM-LEG policy — resolve the deferred form-query fork by query shape
// ---------------------------------------------------------------------------

/** What the form-leg policy needs of a {@link FormPalace}: the metadata-only `filter` (the bearing /
 *  keyword recall) + the vector `query` (the markers recall). */
export type FormSearchPalace = Pick<FormPalace, "filter" | "query">;

/** Config for {@link makeFormSearch} — the query to route, the FORM store, and the OPTIONAL markers
 *  skeleton-deriver. */
export interface FormSearchConfig {
  /** the recall query — parsed for a bearing, sniffed for sigil markers. */
  readonly query: string;
  /** the FORM store (the metadata filter + the vector query). */
  readonly formPalace: FormSearchPalace;
  /**
   * The markers path: derive a query move-skeleton + basis to vectorize a sigil-bearing query. Runs
   * IN the @daemon VM (the recall twin of capture — one runtime, no node-side fallback): a round-trip
   * to the warm worker where the query folds against the full grammar + live basis (the structural
   * plane present), so recall applies the IDENTICAL Move→Vec functor capture does. Absent (or resolves
   * null — the VM cold/unavailable, or no derivable move-form) → a markers query DEGRADES to the
   * keyword branch (content-only fusion). The live wiring is `daemonVm.deriveSkeleton`; tests inject a fake.
   */
  readonly deriveSkeleton?: (query: string) => Promise<{ skeleton: MoveSkeleton; basis: SerializedBasis } | null>;
}

/** The sharktooth opener — a query carrying it has derivable sigil markers (the form-vector path). */
const MARKER_RE = /<<~/;

/**
 * Build the injected `formSearch` leg with GRACEFUL DEGRADATION across three query shapes — this
 * RESOLVES P4's deferred form-query fork (a bare keyword query yields a near-empty form vector, so a
 * vector search is the wrong tool unless the query actually carries grammar):
 *
 *  1. a BEARING (an aim/yield `lar://` URI) → a STRUCTURED metadata where-filter on the bearing root
 *     (NO vector — the bearing IS the query; bearing-ast#bearingFacets → buildFormWhere);
 *  2. sigil MARKERS (a derivable skeleton, `deriveSkeleton` supplied + non-null) → form-vector
 *     SIMILARITY (the existing FormPalace.query path);
 *  3. bare KEYWORDS → the register/grammar-layer where-filter IF an aperture scope is asked, ELSE
 *     DEFER the form leg (return [] → multiGraphRecall fuses content-only, gracefully).
 *
 * The `where` the leg receives carries multiGraphRecall's aperture scope (register/grammar-layer);
 * the bearing branch ANDs its own root clause onto it ({@link combineWhere}). Returns the leg
 * multiGraphRecall calls — `(input: { nResults, where? }) => Promise<FormMatch[]>`.
 */
export function makeFormSearch(
  cfg: FormSearchConfig,
): (input: { nResults: number; where?: Record<string, unknown> }) => Promise<FormMatch[]> {
  const bv = parseBearing(cfg.query);
  const hasMarkers = MARKER_RE.test(cfg.query);

  return async ({ nResults, where }) => {
    // 1. BEARING — a parseable lar: URI with a root → metadata where-filter, no vector needed.
    if (bv.grade !== "unparsed" && bv.root.terms.length > 0) {
      const f = bearingFacets(bv);
      // Filter by the bearing ROOT (the identity key); grade/path/frag stay OUT of the filter so a
      // recall matches every turn that bore this root, not only the exact full URI.
      const bearingWhere = buildFormWhere(
        undefined,
        undefined,
        f.bearing_root ? { bearing_root: f.bearing_root } : {},
      );
      const merged = combineWhere(where, bearingWhere);
      return cfg.formPalace.filter({ nResults, ...(merged !== undefined ? { where: merged } : {}) });
    }

    // 2. MARKERS — a derivable skeleton → form-vector similarity (the existing query path). The
    //    derive round-trips the @daemon VM (one runtime); a null (VM cold / no move-form) falls to (3).
    if (hasMarkers && cfg.deriveSkeleton) {
      const derived = await cfg.deriveSkeleton(cfg.query);
      if (derived) {
        return cfg.formPalace.query({
          skeleton: derived.skeleton,
          basis: derived.basis,
          nResults,
          ...(where !== undefined ? { where } : {}),
        });
      }
    }

    // 3. KEYWORDS — an aperture scope present → filter by it; else DEFER (content-only fusion).
    if (where !== undefined) return cfg.formPalace.filter({ where, nResults });
    return [];
  };
}

// ---------------------------------------------------------------------------
// P6 — the PARAGRAPH-SCALE aperture (the basin-peak knob)
// ---------------------------------------------------------------------------

/** The paragraph band CENTER on the 0..20 HUD Aperture scale (morpheme 0 → paragraph 10 →
 *  session-arc 20; the Measure band 9..12). The paper's measured register/move basin-peak: prominence
 *  exceeds chance at every Aperture grain yet PEAKS SHARPLY at the paragraph, decoupled from token-
 *  volume (PAPER_infrastructure_as_myth §7.4). The default target for {@link weightByAperture}. */
export const PARAGRAPH_APERTURE = 10;

/** Aperture-ladder band names → their 0..20 center, so a recall may ask `apertureGrain: "paragraph"`
 *  (the paper's ladder: clause → sentence → paragraph → section → whole-unit; HUD bands: pulse · beat
 *  · measure · arc · theme). A bare number passes through unchanged. */
const APERTURE_BANDS: Readonly<Record<string, number>> = {
  morpheme: 0, pulse: 2, clause: 2,
  beat: 6, sentence: 6,
  measure: 10, paragraph: 10,
  arc: 14, section: 14,
  theme: 18, document: 18, "whole-unit": 18, "session-arc": 20,
};

/** Resolve an `apertureGrain` knob (a number, a numeric string, or a band name) → its 0..20 center,
 *  or undefined when nothing/unrecognized is asked (→ no aperture re-weighting). */
export function resolveApertureGrain(grain: number | string | undefined): number | undefined {
  if (typeof grain === "number") return Number.isFinite(grain) ? grain : undefined;
  if (typeof grain === "string") {
    const t = grain.trim().toLowerCase();
    if (t === "") return undefined;
    const n = Number(t);
    if (Number.isFinite(n) && /\d/.test(t)) return n;
    return APERTURE_BANDS[t];
  }
  return undefined;
}

/** Knobs for the paragraph-centered aperture kernel. */
export interface ApertureWeightOptions {
  /** the band center to peak at; default {@link PARAGRAPH_APERTURE}. */
  readonly center?: number;
  /** the falloff half-width (the grain distance at which weight reaches the floor); default 5. */
  readonly halfWidth?: number;
  /** the multiplier at the center (paragraph-grain ranks UP); default 2. */
  readonly peak?: number;
  /** the multiplier at/beyond the half-width (off-grain ranks DOWN, never zeroed); default 0.5. */
  readonly floor?: number;
}

/**
 * The paragraph-centered triangular kernel — the RAPTOR aperture tuned to the paragraph (NOT a
 * cluster-tree; a focused weight). A drawer whose declared aperture grain sits AT the paragraph band
 * ranks up (→ peak); one far off ranks down (→ floor). An UNKNOWN grain (`null`) stays NEUTRAL (1) —
 * never penalized, because the basin-peak is decoupled from token-volume, so the absence of a grain
 * self-report is not evidence against a drawer.
 */
export function apertureWeight(grain: number | null | undefined, opts: ApertureWeightOptions = {}): number {
  if (grain == null) return 1;
  const center = opts.center ?? PARAGRAPH_APERTURE;
  const halfWidth = opts.halfWidth ?? 5;
  const peak = opts.peak ?? 2;
  const floor = opts.floor ?? 0.5;
  const t = Math.max(0, 1 - Math.abs(grain - center) / Math.max(halfWidth, 1e-9));
  return floor + (peak - floor) * t;
}

/** Read a fused row's declared aperture grain — the form drawer's `aperture` facet first (stamped at
 *  capture, node-capture-engine#makeFormSplitFlush), else the content hit's `lar_aperture`, else null
 *  (unknown grain → neutral weight). Reads the conventional "form"/"content" leg names; tolerates a
 *  number or a numeric string. */
function hitApertureGrain(hit: MultiGraphHit): number | null {
  const form = hit.payloads["form"] as FormMatch | undefined;
  const fm = form?.metadata?.["aperture"];
  if (typeof fm === "number" && Number.isFinite(fm)) return fm;
  if (typeof fm === "string" && fm !== "" && Number.isFinite(Number(fm))) return Number(fm);
  const content = hit.payloads["content"] as SearchHit | undefined;
  const cm = content?.["lar_aperture"];
  if (typeof cm === "number" && Number.isFinite(cm)) return cm;
  if (typeof cm === "string" && cm !== "" && Number.isFinite(Number(cm))) return Number(cm);
  return null;
}

/**
 * Re-weight a fused ranking by a paragraph-grain aperture (P6) — multiply each row's fused score by
 * {@link apertureWeight} over its declared grain, then re-sort (the same tiebreak as {@link
 * fuseMultiGraph}). PURE; leaves {@link fuseMultiGraph}'s RRF math untouched (this rides on top). The
 * fused score is scaled in place on the returned rows; the per-graph contributions stay as-fused.
 */
export function weightByAperture(
  rows: readonly MultiGraphHit[],
  target: number,
  opts: ApertureWeightOptions = {},
): MultiGraphHit[] {
  const o: ApertureWeightOptions = { ...opts, center: opts.center ?? target };
  const out = rows.map((r) => ({ ...r, fusedScore: r.fusedScore * apertureWeight(hitApertureGrain(r), o) }));
  out.sort(compareHits);
  return out;
}

// ---------------------------------------------------------------------------
// the orchestrator — N injected searches, fused
// ---------------------------------------------------------------------------

/** An EXTRA graph beyond the live content+form pair (structure/worldline/federation, later) — a name,
 *  an optional RRF weight, and a search that returns its ranked items for the query+limit. */
export interface ExtraGraph {
  readonly name: string;
  readonly weight?: number;
  readonly search: (input: { query: string; limit: number }) => Promise<readonly GraphItem[]>;
}

/** The injected search legs — the graphs, each reached however the caller wires it (the real daemon:
 *  the mempalace read-client + the form palace; tests: fakes — no python, no chroma). Content + form
 *  are the live default; `extraGraphs` slot further legs into the N-ary core with zero change here. */
export interface MultiGraphRecallDeps {
  /** the CONTENT graph: a semantic search of the verbatim mempalace (mempalace-client#search). */
  readonly contentSearch: (args: SearchArgs) => Promise<SearchResult>;
  /** the FORM graph: a form-similarity search of the "form" collection, optionally where-scoped. */
  readonly formSearch: (input: { nResults: number; where?: Record<string, unknown> }) => Promise<FormMatch[]>;
  /** additional graphs (structure/worldline/federation, …) fused alongside content+form. */
  readonly extraGraphs?: readonly ExtraGraph[];
}

export interface MultiGraphRecallArgs {
  /** the recall query (keywords / a question) — embedded by the content sidecar. */
  readonly query: string;
  /** content-graph wing scope (mempalace wing). */
  readonly wing?: string;
  /** results per leg AND the final fused cap; default 10. */
  readonly limit?: number;
  /** the aperture tilt: weight the FORM leg in the fusion; default 1 (balanced). */
  readonly formWeight?: number;
  /** form-graph aperture: scope to a confidence register (the where-filter). */
  readonly register?: string;
  /** form-graph aperture: scope to a grammar-stack layer (html|wikitext|x-memetic). */
  readonly grammarLayer?: string;
  /**
   * P6 paragraph-scale aperture: re-weight the fused ranking toward a declared attention grain (a
   * 0..20 HUD Aperture, or a band name — "paragraph" → {@link PARAGRAPH_APERTURE}). Off when absent
   * (no re-weighting). The paper's basin-peak sits at the paragraph; pass "paragraph" to ride it.
   */
  readonly apertureGrain?: number | string;
  /** P6 falloff half-width for the aperture kernel; default 5 (covers the Measure band). */
  readonly apertureWidth?: number;
  /** RRF damping constant; default {@link DEFAULT_RRF_K}. */
  readonly k?: number;
}

export interface MultiGraphRecallResult {
  readonly query: string;
  readonly k: number;
  readonly formWeight: number;
  /** the resolved paragraph-grain aperture center applied (P6), or null when no re-weighting ran. */
  readonly apertureGrain: number | null;
  /** the fused multi-graph ranking, verbatim_sha-joined, aperture-reweighted (P6), capped to `limit`. */
  readonly results: MultiGraphHit[];
  /** how many hits each graph returned (pre-fusion), keyed by graph name (content · form · …). */
  readonly counts: Record<string, number>;
}

/**
 * Orchestrate one multi-graph recall: search the graphs in parallel (content + form live, plus any
 * `extraGraphs`), build their weighted legs, then RRF-fuse them on the verbatim_sha. The aperture
 * knobs ride here — `formWeight` tilts the form leg, `register`/`grammarLayer` scope it, and
 * `apertureGrain` (P6) re-weights the fused ranking toward the paragraph-scale basin-peak. Wired into
 * the @daemon `recall` verb (open-node-vessel) as a recall mode beside `search` / `list` / `drawer`.
 */
export async function multiGraphRecall(
  deps: MultiGraphRecallDeps,
  args: MultiGraphRecallArgs,
): Promise<MultiGraphRecallResult> {
  const limit = args.limit ?? 10;
  const k = args.k ?? DEFAULT_RRF_K;
  const formWeight = args.formWeight ?? 1;
  const where = buildFormWhere(args.register, args.grammarLayer);
  const extras = deps.extraGraphs ?? [];

  const [content, form, ...extraResults] = await Promise.all([
    deps.contentSearch({
      query: args.query,
      ...(args.wing !== undefined ? { wing: args.wing } : {}),
      limit,
    }),
    deps.formSearch({ nResults: limit, ...(where !== undefined ? { where } : {}) }),
    ...extras.map((g) => g.search({ query: args.query, limit })),
  ]);

  const contentHits = content.results ?? [];
  const legs: GraphLeg[] = [
    contentLeg("content", contentHits),
    formLeg("form", form, formWeight),
    ...extras.map((g, i) => ({
      name: g.name,
      ...(g.weight !== undefined ? { weight: g.weight } : {}),
      items: extraResults[i] ?? [],
    })),
  ];

  let fused = fuseMultiGraph(legs, { k });

  // P6 — re-weight toward the paragraph grain (the basin-peak) when an aperture is asked.
  const grain = resolveApertureGrain(args.apertureGrain);
  if (grain !== undefined) {
    fused = weightByAperture(fused, grain, {
      ...(args.apertureWidth !== undefined ? { halfWidth: args.apertureWidth } : {}),
    });
  }

  const counts: Record<string, number> = { content: contentHits.length, form: form.length };
  extras.forEach((g, i) => { counts[g.name] = (extraResults[i] ?? []).length; });

  return {
    query: args.query,
    k,
    formWeight,
    apertureGrain: grain ?? null,
    results: fused.slice(0, limit),
    counts,
  };
}
