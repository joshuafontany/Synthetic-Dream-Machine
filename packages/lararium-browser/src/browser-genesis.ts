/**
 * browser-genesis — browser genesis byte SOURCE (the OPFS CAS byte plane).
 *
 * The @oracle CRDT itself rides the ONE isomorphic intake (`materializeGenesisIsland`
 * in @lararium/mesh `genesis-intake`): the browser vessel materializes it FRESH from
 * the plain-data seed under the deterministic doc id, or reloads the persisted one by
 * find-first from IndexedDB — node-parity, no island.bin binary import, no merge-into-
 * stale reconcile. This file keeps ONLY the genuinely-
 * browser byte SOURCE: the OPFS content-addressed store (engine + plugin bytes by CID,
 * fetched over HTTP by manifest, read by the worker via resolveByCid).
 *
 * Meme: lar:///ha.ka.ba/lararium/browser/browser-genesis
 */

import {
  cidV1Sha256,
  casBlobEntries, type CasBlobLike,
  type GenesisCasManifest,
} from "@lararium/mesh";

// ── OPFS content-addressed store (CAS) — engine + plugin bytes by CID ──────────
//
// The breath path: heavy immutable engine bytes (TW5 core + plugin tiddlers) live here,
// keyed by sha256 (CID), written once by the vessel on genesis-load and pulled by each
// worker via resolveByCid — NEVER CRDT-synced over the port. OPFS is origin-shared, so a
// worker reads what the main thread wrote. Canon: lararium-identity#the-oracle-plane.

const OPFS_CAS_DIR = "cas";

/** Write each blob entry to the OPFS CAS, keyed by its sha256 (CID). No-ops if OPFS is
 *  unavailable. Returns the count written. */
export async function writeBlobsToCasOpfs(
  blobs: Record<string, CasBlobLike>,
): Promise<number> {
  let written = 0;
  try {
    const root = await navigator.storage.getDirectory();
    const cas  = await root.getDirectoryHandle(OPFS_CAS_DIR, { create: true });
    for (const { cid, bytes } of casBlobEntries(blobs)) {
      const fileH = await cas.getFileHandle(cid, { create: true });
      const w = await (fileH as FileSystemFileHandle & {
        createWritable(): Promise<FileSystemWritableFileStream>;
      }).createWritable();
      await w.write(bytes.slice());
      await w.close();
      written += 1;
    }
    console.log(`[browser-genesis] OPFS CAS: wrote ${written} blob(s) by CID`);
  } catch {
    // OPFS unavailable — the worker falls back to @oracle-doc blobs.
  }
  return written;
}

/**
 * Fetch each CAS blob named by the genesis manifest over HTTP (`baseUrl`/cas/<cid>)
 * and write it to the OPFS CAS — the browser face of the byte SOURCE the genesis CRDT
 * no longer carries (mirrors the node `mirrorGenesisCasFs`). The genesis static host
 * serves genesis/cas/<cid> + island.manifest.json; the worker later resolves each by
 * the SAME cid via readCasBlobFromOpfs. write-if-absent (content-addressed, immutable).
 * Returns the count written. No-ops silently if OPFS is unavailable.
 */
export async function fetchGenesisCasToOpfs(
  manifest: GenesisCasManifest,
  baseUrl:  string,
): Promise<number> {
  let written = 0;
  const base = baseUrl.replace(/\/$/, "");
  try {
    const root = await navigator.storage.getDirectory();
    const cas  = await root.getDirectoryHandle(OPFS_CAS_DIR, { create: true });
    for (const { cid } of manifest.blobs) {
      try { await cas.getFileHandle(cid); continue; } catch { /* absent → fetch below */ }
      const res = await fetch(`${base}/cas/${cid}`);
      if (!res.ok) throw new Error(`[browser-genesis] genesis CAS fetch ${cid} → HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const fileH = await cas.getFileHandle(cid, { create: true });
      const w = await (fileH as FileSystemFileHandle & {
        createWritable(): Promise<FileSystemWritableFileStream>;
      }).createWritable();
      await w.write(bytes.slice());
      await w.close();
      written += 1;
    }
    console.log(`[browser-genesis] OPFS CAS: fetched ${written} blob(s) by CID from ${base}/cas`);
  } catch (err) {
    console.warn(`[browser-genesis] genesis CAS fetch incomplete: ${err instanceof Error ? err.message : String(err)}`);
  }
  return written;
}

/** Read content-addressed bytes by CID from the OPFS CAS. Null if absent/unavailable.
 *  This IS the worker's resolveByCid seam (OPFS origin-shared, no IPC). */
export async function readCasBlobFromOpfs(cid: string): Promise<Uint8Array | null> {
  try {
    const root  = await navigator.storage.getDirectory();
    const cas   = await root.getDirectoryHandle(OPFS_CAS_DIR);
    const fileH = await cas.getFileHandle(cid);
    const file  = await fileH.getFile();
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }
}

// ── CID helper ────────────────────────────────────────────────────────────────

/**
 * Derive a CIDv1 (sha2-256, raw, base32) from bytes — a content-addressed cache key.
 */
export function genesisCidFromBytes(bytes: Uint8Array): string {
  return cidV1Sha256(bytes);
}
