/**
 * ffz-orchestrator — the FFZ node-side FLUID-BAND pipeline (the last live seam).
 *
 * Arc + Pulse stamp at CAPTURE (the in-VM annotate, live). The fluid bands — Measure
 * (topic-shift) and Theme (thread cluster) — have no embedder at the capture site, so
 * they re-derive NODE-SIDE, post-hoc, on the local ARC-CLOSE gong (consolidate-when-
 * input-stops, per the unified model — the fluid bands re-cluster on rest, never
 * continuously). THIS module is that pipeline:
 *
 *   1. READBACK — read a session's stored vectors back out of the palace, ordered by
 *      (source_file, chunk_index), via `drawer_io.py embeddings` (the CONTENT plane,
 *      live). FORM/STRUCTURE planes (formpalace/structurepalace move/AST vectors keyed by
 *      verbatim_sha) are SCOPED — see the scope note below; absent them the quorum
 *      degrades gracefully to the one CONTENT plane (the N=1 {@link quorumStep} path).
 *   2. RUN — per session: the Measure servo over the ordered vectors → a segment LABEL
 *      per drawer ({@link quorumStep} always — content as plane-0, derived from the embeddings
 *      via {@link centroidDriftStep} when no multi-plane drift feed rides). Theme: the wing's
 *      drawer-graph clustered
 *      (networkx, in `drawer_io.py cluster`) + the {@link ffzAcceptRecluster} MDL guard.
 *      Beat: the drawer's `chunk_index` (free, from the readback).
 *   3. STAMP-BACK — overlay the committed fluid-band cells onto each drawer's EXISTING
 *      `lar_ffz` (parse → overlay Measure/Beat/Theme → re-serialize), preserving the
 *      birth-stamped Arc/Pulse, and merge the `{lar_ffz}` patch back via `drawer_io.py
 *      apply`. Deterministic + idempotent: a re-run derives the byte-identical address,
 *      so the merge is a no-op. The patch carries ONLY `lar_ffz` — ZERO causal/edge/itc
 *      key rides it (the PATH-B cut: `lar_ffz` is rhythm-only).
 *
 * SCOPE REPORT (form/structure plane availability):
 *   - CONTENT — LIVE. `drawer_io.py embeddings` reads the stored nomic vectors (never
 *     re-embeds), ordered per session. Always plane-0.
 *   - FORM — LIVE. `drawer_io.py form-embeddings` dumps the stored move-vectors flat,
 *     joined per session on verbatim_sha (plane-1 when a session joins it).
 *   - STRUCTURE — LIVE. `structurepalace_io.py structure-embeddings` dumps the stored AST-SHAPE
 *     vectors flat (the deterministic structural encoder — a node-type histogram + tree-shape
 *     stats, cosine-meaningful), expanded across each structure's provenance verbatim_shas
 *     (the last plane when a session joins it). The vectors POPULATE on the nuke-and-pave
 *     re-harvest (alongside content + form), so all THREE planes light at once.
 *   {@link orchestrateWing} runs at N = the planes a session joins (1 content-only · 2 +form ·
 *   3 +structure); {@link quorumStep} is plane-agnostic, so each plane drops straight in. The
 *   degradation stays graceful: an absent reader (or a session that joins nothing) drops the
 *   run back to the planes present, never breaking the N=1/N=2 paths.
 *
 * Lives BESIDE telemetry-writeback.ts (the other `lar_*` write membrane): one boundary,
 * the dependency points node/cli → mempalace, never the reverse.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/ffz-clock · lar:///ha.ka.ba/@lararium/api/living-grammar-palace#unification
 */

import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  centroidDriftStep,
  quorumServoInit,
  quorumStep,
  ffzMembershipAddress,
  ffzAcceptRecluster,
  FFZ_ADDRESS_ORDER,
  FFZ_ABSENT,
  type FfzCells,
  type MeasureServoConfig,
  type QuorumServoConfig,
} from "@lararium/mesh";
import { repoRoot } from "@lararium/mesh/node";

import { resolveMempalacePython, resolveStructurePalaceSpawn } from "./spawn-resolve.js";
import { resolveDrawerIo, TelemetryUnavailable } from "./telemetry-writeback.js";
import { mineWithServo } from "./mine-retry.js";
import { TIMEOUT_KILL_SIGNAL } from "./mine-timeout.js";

// ───────────────────────────────────────────────────────────────────────────
// Types — the seam shapes (the python I/O is INJECTED, so the run tests pure).
// ───────────────────────────────────────────────────────────────────────────

