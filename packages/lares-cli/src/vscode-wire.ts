/**
 * vscode-wire — `lares wake --vscode`: register the mempalace MCP (recall) into
 * VS Code, across whichever variants are installed — stable + Insiders, remote-
 * server (WSL/SSH) + local-profile. Idempotent deep-merge; backs up; preserves
 * the operator's existing servers.
 *
 * VS Code went native-MCP in v1.102. Schema (DISTINCT from Claude/Cursor's
 * `mcpServers`): top-level key is **`servers`**, per-server `{type:"stdio",
 * command, args?, env?}`. The server binary is WSL-side, so under a remote window
 * the config MUST live on the remote-server side (the .vscode-server data/User
 * dir), not the local profile — we write to every present root.
 *
 * Recall reaches Copilot Chat agent mode AND any MCP-aware VS Code agent (the
 * Claude + ChatGPT editor extensions). Capture is separate — those editors write
 * their transcripts to the CLI stores (mined by `lares harvest --all`).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { resolveMempalaceMcp, type WireAction } from "./mcp-resolve.js";

export interface VscodeWireStep {
  readonly item: string;
  readonly action: WireAction;
  readonly detail: string;
}
export interface VscodeWireResult {
  readonly changed: boolean;
  readonly steps: readonly VscodeWireStep[];
}

interface McpFile { servers?: Record<string, unknown>; [k: string]: unknown }

/** Every VS Code config root we'd wire — stable/Insiders × remote-server/local-profile. */
function variantRoots(home: string): Array<{ name: string; dir: string }> {
  return [
    { name: "vscode-server (stable/remote)", dir: join(home, ".vscode-server", "data", "User") },
    { name: "vscode-server-insiders (remote)", dir: join(home, ".vscode-server-insiders", "data", "User") },
    { name: "Code (stable/local)", dir: join(home, ".config", "Code", "User") },
    { name: "Code - Insiders (local)", dir: join(home, ".config", "Code - Insiders", "User") },
  ];
}

/** Register mempalace MCP into every PRESENT VS Code variant's mcp.json. Idempotent. */
export function wireVscode(opts: { home?: string } = {}): VscodeWireResult {
  const home = opts.home ?? homedir();
  const steps: VscodeWireStep[] = [];
  let changed = false;

  const mcpCmd = resolveMempalaceMcp();
  if (mcpCmd === null) {
    return { changed: false, steps: [{ item: "mcp:mempalace", action: "missing-script", detail: "mempalace-mcp not on PATH — run `lares wake --init`" }] };
  }

  let found = 0;
  for (const v of variantRoots(home)) {
    if (!existsSync(v.dir)) continue; // wire only variants the user actually has
    found += 1;
    const mcpPath = join(v.dir, "mcp.json");
    let cfg: McpFile = {};
    if (existsSync(mcpPath)) {
      try { cfg = JSON.parse(readFileSync(mcpPath, "utf8")) as McpFile; }
      catch { steps.push({ item: v.name, action: "missing-script", detail: `${mcpPath} not valid JSON — skipped` }); continue; }
    }
    const servers = (cfg.servers ??= {});
    if (servers["mempalace"] !== undefined) {
      steps.push({ item: v.name, action: "present", detail: "mempalace already in mcp.json" });
      continue;
    }
    servers["mempalace"] = { type: "stdio", command: mcpCmd };
    if (existsSync(mcpPath)) copyFileSync(mcpPath, mcpPath + ".bak");
    mkdirSync(v.dir, { recursive: true });
    writeFileSync(mcpPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
    steps.push({ item: v.name, action: "wired", detail: `${mcpPath}` });
    changed = true;
  }

  if (found === 0) steps.push({ item: "vscode", action: "missing-script", detail: "no VS Code variant found (stable/Insiders, remote/local)" });
  return { changed, steps };
}
