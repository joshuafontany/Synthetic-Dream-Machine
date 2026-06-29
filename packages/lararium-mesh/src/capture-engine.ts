/**
 * capture-engine — the ISOMORPHIC telemetry-VM worker: a self-regulating DUAL-FAMILY cell.
 * The pure capture core, composed from injected substrate seams; the SAME cell runs in every
 * vessel, only the seams differ by capability (role = capability ≠ platform).
 *
 * BOTH gate families ride this ONE substrate (the projection-nalu pattern integrity — the neuron
 * that is graded on its dendrites AND spiking on its axon):
 *   - IN = accumulate (the axon) — {@link CaptureNalu}: every raw turn conserved, WAL-backed,
 *     batch-flushed to the SINK on the server tick.
 *   - OUT = coalesce (the dendrite) — a {@link CoalesceGate} projecting live engine state: a
 *     burst of changes collapses to ONE frame via the injected `post` seam (the twin of `flush`),
 *     newest wins, intermediates fade (a dropped intermediate is correct, not a loss).
 *   - SELF-REGULATION (the breathing threshold) — the `flush` is timed; when a `servo` is
 *     composed, each flush nudges the gate toward a latency set-point (gate-tuning's adaptGate),
 *     so the IN threshold tracks load instead of holding a guess. The cell servos ITSELF — no
 *     external valve (the subak rhyme: local-first regulation).
 *
 * Per-vessel seams:
 *   node daemon  : flush=spawn(mine --source ndjson) · reserve=fs-WAL  · post=parentPort
 *   browser spore: flush=idb/relay               · reserve=idb-WAL · post=main-thread
 *   cli          : flush=relay-to-daemon         · reserve=fs-WAL  · post=relay
 *
 * Add a vessel = implement the seams, never rewrite the cell. Pure: zero substrate imports (no
 * node:fs, no child_process) — `now`/timers are universal globals, injectable for tests.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/capture-annotation-model#isomorphic-telemetry-vm
 */

import { CaptureNalu, PONO_FLUSH_GATE } from "./capture-nalu.js";
import type { CaptureFlush, CaptureRecord, CaptureStats, FlushGate } from "./capture-nalu.js";
import type { BranchContext } from "./build-patch.js";
import { CoalesceGate } from "./projection-nalu.js";
import { adaptGate, deriveGate } from "./gate-tuning.js";

/** The forward annotate pass: a raw turn → its `lar_*` metadata. Each vessel injects its
 *  own (node: harvestTurnGradient + buildPatch; browser: the pure twin). The optional `branch`
 *  carries the turn-DAG fork-frontier (buildPatch's 3rd arg) so a same-session fork derives a
 *  DISTINCT handle; absent (the common case) ⇒ byte-identical to before. */
export type CaptureAnnotate = (
  turnText: string,
  sourceFile: string,
  branch?: BranchContext,
) => Record<string, string | number | boolean>;

/** One coalesced OUT-projection frame: the live engine stats, the current (breathing) gate, and
 *  a monotone revision so a SINK can drop a stale frame that overtakes a newer one. */
export interface CaptureFrame {
  readonly stats: CaptureStats;
  readonly gate: FlushGate;
  readonly rev: number;
}

/** The OUT sink seam — the projection-nalu twin of `flush`. Deliver a coalesced stats frame to
 *  the vessel's surface (node: parentPort; browser: the main thread). role = capability ≠
 *  platform. Absent = no OUT projection (Null-Object). */
export type CapturePost = (frame: CaptureFrame) => void;

/** Self-regulation config (the homeostatic servo — the FAST loop). When composed, each flush
 *  nudges the gate toward `targetLatencyMs` (the recently-observed flush latency vs the set-point). */
export interface CaptureServo {
  readonly targetLatencyMs: number;
  /** max fractional step per flush (default adaptGate's 0.25). */
  readonly maxStep?: number;
}

/** The derivation loop config (the SLOW loop — EBQ + Little's Law). When composed, the engine
 *  periodically RE-ANCHORS the gate's operating point from measured flush-cost (S, EWMA) + arrival
 *  rate (λ) + holding cost (H), so the servo tracks load around a queueing-optimal set-point instead
 *  of discovering it cold. The two loops compose as a transport controller does: derive ≈ slow-start
 *  / BDP estimate, servo ≈ AIMD around it (the two-loop is what the network ring lifts to the wire). */