/** One drawer's stored-vector readback record (a row of `drawer_io.py embeddings`). */
export interface DrawerVector {
  /** the drawer id (the chroma id). */
  readonly id: string;
  /** the stored CONTENT (nomic) vector — the 1-plane Measure servo's cohesion feed. */
  readonly embedding: readonly number[];
  /** the per-session ingest ordinal — the Beat cell (null-graceful). */
  readonly chunkIndex: number | null;
  /** the session-island = the Arc cell source. */
  readonly sourceFile: string;
  /** the EXISTING `lar_ffz` (Arc + Pulse stamped at capture); overlaid, never discarded. */
  readonly ffz: string;
  /** the cross-graph join key to the form/structure palaces (deferred plane feed). */
  readonly verbatimSha?: string;
  /**
   * OPTIONAL multi-plane per-step DRIFT signals `[content, form, structure, …]` (higher =
   * more drift on that plane). Present ⇒ the {@link quorumStep} 3-plane servo fuses them; absent
   * ⇒ {@link quorumStep} at N=1 over the content drift derived from `embedding`. The quorum
   * degrades gracefully to the planes present — the form/structure feed seam (today: unfed → N=1).
   */
  readonly planes?: readonly number[];
  /**
   * OPTIONAL kapae down-weight (strand C) — a per-drawer salience in `(0,1]` (default 1.0)
   * scaling this member's Measure contribution (read back from `lar_salience`). A rewound /
   * road-not-taken drawer rides a floor salience: it contributes little fused surprise (cannot
   * trip a gong alone) and barely reshapes the baseline. {@link deriveMeasureLabels} passes it
   * as the per-step weight to {@link quorumStep}; absent ⇒ 1 (zero behavior change).
   */
  readonly salience?: number;
  /**
   * OPTIONAL fork frontier (strand C) — the branch component parsed from `lar_agent_handle`
   * (`run~frontier`). Present ⇒ the orchestrator groups this drawer by `(sourceFile, frontier)`
   * (each Arc × frontier runs its OWN Measure pass, so forked branches sharing a source_file
   * never bleed across the fork) AND overlays the ultrametric Arc cell `sourceFile~frontier`
   * (so {@link ffzCoDepth} breaks at Arc between branches — forks read concurrent-not-near).
   */
  readonly frontier?: string;
}

/** The Theme-cluster reading (one line of `drawer_io.py cluster`). */
export interface ClusterReading {
  /** drawer id → community LABEL (deterministic, ranked by min member ordinal). */
  readonly communities: Readonly<Record<string, number>>;
  /** the graph modularity (the ffzAcceptRecluster guard reads this). */
  readonly modularity: number;
  /** the clustered drawer count (the MDL evidence). */
  readonly members: number;
  /** the graph edge count. */
  readonly edges: number;
}

/** Read a wing's stored vectors back, ordered per session. */
export type EmbeddingsReader = (wing: string) => DrawerVector[];
/** Cluster a wing's drawer-graph (the Theme band); null ⇒ no cluster reading. */
export type ClusterReader = (wing: string) => ClusterReading | null;
/**
 * Read a wing's stored FORM-plane vectors back, joined by `verbatim_sha` (the
 * cross-graph join key). The SECOND plane of the two-planes braid: when wired the
 * Measure servo runs the quorum at N=2 (content plane-0 · form plane-1), so the
 * form/move tension-moments light up. Absent ⇒ the run stays 1-plane (today).
 */
export type FormVectorReader = (wing: string) => Map<string, readonly number[]>;
/**
 * Read a wing's stored STRUCTURE-plane vectors back, joined by `verbatim_sha` (the same
 * cross-graph join key). The THIRD plane of the braid: when wired AND the form plane is
 * also present the Measure servo runs the quorum at N=3 (content plane-0 · form plane-1 ·
 * structure plane-2), so the structural/AST-shape tension-moments light up. Mirrors
 * {@link FormVectorReader} exactly — the structurepalace structure vectors (the deterministic
 * AST-shape encoding), expanded across each structure's provenance verbatim_shas. Absent
 * ⇒ the run degrades to the planes present (content, or content+form).
 */
export type StructureVectorReader = (wing: string) => Map<string, readonly number[]>;
/** Merge the `{lar_ffz}` patches back onto the drawers; returns the applied count. */
export type PatchWriter = (
  patches: ReadonlyArray<{ readonly id: string; readonly patch: Record<string, string | number> }>,
) => number;

