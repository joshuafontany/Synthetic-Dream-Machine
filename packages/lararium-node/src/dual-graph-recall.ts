/**
 * dual-graph-recall — P4 of the living-grammar palace: the RRF dual-graph query that FUSES the
 * CONTENT graph (the verbatim mempalace — dense embeddings, the drawers) with the FORM graph (the
 * `.formpalace` "form" collection — sparse fuzzy-constructicon vectors, the moves), joined on the
 * shared `verbatim_sha` and fused by Reciprocal Rank Fusion (k=60).
 *
 * The two graphs stay ORTHOGONAL (one asks *what was said*, the other *how the grammar moved`); they
 * rejoin ONLY here, in app code, on one key — "fusion IS the hash-join" (living-grammar-palace
 * #dual-graph). A drawer that ranks in BOTH lists accrues both RRF contributions, so it naturally
 * outranks a drawer present in a single list at comparable rank.
 *
 * The fold is split in two:
 *   - {@link fuseDualGraph} — the PURE rank-fusion + verbatim_sha join (no I/O; the testable core).
 *   - {@link dualGraphRecall} — the orchestrator: run both searches (injected), then fuse. The
 *     APERTURE knobs ride here: `formWeight` tilts form-vs-content, and `register` / `grammarLayer`
 *     scope the FORM leg by metadata where-filter (the multi-aperture idea, kept simple).
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

export interface DualGraphOptions {
  /** RRF damping constant; default {@link DEFAULT_RRF_K} (60). */
  readonly k?: number;
  /** weight on the FORM list's RRF contribution (the aperture tilt); default 1. */
  readonly formWeight?: number;
  /** weight on the CONTENT list's RRF contribution; default 1. */
  readonly contentWeight?: number;
}

/** One fused row of the dual-graph ranking — both the content and form sides it joined, with the
 *  per-graph RRF contributions and the fused total. `content`/`form` is null where the drawer rode
 *  in only one graph (a content-only or form-only drawer — handled gracefully). */
export interface DualGraphHit {
  /** the join key — the verbatim sha256 when known on either side, else "" (a content-only hit
   *  that never carried a `lar_verbatim_sha` to join on). */
  readonly verbatimSha: string;
  /** the fused RRF score = contentScore + formScore (higher ranks first). */
  readonly fusedScore: number;
  /** the content graph's RRF contribution (0 when absent from the content list). */
  readonly contentScore: number;
  /** the form graph's RRF contribution (0 when absent from the form list). */
  readonly formScore: number;
  /** true when the drawer ranked in BOTH graphs (the cross-confirmed move). */
  readonly inBoth: boolean;
  /** 1-based rank in the content list, or null if absent. */
  readonly contentRank: number | null;
  /** 1-based rank in the form list, or null if absent. */
  readonly formRank: number | null;
  /** the verbatim content hit (the words), or null for a form-only drawer. */
  readonly content: SearchHit | null;
  /** the form-similarity match (the moves), or null for a content-only drawer. */
  readonly form: FormMatch | null;
}

/** Mutable accumulator while folding the two lists; frozen into {@link DualGraphHit} on emit. */
interface Row {
  verbatimSha: string;
  contentScore: number;
  formScore: number;
  contentRank: number | null;
  formRank: number | null;
  content: SearchHit | null;
  form: FormMatch | null;
}

/** The join key for a content hit: its `lar_verbatim_sha` (the cross-graph key the routing split
 *  stamped, node-capture-engine#makeFormSplitFlush) when present; otherwise a synthetic
 *  content-only key that NEVER collides with a real 64-hex sha, so a content drawer with no form
 *  partner still rides the fusion as its own row. */
function contentKeyOf(hit: SearchHit, index: number): { key: string; sha: string } {
  const raw = hit["lar_verbatim_sha"];
  if (typeof raw === "string" && raw) return { key: raw, sha: raw };
  const src =
    (typeof hit.source_path === "string" && hit.source_path) ||
    (typeof hit.source_file === "string" && hit.source_file) ||
    "?";
  return { key: `content-only:${index}:${src}`, sha: "" };
}

function newRow(verbatimSha: string): Row {
  return {
    verbatimSha,
    contentScore: 0,
    formScore: 0,
    contentRank: null,
    formRank: null,
    content: null,
    form: null,
  };
}

/**
 * PURE Reciprocal Rank Fusion + verbatim_sha join. Given the two already-ranked lists (content hits
 * in rank order, form matches in rank order), fold them into one fused ranking:
 *
 *   score(d) = Σ_i  weight_i / (k + rank_i(d))      over the lists d appears in   (rank 1-based)
 *
 * The verbatim_sha keys the two sides together: a content hit's `lar_verbatim_sha` == a form match's
 * `key`. A drawer present in BOTH lists sums both contributions → it outranks a same-rank
 * single-list drawer. Returns rows sorted by fused score descending (ties broken by the best single
 * rank, then by sha for determinism).
 */
