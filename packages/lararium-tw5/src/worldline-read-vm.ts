/*\
title: lar:///ha.ka.ba/lararium/tw5/modules/worldline-read-vm
type: application/javascript
module-type: startup
\*/
/**
 * worldline-read-vm — TW5 startup module: the IN-VM worldline reads (the permainan substrate, the
 * flow-lens foundation), homed in the sovereign daemon worker.
 *
 * The reads live in this island VM, off the node coordinator,
 * under strict sovereign-worker primacy — the cap-stack lifts WHOLE, no coordinator carve-out. The
 * worker holds the LIVE ITC registry and runs every read's COMPUTE; the host ships only external data
 * (edges derived from a transcript, form-vector bytes from the python form store the worker can't
 * reach), exactly as the recall query-derive (`query-derive-vm`) ships its query string IN. This is
 * the worldline twin of that derive module — same one-runtime lock, same pure-subpath idiom.
 *
 * Three wells, two reads:
 *   Well 1 (the TIME axis) — `worldlineCompareVm({ a, b, opens, closes, root })` projects the
 *     WorldlineCausal registry from the carried edge-DAG (worldlineCausalFromEdges), HOLDS it in
 *     module state (so a future read→filter-compute chain can read it), then answers the
 *     concurrent-capable causal verdict (before / after / concurrent / equal) the rhythmic clock
 *     can never give. An unknown handle THROWS (the host surfaces the helpful error).
 *   Well 3 (the CORE) + Well 4 (NULL-READY) — `worldlineTrajectoryVm({ handle, stubs, joinForm,
 *     includeNull, seed, window })` runs the pure Turn→Trajectory functor (orderTrajectory) over the
 *     handle's captured turns, joins each turn's move-space position from the form-vectors the host
 *     shipped (joinFormVectors — a miss leaves a null slot, never drops a turn), and optionally rides
 *     the SAME path through the seeded `shuffleTrajectory` null baseline.
 *
 * ## The temp-tids / TW5-filter pattern (FLAGGED, not built — the enabling design)
 *
 * The operator's vision: a future `lares` CLI read → TW5-filter-compute-on-temp-tids chain, the whole
 * stack lifting in-VM. The clean alignment with THIS module: instead of the JS reads below, write the
 * edge-DAG + the captured turns as TEMP TIDDLERS into the daemon wikistore (titles like
 * `$:/temp/worldline/edge/<n>` and `$:/temp/worldline/turn/<sha>`), then compute compare/trajectory
 * with TW5 filter language over them — so a CLI read could land rows as temp tids and a filter
 * pipeline could chain straight on. Why FLAGGED, not built here: the ITC partial-order (compare) and
 * the happened-before ordering (trajectory) do not map onto stock TW5 filter operators — they'd need
 * two CUSTOM filter operators (`worldline-compare[<a>,<b>]` and `worldline-order[<handle>]`, each a
 * `filteroperator` module reading the temp tids and calling these SAME pure libs), plus a temp-tid
 * writer and a teardown sweep. That is a larger reshaping; the operator's brief sanctions homing the
 * JS reads in the VM module NOW (done) and flagging the temp-tids pattern with this concrete sketch.
 * When that lands, these pure `computeWorldline*` functions become the filter operators' kernel — the
 * compute already lives in-VM, so the move is additive (a tid projection + 2 filter ops), never a
 * second migration.
 *
 * PURE subpath (no Automerge) — the barrel `@lararium/mesh` drags in wasm the plugin build can't bundle.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/agent-worldline#time
 */

import {
  worldlineCausalFromEdges,
  worldlineCompare,
  orderTrajectory,
  joinFormVectors,
  shuffleTrajectory,
  mulberry32,
  type WorldlineCausal,
  type WorldlineTrajectory,
  type TrajectoryStep,
  type SparseFormVector,
  type ItcOrder,
  type LarTickCounter,
  type WorldlineEdgeTriple,
  type WorldlineEdgeClose,
} from "@lararium/mesh/worldline";

// TW5 injects $tw as a module parameter (vm.runInContext sandbox); reach it as the injected var.
declare const $tw: { lares?: Record<string, unknown> } | undefined;

/** One captured turn pre-order — the join key + the within-handle happened-before tick + (optionally)
 *  the move-space position the host pre-fetched from the form store. */
export interface WorldlineStubInput {
  readonly verbatimSha: string;
  readonly tickCounter: number;
  readonly formVector?: SparseFormVector | null;
}

