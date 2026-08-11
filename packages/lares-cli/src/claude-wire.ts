/**
 * claude-wire — `lares wake --claude`: wire the Lares hooks into ~/.claude/settings.json (so a Claude
 * harness auto-wakes on SessionStart and auto-keeps verbatim memory on Stop/SessionEnd) and register
 * the LARES MCP seat in ~/.claude.json (so recall reaches the memory sensorium THROUGH the lares
 * house). Any stale `mempalace` MCP registration is reaped in the same pass — a harness holding its
 * own palace holder reaches past the node into the store, and N sessions on one Chroma index is the
 * contention that truncated the HNSW segment.
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
import { resolveLaresMcp } from "./mcp-resolve.js";

/**
 * Acquire an exclusive write-lock (git-lockfile pattern: O_CREAT|O_EXCL) to serialize
 * concurrent writers — Claude's home JSON has a logged corruption-under-concurrency
 * bug (anthropics/claude-code#28842), and parallel sessions share this tree. Steals a
 * stale lock (>30s, a crashed holder); throws after a bounded wait rather than corrupt.
 */
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function acquireLock(lockPath: string): Promise<void> {
  for (let i = 0; i < 20; i++) {
    try {
      closeSync(openSync(lockPath, "wx"));
      return;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      try {
        if (Date.now() - statSync(lockPath).mtimeMs > 30_000) { rmSync(lockPath, { force: true }); continue; }
      } catch { /* lock vanished — retry */ }
      await sleep(100); // async backoff — never blocks the main thread (no Atomics.wait / SharedArrayBuffer)
    }
  }
  throw new Error(`${lockPath} held by another writer — another \`lares wake --claude\` is running; retry shortly`);
}

/**
 * Reap a stale `mempalace` MCP from ~/.claude.json. A harness holding its own palace holder reaches
 * PAST the node into the store — N sessions, N writers, one Chroma index. The `lares` seat below
 * replaces it; this removes what an older wiring left, so the decouple heals on the next wake.
 */
function reapMempalaceMcp(): ClaudeWireStep {
  const got = spawnSync("claude", ["mcp", "get", "mempalace"], { encoding: "utf8", timeout: 10_000 });
  if (got.error !== undefined) {
    return { item: "mcp:mempalace", action: "absent", detail: "`claude` CLI not found — nothing to reap" };
  }
  if (got.status !== 0) {
    return { item: "mcp:mempalace", action: "absent", detail: "not registered (memory rides the lares seat)" };
  }
  const r = spawnSync("claude", ["mcp", "remove", "--scope", "user", "mempalace"], { encoding: "utf8", timeout: 15_000 });
  return r.status === 0
    ? { item: "mcp:mempalace", action: "reaped", detail: "removed a stale mempalace MCP — harnesses reach memory through lares now" }
    : { item: "mcp:mempalace", action: "missing-script", detail: `claude mcp remove failed: ${(r.stderr ?? "").trim().slice(0, 80)}` };
}

/**
 * Register the LARES MCP seat in the store Claude Code actually reads (~/.claude.json, via
 * `claude mcp add`) — NOT settings.json, which Claude ignores for mcpServers.
 *
 * The lares house owns this seat: the harness reaches memory THROUGH it (recall · recall_structure ·
 * the sensorium lifecycle — the list lives in `lares_mcp.py`, never transcribed) rather than opening a palace of
 * its own. One owner, one writer.
 *
 * Idempotent by CONVERGENCE, never by presence: an aligned seat passes untouched, a drifted one re-aims
 * at the resolved script. Graceful when the `claude` CLI is absent.
 */