export interface CaptureDerive {
  /** the recall-latency penalty weight H (per record per ms it waits) — POLICY, set by the vessel. */
  readonly holdingCostPerMs: number;
  /** the recall-latency SLO (ms) — Little's-Law wait bound (deriveGate default 2000). */
  readonly maxLatencyMs?: number;
  /** surge-tank headroom over depth (deriveGate default 8). */
  readonly burstFactor?: number;
  /** re-derive every N flushes (the slow-loop cadence). Default 16. */
  readonly everyFlushes?: number;
  /** min flush samples before the first derivation fires (cold-start holds the default). Default 4. */
  readonly minSamples?: number;
}

type TimerHandle = ReturnType<typeof setTimeout>;

/** The durable reserve contract — the WAL twin per substrate (node fs · browser IndexedDB).
 *  CaptureNalu's overflow/refill/dead-letter ride it; the engine drives append + replay. */
export interface CaptureReserve {
  /** write-ahead: durably log a record BEFORE the hot pool (the producer's ack = durable) */
  append(record: CaptureRecord): Promise<void>;
  /** overflow sink — the record already rode `append`; this tracks the reserve tail */
  onOverflow(records: readonly CaptureRecord[]): void;
  /** refill — pull up to `room` records back into the hot pool */
  refill(room: number): readonly CaptureRecord[];
  /** dead-letter — quarantine a poison batch durably */
  onDeadLetter(records: readonly CaptureRecord[]): void;
  /** replay the WAL on boot → records to re-enqueue (idempotent re-file makes this safe) */
  replay(): Promise<readonly CaptureRecord[]>;
  /** truncate the WAL once everything's filed (call when fully drained + healthy) */
  compact(): Promise<void>;
}

/** The vessel-supplied seams that specialize the isomorphic cell. */
export interface CaptureEngineSeams {
  readonly reserve: CaptureReserve;
  readonly flush: CaptureFlush;
  readonly annotate: CaptureAnnotate;
  readonly gate?: FlushGate;
  /** OUT family: deliver coalesced stats frames to the vessel surface (Null-Object when absent). */
  readonly post?: CapturePost;
  /** the OUT coalesce window (ms): a burst of state-changes collapses to one frame. Default 50. */
  readonly outWindowMs?: number;
  /** the cell's own clock — times the flush for the servo. Default Date.now. */
  readonly now?: () => number;
  /** self-regulation (the FAST loop): when present, each flush servos the gate toward the set-point. */
  readonly servo?: CaptureServo;
  /** the derivation (the SLOW loop): when present, periodically re-anchor the gate from measured
   *  cost/rate (EBQ + Little's Law). Composes with `servo` as a two-loop controller. Absent → none. */
  readonly derive?: CaptureDerive;
  /** timer seam for the OUT coalesce gate (deterministic tests). */
  readonly outTimer?: {
    readonly setTimer: (fn: () => void, ms: number) => TimerHandle;
    readonly clearTimer: (h: TimerHandle) => void;
  };
}

export interface CaptureEngine {
  /** Annotate a raw turn forward, durably write-ahead-log it, and enqueue it. `branch` (optional)
   *  threads the turn-DAG fork-frontier to the annotate pass (the same-session fork-cut). */
  enqueue(turnText: string, sourceFile: string, branch?: BranchContext): Promise<void>;
  /** Crest on a server tick — flush the batch if the gate fires. Returns the count filed. */
  tick(nowMs: number): Promise<number>;
  /** Boot recovery — replay the WAL back into the hot pool. Returns the count recovered. */
  recover(): Promise<number>;
  /** Surfaced counters (depth · failures · spilled · dead-lettered). */
  stats(): CaptureStats;
  /** The current (derive/servo-tracked) flush gate — observability of the breathing operating point. */
  gate(): FlushGate;
  /** Truncate the WAL once the hot pool is fully drained. */
  compactIfDrained(): Promise<void>;
  /** Tear down the OUT projection's coalesce timer (teardown; the final stats ride the host). */
  dispose(): void;
}

