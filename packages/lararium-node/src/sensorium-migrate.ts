/**
 * sensorium-migrate — idempotent, REVERSIBLE scaffolding for the ONE `~/.lares` → XDG migration
 * cycle. It NEVER runs the destructive repave: the operator owns the `--confirm`. It exposes the
 * floor + the markers + the plan a future `lares` verb (operator-driven) enacts:
 *
 *   - `organHealthy` (palace-organs) is the FLOOR — a cap counts migrated only once its NEW store
 *     materialized; the plan reads it, never asserts it.
 *   - a per-cap `migrated.json` marker records the move (from/to/when/method), round-trippable + atomic.
 *   - the RENAME-ASIDE pattern (`<legacy>` → `<legacy>.pre-migrate`) keeps the old bytes reversible
 *     until the operator verifies, then sweeps them.
 *   - the REPAVE plan sidesteps the cross-fs EXDEV hazard on the big (697 MB) store: rather than
 *     `mv` the chroma across filesystems, `setupPalaceOrgans()` re-creates the empty tree and
 *     `lares harvest --all` re-derives content/structure/form from the transcripts.
 *
 * Every function here is a PURE planner or a marker r/w — none deletes, none moves bytes.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/living-grammar-palace#palace-instance
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { atomicWriteFileSync } from "./fs-atomic.js";
import { memorySensoriumDir, larHome } from "./vessel-paths.js";

/** The per-cap migration marker filename (dropped INTO the new store dir). */
export const MIGRATION_MARKER = "migrated.json";

/** How a cap's bytes reached the new store. */
export type MigrationMethod = "rename-aside" | "repave" | "manual";

/** A per-cap migration marker — the durable record that this cap crossed to its XDG home. */
export interface MigrationMarker {
  readonly schema: 1;
  /** the fiber cap ("content" | "structure" | "form" | …). */
  readonly cap: string;
  /** the legacy store dir the bytes came from. */
  readonly from: string;
  /** the new XDG store dir the bytes landed in. */
  readonly to: string;
  /** ISO-8601 migration time. */
  readonly migrated: string;
  /** how the bytes crossed. */
  readonly method: MigrationMethod;
}

/** The marker path for a cap's NEW store dir. */
export function migrationMarkerPath(capDir: string): string {
  return join(capDir, MIGRATION_MARKER);
}

/** Read a cap's migration marker; `null` when the cap has not been marked migrated. */
export function readMigrationMarker(capDir: string): MigrationMarker | null {
  const p = migrationMarkerPath(capDir);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8")) as MigrationMarker;
}

/** Write a cap's migration marker atomically (idempotent — re-marking a migrated cap is a no-op-shape). */
export function writeMigrationMarker(capDir: string, marker: MigrationMarker): void {
  atomicWriteFileSync(migrationMarkerPath(capDir), JSON.stringify(marker, null, 2) + "\n");
}

/** The rename-aside spelling: a legacy dir moved out of the way, reversible-until-verified. */
export function preMigratePath(legacyDir: string): string {
  return `${legacyDir}.pre-migrate`;
}

/** One cap's migration posture, computed from disk — a READ, never a move. */
export interface CapMigrationStep {
  readonly cap: string;
  /** the legacy source dir (may be absent). */
  readonly legacy: string;
  /** the new XDG target dir the resolver would use once populated. */
  readonly target: string;
  readonly legacyPresent: boolean;
  /** did the target already materialize (the `organHealthy` floor — bytes at the new store)? */
  readonly targetPresent: boolean;
  /** already carries a migration marker? */
  readonly marked: boolean;
  /** the recommended next action, given the postures — advisory only. */
  readonly action: "already-migrated" | "repave" | "nothing-to-migrate";
}

/**
 * Plan the `memory` sensorium's migration WITHOUT touching disk — one step per fiber cap. The legacy
 * spellings are the pre-consolidation dirs (`~/.mempalace`, `~/.lares/.astpalace`, `.formpalace`); the
 * targets are the CANONICAL consolidated `<memory>/{content,structure,form}`. The postures read purely
 * from disk (existsSync). The operator's migration verb consumes this; it never executes here.
 */
export function planMemoryMigration(): CapMigrationStep[] {
  const memory = memorySensoriumDir();
  const home = larHome();
  const caps: ReadonlyArray<{ cap: string; legacy: string; target: string }> = [
    { cap: "content",   legacy: homeMempalaceLegacy(),    target: join(memory, "content") },
    { cap: "structure", legacy: join(home, ".astpalace"), target: join(memory, "structure") },
    { cap: "form",      legacy: join(home, ".formpalace"), target: join(memory, "form") },
  ];
  return caps.map(({ cap, legacy, target }) => {
    const legacyPresent = existsSync(legacy);
    const targetPresent = existsSync(target);
    const marked = readMigrationMarker(target) !== null;
    // Purely disk-driven: bytes at the new target → done; only legacy present → repave; neither → born fresh.
    const action: CapMigrationStep["action"] =
      targetPresent ? "already-migrated"
      : legacyPresent ? "repave"
      : "nothing-to-migrate";
    return { cap, legacy, target, legacyPresent, targetPresent, marked, action };
  });
}

/** The verbatim mempalace's legacy PARENT — `~/.mempalace` (never LAR_ROOT-scoped; the vendored default,
 *  matching vessel-paths' strangler legacy arm; kept local to avoid re-exporting an internal). */
function homeMempalaceLegacy(): string {
  return join(homedir(), ".mempalace");
}

/**
 * The repave plan — the operator-facing recipe (declarative, no side effects). The EXDEV-safe path:
 * re-create the empty consolidated tree, then re-derive from the transcripts. Rename-aside first so
 * the move stays reversible until verified.
 */
export interface RepavePlan {
  /** rename-aside targets: legacy dir → its `.pre-migrate` sibling (reversible). */
  readonly renameAside: ReadonlyArray<{ from: string; to: string }>;
  /** the shell steps the operator runs under `--confirm` (advisory strings). */
  readonly steps: readonly string[];
}

/** Build the declarative repave plan for the memory sensorium (no disk touched). */
export function repavePlan(): RepavePlan {
  const steps = planMemoryMigration();
  const renameAside = steps
    .filter((s) => s.legacyPresent && s.action === "repave")
    .map((s) => ({ from: s.legacy, to: preMigratePath(s.legacy) }));
  return {
    renameAside,
    steps: [
      "lares palace-teardown --confirm      # rename-aside the legacy stores (operator-gated)",
      "lares wake --init                    # setupPalaceOrgans re-creates the empty consolidated tree + manifest",
      "lares harvest --all                  # re-derive content/structure/form from the transcripts (EXDEV-safe)",
    ],
  };
}