/** The injected I/O seams. */
export interface OrchestrateDeps {
  readonly readEmbeddings: EmbeddingsReader;
  /** Optional — absent ⇒ Theme stays porous (Measure + Beat still stamp). */
  readonly readClusters?: ClusterReader;
  /**
   * Optional — absent ⇒ the run stays CONTENT-only (1-plane, today's behavior exactly).
   * Present (and a session joins it) ⇒ the form plane rides as plane-1, the quorum runs N=2.
   */
  readonly readFormVectors?: FormVectorReader;
  /**
   * Optional — absent ⇒ the structure plane never engages (1 or 2 planes per the form seam).
   * Present (and a session joins it) ⇒ the structure plane rides as the last plane, the quorum
   * runs at N=3 when the form plane is also present (content · form · structure), or N=2 (content
   * · structure) when form is absent. Mirrors {@link readFormVectors} — the seam, not new math.
   */
  readonly readStructureVectors?: StructureVectorReader;
  readonly writePatches: PatchWriter;
}

/** Tunables for one orchestrator run. */
export interface OrchestrateOptions {
  /** Servo config override (Measure one-plane AND/OR quorum multi-plane). */
  readonly servo?: Partial<MeasureServoConfig & QuorumServoConfig>;
  /** The prior Theme modularity (the recluster guard baseline); default 0 (no prior). */
  readonly prevModularity?: number;
  /** The Theme accept guard's MDL cost in bits; default {@link ffzAcceptRecluster}'s. */
  readonly themeMdlBits?: number;
}

/** What one run did (counts the report surfaces). */
export interface OrchestrateResult {
  /** vectors read back. */
  readonly drawers: number;
  /** distinct sessions (Arcs) the servo ran over. */
  readonly sessions: number;
  /** drawers given a Measure label (= every drawer with a vector). */
  readonly measured: number;
  /** topic-shift gongs (new-segment wavefronts) across all sessions. */
  readonly gongs: number;
  /** drawers given a Theme label (0 unless a cluster reading was accepted). */
  readonly themed: number;
  /** whether the Theme recluster cleared the MDL/modularity guard. */
  readonly themeAccepted: boolean;
  /** patches merged back. */
  readonly applied: number;
  /** planes the Measure servo ran over (1 = content-only; 2 = +form; 3 = +structure). */
  readonly planesPresent: number;
  /** form/structure TENSION-moments — quorum steps where the planes disagreed (Signal-Jam). */
  readonly conflicts: number;
}

// ───────────────────────────────────────────────────────────────────────────
// PURE core — parse / overlay / run (no python, fully testable).
// ───────────────────────────────────────────────────────────────────────────

/** Replica of build-patch's (private) `deriveArc` — the Arc fallback when an existing
 *  address carries none (every captured drawer normally already holds it). */
function deriveArcLocal(sourceFile: string): string | undefined {
  if (!sourceFile) return undefined;
  const base = sourceFile.replace(/\\/g, "/").split("/").pop() ?? "";
  const noExt = base.replace(/\.[^.]+$/, "");
  return noExt || undefined;
}

/**
 * Parse an existing `lar_ffz` membership address back into its cells (the inverse of
 * {@link ffzMembershipAddress}). A porous ({@link FFZ_ABSENT}) or empty segment reads as
 * undefined; a missing trailing segment likewise. Profile defaults to "session".
 */
export function parseFfzCells(address: string): FfzCells {
  if (!address) return { profile: "session" };
  const slash = address.indexOf("/");
  const profile = slash >= 0 ? address.slice(0, slash) || "session" : "session";
  const tuple = slash >= 0 ? address.slice(slash + 1) : address;
  const segs = tuple ? tuple.split(".") : [];
  const at = (i: number): string | undefined => {
    const v = segs[i];
    return v == null || v === FFZ_ABSENT || v === "" ? undefined : v;
  };
  const cells: Record<string, string | undefined> = {};
  FFZ_ADDRESS_ORDER.forEach((band, i) => {
    const v = at(i);
    if (v !== undefined) cells[band.toLowerCase()] = v;
  });
  return { profile, ...cells } as FfzCells;
}

/**
 * Overlay the fluid bands onto a drawer's existing address — parse, set Measure/Beat/Theme
 * where given (preferring the overlay, keeping the existing otherwise), keep the birth-stamped
 * Arc + Pulse, re-serialize. PURE + deterministic. `0` is a valid label (segment 0 / chunk 0),
 * so the merge uses nullish-coalescing, never truthiness.
 */
