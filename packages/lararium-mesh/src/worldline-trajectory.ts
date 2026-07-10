/**
 * worldline-trajectory — the PERMAINAN SUBSTRATE: the Turn→Trajectory functor (worldline-TIME ×
 * form-SPACE = the path through the jurus). Pure, IO-free; the node-side holder feeds it.
 *
 * The QA-Lab flow-lens reads a *permainan* — a trajectory through move-space. The form-graph
 * (.formpalace) maps each turn's *jurus* (its form-vector = a position in move-space, the two-planes
 * CONTINUOUS plane). This module orders those positions by the worldline HAPPENED-BEFORE (the
 * rhythmic clock / ITC edge-DAG, mesh/worldline-clock), so a handle's turns become a PATH — the
 * thing the flow-lens instrument (CRQA · Fisher-Rao · the null test) will measure NEXT loop.
 *
 * THE FUNCTOR (Turn→Trajectory): a handle's captured turns → its worldline-ordered form-vector
 * sequence. Within ONE worldline the happened-before is TOTAL (an agent runs sequentially), so the
 * order rides the node-monotonic `tickCounter` (the WorldlineEvent order, mesh/worldline-clock);
 * the rhythmic `clock`/address rides along for display. Cross-handle concurrency is the ITC registry's
 * job (worldlineCompare) — the flow-lens reads ONE handle's path at a time.
 *
 * NULL-READY (the paper's non-negotiable): {@link shuffleTrajectory} rides cheaply alongside — a
 * scale-graded order-scramble (window-banded Fisher-Yates over a SEEDED rng) so a real trajectory can
 * be measured against a shuffled baseline. This module builds the SUBSTRATE (the measurable path +
 * the shuffle primitive), NEVER the null TEST itself (that is the flow-lens instrument, deferred).
 *
 * Also here: {@link worldlineCausalFromEdges} — project the in-memory ITC registry (WorldlineCausal,
 * the Well-1 causal foundation) from the durable edge-DAG (worldline-edge triples), per the
 * worldline-clock note "the ITC verdict re-projects from those triples when they land."
 *
 * Meme: lar:///ha.ka.ba/lararium/api/agent-worldline#time
 */

import type { FfzClock, LarTickCounter } from "./ffz-clock.js";
import { ffzAddress } from "./worldline-clock.js";
import {
  worldlineCausalSeed,
  worldlineSpawn,
  worldlineInject,
  worldlineHandback,
  worldlineStampFor,
  type WorldlineCausal,
} from "./worldline-clock.js";
import {
  PRED_DELEGATION,
  PRED_COMMUNICATION,
  type WorldlineEdgeTriple,
  type WorldlineEdgeClose,
} from "./worldline-edge.js";

// ---------------------------------------------------------------------------
// Types — the move-space position + the worldline path
// ---------------------------------------------------------------------------

/** A sparse form-vector — a turn's position in move-space (the jurus), as the formpalace stores it. */
export interface SparseFormVector {
  readonly indices: readonly number[];
  readonly values: readonly number[];
}

/**
 * One step on a worldline's path through move-space — a captured turn. `verbatimSha` is the
 * content↔form join key (the formpalace key); `tickCounter` is the within-handle happened-before
 * order (node-monotonic); `clock`/`address` carry the rhythmic position for display; `formVector`
 * is the move-space position (null until the holder joins it from the formpalace).
 */
export interface TrajectoryStep {
  readonly verbatimSha: string;
  readonly tickCounter: LarTickCounter;
  readonly clock?: FfzClock;
  readonly address?: string;
  readonly formVector?: SparseFormVector | null;
}

/**
 * THE FUNCTOR OUTPUT — a handle's worldline-ordered path through move-space. `steps` run
 * earliest→latest by happened-before; `shuffled` marks a null baseline (set by shuffleTrajectory).
 */
export interface WorldlineTrajectory {
  readonly handle: string;
  readonly steps: readonly TrajectoryStep[];
  /** present + true only on a shuffled null baseline (#null-ready). */
  readonly shuffled?: boolean;
  /** the null grading actually applied (window size), present only on a shuffle. */
  readonly shuffleWindow?: number;
}

// ---------------------------------------------------------------------------
// The Turn→Trajectory functor — order a handle's steps by happened-before
// ---------------------------------------------------------------------------

/**
 * Order a handle's captured turns into its worldline trajectory — THE functor. Sorts by the
 * within-handle happened-before (`tickCounter` ascending; `verbatimSha` as a stable tiebreak so the
 * order is total + deterministic even if two steps share a tick), and fills each step's rhythmic
 * `address` from its `clock`. PURE: returns a fresh trajectory, mutates nothing.
 */
