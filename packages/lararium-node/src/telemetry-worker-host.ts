/**
 * telemetry-worker-host — the MAIN-side handle that spawns the telemetry-VM worker and
 * feeds it raw turns. The worker owns the engine, the WAL, the tick, and the flush; the
 * daemon's capture-enqueue verb calls `enqueue`. This handle references the worker by URL
 * only (never imports the worker module), so it stays free of the mempalace barrel.
 *
 * The telemetry-VM is a SEPARATE LOCAL non-federated worker, hosted BESIDE the federated
 * @admin VM (work-memory is a local island). Meme:
 * lar:///ha.ka.ba/@lararium/v0.1/api/capture-annotation-model#isomorphic-telemetry-vm
 */

import { once } from "node:events";
import { Worker } from "node:worker_threads";

import type { FlushGate } from "@lararium/mesh";

/** Passed to the worker via workerData. */
export interface TelemetryWorkerConfig {
  readonly palacePath: string;
  readonly spoolDir: string;
  readonly walPath: string;
  readonly quarantinePath: string;
  readonly gate?: FlushGate;
  readonly mempalaceBin?: string;
  /** the worker's own server tick (ms); default 50 (20 Hz) */
  readonly tickMs?: number;
}

export interface TelemetryWorkerHandle {
  /** feed a raw turn to the worker (forward-facing capture) */
  enqueue(turnText: string, sourceFile: string): void;
  /** ask the worker to flush now (test/debug) */
  flushNow(): void;
  /** resolves with the WAL-recovered count once the worker has booted and started ticking */
  readonly ready: Promise<number>;
  /** stop the worker (final flush) and terminate */
  stop(): Promise<void>;
  /** the underlying worker (emits 'message': flushed | error | stopped) */
  readonly worker: Worker;
}

/** Spawn the telemetry-VM worker beside @admin and return a handle. */
export function spawnTelemetryWorker(config: TelemetryWorkerConfig): TelemetryWorkerHandle {
  const worker = new Worker(new URL("./telemetry-worker.js", import.meta.url), { workerData: config });

  const ready = new Promise<number>((resolve, reject) => {
    const onMsg = (m: { type?: string; recovered?: number; where?: string; message?: string }) => {
      if (m?.type === "ready") {
        worker.off("message", onMsg);
        resolve(m.recovered ?? 0);
      } else if (m?.type === "error" && m.where === "recover") {
        worker.off("message", onMsg);
        reject(new Error(m.message ?? "telemetry-worker recover failed"));
      }
    };
    worker.on("message", onMsg);
    worker.once("error", reject);
  });

  return {
    enqueue: (turnText, sourceFile) => worker.postMessage({ type: "enqueue", turnText, sourceFile }),
    flushNow: () => worker.postMessage({ type: "flush" }),
    ready,
    async stop() {
      worker.postMessage({ type: "stop" });
      // wait for the worker's final flush ack (or its exit), then terminate
      await Promise.race([
        new Promise<void>((res) => {
          const onStopped = (m: { type?: string }) => {
            if (m?.type === "stopped") {
              worker.off("message", onStopped);
              res();
            }
          };
          worker.on("message", onStopped);
        }),
        once(worker, "exit").then(() => undefined),
      ]).catch(() => undefined);
      await worker.terminate();
    },
    worker,
  };
}