/** Well 1 input — two handles + the edge-DAG to project the registry from. */
export interface WorldlineCompareInput {
  readonly a: string;
  readonly b: string;
  readonly opens: readonly WorldlineEdgeTriple[];
  readonly closes?: readonly WorldlineEdgeClose[];
  readonly root?: string;
}

/** Well 3 + Well 4 input — a handle's captured turns + the read options. */
export interface WorldlineTrajectoryInput {
  readonly handle: string;
  readonly stubs: readonly WorldlineStubInput[];
  readonly joinForm?: boolean;
  readonly includeNull?: boolean;
  readonly seed?: number;
  readonly window?: number;
}

// The LIVE ITC registry — HELD in module state across reads (the worker's sovereign substrate). Each
// compare re-projects it from the carried edge-DAG (idempotent re-derive); holding it lets a future
// read→filter-compute chain read the last-projected registry without re-shipping the edges.
let _causal: WorldlineCausal | null = null;

/**
 * Well 1 — the ITC LIVE-READ. Project the registry from the edge-DAG (HOLD it), then compare.
 * `ingestEdges` + `compare` fuse into one read (the registry persists as a side
 * effect). THROWS when either handle is unknown to the registry (the host wraps the helpful error).
 */
export function computeWorldlineCompare(input: WorldlineCompareInput): { order: ItcOrder } {
  // Re-project the registry from the carried edge-DAG when fresh edges arrive (the idempotent
  // re-derive); else read the HELD registry (a compare riding a prior ingest — the cross-read
  // persistence the future read→filter chain leans on). No edges + no held registry → throws below.
  if (input.opens.length > 0 || !_causal) {
    _causal = worldlineCausalFromEdges(input.root ?? "operator", input.opens, input.closes ?? []);
  }
  return { order: worldlineCompare(_causal, input.a, input.b) };
}

/** The held registry snapshot (read-only) — for inspection / a downstream re-projection. */
export function worldlineRegistry(): WorldlineCausal | null {
  return _causal;
}

/**
 * Well 3 (THE CORE) + Well 4 (NULL-READY) — order a handle's captured turns by happened-before, join
 * their move-space positions (from the shipped form-vectors), and optionally ride the SAME path
 * through the seeded null shuffle. PURE relative to its input (the host did the form-store I/O).
 */
export function computeWorldlineTrajectory(
  input: WorldlineTrajectoryInput,
): { trajectory: WorldlineTrajectory; nullBaseline?: WorldlineTrajectory } {
  const steps: TrajectoryStep[] = input.stubs.map((s) => ({
    verbatimSha: s.verbatimSha,
    tickCounter: s.tickCounter as LarTickCounter,
  }));
  const ordered = orderTrajectory(input.handle, steps);
  // Form-vectors keyed by verbatimSha (the host shipped them on the stubs). A miss → null slot.
  const byKey = new Map<string, SparseFormVector | null>();
  for (const s of input.stubs) if (!byKey.has(s.verbatimSha)) byKey.set(s.verbatimSha, s.formVector ?? null);
  const trajectory = input.joinForm === false ? ordered : joinFormVectors(ordered, (sha) => byKey.get(sha) ?? null);
  if (!input.includeNull) return { trajectory };
  const nullBaseline = shuffleTrajectory(trajectory, mulberry32(input.seed ?? 1), input.window ?? Number.POSITIVE_INFINITY);
  return { trajectory, nullBaseline };
}

export const name  = "lararium-worldline-read-vm";

export type WorldlineCompareVm    = (input: WorldlineCompareInput) => { order: ItcOrder };
export type WorldlineTrajectoryVm = (input: WorldlineTrajectoryInput) => { trajectory: WorldlineTrajectory; nullBaseline?: WorldlineTrajectory };

export function startup(): void {
  if (!$tw) return;
  const t = $tw as { lares?: { worldlineCompareVm?: WorldlineCompareVm; worldlineTrajectoryVm?: WorldlineTrajectoryVm } };
  t.lares ??= {};
  // The live in-VM reads. compare THROWS on an unknown handle (the host wraps it); trajectory is total
  // (empty stubs → an empty trajectory). The daemon-behavior signal handler catches any throw → posts
  // an `error` result, so a fault degrades gracefully across the wire (never a worker crash).
  t.lares.worldlineCompareVm    = (input: WorldlineCompareInput) => computeWorldlineCompare(input);
  t.lares.worldlineTrajectoryVm = (input: WorldlineTrajectoryInput) => computeWorldlineTrajectory(input);
}
