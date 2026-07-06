/**
 * wiki-corpus-reader — the corpus-reader SEAM the perceiver hull consumes. Each reader yields the
 * WHOLE tiddler as an open field record ({@link WikiSenseDoc} — operator law: title = pet-name key
 * only, `text` = one field among many, unknown fields flow untouched) plus a change subscription.
 *
 * PONO-HOME LAW (operator): a wiki that RUNS as a TW5 VM senses itself IN-VM — the WikiSenseIndexer
 * + `wikisense` filter operator shipped in the plugin blob carry that beat; no host-side reader
 * doubles it. THIS seam serves the wikis that hold NO VM: {@link compositeCorpusReader} stands the
 * hull over a composite-store island (resolved, kāpae-honored, causal-stamped — heads/changeId/bagId
 * ride through as provenance).
 *
 * Meme: lar:///ha.ka.ba/@lares/api/lares/wiki-sensorium-cap
 */

import type { CompositeStore } from "@lararium/mesh";
import type { WikiSenseDoc } from "./wiki-sense-fold.js";

/** The seam ONE perceiver hull consumes — whole-record docs + a change pulse. Read-only. */
export interface WikiCorpusReader {
  /** the corpus as sensed entities — WHOLE open records, causal-stamped where the face carries stamps. */
  docs(): Promise<readonly WikiSenseDoc[]>;
  /** change subscription — fires when the corpus moves; returns the unsubscribe. */
  subscribe(listener: () => void): () => void;
}

/** Stand the seam over one VM-less wiki island's composite — resolved, kāpae-honored, causal-stamped. */
export function compositeCorpusReader(store: CompositeStore): WikiCorpusReader {
  return {
    async docs(): Promise<readonly WikiSenseDoc[]> {
      const entries = await store.entries();
      return entries.map((e) => ({
        title: e.title,
        // the WHOLE record, pass-through — the store's tiddler object carries every field it holds.
        fields: e.record.tiddler as Readonly<Record<string, unknown>>,
        heads: e.heads,
        bagId: e.bagId,
        changeId: e.changeId,
      }));
    },
    subscribe: (listener) => store.subscribe(listener),
  };
}
