/**
 * codex-wire — the boot pointer Codex reads at every wake.
 *
 * ~/.codex/AGENTS.md seats the house for the Codex CLI and the VS Code extension alike. It rots the
 * one way nothing catches: a pointer aimed at a file that no longer stands fails SILENTLY — the
 * harness wakes, finds nothing, and reports a clean start. So the wire re-aims it rather than only
 * seating it when absent, and this pins that.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { wireCodexHome } from "../src/codex-wire.js";
import { tendBootPointer, asInclude, asLink, tendRepoAdapters, BOOT_CARRIER } from "../src/boot-pointer.js";

const CARRIER = "bags/lares/ha.ka.ba/lares/api/noosphere-boot.mem";
let home: string;
const step = (r: ReturnType<typeof wireCodexHome>) => r.steps.find((s) => s.item === "AGENTS.md")!;

beforeEach(() => { home = mkdtempSync(join(tmpdir(), "codex-home-")); });
afterEach(() => { rmSync(home, { recursive: true, force: true }); });

describe("codex-wire — the boot pointer", () => {
  it("says nothing about a home that does not exist", () => {
    const r = wireCodexHome({ home });
    expect(r.steps.some((s) => s.item === "codex" && s.action === "missing-script")).toBe(true);
  });

  it("seats the pointer at the carrier, and reports the write", () => {
    mkdirSync(join(home, ".codex"));
    const r = wireCodexHome({ home });
    expect(step(r).action).toBe("wired");
    expect(r.changed).toBe(true);
    expect(readFileSync(join(home, ".codex", "AGENTS.md"), "utf8")).toContain(CARRIER);
  });

  it("leaves a standing pointer alone — a second wake writes nothing", () => {
    mkdirSync(join(home, ".codex"));
    wireCodexHome({ home });
    const r = wireCodexHome({ home });
    expect(step(r).action).toBe("present");
    expect(r.changed).toBe(false);
  });

  // The failure this whole step exists for: a pointer that still parses and names a dead file.
  it("re-aims a pointer that names something else, and keeps what it replaced", () => {
    mkdirSync(join(home, ".codex"));
    const agents = join(home, ".codex", "AGENTS.md");
    writeFileSync(agents, "-> [noosphere-boot.mem](/gone/noosphere-boot.md)\n");
    const r = wireCodexHome({ home });
    expect(step(r).action).toBe("wired");
    expect(readFileSync(agents, "utf8")).toContain(CARRIER);
    expect(existsSync(agents + ".bak")).toBe(true);
  });

  it("★ a re-aim moves the POINTER and nothing else — the body never doubles ★", () => {
    // THE REPO ADAPTERS ARE WHERE THIS BITES. A harness home renders a bare pointer line, so swapping
    // the whole render there costs nothing; a repo adapter renders the pointer AND its thin-file prose,
    // because an ABSENT file wants all of it. A standing file already carries that prose, so a re-aim
    // that swapped in the whole render left two copies — and three after a third wake.
    const repo = mkdtempSync(join(tmpdir(), "adapters-"));
    // The tender refuses to aim at a carrier that is not there, so the fixture stands one.
    mkdirSync(join(repo, dirname(BOOT_CARRIER)), { recursive: true });
    writeFileSync(join(repo, BOOT_CARRIER), "carrier\n");
    const claude = join(repo, "CLAUDE.md");
    writeFileSync(claude, "@old/path/noosphere-boot.md\n\n## Claude Adapter Surface\n\n- operator prose\n");

    tendRepoAdapters(repo);
    const once = readFileSync(claude, "utf8");
    expect(once).toContain(BOOT_CARRIER);
    expect(once.split("## Claude Adapter Surface").length - 1).toBe(1);
    expect(once).toContain("- operator prose");

    // And it converges: a second wake finds the pointer standing and writes nothing at all.
    tendRepoAdapters(repo);
    expect(readFileSync(claude, "utf8")).toBe(once);
    rmSync(repo, { recursive: true, force: true });
  });
});

describe("boot-pointer — one law, three spellings", () => {
  it("spells the include form for a harness that expands one, and the link form for one that follows one", () => {
    const dir = mkdtempSync(join(tmpdir(), "pointer-"));
    const inc = join(dir, "CLAUDE.md"), lnk = join(dir, "AGENTS.md");
    tendBootPointer(inc, "/abs/carrier.mem", asInclude, "CLAUDE.md");
    tendBootPointer(lnk, "/abs/carrier.mem", asLink("-> "), "AGENTS.md");
    expect(readFileSync(inc, "utf8")).toBe("@/abs/carrier.mem\n");
    expect(readFileSync(lnk, "utf8")).toBe("-> [noosphere-boot.mem](/abs/carrier.mem)\n");
    rmSync(dir, { recursive: true, force: true });
  });

  // --init creates what it does not find, home directory included.
  it("creates the directory a pointer needs", () => {
    const dir = mkdtempSync(join(tmpdir(), "pointer-"));
    const deep = join(dir, "User", "prompts", "lares-boot.instructions.md");
    const s = tendBootPointer(deep, "/abs/carrier.mem", asLink("-> "));
    expect(s.action).toBe("wired");
    expect(existsSync(deep)).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("boot-pointer — a re-aim keeps everything that is not the pointer", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "reaim-")); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  // The hazard: these files carry operator prose, and a whole-file rewrite would take it.
  it("swaps the seed line and leaves the operator's own prose standing", () => {
    const f = join(dir, "CLAUDE.md");
    writeFileSync(f, "@/gone/noosphere-boot.md\n\n## My notes\n\n- never lose this line\n");
    const s = tendBootPointer(f, "/abs/carrier.mem", asInclude, "CLAUDE.md");
    expect(s.action).toBe("wired");
    const after = readFileSync(f, "utf8");
    expect(after).toContain("@/abs/carrier.mem");
    expect(after).toContain("- never lose this line");
    expect(after).not.toContain("/gone/");
    expect(readFileSync(f + ".bak", "utf8")).toContain("/gone/");
  });

  it("heads a file that names no seed at all, so the pointer is read before the prose it governs", () => {
    const f = join(dir, "AGENTS.md");
    writeFileSync(f, "## Adapter Surface\n\n- thin\n");
    tendBootPointer(f, "/abs/carrier.mem", asLink("-> "), "AGENTS.md");
    const lines = readFileSync(f, "utf8").split("\n");
    expect(lines[0]).toBe("-> [noosphere-boot.mem](/abs/carrier.mem)");
    expect(readFileSync(f, "utf8")).toContain("## Adapter Surface");
  });
});

describe("boot-pointer — the repo's own adapters", () => {
  it("aims all four at the carrier, repo-relative so every clone reads", () => {
    const steps = tendRepoAdapters(process.cwd().replace(/packages.*$/, ""));
    expect(steps.map((s) => s.item)).toEqual(
      ["CLAUDE.md", "AGENTS.md", "copilot-instructions.md", ".github/copilot-instructions.md"],
    );
    expect(steps.every((s) => s.action === "present")).toBe(true);
    expect(BOOT_CARRIER.startsWith("bags/")).toBe(true);
  });
});
