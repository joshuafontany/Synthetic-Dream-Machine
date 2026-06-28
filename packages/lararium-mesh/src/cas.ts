/**
 * cas — platform-blind content-addressed-store helpers (the breath path).
 *
 * Heavy immutable engine bytes (the TW5 core + the plugin tiddlers) ride a local
 * content-addressed store, keyed by sha256 hex (the CID), written once by the
 * vessel on genesis-load and pulled by each island worker via `resolveByCid` —
 * NEVER CRDT-synced over the sync port. Every vessel — Herm, Lararium, browser —
 * composes the SAME two derivations here over its own platform I/O (OPFS · nodefs):
 * vessels-as-nameless-entities-with-#has-caps align isomorphically by composition,
 * never by a platform interface.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/cas
 */

import { ENGINE_CORE_ID } from "./base-doc.js";

/** A blob entry shape the CAS reads — id + sha256 (the CID) + the raw bytes. */
export interface CasBlobLike {
  readonly id?:       string;
  readonly sha256?:   string;
  readonly mimeType?: string;
  readonly blob?:     unknown;
}

/**
 * The engine's plugin-tiddler CIDs from an island doc's blobs — every non-engine
 * JSON blob, by sha256. The daemon AND every wiki island resolve these by CID from
 * the local CAS (the breath path), never CRDT-syncing the bytes. One derivation,
 * fed to every island of the runtime.
 */
export function pluginCidsFromIslandBlobs(
  blobs: Record<string, CasBlobLike> | undefined,
): readonly string[] {
  return Object.values(blobs ?? {})
    .filter((b) => b.id !== ENGINE_CORE_ID && b.mimeType === "application/json" && typeof b.sha256 === "string")
    .map((b) => b.sha256 as string);
}

/**
 * Yield every writable {cid, bytes} pair from an island doc's blobs — the engine
 * core AND the plugin tiddlers, each keyed by its sha256 (the CID). Platform write
 * loops (OPFS · nodefs) consume this one iteration; the worker reads back by the
 * same key, so the CID it requests IS the hash it re-verifies.
 */
export function* casBlobEntries(
  blobs: Record<string, CasBlobLike> | undefined,
): Iterable<{ cid: string; bytes: Uint8Array }> {
  for (const e of Object.values(blobs ?? {})) {
    if (!e.sha256 || !e.blob) continue;
    const bytes = e.blob instanceof Uint8Array ? e.blob : new Uint8Array(e.blob as ArrayBufferLike);
    yield { cid: e.sha256, bytes };
  }
}
