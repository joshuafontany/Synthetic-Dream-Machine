/**
 * content-palace — the Li-triple's CONTENT plane for NON-MEMORY targeted content: a caller-vector
 * store over arbitrary target corpora (Twain · TiddlyWiki5 · the Kumulipo · Discordian Catma · any
 * ingest target) that are NOT the operator's session-memory (the mempalace stays the private
 * interoception content). Each target gets its own content palace dir.
 *
 * THE CAP-STACK: content-palace = the SHARED transport cap ({@link composePalace}, palace-holder.ts)
 * composed with its OWN thin op-surface — `put`/`get`/`search` over the python `content_io.py serve`
 * holder. Caller-vector (the embedding arrives on the wire, no model load) — uniform with structure/
 * form/persistence AND split-ready: the parallel-ingest embeds upstream, this commits the vector.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/nalu (the content plane)
 */

import { resolveContentPalaceSpawn } from "@lararium/mempalace";

import { composePalace, livePalaceHolderCount, makeServeSpawn, type PalaceHolderSpawn } from "./palace-holder.js";

/** the palace label — the transport registry key. */
const LABEL = "content";

/** A stored content record read back by cid: the text (document) + its where-filterable metadata. */
export interface ContentEntry {
  readonly cid: string;
  readonly document: string;
  readonly metadata: Record<string, unknown>;
}

/** One content-similarity match. */
export interface ContentMatch {
  readonly cid: string;
  readonly distance: number | null;
  readonly metadata: Record<string, unknown>;
}

export interface ContentPalace {
  /**
   * Store one content record: `cid` (a content-hash or stable target id), the `text` (rides the
   * document slot), the caller-supplied `embedding`, and where-filterable `metadata`. Idempotent on
   * cid (a re-put overwrites). THROWS if the holder did not persist.
   */
  put(cid: string, text: string, embedding: readonly number[], metadata?: Record<string, unknown>): Promise<{ cid: string }>;
  /** Read a content record back by cid, or null if absent. */
  get(cid: string): Promise<ContentEntry | null>;
  /** Nearest content by vector similarity, optional where-filter. */
  search(embedding: readonly number[], opts?: { k?: number; where?: Record<string, unknown> }): Promise<ContentMatch[]>;
  /** Release this reference; the holder process dies when the last reference closes. */
  close(): Promise<void>;
}

/** Test seam alias: how the holder process is produced (defaults to the python helper). */
export type ContentHolderSpawn = PalaceHolderSpawn;

/** Default holder spawn: the venv-aware python running `content_io.py serve --palace <dir>`. */
const defaultHolderSpawn: PalaceHolderSpawn = makeServeSpawn(resolveContentPalaceSpawn);

export interface ContentPalaceOptions {
  /** per-call RPC timeout (ms); default 30s (covers the one-time chroma open on first call). */
  readonly timeoutMs?: number;
  /** test seam: override how the holder process is produced (defaults to the python helper). */
  readonly spawn?: ContentHolderSpawn;
}

/**
 * Open a CONTENT store rooted at `dir` (a per-target palace dir). Composes the shared transport cap
 * with the content op-surface; `close()` releases this reference.
 */
export function makeContentPalace(dir: string, opts: ContentPalaceOptions = {}): ContentPalace {
  const p = composePalace(LABEL, dir, opts.spawn ?? defaultHolderSpawn, opts.timeoutMs ?? 30_000);

  return {
    async put(cid, text, embedding, metadata = {}): Promise<{ cid: string }> {
      await p.send("put", { cid, text, embedding, metadata });
      return { cid };
    },

    async get(cid: string): Promise<ContentEntry | null> {
      return (await p.send("get", { cid })) as ContentEntry | null;
    },

    async search(embedding, opts2 = {}): Promise<ContentMatch[]> {
      const res = (await p.send("search", {
        embedding, k: opts2.k ?? 8,
        ...(opts2.where !== undefined ? { where: opts2.where } : {}),
      })) as { matches: ContentMatch[] };
      return res.matches ?? [];
    },

    close: p.close,
  };
}

/** Test-only: how many holder processes are live (proves "one holder per palace, never a pile"). */
export function _liveContentHolderCount(): number {
  return livePalaceHolderCount(LABEL);
}
