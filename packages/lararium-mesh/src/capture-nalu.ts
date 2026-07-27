/**
 * capture-nalu — the forward-facing collect-then-flush mechanism (the LOCAL,
 * non-federated nalu). Pure logic; the daemon injects fs + the `mine --source ndjson`
 * runner + the reserve (WAL) sinks, so this stays testable and substrate-free.
 *
 * Modeled on the nalu (lar:///ha.ka.ba/lares/api/pono/nalu) — collect-then-flush
 * across heterogeneous sources. Hardened by convergent findings across four domains
 * (CS/observability · neurophysiology · hydrology · lean/queueing), canon at
 * capture-annotation-model#nalu-flush-hardening:
 *
 *   - CEILING + spill-to-reserve (all four domains: bounded buffer · spillway-with-a-
 *     destination · WIP-cap · bounded RRP). `maxDepth` bounds the hot pool; overflow
 *     spills to an injected reserve (the daemon's WAL) — never grow, never silently drop.
 *   - BACKOFF + retry-cap → dead-letter (CS retry-storm · lean re-queue-loop · neuro
 *     relative-refractory). A failed flush re-queues with exponential full-jitter backoff;
 *     a batch that exceeds maxRetries is dead-lettered (durable quarantine, never lost),
 *     so one poison batch can't head-of-line-block the single writer.
 *   - TWO-TIER RRP←reserve (neuro readily-releasable + reserve pool). After a drain the
 *     hot pool refills from the reserve as room frees.
 *   - SIZE FOR THE BURST, not the mean (hydrology surge-tank): maxDepth headroom = the
 *     gas cushion that absorbs a swarm-spawn water-hammer.
 *
 * The gate constants stay a guessed-then-configurable default (the lar-URI config tiddler
 * overrides); deriving them from flush-cost/holding-cost/arrival-rate (EBQ + Little's Law)
 * and an adaptive homeostatic servo stay deferred — held, not built (every biological
 * collect-then-fire system adapts its threshold; this one does not — yet).
 *
 * The flush crests on the daemon's 20 Hz SERVER tick (LarTickCounter — NOT the federated
 * nalu's browser rAF). Each record carries its lar_ffz (felt) — set by the producer.
 */

import type { GateFamily, ProjectionGate } from "./projection-nalu.js";

/** One born-annotated record a producer enqueues (one NDJSON line at flush). */
export interface CaptureRecord {
  readonly content: string;
  readonly source_file: string;
  readonly metadata?: Record<string, string | number | boolean>;
  readonly chunk_index?: number;
}

/** The backpressure gate + ceiling. Whichever crest fires first flushes; the ceiling
 *  bounds the hot pool and backoff governs failure. Defaults in {@link PONO_FLUSH_GATE}. */
export interface FlushGate {
  /** flush when the hot pool holds at least this many records */
  readonly depth: number;
  /** OR when at least this long has elapsed since the last flush (ms) */
  readonly maxWaitMs: number;
  /** ceiling: an enqueue past this spills to the reserve (surge-tank headroom — size for
   *  the worst burst, not the mean tick rate) */
  readonly maxDepth: number;
  /** dead-letter a batch after this many CONSECUTIVE flush failures (poison guard) */
  readonly maxRetries: number;
  /** exponential full-jitter backoff base after a failure (ms) */
  readonly backoffBaseMs: number;
  /** backoff ceiling (ms) */
  readonly backoffMaxMs: number;
}

/**
 * The pono default for the scales we work at (capture keel R15 + the four-domain survey).
 * depth/maxWaitMs: batch up to 32, recall-latency <= 2 s. maxDepth: 8x depth of surge
 * headroom. Overridable by the lar-URI config tiddler; EBQ/Little's-Law derivation + an
 * adaptive servo stay deferred — held, not built (capture keel R18).
 */
export const PONO_FLUSH_GATE: FlushGate = {
  depth: 32,
  maxWaitMs: 2000,
  maxDepth: 256,
  maxRetries: 5,
  backoffBaseMs: 100,
  backoffMaxMs: 5000,
};

/**
 * Drains a batch to its memory-home and returns the count filed; THROWS to signal the
 * batch failed (CaptureNalu re-queues with backoff). ONE verb — the isomorphic shore: a
 * node vessel composes it from an NDJSON spool + `mine --source ndjson`, a browser vessel
 * from an IndexedDB write or a relay-send. CaptureNalu never knows which substrate filed
 * the batch (role = capability ≠ platform).
 */
export type CaptureFlush = (batch: readonly CaptureRecord[]) => Promise<number>;

/** The substrate edges CaptureNalu injects — the flush verb + the durable reserve/quarantine. */
export interface CaptureSinks {
  readonly flush: CaptureFlush;
  /** spill overflow past maxDepth to the durable reserve (WAL). Default: surfaced drop. */
  readonly onOverflow?: (records: readonly CaptureRecord[]) => void;
  /** quarantine a batch that exceeded maxRetries (durable, never lost). Default: surfaced count. */
  readonly onDeadLetter?: (records: readonly CaptureRecord[]) => void;
  /** refill the hot pool from the reserve after a drain (RRP <- reserve). Default: none. */
  readonly refill?: (room: number) => readonly CaptureRecord[];
  /** jitter source for backoff; default Math.random. */
  readonly rng?: () => number;
}

