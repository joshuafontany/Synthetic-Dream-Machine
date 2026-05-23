/**
 * browser-wiki-worker — browser Web Worker entry point for wiki authorities.
 *
 * One instance runs per hot-tier wiki slot inside a dedicated Web Worker realm.
 * Owns a TW5Engine via WorkerAuthorityHandler; the host page feeds
 * promote / changeset / teardown messages and receives acks and verse-events.
 *
 * ## Lifecycle (GP-5 contract — browser binding)
 *
 *   host page                     Worker
 *   ─────────                     ──────
 *   new Worker(url)               → thread boots, awaits first message
 *   postMessage(promote)          → boot TW5 from snapshotTiddlers
 *                                 ← promote:ack
 *   postMessage(changeset)        → apply tiddler delta to TW5
 *                                 ← event (verse-event reaction)
 *   postMessage(teardown)         → cancel live handles; snapshot TW5 state
 *                                 ← teardown:ack (+ snapshotTiddlers)
 *   worker.terminate()            → thread terminates
 *
 * This file owns only the browser I/O binding (self.addEventListener / self.postMessage).
 * All TW5 lifecycle logic lives in WorkerAuthorityHandler (@lararium/tw5).
 *
 * addEventListener (not onmessage =) — additive, non-clobbering. Matches the additive
 * parentPort.on("message") semantics in lar-wiki-worker.ts. Future sprints (S4 projection
 * channel, S6 sync stream) may add listeners without collision risk.
 *
 * DOM types do not appear in this file (BA-1). The DedicatedWorkerGlobalScope `self`
 * binding is the sole platform surface used here.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-wiki-worker
 */

import { WorkerAuthorityHandler } from "@lararium/tw5";
import type { WorkerToMainMsg } from "@lararium/mesh";

const handler = new WorkerAuthorityHandler((msg: WorkerToMainMsg) => {
  self.postMessage(msg);
});

self.addEventListener("message", (e: MessageEvent) => {
  void handler.handleMessage(e.data);
});
