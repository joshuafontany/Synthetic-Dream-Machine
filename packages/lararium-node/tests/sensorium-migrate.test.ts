/**
 * sensorium-migrate — the migration scaffolding READS and PLANS, never deletes/moves. Markers
 * round-trip; the plan reads disk postures; materializeMemorySensorium is idempotent + faithful.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  migrationMarkerPath, readMigrationMarker, writeMigrationMarker, preMigratePath,
  planMemoryMigration, repavePlan, type MigrationMarker,
} from "../src/sensorium-migrate.js";
import { materializeMemorySensorium } from "../src/palace-organs.js";
import { memorySensoriumDir } from "../src/vessel-paths.js";
import { readManifest } from "../src/sensorium.js";

let home: string;
let savedRoot: string | undefined;
let savedMp: string | undefined;

beforeEach(() => {
  savedRoot = process.env["LAR_ROOT"];
  savedMp = process.env["MEMPALACE_PALACE_PATH"];
  home = mkdtempSync(join(tmpdir(), "lar-migrate-"));
  process.env["LAR_ROOT"] = home;
  process.env["MEMPALACE_PALACE_PATH"] = join(home, "mp-content");
});
afterEach(() => {
  if (savedRoot === undefined) delete process.env["LAR_ROOT"]; else process.env["LAR_ROOT"] = savedRoot;
  if (savedMp === undefined) delete process.env["MEMPALACE_PALACE_PATH"]; else process.env["MEMPALACE_PALACE_PATH"] = savedMp;
  try { rmSync(home, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("migration markers", () => {
  test("round-trip atomically", () => {
    const capDir = join(home, "cap"); mkdirSync(capDir, { recursive: true });
    expect(readMigrationMarker(capDir)).toBeNull();
    const marker: MigrationMarker = {
      schema: 1, cap: "content", from: "/old", to: capDir, migrated: "2026-07-01T00:00:00.000Z", method: "repave",
    };
    writeMigrationMarker(capDir, marker);
    expect(migrationMarkerPath(capDir).endsWith("migrated.json")).toBe(true);
    expect(readMigrationMarker(capDir)).toEqual(marker);
  });

  test("preMigratePath is the reversible rename-aside sibling", () => {
    expect(preMigratePath("/x/.mempalace")).toBe("/x/.mempalace.pre-migrate");
  });
});

describe("planMemoryMigration — reads, never moves", () => {
  test("fresh vessel → nothing-to-migrate (no legacy, no new bytes); touches no disk", () => {
    const plan = planMemoryMigration();
    expect(plan.map((s) => s.cap)).toEqual(["content", "structure", "form"]);
    // structure/form have no legacy present under the fresh isolated root.
    const structure = plan.find((s) => s.cap === "structure")!;
    expect(structure.legacyPresent).toBe(false);
    expect(structure.action).toBe("nothing-to-migrate");
    // the planner created nothing.
    expect(existsSync(join(home, ".astpalace"))).toBe(false);
  });

  test("legacy present + no new target → repave action", () => {
    mkdirSync(join(home, ".astpalace"), { recursive: true });
    const structure = planMemoryMigration().find((s) => s.cap === "structure")!;
    expect(structure.legacyPresent).toBe(true);
    expect(structure.action).toBe("repave");
    const plan = repavePlan();
    expect(plan.renameAside.some((r) => r.to.endsWith(".astpalace.pre-migrate"))).toBe(true);
    expect(plan.steps.length).toBeGreaterThan(0);
  });
});

describe("materializeMemorySensorium — idempotent + faithful", () => {
  test("writes the manifest once, then reports present (byte-stable)", () => {
    const first = materializeMemorySensorium();
    expect(first.ran).toBe(true);
    expect(first.ok).toBe(true);
    const m = readManifest(memorySensoriumDir())!;
    expect(m.sensorium).toBe("memory");
    // content is the env-override (outside the sensorium) → absolute; structure/form inside → relative.
    expect(m.has["content"]!.dir).toBe(join(home, "mp-content"));
    expect(m.has["structure"]!.dir).toBe("structure");
    expect(m.bands).toEqual({ grain: "wavelet", computed: "on-read" });
    expect(m.coupling.children).toEqual([]);
    // re-run → no drift → ran:false.
    expect(materializeMemorySensorium().ran).toBe(false);
  });
});
