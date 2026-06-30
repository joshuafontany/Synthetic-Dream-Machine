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
 *      live). FORM/STRUCTURE planes (formpalace/astpalace move/AST vectors keyed by
 *      verbatim_sha) are SCOPED — see the scope note below; absent them the quorum
 *      degrades gracefully to the one CONTENT plane (the 1-plane {@link measureStep}).
 *   2. RUN — per session: the Measure servo over the ordered vectors → a segment LABEL
 *      per drawer (the {@link measureStep} one-plane servo, or {@link quorumStep} when a
 *      multi-plane drift feed is present). Theme: the wing's drawer-graph clustered
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
 *     re-embeds), ordered per session. The 1-plane Measure servo runs on these now.
 *   - FORM — the formpalace move-vectors EXIST (stored at capture, keyed by verbatim_sha)
 *     but there is NO session-ordered BATCH vector export beside `drawer_io embeddings`
 *     (only per-key holder RPC, `FormPalace.get`). REMAINING PLUMBING: a
 *     `form_encoder.py embeddings --wing` batch export joined on verbatim_sha.
 *   - STRUCTURE — the astpalace is content-addressed by STRUCTURAL HASH with a recurrence
 *     tally; it stores no per-drawer DENSE vector ordered per session. REMAINING PLUMBING:
 *     a structure-vector encoding + batch export, same join key.
 *   Until those land, {@link orchestrateWing} runs CONTENT-only (planesPresent = 1); the
 *   {@link quorumStep} multi-plane path is wired and reachable (feed a `planes` drift
 *   vector per drawer) so the form/structure feed drops straight in.
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
  measureServoInit,
  measureStep,
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

import { resolveMempalacePython } from "./spawn-resolve.js";
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
   * more drift on that plane). Present ⇒ the {@link quorumStep} 3-plane servo runs; absent
   * ⇒ the 1-plane {@link measureStep} over `embedding`. The quorum degrades gracefully to
   * the planes present — this is the form/structure feed seam (today: unfed → 1-plane).
   */
  readonly planes?: readonly number[];
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
/** Merge the `{lar_ffz}` patches back onto the drawers; returns the applied count. */
export type PatchWriter = (
  patches: ReadonlyArray<{ readonly id: string; readonly patch: Record<string, string | number> }>,
) => number;

/** The injected I/O seams. */
export interface OrchestrateDeps {
  readonly readEmbeddings: EmbeddingsReader;
  /** Optional — absent ⇒ Theme stays porous (Measure + Beat still stamp). */
  readonly readClusters?: ClusterReader;
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
  /** planes the Measure servo ran over (1 = content-only; form/structure plumbing pending). */
  readonly planesPresent: number;
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
  overlay: { measure?: string | number; beat?: string | number; theme?: string | number },
  fallback: { arc?: string } = {},
): string {
  const base = parseFfzCells(existing);
  // Conditional spreads (not undefined-valued keys) — exactOptionalPropertyTypes: an absent
  // cell is OMITTED, which ffzMembershipAddress renders porous; never assigned `undefined`.
  const theme = overlay.theme ?? base.theme;
  const arc = base.arc ?? fallback.arc;
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

/**
 * Run the Measure servo over ONE session's vectors (already ordered by chunk_index) →
 * a segment LABEL per drawer id. Uses the 3-plane {@link quorumStep} when a `planes` drift
 * feed rides the records (graceful degradation to the planes present), else the 1-plane
 * {@link measureStep} over the content embeddings. PURE.
 */
export function deriveMeasureLabels(
  sessionVectors: readonly DrawerVector[],
  servo: Partial<MeasureServoConfig & QuorumServoConfig> = {},
): { labels: Map<string, string>; gongs: number; planes: number } {
  const labels = new Map<string, string>();
  let gongs = 0;
  const planes = sessionVectors.find((v) => v.planes && v.planes.length > 1)?.planes?.length ?? 1;

  if (planes > 1) {
    // quorumServoInit's param infers the literal `3` (its default = MEASURE_PLANES.length);
    // the runtime builds `planeCount`-length arrays for any N, so widen the call site.
    let st = quorumServoInit(planes as 3);
    for (const v of sessionVectors) {
      const drift = v.planes && v.planes.length === planes ? v.planes : new Array(planes).fill(0);
      const step = quorumStep(st, drift, servo);
      st = step.state;
      labels.set(v.id, step.label);
      if (step.gonged) gongs += 1;
    }
  } else {
    let st = measureServoInit();
    for (const v of sessionVectors) {
      const step = measureStep(st, v.embedding, servo);
      st = step.state;
      labels.set(v.id, step.label);
      if (step.gonged) gongs += 1;
    }
  }
  return { labels, gongs, planes };
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

  // Group by source_file (the Arc = session-island), preserving the readback order
  // (drawer_io.py already sorts by (source_file, chunk_index, id)).
  const sessions = new Map<string, DrawerVector[]>();
  for (const v of vectors) {
    const arr = sessions.get(v.sourceFile);
    if (arr) arr.push(v);
    else sessions.set(v.sourceFile, [v]);
  }

  // MEASURE — per session.
  const measureLabels = new Map<string, string>();
  let gongs = 0;
  let planesPresent = 1;
  for (const recs of sessions.values()) {
    const { labels, gongs: g, planes } = deriveMeasureLabels(recs, opts.servo);
    for (const [id, l] of labels) measureLabels.set(id, l);
    gongs += g;
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
    const overlay: { measure?: string | number; beat?: string | number; theme?: string | number } = { measure };
    if (v.chunkIndex != null) overlay.beat = v.chunkIndex;
    const themeLabel = themeAccepted ? themeLabels[v.id] : undefined;
    if (themeLabel !== undefined) {
      overlay.theme = themeLabel;
      themed += 1;
    }
    const arc = deriveArcLocal(v.sourceFile);
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
    };
    return {
      id: r.id,
      embedding: r.embedding,
      chunkIndex: r.chunk_index ?? null,
      sourceFile: r.source_file ?? "",
      ffz: r.lar_ffz ?? "",
      ...(r.verbatim_sha ? { verbatimSha: r.verbatim_sha } : {}),
    };
  });
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
    { readEmbeddings: pythonEmbeddingsReader, readClusters: pythonClusterReader, writePatches: pythonPatchWriter },
    opts,
  );
}
