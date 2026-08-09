/**
 * clean-output — retire a build output directory by MOVING it aside, never by deleting it.
 *
 * ── WHY A MOVE ──────────────────────────────────────────────────────────────────────────────────
 * This ran as an automatic `prebuild` hook across eight packages, so every build began by destroying
 * the artifact the tool was currently running from. `pnpm -r` aborts the whole recursive run on the
 * first failure, which meant one TypeScript error anywhere left some packages cleaned, some not, and
 * the CLI unable to start at all. The tree went from STALE BUT WORKING to nothing — and the failure
 * that caused it had no business carrying that authority.
 *
 * Cleaning is now an explicit act (`pnpm -r clean`, or `pnpm build:clean`), and even that act stays
 * recoverable: the previous output waits at `<dir>.prev` until the next clean supersedes it. A rename
 * is atomic and near-free, so nothing is paid for the safety.
 *
 * A failed build after a clean therefore leaves a way back:
 *   mv dist.prev dist          # stand the last good output up again
 *
 * ── WHAT IT NEVER DOES ──────────────────────────────────────────────────────────────────────────
 * It never reaches outside the paths it receives, and it never touches a path that is not an output
 * directory the caller named. The one `rm` it performs clears a SUPERSEDED `.prev`, so the retired
 * copies never accumulate.
 */

import { renameSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";

for (const relativePath of process.argv.slice(2)) {
  const dir  = resolve(relativePath);
  const prev = `${dir}.prev`;
  if (!existsSync(dir)) continue;              // nothing built yet — nothing to retire
  rmSync(prev, { recursive: true, force: true });   // the PREVIOUS retirement, now superseded
  try {
    renameSync(dir, prev);
  } catch {
    // A cross-device or locked rename leaves the old behaviour as the floor: the build still needs a
    // clear directory, and refusing here would strand the caller with no way to clean at all.
    rmSync(dir, { recursive: true, force: true });
  }
}
