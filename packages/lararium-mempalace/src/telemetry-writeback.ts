/**
 * telemetry-writeback — the lar-telemetry projection core (the WRITE membrane).
 *
 * Reads mempalace drawers needing telemetry (the `lar_hv` gate), runs the
 * sovereign gradient reader over each (`harvestTurnGradient` — the turn's
 * instrument readings), builds the `lar_*` patch, and projects it back ONTO the
 * drawer via `drawer_io.py`. Idempotent: already-current drawers skip.
 *
 * Lives HERE (beside the mempalace boundary) so ONE core serves both surfaces:
 *   - the @daemon `lar-telemetry` verb (mempalace through the seat)
 *   - the `lares harvest --writeback` CLI leg
 * The dependency points node/cli → mempalace, never the reverse.
 *
 * Gradient, never verdict: buildPatch records 0..20 band readings, never pass/fail.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/lar-telemetry
 */

import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { harvestTurnGradient, buildPatch, LAR_HV, type TurnHarvest } from "@lararium/mesh";
// buildPatch + LAR_HV moved to @lararium/mesh (VM-bundle-able, beside the harvest); re-exported here
// for the node-side writeback importers (the in-VM annotate imports them from mesh directly).
export { buildPatch, LAR_HV };
import { repoRoot } from "@lararium/mesh/node";
import { resolveMempalacePython } from "./spawn-resolve.js";
import { mineWithServo } from "./mine-retry.js";
import { TIMEOUT_KILL_SIGNAL } from "./mine-timeout.js";


export interface WritebackResult {
  readonly drawers: number;
  readonly framed: number;
  readonly applied: number;
  readonly bands: Record<string, number>;
}

/** Locate `drawer_io.py` — CODE, so it lives at the repo root (never LAR_ROOT). */
export function resolveDrawerIo(): string {
  return join(repoRoot, "packages", "lararium-mempalace", "scripts", "drawer_io.py");
}

/** Raised when python/`drawer_io.py` are absent — the caller renders a clean error. */
export class TelemetryUnavailable extends Error {}

/**
 * The per-wing telemetry projection: export drawers needing telemetry (the
 * `lar_hv` gate) → read each instrument-panel → project `lar_*` back. Idempotent.
 * Throws {@link TelemetryUnavailable} when the python substrate is absent.
 */
export function writebackWing(wing: string, opts: { limit?: number } = {}): WritebackResult {
  const PY = resolveMempalacePython();
  if (!PY) throw new TelemetryUnavailable("no python holds mempalace — create ~/.venv and pip install the sidecar (`lares wake --install`)");
  const DRAWER_IO = resolveDrawerIo();
  if (!existsSync(DRAWER_IO)) throw new TelemetryUnavailable(`drawer_io.py missing at ${DRAWER_IO}`);

  // drawer_io.py does `from mempalace.palace import …`. mempalace isn't pip-installed;
  // it lives at <submoduleRoot>/mempalace/. `python script.py` sets sys.path[0] to the
  // SCRIPT dir (not cwd), so cwd alone can't find it — PYTHONPATH=submoduleRoot makes
  // `import mempalace` resolve, while the venv python supplies chromadb/sqlite.
  const submoduleRoot = join(repoRoot, "mempalace");
  const pyEnv = { ...process.env, PYTHONPATH: submoduleRoot + (process.env["PYTHONPATH"] ? `:${process.env["PYTHONPATH"]}` : "") };
  const limit = opts.limit ?? 0;
  const exportArgs = ["export", "--wing", wing, ...(limit ? ["--limit", String(limit)] : [])];
  // drawer_io export had NO timeout — the confirmed 9 h-stuck source. The servo bounds it: an
  // adaptive `timeout` + SIGKILL kills a wedged export ≤ CEIL and surfaces it (MineHangError),
  // and learns each export's real duration so a normal-but-slow run is never false-killed.
  const exportOut = mineWithServo("drawer-io-export", (timeoutMs) =>
    execFileSync(PY, [DRAWER_IO, ...exportArgs], {
      cwd: submoduleRoot, env: pyEnv, maxBuffer: 1 << 30, encoding: "utf8",
      timeout: timeoutMs, killSignal: TIMEOUT_KILL_SIGNAL,
    }),
  );
  const drawers = exportOut.split("\n").filter(Boolean).map((l) => JSON.parse(l) as { id: string; content: string; source_file?: string });

  const bands: Record<string, number> = { canon: 0, synthesis: 0, provisional: 0, raw: 0 };
  let framed = 0;
  const patches = drawers.map((d) => {
    const h = harvestTurnGradient(d.content);
    bands[h.band] = (bands[h.band] ?? 0) + 1;
    if (h.bearing) framed += 1;
    return { id: d.id, patch: buildPatch(h, d.source_file) };
  });

  let applied = 0;
  if (patches.length > 0) {
    // pid-unique so concurrent wing writebacks never share a path; ALWAYS removed (no orphan).
    const pf = join(tmpdir(), `lar-telemetry-patch-${wing}-${process.pid}.ndjson`);
    writeFileSync(pf, patches.map((p) => JSON.stringify(p)).join("\n") + "\n");
    try {
      const applyOut = mineWithServo("drawer-io-apply", (timeoutMs) =>
        execFileSync(PY, [DRAWER_IO, "apply", pf], {
          cwd: submoduleRoot, env: pyEnv, maxBuffer: 1 << 30, encoding: "utf8",
          timeout: timeoutMs, killSignal: TIMEOUT_KILL_SIGNAL,
        }),
      );
      try { applied = (JSON.parse(applyOut.trim()) as { applied: number }).applied; } catch { applied = patches.length; }
    } finally {
      rmSync(pf, { force: true });
    }
  }
  return { drawers: drawers.length, framed, applied, bands };
}
