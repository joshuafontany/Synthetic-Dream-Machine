/**
 * telemetry-writeback — the lar-telemetry projection core (the WRITE membrane).
 *
 * Reads mempalace drawers needing telemetry (the `lar_hv` gate), runs the
 * sovereign gradient reader over each (`harvestTurnGradient` — the turn's
 * instrument readings), builds the `lar_*` patch, and projects it back ONTO the
 * drawer via `drawer_io.py`. Idempotent: already-current drawers skip.
 *
 * Lives HERE (beside the mempalace boundary) so ONE core serves both surfaces:
 *   - the @admin `lar-telemetry` verb (mempalace through the seat)
 *   - the `lares harvest --writeback` CLI leg
 * The dependency points node/cli → mempalace, never the reverse.
 *
 * Gradient, never verdict: buildPatch records 0..20 band readings, never pass/fail.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/api/lar-telemetry
 */

import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { harvestTurnGradient, type TurnHarvest } from "@lararium/mesh";
import { repoRoot } from "@lararium/mesh/node";
import { resolveMempalacePython } from "./spawn-resolve.js";

/**
 * `lar_hv` — the enrich-logic version (the Kappa upgrade gate). Bump in lockstep
 * with `HARVEST_VERSION` in `drawer_io.py` when the reading logic changes, so the
 * next sweep re-reads exactly the stale drawers. THE single source for this number.
 */
export const LAR_HV = 3;

const SURFACES = ["claude", "codex", "copilot-vscode", "copilot-cli"];

/** Derive the originating harness from a staged source_file (prefixed `<surface>__…`). */
function deriveSurface(sourceFile?: string): string {
  if (!sourceFile) return "claude";
  const base = sourceFile.replace(/\\/g, "/").split("/").pop() ?? "";
  const pfx = base.split("__")[0] ?? "";
  return SURFACES.includes(pfx) ? pfx : "claude"; // un-prefixed legacy drawers = claude
}

/**
 * Derive the tasked-spirit name from a subagent-staged source_file
 * (`<name>__agent-<id>.jsonl`, the convention from subagent-mine.ts), else null.
 * A drawer with a name reads as a spirit turn (lar_sidechain), kept queryable by
 * actor in the spirits wing — distinct from the main agent's verbatim.
 */
function deriveAgent(sourceFile?: string): string | null {
  if (!sourceFile) return null;
  const base = sourceFile.replace(/\\/g, "/").split("/").pop() ?? "";
  const m = /^(.+?)__agent-[^/]+\.jsonl$/.exec(base);
  return m ? (m[1] ?? null) : null;
}

/** Deterministic function-hall routing from the authored instruments (no LLM). */
function hallForHarvest(h: TurnHarvest): string {
  if (h.bearing && h.confidence >= 13) return "hall_facts"; // a decision landed, high-confidence
  if (h.huds.some((x) => (x.oodaHa ?? "").includes("↺"))) return "hall_events"; // an OODA loop closed
  if (h.sigilCount > 0 || h.voices.length > 0) return "hall_discoveries"; // structured exploration
  return ""; // leave the substrate's own hall untouched
}

/** Build the `lar_*` reading patch (chroma metadata = str/int/float/bool only). */
export function buildPatch(h: TurnHarvest, sourceFile?: string): Record<string, string | number> {
  const patch: Record<string, string | number> = {
    lar_hv: LAR_HV,
    lar_surface: deriveSurface(sourceFile),
    lar_band: h.band,
    lar_bearing_conf: h.confidence,
    lar_sigils: h.sigilCount,
    lar_water: h.waterCount,
  };
  if (h.bearing?.aimUri) patch["lar_aim"] = h.bearing.aimUri.slice(0, 300);
  if (h.bearing?.yieldUri) patch["lar_yield"] = h.bearing.yieldUri.slice(0, 300);
  if (h.voices.length)
    patch["lar_voices"] = h.voices.map((v) => (v.role ? `${v.name} (${v.role})` : v.name)).join("|").slice(0, 400);
  if (h.confidences.length)
    patch["lar_confidence"] = h.confidences.map((c) => `${c.register ?? "?"}:${c.value ?? "?"}/${c.max}`).join("|").slice(0, 300);
  if (h.driftFlags.length) patch["lar_drift"] = h.driftFlags.join("|").slice(0, 200);
  const hall = hallForHarvest(h);
  if (hall) patch["lar_hall"] = hall;
  const agent = deriveAgent(sourceFile);
  if (agent) { patch["lar_agent"] = agent.slice(0, 60); patch["lar_sidechain"] = 1; }
  return patch;
}

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

  const limit = opts.limit ?? 0;
  const exportArgs = ["export", "--wing", wing, ...(limit ? ["--limit", String(limit)] : [])];
  const exportOut = execFileSync(PY, [DRAWER_IO, ...exportArgs], { maxBuffer: 1 << 30, encoding: "utf8" });
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
    const pf = join(tmpdir(), `lar-telemetry-patch-${wing}.ndjson`);
    writeFileSync(pf, patches.map((p) => JSON.stringify(p)).join("\n") + "\n");
    const applyOut = execFileSync(PY, [DRAWER_IO, "apply", pf], { maxBuffer: 1 << 30, encoding: "utf8" });
    try { applied = (JSON.parse(applyOut.trim()) as { applied: number }).applied; } catch { applied = patches.length; }
  }
  return { drawers: drawers.length, framed, applied, bands };
}
