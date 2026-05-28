/**
 * browser-genesis — isomorphic genesis island intake for browser vessels.
 *
 * Platform counterpart to genesis-artifact.ts (Node). Three delivery paths
 * converge here: bundled Uint8Array, content-addressed IDB cache, or peer-sync
 * via repo.find(islandDocUrl). All three produce the same DocHandle<LarDoc>.
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
 *   The recommended surface: a TW5 alert tiddler written to the admin doc, tagged
 *   lar:///ha.ka.ba/tags/engine-update, with a "Reload to pick up TW5 changes"
 *   message. The browser vessel writes it; TW5 renders it natively.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-genesis
 */

import type { Repo, DocHandle, AutomergeUrl } from "@automerge/automerge-repo";
import {
  automergeLoad,
  ENGINE_CORE_ID,
  LARES_MEMETIC_WIKITEXT_PLUGIN_URI,
  LARARIUM_DOC_URI,
  cidV1Sha256,
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
    const handle = await repo.find<LarDoc>(storedUrl as AutomergeUrl);
    await handle.whenReady(["ready", "unavailable"]);
    if (handle.state === "unavailable") return null;
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
  let preview: LarDoc;
  try {
    preview = automergeLoad<LarDoc>(bytes);
  } catch (err) {
    throw new Error(`[browser-genesis] genesis bytes failed Automerge.load(): ${err}`);
  }

  if (!preview.blobs?.[ENGINE_CORE_ID]) {
    throw new Error(
      `[browser-genesis] genesis artifact missing TW5 core blob (${ENGINE_CORE_ID}). ` +
      `Verify the artifact CID matches the expected build.`,
    );
  }

  if (!preview.blobs?.[LARES_MEMETIC_WIKITEXT_PLUGIN_URI]) {
    throw new Error(
      `[browser-genesis] genesis artifact missing lares memetic-wikitext plugin. ` +
      `Rebuild genesis after build:plugin.`,
    );
  }

  const handle = repo.import<LarDoc>(bytes);
  await handle.whenReady();

  const doc = handle.doc();
  if (!doc?.blobs?.[ENGINE_CORE_ID]) {
    throw new Error(
      `[browser-genesis] handle.whenReady() resolved but TW5 core blob absent — import failed silently.`,
    );
  }

  const blobCount    = Object.keys(doc.blobs ?? {}).length;
  const tiddlerCount = Object.keys(doc.tiddlers ?? {}).length;
  console.log(
    `[browser-genesis] loaded  url=${handle.url}  blobs=${blobCount}  tiddlers=${tiddlerCount}`,
  );

  return handle;
}

// ── reconcileGenesisUpdate ────────────────────────────────────────────────────

const GENESIS_CID_TIDDLER = `${LARARIUM_DOC_URI}/genesis-cid`;

export interface GenesisReconcileResult {
  /** True when the incoming genesis CID differs from the live doc — engine update detected. */
  updated: boolean;
  /** CID of the incoming genesis bytes. */
  incomingCid: string;
  /** CID recorded in the live island doc before reconcile, or null if absent. */
  previousCid: string | null;
}

/**
 * Compare incoming genesis bytes against the live island doc's recorded CID.
 * When they diverge: merge blobs + tiddlers from the incoming handle into the
 * live handle (same pattern as reconcileIslandFromGenesis in Node) and return
 * { updated: true } so the caller can signal the operator to reload.
 *
 * Caller responsibility: when updated === true, write a TW5 alert tiddler to
 * the admin doc (tagged lar:///ha.ka.ba/tags/engine-update) so the operator
 * sees a native TW5 "Reload to pick up engine changes" prompt.
 */
export async function reconcileGenesisUpdate(
  liveHandle:     DocHandle<LarDoc>,
  incomingHandle: DocHandle<LarDoc>,
  incomingBytes:  Uint8Array,
): Promise<GenesisReconcileResult> {
  const incomingCid = genesisCidFromBytes(incomingBytes);
  const previousCid =
    (liveHandle.doc()?.tiddlers?.[GENESIS_CID_TIDDLER]?.tiddler["cid"] as string | undefined) ?? null;

  if (previousCid === incomingCid) {
    return { updated: false, incomingCid, previousCid };
  }

  // CID diverged — merge incoming into live.
  // Automerge merge is additive: new tiddlers and blobs arrive; existing tiddlers
  // follow Automerge LWW semantics. The live handle retains operator-authored content.
  liveHandle.merge(incomingHandle);

  // Update the genesis-cid oracle tiddler so next boot skips reconcile.
  liveHandle.change((doc) => {
    doc.tiddlers[GENESIS_CID_TIDDLER] = {
      tiddler: { title: GENESIS_CID_TIDDLER, cid: incomingCid },
      meta:    { authority: "browser-genesis-reconcile" },
    };
  });

  console.log(
    `[browser-genesis] engine update detected — prev=${previousCid?.slice(0, 16) ?? "none"}  new=${incomingCid.slice(0, 16)}`,
  );

  return { updated: true, incomingCid, previousCid };
}
