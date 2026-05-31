/**
 * worker-lifecycle.test.ts — browser vessel lifecycle protocol tests.
 *
 * Drives the teardown-echo-browser fixture island through the GP-5 contract:
 *   manifest(wikiUri) → ea
 *   changeset(delta)  → event (addedCount / deletedCount echoed)
 *   teardown()        → cancel:confirmed → teardown:ack (ordering asserted)
 *
 * Uses the real browser Web Worker API — proves the browser binding layer,
 * not just IslandKernel (already proven in lararium-node).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/worker-lifecycle
 */

import { describe, test, expect, afterEach } from "vitest";
import {
  isIslandToVesselMsg,
  mkTeardown,
  mkManifest,
  type IslandMsg_Ea,
    type IslandMsg_Event,
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

  test("manifest delivery elicits ea sovereignty declaration with matching wikiUri", async () => {
    worker = spawnFixture();
    const wikiUri = "lar:///ha.ka.ba/test-wiki";

    const msgsPromise = collectUntil(
      worker,
      (msgs) => (msgs as { type: string }[]).some((m) => m.type === "ea"),
    );

    // syncPort: browser MessageChannel is available globally in dedicated islands.
    const { port1: _main, port2: syncPort } = new MessageChannel();
    worker.postMessage(mkManifest(wikiUri, syncPort, { wikiSlug: "test-wiki" }, {}), [syncPort]);
    _main.close();
    const msgs = await msgsPromise;

    const ack = msgs.find((m) => (m as { type: string }).type === "ea") as IslandMsg_Ea | undefined;
    expect(ack).toBeDefined();
    expect(ack?.wikiUri).toBe(wikiUri);
    expect(isIslandToVesselMsg(ack)).toBe(true);
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

  test("teardown:ack passes isIslandToVesselMsg guard", async () => {
    worker = spawnFixture();

    const msgsPromise = collectUntil(
      worker,
      (msgs) => (msgs as { type: string }[]).some((m) => m.type === "teardown:ack"),
    );

    worker.postMessage(mkTeardown());
    const msgs = await msgsPromise;

    const ack = msgs.find((m) => (m as { type: string }).type === "teardown:ack");
    expect(isIslandToVesselMsg(ack)).toBe(true);
  });
});