/** Surfaced counters — never silent (CS drop-honesty · hydrology spillway-with-destination). */
export interface CaptureStats {
  readonly depth: number;
  readonly failures: number;
  readonly spilled: number;
  readonly deadLettered: number;
}

/**
 * The collect-then-flush engine. One per daemon (the unified-nalu law: one queue across
 * all producers). `enqueue` is non-blocking and bounded; `tick` runs on each server tick
 * and flushes only when the gate crests and no backoff/flush is in flight.
 */
export class CaptureNalu implements ProjectionGate {
  readonly family: GateFamily = "accumulate";
  private queue: CaptureRecord[] = [];
  private lastFlushMs: number;
  private flushing = false;
  private failures = 0;
  private backoffUntilMs = 0;
  private spilled = 0;
  private deadLettered = 0;

  constructor(
    private readonly sinks: CaptureSinks,
    private gate: FlushGate = PONO_FLUSH_GATE,
    nowMs = 0,
  ) {
    this.lastFlushMs = nowMs;
  }

  /** Live-update the flush gate — the homeostatic servo's efferent step. gate-tuning's
   *  adaptGate/deriveGate feed this so the threshold tracks load instead of holding fixed (every
   *  biological collect-then-fire system servos its threshold; this lets ours do the same). */
  setGate(gate: FlushGate): void {
    this.gate = gate;
  }

  /** A producer enqueues a born-annotated record. Bounded: past maxDepth it spills to the
   *  reserve (never grows the hot pool unbounded — the four-domain ceiling). */
  enqueue(record: CaptureRecord): void {
    if (this.queue.length >= this.gate.maxDepth) {
      this.spill([record]);
      return;
    }
    this.queue.push(record);
  }

  depth(): number {
    return this.queue.length;
  }

  stats(): CaptureStats {
    return {
      depth: this.queue.length,
      failures: this.failures,
      spilled: this.spilled,
      deadLettered: this.deadLettered,
    };
  }

  /** The gate: crest when depth OR max-wait crosses, unless flushing or in backoff. */
  shouldFlush(nowMs: number): boolean {
    if (this.flushing || nowMs < this.backoffUntilMs || this.queue.length === 0) return false;
    return this.queue.length >= this.gate.depth || nowMs - this.lastFlushMs >= this.gate.maxWaitMs;
  }

  /**
   * The crest — call on each server tick. Snapshots-then-clears the hot pool BEFORE the
   * async flush (closing hydrology's tipping-bucket blind window: mid-drain arrivals ride
   * the next wave). On success, refills the hot pool from the reserve. On failure, either
   * re-queues with exponential full-jitter backoff (transient) or, past maxRetries,
   * dead-letters the batch to durable quarantine (poison — never head-of-line-blocks the
   * single writer). Returns the count filed (0 if no flush ran); re-throws on failure.
   */
  async tick(nowMs: number): Promise<number> {
    if (!this.shouldFlush(nowMs)) return 0;
    const batch = this.queue;
    this.queue = [];
    this.flushing = true;
    try {
      const filed = await this.sinks.flush(batch);
      this.failures = 0;
      this.lastFlushMs = nowMs;
      this.refillFromReserve();
      return filed;
    } catch (err) {
      this.failures++;
      if (this.failures > this.gate.maxRetries) {
        // poison (or sustained-down) batch: quarantine durably so it can't block the writer
        if (this.sinks.onDeadLetter) this.sinks.onDeadLetter(batch);
        else this.deadLettered += batch.length;
        this.failures = 0;
      } else {
        // re-queue ahead of new arrivals (FIFO — first-flush ordering) + bounded + backoff
        this.queue = batch.concat(this.queue);
        this.clampToReserve();
        const cap = Math.min(this.gate.backoffBaseMs * 2 ** (this.failures - 1), this.gate.backoffMaxMs);
        this.backoffUntilMs = nowMs + (this.sinks.rng ?? Math.random)() * cap; // AWS full jitter
      }
      throw err;
    } finally {
      this.flushing = false;
    }
  }

  /** Spill records to the durable reserve, or a surfaced drop-counter if no reserve. */
  private spill(records: readonly CaptureRecord[]): void {
    if (this.sinks.onOverflow) this.sinks.onOverflow(records);
    else this.spilled += records.length;
  }

  /** Keep the hot pool at or under maxDepth, spilling the oldest overflow to the reserve. */
  private clampToReserve(): void {
    if (this.queue.length <= this.gate.maxDepth) return;
    const overflow = this.queue.slice(this.gate.maxDepth);
    this.queue = this.queue.slice(0, this.gate.maxDepth);
    this.spill(overflow);
  }

  /** After a drain, pull reserved records back into the hot pool as room frees (RRP<-reserve). */
  private refillFromReserve(): void {
    if (!this.sinks.refill) return;
    const room = this.gate.maxDepth - this.queue.length;
    if (room <= 0) return;
    const reclaimed = this.sinks.refill(room);
    if (reclaimed.length) this.queue.push(...reclaimed);
  }
}
