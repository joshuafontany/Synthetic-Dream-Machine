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

export function linkLaresGlobal(): LinkResult {
  if (!existsSync(BIN)) return { ok: false, detail: `${BIN} not found — build first` };

  if (process.platform === "win32") {
    // A .cmd shim beside the bin; the operator adds its dir (or runs `pnpm setup`) to PATH.
    const cmd = join(repoRoot, "packages", "lares-cli", "bin", "lares.cmd");
    try {
      writeFileSync(cmd, '@echo off\r\nnode "%~dp0lares.mjs" %*\r\n', "utf8");
      const dir = join(repoRoot, "packages", "lares-cli", "bin");
      return { ok: true, detail: `wrote ${cmd}${onPath(dir) ? "" : ` — add ${dir} to PATH`}` };
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
