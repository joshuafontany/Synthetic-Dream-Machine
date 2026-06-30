/**
 * palace-organs — the shared enumerator setup (`wake --init`) and teardown (`palace-teardown`)
 * BOTH consume, plus the idempotent wire-once contract (re-run ⇒ all "present").
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { palaceOrgans, setupPalaceOrgans, organHealthy } from "../src/palace-organs.js";
import { larMempalaceDir, larAstPalaceDir, larFormPalaceDir, larMeshPalaceDir } from "../src/vessel-paths.js";

let home: string;
let mempalace: string;
let savedRoot: string | undefined;
let savedMp: string | undefined;

beforeEach(() => {
  savedRoot = process.env["LAR_ROOT"];
  savedMp = process.env["MEMPALACE_PALACE_PATH"];
  home = mkdtempSync(join(tmpdir(), "lar-organs-home-"));
  mempalace = mkdtempSync(join(tmpdir(), "lar-organs-mp-"));
  process.env["LAR_ROOT"] = home;
  process.env["MEMPALACE_PALACE_PATH"] = mempalace;
});

afterEach(() => {
  if (savedRoot === undefined) delete process.env["LAR_ROOT"]; else process.env["LAR_ROOT"] = savedRoot;
  if (savedMp === undefined) delete process.env["MEMPALACE_PALACE_PATH"]; else process.env["MEMPALACE_PALACE_PATH"] = savedMp;
  for (const d of [home, mempalace]) { try { rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ } }
});

describe("palaceOrgans — the ONE registry both consumers read", () => {
  test("enumerates the four organs in dependency order, mempalace FIRST", () => {
    const names = palaceOrgans().map((o) => o.name);
    expect(names).toEqual(["mempalace", "astpalace", "formpalace", "meshpalace"]);
  });

  test("each organ resolves its dir from the SAME vessel-path resolver (no ambient default)", () => {
    const byName = Object.fromEntries(palaceOrgans().map((o) => [o.name, o.dir]));
    expect(byName["mempalace"]).toBe(larMempalaceDir());
    expect(byName["astpalace"]).toBe(larAstPalaceDir());
    expect(byName["formpalace"]).toBe(larFormPalaceDir());
    expect(byName["meshpalace"]).toBe(larMeshPalaceDir());
    // all under the isolated temp roots — proof the env override flows through.
    expect(byName["mempalace"]).toBe(mempalace);
    expect(byName["astpalace"].startsWith(home)).toBe(true);
  });
});

describe("setupPalaceOrgans — wire-once / detect-existing idempotency", () => {
  test("first run STANDS UP every absent organ; a re-run reads all 'present'", () => {
    // Pre-create the mempalace config so its organ is healthy WITHOUT spawning the real `mempalace` CLI.
    mkdirSync(mempalace, { recursive: true });
    writeFileSync(join(mempalace, "config.json"), JSON.stringify({ hooks: { auto_save: false } }) + "\n");

    const first = setupPalaceOrgans();
    // every step ok
    expect(first.every((s) => s.ok)).toBe(true);
    // ast/form/mesh were absent → init ran and created their dirs
    for (const name of ["astpalace", "formpalace", "meshpalace"]) {
      const step = first.find((s) => s.step === name)!;
      expect(step.ran).toBe(true);
      expect(existsSync(palaceOrgans().find((o) => o.name === name)!.dir)).toBe(true);
    }
    // mempalace was present → skipped (no subprocess)
    expect(first.find((s) => s.step === "mempalace")!.ran).toBe(false);

    // SECOND run — everything present, nothing ran.
    const second = setupPalaceOrgans();
    expect(second.every((s) => s.ok)).toBe(true);
    expect(second.every((s) => s.ran === false)).toBe(true);
    for (const o of palaceOrgans()) expect(organHealthy(o)).toBe(true);
  });
});
