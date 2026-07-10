/**
 * text-stream-adapter — the TEXT reference {@link StreamAdapter}, proving the abstraction against the
 * WORKING corpus path (pure, dependency-free).
 *
 * Re-expresses the corpus content-intake AS a stream: `ingest(text) → frames`, one frame per chunk.
 * Each frame carries:
 *   · `content`  = the chunk text            → the content-embed plane (nomic)
 *   · `structure`= the chunk's parse tree    → the structure + form planes (WHEN a `parse` is wired)
 *   · `signal`   = []  (empty by design)     → bands DERIVE the cohesion signal from the content
 *                                              embeddings downstream (corpus.md's wavelet-over-cohesion
 *                                              — a CROSS-chunk property, not producible per chunk)
 *
 * `modality:"text"`, `mode:"batch"` — a finite corpus, all frames at once. This reproduces the
 * corpus-palace's content · structure · bands planes through the new abstraction; the actual sidecars
 * ride the injected {@link PlaneSink} (a batch run delegates to the existing corpus pipeline —
 * stream-palace.ts in @lararium/node).
 *
 * ## Composition-thin
 *
 * The adapter surface is EXACTLY `modality · mode · ingest`. The two genuinely per-modality bits — how
 * to CHUNK text and (optionally) how to PARSE a chunk to a shape tree — ride the CONFIG (injected, as
 * source-adapter injects `hash`), never dead interface methods. Absent a `parse`, frames carry content
 * only and the structure plane derives downstream from the source path (the corpus router is
 * path-based, per-file); an injected `parse` fills `structure` per chunk.
 *
 * Meme: lar:///ha.ka.ba/lares/api/lares/corpus#the-caps
 */

import type { NestedTree, StreamAdapter, StreamFrame } from "./stream-adapter.js";

/** A text source — the raw an adapter run ingests. `text` is mandatory; `path`/`kind` aid the parse. */
export interface TextSource {
  /** The corpus text (already read; the node seam reads a path into this). */
  readonly text: string;
  /** The originating path, when the text came from a file (routes the parse kind by extension). */
  readonly path?: string;
  /** The corpus kind (`javascript`, `markdown`, `memetic-wikitext`, `prose`, …), when known. */
  readonly kind?: string;
}

/** The text adapter's per-modality config — the chunker + optional parse, both injectable. */
export interface TextAdapterConfig {
  /**
   * Split a corpus into chunks (the content grain). Default: blank-line PARAGRAPH split — a stable,
   * dependency-free grain that reproduces the corpus's per-chunk content plane. NOT byte-identical to
   * `mempalace mine`'s chunker (that lives python-side); the node seam delegates a batch run to the
   * real chunker (batch = corpus run) — this default serves the pure/in-memory + live paths.
   */
  readonly chunk?: (text: string) => string[];
  /**
   * Parse one chunk to a content-free shape tree (the structure plane's front door). Injected by the
   * node seam (structure_router). Absent ⇒ frames carry no `structure` and the structure plane derives
   * downstream from the source path. Returns null when the chunk's kind has no parser (graceful).
   */
  readonly parse?: (chunk: string, kind?: string) => NestedTree | null;
}

/** Blank-line paragraph split — trims, drops empties. The default content grain. */
function paragraphChunks(text: string): string[] {
  return text
    .split(/\n[ \t]*\n+/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

/**
 * Build the TEXT reference adapter. `modality:"text"`, `mode:"batch"`. `ingest` chunks the source and
 * emits one frame per chunk (per-stream `seq` = the chunk index — NO global now); `signal` stays empty
 * (bands derive from content); `structure` is filled per chunk WHEN a `parse` is injected.
 */
export function textStreamAdapter(config: TextAdapterConfig = {}): StreamAdapter<TextSource> {
  const chunk = config.chunk ?? paragraphChunks;
  const parse = config.parse;
  return {
    modality: "text",
    mode: "batch",
    ingest(src: TextSource): StreamFrame[] {
      const chunks = chunk(src.text);
      return chunks.map((c, i): StreamFrame => {
        const tree = parse ? parse(c, src.kind) : null;
        return {
          seq: i,
          signal: [], // text's bands signal is DERIVED from the content embeddings, not per-chunk
          content: c,
          ...(tree ? { structure: tree } : {}),
        };
      });
    },
  };
}
