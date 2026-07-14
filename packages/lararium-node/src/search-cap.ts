/**
 * search-cap — the node side of the CONSUMED hybrid search. Drives the `search_io.py` holder, which
 * consumes mempalace's `searcher.search_memories` (hybrid BM25 + vector re-rank, metric-normalized,
 * with filter- and crash-fallbacks) over the lararium's OWNED content palace. This is lift-as-consume
 * for recall: the search VALUE-ADD is their code behind the causal-island boundary, so upstream
 * search improvements flow back; the lares surface (`/mcp lares`, the CLI) just calls this.
 *
 * Palace-keyed (composePalace): one search holder per palace dir; the query text is embedded inside
 * search_io (their model), so it needs no lares-side embed for the query.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/nalu
 */

import { resolveSearchSpawn } from "@lararium/mempalace";

import { composePalace, livePalaceHolderCount, makeServeSpawn, type PalaceHolderSpawn } from "./palace-holder.js";

/** the palace label — the transport registry key. */
const LABEL = "search";

/** One hybrid-search hit — the shape search_memories returns per result (flat-palace fields may be null). */
export interface SearchHit {
  readonly text: string;
  readonly similarity?: number;
  readonly distance?: number;
  readonly wing?: string | null;
  readonly room?: string | null;
  readonly source_file?: string | null;
  readonly matched_via?: string;
  readonly [k: string]: unknown;
}

/** The search outcome: the query echoed, the applied filters, and the ranked hits. */
export interface SearchResult {
  readonly query: string;
  readonly results: SearchHit[];
  readonly total_before_filter?: number;
  readonly filters?: Record<string, unknown>;
}

export interface SearchCap {
  /** Hybrid search over the owned content palace: query text → BM25+vector re-ranked hits. */
  /**
   * Recall over this palace.
   *
   * `notRoot` names the caller's OWN worldline root; `selfWeight` ∈ [0,1] scales what its drawers are worth
   * — 1 restores them whole, 0 cuts them out, and between the two they are DISCOUNTED so an older
   * same-session memory can still outrank a weak foreign one.
   *
   * A live session's recent turns are already the caller's context, and the capture engine files them as
   * they happen — so on any question about what was just discussed they outrank every older memory and crowd
   * out the thing actually reached for. But a long session COMPACTS: its early turns leave the window and
   * become genuinely absent, which is exactly what recall exists to fetch. So this DISCOUNTS rather than
   * cuts. The honest axis is distance in the worldline, not session identity — see the sidecar, which names
   * the missing turn-ordinal that blocks it.
   */
  search(query: string, opts?: { k?: number; wing?: string; room?: string; sourceFile?: string; maxDistance?: number; notRoot?: string; selfWeight?: number }): Promise<SearchResult>;
  /** Release this reference; the holder process dies when the last reference closes. */
  close(): Promise<void>;
}

/** Test seam alias: how the holder process is produced (defaults to the python helper). */
export type SearchHolderSpawn = PalaceHolderSpawn;

/** Default holder spawn: the venv-aware python running `search_io.py serve --palace <dir>`. */
const defaultHolderSpawn: PalaceHolderSpawn = makeServeSpawn(resolveSearchSpawn);

export interface SearchCapOptions {
  /** per-call RPC timeout (ms); default 120s — the first search loads the embedding model. */
  readonly timeoutMs?: number;
  /** test seam: override how the holder process is produced. */
  readonly spawn?: SearchHolderSpawn;
}

/** Open the search cap over a content palace dir — the consumed hybrid search, driven over line-RPC. */
export function makeSearchCap(dir: string, opts: SearchCapOptions = {}): SearchCap {
  const p = composePalace(LABEL, dir, opts.spawn ?? defaultHolderSpawn, opts.timeoutMs ?? 120_000);
  return {
    async search(query, opts2 = {}): Promise<SearchResult> {
      const r = (await p.send("search", {
        query, k: opts2.k ?? 8,
        ...(opts2.wing !== undefined ? { wing: opts2.wing } : {}),
        ...(opts2.room !== undefined ? { room: opts2.room } : {}),
        ...(opts2.sourceFile !== undefined ? { source_file: opts2.sourceFile } : {}),
        ...(opts2.notRoot !== undefined ? { not_root: opts2.notRoot } : {}),
        ...(opts2.selfWeight !== undefined ? { self_weight: opts2.selfWeight } : {}),
        ...(opts2.maxDistance !== undefined ? { max_distance: opts2.maxDistance } : {}),
      })) as Partial<SearchResult> | null;
      return { query: r?.query ?? query, results: r?.results ?? [], ...(r?.total_before_filter !== undefined ? { total_before_filter: r.total_before_filter } : {}), ...(r?.filters !== undefined ? { filters: r.filters } : {}) };
    },
    close: p.close,
  };
}

/** Test-only: how many search holder processes are live (proves "one holder per palace, never a pile"). */
export function _liveSearchHolderCount(): number {
  return livePalaceHolderCount(LABEL);
}
