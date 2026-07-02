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
import { ffzMembershipAddress } from "./ffz-project.js";

/**
 * CaptureContext — the turn's MEMBERSHIP cells, what the drawer already holds.
 *
 * Feeds the `lar_ffz` membership address (a NESTED-CONTAINMENT PATH, never a stored
 * clock and never a wall-time projection — the prior {capturedTime, sessionPosition}
 * anchor is rejected as un-pono). Arc (the session) is derived FREE from `sourceFile`
 * inside {@link buildPatch}; the caller threads only the finer cells it holds. Causality
 * is NOT carried here — it rides the edge-DAG (the PATH-B cut).
 *
 * The fluid bands (Theme = thread cluster, Measure = topic-shift) COMMIT on a discrete
 * GONG (stage two): a caller that has run the gong machinery threads the committed cell
 * LABEL here; absent the gong they render porous (`_`) in the address — the φ-band
 * free-runs until its wavefront lands. Every cell is a LABEL, never a count.
 */
export interface CaptureContext {
  /** Pulse (L0) — the drawer / inscription atom id (e.g. the turn's content-address). */
  readonly pulse?: string | number;
  /**
   * Beat (L1) — the turn cell (a per-island, causally-inert turn LABEL, read as
   * membership — "which-turn", NEVER a count; the ordinal SEQUENCE rides the edge-DAG).
   * The cleanest per-session source is the drawer's `chunk_index` (the ndjson ingest
   * ordinal within the source_file = the Arc); the live in-VM capture site has no clean
   * ordinal, so it stays absent (porous) there — a writeback/harvest pass supplies it.
   * Null-graceful: the caller omits it where no clean turn label exists at the call site.
   */
  readonly beat?: string | number;
  /**
   * Measure (L2) — the topic-shift segment LABEL the one servo commits on a gong
   * ({@link measureStep} in ffz-project). Absent between gongs (the φ-band free-runs).
   */
  readonly measure?: string | number;
  /**
   * Theme (L3-coarse) — the thread-cluster community LABEL, re-derived on Arc-close.
   * LOCAL to this store, NEVER cross-vessel. Absent until the cluster-compute lands
   * (a deferred follow-up); porous until then.
   */
  readonly theme?: string | number;
  /** The FFZ tree-root selector (a namespace), default "session". */
  readonly ffzProfile?: string;
}

/**
 * `lar_hv` — the enrich-logic version (the Kappa upgrade gate). Bump in lockstep
 * with `HARVEST_VERSION` in `drawer_io.py` when the reading logic changes, so the
 * next sweep re-reads exactly the stale drawers. THE single source for this number.
 */
export const LAR_HV = 7;

const SURFACES = ["claude", "codex", "copilot-vscode", "copilot-cli"];

/**
 * BranchContext — the turn-DAG fork signal. A same-session FORK (a transcript turn with
 * two children in the conversation parentUuid DAG = a branch point) makes both branches
 * derive the IDENTICAL `run` handle, so worldlineClockFor folds two timelines into one
 * (the collision). The cure: a BRANCH-FRONTIER component keyed into the handle.
 *
 * Branch identity = the FRONTIER (the set of head turn-uuids at the divergence point — the
 * git/Merkle "set of head hashes" reading). Derived data keys by (handle + frontier), so
 * two forks of one session derive DISTINCT handles. A normal spawn (no fork) carries no
 * frontier and is UNAFFECTED — the handle stays exactly `run.agentId` / `run`.
 *
 * The feed (the parentUuid turn-DAG → frontier) is wired by the capture/harvest caller; this
 * module only derives the component. Absent a frontier, behavior is byte-identical to before.
 */
export interface BranchContext {
  /**
   * The divergence frontier — the head turn-uuid(s) that distinguish this branch. A single
   * uuid (the divergence turn) or the set of heads. Empty/absent ⇒ no fork ⇒ no component.
   */
  readonly frontier?: string | readonly string[];
}

