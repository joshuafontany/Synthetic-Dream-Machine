import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { larMempalaceDir } from "../src/vessel-paths.js";

/**
 * `larMempalaceDir` (node) and mempalace's `defaultPalacePath` now derive the store parent from ONE
 * cycle-free source (`@lararium/mempalace/xdg-base`). This locks the byte-identical resolution the
 * pre-refactor value-duplicate produced — so the vessel view and the mempalace chroma dir always agree.
 */
describe("larMempalaceDir (derives from the shared xdg-base)", () => {
  const saved: Record<string, string | undefined> = {};
  const roots: string[] = [];

  function set(k: string, v: string | undefined) {
    if (!(k in saved)) saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  function freshRoot(): string {
    const r = mkdtempSync(join(tmpdir(), "vessel-mp-"));
    roots.push(r);
    return r;
  }

  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    for (const k of Object.keys(saved)) delete saved[k];
    for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true });
  });

  it("MEMPALACE_PALACE_PATH override is taken verbatim as the parent", () => {
    const root = freshRoot();
    set("MEMPALACE_PALACE_PATH", join(root, "custom"));
    expect(larMempalaceDir()).toBe(join(root, "custom"));
  });

  it("fresh vessel → <data>/sensoriums/memory/content (== mempalace defaultPalacePath parent)", () => {
    const root = freshRoot();
    set("MEMPALACE_PALACE_PATH", undefined);
    set("LAR_ROOT", undefined);
    set("XDG_DATA_HOME", join(root, "xdg"));
    set("HOME", join(root, "home")); // empty → legacy ~/.mempalace absent
    set("USERPROFILE", join(root, "home"));
    expect(larMempalaceDir()).toBe(
      join(root, "xdg", "lares", "sensoriums", "memory", "content"),
    );
  });

  it("legacy ~/.mempalace present (live box) → legacy spelling", () => {
    const root = freshRoot();
    set("MEMPALACE_PALACE_PATH", undefined);
    set("LAR_ROOT", undefined);
    set("XDG_DATA_HOME", join(root, "xdg")); // new dir absent
    set("HOME", join(root, "home"));
    set("USERPROFILE", join(root, "home"));
    mkdirSync(join(root, "home", ".mempalace"), { recursive: true });
    expect(larMempalaceDir()).toBe(join(root, "home", ".mempalace"));
  });
});
