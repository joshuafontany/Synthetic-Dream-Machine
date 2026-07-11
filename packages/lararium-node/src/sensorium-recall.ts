/**
 * sensorium-recall — the RecallClient backed by the SOVEREIGN memory sensorium, not the guest.
 *
 * Recall used to open a pooled `mempalace.mcp_server` sidecar with no `--palace` and read whatever
 * `~/.mempalace/config.json` pointed at. So the capture path wrote `<memory>/content` every turn and
 * NOTHING ever read it: the lararium's own content plane was write-only, and every harness that
 * wanted memory reached past the node to grab the guest palace itself — N sidecars on one Chroma
 * index, the contention that truncated the HNSW segment.
 *
 * This closes that loop. The three read legs now ride the lararium's own caps over its own store:
 *
 *   search      → `search_io.py` (search-cap), which CONSUMES mempalace's `searcher.search_memories`
 *                 (hybrid BM25 + vector re-rank) over OUR content palace. Lift-as-consume: their
 *                 search value-add stays behind the causal-island boundary, so upstream improvements
 *                 flow back, and the returned SearchResult/SearchHit shapes are already byte-identical
 *                 to what the MCP sidecar returned — a drop-in for the verb and the renderer.
 *   getDrawer   → `content_io.py` get(cid)
 *   listDrawers → `content_io.py` scan(offset,limit), wing/room filtered app-layer
 *
 * The guest keeps no seat here. `~/.mempalace` is something an operator raises deliberately
 * (`lares mempalace setup`) and imports FROM (`guest-import.ts`) — never a store the vessel reads
 * through at runtime.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/nalu · lar:///ha.ka.ba/lares/api/pono/lararium-memory
 */

import type { HandleTurn } from "@lararium/mempalace";

import { makeContentPalace, type ContentPalace } from "./content-palace.js";
import { makeSearchCap, type SearchCap } from "./search-cap.js";
import { larContentDir } from "./vessel-paths.js";

/**
 * The read face the recall verb drives (structurally the `RecallClient` of @lararium/tw5's verb-caps
 * — kept duck-typed here so the node package does not depend on the tw5 package for a 3-method shape),
 * plus the worldline leg (`turnsForHandle`) the trajectory-stub source rides.
 */
export interface SensoriumRecallClient {
  getDrawer(drawerId: string): Promise<Record<string, unknown>>;
  search(args: Record<string, unknown>): Promise<Record<string, unknown>>;
  listDrawers(args: Record<string, unknown>): Promise<Record<string, unknown>>;
  turnsForHandle(handle: string, opts?: { wing?: string; pageSize?: number }): Promise<HandleTurn[]>;
  close(): Promise<void>;
}

/** Read a flat metadata scalar as a string, or undefined when absent/non-scalar. */
function metaStr(meta: Record<string, unknown>, key: string): string | undefined {
  const v = meta[key];
  return typeof v === "string" ? v : undefined;
}