export function orderTrajectory(handle: string, steps: readonly TrajectoryStep[]): WorldlineTrajectory {
  const ordered = [...steps]
    .sort((a, b) => (a.tickCounter - b.tickCounter) || (a.verbatimSha < b.verbatimSha ? -1 : a.verbatimSha > b.verbatimSha ? 1 : 0))
    .map((s) => (s.clock && s.address === undefined ? { ...s, address: ffzAddress(s.clock) } : s));
  return { handle, steps: ordered };
}

/**
 * Join form-vectors onto an ordered trajectory's steps — the SPACE leg of the functor. `lookup`
 * maps a step's `verbatimSha` to its move-space position (the formpalace `get`); a miss leaves the
 * step's `formVector` null (the path keeps the turn's TIME slot even when its form-vector is absent —
 * never silently drops a turn). PURE relative to `lookup`.
 */
export function joinFormVectors(
  traj: WorldlineTrajectory,
  lookup: (verbatimSha: string) => SparseFormVector | null | undefined,
): WorldlineTrajectory {
  return {
    ...traj,
    steps: traj.steps.map((s) => ({ ...s, formVector: lookup(s.verbatimSha) ?? null })),
  };
}

// ---------------------------------------------------------------------------
// Null-readiness — the scale-graded shuffle baseline (NOT the null test)
// ---------------------------------------------------------------------------

/** A small, fast, SEEDED PRNG (mulberry32) — a reproducible null baseline beats Math.random. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The NULL-READY primitive — scramble a trajectory's STEP ORDER to make a baseline (real-vs-shuffled
 * is the flow-lens's central test; this builds only the shuffle, never the test). SCALE-GRADED by
 * `window`: a window-banded Fisher-Yates shuffles within sliding blocks of `window` steps, so the
 * grading runs from coarse-order-preserved (small window) to fully random (window ≥ length). The
 * step CONTENTS (verbatimSha, formVector, clock) ride unchanged — only their ORDER scrambles, which
 * is exactly the order axis the flow-lens measures. PURE: a fresh trajectory off the SEEDED `rng`.
 *
 *   window = 1            → identity (no scramble — the degenerate floor)
 *   window = k (1<k<len)  → graded: order preserved across blocks, scrambled within each block
 *   window ≥ len (default)→ full uniform shuffle
 */
export function shuffleTrajectory(
  traj: WorldlineTrajectory,
  rng: () => number,
  window: number = Number.POSITIVE_INFINITY,
): WorldlineTrajectory {
  const steps = [...traj.steps];
  const n = steps.length;
  const w = Math.max(1, Math.floor(Math.min(window, n)));
  for (let start = 0; start < n; start += w) {
    const end = Math.min(start + w, n); // [start, end) is one band
    for (let i = end - 1; i > start; i--) {
      const j = start + Math.floor(rng() * (i - start + 1));
      const tmp = steps[i]!;
      steps[i] = steps[j]!;
      steps[j] = tmp;
    }
  }
  return { ...traj, steps, shuffled: true, shuffleWindow: w };
}

// ---------------------------------------------------------------------------
// The ITC registry projection — re-derive WorldlineCausal from the edge-DAG
// ---------------------------------------------------------------------------

/** One timestamped edge-DAG event, normalized for the replay (the durable twin of a live op). */
interface CausalEvent {
  readonly at: string;
  readonly op: "spawn" | "inject" | "handback";
  readonly subject: string;
  readonly object: string;
}

/**
 * Project the in-memory ITC registry (WorldlineCausal — the Well-1 causal foundation) from the
 * durable edge-DAG. Replays, in valid-time order: a `prov:Delegation` open → SPAWN (fork), a
 * `prov:Communication` → INJECT (event), a Delegation close → HANDBACK (join). `root` seeds the
 * common cause (the run-root / operator, the E-cut); any parent that appears without a prior spawn
 * is seeded on first sight (defensive — the run-root is every top-level spirit's parent). A spawn
 * whose child already exists, or a handback of an unknown pair, is SKIPPED (idempotent re-derive:
 * the KG is a re-derivable projection, transcripts are truth). PURE.
 */
