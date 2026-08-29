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
import { join } from "node:path";
import { wireCodexHome } from "../src/codex-wire.js";

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
});
