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

// ── Genesis CAS manifest (the byte SOURCE the genesis doc no longer carries) ──
//
// The genesis CRDT (island.bin) holds blob METADATA only; the engine + plugin
// bytes ship as content-addressed `genesis/cas/<cid>` files. This manifest names
// which files belong to a genesis artifact so the loader (node fs · browser OPFS)
// mirrors exactly them into the runtime CAS the workers read via resolveByCid. The
// `cid` field IS the sha256 hex = the CAS filename = the key the worker requests.

export const GENESIS_CAS_MANIFEST_FORMAT = "lararium-genesis-cas/v1" as const;

/** One CAS-resident genesis blob — metadata mirror of a LarBlobEntry, no bytes. */
export interface GenesisCasManifestEntry {
  /** sha256 hex — the CAS filename AND the key the worker requests. */
  readonly cid:      string;
  /** Blob id (e.g. "tiddlywikicore" or the plugin URI). */
  readonly id:       string;
  readonly mimeType: string;
  readonly version:  string;
}

/** The genesis CAS manifest — engine + plugins region CIDs plus every blob's cid. */
export interface GenesisCasManifest {
  readonly format:     typeof GENESIS_CAS_MANIFEST_FORMAT;
  /** engine region content-CID (the hearth true-name; slow ratchet). */
  readonly engineCid:  string;
  /** plugins region content-CID (fast ratchet). */
  readonly pluginsCid: string;
  /** Every CAS blob this genesis artifact ships, sorted by id (deterministic). */
  readonly blobs:      readonly GenesisCasManifestEntry[];
}

/**
 * Build a deterministic genesis CAS manifest from blob metadata + the two region
 * CIDs. Sorted by id so write-order never perturbs the serialized bytes — the
 * manifest JSON is byte-stable across re-bakes (mirrors island.bin determinism).
 */
export function buildGenesisCasManifest(
  engineCid:  string,
  pluginsCid: string,
  blobs:      readonly { readonly id: string; readonly sha256: string; readonly mimeType: string; readonly version: string }[],
): GenesisCasManifest {
  const entries = blobs
    .map((b) => ({ cid: b.sha256, id: b.id, mimeType: b.mimeType, version: b.version }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { format: GENESIS_CAS_MANIFEST_FORMAT, engineCid, pluginsCid, blobs: entries };
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
