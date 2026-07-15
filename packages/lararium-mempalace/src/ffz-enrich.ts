/**
 * ffz-enrich — the ONE shared runner for the worldline membership enrichment.
 *
 * Spawns `worldline_ffz.py enrich` over the memory sensorium's content plane +
 * its `worldline/` fork-DAG: the absent BEAT cell in each drawer's `lar_ffz`
 * membership address takes the turn's own identity label (same-turn drawers
 * share a beat cell, so the ultrametric reads them adjacent). Idempotent —
 * only `_`-beat cells fill; a re-run enriches to the same addresses.
 *
 * Both faces call THIS core (the writeback-core pattern — no local copies):
 *   · the CLI verb `lares worldline enrich`
 *   · the post-harvest automation step (harvest --all's closing pass)
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "@lararium/mesh/node";
import { resolveMempalacePython } from "./spawn-resolve.js";
import { memorySensoriumDir } from "./xdg-base.js";
import { resolveComputeCapEnv } from "./compute-cap.js";

/** The per-run enrichment report the py leg prints (worldline_ffz.py enrich). */
export interface FfzEnrichReport {
  readonly braids: number;
  readonly turns: number;
  readonly stamped: number;
  readonly locked: number;
  readonly holdover: number;
  readonly phase_spread: number;
}

/** Raised when the python substrate or the worldline store is absent — callers render a clean error. */
export class FfzEnrichUnavailable extends Error {}

/** Locate `worldline_ffz.py` — CODE, so it lives at the repo root (never LAR_ROOT). */
export function resolveWorldlineFfz(): string {
  return join(repoRoot, "packages", "lararium-mempalace", "scripts", "worldline_ffz.py");
}

/**
 * Run the enrichment over a content palace (default: the memory sensorium's content plane)
 * and its worldline store (default: `worldline/` beside the content palace).
 * Throws {@link FfzEnrichUnavailable} when python, the script, or the worldline store is absent.
 */
export function runFfzEnrich(sensorium?: string): FfzEnrichReport {
  const script = resolveWorldlineFfz();
  if (!existsSync(script)) throw new FfzEnrichUnavailable(`worldline_ffz.py missing at ${script}`);
  const PY = resolveMempalacePython();
  if (!PY) throw new FfzEnrichUnavailable("no python with the mempalace substrate (the ~/.venv law)");
  const root = sensorium ?? memorySensoriumDir();
  const worldlineDir = join(root, "worldline");
  if (!existsSync(worldlineDir)) {
    throw new FfzEnrichUnavailable(`no worldline store at ${worldlineDir} — capture builds the fork-DAG first`);
  }
  const submoduleRoot = join(repoRoot, "mempalace");
  const pyEnv = {
    ...process.env,
    PYTHONPATH: submoduleRoot + (process.env["PYTHONPATH"] ? `:${process.env["PYTHONPATH"]}` : ""),
    ...resolveComputeCapEnv(PY),
  };
  const out = execFileSync(PY, [script, "enrich", "--sensorium", root], {
    encoding: "utf8", maxBuffer: 1 << 26, env: pyEnv,
  });
  return JSON.parse(out.trim()) as FfzEnrichReport;
}
