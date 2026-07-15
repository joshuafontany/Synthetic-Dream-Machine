/**
 * store-integrity (node) — the nodefs read-side of the isomorphic L5b gate. The framing
 * logic lives in `@lararium/mesh` (platform-blind); this reads a doc's blobs off nodefs
 * and hands them to `precheckBlobs`. A browser vessel reads the same blobs off IndexedDB
 * and calls the same mesh function — one gate, two readers.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { precheckBlobs, type BlobRef, type StoreIntegrityReport } from "@lararium/mesh";

/** The on-disk shard path for a documentId under a NodeFS store root. */
export function docStorePath(storageDir: string, documentId: string): string {
  return join(storageDir, documentId.slice(0, 2), documentId.slice(2));
}

function readBlobs(dir: string, kind: BlobRef["kind"]): BlobRef[] {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const out: BlobRef[] = [];
  for (const name of names) {
    const p = join(dir, name);
    try {
      if (!statSync(p).isFile()) continue;
      out.push({ kind, name, data: readFileSync(p) });
    } catch { /* a file that vanishes mid-read gets skipped, not fatal */ }
  }
  return out;
}

/** Read a doc's nodefs blobs and run the isomorphic framing pre-check over them. */
export function precheckDocStore(storageDir: string, documentId: string): StoreIntegrityReport {
  const base = docStorePath(storageDir, documentId);
  const blobs = [
    ...readBlobs(join(base, "snapshot"), "snapshot"),
    ...readBlobs(join(base, "incremental"), "incremental"),
  ];
  return precheckBlobs(documentId, blobs);
}
