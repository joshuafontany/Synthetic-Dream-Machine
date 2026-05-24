/**
 * worker-lifecycle.test.ts — browser vessel lifecycle protocol tests.
 *
 * Drives the teardown-echo-browser fixture Worker through the GP-5 contract:
 *   promote(wikiUri)  → promote:ack
 *   changeset(delta)  → event (addedCount / deletedCount echoed)
 *   teardown()        → cancel:confirmed → teardown:ack (ordering asserted)
 *
 * Uses the real browser Web Worker API — proves the browser binding layer,
 * not just WorkerAuthorityHandler (already proven in lararium-node).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/worker-lifecycle
 */

import { describe, test, expect, afterEach } from "vitest";
import {
  isWorkerToMainMsg,
  mkTeardown,
  mkPromote,
  mkChangeset,
  type WorkerMsg_PromoteAck,
  type WorkerMsg_Event,
  type WorkerMsg_ChangesetAck,
} from "@lararium/mesh";

const FIXTURE_URL = new URL("./fixtures/teardown-echo-browser.mjs", import.meta.url);

function spawnFixture(): Worker {
  return new Worker(FIXTURE_URL, { type: "module" });
}

function collectUntil(
  worker: Worker,
  predicate: (msgs: unknown[]) => boolean,
  timeoutMs = 4000,
): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const msgs: unknown[] = [];
    const timer = setTimeout(() => {
      reject(new Error(`collectUntil timed out after ${timeoutMs}ms. Received: ${JSON.stringify(msgs)}`));
    }, timeoutMs);

    worker.addEventListener("message", (e) => {
      msgs.push(e.data);
      if (predicate(msgs)) {
        clearTimeout(timer);
        resolve(msgs);
      }
    });
    worker.addEventListener("error", (e) => {
      clearTimeout(timer);
      reject(new Error(e.message));
    });
  });
}

describe("browser worker lifecycle — GP-5 contract", () => {
  let worker: Worker | null = null;

  afterEach(() => {
    worker?.terminate();
    worker = null;
  });

  test("promote signal elicits promote:ack with matching wikiUri", async () => {
    worker = spawnFixture();
    const wikiUri = "lar:///ha.ka.ba/test-wiki";

    const msgsPromise = collectUntil(
      worker,
      (msgs) => (msgs as { type: string }[]).some((m) => m.type === "promote:ack"),
    );

    // coreBlob required by BA-5 — fixture ignores bytes but type must be honest.
    // syncPort: browser MessageChannel is available globally in dedicated Workers.
    const { port1: _main, port2: syncPort } = new MessageChannel();
    worker.postMessage(mkPromote(wikiUri, new Uint8Array(0), syncPort), [syncPort]);
    _main.close();
    const msgs = await msgsPromise;

    const ack = msgs.find((m) => (m as { type: string }).type === "promote:ack") as WorkerMsg_PromoteAck & { coreBlobByteLength?: number } | undefined;
    expect(ack).toBeDefined();
    expect(ack?.wikiUri).toBe(wikiUri);
    // BA-5: coreBlob crossed the structured-clone boundary (fixture echoes byteLength).
    expect(ack?.coreBlobByteLength).toBeGreaterThanOrEqual(0);
    expect(isWorkerToMainMsg(ack)).toBe(true);
  });

  test("GP-3: changeset crosses boundary; fixture echoes addedCount/deletedCount", async () => {
    // GP-3 debt: island receives a pre-computed delta from the main-thread Automerge oracle.
    // A pono CRDT-peer model would have the Worker hold its own document and verify heads.
    // Named debt — deferred past S9 e2e.
    worker = spawnFixture();

    const msgsPromise = collectUntil(
      worker,
      (msgs) => (msgs as { type: string }[]).some((m) => m.type === "event"),
    );

    const wikiUri = "lar:///ha.ka.ba/test-wiki";
    const cs = mkChangeset(wikiUri,
      [{ title: `${wikiUri}/a` }, { title: `${wikiUri}/b` }],
      [`${wikiUri}/old`],
    );
    worker.postMessage(cs);

    const msgs = await collectUntil(
      worker,
      (m) => (m as { type: string }[]).some((x) => x.type === "changeset:ack"),
    );
    const echo = msgs.find((m) => (m as { type: string }).type === "event") as WorkerMsg_Event | undefined;
    const ack  = msgs.find((m) => (m as { type: string }).type === "changeset:ack") as WorkerMsg_ChangesetAck | undefined;

    expect(echo).toBeDefined();
    expect(echo?.listenable).toBe("echo");
    expect(echo?.payload.addedCount).toBe(2);
    expect(echo?.payload.deletedCount).toBe(1);
    // ACK-gate: batch_id echoed back — main thread can release the queue.
    expect(ack?.batch_id).toBe(cs.batch_id);
    expect(isWorkerToMainMsg(ack)).toBe(true);
  });

  test("GP-5: teardown — cancel:confirmed arrives before teardown:ack", async () => {
    worker = spawnFixture();

    const msgsPromise = collectUntil(
      worker,
      (msgs) => (msgs as { type: string }[]).some((m) => m.type === "teardown:ack"),
    );

    worker.postMessage(mkTeardown());
    const msgs = await msgsPromise as { type: string }[];

    const cancelIdx = msgs.findIndex((m) => m.type === "cancel:confirmed");
    const ackIdx    = msgs.findIndex((m) => m.type === "teardown:ack");

    expect(cancelIdx).toBeGreaterThanOrEqual(0);
    expect(ackIdx).toBeGreaterThanOrEqual(0);
    expect(cancelIdx).toBeLessThan(ackIdx);
  });

  test("teardown:ack passes isWorkerToMainMsg guard", async () => {
    worker = spawnFixture();

    const msgsPromise = collectUntil(
      worker,
      (msgs) => (msgs as { type: string }[]).some((m) => m.type === "teardown:ack"),
    );

    worker.postMessage(mkTeardown());
    const msgs = await msgsPromise;

    const ack = msgs.find((m) => (m as { type: string }).type === "teardown:ack");
    expect(isWorkerToMainMsg(ack)).toBe(true);
  });
});
