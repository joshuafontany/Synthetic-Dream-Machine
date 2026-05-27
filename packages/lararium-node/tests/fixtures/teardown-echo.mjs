/**
 * teardown-echo.mjs — minimal wiki Worker fixture for GP-5 teardown handshake tests.
 *
 * Simulates the handshake contract:
 *   1. Receives { schema_version: 1, type: "teardown" }
 *   2. Completes in-flight work (none in this fixture — immediate)
 *   3. Calls cancel() on all live KumuCancelable handles (simulated via cancelTracking)
 *   4. Posts { schema_version: 1, type: "teardown:ack" }
 *
 * The "cancelTracking" array mimics the Worker holding a set of live cancelables
 * and calling .cancel() on each before sending ack. The fixture records each
 * cancel call in a pre-teardown "cancel:confirmed" message so the test can assert
 * ordering: cancels complete before ack sends.
 *
 * NOT production code. Fixture only.
 */

import { parentPort } from "node:worker_threads";

/** Simulated KumuCancelable handle — tracks whether cancel() was called. */
class MockCancelable {
  constructor(name) {
    this.name = name;
    this.cancelled = false;
  }
  cancel() {
    this.cancelled = true;
    return this.name;
  }
}

// Simulate two live subscriptions registered by the Worker's Repo.
const liveSubscriptions = [
  new MockCancelable("doc-handle"),
  new MockCancelable("session-event-bus"),
];

parentPort.on("message", (msg) => {
  if (typeof msg !== "object" || msg === null) return;
  if (msg.schema_version !== 1) {
    parentPort.postMessage({
      schema_version: 1,
      type: "fault",
      wikiUri: "",
      error: `unexpected schema_version: ${msg.schema_version}`,
    });
    return;
  }

  if (msg.type === "teardown") {
    // GP-5: cancel all live subscriptions before sending ack.
    const cancelled = liveSubscriptions.map((sub) => sub.cancel());
    // Signal that cancels completed — test asserts this arrives BEFORE teardown:ack.
    parentPort.postMessage({
      schema_version: 1,
      type: "cancel:confirmed",
      cancelled,
    });
    parentPort.postMessage({ schema_version: 1, type: "teardown:ack" });
    return;
  }

  if (msg.type === "manifest") {
    parentPort.postMessage({ schema_version: 1, type: "ea", wikiUri: msg.wikiUri });
    return;
  }

});
