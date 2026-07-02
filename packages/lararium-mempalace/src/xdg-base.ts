/**
 * xdg-base — the ONE cycle-free source for the XDG data-home resolution
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
 * The verbatim mempalace's PARENT store dir (the `content` fiber cap). Per the operator's
 * content-cap-home ruling (talk-story): content stays at the UPSTREAM-default `~/.mempalace` — the
 * vendored mempalace nakama's OWN default, honoring the "mempalace is external, not-ours-to-change"
 * canon. It is NOT strangled into our sensorium tree; the memory-sensorium `#has` it by ABSOLUTE
 * reference (logical composition, not physical colocation). structure/form (OURS) live consolidated
 * inside the sensorium tree. The `MEMPALACE_PALACE_PATH` override — upstream's OWN relocation lever — is applied by the
 * CALLERS (it relocates the chroma dir, not this parent), so this stays the pure default both agree on.
 */
export function mempalaceContentParent(): string {
  return join(homedir(), ".mempalace");
}
