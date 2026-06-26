/**
 * capture-nalu — the forward-facing capture collect-then-flush mechanism (the LOCAL,
 * non-federated nalu). Pure logic; the daemon injects fs + the `mine --source lares`
 * runner, so this stays testable and substrate-free.
 *
 * Modeled on the nalu (lar:///ha.ka.ba/@lares/v0.1/api/pono/nalu) — collect-then-flush
 * across heterogeneous sources. Producers (parallel sessions · worker swarms ·
 * Codex/Claude/Copilot) enqueue born-annotated records into ONE queue; the daemon's
 * 20 Hz SERVER tick (the LarTickCounter — NOT the federated nalu's browser rAF) crests,
 * backpressure-GATED; one drain files the batch to the palace via the RFC-002
 * source-adapter (one writer, one lock). Each record carries its lar_ffz (felt) — set by
 * the producer; this engine sets only the physical flush cadence.
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/api/capture-annotation-model#forward-facing-nalu
 */

/** One born-annotated record a producer enqueues (one NDJSON line at flush). */
export interface CaptureRecord {
  readonly content: string;
  readonly source_file: string;
  readonly metadata?: Record<string, string | number | boolean>;
  readonly chunk_index?: number;
}

/** The backpressure gate — flush when EITHER threshold crests, whichever first. */
export interface FlushGate {
  /** flush when the queue holds at least this many records */
  readonly depth: number;
  /** OR when at least this long has elapsed since the last flush (ms) */
  readonly maxWaitMs: number;
}

/**
 * The pono default for the scales we work at (capture-annotation-model R15): batch up to
 * 32 records, bound recall-latency to <= 2 s. Overridable by the lar-URI-tagged config
 * tiddler the daemon reads; this is the fallback when the tiddler is absent.
 */
export const PONO_FLUSH_GATE: FlushGate = { depth: 32, maxWaitMs: 2000 };

/**
 * Drains a batch to the palace. Injected so the daemon supplies the real
 * `mine --source lares <ndjson>` runner and tests supply a stub. Returns the count
 * filed; THROWS to signal the batch failed and must be re-queued.
 */
export type CaptureFlushRunner = (ndjsonPath: string) => Promise<number>;

/** Serializes a batch to an NDJSON file (rotated, so producers keep appending while the
 *  batch drains) and returns its path. Injected: the daemon writes fs; tests stub it. */
export type CaptureNdjsonWriter = (records: readonly CaptureRecord[]) => Promise<string>;

/**
 * The collect-then-flush engine. One per daemon (the unified-nalu law: one queue across
 * all producers). `enqueue` is non-blocking; `tick` runs on each server tick and flushes
 * only when the gate crests.
 */
export class CaptureNalu {
  private queue: CaptureRecord[] = [];
  private lastFlushMs: number;
  private flushing = false;

  constructor(
    private readonly writeNdjson: CaptureNdjsonWriter,
    private readonly run: CaptureFlushRunner,
    private readonly gate: FlushGate = PONO_FLUSH_GATE,
    nowMs = 0,
  ) {
    this.lastFlushMs = nowMs;
  }

  /** A producer enqueues a born-annotated record (the collect step). Non-blocking. */
  enqueue(record: CaptureRecord): void {
    this.queue.push(record);
  }

  depth(): number {
    return this.queue.length;
  }

  /** The gate: crest when depth OR max-wait crosses (whichever first). Empty queue never crests. */
  shouldFlush(nowMs: number): boolean {
    if (this.queue.length === 0) return false;
    return this.queue.length >= this.gate.depth || nowMs - this.lastFlushMs >= this.gate.maxWaitMs;
  }

  /**
   * The crest — call on each server tick. Flushes iff the gate crests and no flush is
   * already in flight (the single-writer law). Rotates the queue (producers keep appending
   * to the fresh one while the batch drains); on failure, re-queues the batch AHEAD of new
   * arrivals so nothing is lost. Returns the count filed (0 if no flush ran).
   */
  async tick(nowMs: number): Promise<number> {
    if (this.flushing || !this.shouldFlush(nowMs)) return 0;
    const batch = this.queue;
    this.queue = [];
    this.lastFlushMs = nowMs;
    this.flushing = true;
    try {
      const path = await this.writeNdjson(batch);
      return await this.run(path);
    } catch (err) {
      this.queue = batch.concat(this.queue); // re-queue ahead of new arrivals — never drop
      throw err;
    } finally {
      this.flushing = false;
    }
  }
}
