/**
 * fs-atomic — crash-safe file write via write-temp-then-rename.
 *
 * A plain `writeFileSync` can be TORN by a crash mid-write, leaving a half-written file — fatal for
 * watermark/state JSON (a torn idempotency watermark loses exactly-once tracking). The gold-standard
 * cure is to write a sibling temp file then `rename` it over the target: rename is ATOMIC within one
 * filesystem, so a reader/crash sees either the whole old file or the whole new one, never a tear.
 *
 * The temp rides the SAME directory as the target (so the rename stays intra-filesystem = atomic) and
 * carries the pid (so concurrent writers never share a temp path).
 */

import { writeFileSync, renameSync, rmSync } from "node:fs";

/** Atomically write `data` to `path` (write `<path>.<pid>.tmp` in the same dir, then rename over). */
export function atomicWriteFileSync(path: string, data: string | Uint8Array): void {
  const tmp = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(tmp, data);
    renameSync(tmp, path);
  } catch (err) {
    rmSync(tmp, { force: true }); // never leave a stranded temp on failure
    throw err;
  }
}
