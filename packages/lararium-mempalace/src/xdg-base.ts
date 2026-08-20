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
 * The ABIDING home — `~/.local/share/lararium`, the sibling that outlives every rite.
 *
 * LARES PASS; THE LARARIUM ABIDES. A Lar wakes, acts, and gives way — the vessel substrate under
 * `lares/` is exactly that: reforged whole by `clear`, `bake` and `rebirth`, and correct to lose, because
 * a rite re-makes it from the carriers on disk. The lararium is the SHRINE, the place a family fed across
 * generations and left standing when they moved. What lands here is what no rite can re-make and no
 * carrier re-derives: an acquired body has no author in any tracked tree and no parse∘render fixed point
 * to rebuild from, so a wipe that reached it would end it.
 *
 * The split makes the wipe zone STRUCTURAL. A tier that survives because a directory is not on a list
 * survives until somebody edits the list; a tier that survives because it stands in another house needs
 * no list at all.
 *
 * `LAR_ROOT` shores it the same way it shores the vessel home, so an isolated root nests both tiers and a
 * test never reaches the operator's own shelf.
 */
export function larariumDataHome(): string {
  const root = process.env["LAR_ROOT"];
  return root ? join(root, "abide")
              : join(process.env["XDG_DATA_HOME"]?.trim() || join(homedir(), ".local", "share"), "lararium");
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
 * The `memory` sensorium root — `<data>/sensoriums/memory`. Home to the li planes AND to the worldline
 * stores (the KG + the fork-DAG). It sits SOVEREIGN, never inside the guest comparator: a rite that
 * paves the comparator must never reach a plane the RUN writes, and the worldline holds lineage the
 * comparator has no claim on.
 */
export function memorySensoriumDir(): string {
  return join(larDataHome(), "sensoriums", "memory");
}

/**
 * The sovereign li planes beside the content plane — `<memory>/{structure,form,persistence}` — and the
 * worldline stores at `<memory>/worldline`. Every reader NAMES the plane it reads; an unpassed path
 * reaches the wrong store silently (the same disease {@link memorySensoriumContentDir} names). The
 * Python holders default to these SAME paths, so a caller that omits `--palace` still lands true — but
 * the caller names it regardless, so designation carries the authority.
 */
export function memorySensoriumStructureDir(): string {
  return join(memorySensoriumDir(), "structure");
}

export function memorySensoriumFormDir(): string {
  return join(memorySensoriumDir(), "form");
}

export function memorySensoriumPersistenceDir(): string {
  return join(memorySensoriumDir(), "persistence");
}