export function worldlineCausalFromEdges(
  root: string,
  opens: readonly WorldlineEdgeTriple[],
  closes: readonly WorldlineEdgeClose[] = [],
): WorldlineCausal {
  const events: CausalEvent[] = [];
  for (const e of opens) {
    if (e.predicate === PRED_DELEGATION) events.push({ at: e.valid_from ?? "", op: "spawn", subject: e.subject, object: e.object });
    else if (e.predicate === PRED_COMMUNICATION) events.push({ at: e.valid_from ?? "", op: "inject", subject: e.subject, object: e.object });
  }
  for (const c of closes) {
    if (c.predicate === PRED_DELEGATION) events.push({ at: c.ended ?? "￿", op: "handback", subject: c.subject, object: c.object });
  }
  // Stable sort by valid-time; same-instant order keeps spawn < inject < handback so a child exists
  // before it is injected or handed back (the causal precondition the edge-DAG implies).
  const rank = { spawn: 0, inject: 1, handback: 2 } as const;
  const sorted = events
    .map((e, i) => ({ e, i }))
    .sort((x, y) => (x.e.at < y.e.at ? -1 : x.e.at > y.e.at ? 1 : 0) || (rank[x.e.op] - rank[y.e.op]) || (x.i - y.i))
    .map((w) => w.e);

  let causal = worldlineCausalSeed(root);
  for (const ev of sorted) {
    try {
      if (ev.op === "spawn") {
        if (!worldlineStampFor(causal, ev.subject)) causal = mergeSeed(causal, ev.subject); // defensive seed
        if (worldlineStampFor(causal, ev.object)) continue; // idempotent — child already forked
        causal = worldlineSpawn(causal, ev.subject, ev.object);
      } else if (ev.op === "inject") {
        if (!worldlineStampFor(causal, ev.object)) continue; // target unknown — skip (re-derive tolerance)
        causal = worldlineInject(causal, ev.object);
      } else {
        if (!worldlineStampFor(causal, ev.subject) || !worldlineStampFor(causal, ev.object)) continue; // unknown pair — skip
        causal = worldlineHandback(causal, ev.subject, ev.object);
      }
    } catch {
      // A malformed edge never sinks the projection — skip it (transcripts are truth, the KG re-derives).
      continue;
    }
  }
  return causal;
}

/** Seed an extra root-like handle into an existing registry (a fresh full-ownership stamp). */
function mergeSeed(c: WorldlineCausal, handle: string): WorldlineCausal {
  const seeded = worldlineCausalSeed(handle); // composite-keyed (`${handle}@${frontier}`)
  return { stamps: { ...c.stamps, ...seeded.stamps } };
}

// ---------------------------------------------------------------------------
// The rewind-then-fork orchestrator — kapae (valid-close) → re-project → fork
// ---------------------------------------------------------------------------

/** The output of {@link rewindThenFork} — the re-projected view and the sibling forked off it. */
export interface RewindThenForkResult {
  /** The registry AFTER the fork — the rewound frontier PLUS the new concurrent sibling. */
  readonly causal: WorldlineCausal;
  /** The registry re-projected over the FILTERED (valid) view, BEFORE the fork — the rewound frontier. */
  readonly view: WorldlineCausal;
  /** The count of open edges the kapae filter dropped (the rewound turns' Delegation/Communication). */
  readonly dropped: number;
  readonly parent: string;
  readonly child: string;
}

/**
 * REWIND-THEN-FORK (edit-and-resubmit) — the PURE composition over the built organs: close a set of
 * turns' valid-time (the kapae move, modeled as a valid-view FILTER over the durable append-only
 * edges), re-project the ITC registry from the surviving VALID edges (the rewound-frontier stamp),
 * then fork a new concurrent sibling off it.
 *
 * The bi-temporal discipline holds by construction: the caller's `opens` are the append-only tx-rows
 * (the durable KG's `kapaeTurn` sets `valid_to`, never deletes); this function drops the rewound
 * turnKeys from the VALID VIEW only, so the row survives while the view sheds it (the TOKI/XTDB audit
 * row). The re-projected stamp is a DERIVED projection — the fork rides a re-derivable frontier, so no
 * global-now sneaks in (the guard). PURE: `opens`/`closes` are untouched; a fresh registry is built.
 *
 * The DURABLE half — actually closing `valid_to` in the mempalace KG — is `kapaeTurn` (node-side); the
 * node orchestrator fires it, then hands its surviving edges here. This is the mesh-pure re-project +
 * fork the durable path composes over (worldline-kg's kapae → these organs).
 */
export function rewindThenFork(
  root: string,
  opens: readonly WorldlineEdgeTriple[],
  closes: readonly WorldlineEdgeClose[],
  rewoundTurnKeys: Iterable<string>,
  fork: { readonly parent: string; readonly child: string },
): RewindThenForkResult {
  const rewound = new Set<string>();
  for (const k of rewoundTurnKeys) if (k) rewound.add(k);

  // The kapae VALID-VIEW filter: drop every open edge keyed to a rewound turn. The tx-row survives in
  // the durable KG (append-only); only the projected view sheds it (valid-time non-monotone).
  const validOpens = rewound.size === 0 ? opens : opens.filter((e) => !(e.turnKey && rewound.has(e.turnKey)));
  const dropped = opens.length - validOpens.length;

  // Re-project the ITC registry over the surviving VALID edges → the rewound-frontier stamp.
  const view = worldlineCausalFromEdges(root, validOpens, closes);

  // Fork the new concurrent sibling off the rewound frontier (itcFork, via worldlineSpawn).
  const causal = worldlineSpawn(view, fork.parent, fork.child);

  return { causal, view, dropped, parent: fork.parent, child: fork.child };
}
