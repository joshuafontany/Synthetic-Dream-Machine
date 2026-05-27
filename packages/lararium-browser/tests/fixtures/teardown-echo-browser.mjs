/**
 * teardown-echo-browser.mjs — browser Web Worker fixture for lifecycle protocol tests.
 *
 * Browser mirror of lararium-node's teardown-echo.mjs.
 * Uses self.addEventListener / self.postMessage (DedicatedWorkerGlobalScope).
 * No worker_threads. No DOM types.
 *
 * Simulates the GP-5 handshake contract:
 *   manifest  → ea
 *   teardown  → cancel:confirmed, teardown:ack (ordering preserved)
 */

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

const liveSubscriptions = [
  new MockCancelable("doc-handle"),
  new MockCancelable("session-event-bus"),
];

self.addEventListener("message", (e) => {
  const msg = e.data;
  if (typeof msg !== "object" || msg === null) return;
  if (msg.schema_version !== 1) {
    self.postMessage({ schema_version: 1, type: "fault", wikiUri: "", error: `unexpected schema_version: ${msg.schema_version}` });
    return;
  }

  if (msg.type === "teardown") {
    const cancelled = liveSubscriptions.map((sub) => sub.cancel());
    self.postMessage({ schema_version: 1, type: "cancel:confirmed", cancelled });
    self.postMessage({ schema_version: 1, type: "teardown:ack" });
    return;
  }

  if (msg.type === "manifest") {
    // Echo coreBlobByteLength so the test can assert BA-5 transfer crossed the boundary.
    self.postMessage({
      schema_version: 1,
      type: "ea",
      wikiUri: msg.wikiUri,
      coreBlobByteLength: msg.coreBlob?.byteLength ?? -1,
    });
    return;
  }

});
