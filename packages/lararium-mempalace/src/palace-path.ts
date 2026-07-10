/**
 * palace-path — ONE canonical spelling for a physical mempalace.
 *
 * The mempalace write-daemon (`mempalace mine … --daemon`) keys its single-holder
 * singleton off the palace path. The SAME physical palace addressed by DIFFERENT
 * spellings (a symlinked parent, a `..` segment, a relative vs absolute form, a
 * trailing slash) hashed to DISTINCT keys → multiple write-daemons → palace-lock
 * starvation (the daemon pile-up root).
 *
 * The cure: canonicalize at OUR single point of use, so one physical palace = one
 * spelling = one holder. `realpathSync.native` resolves symlinks AND normalizes;
 * before the palace dir exists (first boot, before the daemon creates it) it throws
 * ENOENT, so we fall back to `resolve()` — which still collapses `.`, `..`, and
 * relative spellings. Once the dir exists the realpath wins and stabilizes.
 *
 * NOTE on the live daemon: a running write-daemon started under a NON-canonical
 * spelling will not be matched by the canonical one — canonicalizing while it is
 * live would spawn a SECOND daemon. The canonical spelling therefore takes effect
 * on the NEXT @daemon restart; never start a competing daemon against a running one.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mempalace/palace-path
 */

import { realpathSync } from "node:fs";
import { resolve, join } from "node:path";

import { mempalaceContentParent } from "./xdg-base.js";

/**
 * Canonicalize a palace path to ONE stable spelling:
 *   resolve() (collapse `.`/`..`/relative) → realpathSync.native (resolve symlinks)
 * with a graceful fall back to the resolved absolute path when the path does not
 * yet exist (first boot, before the daemon creates the palace dir).
 */
export function canonicalPalacePath(p: string): string {
  const abs = resolve(p);
  try {
    return realpathSync.native(abs);
  } catch {
    // Not yet created — the absolute-normalized form is the best stable spelling.
    return abs;
  }
}

/**
 * The default palace path spelling, BEFORE canonicalization:
 *   $MEMPALACE_PALACE_PATH (override, taken AS the chroma dir) || <content-parent>/palace.
 * The content parent stays at the upstream-default `~/.mempalace` ({@link mempalaceContentParent} — the
 * content-cap-home ruling keeps it external, never strangled into our tree), so the chroma dir and the
 * vessel's `larMempalaceDir` view always agree at `~/.mempalace/palace`.
 */
export function defaultPalacePath(): string {
  const env = process.env["MEMPALACE_PALACE_PATH"]?.trim();
  return env || join(mempalaceContentParent(), "palace");
}

/**
 * The one canonical palace path every Lares mempalace invocation MUST use:
 * canonicalPalacePath(defaultPalacePath()). One physical palace, one spelling, one holder.
 */
export function resolvePalacePath(): string {
  return canonicalPalacePath(defaultPalacePath());
}
