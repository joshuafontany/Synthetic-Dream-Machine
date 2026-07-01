/**
 * xdg-base — the ONE cycle-free source for the XDG data-home resolution + the OLD-else-NEW strangler
 * + the verbatim mempalace CONTENT parent. Both `@lararium/node`'s vessel-paths.ts and this package's
 * palace-path.ts derive the mempalace store parent from HERE, so the two views stay byte-identical
 * without value-duplication.
 *
 * This module is DEPENDENCY-FREE (node builtins only). `@lararium/mempalace` sits BELOW `@lararium/node`
 * in the dep graph, so palace-path.ts imports it same-package while vessel-paths.ts imports it across the
 * existing `node → mempalace` edge (via the `@lararium/mempalace/xdg-base` subpath) — no cycle.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mempalace/xdg-base
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * $XDG_DATA_HOME/lares — the persistent-store home (the sensoriums + the vessel substrate). Honors
 * `$XDG_DATA_HOME` (unset → the freedesktop default `~/.local/share`), and roots under `LAR_ROOT/data`
 * for ISOLATED instances (the test harness / staged pairs).
 */
export function larDataHome(): string {
  const root = process.env["LAR_ROOT"];
  return root ? join(root, "data")
              : join(process.env["XDG_DATA_HOME"]?.trim() || join(homedir(), ".local", "share"), "lares");
}

/**
 * Read OLD-else-NEW: prefer the new XDG dir once it exists, fall back to the legacy spelling when only
 * IT exists, and default a truly-fresh vessel to the new canonical dir. One migration cycle; a live box
 * (legacy dirs present) stays on legacy until the operator migrates.
 */
export function strangle(newDir: string, legacyDir: string): string {
  if (existsSync(newDir)) return newDir;
  if (existsSync(legacyDir)) return legacyDir;
  return newDir;
}

/**
 * The verbatim mempalace's PARENT store dir (the `content` fiber cap): the strangler over
 * `<data>/sensoriums/memory/content` (new) / `~/.mempalace` (legacy). The `MEMPALACE_PALACE_PATH`
 * override is applied by the CALLERS (it relocates the chroma dir, not this parent), so this stays the
 * pure XDG-derived parent both callers agree on.
 */
export function mempalaceContentParent(): string {
  return strangle(join(larDataHome(), "sensoriums", "memory", "content"), join(homedir(), ".mempalace"));
}
