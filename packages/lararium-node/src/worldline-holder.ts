/**
 * worldline-holder — the @daemon-resident, NODE-SIDE worldline read surface. Holds the LIVE ITC
 * registry (the in-memory WorldlineCausal, persisted across captures) and serves the two reads the
 * flow-lens substrate needs:
 *
 *   Well 1 (ITC LIVE-READ, the TIME axis) — `ingestEdges` rebuilds the registry by projecting the
 *     durable edge-DAG (worldlineCausalFromEdges); `compare(a, b)` answers the concurrent-capable
 *     causal verdict (before / after / concurrent / equal) the rhythmic clock can never give.
 *
 *   Well 3 (the TRAJECTORY, the CORE permainan substrate) — `trajectory(handle, stubs)` runs the pure
 *     Turn→Trajectory functor (orderTrajectory) over a handle's captured turns, then joins each
 *     turn's move-space position from the FORM store (formpalace, keyed by verbatim_sha). The path
 *     the flow-lens reads.
 *
 *   Well 4 (NULL-READY) — `nullBaseline` rides the SAME assembled path through {@link shuffleTrajectory}
 *     (a scale-graded order-scramble over a SEEDED rng). The substrate is null-ready; the null TEST
 *     itself stays the flow-lens instrument (deferred).
 *
 * ## SCOPE — why the COORDINATOR holds this, not the worker (sovereign-worker primacy carve-out)
 *
 * Sovereign-worker primacy homes REAL compute (grammar/keyhive/VM-bound) in the worker — the
 * query-derive (b3f8ec00) lives in-VM because it needs the LIVE grammar-cache basis. This holder is
 * the primacy rule's explicit "held-state the coordinator reads" exception, on three grounds:
 *   1. NO VM state — worldlineCompare is a pure ITC tree-leq; the trajectory functor is a pure sort.
 *      Neither touches the self-hosted grammar, keyhive, or any worker-resident facet.
 *   2. The DATA SOURCES are node-side — the form-vectors live in the .formpalace python holder
 *      (makeFormPalace, a node child_process), and the worldline edges derive from transcripts
 *      (node fs). Both are coordinator resources; routing them through the worker would only add a
 *      round-trip + serialize ItcStamp trees for zero compute gain.
 *   3. The registry is a RE-DERIVABLE PROJECTION of the edge-DAG (the KG is durable truth) — held
 *      state, not authority. It never gates a capability, so it sits outside the worker's authz plane.
 * Contrast deriveSkeleton (worker, real VM compute) — this is the opposite corner.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/agent-worldline#time
 */

import {
  sha256HexSync,
  orderTrajectory,
  joinFormVectors,
  shuffleTrajectory,
  mulberry32,
  worldlineCausalFromEdges,
  worldlineCausalSeed,
  worldlineCompare,
  type WorldlineCausal,
  type WorldlineTrajectory,
  type TrajectoryStep,
  type SparseFormVector,
  type ItcOrder,
  type LarTickCounter,
  type WorldlineEdgeTriple,
  type WorldlineEdgeClose,
} from "@lararium/mesh";
import type { FormPalace } from "./formpalace.js";

/** A handle's captured turn, pre-order — the holder orders these + joins form-vectors. */
export interface TurnStub {
  /** the content↔form join key (sha256 of the verbatim turn). */
  readonly verbatimSha: string;
  /** the within-handle happened-before order (node-monotonic). */
  readonly tickCounter: number;
}

export interface TrajectoryOptions {
  /** join move-space positions from the FORM store (default true; false = TIME-only skeleton). */
  readonly joinForm?: boolean;
}

export interface NullBaselineOptions extends TrajectoryOptions {
  /** PRNG seed — a reproducible null (default 1). */
  readonly seed?: number;
  /** scale grading: the shuffle window (default Infinity = full shuffle; see shuffleTrajectory). */
  readonly window?: number;
}

export interface WorldlineHolderDeps {
  /** the FORM store — move-space positions keyed by verbatim_sha. Absent → trajectories stay TIME-only. */
  readonly formPalace?: FormPalace | null;
  /** the run-root / common-cause handle the registry seeds from (default "operator"). */
  readonly root?: string;
}

