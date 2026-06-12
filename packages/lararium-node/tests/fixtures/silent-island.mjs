/**
 * silent-island.mjs — an island fixture that never reaches ea.
 *
 * Receives the manifest, closes the transferred syncPort, then holds its
 * breath forever — the dead-mount stand-in for ea-watchdog and mount-
 * intensity vectors. Variants by env:
 *   SILENT_ISLAND_MODE=stall — breathes on an interval with frozen
 *   (phase, progress), modeling a live event loop whose mount never advances.
 *
 * NOT production code — fixture only.
 */

import { parentPort } from "node:worker_threads";

const mode = process.env.SILENT_ISLAND_MODE ?? "silent";

parentPort.on("message", (msg) => {
  if (typeof msg !== "object" || msg === null) return;

  if (msg.type === "manifest") {
    msg.syncPort?.close?.();
    if (mode === "stall") {
      setInterval(() => {
        parentPort.postMessage({
          schema_version: 1,
          type:     "breath",
          wikiUri:  msg.wikiUri,
          phase:    "slots",
          progress: 1,
        });
      }, 25);
    }
    return;
  }

  if (msg.type === "teardown" || msg.type === "hooanu") {
    parentPort.postMessage({ schema_version: 1, type: "teardown:ack" });
  }
});
