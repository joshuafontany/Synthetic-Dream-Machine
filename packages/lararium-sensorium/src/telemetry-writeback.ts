/**
 * telemetry-writeback — the lar-telemetry projection core (the WRITE shore).
 *
 * Reads mempalace drawers needing telemetry (the `lar_hv` gate), runs the
 * sovereign gradient reader over each (`harvestTurnGradient` — the turn's
 * instrument readings), builds the `lar_*` patch, and projects it back ONTO the
 * drawer via `loci_io.py`. Idempotent: already-current drawers skip.
 *
 * Lives HERE (beside the mempalace boundary) so ONE core serves both surfaces:
 *   - the @daemon `lar-telemetry` verb (mempalace through the seat)
 *   - the `lares harvest --writeback` CLI leg
 * The dependency points node/cli → mempalace, never the reverse.
 *
 * Gradient, never verdict: buildPatch records 0..20 band readings, never pass/fail.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/lar-telemetry
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
import { isoWholeSeconds } from "./worldline-kg.js";
import { resolveMempalacePython } from "@lararium/mempalace";
import { memorySensoriumContentDir } from "@lararium/mempalace/xdg-base";
import { resolveSidecarCapEnv } from "@lararium/mempalace";
import { mineWithServo } from "@lararium/mempalace";
import { TIMEOUT_KILL_SIGNAL } from "@lararium/mempalace";


export interface WritebackResult {
  readonly drawers: number;
  readonly framed: number;
  readonly applied: number;
  readonly bands: Record<string, number>;
}

/** Locate `loci_io.py` — CODE, so it lives at the repo root (never LAR_ROOT). */
export function resolveLociIo(): string {
  return join(repoRoot, "packages", "lararium-sensorium", "scripts", "loci_io.py");
}

/** Raised when python/`loci_io.py` are absent — the caller renders a clean error. */
export class TelemetryUnavailable extends Error {}

/**
 * The per-wing telemetry projection: export drawers needing telemetry (the
 * `lar_hv` gate) → read each instrument-panel → project `lar_*` back. Idempotent.
 * Throws {@link TelemetryUnavailable} when the python substrate is absent.
 */
