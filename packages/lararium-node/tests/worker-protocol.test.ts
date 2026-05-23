/**
 * worker-protocol.test.ts — P.3 pre-work gate tests.
 *
 * Tests GP-1 through GP-5 from the structured-clone-gap ahu.
 * All tests must pass before the first LarariumWorker ships.
 *
 * GP-1: schema_version enforcement (unit)
 * GP-2: plain-object payload shape (unit + structural)
 * GP-3: Tiddler-level delta (integration — confirms added/deleted arrays cross the boundary)
 * GP-5: teardown handshake ordering (integration — cancel:confirmed before teardown:ack)
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/v0.1/worker-protocol
 */

import { describe, test, expect, afterEach } from "vitest";
import { Worker } from "worker_threads";
import {
  isMainToWorkerMsg,
  isWorkerToMainMsg,
  WORKER_PROTOCOL_VERSION,
  mkTeardown,
  mkPromote,
  type WorkerMsg_Changeset,
  type WorkerMsg_TeardownAck,
  type WorkerMsg_PromoteAck,
  type WorkerMsg_Event,
} from "@lararium/mesh";

// Path to the teardown-echo fixture (plain ESM — no ts-jest compilation needed).
const FIXTURE_URL = new URL("./fixtures/teardown-echo.mjs", import.meta.url);

// ── Helpers ────────────────────────────────────────────────────────────────

function spawnFixture(): Worker {
  return new Worker(FIXTURE_URL);
}

/** Collect Worker messages until `predicate` returns true, then resolve. */
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

    worker.on("message", (msg) => {
      msgs.push(msg);
      if (predicate(msgs)) {
        clearTimeout(timer);
        resolve(msgs);
      }
    });
    worker.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// ── GP-1: schema_version enforcement (unit) ────────────────────────────────

describe("GP-1 — schema_version enforcement", () => {
  test("isMainToWorkerMsg accepts valid teardown with schema_version 1", () => {
    const msg = mkTeardown();
    expect(isMainToWorkerMsg(msg)).toBe(true);
  });

  test("isMainToWorkerMsg rejects message missing schema_version", () => {
    expect(isMainToWorkerMsg({ type: "teardown" })).toBe(false);
  });

  test("isMainToWorkerMsg rejects message with wrong schema_version", () => {
    expect(isMainToWorkerMsg({ schema_version: 2, type: "teardown" })).toBe(false);
    expect(isMainToWorkerMsg({ schema_version: 0, type: "teardown" })).toBe(false);
  });

  test("isMainToWorkerMsg rejects unknown type even with correct schema_version", () => {
    expect(isMainToWorkerMsg({ schema_version: WORKER_PROTOCOL_VERSION, type: "unknown" })).toBe(false);
  });

  test("isWorkerToMainMsg accepts valid teardown:ack", () => {
    const ack: WorkerMsg_TeardownAck = { schema_version: 1, type: "teardown:ack" };
    expect(isWorkerToMainMsg(ack)).toBe(true);
  });

  test("isWorkerToMainMsg rejects teardown (main→Worker msg) as Worker→main", () => {
    expect(isWorkerToMainMsg({ schema_version: 1, type: "teardown" })).toBe(false);
  });

  test("isMainToWorkerMsg rejects null and primitives", () => {
    expect(isMainToWorkerMsg(null)).toBe(false);
    expect(isMainToWorkerMsg(undefined)).toBe(false);
    expect(isMainToWorkerMsg("teardown")).toBe(false);
    expect(isMainToWorkerMsg(42)).toBe(false);
  });

  test("all four MainToWorker types pass isMainToWorkerMsg", () => {
    const changeset: WorkerMsg_Changeset = {
      schema_version: 1,
      type: "changeset",
      wikiUri: "lar:///test",
      added:   [{ title: "lar:///test/tiddler", text: "hello" }],
      deleted: [],
    };
    expect(isMainToWorkerMsg(changeset)).toBe(true);
    expect(isMainToWorkerMsg(mkPromote("lar:///test"))).toBe(true);
    expect(isMainToWorkerMsg({ schema_version: 1, type: "demote", wikiUri: "lar:///test" })).toBe(true);
    expect(isMainToWorkerMsg(mkTeardown())).toBe(true);
  });

  test("all four WorkerToMain types pass isWorkerToMainMsg", () => {
    const event: WorkerMsg_Event = {
      schema_version: 1,
      type: "event",
      wikiUri: "lar:///test",
      listenable: "ev-1",
      payload: { x: 1 },
    };
    expect(isWorkerToMainMsg(event)).toBe(true);
    expect(isWorkerToMainMsg({ schema_version: 1, type: "teardown:ack" })).toBe(true);
    expect(isWorkerToMainMsg({ schema_version: 1, type: "promote:ack", wikiUri: "lar:///test" })).toBe(true);
    expect(isWorkerToMainMsg({ schema_version: 1, type: "fault", wikiUri: "lar:///test", error: "boom" })).toBe(true);
  });
});

