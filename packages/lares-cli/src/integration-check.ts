/**
 * integration-check — verify (and, on demand, install) the mempalace integration
 * that `lares wake` depends on. The CHECK is cheap and runs every wake; the
 * INSTALL is one-time, behind `--install`, and touches the foundation.
 *
 * mempalace is a READ-ONLY sidecar submodule; we never edit it, only ensure it's
 * present and runnable so the witness organ is reachable.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { repoRoot } from "@lararium/mesh/node";
import { resolveMempalacePython } from "@lararium/mempalace";

const MEMPALACE_DIR = join(repoRoot, "mempalace");
const MEMPALACE_SIDECAR = join(MEMPALACE_DIR, "mempalace", "mcp_server.py");
const MEMPALACE_PKG = join(repoRoot, "packages", "lararium-mempalace");
const MEMPALACE_PLUGIN = join(MEMPALACE_DIR, ".claude-plugin", "plugin.json");

/**
 * The Python interpreter that holds mempalace (venv-aware). ONE source of truth:
 * @lararium/mempalace owns the resolver; this re-export keeps `lares wake`'s cheap
 * check on the exact same logic — the former duplicate "kept in lockstep" is gone
 * (YIN cut, 2026-06-25).
 */
export const resolvePython = resolveMempalacePython;

export interface IntegrationCheck {
  readonly name: string;
  readonly ok: boolean;
  readonly detail: string;
}

export interface IntegrationReport {
  readonly ok: boolean;
  readonly checks: readonly IntegrationCheck[];
}

/** Cheap, every-wake-safe: file presence + a light `find_spec` (never a full import). */
export function checkMempalaceIntegration(): IntegrationReport {
  const checks: IntegrationCheck[] = [];

  const submoduleOk = existsSync(MEMPALACE_SIDECAR);
  checks.push({
    name: "submodule",
    ok: submoduleOk,
    detail: submoduleOk ? MEMPALACE_DIR : "absent — `lares wake --install` (git submodule update --init mempalace)",
  });

  const pkgOk = existsSync(join(MEMPALACE_PKG, "package.json"));
  checks.push({
    name: "integration-package",
    ok: pkgOk,
    detail: pkgOk ? "@lararium/mempalace present" : "absent — the integration package is missing from packages/",
  });

  // find_spec does NOT execute the module (no heavy chromadb import) — wake-cheap.
  const py = resolvePython();
  let sidecarOk = false;
  let sidecarDetail = "no python (python3/python/py) on PATH — install Python to reach the sidecar";
  if (py !== null) {
    try {
      const probe = spawnSync(
        py,
        ["-c", "import importlib.util as u, sys; sys.exit(0 if (u.find_spec('mempalace') and u.find_spec('chromadb')) else 1)"],
        { cwd: MEMPALACE_DIR, timeout: 10_000 },
      );
      if (probe.error === undefined) {
        sidecarOk = probe.status === 0;
        sidecarDetail = sidecarOk
          ? `${py} -m mempalace.mcp_server importable`
          : "sidecar deps absent — `lares wake --install` (pip install -e ./mempalace)";
      }
    } catch {
      /* leave the not-found default */
    }
  }
  checks.push({ name: "sidecar-deps", ok: sidecarOk, detail: sidecarDetail });

  const pluginOk = existsSync(MEMPALACE_PLUGIN);
  checks.push({
    name: "recall-plugin",
    ok: pluginOk,
    detail: pluginOk
      ? "mempalace .claude-plugin present (enable recall via `/plugin`)"
      : "mempalace .claude-plugin absent",
  });

  return { ok: checks.every((c) => c.ok), checks };
}

export interface InstallStep {
  readonly step: string;
  readonly ran: boolean;
  readonly ok: boolean;
  readonly detail: string;
}

/** One-time installs a CLI can perform. Each step is idempotent (no-op if already done). */
export function installMempalaceIntegration(): InstallStep[] {
  const steps: InstallStep[] = [];

  if (!existsSync(MEMPALACE_SIDECAR)) {
    try {
      execFileSync("git", ["submodule", "update", "--init", "mempalace"], { cwd: repoRoot, stdio: "pipe", timeout: 120_000 });
      steps.push({ step: "submodule-init", ran: true, ok: existsSync(MEMPALACE_SIDECAR), detail: "git submodule update --init mempalace" });
    } catch (e) {
      steps.push({ step: "submodule-init", ran: true, ok: false, detail: errText(e) });
    }
  } else {
    steps.push({ step: "submodule-init", ran: false, ok: true, detail: "already present" });
  }

  const py = resolvePython();
  if (py === null) {
    steps.push({ step: "pip-install", ran: false, ok: false, detail: "no python (python3/python/py) on PATH — install Python first" });
    return steps;
  }

  let sidecarOk = false;
  try {
    sidecarOk =
      spawnSync(py, ["-c", "import importlib.util as u,sys; sys.exit(0 if u.find_spec('chromadb') else 1)"], {
        cwd: MEMPALACE_DIR,
        timeout: 10_000,
      }).status === 0;
  } catch {
    /* fall through to install */
  }
  if (!sidecarOk) {
    try {
      execFileSync(py, ["-m", "pip", "install", "-e", "."], { cwd: MEMPALACE_DIR, stdio: "pipe", timeout: 600_000 });
      steps.push({ step: "pip-install", ran: true, ok: true, detail: `${py} -m pip install -e ./mempalace` });
    } catch (e) {
      steps.push({ step: "pip-install", ran: true, ok: false, detail: errText(e).slice(0, 160) });
    }
  } else {
    steps.push({ step: "pip-install", ran: false, ok: true, detail: "sidecar deps already importable" });
  }

  return steps;
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
