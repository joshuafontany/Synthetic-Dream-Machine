/**
 * capture-engine — the ISOMORPHIC telemetry-VM worker: the pure capture core, composed
 * from injected substrate seams (flush · reserve · annotate). The SAME worker runs in
 * every vessel; only the seams differ by capability (role = capability ≠ platform):
 *
 *   node daemon  : flush=spawn(mine --source lares) · reserve=fs-WAL  → KEEP the shared palace
 *   browser spore: flush=idb/relay               · reserve=idb-WAL → REMEMBER itself, sovereign-local
 *   cli          : flush=relay-to-daemon         · reserve=fs-WAL  → RELAY to a keeper
 *
 * Add a vessel = implement two seams (CaptureFlush + CaptureReserve), never rewrite the
 * worker. Pure: zero substrate imports (no node:fs, no child_process) — it lives wherever
 * a vessel's worker runs.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/api/capture-annotation-model#isomorphic-telemetry-vm
 */

import { CaptureNalu, PONO_FLUSH_GATE } from "./capture-nalu.js";
import type { CaptureFlush, CaptureRecord, CaptureStats, FlushGate } from "./capture-nalu.js";

/** The forward annotate pass: a raw turn → its `lar_*` metadata. Each vessel injects its
 *  own (node: harvestTurnGradient + buildPatch; browser: the pure twin). */
export type CaptureAnnotate = (
  turnText: string,
  sourceFile: string,
) => Record<string, string | number | boolean>;

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

/** The vessel-supplied seams that specialize the isomorphic worker. */
export interface CaptureEngineSeams {
  readonly reserve: CaptureReserve;
  readonly flush: CaptureFlush;
  readonly annotate: CaptureAnnotate;
  readonly gate?: FlushGate;
}

export interface CaptureEngine {
  /** Annotate a raw turn forward, durably write-ahead-log it, and enqueue it. */
  enqueue(turnText: string, sourceFile: string): Promise<void>;
  /** Crest on a server tick — flush the batch if the gate fires. Returns the count filed. */
  tick(nowMs: number): Promise<number>;
  /** Boot recovery — replay the WAL back into the hot pool. Returns the count recovered. */
  recover(): Promise<number>;
  /** Surfaced counters (depth · failures · spilled · dead-lettered). */
  stats(): CaptureStats;
  /** Truncate the WAL once the hot pool is fully drained. */
  compactIfDrained(): Promise<void>;
}

/** Compose the isomorphic telemetry-VM worker from a vessel's substrate seams. */
export function makeCaptureEngine(seams: CaptureEngineSeams): CaptureEngine {
  const { reserve, flush, annotate } = seams;
  const nalu = new CaptureNalu(
    {
      flush,
      onOverflow: (records) => reserve.onOverflow(records),
      refill: (room) => reserve.refill(room),
      onDeadLetter: (records) => reserve.onDeadLetter(records),
    },
    seams.gate ?? PONO_FLUSH_GATE,
  );

  return {
    async enqueue(turnText, sourceFile) {
      const record: CaptureRecord = {
        content: turnText,
        source_file: sourceFile,
        metadata: annotate(turnText, sourceFile),
      };
      await reserve.append(record); // write-ahead: durable BEFORE the hot pool
      nalu.enqueue(record);
    },
    tick: (nowMs) => nalu.tick(nowMs),
    async recover() {
      const records = await reserve.replay();
      for (const r of records) nalu.enqueue(r);
      return records.length;
    },
    stats: () => nalu.stats(),
    async compactIfDrained() {
      if (nalu.depth() === 0) await reserve.compact();
    },
  };
}
