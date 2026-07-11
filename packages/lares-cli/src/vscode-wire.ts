/**
 * vscode-wire — `lares wake --vscode`: REAP a lares-wired mempalace MCP from VS Code,
 * across whichever variants are installed — stable + Insiders, remote-server (WSL/SSH)
 * + local-profile. Backs up before each change; preserves the operator's other servers.
 *
 * Registration has been CUT. Chroma tolerates one writer on the palace, and a `lares`
 * registration standing beside the mempalace `.claude-plugin`'s own gave every session two
 * sidecars on one index — the contention that truncated the HNSW segment and forced a
 * drift-quarantine. The plugin serves MCP alone; `lares` consumes mempalace as library
 * code through the Memory sensorium. The flag survives as the strangler: it removes what
 * an older wiring left, so the decouple heals every variant it once touched.
 *
 * VS Code went native-MCP in v1.102. Schema (DISTINCT from Claude/Cursor's `mcpServers`):
 * top-level key is **`servers`**. Under a remote window the config lives on the
 * remote-server side (.vscode-server data/User), not the local profile — we sweep every
 * present root.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { type WireAction } from "./mcp-resolve.js";

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

/** Every VS Code config root we'd wire — stable/Insiders, per platform. */
function variantRoots(home: string): Array<{ name: string; dir: string }> {
  if (process.platform === "win32") {
    // Native Win11 VS Code keeps user config under %APPDATA%; no .vscode-server
    // (that's the remote/WSL server side, handled in the Linux branch below).
    const appdata = process.env["APPDATA"] ?? join(home, "AppData", "Roaming");
    return [
      { name: "Code (stable)", dir: join(appdata, "Code", "User") },
      { name: "Code - Insiders", dir: join(appdata, "Code - Insiders", "User") },
    ];
  }
  // Linux / WSL2: the remote-server side (under a WSL/SSH window — where the
  // mempalace-mcp binary actually lives) AND the local Linux profile.
  return [
    { name: "vscode-server (stable/remote)", dir: join(home, ".vscode-server", "data", "User") },
    { name: "vscode-server-insiders (remote)", dir: join(home, ".vscode-server-insiders", "data", "User") },
    { name: "Code (stable/local)", dir: join(home, ".config", "Code", "User") },
    { name: "Code - Insiders (local)", dir: join(home, ".config", "Code - Insiders", "User") },
  ];
}

/** Reap a lares-wired mempalace MCP from every PRESENT VS Code variant's mcp.json. Idempotent. */
export function wireVscode(opts: { home?: string } = {}): VscodeWireResult {
  const home = opts.home ?? homedir();
  const steps: VscodeWireStep[] = [];
  let changed = false;

  let found = 0;
  for (const v of variantRoots(home)) {
    if (!existsSync(v.dir)) continue; // sweep only variants the user actually has
    found += 1;
    const mcpPath = join(v.dir, "mcp.json");
    if (!existsSync(mcpPath)) {
      steps.push({ item: v.name, action: "absent", detail: "no mcp.json — nothing to reap" });
      continue;
    }
    let cfg: McpFile;
    try { cfg = JSON.parse(readFileSync(mcpPath, "utf8")) as McpFile; }
    catch { steps.push({ item: v.name, action: "missing-script", detail: `${mcpPath} not valid JSON — skipped` }); continue; }

    if (cfg.servers?.["mempalace"] === undefined) {
      steps.push({ item: v.name, action: "absent", detail: "not registered by lares (the mempalace plugin serves MCP)" });
      continue;
    }
    delete cfg.servers["mempalace"];
    copyFileSync(mcpPath, mcpPath + ".bak");
    writeFileSync(mcpPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
    steps.push({ item: v.name, action: "reaped", detail: `removed from ${mcpPath} — one writer, the plugin's` });
    changed = true;
  }

  if (found === 0) steps.push({ item: "vscode", action: "missing-script", detail: "no VS Code variant found (stable/Insiders, remote/local)" });
  return { changed, steps };
}
