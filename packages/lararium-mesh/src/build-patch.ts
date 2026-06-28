/**
 * build-patch — TurnHarvest → the `lar_*` reading patch (pure, VM-bundle-able).
 *
 * Lives in mesh (the VM-free layer, below tw5) so a tw5 plugin module — the in-VM
 * capture annotate — can import it and Vite bundles it into the plugin, running the
 * annotate INSIDE the @daemon TW5 VM (the one-runtime lock). mempalace re-exports
 * these for the node-side CLI writeback path.
 *
 * Gradient, never verdict: records 0..20 band readings, never pass/fail.
 */

import type { TurnHarvest } from "./turn-harvest.js";

/**
 * `lar_hv` — the enrich-logic version (the Kappa upgrade gate). Bump in lockstep
 * with `HARVEST_VERSION` in `drawer_io.py` when the reading logic changes, so the
 * next sweep re-reads exactly the stale drawers. THE single source for this number.
 */
export const LAR_HV = 6;

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

/**
 * Derive the worldline lineage-path HANDLE from a subagent-staged source_file
 * (`<name>__agent-<id>__run-<run>.jsonl`, the convention from subagent-mine.ts).
 * Returns `<run>.<agentId>` — the run-root . span, the trace-id/span-id formalized
 * (lar:///…/agent-worldline#name) — or null. Identity rides this handle; the
 * pet-name (deriveAgent) only labels. Legacy two-part names (no `__run-`) predate
 * the handle and yield null; they earn one on the next mine.
 * Flat `subagents/` gives a `run.child` path; deep parentUuid nesting is a
 * documented extension (agent-worldline#open).
 */
function deriveHandle(sourceFile?: string): string | null {
  if (!sourceFile) return null;
  const base = sourceFile.replace(/\\/g, "/").split("/").pop() ?? "";
  const m = /__agent-([^/]+?)__run-([^/]+)\.jsonl$/.exec(base);
  return m ? `${m[2]}.${m[1]}` : null;
}

/**
 * Derive the ROOT worldline handle from a MAIN-agent staged source_file
 * (`<surface>__<run>.jsonl` — the convention for a top-level session transcript,
 * NO `__agent-` segment). Returns the run (= the session id), or null for a spirit
 * (handled by deriveHandle) or a legacy un-prefixed name. The run a main drawer
 * yields here EQUALS the run-part of every spirit it spawned, so a spirit's
 * `lar_parent_handle` resolves back to the main agent's `lar_agent_handle` — the
 * attribution graph closes (agent-worldline#attribution).
 */
function deriveRootHandle(sourceFile?: string): string | null {
  if (!sourceFile) return null;
  const base = sourceFile.replace(/\\/g, "/").split("/").pop() ?? "";
  if (base.includes("__agent-")) return null; // a spirit — not a root
  const m = /^[^_]+__([^/]+)\.jsonl$/.exec(base); // <surface>__<run>.jsonl
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
  const handle = deriveHandle(sourceFile);
  if (handle) {
    // A SPIRIT worldline. The projected attribution edge (child→parent), single-source.
    // Flat `subagents/`: the spirit is a direct child of the run, so appointed-by
    // (immediate parent) = root-principal = the run. Deep parentUuid nesting splits the
    // two later (agent-worldline#open). The reified bi-temporal prov:Delegation NODE
    // awaits a code-reachable KG (MCP/tunnel-only today); this edge stays the sole
    // record until then, so the future node re-projects it rather than double-writing.
    patch["lar_agent_handle"] = handle.slice(0, 120);
    const run = handle.split(".")[0] ?? "";
    if (run) { patch["lar_parent_handle"] = run; patch["lar_root_handle"] = run; }
  } else {
    // A MAIN-agent worldline — its own root, no parent above it. Its handle = the run,
    // which a spirit's lar_parent_handle points back to (the graph closes).
    const root = deriveRootHandle(sourceFile);
    if (root) { patch["lar_agent_handle"] = root.slice(0, 120); patch["lar_root_handle"] = root.slice(0, 120); }
  }
  return patch;
}