/** Coerce a limit-ish arg (number | numeric string | absent) to a positive int, or the fallback. */
function limitOf(args: Record<string, unknown>, fallback: number): number {
  const raw = args["limit"] ?? args["k"];
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export interface SensoriumRecallOptions {
  /** the content palace dir; defaults to the memory sensorium's content plane. */
  readonly contentDir?: string;
  /** test seams: pre-built caps (the live path builds them from `contentDir`). */
  readonly contentPalace?: ContentPalace;
  readonly searchCap?: SearchCap;
}

/**
 * Open the sensorium recall client over the lararium's own content plane. Both caps are
 * palace-keyed and ref-counted (one holder process per dir, reap-don't-pile), so repeated opens
 * share the SAME two python holders — the single-writer discipline the guest never had.
 */
export function makeSensoriumRecallClient(opts: SensoriumRecallOptions = {}): SensoriumRecallClient {
  const dir = opts.contentDir ?? larContentDir();
  const content = opts.contentPalace ?? makeContentPalace(dir);
  const search = opts.searchCap ?? makeSearchCap(dir);

  return {
    /** The consumed hybrid search — its result shape already matches the old sidecar's, verbatim. */
    async search(args) {
      const query = typeof args["query"] === "string" ? args["query"] : "";
      const wing = typeof args["wing"] === "string" ? args["wing"] : undefined;
      const room = typeof args["room"] === "string" ? args["room"] : undefined;
      const maxDistance = typeof args["maxDistance"] === "number" ? args["maxDistance"] : undefined;
      const r = await search.search(query, {
        k: limitOf(args, 5),
        ...(wing !== undefined ? { wing } : {}),
        ...(room !== undefined ? { room } : {}),
        ...(maxDistance !== undefined ? { maxDistance } : {}),
      });
      return r as unknown as Record<string, unknown>;
    },

    /** cid → the verbatim drawer. `content_io` speaks {cid,document,metadata}; recall speaks
     *  {drawer_id,content,metadata}. The rename is the whole adaptation. */
    async getDrawer(drawerId) {
      const e = await content.get(drawerId);
      if (!e) return { drawer_id: drawerId, content: "", metadata: {}, found: false };
      return { drawer_id: e.cid, content: e.document, metadata: e.metadata, found: true };
    },

    /**
     * Page the plane. `content_io.scan` has no wing/room predicate, so the filter runs APP-LAYER over
     * the page — which means a wing-scoped `total` would be a lie if we reported the store total.
     * We report what we can defend: `total` = the store total (what was scanned over), `count` = the
     * drawers actually returned. A filtered page never claims to have counted the whole wing.
     */
    async listDrawers(args) {
      const wing = typeof args["wing"] === "string" ? args["wing"] : undefined;
      const room = typeof args["room"] === "string" ? args["room"] : undefined;
      const limit = limitOf(args, 20);
      const offsetRaw = args["offset"];
      const offset = typeof offsetRaw === "number" ? offsetRaw : 0;

      const page = await content.scan({ offset, limit });
      const drawers = page.records
        .filter((r) => (wing === undefined || metaStr(r.metadata, "wing") === wing)
                    && (room === undefined || metaStr(r.metadata, "room") === room))
        .map((r) => ({
          drawer_id: r.cid,
          content: r.document,
          metadata: r.metadata,
          ...(metaStr(r.metadata, "wing") !== undefined ? { wing: metaStr(r.metadata, "wing") } : {}),
          ...(metaStr(r.metadata, "room") !== undefined ? { room: metaStr(r.metadata, "room") } : {}),
        }));

      return { drawers, total: page.total, count: drawers.length, offset, limit };
    },

    /**
     * The worldline leg (SEAM A): a handle's turns — the drawers WHERE `lar_agent_handle = handle`,
     * each carrying its EXACT capture `lar_verbatim_sha` (the content↔form join key, never a
     * transcript-text re-hash) plus the order keys. Pages the plane and filters app-layer, exactly as
     * the guest client did over the MCP `list_drawers` — the predicate never existed store-side.
     * A drawer with no join key is DROPPED (nothing the form graph could fuse on), never faked.
     */
    async turnsForHandle(handle, opts2 = {}) {
      const pageSize = opts2.pageSize ?? 200;
      const turns: HandleTurn[] = [];
      for (let offset = 0; ; offset += pageSize) {
        const page = await content.scan({ offset, limit: pageSize });
        for (const r of page.records) {
          const meta = r.metadata;
          if (meta["lar_agent_handle"] !== handle) continue;
          if (opts2.wing !== undefined && metaStr(meta, "wing") !== opts2.wing) continue;
          const verbatimSha = metaStr(meta, "lar_verbatim_sha");
          if (!verbatimSha) continue; // no join key → nothing the form graph fuses on
          turns.push({
            drawerId: r.cid,
            verbatimSha,
            ...(typeof meta["lar_ffz"] === "string" ? { ffz: meta["lar_ffz"] } : {}),
            ...(typeof meta["chunk_index"] === "number" ? { chunkIndex: meta["chunk_index"] } : {}),
            ...(typeof meta["filed_at"] === "string" ? { filedAt: meta["filed_at"] } : {}),
            ...(typeof meta["source_file"] === "string" ? { sourceFile: meta["source_file"] } : {}),
          });
        }
        if (page.next === null || page.records.length === 0) break;
      }
      return turns;
    },

    async close() {
      await Promise.all([content.close(), search.close()]);
    },
  };
}
