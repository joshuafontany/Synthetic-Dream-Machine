/**
 * claude-wire — `lares wake --claude`: wire the Lares + mempalace plugin hooks
 * (and the mempalace MCP server) into the operator's ~/.claude/settings.json so a
 * Claude harness auto-wakes (SessionStart) and auto-keeps verbatim memory
 * (Stop / PreCompact), with recall via the mempalace MCP.
 *
 * Pono shape: a DEEP MERGE that PRESERVES everything already in settings.json (the
 * operator's permissions, model, theme, …). Idempotent — a hook already pointing at
 * our script is left untouched. The hooks reference the repo's plugin scripts by
 * ABSOLUTE path (`${CLAUDE_PLUGIN_ROOT}` does not expand in settings.json), so the
 * plugin files stay in the repo; home just points at them. A `.bak` is written
 * before any change, and the result is JSON-validated before it replaces the file.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, renameSync, openSync, closeSync, rmSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";
import { repoRoot } from "@lararium/mesh/node";

/**
 * Acquire an exclusive write-lock (git-lockfile pattern: O_CREAT|O_EXCL) to serialize
 * concurrent writers — Claude's home JSON has a logged corruption-under-concurrency
 * bug (anthropics/claude-code#28842), and parallel sessions share this tree. Steals a
 * stale lock (>30s, a crashed holder); throws after a bounded wait rather than corrupt.
 */
function acquireLock(lockPath: string): void {
  const sab = new Int32Array(new SharedArrayBuffer(4));
  for (let i = 0; i < 20; i++) {
    try {
      closeSync(openSync(lockPath, "wx"));
      return;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      try {
        if (Date.now() - statSync(lockPath).mtimeMs > 30_000) { rmSync(lockPath, { force: true }); continue; }
      } catch { /* lock vanished — retry */ }
      Atomics.wait(sab, 0, 0, 100);
    }
  }
  throw new Error(`${lockPath} held by another writer — another \`lares wake --claude\` is running; retry shortly`);
}

