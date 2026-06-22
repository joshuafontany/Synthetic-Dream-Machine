/**
 * link-bin — make `lares` runnable from anywhere, cross-platform, WITHOUT depending
 * on `pnpm setup`/PNPM_HOME (which is often unconfigured — `pnpm link --global` then
 * fails). On Unix: symlink into the first on-PATH writable user bin (default
 * ~/.local/bin). On Windows: write a `lares.cmd` shim and report the PATH step.
 * Idempotent; non-fatal — a link failure never blocks the standup.
 */

import { existsSync, mkdirSync, symlinkSync, rmSync, chmodSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { repoRoot } from "@lararium/mesh/node";

const BIN = join(repoRoot, "packages", "lares-cli", "bin", "lares.mjs");

export interface LinkResult {
  readonly ok: boolean;
  readonly detail: string;
}

function onPath(dir: string): boolean {
  const sep = process.platform === "win32" ? ";" : ":";
  const norm = (d: string): string => d.replace(/[/\\]+$/, "").toLowerCase();
  return (process.env["PATH"] ?? "").split(sep).some((d) => d.length > 0 && norm(d) === norm(dir));
}

/** Resolve a console script's source abs path from PATH (skipping ~/.local/bin so we
 *  never symlink to our own target). Used to find the venv-installed mempalace bins. */
function resolveBin(name: string): string | null {
  const win = process.platform === "win32";
  const exe = win ? `${name}.exe` : name;
  const localBin = join(homedir(), ".local", "bin").replace(/[/\\]+$/, "").toLowerCase();
  for (const d of (process.env["PATH"] ?? "").split(win ? ";" : ":")) {
    if (!d || d.replace(/[/\\]+$/, "").toLowerCase() === localBin) continue;
    const p = join(d, exe);
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Symlink a mempalace console script (mempalace / mempalace-mcp) into ~/.local/bin so
 * Claude's hook + MCP environment finds it WITHOUT the venv active — the venv-on-PATH
 * gap that broke the Stop hook and recall. The script's shebang pins the venv python
 * (with chromadb), so it still runs correctly. Idempotent; non-fatal.
 */
export function linkConsoleScript(name: string): LinkResult {
  const src = resolveBin(name);
  if (src === null) return { ok: false, detail: `${name} not on PATH — run \`lares wake --install\` (pip install)` };
  if (process.platform === "win32") {
    // pip writes <name>.exe into its Scripts dir (on PATH at install); not a symlink idiom.
    return { ok: true, detail: `${name} at ${src} (ensure its dir is on PATH)` };
  }
  const target = join(homedir(), ".local", "bin");
  mkdirSync(target, { recursive: true });
  const link = join(target, name);
  try {
    if (existsSync(link)) rmSync(link);
    symlinkSync(src, link);
    return { ok: true, detail: `symlinked ${link} -> ${src}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

/** Link both mempalace console scripts so the keep-hooks + recall MCP resolve venv-free. */
export function linkMempalaceBins(): LinkResult[] {
  return ["mempalace", "mempalace-mcp"].map(linkConsoleScript);
}

export function linkLaresGlobal(): LinkResult {
  if (!existsSync(BIN)) return { ok: false, detail: `${BIN} not found — build first` };

  if (process.platform === "win32") {
    // Shim TRIO beside the bin (npm cmd-shim pattern): .cmd for cmd.exe, .ps1 for
    // PowerShell (the modern default shell). The operator adds the dir to PATH.
    const dir = join(repoRoot, "packages", "lares-cli", "bin");
    const cmd = join(dir, "lares.cmd");
    const ps1 = join(dir, "lares.ps1");
    try {
      writeFileSync(cmd, '@echo off\r\nnode "%~dp0lares.mjs" %*\r\n', "utf8");
      writeFileSync(ps1, '#!/usr/bin/env pwsh\r\nnode "$PSScriptRoot\\lares.mjs" @args\r\nexit $LASTEXITCODE\r\n', "utf8");
      return { ok: true, detail: `wrote lares.cmd + lares.ps1 in ${dir}${onPath(dir) ? "" : ` — add ${dir} to PATH`}` };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : String(e) };
    }
  }

  // Unix: ensure the bin is executable, then symlink into a user bin dir.
  try { chmodSync(BIN, 0o755); } catch { /* non-POSIX — best effort */ }
  const candidates = [join(homedir(), ".local", "bin"), join(homedir(), "bin")];
  let target = candidates.find((d) => existsSync(d) && onPath(d));
  if (target === undefined) {
    target = join(homedir(), ".local", "bin");
    mkdirSync(target, { recursive: true });
  }
  const link = join(target, "lares");
  try {
    if (existsSync(link)) rmSync(link);
    symlinkSync(BIN, link);
    return { ok: true, detail: `symlinked ${link} -> lares.mjs${onPath(target) ? "" : ` (add ${target} to PATH)`}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}
