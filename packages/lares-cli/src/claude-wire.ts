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

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { repoRoot } from "@lararium/mesh/node";

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
  // mempalace's keep-hooks are bash (the submodule's own; we don't edit it) → on
  // native Windows they need Git-for-Windows (which Claude Code already requires for bash).
  { event: "Stop", script: "mempalace/.claude-plugin/hooks/mempal-stop-hook.sh", timeout: 30, runner: "bash" },
  { event: "PreCompact", script: "mempalace/.claude-plugin/hooks/mempal-precompact-hook.sh", timeout: 90, runner: "bash" },
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

  const mcp = (settings.mcpServers ??= {});
  if (mcp["mempalace"] !== undefined) {
    steps.push({ item: "mcp:mempalace", action: "present", detail: "mempalace MCP already registered" });
  } else {
    mcp["mempalace"] = { command: "mempalace-mcp" };
    steps.push({ item: "mcp:mempalace", action: "wired", detail: "mempalace-mcp (must be on PATH; `pip install -e ./mempalace`)" });
    changed = true;
  }

  if (changed) {
    const tmp = settingsPath + ".tmp";
    const serialized = JSON.stringify(settings, null, 2) + "\n";
    writeFileSync(tmp, serialized, "utf8");
    JSON.parse(readFileSync(tmp, "utf8")); // validate before replacing
    renameSync(tmp, settingsPath);
  }

  return { settingsPath, backedUp, changed, steps };
}