/** Resolve the mempalace-mcp executable's absolute path (prefer ~/.local/bin, then PATH). */
function resolveMempalaceMcp(): string | null {
  const win = process.platform === "win32";
  const exe = win ? "mempalace-mcp.exe" : "mempalace-mcp";
  const dirs = [join(homedir(), ".local", "bin"), ...(process.env["PATH"] ?? "").split(win ? ";" : ":")];
  for (const d of dirs) {
    if (!d) continue;
    const p = join(d, exe);
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Register the mempalace MCP in the store Claude Code actually reads (~/.claude.json,
 * via `claude mcp add`) — NOT settings.json, which Claude ignores for mcpServers.
 * Idempotent (skips if already registered); graceful if the `claude` CLI is absent.
 */
function registerMempalaceMcp(): ClaudeWireStep {
  const mcpCmd = resolveMempalaceMcp();
  if (mcpCmd === null) {
    return { item: "mcp:mempalace", action: "missing-script", detail: "mempalace-mcp not on PATH — run `lares wake --install`" };
  }
  const got = spawnSync("claude", ["mcp", "get", "mempalace"], { encoding: "utf8", timeout: 10_000 });
  if (got.error !== undefined) {
    return { item: "mcp:mempalace", action: "missing-script", detail: `\`claude\` CLI not found — register: claude mcp add --scope user mempalace -- ${mcpCmd}` };
  }
  if (got.status === 0) {
    return { item: "mcp:mempalace", action: "present", detail: "already registered (claude mcp / ~/.claude.json)" };
  }
  const r = spawnSync("claude", ["mcp", "add", "--scope", "user", "mempalace", "--", mcpCmd], { encoding: "utf8", timeout: 15_000 });
  return r.status === 0
    ? { item: "mcp:mempalace", action: "wired", detail: `claude mcp add — ${mcpCmd}` }
    : { item: "mcp:mempalace", action: "missing-script", detail: `claude mcp add failed: ${(r.stderr ?? "").trim().slice(0, 80)}` };
}

interface HookCommand {
  readonly type: string;
  readonly command: string;
  readonly args?: string[];
  readonly timeout?: number;
}
interface HookGroup {
  hooks?: HookCommand[];
  matcher?: string;
}
interface ClaudeSettings {
  hooks?: Record<string, HookGroup[]>;
  mcpServers?: Record<string, { command: string; args?: string[] }>;
  // Index signature preserves every other key (permissions, model, …) on re-serialize.
  [key: string]: unknown;
}

interface HookSpec {
  readonly event: string;
  readonly script: string; // repo-relative path to the hook
  readonly timeout: number;
  /** node = exec-form, fully cross-platform; bash = needs Git-for-Windows on native Windows. */
  readonly runner: "node" | "bash";
}

const HOOK_SPECS: readonly HookSpec[] = [
  // Our wake hook is node (exec-form) → no shell, identical on Windows + Unix.
  { event: "SessionStart", script: "packages/lares-cli/.claude-plugin/hooks/lares-wake-hook.mjs", timeout: 15, runner: "node" },
  // OUR two-leg ingest hook (per-project mine + lar_* declared writeback), NOT the
  // submodule's hardcoded `--wing sessions` hook. mempalace's own plugin hooks still
  // fire, but `hooks.auto_save=false` (set by `--init`) makes them no-ops, so only
  // ours mines — into the right per-project wing. Stop catches mid-session; SessionEnd
  // finalizes. bash → needs Git-for-Windows on native Windows (Claude Code requires it).
  { event: "Stop", script: "packages/lares-cli/.claude-plugin/hooks/lares-mempalace-ingest-hook.sh", timeout: 30, runner: "bash" },
  { event: "SessionEnd", script: "packages/lares-cli/.claude-plugin/hooks/lares-mempalace-ingest-hook.sh", timeout: 60, runner: "bash" },
];

export type WireAction = "wired" | "present" | "missing-script";

export interface ClaudeWireStep {
  readonly item: string;
  readonly action: WireAction;
  readonly detail: string;
}

export interface ClaudeWireResult {
  readonly settingsPath: string;
  readonly backedUp: boolean;
  readonly changed: boolean;
  readonly steps: readonly ClaudeWireStep[];
}

/** Wire the plugin hooks + mempalace MCP into ~/.claude/settings.json. Idempotent; preserves existing settings. */
export function wireClaudeHome(opts: { home?: string } = {}): ClaudeWireResult {
  const home = opts.home ?? homedir();
  const claudeDir = join(home, ".claude");
  mkdirSync(claudeDir, { recursive: true });
  const settingsPath = join(claudeDir, "settings.json");
  const lockPath = settingsPath + ".lock";
  acquireLock(lockPath);
  try {
    return wireUnderLock(settingsPath);
  } finally {
    rmSync(lockPath, { force: true });
  }
}

/** The read-modify-write body, run under the settings.json lock. */
function wireUnderLock(settingsPath: string): ClaudeWireResult {
  let settings: ClaudeSettings = {};
  let backedUp = false;
  if (existsSync(settingsPath)) {
    let raw: string;
    try {
      raw = readFileSync(settingsPath, "utf8");
      settings = JSON.parse(raw) as ClaudeSettings;
    } catch {
      throw new Error(`${settingsPath} is not valid JSON — refusing to overwrite (fix it, then re-run \`lares wake --claude\`)`);
    }
    copyFileSync(settingsPath, settingsPath + ".bak");
    backedUp = true;
  }

  const steps: ClaudeWireStep[] = [];
  let changed = false;

  const hooks = (settings.hooks ??= {});
  for (const spec of HOOK_SPECS) {
    // Forward-slash the absolute path: works in JSON, node, and bash on every OS
    // (Windows backslashes break bash-arg + JSON-string handling).
    const abs = join(repoRoot, spec.script).replace(/\\/g, "/");
    const base = spec.script.slice(spec.script.lastIndexOf("/") + 1);
    if (!existsSync(abs)) {
      steps.push({ item: spec.event, action: "missing-script", detail: `${abs} not found — skipped` });
      continue;
    }
    // No chmod: node/bash invoke the file by path, so +x is not required — and
    // chmod'ing would dirty the read-only mempalace submodule.
    const groups = (hooks[spec.event] ??= []);
    const mentions = (h: HookCommand): boolean =>
      (typeof h.command === "string" && h.command.includes(base)) ||
      (Array.isArray(h.args) && h.args.some((a) => typeof a === "string" && a.includes(base)));
    const already = groups.some((g) => g.hooks?.some(mentions));
    if (already) {
      steps.push({ item: spec.event, action: "present", detail: `${base} already wired (${spec.runner})` });
      continue;
    }
    const entry: HookCommand =
      spec.runner === "node"
        ? { type: "command", command: "node", args: [abs], timeout: spec.timeout }
        : { type: "command", command: `bash "${abs}"`, timeout: spec.timeout };
    groups.push({ hooks: [entry] });
    steps.push({ item: spec.event, action: "wired", detail: `${spec.runner}: ${abs}` });
    changed = true;
  }

  // MCP lives in ~/.claude.json (via `claude mcp add`), NOT settings.json — Claude
  // ignores mcpServers here. Clean up any dead settings.json entry from earlier wiring,
  // then register through the real store.
  if (settings.mcpServers !== undefined && settings.mcpServers["mempalace"] !== undefined) {
    delete settings.mcpServers["mempalace"];
    changed = true;
  }
  steps.push(registerMempalaceMcp());

  if (changed) {
    const tmp = settingsPath + ".tmp";
    const serialized = JSON.stringify(settings, null, 2) + "\n";
    writeFileSync(tmp, serialized, "utf8");
    JSON.parse(readFileSync(tmp, "utf8")); // validate before replacing
    renameSync(tmp, settingsPath);
  }

  return { settingsPath, backedUp, changed, steps };
}
