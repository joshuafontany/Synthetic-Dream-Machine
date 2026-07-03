/**
 * caller-vector-flush — the CALLER-VECTOR capture commit: the flush seam that REPLACES the vendored
 * `mine` (embed-on-write) in the live path. It composes the two proven caps — the embed cap (fan-out
 * text→vector, the model loaded once) and the content palace (single-writer caller-vector `put`) — so
 * the single-writer split is real: EMBED fans out, COMMIT serializes. This is the CaptureFlush the
 * capture-engine's flush seam takes (it replaces makeSubprocessFlush, retiring the vendored mine from
 * the live path); the chain itself (text → embed → put) stands proven standalone.
 *
 * The drawer id (`cid`) is deterministic from (source_file, chunk_index) — the mempalace drawer-id
 * convention `sha256(source_file)_chunk` — so a caller-vector put is idempotent on re-flush AND
 * converges with imported mine-built data.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/nalu
 */

import { defaultCryptoProvider, sha256Hex, utf8Bytes } from "@lararium/mesh";
import type { CaptureFlush, CaptureRecord } from "@lararium/mesh";

import type { EmbedCap } from "./embed-cap.js";
import type { ContentPalace } from "./content-palace.js";
import type { MetaCap } from "./meta-cap.js";

/** The mempalace drawer-id: sha256(source_file)_chunk — deterministic, idempotent, mine-convergent. */
async function drawerCid(record: CaptureRecord): Promise<string> {
  const srcHash = await sha256Hex(utf8Bytes(record.source_file), defaultCryptoProvider);
  return `${srcHash}_${record.chunk_index ?? 0}`;
}

/**
 * Compose a caller-vector CaptureFlush from an embed cap + a content palace (+ an OPTIONAL meta cap).
 * EMBED the whole batch in one call (fan-out, the model amortized), then COMMIT each vector through
 * the single content-palace writer. When `meta` is present, each turn is annotated (entities + hall)
 * and the metadata stamped onto the drawer, so it lands STRUCTURED (unlocking the consumed rich
 * stack); absent, the drawer lands flat (the floor). Returns the count filed. A throw propagates (the
 * nalu's WAL/backoff owns the failure — the turn stays staged, no watermark advance: accept≠land holds).
 */
export function makeCallerVectorFlush(embed: EmbedCap, content: ContentPalace, meta?: MetaCap): CaptureFlush {
  return async (batch: readonly CaptureRecord[]): Promise<number> => {
    if (batch.length === 0) return 0;
    const { vectors } = await embed.embed(batch.map((r) => r.content));
    let filed = 0;
    for (let i = 0; i < batch.length; i++) {
      const r = batch[i]!;
      const vec = vectors[i];
      if (!vec) continue; // embed under-delivered for this row — leave it staged (never fake a land)
      const cid = await drawerCid(r);
      let metadata: Record<string, unknown> = r.metadata ?? {};
      if (meta) {
        const ann = await meta.annotate(r.content); // consume the meta-model → structuring metadata
        metadata = { ...metadata, entities: ann.entities, hall: ann.hall };
      }
      await content.put(cid, r.content, vec, metadata);
      filed++;
    }
    return filed;
  };
}