export function overlayFfzAddress(
  existing: string,
  overlay: { measure?: string | number; beat?: string | number; theme?: string | number; arc?: string | number },
  fallback: { arc?: string } = {},
): string {
  const base = parseFfzCells(existing);
  // Conditional spreads (not undefined-valued keys) — exactOptionalPropertyTypes: an absent
  // cell is OMITTED, which ffzMembershipAddress renders porous; never assigned `undefined`.
  const theme = overlay.theme ?? base.theme;
  // `overlay.arc` is an OVERRIDE (the ultrametric fork encoding `sourceFile~frontier`),
  // taking precedence over the birth-stamped Arc; else keep the birth Arc, else the fallback.
  const arc = overlay.arc ?? base.arc ?? fallback.arc;
  const measure = overlay.measure ?? base.measure;
  const beat = overlay.beat ?? base.beat;
  const cells: FfzCells = {
    profile: base.profile ?? "session",
    ...(theme != null ? { theme } : {}),
    ...(arc != null ? { arc } : {}),
    ...(measure != null ? { measure } : {}),
    ...(beat != null ? { beat } : {}),
    ...(base.pulse != null ? { pulse: base.pulse } : {}),
  };
  return ffzMembershipAddress(cells);
}

/** One per-plane running-centroid drift tracker — the turn-grained "repeat the last joined
 *  vector" rule shared by the FORM and STRUCTURE planes. A drawer with NO join feeds a REPEAT
 *  of the last joined vector (the chunks of one turn share a verbatim_sha ⇒ one vector ⇒ the
 *  plane drift reads ~0 mid-turn and lights only at a turn boundary — CORRECT, not a bug).
 *  Until the first join there is no vector to repeat, so the drift stays 0. PURE-ish (closes
 *  over its own running state). */
function makeJoinTracker(bySha: ReadonlyMap<string, readonly number[]>) {
  let centroid: readonly number[] | null = null;
  let last: readonly number[] | null = null;
  let count = 0;
  return (verbatimSha: string | undefined): number => {
    const joined = verbatimSha != null ? bySha.get(verbatimSha) : undefined;
    const vec: readonly number[] | null = joined ?? last; // no join ⇒ repeat the last vector
    if (!vec) return 0;
    const step = centroidDriftStep(centroid, vec, count);
    centroid = step.centroid;
    count += 1;
    last = vec;
    return step.drift;
  };
}

/**
 * The multi-plane PRE-PASS — run ONE {@link centroidDriftStep} tracker per plane over a session
 * (in order) → a per-drawer drift vector. PURE. The drift vector's PLANES (in order):
 *
 *   CONTENT   — always plane-0: the running-centroid drift of each drawer's embedding.
 *   FORM      — present iff `formBySha` is supplied: the joined form-vector's drift (see
 *               {@link makeJoinTracker} for the turn-grained repeat-last rule).
 *   STRUCTURE — present iff `structBySha` is supplied: the joined structure-vector's drift,
 *               the SAME tracker against the structurepalace AST-shape vectors (the 3rd quorum plane).
 *
 * Backward-compatible: called with `(vectors, formMap)` it yields `[content, form]` (today's
 * 2-plane output exactly); with `(vectors, formMap, structMap)` it yields `[content, form,
 * structure]`; with `(vectors, undefined, structMap)` it yields `[content, structure]`. No
 * gong-feedback reseed here (a pure pre-pass; the gong is decided downstream in {@link
 * quorumStep}). The servo's per-plane EWMA-z standardizes the scales, so the raw drift
 * magnitudes need not match across planes.
 */
export function computePlaneDrifts(
  sessionVectors: readonly DrawerVector[],
  formBySha?: ReadonlyMap<string, readonly number[]>,
  structBySha?: ReadonlyMap<string, readonly number[]>,
): Map<string, readonly number[]> {
  const drifts = new Map<string, readonly number[]>();
  let contentCentroid: readonly number[] | null = null;
  let contentCount = 0;
  const formTracker = formBySha ? makeJoinTracker(formBySha) : undefined;
  const structTracker = structBySha ? makeJoinTracker(structBySha) : undefined;
  for (const v of sessionVectors) {
    const c = centroidDriftStep(contentCentroid, v.embedding, contentCount);
    contentCentroid = c.centroid;
    contentCount += 1;

    const drift: number[] = [c.drift];
    if (formTracker) drift.push(formTracker(v.verbatimSha));
    if (structTracker) drift.push(structTracker(v.verbatimSha));
    drifts.set(v.id, drift);
  }
  return drifts;
}

/**
 * Run the Measure servo over ONE session's vectors (already ordered by chunk_index) →
 * a segment LABEL per drawer id. ALWAYS routes through {@link quorumStep} (the C-0 collapse —
 * content is plane-0). Three routes, in precedence:
 *
 *   1. FORM (2-plane) — a `formBySha` reader is wired AND this session joins it: the
 *      {@link computePlaneDrifts} pre-pass derives `[content, form]` drifts and the quorum runs
 *      at N=2 (content plane-0, form plane-1). `effGong = min(quorumGong, 2) = 2` ⇒ BOTH planes
 *      must co-fire to gong; a lone form scream reads `conflict` (the tension-moment).
 *   2. EXPLICIT planes — a multi-plane `planes` drift feed rides the records (the test/deferred
 *      3-plane path): fuse them directly.
 *   3. CONTENT-only (1-plane) — derive the content drift from the embeddings
 *      ({@link centroidDriftStep}) as the sole plane-0; `effGong = min(quorumGong, 1) = 1`
 *      reproduces the one-plane gong byte-for-byte (today's behavior, IDENTICAL when no form
 *      reader is wired). PURE.
 */