export function fuseDualGraph(
  contentHits: readonly SearchHit[],
  formMatches: readonly FormMatch[],
  opts: DualGraphOptions = {},
): DualGraphHit[] {
  const k = opts.k ?? DEFAULT_RRF_K;
  const formWeight = opts.formWeight ?? 1;
  const contentWeight = opts.contentWeight ?? 1;

  const rows = new Map<string, Row>();

  contentHits.forEach((hit, i) => {
    const rank = i + 1;
    const { key, sha } = contentKeyOf(hit, i);
    const row = rows.get(key) ?? newRow(sha);
    row.content = hit;
    row.contentRank = rank;
    row.contentScore = contentWeight / (k + rank);
    rows.set(key, row);
  });

  formMatches.forEach((m, i) => {
    const rank = i + 1;
    const key = m.key;
    const row = rows.get(key) ?? newRow(key);
    row.form = m;
    row.formRank = rank;
    row.formScore = formWeight / (k + rank);
    rows.set(key, row);
  });

  const out: DualGraphHit[] = [];
  for (const row of rows.values()) {
    out.push({
      verbatimSha: row.verbatimSha,
      fusedScore: row.contentScore + row.formScore,
      contentScore: row.contentScore,
      formScore: row.formScore,
      inBoth: row.content !== null && row.form !== null,
      contentRank: row.contentRank,
      formRank: row.formRank,
      content: row.content,
      form: row.form,
    });
  }

  out.sort((a, b) => {
    if (b.fusedScore !== a.fusedScore) return b.fusedScore - a.fusedScore;
    const ar = Math.min(a.contentRank ?? Infinity, a.formRank ?? Infinity);
    const br = Math.min(b.contentRank ?? Infinity, b.formRank ?? Infinity);
    if (ar !== br) return ar - br;
    return a.verbatimSha < b.verbatimSha ? -1 : a.verbatimSha > b.verbatimSha ? 1 : 0;
  });
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
   * OPTIONAL markers path: derive a query move-skeleton + basis to vectorize a sigil-bearing query.
   * Absent (or returns null) → a markers query DEGRADES to the keyword branch (no skeleton can be
   * vectorized on this leg). The @daemon leaves this unwired for now (deriving a skeleton needs the
   * harvest pipeline / a VM round-trip — see the seam note); tests inject a fake.
   */
  readonly deriveSkeleton?: (query: string) => { skeleton: MoveSkeleton; basis: SerializedBasis } | null;
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
 *     DEFER the form leg (return [] → dualGraphRecall fuses content-only, gracefully).
 *
 * The `where` the leg receives carries dualGraphRecall's aperture scope (register/grammar-layer);
 * the bearing branch ANDs its own root clause onto it ({@link combineWhere}). Returns the leg
 * dualGraphRecall calls — `(input: { nResults, where? }) => Promise<FormMatch[]>`.
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

    // 2. MARKERS — a derivable skeleton → form-vector similarity (the existing query path).
    if (hasMarkers && cfg.deriveSkeleton) {
      const derived = cfg.deriveSkeleton(cfg.query);
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

/** The injected search legs — the two graphs, each reached however the caller wires it (the real
 *  daemon: the mempalace read-client + the form palace; tests: fakes — no python, no chroma). */
export interface DualGraphRecallDeps {
  /** the CONTENT graph: a semantic search of the verbatim mempalace (mempalace-client#search). */
  readonly contentSearch: (args: SearchArgs) => Promise<SearchResult>;
  /** the FORM graph: a form-similarity search of the "form" collection, optionally where-scoped. */
  readonly formSearch: (input: { nResults: number; where?: Record<string, unknown> }) => Promise<FormMatch[]>;
}

export interface DualGraphRecallArgs {
  /** the recall query (keywords / a question) — embedded by the content sidecar. */
  readonly query: string;
  /** content-graph wing scope (mempalace wing). */
  readonly wing?: string;
  /** results per leg AND the final fused cap; default 10. */
  readonly limit?: number;
  /** the aperture tilt: weight form-vs-content in the fusion; default 1 (balanced). */
  readonly formWeight?: number;
  /** form-graph aperture: scope to a confidence register (the where-filter). */
  readonly register?: string;
  /** form-graph aperture: scope to a grammar-stack layer (html|wikitext|x-memetic). */
  readonly grammarLayer?: string;
  /** RRF damping constant; default {@link DEFAULT_RRF_K}. */
  readonly k?: number;
}

export interface DualGraphRecallResult {
  readonly query: string;
  readonly k: number;
  readonly formWeight: number;
  /** the fused content×form ranking, verbatim_sha-joined, capped to `limit`. */
  readonly results: DualGraphHit[];
  /** how many content hits the content graph returned (pre-fusion). */
  readonly contentCount: number;
  /** how many form matches the form graph returned (pre-fusion). */
  readonly formCount: number;
}

/**
 * Orchestrate one dual-graph recall: search BOTH graphs in parallel, then RRF-fuse them on the
 * verbatim_sha. The aperture knobs (`formWeight`, `register`, `grammarLayer`) ride here — the first
 * tilts the fusion, the latter two scope the FORM leg. Ready to wire into the @daemon `recall` verb
 * (open-node-vessel) as a third recall mode beside `search` / `list` / `drawer`.
 */
export async function dualGraphRecall(
  deps: DualGraphRecallDeps,
  args: DualGraphRecallArgs,
): Promise<DualGraphRecallResult> {
  const limit = args.limit ?? 10;
  const k = args.k ?? DEFAULT_RRF_K;
  const formWeight = args.formWeight ?? 1;
  const where = buildFormWhere(args.register, args.grammarLayer);

  const [content, form] = await Promise.all([
    deps.contentSearch({
      query: args.query,
      ...(args.wing !== undefined ? { wing: args.wing } : {}),
      limit,
    }),
    deps.formSearch({ nResults: limit, ...(where !== undefined ? { where } : {}) }),
  ]);

  const contentHits = content.results ?? [];
  const fused = fuseDualGraph(contentHits, form, { k, formWeight });

  return {
    query: args.query,
    k,
    formWeight,
    results: fused.slice(0, limit),
    contentCount: contentHits.length,
    formCount: form.length,
  };
}
