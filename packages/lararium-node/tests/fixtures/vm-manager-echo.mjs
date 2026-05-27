/**
 * vm-manager-echo.mjs — lightweight island fixture for NodeVmManager lifecycle tests.
 *
 * Implements the lar-wiki-worker protocol without TW5 or ReactionEngine:
 *   manifest        → ea
 *   wiki:place-job  → wiki:job-result (echo)
 *   teardown/demote → teardown:ack
 *
 * NOT production code — fixture only.
 */

import { parentPort } from "node:worker_threads";

let wikiUri = null;

parentPort.on("message", (msg) => {
  if (typeof msg !== "object" || msg === null || msg.schema_version !== 1) {
    parentPort.postMessage({ schema_version: 1, type: "fault", wikiUri: wikiUri ?? "", error: "bad schema" });
    return;
  }

  if (msg.type === "manifest") {
    wikiUri = msg.wikiUri;
    parentPort.postMessage({ schema_version: 1, type: "ea", wikiUri });
    // Close the transferred syncPort if present — fixture doesn't use Repo.
    msg.syncPort?.close?.();
    return;
  }

  if (msg.type === "wiki:place-job") {
    // Echo job back as result for testing wiki:place-job / wiki:job-result round-trip.
    if (msg.requestId) {
      parentPort.postMessage({
        schema_version: 1,
        type: "wiki:job-result",
        requestId: msg.requestId,
        result: { verb: msg.verb, echoed: true },
      });
    }
    return;
  }

  if (msg.type === "teardown" || msg.type === "demote") {
    wikiUri = null;
    parentPort.postMessage({ schema_version: 1, type: "teardown:ack" });
    return;
  }
});
