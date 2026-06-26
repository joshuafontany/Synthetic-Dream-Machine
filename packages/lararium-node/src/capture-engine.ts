/**
 * capture-engine — the telemetry-VM's assembled core: the forward annotate pass +
 * write-ahead durability + the hardened CaptureNalu + the flush runner, in one piece.
 * This is the logic the local non-federated telemetry-VM runs; the worker-island shell
 * (parentPort + the 20 Hz setInterval) and the daemon spawn/verb wrap it.
 *
 *   enqueue(turn) → harvestTurnGradient + buildPatch (the lar_* annotation) → reserve.append
 *     (WRITE-AHEAD: durable before the hot pool — open sessions survive a restart) →
 *     nalu.enqueue (the hot pool)
 *   tick(now)    → nalu crests + flushes via `mine --source lares` when the gate fires
 *   recover()    → on boot, replay the WAL back into the hot pool (idempotent re-file)
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/api/capture-annotation-model#forward-facing-nalu
 */

import { CaptureNalu, PONO_FLUSH_GATE } from "@lararium/mesh";
import type { CaptureRecord, CaptureStats, FlushGate } from "@lararium/mesh";

import { makeCaptureFlushRunner } from "./capture-flush-runner.js";
import { makeCaptureReserve } from "./capture-reserve.js";

/** The forward annotate pass: a raw turn → its `lar_*` metadata. The daemon injects the
 *  real pipeline (`defaultAnnotate` = harvestTurnGradient + buildPatch); tests inject a
 *  fake. Kept injected so the engine doesn't hard-bind the mempalace barrel. */
export type CaptureAnnotate = (turnText: string, sourceFile: string) => Record<string, string | number | boolean>;

export interface CaptureEngineOptions {
  /** palace path passed to `mine --source lares --palace` */
  readonly palacePath: string;
  /** dir for transient NDJSON flush-batch files */
  readonly spoolDir: string;
  /** write-ahead log path (durable, all records) */
  readonly walPath: string;
  /** dead-letter quarantine path */
  readonly quarantinePath: string;
  /** the forward annotate pass (daemon: `defaultAnnotate`; tests: a fake) */
  readonly annotate: CaptureAnnotate;
  readonly gate?: FlushGate;
  readonly mempalaceBin?: string;
  readonly timeoutMs?: number;
  /** test injection for the flush subprocess */
  readonly spawn?: (bin: string, args: readonly string[]) => Promise<{ stdout: string }>;
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
  /** Truncate the WAL once the hot pool is fully drained (everything filed). */
  compactIfDrained(): Promise<void>;
}

/** Assemble the telemetry-VM core from the durable mechanism pieces. */
export function makeCaptureEngine(opts: CaptureEngineOptions): CaptureEngine {
  const reserve = makeCaptureReserve({ walPath: opts.walPath, quarantinePath: opts.quarantinePath });
  const { writeNdjson, run } = makeCaptureFlushRunner({
    spoolDir: opts.spoolDir,
    palacePath: opts.palacePath,
    ...(opts.mempalaceBin !== undefined ? { mempalaceBin: opts.mempalaceBin } : {}),
    ...(opts.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : {}),
    ...(opts.spawn !== undefined ? { spawn: opts.spawn } : {}),
  });
  const nalu = new CaptureNalu(
    {
      writeNdjson,
      run,
      onOverflow: reserve.onOverflow,
      refill: reserve.refill,
      onDeadLetter: reserve.onDeadLetter,
    },
    opts.gate ?? PONO_FLUSH_GATE,
  );

  return {
    async enqueue(turnText, sourceFile) {
      const record: CaptureRecord = {
        content: turnText,
        source_file: sourceFile,
        metadata: opts.annotate(turnText, sourceFile),
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
