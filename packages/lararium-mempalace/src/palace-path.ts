/**
 * palace-path — ONE canonical spelling for a physical mempalace.
 *
 * The mempalace write-daemon (`mempalace mine … --daemon`) keys its single-holder
 * singleton off the palace path. The SAME physical palace addressed by DIFFERENT
 * spellings (a symlinked parent, a `..` segment, a relative vs absolute form, a
 * trailing slash) hashed to DISTINCT keys → multiple write-daemons → palace-lock
 * starvation (the daemon pile-up root, 2026-06-28).
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

import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * The verbatim mempalace's PARENT store dir, derived from the SAME XDG base + strangler that
 * `@lararium/node`'s vessel-paths.ts uses for `larMempalaceDir` — kept in sync BY VALUE (this
 * package sits BELOW node in the dep graph, so it cannot import it; the ~6 lines are duplicated
 * deliberately, both keyed on `$XDG_DATA_HOME`/`$LAR_ROOT` + `~/.mempalace`). Consolidated new home:
 * `<data>/sensoriums/memory/content`; legacy: `~/.mempalace`. A live box (legacy present) stays legacy.
 */
function mempalaceContentParent(): string {
  const root = process.env["LAR_ROOT"];
  const dataHome = root
    ? join(root, "data")
    : join(process.env["XDG_DATA_HOME"]?.trim() || join(homedir(), ".local", "share"), "lares");
  const newParent = join(dataHome, "sensoriums", "memory", "content");
  const legacyParent = join(homedir(), ".mempalace");
  if (existsSync(newParent)) return newParent;
  if (existsSync(legacyParent)) return legacyParent;
  return newParent;
}

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
 * The content parent follows the XDG strangler ({@link mempalaceContentParent}), so the chroma dir
 * and the vessel's `larMempalaceDir` view always agree — legacy `~/.mempalace/palace` on a live box,
 * `<data>/sensoriums/memory/content/palace` once migrated.
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
