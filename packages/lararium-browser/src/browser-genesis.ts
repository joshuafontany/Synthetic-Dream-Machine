/**
 * browser-genesis — browser genesis byte SOURCES + IDB/OPFS persistence.
 *
 * The intake core (validate → import → verify, CID reconcile) lives ONCE in
 * @lararium/mesh `genesis-intake` (isomorphism sweep 2026-06-12). This file
 * keeps the genuinely-browser pieces: three delivery paths (bundled
 * Uint8Array, content-addressed IDB cache, peer-sync via repo.find) plus
 * OPFS read/write. All paths produce the same DocHandle<LarDoc>.
 *
 * Content-addressed IDB cache pattern:
 *   On first boot, caller provides genesisBytes (from bundle or CID fetch).
 *   After import, the doc's Automerge URL is the stable key. Subsequent boots
 *   call repo.find(storedUrl) — hits IndexedDB directly, no bytes needed.
 *
 * TW5 engine update signaling:
 *   reconcileGenesisUpdate() compares the live island doc's genesis-cid tiddler
 *   against the incoming bytes' CID. When they diverge (new TW5 release or new
 *   sigil tiddlers), it merges the update and returns { updated: true } so the
 *   caller can surface a "reload to pick up engine changes" alert to the operator.
 *   The recommended surface: a TW5 alert tiddler written to the daemon doc, tagged
 *   lar:///ha.ka.ba/tags/engine-update, with a "Reload to pick up TW5 changes"
 *   message. The browser vessel writes it; TW5 renders it natively.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-genesis
 */

import type { Repo, DocHandle, AutomergeUrl } from "@automerge/automerge-repo";
import {
  ENGINE_CORE_ID,
  cidV1Sha256,
  importGenesisIsland,
  reconcileGenesisCid,
  type GenesisReconcileResult,
  type LarDoc,
} from "@lararium/mesh";


// ── Three-tier genesis persistence model ─────────────────────────────────────
//
// Tier 1 — network → IDB (Automerge doc via repo.find or repo.import):
//   First boot: caller provides bytes (bundle or CID fetch). loadGenesisIslandFromBytes
//   imports into Repo; IndexedDBStorageAdapter writes to IDB. Store handle.url in IDB
//   keystore ("island-doc-url") as the stable rendezvous key.
//
// Tier 2 — IDB → in-memory (fast path, offline-capable):
//   Subsequent boots: repo.find(storedUrl) resolves from IndexedDB in < 1 frame.
//   findGenesisIsland() implements this path. No bytes needed.
//
// Tier 3 — OPFS (Origin Private File System, Worker direct read):
//   The genesis binary lives at OPFS root as "island.bin". A Worker reads it
//   directly via OPFS File API — same speed as NodeFS, no IPC overhead.
//   writeGenesisBytesToOpfs() / readGenesisBytesFromOpfs() implement this path.
//   Use after first successful import: write once, read many.
//
// ── OPFS helpers ─────────────────────────────────────────────────────────────

const OPFS_GENESIS_FILENAME = "island.bin";

/**
 * Write genesis bytes to OPFS for direct Worker access.
 * No-ops silently if OPFS is unavailable (pre-Safari-15.2 or non-secure context).
 */
export async function writeGenesisBytesToOpfs(bytes: Uint8Array): Promise<void> {
  try {
    const root     = await navigator.storage.getDirectory();
    const fileH    = await root.getFileHandle(OPFS_GENESIS_FILENAME, { create: true });
    const writable = await (fileH as FileSystemFileHandle & {
      createWritable(): Promise<FileSystemWritableFileStream>;
    }).createWritable();
    await writable.write(bytes.slice());
    await writable.close();
    console.log(`[browser-genesis] OPFS: wrote ${bytes.length} bytes → ${OPFS_GENESIS_FILENAME}`);
  } catch {
    // OPFS not available — IDB path remains authoritative.
  }
}

/**
 * Read genesis bytes from OPFS. Returns null if absent or OPFS unavailable.
 * Workers call this directly via the File System Access API — no IPC needed.
 */
export async function readGenesisBytesFromOpfs(): Promise<Uint8Array | null> {
  try {
    const root  = await navigator.storage.getDirectory();
    const fileH = await root.getFileHandle(OPFS_GENESIS_FILENAME);
    const file  = await fileH.getFile();
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }
}

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
  blobs: Record<string, { sha256?: string; blob?: unknown }>,
): Promise<number> {
  let written = 0;
  try {
    const root = await navigator.storage.getDirectory();
    const cas  = await root.getDirectoryHandle(OPFS_CAS_DIR, { create: true });
    for (const entry of Object.values(blobs)) {
      if (!entry.sha256 || !entry.blob) continue;
      const bytes = new Uint8Array(entry.blob as ArrayBufferLike);
      const fileH = await cas.getFileHandle(entry.sha256, { create: true });
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

// ── Tier 2: findGenesisIsland ─────────────────────────────────────────────────

/**
 * Fast-path genesis island load from IDB. Calls repo.find(storedUrl) which
 * hits IndexedDBStorageAdapter synchronously after the first boot.
 * Returns null if the stored URL is absent or the doc is unavailable.
 */
export async function findGenesisIsland(
  repo:       Repo,
  storedUrl:  string,
): Promise<DocHandle<LarDoc> | null> {
  try {
    // automerge-repo 2.6: find() rejects on unavailable → caught below.
    const handle = await repo.find<LarDoc>(storedUrl as AutomergeUrl);
    const doc = handle.doc();
    if (!doc?.blobs?.[ENGINE_CORE_ID]) return null;
    return handle;
  } catch {
    return null;
  }
}

// ── CID helpers ───────────────────────────────────────────────────────────────

/**
 * Derive a CIDv1 (sha2-256, raw, base32) from genesis bytes.
 * Used as a content-addressed cache key and update-detection token.
 */
export function genesisCidFromBytes(bytes: Uint8Array): string {
  return cidV1Sha256(bytes);
}

// ── loadGenesisIslandFromBytes ────────────────────────────────────────────────

/**
 * Import genesis bytes into a Repo. Returns a live DocHandle<LarDoc>.
 *
 * Validates ENGINE_CORE_ID blob presence before committing the import —
 * mirrors the smoke-check in genesis-artifact.ts (Node) so both paths
 * surface the same error on a corrupt artifact.
 *
 * @throws if bytes fail Automerge.load() or the TW5 core blob is absent.
 */
export async function loadGenesisIslandFromBytes(
  repo:  Repo,
  bytes: Uint8Array,
): Promise<DocHandle<LarDoc>> {
  // Browser byte source (bundle / CID fetch); intake rides the one core.
  return importGenesisIsland(repo, bytes, "browser-genesis");
}

// ── reconcileGenesisUpdate ────────────────────────────────────────────────────

/**
 * Compare the incoming genesis doc's region CIDs against the live island doc's
 * recorded ones; the compare, merge, and cid-record write ride the one core
 * (genesis-intake), which reads both region witness tiddlers straight from the
 * incoming handle — no bytes/CID need pass in.
 *
 * Caller responsibility: when updated === true, write a TW5 alert tiddler to
 * the daemon doc (tagged lar:///ha.ka.ba/tags/engine-update) so the operator
 * sees a native TW5 "Reload to pick up engine changes" prompt.
 */
export async function reconcileGenesisUpdate(
  liveHandle:     DocHandle<LarDoc>,
  incomingHandle: DocHandle<LarDoc>,
): Promise<GenesisReconcileResult> {
  return reconcileGenesisCid(liveHandle, incomingHandle);
}