export function deriveMeasureLabels(
  sessionVectors: readonly DrawerVector[],
  servo: Partial<MeasureServoConfig & QuorumServoConfig> = {},
  formBySha?: ReadonlyMap<string, readonly number[]>,
  structBySha?: ReadonlyMap<string, readonly number[]>,
): { labels: Map<string, string>; gongs: number; planes: number; conflicts: number } {
  const labels = new Map<string, string>();
  let gongs = 0;
  let conflicts = 0;

  // ROUTE 1 — the FORM and/or STRUCTURE plane(s) when a reader is wired and this session joins
  // it. Content is always plane-0; form (plane-1) and structure (the next plane) ride only when
  // their map is non-empty AND a drawer's verbatim_sha joins it. The quorum runs at N = the count
  // of present planes (2 = content+one, 3 = content+form+structure); the per-plane EWMA-z + ZCA
  // whitening + co-firing ladder are PLANE-AGNOSTIC, so the 3rd plane drops in with no new math.
  const joins = (m: ReadonlyMap<string, readonly number[]> | undefined): boolean =>
    m != null && m.size > 0 && sessionVectors.some((v) => v.verbatimSha != null && m.has(v.verbatimSha));
  const formMap = joins(formBySha) ? formBySha : undefined;
  const structMap = joins(structBySha) ? structBySha : undefined;
  if (formMap || structMap) {
    const n = 1 + (formMap ? 1 : 0) + (structMap ? 1 : 0);
    const planeDrifts = computePlaneDrifts(sessionVectors, formMap, structMap);
    const zero = new Array(n).fill(0) as number[];
    let st = quorumServoInit(n);
    for (const v of sessionVectors) {
      const drift = planeDrifts.get(v.id) ?? zero;
      const step = quorumStep(st, drift, servo, v.salience ?? 1);
      st = step.state;
      labels.set(v.id, step.label);
      if (step.gonged) gongs += 1;
      if (step.conflict) conflicts += 1;
    }
    return { labels, gongs, planes: n, conflicts };
  }

  // ROUTE 2 — an explicit multi-plane drift feed on the records.
  const multiPlane = sessionVectors.find((v) => v.planes && v.planes.length > 1)?.planes?.length;
  if (multiPlane) {
    let st = quorumServoInit(multiPlane);
    for (const v of sessionVectors) {
      const drift = v.planes && v.planes.length === multiPlane ? v.planes : new Array(multiPlane).fill(0);
      const step = quorumStep(st, drift, servo, v.salience ?? 1);
      st = step.state;
      labels.set(v.id, step.label);
      if (step.gonged) gongs += 1;
      if (step.conflict) conflicts += 1;
    }
    return { labels, gongs, planes: multiPlane, conflicts };
  }

  // ROUTE 3 — CONTENT-only: derive the content drift against the running centroid, quorum at N=1.
  let st = quorumServoInit(1);
  let centroid: readonly number[] | null = null;
  for (const v of sessionVectors) {
    const openCount = st.count;
    const { drift, centroid: folded } = centroidDriftStep(centroid, v.embedding, openCount);
    const step = quorumStep(st, [drift], servo, v.salience ?? 1);
    centroid = step.gonged || openCount === 0 ? [...v.embedding] : folded;
    st = step.state;
    labels.set(v.id, step.label);
    if (step.gonged) gongs += 1;
    if (step.conflict) conflicts += 1;
  }
  return { labels, gongs, planes: 1, conflicts };
}

/**
 * The orchestrator run — read vectors, run the Measure servo per session + the Theme
 * cluster over the wing, overlay the fluid bands onto each drawer's `lar_ffz`, write back.
 * PURE but for the three injected seams ({@link OrchestrateDeps}). Deterministic + idempotent.
 */
