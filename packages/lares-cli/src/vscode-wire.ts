/**
 * vscode-wire — `lares wake --vscode`: register the LARES MCP seat into VS Code, across whichever
 * variants are installed — stable + Insiders, remote-server (WSL/SSH) + local-profile. Backs up
 * before each change; preserves the operator's other servers.
 *
 * The seat used to hold the *mempalace* MCP. That let each editor open the palace itself, and Chroma
 * tolerates one writer — N harnesses on one index is the contention that truncated the HNSW segment
 * and forced a drift-quarantine. VS Code now reaches memory THROUGH the lares house (`lares_mcp.py`
 * over the memory sensorium), and a stale mempalace entry is reaped in the same pass, so a profile an
 * older wiring touched heals on the next wake.
 *
 * VS Code went native-MCP in v1.102. Schema (DISTINCT from Claude/Cursor's `mcpServers`): top-level
 * key is **`servers`**. Under a remote window the config lives on the remote-server side
 * (.vscode-server data/User), not the local profile — we sweep every present root.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { resolveLaresMcp, type WireAction } from "./mcp-resolve.js";

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

/** Register the LARES MCP seat into every PRESENT VS Code variant's mcp.json, reaping a stale
 *  mempalace entry in the same pass. Idempotent. */
export function wireVscode(opts: { home?: string } = {}): VscodeWireResult {
  const home = opts.home ?? homedir();
  const steps: VscodeWireStep[] = [];
  let changed = false;

  const laresMcp = resolveLaresMcp();
  if (laresMcp === null) {
    return { changed: false, steps: [{ item: "mcp:lares", action: "missing-script", detail: "lares_mcp.py / python / sensorium not found — run `lares wake --init`" }] };
  }

  let found = 0;
  for (const v of variantRoots(home)) {
    if (!existsSync(v.dir)) continue; // sweep only variants the user actually has
    found += 1;
    const mcpPath = join(v.dir, "mcp.json");
    let cfg: McpFile = {};
    if (existsSync(mcpPath)) {
      // An EMPTY file is a fresh config, not a corrupt one — VS Code creates a 0-byte mcp.json the
      // first time the pane opens. `JSON.parse("")` throws, so read it as {} rather than cry corrupt
      // and skip a perfectly wireable profile.
      const raw = readFileSync(mcpPath, "utf8").trim();
      if (raw !== "") {
        try { cfg = JSON.parse(raw) as McpFile; }
        catch { steps.push({ item: v.name, action: "missing-script", detail: `${mcpPath} not valid JSON — skipped` }); continue; }
      }
    }
    const servers = (cfg.servers ??= {});
    let dirty = false;

    // A harness holding its own palace sidecar reaches PAST the node into the store.
    if (servers["mempalace"] !== undefined) { delete servers["mempalace"]; dirty = true; }

    // Converge on the RESOLVED spawn, never on mere presence. A seat aimed at a re-homed script (a
    // package that moves its sidecar) otherwise sits drifted forever while the wire reports it present —
    // the door shut, the health line green. Re-aim whenever the registered command/args drift.
    const seat = servers["lares"] as { command?: string; args?: readonly string[] } | undefined;
    const aligned = seat !== undefined && seat.command === laresMcp.command
      && JSON.stringify(seat.args ?? []) === JSON.stringify(laresMcp.args);
    if (!aligned) {
      servers["lares"] = { type: "stdio", command: laresMcp.command, args: laresMcp.args, env: laresMcp.env };
      dirty = true;
    }

    if (!dirty) {
      steps.push({ item: v.name, action: "present", detail: "lares already in mcp.json" });
      continue;
    }
    if (existsSync(mcpPath)) copyFileSync(mcpPath, mcpPath + ".bak");
    mkdirSync(v.dir, { recursive: true });
    writeFileSync(mcpPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
    steps.push({ item: v.name, action: "wired", detail: `${mcpPath} — the memory sensorium (stale mempalace reaped)` });
    changed = true;
  }

  if (found === 0) steps.push({ item: "vscode", action: "missing-script", detail: "no VS Code variant found (stable/Insiders, remote/local)" });
  return { changed, steps };
}