function registerLaresMcp(): ClaudeWireStep {
  const mcp = resolveLaresMcp();
  if (mcp === null) {
    return { item: "mcp:lares", action: "missing-script", detail: "lares_mcp.py / python / sensorium not found — run `lares wake --init`" };
  }
  const got = spawnSync("claude", ["mcp", "get", "lares"], { encoding: "utf8", timeout: 10_000 });
  if (got.error !== undefined) {
    return { item: "mcp:lares", action: "missing-script", detail: "`claude` CLI not found — cannot register the lares seat" };
  }
  // A registration STANDING never proves it points ANYWHERE real. Presence-idempotence lets a moved
  // holder script leave this seat aimed at a deleted file while the wire reports success — the harness
  // door shuts silently and every `wake --init` after it skips the cure. So converge on the RESOLVED
  // spawn, never on mere presence: a seat whose command/script drifts from what resolves now gets
  // RE-POINTED (remove → re-add), and an aligned seat passes untouched.
  let repointed = false;
  if (got.status === 0) {
    const registered = String(got.stdout ?? "");
    const aligned = registered.includes(mcp.command) && mcp.args.every((a) => registered.includes(a));
    if (aligned) {
      return { item: "mcp:lares", action: "present", detail: "registered + aimed at the resolved sensorium seat" };
    }
    const rm = spawnSync("claude", ["mcp", "remove", "-s", "user", "lares"], { encoding: "utf8", timeout: 10_000 });
    if (rm.status !== 0) {
      return { item: "mcp:lares", action: "missing-script", detail: `stale seat drifted; \`claude mcp remove\` failed: ${(rm.stderr ?? "").trim().slice(0, 80)}` };
    }
    repointed = true;   // the stale seat cleared — the add below re-aims it at the resolved script
  }
  // Arg order matters: the NAME must precede `-e`. `claude mcp add`'s env flag is VARIADIC, so a
  // trailing positional after it gets swallowed as another KEY=VAL and rejected ("Invalid environment
  // variable format: lares"). The documented form is `claude mcp add <name> -e K=V -- <cmd> [args]`.
  const env = Object.entries(mcp.env).flatMap(([k, v]) => ["-e", `${k}=${v}`]);
  const r = spawnSync("claude", ["mcp", "add", "--scope", "user", "lares", ...env, "--", mcp.command, ...mcp.args], { encoding: "utf8", timeout: 15_000 });
  return r.status === 0
    ? { item: "mcp:lares", action: "wired", detail: `${repointed ? "re-aimed a drifted seat" : "claude mcp add"} — the memory sensorium via ${mcp.args[0] ?? "lares_mcp.py"}` }
    : { item: "mcp:lares", action: "missing-script", detail: `claude mcp add failed: ${(r.stderr ?? "").trim().slice(0, 80)}` };
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

/**
 * The retention floor for `cleanupPeriodDays` — how many days Claude Code keeps a session
 * file before deleting it at startup (docs: default 30, minimum 1, `0` REJECTED as invalid,
 * so a large finite number is the only "keep forever" idiom). 99999 ≈ 274 years.
 *
 * Those session files (~/.claude/projects/…) ARE the mempalace's verbatim-memory harvest
 * source; a low cleanup window evaporates the raw ground before the ingest hook mines it,
 * so `lares wake --claude` raises the floor as part of standing the memory shore.
 */
export const CLEANUP_PERIOD_DAYS_FLOOR = 99999;

export type WireAction = "wired" | "present" | "missing-script" | "reaped" | "absent";

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
export async function wireClaudeHome(opts: { home?: string } = {}): Promise<ClaudeWireResult> {
  const home = opts.home ?? homedir();
  const claudeDir = join(home, ".claude");
  mkdirSync(claudeDir, { recursive: true });
  const settingsPath = join(claudeDir, "settings.json");
  const lockPath = settingsPath + ".lock";
  await acquireLock(lockPath);
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

  // Retention floor — keep the session files (the mempalace's harvest source) from
  // evaporating. SET-IF-ABSENT only: an operator who already chose a value keeps it
  // (don't-clobber); `lares cleanup-days` raises an existing-but-low value explicitly.
  if (settings["cleanupPeriodDays"] === undefined) {
    settings["cleanupPeriodDays"] = CLEANUP_PERIOD_DAYS_FLOOR;
    steps.push({ item: "cleanupPeriodDays", action: "wired", detail: `set ${CLEANUP_PERIOD_DAYS_FLOOR} (session files kept ~forever — the mempalace harvest source)` });
    changed = true;
  } else {
    const cur = settings["cleanupPeriodDays"];
    const low = typeof cur === "number" && cur < CLEANUP_PERIOD_DAYS_FLOOR;
    steps.push({ item: "cleanupPeriodDays", action: "present", detail: low ? `${String(cur)} days (below floor — raise with \`lares cleanup-days\`)` : `${String(cur)} days` });
  }

  // Memory reaches the harness through the LARES seat, never a palace holder of the harness's own.
  // Reap any stale mempalace registration from both stores (the dead settings.json key here, then
  // ~/.claude.json via the `claude` CLI), then register the lares MCP in the seat it vacates.
  if (settings.mcpServers !== undefined && settings.mcpServers["mempalace"] !== undefined) {
    delete settings.mcpServers["mempalace"];
    changed = true;
  }
  steps.push(reapMempalaceMcp());
  steps.push(registerLaresMcp());

  if (changed) {
    const tmp = settingsPath + ".tmp";
    const serialized = JSON.stringify(settings, null, 2) + "\n";
    writeFileSync(tmp, serialized, "utf8");
    JSON.parse(readFileSync(tmp, "utf8")); // validate before replacing
    renameSync(tmp, settingsPath);
  }

  return { settingsPath, backedUp, changed, steps };
}

/** Resolve ~/.claude/settings.json for the given (or default) home. */
function claudeSettingsPath(home?: string): string {
  return join(home ?? homedir(), ".claude", "settings.json");
}

/**
 * Read the current `cleanupPeriodDays` from ~/.claude/settings.json (pure inspection,
 * no lock). Returns the number, or null if unset / the file is absent-or-unreadable —
 * a null reads as "Claude's 30-day default applies" at the surface.
 */
export function readClaudeCleanupPeriod(opts: { home?: string } = {}): number | null {
  const path = claudeSettingsPath(opts.home);
  if (!existsSync(path)) return null;
  try {
    const s = JSON.parse(readFileSync(path, "utf8")) as ClaudeSettings;
    const v = s["cleanupPeriodDays"];
    return typeof v === "number" ? v : null;
  } catch {
    return null;
  }
}

export interface CleanupPeriodResult {
  readonly settingsPath: string;
  readonly previous: number | null;
  readonly value: number;
  readonly changed: boolean;
}

/**
 * Set `cleanupPeriodDays` in ~/.claude/settings.json EXPLICITLY (operator intent — forces
 * the value even over an existing lower one, unlike the set-if-absent wire step). Same
 * lock + backup + validate-before-replace discipline as the wire flow. Rejects a value
 * below Claude's minimum of 1 (0 is invalid to Claude, and would evaporate everything).
 */
export async function setClaudeCleanupPeriod(days: number, opts: { home?: string } = {}): Promise<CleanupPeriodResult> {
  if (!Number.isInteger(days) || days < 1) {
    throw new Error(`cleanupPeriodDays must be a whole number ≥ 1 (Claude rejects 0); got ${days}. Use a large number like ${CLEANUP_PERIOD_DAYS_FLOOR} to keep session files ~forever.`);
  }
  const settingsPath = claudeSettingsPath(opts.home);
  mkdirSync(join(opts.home ?? homedir(), ".claude"), { recursive: true });
  const lockPath = settingsPath + ".lock";
  await acquireLock(lockPath);
  try {
    let settings: ClaudeSettings = {};
    if (existsSync(settingsPath)) {
      try {
        settings = JSON.parse(readFileSync(settingsPath, "utf8")) as ClaudeSettings;
      } catch {
        throw new Error(`${settingsPath} is not valid JSON — refusing to overwrite (fix it, then re-run).`);
      }
      copyFileSync(settingsPath, settingsPath + ".bak");
    }
    const prev = typeof settings["cleanupPeriodDays"] === "number" ? (settings["cleanupPeriodDays"] as number) : null;
    settings["cleanupPeriodDays"] = days;
    const tmp = settingsPath + ".tmp";
    writeFileSync(tmp, JSON.stringify(settings, null, 2) + "\n", "utf8");
    JSON.parse(readFileSync(tmp, "utf8")); // validate before replacing
    renameSync(tmp, settingsPath);
    return { settingsPath, previous: prev, value: days, changed: prev !== days };
  } finally {
    rmSync(lockPath, { force: true });
  }
}