/**
 * A short, stable, dependency-free content token (FNV-1a/32, 8 hex). NOT a cryptographic
 * digest — it only needs to DISTINGUISH deterministically at session scale (build-patch
 * bundles into the TW5 VM + the browser twin, so no @noble import here). Used both for the
 * branch-frontier token and for the Pulse cell (a turn's content-address inscription atom).
 */
export function fnv1a8(s: string): string {
  let h = 0x811c9dc5; // FNV-1a 32-bit offset basis
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0; // FNV prime, keep unsigned
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * A short, stable token for a branch frontier (FNV-1a/32, 8 hex). Order-independent over
 * a head SET (sorted before folding). Returns null when no frontier.
 */
export function deriveBranchFrontier(branch?: BranchContext): string | null {
  const f = branch?.frontier;
  if (f == null) return null;
  const heads = (Array.isArray(f) ? [...f] : [f as string]).filter((h) => h != null && h !== "");
  if (heads.length === 0) return null;
  return fnv1a8(heads.map(String).sort().join("\n"));
}

/**
 * Derive the Arc cell — the session-island = the staged source_file (the basename, one
 * trailing extension stripped). Two drawers from the same transcript share this Arc, so
 * they read as same-session in {@link ffzCoDepth}. Given FREE from what the drawer holds.
 */
function deriveArc(sourceFile?: string): string | null {
  if (!sourceFile) return null;
  const base = sourceFile.replace(/\\/g, "/").split("/").pop() ?? "";
  const noExt = base.replace(/\.[^.]+$/, "");
  return noExt || null;
}

/**
 * Derive the originating harness from a staged source_file (prefixed `<surface>__…`).
 * An absent or un-prefixed source carries "unknown" HONESTLY — the old silent
 * default-to-"claude" stamped a guess as provenance, hiding un-tokened producers.
 * Downstream reads the field as a free string (adapter.py FieldSpec, no enum), so
 * the honest value rides without breaking a consumer.
 */
export function deriveSurface(sourceFile?: string): string {
  if (!sourceFile) return "unknown";
  const base = sourceFile.replace(/\\/g, "/").split("/").pop() ?? "";
  const pfx = base.split("__")[0] ?? "";
  return SURFACES.includes(pfx) ? pfx : "unknown"; // no surface token → carried honestly, never guessed
}

/**
 * Strip one leading `<surface>__` token off a staged basename. Spirit basenames carry it
 * too (`<surface>__<name>__agent-<id>__run-<run>.jsonl`, spiritStageBasename) — without the
 * strip, deriveAgent's lazy `(.+?)` would swallow `<surface>__` into the agent label.
 * Legacy un-prefixed names pass through untouched (the handle law never shifts).
 */
function stripSurfaceToken(base: string): string {
  const pfx = base.split("__")[0] ?? "";
  return SURFACES.includes(pfx) ? base.slice(pfx.length + 2) : base;
}

/**
 * Derive the tasked-spirit name from a subagent-staged source_file
 * (`<name>__agent-<id>.jsonl`, the convention from subagent-mine.ts), else null.
 * A drawer with a name reads as a spirit turn (lar_sidechain), kept queryable by
 * actor in the spirits wing — distinct from the main agent's verbatim.
 */
export function deriveAgent(sourceFile?: string): string | null {
  if (!sourceFile) return null;
  const base = stripSurfaceToken(sourceFile.replace(/\\/g, "/").split("/").pop() ?? "");
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
export function deriveHandle(sourceFile?: string, frontier?: string | null): string | null {
  if (!sourceFile) return null;
  const base = stripSurfaceToken(sourceFile.replace(/\\/g, "/").split("/").pop() ?? "");
  const m = /__agent-([^/]+?)__run-([^/]+)\.jsonl$/.exec(base);
  if (!m) return null;
  // The branch-frontier rides the RUN component (`run~frontier`), so split(".")[0] below
  // yields the branch-specific run — two same-session forks no longer collide.
  const run = frontier ? `${m[2]}~${frontier}` : m[2];
  return `${run}.${m[1]}`;
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
export function deriveRootHandle(sourceFile?: string, frontier?: string | null): string | null {
  if (!sourceFile) return null;
  const base = sourceFile.replace(/\\/g, "/").split("/").pop() ?? "";
  if (base.includes("__agent-")) return null; // a spirit — not a root
  const m = /^[^_]+__([^/]+)\.jsonl$/.exec(base); // <surface>__<run>.jsonl
  if (!m?.[1]) return null;
  // A same-session FORK gives both branches the same run → collision. The branch-frontier
  // makes the two roots distinct (`run~frontier`); a normal session carries none.
  return frontier ? `${m[1]}~${frontier}` : m[1];
}

/** Deterministic function-hall routing from the authored instruments (no LLM). */
function hallForHarvest(h: TurnHarvest): string {
  if (h.bearing && h.confidence >= 13) return "hall_facts"; // a decision landed, high-confidence
  if (h.huds.some((x) => (x.oodaHa ?? "").includes("↺"))) return "hall_events"; // an OODA loop closed
  if (h.sigilCount > 0 || h.voices.length > 0) return "hall_discoveries"; // structured exploration
  return ""; // leave the substrate's own hall untouched
}

/** Build the `lar_*` reading patch (chroma metadata = str/int/float/bool only). */
export function buildPatch(
  h: TurnHarvest,
  sourceFile?: string,
  branch?: BranchContext,
  capture?: CaptureContext,
): Record<string, string | number> {
  const frontier = deriveBranchFrontier(branch); // null unless the caller signals a fork
  const patch: Record<string, string | number> = {
    lar_hv: LAR_HV,
    lar_surface: deriveSurface(sourceFile),
    lar_band: h.band,
    lar_bearing_conf: h.confidence,
    lar_sigils: h.sigilCount,
    lar_water: h.waterCount,
  };
  // The fork-frontier token (when a same-session fork keyed a distinct handle) — declared in
  // LAR_SCHEMA so it where-filters; the handle already folds it in, this surfaces it standalone.
  if (frontier) patch["lar_frontier"] = frontier;
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
  const handle = deriveHandle(sourceFile, frontier);
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
    const root = deriveRootHandle(sourceFile, frontier);
    if (root) { patch["lar_agent_handle"] = root.slice(0, 120); patch["lar_root_handle"] = root.slice(0, 120); }
  }
  // `lar_ffz` — the rhythmic address, a NESTED-MEMBERSHIP CONTAINMENT PATH (NOT a clock,
  // NOT a wall-time projection; rhythm-only, zero causality). The FREE/factual cells:
  // Arc = source_file (the session-island), Pulse = the inscription atom (caller-supplied
  // content-address), Beat = the turn (caller-supplied, null-graceful). The fluid bands
  // (Theme/Measure) COMMIT on a gong: threaded here when the caller has run the gong
  // machinery, else absent → porous (the φ-band free-runs). Stamp whenever at least one
  // real cell is present (Arc alone still addresses the session); otherwise omit.
  const arc = deriveArc(sourceFile);
  if (
    arc != null ||
    capture?.pulse != null ||
    capture?.beat != null ||
    capture?.measure != null ||
    capture?.theme != null
  ) {
    const ffz = ffzMembershipAddress({
      arc,
      ...(capture?.theme != null ? { theme: capture.theme } : {}),
      ...(capture?.measure != null ? { measure: capture.measure } : {}),
      ...(capture?.beat != null ? { beat: capture.beat } : {}),
      ...(capture?.pulse != null ? { pulse: capture.pulse } : {}),
      profile: capture?.ffzProfile ?? "session",
    });
    patch["lar_ffz"] = ffz.slice(0, 120);
  }
  return patch;
}
