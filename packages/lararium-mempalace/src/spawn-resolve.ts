/**
 * spawn-resolve — resolve HOW to spawn the read-only mempalace sidecar from a
 * daemon host (the @admin seat).
 *
 * Option D, the read membrane: the @admin host reaches mempalace THROUGH the
 * seat, never a raw CLI subprocess — so the spawn knowledge lives HERE, beside
 * MempalaceClient, not in the CLI (the dependency must not point node→cli).
 *
 * Venv-aware: prefers $VIRTUAL_ENV / ~/.venv (where mempalace + chromadb
 * pip-install) over the often PEP-668 externally-managed system python. Mirrors
 * the CLI's integration-check.resolvePython (kept in lockstep; that copy serves
 * `lares wake` before this package is in scope).
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";
import { repoRoot } from "@lararium/mesh/node";

let _python: string | null | undefined;

/** The Python interpreter that holds mempalace, or null when none responds. Cached. */
export function resolveMempalacePython(): string | null {
  if (_python !== undefined) return _python;
  const win = process.platform === "win32";
  const venvPy = (base: string): string => join(base, win ? "Scripts" : "bin", win ? "python.exe" : "python3");
  const cands: string[] = [];
  if (process.env["VIRTUAL_ENV"]) cands.push(venvPy(process.env["VIRTUAL_ENV"]));
  cands.push(venvPy(join(homedir(), ".venv")));
  cands.push("python3", "python", "py");
  for (const cand of cands) {
    try {
      const r = spawnSync(cand, ["--version"], { timeout: 5_000, stdio: "ignore" });
      if (r.error === undefined && r.status === 0) { _python = cand; return _python; }
    } catch { /* try next */ }
  }
  _python = null;
  return _python;
}

export interface MempalaceSpawn {
  /** <repo>/mempalace — the spawn cwd for `python -m mempalace.mcp_server`. */
  readonly submoduleRoot: string;
  /** The resolved venv-aware interpreter, or null when none holds mempalace. */
  readonly python: string | null;
  /** Whether the sidecar entry file exists under submoduleRoot. */
  readonly sidecarPresent: boolean;
}

/** Resolve everything MempalaceClient needs to spawn the read-only sidecar. */
export function resolveMempalaceSpawn(): MempalaceSpawn {
  const submoduleRoot = join(repoRoot, "mempalace");
  const sidecarPresent = existsSync(join(submoduleRoot, "mempalace", "mcp_server.py"));
  return { submoduleRoot, python: resolveMempalacePython(), sidecarPresent };
}
