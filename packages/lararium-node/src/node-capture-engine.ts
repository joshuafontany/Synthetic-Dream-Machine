/**
 * node-capture-engine — composes the isomorphic `makeCaptureEngine` (mesh) with node's
 * substrate seams (subprocess flush · fs-WAL reserve). The annotate stays INJECTED so this
 * module never pulls the mempalace barrel — the worker passes `defaultAnnotate`, tests pass
 * a fake. This is node's row of the per-vessel job table: KEEP the shared palace.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/api/capture-annotation-model#isomorphic-telemetry-vm
 */

import { makeCaptureEngine } from "@lararium/mesh";
import type { CaptureAnnotate, CaptureEngine, CapturePost, CaptureServo, FlushGate } from "@lararium/mesh";

import { makeCaptureReserve } from "./capture-reserve.js";
import { makeSubprocessFlush } from "./capture-flush.js";

export interface NodeCaptureEngineOptions {
  /** palace path passed to `mine --source ndjson --palace` */
  readonly palacePath: string;
  /** dir for transient NDJSON flush-batch files */
  readonly spoolDir: string;
  /** write-ahead log path (durable, all records) */
  readonly walPath: string;
  /** dead-letter quarantine path */
  readonly quarantinePath: string;
  /** the forward annotate pass (worker: `defaultAnnotate`; tests: a fake) */
  readonly annotate: CaptureAnnotate;
  readonly gate?: FlushGate;
  readonly mempalaceBin?: string;
  readonly timeoutMs?: number;
  /** OUT family: the coalesced stats-frame sink (the worker posts to parentPort). */
  readonly post?: CapturePost;
  /** OUT coalesce window (ms); default 50. */
  readonly outWindowMs?: number;
  /** self-regulation: each flush servos the gate toward the latency set-point. */
  readonly servo?: CaptureServo;
  /** test injection for the flush subprocess */
  readonly spawn?: (bin: string, args: readonly string[]) => Promise<{ stdout: string }>;
}

/** Build the node telemetry engine (the isomorphic worker + node seams). */
export function makeNodeCaptureEngine(opts: NodeCaptureEngineOptions): CaptureEngine {
  const flush = makeSubprocessFlush({
    spoolDir: opts.spoolDir,
    palacePath: opts.palacePath,
    ...(opts.mempalaceBin !== undefined ? { mempalaceBin: opts.mempalaceBin } : {}),
    ...(opts.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : {}),
    ...(opts.spawn !== undefined ? { spawn: opts.spawn } : {}),
  });
  const reserve = makeCaptureReserve({ walPath: opts.walPath, quarantinePath: opts.quarantinePath });
  return makeCaptureEngine({
    flush,
    reserve,
    annotate: opts.annotate,
    ...(opts.gate !== undefined ? { gate: opts.gate } : {}),
    ...(opts.post !== undefined ? { post: opts.post } : {}),
    ...(opts.outWindowMs !== undefined ? { outWindowMs: opts.outWindowMs } : {}),
    ...(opts.servo !== undefined ? { servo: opts.servo } : {}),
  });
}
