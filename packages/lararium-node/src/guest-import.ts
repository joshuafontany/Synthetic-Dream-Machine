/**
 * guest-import — the deliberate ONE-WAY import Act: copy a source content store (a mine-built
 * `~/.mempalace` sidecar, or any content palace) INTO the lararium's owned content palace,
 * store-compatibly — cid + embedding + document + metadata preserved verbatim, no re-embed, no
 * drift. This is the backfill/adopt leg that lets the sidecar demote to a pure guest an operator
 * imports FROM, never a runtime coupling. Bulk by nature (the slow/neocortical front): a paged scan
 * feeds the single-writer caller-vector `put`.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/nalu
 */

import type { ContentPalace } from "./content-palace.js";

/** The outcome of an import: records copied, records skipped (no vector), and the source total. */
export interface GuestImportResult {
  readonly imported: number;
  readonly skipped: number;
  readonly total: number;
}

/**
 * Copy every record from `source` into `target`, store-compatibly. Pages through `source.scan()`
 * (embeddings ride out) and `target.put()`s each (embeddings ride in) — no re-embed, so the vectors
 * stay byte-identical to whatever built the source (idempotent: content-hash `cid` upserts, so a
 * re-run is a no-op). A record WITHOUT a vector is SKIPPED, never silently re-embedded (that would
 * risk a model mismatch); the skip is counted and surfaced, not hidden.
 */
export async function importGuestPalace(
  source: ContentPalace,
  target: ContentPalace,
  opts: { pageSize?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<GuestImportResult> {
  const pageSize = opts.pageSize ?? 256;
  let offset = 0;
  let imported = 0;
  let skipped = 0;
  let total = 0;
  for (;;) {
    const page = await source.scan({ offset, limit: pageSize });
    total = page.total;
    for (const r of page.records) {
      if (!r.embedding || r.embedding.length === 0) {
        skipped++; // no vector → cannot caller-vector-put; never re-embed silently (model-drift ward)
        continue;
      }
      await target.put(r.cid, r.document, r.embedding, r.metadata);
      imported++;
    }
    opts.onProgress?.(imported + skipped, total);
    if (page.next === null) break;
    offset = page.next;
  }
  return { imported, skipped, total };
}