/** Compose the self-regulating dual-family cell from a vessel's substrate seams. */
export function makeCaptureEngine(seams: CaptureEngineSeams): CaptureEngine {
  const { reserve, annotate } = seams;
  const now = seams.now ?? (() => Date.now());
  let gate = seams.gate ?? PONO_FLUSH_GATE;
  let live = true;

  // Derivation-loop state (inert when no `derive`): the EWMA flush cost (S), the enqueue count +
  // window for arrival rate (λ = arrivals/elapsed), and the slow-loop flush counter.
  const COST_EWMA_ALPHA = 0.2;
  let ewmaCostMs = 0;
  let costSamples = 0;
  let arrivals = 0;
  let windowStartMs = now();
  let flushesSinceDerive = 0;

  // IN family (accumulate). The flush is WRAPPED to measure its latency — the afferent signal BOTH
  // control loops read: the SLOW loop (derive) re-anchors the operating point on cadence (EBQ +
  // Little's Law), the FAST loop (servo) nudges depth toward the set-point between derivations
  // (adaptGate). The derive tick REPLACES the servo step that flush — the derivation IS the update.
  const measuredFlush: CaptureFlush = async (batch) => {
    const t0 = now();
    const filed = await seams.flush(batch); // a throw PROPAGATES → both loops skipped (a failed flush
    // is a fast-fail, not a latency signal; the nalu's own backoff/dead-letter is the failure response)
    const observedLatencyMs = now() - t0;

    if (seams.derive) {
      ewmaCostMs = costSamples === 0 ? observedLatencyMs : COST_EWMA_ALPHA * observedLatencyMs + (1 - COST_EWMA_ALPHA) * ewmaCostMs;
      costSamples++;
      flushesSinceDerive++;
    }

    if (
      seams.derive &&
      flushesSinceDerive >= (seams.derive.everyFlushes ?? 16) &&
      costSamples >= (seams.derive.minSamples ?? 4)
    ) {
      // SLOW loop — re-anchor the gate from measured cost/rate (EBQ + Little's Law).
      const elapsedMs = Math.max(1, now() - windowStartMs);
      gate = deriveGate({
        flushCostMs: ewmaCostMs,
        holdingCostPerMs: seams.derive.holdingCostPerMs,
        arrivalPerMs: arrivals / elapsedMs,
        ...(seams.derive.maxLatencyMs !== undefined ? { maxLatencyMs: seams.derive.maxLatencyMs } : {}),
        ...(seams.derive.burstFactor !== undefined ? { burstFactor: seams.derive.burstFactor } : {}),
      });
      nalu.setGate(gate);
      flushesSinceDerive = 0;
      arrivals = 0;
      windowStartMs = now();
    } else if (seams.servo) {
      // FAST loop — nudge depth toward the latency set-point between derivations (AIMD).
      gate = adaptGate(gate, observedLatencyMs, seams.servo.targetLatencyMs, seams.servo.maxStep);
      nalu.setGate(gate); // efferent: the threshold breathes toward the latency set-point
    }
    return filed;
  };

  const nalu = new CaptureNalu(
    {
      flush: measuredFlush,
      onOverflow: (records) => reserve.onOverflow(records),
      refill: (room) => reserve.refill(room),
      onDeadLetter: (records) => reserve.onDeadLetter(records),
    },
    gate,
  );

  // OUT family (coalesce) — the projection-nalu twin: mark on every source-move, snapshot at the
  // crest, deliver via the injected `post`. Null-Object when no vessel surface listens.
  const outGate = seams.post
    ? new CoalesceGate({
        windowMs: seams.outWindowMs ?? 50,
        onFlush: (rev) => seams.post?.({ stats: nalu.stats(), gate, rev }),
        ...(seams.outTimer
          ? { setTimer: seams.outTimer.setTimer, clearTimer: seams.outTimer.clearTimer }
          : {}),
      })
    : null;
  const markOut = (): void => {
    if (live) outGate?.mark();
  };

  return {
    async enqueue(turnText, sourceFile, branch) {
      const record: CaptureRecord = {
        content: turnText,
        source_file: sourceFile,
        metadata: annotate(turnText, sourceFile, branch),
      };
      await reserve.append(record); // write-ahead: durable BEFORE the hot pool
      nalu.enqueue(record);
      arrivals++; // count the arrival for λ (the derivation loop; recover() bypasses this — replay ≠ arrival)
      markOut(); // hot-pool depth moved — coalesce a stats frame
    },
    async tick(nowMs) {
      try {
        const filed = await nalu.tick(nowMs);
        if (filed > 0) markOut(); // a flush drained the pool — the source moved
        return filed;
      } catch (err) {
        markOut(); // a failure moved failures/backoff — the source moved
        throw err;
      }
    },
    async recover() {
      const records = await reserve.replay();
      for (const r of records) nalu.enqueue(r);
      return records.length;
    },
    stats: () => nalu.stats(),
    gate: () => gate,
    async compactIfDrained() {
      if (nalu.depth() === 0) await reserve.compact();
    },
    dispose() {
      live = false;
      outGate?.dispose();
    },
  };
}
