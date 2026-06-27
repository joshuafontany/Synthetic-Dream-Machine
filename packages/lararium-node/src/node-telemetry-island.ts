/**
 * node-telemetry-island — Node.js telemetry causal-island entry point.
 *
 * The SEPARATE LOCAL non-federated telemetry VM — now a proper sovereign causal island (it was a
 * bespoke worker_thread the main thread fed; the main thread shouldn't handle the data-plane).
 * Composition only: the node sovereign kernel + a NAMELESS island composed from one `#has` cap —
 * `hasCapture` — hosting the isomorphic capture-engine with node seams (subprocess flush to the
 * palace, fs-WAL reserve) and the self-regulating servo. Raw turns arrive over the island SIGNAL
 * channel (`telemetry:place-verb`); the main thread only transports. role = capability ≠ platform —
 * this file picks only the node platform pieces, exactly as node-admin-island does.
 *
 * Telemetry node-paths ride `workerData` (node-vessel config the manifest schema does not carry);
 * the island identity/storage still arrive via the manifest the spawner sends.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/node-telemetry-island
 */

import { workerData } from "node:worker_threads";

import { composeIsland, hasCapture } from "@lararium/tw5";

import { defaultAnnotate } from "./capture-annotate.js";
import { makeNodeCaptureEngine } from "./node-capture-engine.js";
import { runSovereignWorker } from "./sovereign-island-model.js";

/** Telemetry node-paths + tuning, passed by the spawner via workerData. */
interface TelemetryIslandConfig {
  readonly palacePath: string;
  readonly spoolDir: string;
  readonly walPath: string;
  readonly quarantinePath: string;
  readonly mempalaceBin?: string;
  readonly tickMs?: number;
  readonly targetLatencyMs?: number;
}

const cfg = (workerData ?? {}) as TelemetryIslandConfig;

runSovereignWorker(
  composeIsland([
    hasCapture({
      makeEngine: (post) =>
        makeNodeCaptureEngine({
          palacePath: cfg.palacePath,
          spoolDir: cfg.spoolDir,
          walPath: cfg.walPath,
          quarantinePath: cfg.quarantinePath,
          annotate: defaultAnnotate,
          post,
          servo: { targetLatencyMs: cfg.targetLatencyMs ?? 1000 },
          ...(cfg.mempalaceBin !== undefined ? { mempalaceBin: cfg.mempalaceBin } : {}),
        }),
      ...(cfg.tickMs !== undefined ? { tickMs: cfg.tickMs } : {}),
    }),
  ]),
);
