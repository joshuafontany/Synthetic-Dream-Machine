/**
 * node-daemon-island — Node.js daemon island entry point.
 *
 * The bound-operator's vessel-only sovereign worker (severed from federation) AND the operator's
 * authn/z home. Composition only: the node sovereign kernel + the keyhive-wired daemon behavior
 * (makeOperatorDaemonBehavior, @lararium/keyhive). The keyhive wiring is identical on browser.
 *
 * Telemetry fold (idempotent): every @daemon CARRIES the capture cap (tending the bound operator's
 * session-capture is a daemon duty). This entry wires its SINK live when the daemon spawn passes a
 * telemetry block via workerData — the node sink (`mine --source ndjson` + fs-WAL + the
 * self-regulating two-loop). Absent → the cap stays inert (a valid resting state; sink not wired).
 * role = capability ≠ platform — this file picks only the node sink.
 *
 * Meme: lar:///ha.ka.ba/@lararium/node/node-daemon-island
 */

import { workerData } from "node:worker_threads";

import type { CapturePost } from "@lararium/mesh";

import { defaultAnnotate } from "./capture-annotate.js";
import { makeNodeCaptureEngine } from "./node-capture-engine.js";
import { runSovereignWorker } from "./sovereign-island-model.js";
import { makeOperatorDaemonBehavior } from "@lararium/keyhive/operator-daemon-behavior";

/** The telemetry SINK config the daemon spawn rides via workerData (open-daemon-vm). */
interface DaemonWorkerData {
  readonly telemetry?: {
    readonly palacePath: string;
    readonly spoolDir: string;
    readonly walPath: string;
    readonly quarantinePath: string;
    readonly mempalaceBin?: string;
    readonly tickMs?: number;
    readonly targetLatencyMs?: number;
    readonly holdingCostPerMs?: number;
  };
}

const t = (workerData as DaemonWorkerData | null)?.telemetry;

// Sink present → wire the standing capture cap LIVE: the node capture-engine (subprocess flush +
// fs-WAL) with the full two-loop self-regulation (servo + derive). Absent → pass nothing; the
// @daemon still carries the cap, inert (idempotent presence).
const extra = t
  ? {
      makeCaptureEngine: (post: CapturePost) =>
        makeNodeCaptureEngine({
          palacePath: t.palacePath,
          spoolDir: t.spoolDir,
          walPath: t.walPath,
          quarantinePath: t.quarantinePath,
          annotate: defaultAnnotate,
          post,
          servo: { targetLatencyMs: t.targetLatencyMs ?? 1000 },
          derive: { holdingCostPerMs: t.holdingCostPerMs ?? 0.001 },
          ...(t.mempalaceBin !== undefined ? { mempalaceBin: t.mempalaceBin } : {}),
        }),
      ...(t.tickMs !== undefined ? { captureTickMs: t.tickMs } : {}),
    }
  : {};

runSovereignWorker((manifest) => makeOperatorDaemonBehavior(manifest, extra));
