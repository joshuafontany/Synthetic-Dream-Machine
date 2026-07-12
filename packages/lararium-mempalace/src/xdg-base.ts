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
 * Meme: lar:///ha.ka.ba/lararium/mempalace/xdg-base
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
 * The GUEST mempalace's PARENT store dir — the upstream-default `~/.mempalace`.
 *
 * The content-cap-home ruling that once made this the memory sensorium's `content` fiber was RETIRED:
 * the lararium OWNS its content plane ({@link memorySensoriumContentDir}), and this store demoted to a
 * GUEST — a comparator to measure against, and the source of a deliberate one-way import Act. Never a
 * runtime binding, and never written by the boot (the comparator ruling). The `MEMPALACE_PALACE_PATH`
 * override — upstream's OWN relocation lever — is applied by the CALLERS (it relocates the chroma dir,
 * not this parent), so this stays the pure default both agree on.
 */
export function mempalaceContentParent(): string {
  return join(homedir(), ".mempalace");
}

/**
 * The SOVEREIGN content plane — `<data>/sensoriums/memory/content`. The plane the capture path fills
 * every turn, and therefore the plane every reader must NAME. An unpassed palace path is not a default:
 * it is a silent reach into the guest, and it is why this store spent its life write-only.
 *
 * Kept here (not in `@lararium/node/vessel-paths`) so the mempalace package can name it without an
 * import cycle — the same reason {@link larDataHome} lives here.
 */
export function memorySensoriumContentDir(): string {
  return join(memorySensoriumDir(), "content");
}

/**
 * The `memory` sensorium root — `<data>/sensoriums/memory`. Home to the li planes AND to the
 * worldline stores (the KG + the fork-DAG). The KG used to live INSIDE the guest
 * (`~/.mempalace/palace/knowledge_graph.sqlite3`), so the spirit-lineage observer wrote the
 * comparator on every harvest, and a pave of the guest would have destroyed the whole worldline.
 */
export function memorySensoriumDir(): string {
  return join(larDataHome(), "sensoriums", "memory");
}