// ── GP-3: tiddler-level delta shape (unit) ────────────────────────────────

describe("GP-3 — tiddler-level delta shape", () => {
  test("WorkerMsg_Changeset with added/deleted arrays passes isMainToWorkerMsg", () => {
    const msg: WorkerMsg_Changeset = {
      schema_version: 1,
      type: "changeset",
      wikiUri: "lar:///ha.ka.ba/wiki",
      added:   [{ title: "lar:///ha.ka.ba/wiki/page", text: "hello" }],
      deleted: ["lar:///ha.ka.ba/wiki/stale"],
    };
    expect(isMainToWorkerMsg(msg)).toBe(true);
  });

  test("changeset with empty added/deleted arrays is valid", () => {
    const msg: WorkerMsg_Changeset = {
      schema_version: 1,
      type: "changeset",
      wikiUri: "lar:///ha.ka.ba/wiki",
      added:   [],
      deleted: [],
    };
    expect(isMainToWorkerMsg(msg)).toBe(true);
  });
});

// ── GP-5: teardown handshake (integration) ────────────────────────────────

describe("GP-5 — teardown handshake (integration)", () => {
  let worker: Worker | null = null;

  afterEach(async () => {
    if (worker) {
      await worker.terminate().catch(() => {});
      worker = null;
    }
  });

  test("Worker sends cancel:confirmed before teardown:ack", async () => {
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
    // cancel:confirmed MUST arrive before teardown:ack — GP-5 ordering invariant.
    expect(cancelIdx).toBeLessThan(ackIdx);
  });

  test("teardown:ack message passes isWorkerToMainMsg guard", async () => {
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

  test("promote signal elicits promote:ack", async () => {
    worker = spawnFixture();
    const wikiUri = "lar:///ha.ka.ba/test-wiki";

    const msgsPromise = collectUntil(
      worker,
      (msgs) => (msgs as { type: string }[]).some((m) => m.type === "promote:ack"),
    );

    worker.postMessage(mkPromote(wikiUri));
    const msgs = await msgsPromise;

    const ack = msgs.find((m) => (m as WorkerMsg_PromoteAck).type === "promote:ack") as WorkerMsg_PromoteAck | undefined;
    expect(ack).toBeDefined();
    expect(ack?.wikiUri).toBe(wikiUri);
    expect(isWorkerToMainMsg(ack)).toBe(true);
  });

  test("GP-3: tiddler-level changeset crosses boundary; fixture echoes addedCount/deletedCount", async () => {
    worker = spawnFixture();

    const msgsPromise = collectUntil(
      worker,
      (msgs) => (msgs as { type: string }[]).some((m) => m.type === "event"),
    );

    const msg: WorkerMsg_Changeset = {
      schema_version: 1,
      type: "changeset",
      wikiUri: "lar:///ha.ka.ba/test-wiki",
      added:   [{ title: "lar:///ha.ka.ba/test-wiki/a" }, { title: "lar:///ha.ka.ba/test-wiki/b" }],
      deleted: ["lar:///ha.ka.ba/test-wiki/old"],
    };
    worker.postMessage(msg);

    const msgs = await msgsPromise;
    const echo = msgs.find((m) => (m as { type: string }).type === "event") as WorkerMsg_Event | undefined;

    expect(echo).toBeDefined();
    expect(echo?.listenable).toBe("echo");
    expect(echo?.payload.addedCount).toBe(2);
    expect(echo?.payload.deletedCount).toBe(1);
  });

  test("message without schema_version is not routed by the guard", () => {
    // Unit test — no Worker needed.
    const naked = { type: "teardown" };
    expect(isMainToWorkerMsg(naked)).toBe(false);
  });
});
