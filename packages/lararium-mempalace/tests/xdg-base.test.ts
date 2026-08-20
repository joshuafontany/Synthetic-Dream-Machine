import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { larDataHome, mempalaceContentParent, memorySensoriumStructureDir, memorySensoriumFormDir, memorySensoriumPersistenceDir } from "../src/xdg-base.js";

/**
 * xdg-base is the ONE cycle-free source both `@lararium/node`'s vessel-paths.ts (`larMempalaceDir`)
 * and this package's palace-path.ts (`defaultPalacePath`) derive the mempalace store parent from.
 * These hermetic cases lock the byte-identical resolution the pre-refactor duplicate produced.
 */
describe("xdg-base (the shared XDG resolver)", () => {
  const saved: Record<string, string | undefined> = {};
  const roots: string[] = [];

  function set(k: string, v: string | undefined) {
    if (!(k in saved)) saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  function freshRoot(): string {
    const r = mkdtempSync(join(tmpdir(), "xdg-base-"));
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

  it("larDataHome: LAR_ROOT wins → <root>/data", () => {
    set("LAR_ROOT", "/isolated/pair");
    expect(larDataHome()).toBe(join("/isolated/pair", "data"));
  });

  it("larDataHome: XDG_DATA_HOME/lares when unisolated", () => {
    set("LAR_ROOT", undefined);
    set("XDG_DATA_HOME", "/xdg/data");
    expect(larDataHome()).toBe(join("/xdg/data", "lares"));
  });

  it("larDataHome: freedesktop default ~/.local/share/lares when neither set", () => {
    set("LAR_ROOT", undefined);
    set("XDG_DATA_HOME", undefined);
    set("HOME", "/home/tester");
    set("USERPROFILE", "/home/tester");
    expect(larDataHome()).toBe(join("/home/tester", ".local", "share", "lares"));
  });

  // A sensorium ABIDES: it holds capture the machine took once and cannot take again, so it stands in
  // the shrine (`lararium/`) and never in the house whose substrate a rite reforges. Both tongues must
  // name the shrine — the li planes resolve the SAME string the Python holders' defaults do
  // (structurepalace_io._default_structurepalace_dir + siblings), or capture writes one dir while recall
  // reads another (the write-only-store disease).
  it("memorySensoriumStructureDir: <XDG>/lararium/sensoriums/memory/structure — mirrors the py default", () => {
    set("LAR_ROOT", undefined);
    set("XDG_DATA_HOME", "/x/data");
    expect(memorySensoriumStructureDir()).toBe(join("/x/data", "lararium", "sensoriums", "memory", "structure"));
  });

  it("the memory sensorium NEVER stands under the spirit's home — the wipe zone made structural", () => {
    set("LAR_ROOT", undefined);
    set("XDG_DATA_HOME", "/x/data");
    expect(memorySensoriumStructureDir().startsWith(larDataHome())).toBe(false);
  });

  it("memorySensoriumFormDir / PersistenceDir: siblings under the one root", () => {
    set("LAR_ROOT", undefined);
    set("XDG_DATA_HOME", "/x/data");
    const root = join("/x/data", "lararium", "sensoriums", "memory");
    expect(memorySensoriumFormDir()).toBe(join(root, "form"));
    expect(memorySensoriumPersistenceDir()).toBe(join(root, "persistence"));
  });

  it("memorySensoriumStructureDir: isolated LAR_ROOT roots under <root>/abide (the py branch)", () => {
    set("LAR_ROOT", "/iso");
    set("XDG_DATA_HOME", undefined);
    expect(memorySensoriumStructureDir()).toBe(join("/iso", "abide", "sensoriums", "memory", "structure"));
  });

  it("mempalaceContentParent: always the upstream-default ~/.mempalace (never the tree)", () => {
    // content-cap-home ruling: content stays at the vendored mempalace's own default, referenced by
    // the memory-sensorium via ABSOLUTE path — it is NOT strangled into our sensorium tree.
    const root = freshRoot();
    set("LAR_ROOT", undefined);
    set("XDG_DATA_HOME", join(root, "xdg"));
    set("HOME", join(root, "home"));
    set("USERPROFILE", join(root, "home"));
    expect(mempalaceContentParent()).toBe(join(root, "home", ".mempalace"));
  });

  it("mempalaceContentParent: XDG_DATA_HOME does NOT relocate content (upstream-external boundary)", () => {
    const root = freshRoot();
    set("LAR_ROOT", undefined);
    set("XDG_DATA_HOME", join(root, "xdg"));
    set("HOME", join(root, "home"));
    set("USERPROFILE", join(root, "home"));
    // even with the sensorium tree present, content stays external at ~/.mempalace (respecting the
    // vendored-sibling boundary — structure/form are ours to strangle, content is not).
    mkdirSync(join(root, "xdg", "lares", "sensoriums", "memory", "content"), { recursive: true });
    expect(mempalaceContentParent()).toBe(join(root, "home", ".mempalace"));
  });
});
