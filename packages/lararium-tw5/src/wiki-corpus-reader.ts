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
 * Meme: lar:///ha.ka.ba/lares/api/lares/wiki-sensorium-cap
 */

import type { CompositeStore, CompositeEntry } from "@lararium/mesh";
import { deriveDocStalk, senseBodyOf, type DocStalk, type WikiSenseDoc } from "./wiki-sense-fold.js";

/** The seam ONE perceiver hull consumes — whole-record docs + a change pulse. Read-only. */
export interface WikiCorpusReader {
  /** the corpus as sensed entities — WHOLE open records, causal-stamped where the face carries stamps. */
  docs(): Promise<readonly WikiSenseDoc[]>;
  /** change subscription — fires when the corpus moves; returns the unsubscribe. */
  subscribe(listener: () => void): () => void;
  /** OPTIONAL per-title stalk supplier — a reader with its own cache law fills foldCorpus's stalkOf
   *  seam (the composite face memos per changeId; the VM face rides getCacheForTiddler instead). */
  stalkOf?: (doc: WikiSenseDoc) => DocStalk;
}

/** Lift ONE composite entry onto the sensed-entity shape — the WHOLE record, pass-through. The one
 *  mapper every composite face rides (the reader here; the snapshot adapter imports it too). */
export function senseDocOfEntry(e: CompositeEntry): WikiSenseDoc {
  return {
    title: e.title,
    // the WHOLE record, pass-through — the store's tiddler object carries every field it holds.
    fields: e.record.tiddler as Readonly<Record<string, unknown>>,
    heads: e.heads,
    bagId: e.bagId,
    changeId: e.changeId,
  };
}

/** Stand the seam over one VM-less wiki island's composite — resolved, kāpae-honored, causal-stamped.
 *  Carries a PER-TITLE stalk memo keyed on the entry's changeId (the causal stamp): a refold after
 *  one write re-derives ONE stalk, not the whole corpus — the composite face's warm-refold cure
 *  (the VM face already rides TW5's getCacheForTiddler for the same law). */
export function compositeCorpusReader(store: CompositeStore): WikiCorpusReader {
  const memo = new Map<string, { changeId: string; stalk: DocStalk }>();
  return {
    async docs(): Promise<readonly WikiSenseDoc[]> {
      const entries = await store.entries();
      const docs = entries.map(senseDocOfEntry);
      // move-not-leak: memo entries for titles absent from the read die with it.
      const live = new Set(docs.map((d) => d.title));
      for (const title of memo.keys()) if (!live.has(title)) memo.delete(title);
      return docs;
    },
    subscribe: (listener) => store.subscribe(listener),
    stalkOf: (doc) => {
      const changeId = doc.changeId ?? null;
      if (changeId !== null) {
        const hit = memo.get(doc.title);
        if (hit && hit.changeId === changeId) return hit.stalk;
      }
      const stalk = deriveDocStalk(senseBodyOf(doc.fields));
      if (changeId !== null) memo.set(doc.title, { changeId, stalk });
      return stalk;
    },
  };
}
