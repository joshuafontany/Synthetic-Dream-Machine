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
 * $XDG_DATA_HOME/lares — THE SPIRITS' HOUSE. What belongs to the Lares themselves: the sovereign
 * identity, the Nexus seal, the repo registry, and the vessel substrate they run on. A Lar's keys ARE
 * that Lar, so identity stays here and a rite reforging the substrate beneath it changes nothing about
 * whose it is. What belongs to the HOUSE — the acquired shelf, the sensoriums — stands in
 * {@link larariumDataHome}. Honors `$XDG_DATA_HOME` (unset → the freedesktop default `~/.local/share`),
 * and roots under `LAR_ROOT/data` for ISOLATED instances (the test harness / staged pairs).
 *
 * `lar` names the NAMESPACE (the `lar:///…` URIs, every resolver in this stack); `lares` names the
 * SPIRITS; `lararium` names the HOUSE. Three words, no synonyms — which is why this resolver reads
 * `lares`, not `lar`.
 */
export function laresDataHome(): string {
  const root = process.env["LAR_ROOT"];
  return root ? join(root, "data")
              : join(process.env["XDG_DATA_HOME"]?.trim() || join(homedir(), ".local", "share"), "lares");
}

/**
 * The HOUSE's home — `~/.local/share/lararium`, the shrine a family fed across generations and left
 * standing when they moved.
 *
 * THE CRITERION IS WHOSE IT IS. What lands here belongs to the LARARIUM rather than to any Lar: the
 * acquired shelf, and the sensoriums that hold operator history and DreamNet history. LARES PASS; THE
 * LARARIUM ABIDES — a Lar wakes, acts and gives way, and the substrate under `lares/` gives way with it,
 * reforged whole by `clear`, `bake` and `rebirth`. That the house's things also survive every rite reads
 * as the CONSEQUENCE of whose they are, never the reason: an acquired body has no author in any tracked
 * tree and no parse∘render fixed point, and a sensorium holds capture the machine took once and cannot
 * take again, so nothing rebuilds either and a wipe reaching them would end them.
 *
 * Belonging makes the wipe zone STRUCTURAL. A tier that survives because a directory is not on a list
 * survives until somebody edits the list; a tier standing in its own house needs no list at all.
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
 * The SOVEREIGN content plane — `<abide>/sensoriums/memory/content`. The plane the capture path fills
 * every turn, and therefore the plane every reader must NAME. An unpassed palace path is not a default:
 * it is a silent reach into the guest, and it is why this store spent its life write-only.
 *
 * Kept here (not in `@lararium/node/vessel-paths`) so the mempalace package can name it without an
 * import cycle — the same reason {@link laresDataHome} lives here.
 */
export function memorySensoriumContentDir(): string {
  return join(memorySensoriumDir(), "content");
}

/**
 * The `memory` sensorium root — `<abide>/sensoriums/memory`. Home to the li planes AND to the worldline
 * stores (the KG + the fork-DAG). It sits SOVEREIGN, never inside the guest comparator: a rite that
 * paves the comparator must never reach a plane the RUN writes, and the worldline holds lineage the
 * comparator has no claim on.
 */
export function memorySensoriumDir(): string {
  return join(larariumDataHome(), "sensoriums", "memory");
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
