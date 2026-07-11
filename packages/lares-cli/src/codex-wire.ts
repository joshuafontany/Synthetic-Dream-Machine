/**
 * codex-wire — `lares wake --codex`: wire the mempalace MCP (recall) and the Lares
 * session-ingest hook into the OpenAI Codex CLI home (~/.codex/config.toml).
 *
 * Codex reads TOML:
 *   - MCP   → [mcp_servers.<name>]  (command / args / env)
 *   - hooks → [[hooks.Stop]] + [[hooks.Stop.hooks]]  (type="command", command, timeout)
 * Its `Stop` hook delivers JSON on stdin WITH `transcript_path` (the rollout JSONL at
 * ~/.codex/sessions/.../rollout-*.jsonl) and `cwd` — the SAME shape as Claude Code, so
 * the one harness-aware ingest hook serves both. (`Stop` fires at turn scope → the
 * ingest stays idempotent on lar_hv.)
 *
 * Node has no TOML writer and the `codex` CLI may be absent, so we APPEND each section
 * to config.toml only when it's not already present (string-checked) — idempotent,
 * non-destructive, backs up first. TOML sections may sit in any order, so appending at
 * EOF is valid; we never duplicate a section.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { repoRoot } from "@lararium/mesh/node";
import { type WireAction } from "./mcp-resolve.js";

const INGEST_HOOK = "packages/lares-cli/.claude-plugin/hooks/lares-mempalace-ingest-hook.sh";
const MCP_KEY = "[mcp_servers.mempalace]";

export interface CodexWireStep {
  readonly item: string;
  readonly action: WireAction;
  readonly detail: string;
}
export interface CodexWireResult {
  readonly configPath: string;
  readonly changed: boolean;
  readonly steps: readonly CodexWireStep[];
}

/** Wire mempalace MCP + the ingest hook into ~/.codex/config.toml. Idempotent (append-if-absent). */
export function wireCodexHome(opts: { home?: string } = {}): CodexWireResult {
  const home = opts.home ?? homedir();
  const dir = join(home, ".codex");
  if (!existsSync(dir)) return { configPath: join(dir, "config.toml"), changed: false, steps: [{ item: "codex", action: "missing-script", detail: `${dir} absent — Codex CLI not set up here` }] };

  const configPath = join(dir, "config.toml");
  let toml = existsSync(configPath) ? readFileSync(configPath, "utf8") : "";
  const original = toml;
  const steps: CodexWireStep[] = [];
  const append: string[] = [];

  // 1. MCP server block — CUT. `lares` registers no mempalace MCP (one writer per palace;
  //    the mempalace plugin owns that seat). Reap a stale block an older wiring appended.
  if (toml.includes(MCP_KEY)) {
    toml = stripTomlSection(toml, MCP_KEY);
    steps.push({ item: "mcp:mempalace", action: "reaped", detail: `removed a stale ${MCP_KEY} — one writer, the plugin's` });
  } else {
    steps.push({ item: "mcp:mempalace", action: "absent", detail: "not registered by lares (the mempalace plugin serves MCP)" });
  }

  // 2. Stop ingest hook block
  const hookAbs = join(repoRoot, INGEST_HOOK).replace(/\\/g, "/");
  if (!existsSync(hookAbs)) {
    steps.push({ item: "Stop", action: "missing-script", detail: `${hookAbs} not found — skipped` });
  } else if (toml.includes("lares-mempalace-ingest-hook")) {
    steps.push({ item: "Stop", action: "present", detail: "ingest hook already wired" });
  } else {
    append.push(`\n[[hooks.Stop]]\n\n[[hooks.Stop.hooks]]\ntype = "command"\ncommand = ${JSON.stringify(hookAbs)}\ntimeout = 60\n`);
    steps.push({ item: "Stop", action: "wired", detail: `config.toml [[hooks.Stop]] — ${hookAbs}` });
  }

  if (append.length > 0) {
    toml = (toml.endsWith("\n") || toml === "" ? toml : toml + "\n") + append.join("");
  }
  // The MCP reap mutates `toml` in place, so gate the write on the text — not on `append`,
  // which a reap-only pass leaves empty.
  if (toml !== original) {
    if (existsSync(configPath)) copyFileSync(configPath, configPath + ".bak");
    mkdirSync(dir, { recursive: true });
    writeFileSync(configPath, toml, "utf8");
  }

  return { configPath, changed: toml !== original, steps };
}

/**
 * Drop a TOML table and its body — from the `[header]` line to the next table header (a
 * line opening `[`) or EOF. Text-level, matching how this module appends: TOML never gets
 * parsed here, so a strip must not disturb the operator's own formatting elsewhere.
 */
function stripTomlSection(toml: string, header: string): string {
  const lines = toml.split("\n");
  const start = lines.findIndex((l) => l.trim() === header);
  if (start < 0) return toml;
  let end = start + 1;
  while (end < lines.length && !lines[end]!.trimStart().startsWith("[")) end++;
  lines.splice(start, end - start);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}
