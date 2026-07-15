/**
 * fs-atomic — crash-safe file write via write-temp → fsync → rename → fsync-dir.
 *
 * A plain `writeFileSync` can be TORN by a crash mid-write, leaving a half-written file — fatal for
 * watermark/state JSON (a torn idempotency watermark loses exactly-once tracking) and for the identity
 * keel (anchors + keyhive archive). The cure holds two disciplines together:
 *   - ATOMICITY: write a sibling temp then `rename` over the target — rename is atomic within one
 *     filesystem, so a reader/crash sees the whole old file or the whole new one, never a tear.
 *   - DURABILITY: `fsync` the temp FILE before the rename (its bytes reach disk), then `fsync` the
 *     containing DIRECTORY after (the rename's dirent survives a crash). `rename` alone gives the
 *     atomic pointer-swap but NOT durability — a crash can leave the swap or the bytes un-flushed.
 *
 * The temp rides the SAME directory as the target (so the rename stays intra-filesystem = atomic) and
 * carries the pid (so concurrent writers never share a temp path).
 */

import { writeFileSync, renameSync, rmSync, openSync, fsyncSync, closeSync } from "node:fs";
import { dirname } from "node:path";

/** Atomically + durably write `data` to `path` (temp → fsync → rename → fsync-dir). */
export function atomicWriteFileSync(path: string, data: string | Uint8Array): void {
  const tmp = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(tmp, data);
    // fsync the FILE: flush the payload to disk BEFORE the rename exposes it.
    const fd = openSync(tmp, "r+");
    try { fsyncSync(fd); } finally { closeSync(fd); }
    // Atomic pointer swap.
    renameSync(tmp, path);
    // fsync the DIRECTORY: persist the rename itself. Best-effort — a dir fsync rejects on some
    // platforms (e.g. Windows), where the filesystem already lands the rename durably.
    try {
      const dfd = openSync(dirname(path), "r");
      try { fsyncSync(dfd); } finally { closeSync(dfd); }
    } catch { /* platform without dir-fsync — rename durability handled by the fs */ }
  } catch (err) {
    rmSync(tmp, { force: true }); // never leave a stranded temp on failure
    throw err;
  }
}
