/**
 * lar-wiki-worker — Node.js wiki Worker entry point.
 *
 * One instance runs per hot-tier wiki slot. Owns a TW5Engine co-located in
 * the Worker thread, providing synchronous in-thread reads with no
 * StructuredClone overhead on the hot path. The worker owns live wiki
 * reaction once promoted; the main thread feeds snapshots, changesets,
 * and teardown only.
 *
 * ## Lifecycle (GP-5 contract)
 *
 *   main                          Worker
 *   ────                          ──────
 *   new Worker(url)               → thread boots, awaits first message
 *   postMessage(promote)          → boot TW5 from snapshotTiddlers
 *                                 ← promote:ack
 *   postMessage(changeset, [...]) → apply tiddler delta to TW5
 *                                 ← event (verse-event reaction)
 *   postMessage(teardown)         → cancel live handles; snapshot TW5 state
 *                                 ← teardown:ack (+ snapshotTiddlers)
 *   worker.terminate()            → thread terminates
 *
 * This file owns only the Node I/O binding (parentPort).
 * All TW5 lifecycle logic lives in WorkerAuthorityHandler (@lararium/tw5).
 *
 * Meme: lar:///ha.ka.ba/@lararium/node/v0.1/lar-wiki-worker
 */

import { parentPort } from "worker_threads";
import { WorkerAuthorityHandler } from "@lararium/tw5";
import type { WorkerToMainMsg } from "@lararium/mesh";

if (!parentPort) {
  throw new Error("[lar-wiki-worker] parentPort is null — must run as a Worker thread.");
}

const handler = new WorkerAuthorityHandler((msg: WorkerToMainMsg) => {
  parentPort!.postMessage(msg);
});

parentPort.on("message", (raw: unknown) => {
  void handler.handleMessage(raw);
});