export function orchestrateWing(
  wing: string,
  deps: OrchestrateDeps,
  opts: OrchestrateOptions = {},
): OrchestrateResult {
  const vectors = deps.readEmbeddings(wing);
  // The FORM plane (the 2nd plane of the braid) — read once for the wing, joined per
  // session on verbatim_sha. Absent ⇒ formBySha undefined ⇒ every session stays 1-plane.
  const formBySha = deps.readFormVectors ? deps.readFormVectors(wing) : undefined;
  // The STRUCTURE plane (the 3rd plane) — read once for the wing, joined the SAME way on
  // verbatim_sha. Absent ⇒ structBySha undefined ⇒ the plane never engages (graceful degrade).
  const structBySha = deps.readStructureVectors ? deps.readStructureVectors(wing) : undefined;

  // Group by (source_file, frontier) — the Arc × fork-branch, preserving the readback order
  // (drawer_io.py already sorts by (source_file, chunk_index, id)). Two forked branches that
  // share a source_file but diverge at a frontier would otherwise INTERLEAVE under one servo
  // pass, bleeding their Measure segments across the fork; keying on the frontier runs each
  // branch its OWN pass (each restarts at Measure 0). Absent frontier ⇒ key = source_file
  // (today's behavior exactly). The NUL separator can never appear in either component.
  const sessions = new Map<string, DrawerVector[]>();
  for (const v of vectors) {
    const key = v.frontier ? `${v.sourceFile}\u0000${v.frontier}` : v.sourceFile;
    const arr = sessions.get(key);
    if (arr) arr.push(v);
    else sessions.set(key, [v]);
  }

  // MEASURE — per session.
  const measureLabels = new Map<string, string>();
  let gongs = 0;
  let conflicts = 0;
  let planesPresent = 1;
  for (const recs of sessions.values()) {
    const { labels, gongs: g, planes, conflicts: c } = deriveMeasureLabels(recs, opts.servo, formBySha, structBySha);
    for (const [id, l] of labels) measureLabels.set(id, l);
    gongs += g;
    conflicts += c;
    planesPresent = Math.max(planesPresent, planes);
  }

  // THEME — cluster the wing's drawer-graph, MDL/modularity-guarded.
  let themeLabels: Readonly<Record<string, number>> = {};
  let themeAccepted = false;
  const cluster = deps.readClusters ? deps.readClusters(wing) : null;
  if (cluster && cluster.members > 0 && Object.keys(cluster.communities).length > 0) {
    const evidenceBits = Math.log2(Math.max(2, cluster.members));
    themeAccepted = ffzAcceptRecluster({
      prevModularity: opts.prevModularity ?? 0,
      newModularity: cluster.modularity,
      evidenceBits,
      ...(opts.themeMdlBits != null ? { mdlBits: opts.themeMdlBits } : {}),
    });
    if (themeAccepted) themeLabels = cluster.communities;
  }

  // STAMP-BACK — overlay the fluid bands onto each drawer's existing address.
  const patches: { id: string; patch: Record<string, string | number> }[] = [];
  let measured = 0;
  let themed = 0;
  for (const v of vectors) {
    const measure = measureLabels.get(v.id);
    if (measure === undefined) continue; // no vector ⇒ no fluid band to stamp
    measured += 1;
    const overlay: { measure?: string | number; beat?: string | number; theme?: string | number; arc?: string | number } = { measure };
    if (v.chunkIndex != null) overlay.beat = v.chunkIndex;
    const themeLabel = themeAccepted ? themeLabels[v.id] : undefined;
    if (themeLabel !== undefined) {
      overlay.theme = themeLabel;
      themed += 1;
    }
    const arc = deriveArcLocal(v.sourceFile);
    // ULTRAMETRIC fork encoding — when a frontier is present, OVERLAY the Arc cell as
    // `<arc>~<frontier>` (mirrors the `run~frontier` idiom). A pre-fork drawer (Arc=<arc>)
    // and a post-fork branch (Arc=<arc>~<frontier>) then DIVERGE at the Arc band, so
    // ffzCoDepth breaks at Arc — two forks read concurrent-not-near, never falsely same-Arc.
    if (v.frontier) {
      // Take the bare arc (the part BEFORE any prior `~frontier` suffix) so a re-run derives
      // the byte-identical `<arc>~<frontier>` — idempotent, never `<arc>~<frontier>~<frontier>`.
      const stamped = String(parseFfzCells(v.ffz).arc ?? arc ?? v.sourceFile);
      const bareArc = stamped.split("~")[0];
      overlay.arc = `${bareArc}~${v.frontier}`;
    }
    const address = overlayFfzAddress(v.ffz, overlay, arc != null ? { arc } : {});
    patches.push({ id: v.id, patch: { lar_ffz: address.slice(0, 120) } });
  }

  const applied = patches.length > 0 ? deps.writePatches(patches) : 0;
  return {
    drawers: vectors.length,
    sessions: sessions.size,
    measured,
    gongs,
    themed,
    themeAccepted,
    applied,
    planesPresent,
    conflicts,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// The default python-backed seams (drawer_io.py — the substrate boundary).
// ───────────────────────────────────────────────────────────────────────────

interface PyContext {
  readonly PY: string;
  readonly DRAWER_IO: string;
  readonly submoduleRoot: string;
  readonly pyEnv: NodeJS.ProcessEnv;
}

/** Resolve the python + drawer_io.py + PYTHONPATH (mirrors telemetry-writeback's setup). */
function pyContext(): PyContext {
  const PY = resolveMempalacePython();
  if (!PY) throw new TelemetryUnavailable("no python holds mempalace — create ~/.venv and pip install the sidecar (`lares wake --install`)");
  const DRAWER_IO = resolveDrawerIo();
  if (!existsSync(DRAWER_IO)) throw new TelemetryUnavailable(`drawer_io.py missing at ${DRAWER_IO}`);
  const submoduleRoot = join(repoRoot, "mempalace");
  const pyEnv = { ...process.env, PYTHONPATH: submoduleRoot + (process.env["PYTHONPATH"] ? `:${process.env["PYTHONPATH"]}` : "") };
  return { PY, DRAWER_IO, submoduleRoot, pyEnv };
}

/** Default {@link EmbeddingsReader} — `drawer_io.py embeddings --wing W` (CONTENT plane). */
export function pythonEmbeddingsReader(wing: string): DrawerVector[] {
  const { PY, DRAWER_IO, submoduleRoot, pyEnv } = pyContext();
  const out = mineWithServo("drawer-io-embeddings", (timeoutMs) =>
    execFileSync(PY, [DRAWER_IO, "embeddings", ...(wing ? ["--wing", wing] : [])], {
      cwd: submoduleRoot, env: pyEnv, maxBuffer: 1 << 30, encoding: "utf8",
      timeout: timeoutMs, killSignal: TIMEOUT_KILL_SIGNAL,
    }),
  );
  return out.split("\n").filter(Boolean).map((l) => {
    const r = JSON.parse(l) as {
      id: string; embedding: number[]; chunk_index: number | null;
      source_file?: string; lar_ffz?: string; verbatim_sha?: string;
      lar_salience?: number | null; lar_agent_handle?: string | null;
    };
    // Strand C ride-alongs (projected for free off the same readback): the kapae salience
    // down-weight + the fork frontier parsed from the main-agent root handle.
    const frontier = parseFrontier(r.lar_agent_handle);
    return {
      id: r.id,
      embedding: r.embedding,
      chunkIndex: r.chunk_index ?? null,
      sourceFile: r.source_file ?? "",
      ffz: r.lar_ffz ?? "",
      ...(r.verbatim_sha ? { verbatimSha: r.verbatim_sha } : {}),
      ...(r.lar_salience != null ? { salience: r.lar_salience } : {}),
      ...(frontier ? { frontier } : {}),
    };
  });
}

/**
 * Parse the fork frontier from a `lar_agent_handle` (`run~frontier`) — split on `~`, take the
 * frontier component. No `~` (a bare run handle, the un-forked main line) ⇒ undefined (the
 * drawer groups by source_file alone, today's behavior). Empty/absent handle ⇒ undefined.
 */
function parseFrontier(handle: string | null | undefined): string | undefined {
  if (!handle) return undefined;
  const i = handle.indexOf("~");
  if (i < 0) return undefined;
  const frontier = handle.slice(i + 1).trim();
  return frontier || undefined;
}

/**
 * Default {@link FormVectorReader} — `drawer_io.py form-embeddings` (the FORM plane).
 * Reads the stored form-vectors back from the "form" collection (NEVER re-embeds), keyed by
 * `verbatim_sha` → the form vector. A `--wing` filter does not apply (form is keyed by sha,
 * not wing-scoped); the orchestrator joins per session on the content readback's verbatim_sha.
 */
export function pythonFormEmbeddingsReader(_wing: string): Map<string, readonly number[]> {
  const { PY, DRAWER_IO, submoduleRoot, pyEnv } = pyContext();
  const out = mineWithServo("drawer-io-form-embeddings", (timeoutMs) =>
    execFileSync(PY, [DRAWER_IO, "form-embeddings"], {
      cwd: submoduleRoot, env: pyEnv, maxBuffer: 1 << 30, encoding: "utf8",
      timeout: timeoutMs, killSignal: TIMEOUT_KILL_SIGNAL,
    }),
  );
  const bySha = new Map<string, readonly number[]>();
  for (const l of out.split("\n").filter(Boolean)) {
    const r = JSON.parse(l) as { id: string; embedding: number[]; verbatim_sha?: string };
    const key = r.verbatim_sha || r.id;
    if (key) bySha.set(key, r.embedding);
  }
  return bySha;
}

/**
 * Default {@link StructureVectorReader} — `structurepalace_io.py structure-embeddings` (the STRUCTURE
 * plane). Reads the stored AST-shape vectors back from the `.structurepalace` (NEVER re-encodes),
 * expanded across each structure's provenance verbatim_shas → `verbatim_sha` → the structure
 * vector. The structurepalace dir defaults inside the script ($LAR_ROOT/~ .lares/.structurepalace), so no
 * `--palace` is passed; a `--wing` filter does not apply (structure is keyed by sha, not
 * wing-scoped). A missing/empty structurepalace yields no rows ⇒ the structure plane never engages.
 */
export function pythonStructureEmbeddingsReader(_wing: string): Map<string, readonly number[]> {
  const { python: PY, script: STRUCTUREPALACE_IO, scriptPresent, submoduleRoot } = resolveStructurePalaceSpawn();
  if (!PY) throw new TelemetryUnavailable("no python holds mempalace — create ~/.venv and pip install the sidecar (`lares wake --install`)");
  if (!scriptPresent) throw new TelemetryUnavailable(`structurepalace_io.py missing at ${STRUCTUREPALACE_IO}`);
  const pyEnv = { ...process.env, PYTHONPATH: submoduleRoot + (process.env["PYTHONPATH"] ? `:${process.env["PYTHONPATH"]}` : "") };
  const out = mineWithServo("structurepalace-io-structure-embeddings", (timeoutMs) =>
    execFileSync(PY, [STRUCTUREPALACE_IO, "structure-embeddings"], {
      cwd: submoduleRoot, env: pyEnv, maxBuffer: 1 << 30, encoding: "utf8",
      timeout: timeoutMs, killSignal: TIMEOUT_KILL_SIGNAL,
    }),
  );
  const bySha = new Map<string, readonly number[]>();
  for (const l of out.split("\n").filter(Boolean)) {
    const r = JSON.parse(l) as { id: string; embedding: number[]; verbatim_sha?: string };
    const key = r.verbatim_sha || r.id;
    if (key) bySha.set(key, r.embedding);
  }
  return bySha;
}

/** Default {@link ClusterReader} — `drawer_io.py cluster --wing W` (Theme band). */
export function pythonClusterReader(wing: string): ClusterReading | null {
  const { PY, DRAWER_IO, submoduleRoot, pyEnv } = pyContext();
  const out = mineWithServo("drawer-io-cluster", (timeoutMs) =>
    execFileSync(PY, [DRAWER_IO, "cluster", ...(wing ? ["--wing", wing] : [])], {
      cwd: submoduleRoot, env: pyEnv, maxBuffer: 1 << 30, encoding: "utf8",
      timeout: timeoutMs, killSignal: TIMEOUT_KILL_SIGNAL,
    }),
  );
  const line = out.split("\n").filter(Boolean).pop();
  if (!line) return null;
  return JSON.parse(line) as ClusterReading;
}

/** Default {@link PatchWriter} — merge the `{lar_ffz}` patches via `drawer_io.py apply`. */
export function pythonPatchWriter(
  patches: ReadonlyArray<{ readonly id: string; readonly patch: Record<string, string | number> }>,
): number {
  if (patches.length === 0) return 0;
  const { PY, DRAWER_IO, submoduleRoot, pyEnv } = pyContext();
  const pf = join(tmpdir(), `ffz-orchestrator-patch-${process.pid}.ndjson`);
  writeFileSync(pf, patches.map((p) => JSON.stringify(p)).join("\n") + "\n");
  try {
    const out = mineWithServo("drawer-io-apply", (timeoutMs) =>
      execFileSync(PY, [DRAWER_IO, "apply", pf], {
        cwd: submoduleRoot, env: pyEnv, maxBuffer: 1 << 30, encoding: "utf8",
        timeout: timeoutMs, killSignal: TIMEOUT_KILL_SIGNAL,
      }),
    );
    try { return (JSON.parse(out.trim()) as { applied: number }).applied; } catch { return patches.length; }
  } finally {
    rmSync(pf, { force: true });
  }
}

/**
 * The LIVE run — wire the python-backed seams and orchestrate a wing on its Arc-close.
 * Throws {@link TelemetryUnavailable} when the python substrate is absent (the caller
 * renders a clean error, as telemetry-writeback does).
 */
export function orchestrateWingLive(wing: string, opts: OrchestrateOptions = {}): OrchestrateResult {
  return orchestrateWing(
    wing,
    {
      readEmbeddings: pythonEmbeddingsReader,
      readClusters: pythonClusterReader,
      readFormVectors: pythonFormEmbeddingsReader,
      readStructureVectors: pythonStructureEmbeddingsReader,
      writePatches: pythonPatchWriter,
    },
    opts,
  );
}