export interface WorldlineHolder {
  /** Well 1: rebuild the live ITC registry by projecting the durable edge-DAG. Idempotent. */
  ingestEdges(opens: readonly WorldlineEdgeTriple[], closes?: readonly WorldlineEdgeClose[], root?: string): void;
  /** Well 1: the concurrent-capable causal verdict between two handles (throws if either is unknown). */
  compare(a: string, b: string): ItcOrder;
  /** the live registry snapshot (read-only) — for inspection / a downstream re-projection. */
  causal(): WorldlineCausal;
  /** Well 3: a handle's worldline-ordered path through move-space (the CORE permainan substrate). */
  trajectory(handle: string, stubs: readonly TurnStub[], opts?: TrajectoryOptions): Promise<WorldlineTrajectory>;
  /** Well 4: the SAME path, order-scrambled — the null baseline (NOT the null test). */
  nullBaseline(handle: string, stubs: readonly TurnStub[], opts?: NullBaselineOptions): Promise<WorldlineTrajectory>;
}

/**
 * Build the node-side worldline holder. Starts with an empty (root-seeded) registry; `ingestEdges`
 * fills it from the edge-DAG. The form join is best-effort: a formpalace miss / fault leaves a step's
 * formVector null (the turn keeps its TIME slot — the path never silently drops a turn).
 */
export function makeWorldlineHolder(deps: WorldlineHolderDeps = {}): WorldlineHolder {
  const root = deps.root ?? "operator";
  let causal: WorldlineCausal = worldlineCausalSeed(root);

  async function assemble(handle: string, stubs: readonly TurnStub[], joinForm: boolean): Promise<WorldlineTrajectory> {
    const steps: TrajectoryStep[] = stubs.map((s) => ({
      verbatimSha: s.verbatimSha,
      tickCounter: s.tickCounter as LarTickCounter,
    }));
    const ordered = orderTrajectory(handle, steps);
    if (!joinForm || !deps.formPalace) return ordered;
    // Fetch each turn's move-space position from the FORM store, then join (a miss → null slot).
    const fp = deps.formPalace;
    const byKey = new Map<string, SparseFormVector | null>();
    await Promise.all(
      ordered.steps.map(async (s) => {
        if (byKey.has(s.verbatimSha)) return;
        try {
          const entry = await fp.get(s.verbatimSha);
          const fv = entry?.document ? parseFormVector(entry.document) : null;
          byKey.set(s.verbatimSha, fv);
        } catch {
          byKey.set(s.verbatimSha, null); // form holder unavailable → TIME slot kept, form null
        }
      }),
    );
    return joinFormVectors(ordered, (sha) => byKey.get(sha) ?? null);
  }

  return {
    ingestEdges(opens, closes = [], r) {
      causal = worldlineCausalFromEdges(r ?? root, opens, closes);
    },
    compare(a, b) {
      return worldlineCompare(causal, a, b);
    },
    causal() {
      return causal;
    },
    trajectory(handle, stubs, opts = {}) {
      return assemble(handle, stubs, opts.joinForm !== false);
    },
    async nullBaseline(handle, stubs, opts = {}) {
      const real = await assemble(handle, stubs, opts.joinForm !== false);
      return shuffleTrajectory(real, mulberry32(opts.seed ?? 1), opts.window ?? Number.POSITIVE_INFINITY);
    },
  };
}

/**
 * Pull a sparse form-vector out of a formpalace entry's stored `document`. The python store keeps the
 * dense embedding internally (chroma) but the JSON `document` carries the axis activation; the
 * cross-graph SUBSTRATE only needs a join-present signal, so an absent/unparseable document yields
 * null (the step keeps its TIME slot). The richer per-axis vector rides the document's `axis_activation`.
 */
function parseFormVector(document: string): SparseFormVector | null {
  try {
    const obj = JSON.parse(document) as Record<string, unknown>;
    const act = obj["axis_activation"];
    if (act && typeof act === "object") {
      const entries = Object.entries(act as Record<string, unknown>).filter(([, v]) => typeof v === "number");
      if (entries.length === 0) return { indices: [], values: [] };
      return {
        indices: entries.map((_, i) => i),
        values: entries.map(([, v]) => v as number),
      };
    }
    return { indices: [], values: [] };
  } catch {
    return null;
  }
}

/**
 * Compute a turn's verbatim_sha from its verbatim text — the SAME key capture stamps
 * (`sha256Hex(utf8Bytes(content))`, node-capture-engine#makeFormSplitFlush). The cross-graph join key
 * for a transcript-derived TurnStub.
 *
 * FIDELITY FLAG: this matches capture ONLY when `turnText` is byte-identical to the `content` capture
 * hashed. A transcript-reconstructed turn body may differ (assembly/normalization), so a stub built
 * this way can MISS its form entry (→ a null move-space slot, never a wrong one). The durable,
 * exact source is the content drawer's `lar_verbatim_sha` (the content graph) — wiring that read is
 * the flagged follow-up (it needs a content-graph handle where-filter, absent from the client API).
 */
export function verbatimShaOf(turnText: string): string {
  return sha256HexSync(turnText);
}
