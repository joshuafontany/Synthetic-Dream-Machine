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
  readonly script: string; // repo-relative path to the hook .sh
  readonly timeout: number;
}

const HOOK_SPECS: readonly HookSpec[] = [
  { event: "SessionStart", script: "packages/lares-cli/.claude-plugin/hooks/lares-wake-hook.sh", timeout: 15 },
  { event: "Stop", script: "mempalace/.claude-plugin/hooks/mempal-stop-hook.sh", timeout: 30 },
  { event: "PreCompact", script: "mempalace/.claude-plugin/hooks/mempal-precompact-hook.sh", timeout: 90 },
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
    const abs = join(repoRoot, spec.script);
    const base = spec.script.slice(spec.script.lastIndexOf("/") + 1);
    if (!existsSync(abs)) {
      steps.push({ item: spec.event, action: "missing-script", detail: `${abs} not found — skipped` });
      continue;
    }
    // No chmod: the hooks run via `bash "<path>"` (settings.json + hooks.json), so +x
    // is not required — and chmod'ing would dirty the read-only mempalace submodule.
    const groups = (hooks[spec.event] ??= []);
    const already = groups.some((g) => g.hooks?.some((h) => typeof h.command === "string" && h.command.includes(base)));
    if (already) {
      steps.push({ item: spec.event, action: "present", detail: `${base} already wired` });
    } else {
      groups.push({ hooks: [{ type: "command", command: `bash "${abs}"`, timeout: spec.timeout }] });
      steps.push({ item: spec.event, action: "wired", detail: `bash "${abs}"` });
      changed = true;
    }
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
