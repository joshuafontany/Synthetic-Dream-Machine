/**
 * wire — what it must never do to a machine that has used AI tools for years and this house for zero
 * minutes.
 *
 * THE FIRST THING A STRANGER RUNS reaches into homes full of their own work: hooks they wrote, MCP
 * servers they configured, instructions they tuned. A wiring that clobbered any of it would be
 * discovered exactly once, by someone who had no reason to trust us yet.
 *
 * ONE SETTING BREAKS THAT RULE, DELIBERATELY. `cleanupPeriodDays` decides how long Claude Code keeps
 * the session files this house harvests, and memory recovers from disk — so a short window there does
 * not cost a preference, it ends remembering. It RISES on every install (operator ruling), and it is
 * the only key here that does.
 *
 * So these tests assert the negative — what SURVIVES — rather than what lands. Every one seeds a home
 * with foreign content first, and every one runs the wire TWICE: the second pass must change nothing,
 * because an operator who runs a command again should not be punished for it.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { wireClaudeHome, CLEANUP_PERIOD_DAYS_FLOOR } from "../src/claude-wire.js";
import { wireCodexHome } from "../src/codex-wire.js";
import { wireCopilotHome } from "../src/copilot-wire.js";

let home: string;
beforeEach(() => { home = mkdtempSync(join(tmpdir(), "stranger-home-")); });
afterEach(() => { rmSync(home, { recursive: true, force: true }); });

/** A settings.json as a long-time Claude Code user actually keeps one. */
const THEIRS = {
  hooks: {
    SessionStart: [{ hooks: [{ type: "command", command: "node", args: ["/home/them/my-own-hook.mjs"], timeout: 5 }] }],
    PreToolUse:   [{ hooks: [{ type: "command", command: "bash /home/them/guard.sh" }] }],
  },
  mcpServers: { "their-server": { command: "npx", args: ["-y", "their-mcp"] } },
  cleanupPeriodDays: 7,
  theirOwnKey: { deeply: { nested: "value" } },
};

// EVERY CLAUDE PASS SHELLS OUT to `claude mcp add`, which costs seconds even against a temp home —
// several of these land within a breath of vitest's 5s default, so the suite carries its own.
describe("a stranger's machine — the wiring keeps what it finds", { timeout: 30_000 }, () => {
  it("★ leaves every foreign hook, server and setting standing ★", async () => {
    mkdirSync(join(home, ".claude"), { recursive: true });
    const settings = join(home, ".claude", "settings.json");
    writeFileSync(settings, JSON.stringify(THEIRS, null, 2));

    await wireClaudeHome({ home });
    const after = JSON.parse(readFileSync(settings, "utf8")) as typeof THEIRS;

    // Their hooks stand — ours may sit beside them, never instead of them.
    const starts = JSON.stringify(after.hooks.SessionStart);
    expect(starts).toContain("my-own-hook.mjs");
    expect(after.hooks.PreToolUse).toEqual(THEIRS.hooks.PreToolUse);
    // An event we never touch keeps its exact shape.
    expect(after.mcpServers).toEqual(THEIRS.mcpServers);
    // A key this house has never heard of survives a round-trip whole.
    expect(after.theirOwnKey).toEqual(THEIRS.theirOwnKey);
  });

  it("★ RAISES a short retention window — memory recovers from those files ★", async () => {
    mkdirSync(join(home, ".claude"), { recursive: true });
    const settings = join(home, ".claude", "settings.json");
    writeFileSync(settings, JSON.stringify(THEIRS, null, 2));

    await wireClaudeHome({ home });
    // THE ONE SETTING THAT DOES NOT YIELD (operator ruling). Their 7 days would delete the session
    // files the mempalace harvests, so a low value here does not cost a convenience — it ends the
    // house's ability to remember. It rises on every install.
    const after = JSON.parse(readFileSync(settings, "utf8")) as typeof THEIRS;
    expect(after.cleanupPeriodDays).toBe(CLEANUP_PERIOD_DAYS_FLOOR);
    // And it stays surgical: nothing else of theirs moved with it.
    expect(after.mcpServers).toEqual(THEIRS.mcpServers);
    expect(after.theirOwnKey).toEqual(THEIRS.theirOwnKey);
  });

  it("★ leaves a LONGER window alone — more retention serves the same purpose better ★", async () => {
    mkdirSync(join(home, ".claude"), { recursive: true });
    const settings = join(home, ".claude", "settings.json");
    writeFileSync(settings, JSON.stringify({ ...THEIRS, cleanupPeriodDays: CLEANUP_PERIOD_DAYS_FLOOR * 2 }, null, 2));

    await wireClaudeHome({ home });
    expect((JSON.parse(readFileSync(settings, "utf8")) as typeof THEIRS).cleanupPeriodDays)
      .toBe(CLEANUP_PERIOD_DAYS_FLOOR * 2);
  });

  it("★ a second run changes nothing — idempotent on a foreign home too ★", async () => {
    mkdirSync(join(home, ".claude"), { recursive: true });
    const settings = join(home, ".claude", "settings.json");
    writeFileSync(settings, JSON.stringify(THEIRS, null, 2));

    await wireClaudeHome({ home });
    const once = readFileSync(settings, "utf8");
    const second = await wireClaudeHome({ home });
    expect(readFileSync(settings, "utf8")).toBe(once);
    expect(second.changed).toBe(false);
  });

  it("★ backs the file up before touching it ★", async () => {
    mkdirSync(join(home, ".claude"), { recursive: true });
    const settings = join(home, ".claude", "settings.json");
    writeFileSync(settings, JSON.stringify(THEIRS, null, 2));

    await wireClaudeHome({ home });
    expect(existsSync(settings + ".bak")).toBe(true);
    expect(JSON.parse(readFileSync(settings + ".bak", "utf8"))).toEqual(THEIRS);
  });

  it("★ refuses a settings.json it cannot parse, rather than replacing it ★", async () => {
    mkdirSync(join(home, ".claude"), { recursive: true });
    const settings = join(home, ".claude", "settings.json");
    const broken = "{ this is not json, and it is THEIR file";
    writeFileSync(settings, broken);

    // A file we cannot read is a file we must not rewrite: the cure names itself and their bytes stand.
    await expect(wireClaudeHome({ home })).rejects.toThrow(/not valid JSON/);
    expect(readFileSync(settings, "utf8")).toBe(broken);
  });

  it("★ keeps a hand-written AGENTS.md — the pointer arrives, the prose stays ★", () => {
    mkdirSync(join(home, ".codex"), { recursive: true });
    const agents = join(home, ".codex", "AGENTS.md");
    const theirs = "# My instructions\n\n- always use tabs\n- never mention pineapple\n";
    writeFileSync(agents, theirs);

    wireCodexHome({ home });
    const after = readFileSync(agents, "utf8");
    expect(after).toContain("- always use tabs");
    expect(after).toContain("- never mention pineapple");
    expect(after).toContain("# My instructions");

    wireCodexHome({ home });
    expect(readFileSync(agents, "utf8")).toBe(after);
  });

  it("★ a home that does not exist is nothing to wire, never a failure ★", () => {
    // A stranger who has never installed Codex or Copilot must not meet an error for it.
    for (const r of [wireCodexHome({ home }), wireCopilotHome({ home })]) {
      expect(r.changed).toBe(false);
      expect(r.steps.every((s) => s.action !== "wired")).toBe(true);
    }
    expect(existsSync(join(home, ".codex"))).toBe(false);
    expect(existsSync(join(home, ".copilot"))).toBe(false);
  });
});