export function writebackWing(wing: string, opts: { limit?: number } = {}): WritebackResult {
  const PY = resolveMempalacePython();
  if (!PY) throw new TelemetryUnavailable("no python holds mempalace — create ~/.venv and pip install the sidecar (`lares wake --install`)");
  const LOCI_IO = resolveLociIo();
  if (!existsSync(LOCI_IO)) throw new TelemetryUnavailable(`loci_io.py missing at ${LOCI_IO}`);

  // loci_io.py does `from mempalace.palace import …`. mempalace isn't pip-installed;
  // it lives at <submoduleRoot>/mempalace/. `python script.py` sets sys.path[0] to the
  // SCRIPT dir (not cwd), so cwd alone can't find it — PYTHONPATH=submoduleRoot makes
  // `import mempalace` resolve, while the venv python supplies chromadb/sqlite.
  const submoduleRoot = join(repoRoot, "mempalace");
  // + the GPU compute cap: loci_io opens a chroma collection (default onnxruntime embedder), which
  // HARD-fails to import onnxruntime-gpu without the CUDA runtime libs on LD_LIBRARY_PATH. Cap absent
  // (the QA box) ⇒ only the device hint rides and the embedder degrades to CPU. (Restart-safety P0.)
  const pyEnv = { ...process.env, PYTHONPATH: submoduleRoot + (process.env["PYTHONPATH"] ? `:${process.env["PYTHONPATH"]}` : ""), ...resolveSidecarCapEnv(PY) };
  // The telemetry describes the drawers the capture path landed, so it writes where they LIVE —
  // the sovereign content plane. NAMED, never defaulted: loci_io refuses an unnamed palace.
  const palace = memorySensoriumContentDir();
  const limit = opts.limit ?? 0;
  const exportArgs = ["--palace", palace, "export", "--wing", wing, ...(limit ? ["--limit", String(limit)] : [])];
  // loci_io export had NO timeout — the confirmed 9 h-stuck source. The servo bounds it: an
  // adaptive `timeout` + SIGKILL kills a wedged export ≤ CEIL and surfaces it (MineHangError),
  // and learns each export's real duration so a normal-but-slow run is never false-killed.
  const exportOut = mineWithServo("drawer-io-export", (timeoutMs) =>
    execFileSync(PY, [LOCI_IO, ...exportArgs], {
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
    // NO CaptureContext (4th arg) here, so this re-read sweep emits NO `lar_ffz`. This is the
    // RIGHT call, not a gap: the export (`loci_io.py export`) carries only {id, content,
    // source_file} — the drawer's ORIGINAL captured wall-time is not available at re-read, and
    // stamping against `now` would be a lie (the turn was filed long ago). The live in-VM annotate
    // (capture-annotate-vm) stamps `lar_ffz` at BIRTH; `loci_io.py apply` MERGES this patch onto
    // the drawer's existing metadata, so the birth-stamp is preserved untouched by this sweep.
    return { id: d.id, patch: buildPatch(h, d.source_file) };
  });

  let applied = 0;
  if (patches.length > 0) {
    // pid-unique so concurrent wing writebacks never share a path; ALWAYS removed (no orphan).
    const pf = join(tmpdir(), `lar-telemetry-patch-${wing}-${process.pid}.ndjson`);
    writeFileSync(pf, patches.map((p) => JSON.stringify(p)).join("\n") + "\n");
    try {
      const applyOut = mineWithServo("drawer-io-apply", (timeoutMs) =>
        execFileSync(PY, [LOCI_IO, "--palace", palace, "apply", pf], {
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

/**
 * KAPAE salience down-weight (strand C producer) — stamp `lar_salience=floor` + the `lar_kapae`
 * LIVENESS stamp (iso whole-seconds — WHEN the rewind was detected, the rank signal recall reads)
 * on the content drawers a rewound turn fed (addressed by their `lar_verbatim_sha`, the shas the
 * .structurepalace kapae dropped). VERBATIM LAW: set aside, never erase/hide — the stamp lets readers
 * RANK. `ended` names the detection moment (defaults to now, whole-seconds); the harvest passes
 * ONE `ended` across all three kapae legs so every trace of a rewind carries the same moment.
 * Best-effort: an absent python substrate is reported, never thrown (the rewind stays
 * unreconciled this run, re-derivable). Returns the count stamped, or `null` when the substrate is
 * absent. The palace is NAMED (never defaulted) — the kapae stamp must land on the drawers the
 * capture path actually wrote, which live in the sovereign contentpalace, not the guest comparator.
 */
export function stampKapaeSalience(verbatimShas: readonly string[], ended?: string): { stamped: number } | null {
  if (verbatimShas.length === 0) return { stamped: 0 };
  const PY = resolveMempalacePython();
  if (!PY) return null;
  const LOCI_IO = resolveLociIo();
  if (!existsSync(LOCI_IO)) return null;
  const palace = memorySensoriumContentDir();
  const endedIso = isoWholeSeconds(ended ?? new Date().toISOString());
  const submoduleRoot = join(repoRoot, "mempalace");
  const pyEnv = { ...process.env, PYTHONPATH: submoduleRoot + (process.env["PYTHONPATH"] ? `:${process.env["PYTHONPATH"]}` : ""), ...resolveSidecarCapEnv(PY) };
  const pf = join(tmpdir(), `lar-kapae-salience-${process.pid}-${Date.now()}.ndjson`);
  writeFileSync(pf, verbatimShas.map((s) => JSON.stringify({ verbatim_sha: s, ended: endedIso })).join("\n") + "\n");
  try {
    const out = execFileSync(PY, [LOCI_IO, "--palace", palace, "kapae", pf], {
      cwd: submoduleRoot, env: pyEnv, maxBuffer: 1 << 28, encoding: "utf8",
    });
    try { return { stamped: (JSON.parse(out.trim()) as { stamped: number }).stamped }; } catch { return { stamped: verbatimShas.length }; }
  } finally {
    rmSync(pf, { force: true });
  }
}
