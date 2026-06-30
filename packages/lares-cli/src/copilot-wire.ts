/**
 * copilot-wire — `lares wake --copilot`: wire the mempalace MCP (recall) and the
 * Lares session-ingest hook into the GitHub Copilot CLI home (~/.copilot/).
 *
 * Copilot CLI (GA 2026-02) reads JSON config, like Claude:
 *   - MCP   → ~/.copilot/mcp-config.json   ({ mcpServers: { name: {type,command,args,tools} } })
 *   - hooks → ~/.copilot/hooks/<file>.json ({ version:1, hooks: { sessionEnd:[…] } })
 * Its sessionEnd payload carries { sessionId, cwd } but NO transcript_path — the
 * conversation lives in the global SQLite store ~/.copilot/session-store.db
 * (events.jsonl is gone, CLI 1.0.6x), which the harness-aware ingest hook resolves
 * + normalizes via copilot_sqlite_normalize.py. (Bug github/copilot-cli#991:
 * sessionEnd fires per-prompt in interactive mode → the ingest stays idempotent on lar_hv.)
 *
 * Idempotent deep-merge, backs up, preserves existing config — same discipline as
 * claude-wire.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { repoRoot } from "@lararium/mesh/node";
import { resolveMempalaceMcp, type WireAction } from "./mcp-resolve.js";

const INGEST_HOOK = "packages/lares-cli/.claude-plugin/hooks/lares-mempalace-ingest-hook.sh";

export interface CopilotWireStep {
  readonly item: string;
  readonly action: WireAction;
  readonly detail: string;
}
export interface CopilotWireResult {
  readonly home: string;
  readonly changed: boolean;
  readonly steps: readonly CopilotWireStep[];
}

interface McpConfig { mcpServers?: Record<string, unknown>; [k: string]: unknown }
interface HooksFile { version?: number; hooks?: Record<string, unknown[]>; [k: string]: unknown }

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, "utf8")) as T; } catch { return fallback; }
}

/** Wire mempalace MCP + the ingest hook into ~/.copilot. Idempotent. */
export function wireCopilotHome(opts: { home?: string } = {}): CopilotWireResult {
  const home = opts.home ?? homedir();
  const dir = join(home, ".copilot");
  if (!existsSync(dir)) return { home: dir, changed: false, steps: [{ item: "copilot", action: "missing-script", detail: `${dir} absent — Copilot CLI not set up here` }] };

  const steps: CopilotWireStep[] = [];
  let changed = false;

  // 1. MCP server → ~/.copilot/mcp-config.json
  const mcpCmd = resolveMempalaceMcp();
  const mcpPath = join(dir, "mcp-config.json");
  if (mcpCmd === null) {
    steps.push({ item: "mcp:mempalace", action: "missing-script", detail: "mempalace-mcp not on PATH — run `lares wake --init`" });
  } else {
    const cfg = readJson<McpConfig>(mcpPath, {});
    const servers = (cfg.mcpServers ??= {});
    if (servers["mempalace"] !== undefined) {
      steps.push({ item: "mcp:mempalace", action: "present", detail: "already in mcp-config.json" });
    } else {
      servers["mempalace"] = { type: "local", command: mcpCmd, args: [], tools: ["*"] };
      if (existsSync(mcpPath)) copyFileSync(mcpPath, mcpPath + ".bak");
      writeFileSync(mcpPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
      steps.push({ item: "mcp:mempalace", action: "wired", detail: `mcp-config.json — ${mcpCmd}` });
      changed = true;
    }
  }

  // 2. sessionEnd ingest hook → ~/.copilot/hooks/lares.json
  const hookAbs = join(repoRoot, INGEST_HOOK).replace(/\\/g, "/");
  const hooksDir = join(dir, "hooks");
  const hooksFile = join(hooksDir, "lares.json");
  if (!existsSync(hookAbs)) {
    steps.push({ item: "sessionEnd", action: "missing-script", detail: `${hookAbs} not found — skipped` });
  } else {
    const hf = readJson<HooksFile>(hooksFile, { version: 1, hooks: {} });
    const list = ((hf.hooks ??= {})["sessionEnd"] ??= []) as Array<{ bash?: string }>;
    if (list.some((h) => typeof h.bash === "string" && h.bash.includes("lares-mempalace-ingest-hook"))) {
      steps.push({ item: "sessionEnd", action: "present", detail: "ingest hook already wired" });
    } else {
      list.push({ type: "command", bash: hookAbs, timeoutSec: 60 } as Record<string, unknown>);
      mkdirSync(hooksDir, { recursive: true });
      if (existsSync(hooksFile)) copyFileSync(hooksFile, hooksFile + ".bak");
      writeFileSync(hooksFile, JSON.stringify(hf, null, 2) + "\n", "utf8");
      steps.push({ item: "sessionEnd", action: "wired", detail: `hooks/lares.json — ${hookAbs}` });
      changed = true;
    }
  }

  return { home: dir, changed, steps };
}
