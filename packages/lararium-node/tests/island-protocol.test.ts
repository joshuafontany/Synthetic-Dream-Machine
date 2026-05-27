/**
 * island-protocol.test.ts — P.3 pre-work gate tests.
 *
 * Tests GP-1 through GP-5 from the structured-clone-gap ahu.
 * All tests must pass before the first Lararium island ships.
 *
 * GP-1: schema_version enforcement (unit)
 * GP-2: plain-object payload shape (unit + structural)
 * GP-3: Tiddler-level delta (integration — confirms added/deleted arrays cross the boundary)
 * GP-5: teardown handshake ordering (integration — cancel:confirmed before teardown:ack)
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/island-protocol
 */

import { describe, test, expect, afterEach } from "vitest";
import { Worker, MessageChannel } from "worker_threads";
import {
  isVesselToIslandMsg,
  isIslandToVesselMsg,
  ISLAND_PROTOCOL_VERSION,
  mkTeardown,
  mkManifest,
  type IslandMsg_TeardownAck,
  type IslandMsg_Ea,
  type IslandMsg_Event,
  type BagBinding,
  type BagMode,
  type IslandStorageConfig,
} from "@lararium/mesh";

// Path to the teardown-echo fixture (plain ESM — no ts-jest compilation needed).
const FIXTURE_URL = new URL("./fixtures/teardown-echo.mjs", import.meta.url);

// ── Helpers ────────────────────────────────────────────────────────────────

function spawnFixture(): Worker {
  return new Worker(FIXTURE_URL);
}

/** Collect island messages until `predicate` returns true, then resolve. */
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

// ── BagBinding shape (unit) ────────────────────────────────────────────────

describe("BagBinding — capability token shape", () => {
  test("relational BagBinding carries docUrl capability token", () => {
    const b: BagBinding = {
      bagId: "lar:///bags/wiki/v0.1",
      writable: true,
      mode: "relational",
      docUrl: "automerge:abc123",
    };
    expect(b.mode).toBe("relational");
    if (b.mode === "relational") expect(b.docUrl).toBe("automerge:abc123");
  });

  test("mkManifest carries bagBindings in message", () => {
    const { port2: syncPort } = new MessageChannel();
    const bindings: readonly BagBinding[] = [
      { bagId: "lar:///bags/wiki/v0.1",  writable: true,  mode: "relational", docUrl: "automerge:xyz" },
      { bagId: "lar:///bags/lares/v0.1", writable: false, mode: "relational", docUrl: "automerge:abc" },
    ];
    const msg = mkManifest(
      "lar:///test",
      new Uint8Array(0),
      syncPort as unknown as globalThis.MessagePort,
      null,
      { bagBindings: bindings },
    );
    syncPort.close();
    expect(msg.bagBindings).toHaveLength(2);
    expect(msg.bagBindings?.[0]?.mode).toBe("relational");
    expect(msg.bagBindings?.[1]?.mode).toBe("relational");
    expect(isVesselToIslandMsg(msg)).toBe(true);
  });

  test("mkManifest with no opts produces valid manifest (cold boot)", () => {
    const { port2: syncPort } = new MessageChannel();
    const msg = mkManifest(
      "lar:///test-cold",
      new Uint8Array(0),
      syncPort as unknown as globalThis.MessagePort,
    );
    syncPort.close();
    expect(msg.bagBindings).toBeUndefined();
    expect(msg.docUrl).toBeUndefined();
    expect(isVesselToIslandMsg(msg)).toBe(true);
  });
});

// ── IslandStorageConfig shape (unit) ─────────────────────────────────────

describe("IslandStorageConfig — island-owned storage protocol", () => {
  test("nodefs config carries dir field", () => {
    const cfg: IslandStorageConfig = { type: "nodefs", dir: "/data/lararium/wiki-a" };
    expect(cfg.type).toBe("nodefs");
    if (cfg.type === "nodefs") expect(cfg.dir).toBe("/data/lararium/wiki-a");
  });

  test("idb config carries dbName field", () => {
    const cfg: IslandStorageConfig = { type: "idb", dbName: "lararium-wiki-a" };
    expect(cfg.type).toBe("idb");
    if (cfg.type === "idb") expect(cfg.dbName).toBe("lararium-wiki-a");
  });

  test("memory config is ephemeral", () => {
    const cfg: IslandStorageConfig = { type: "memory" };
    expect(cfg.type).toBe("memory");
  });

  test("mkManifest carries nodefs storage in message", () => {
    const { port2: syncPort } = new MessageChannel();
    const storage: IslandStorageConfig = { type: "nodefs", dir: "/data/wiki-sprint3" };
    const msg = mkManifest(
      "lar:///test-storage",
      new Uint8Array(0),
      syncPort as unknown as globalThis.MessagePort,
      null,
      { storage },
    );
    syncPort.close();
    expect(msg.storage?.type).toBe("nodefs");
    if (msg.storage?.type === "nodefs") expect(msg.storage.dir).toBe("/data/wiki-sprint3");
    expect(isVesselToIslandMsg(msg)).toBe(true);
  });
});

// ── GP-1: schema_version enforcement (unit) ────────────────────────────────

describe("GP-1 — schema_version enforcement", () => {
  test("isVesselToIslandMsg accepts valid teardown with schema_version 1", () => {
    const msg = mkTeardown();
    expect(isVesselToIslandMsg(msg)).toBe(true);
  });

  test("isVesselToIslandMsg rejects message missing schema_version", () => {
    expect(isVesselToIslandMsg({ type: "teardown" })).toBe(false);
  });

  test("isVesselToIslandMsg rejects message with wrong schema_version", () => {
    expect(isVesselToIslandMsg({ schema_version: 2, type: "teardown" })).toBe(false);
    expect(isVesselToIslandMsg({ schema_version: 0, type: "teardown" })).toBe(false);
  });

  test("isVesselToIslandMsg rejects unknown type even with correct schema_version", () => {
    expect(isVesselToIslandMsg({ schema_version: ISLAND_PROTOCOL_VERSION, type: "unknown" })).toBe(false);
  });

  test("isIslandToVesselMsg accepts valid teardown:ack", () => {
    const ack: IslandMsg_TeardownAck = { schema_version: 1, type: "teardown:ack" };
    expect(isIslandToVesselMsg(ack)).toBe(true);
  });

  test("isIslandToVesselMsg rejects teardown (main→island msg) as island→main", () => {
    expect(isIslandToVesselMsg({ schema_version: 1, type: "teardown" })).toBe(false);
  });

  test("isVesselToIslandMsg rejects null and primitives", () => {
    expect(isVesselToIslandMsg(null)).toBe(false);
    expect(isVesselToIslandMsg(undefined)).toBe(false);
    expect(isVesselToIslandMsg("teardown")).toBe(false);
    expect(isVesselToIslandMsg(42)).toBe(false);
  });

  test("all three MainToisland types pass isVesselToIslandMsg", () => {
    const { port2: _p } = new MessageChannel();
    expect(isVesselToIslandMsg(mkManifest("lar:///test", new Uint8Array(0), _p as unknown as globalThis.MessagePort))).toBe(true);
    _p.close();
    expect(isVesselToIslandMsg({ schema_version: 1, type: "demote", wikiUri: "lar:///test" })).toBe(true);
    expect(isVesselToIslandMsg(mkTeardown())).toBe(true);
  });

  test("all five islandToMain types pass isIslandToVesselMsg", () => {
    const event: IslandMsg_Event = {
      schema_version: 1,
      type: "event",
      wikiUri: "lar:///test",
      listenable: "ev-1",
      payload: { x: 1 },
    };
    expect(isIslandToVesselMsg(event)).toBe(true);
    expect(isIslandToVesselMsg({ schema_version: 1, type: "teardown:ack" })).toBe(true);
    expect(isIslandToVesselMsg({ schema_version: 1, type: "ea", wikiUri: "lar:///test" })).toBe(true);
    expect(isIslandToVesselMsg({ schema_version: 1, type: "frame:ack", wikiUri: "lar:///test", frameId: "x" })).toBe(true);
    expect(isIslandToVesselMsg({ schema_version: 1, type: "fault", wikiUri: "lar:///test", error: "boom" })).toBe(true);
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

  test("island sends cancel:confirmed before teardown:ack", async () => {
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

  test("teardown:ack message passes isIslandToVesselMsg guard", async () => {
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

  test("manifest delivery elicits ea sovereignty declaration", async () => {
    worker = spawnFixture();
    const wikiUri = "lar:///ha.ka.ba/test-wiki";

    const msgsPromise = collectUntil(
      worker,
      (msgs) => (msgs as { type: string }[]).some((m) => m.type === "ea"),
    );

    const { port2: syncPort } = new MessageChannel();
    worker.postMessage(mkManifest(wikiUri, new Uint8Array(0), syncPort as unknown as globalThis.MessagePort), [syncPort]);
    const msgs = await msgsPromise;

    const ack = msgs.find((m) => (m as IslandMsg_Ea).type === "ea") as IslandMsg_Ea | undefined;
    expect(ack).toBeDefined();
    expect(ack?.wikiUri).toBe(wikiUri);
    expect(isIslandToVesselMsg(ack)).toBe(true);
  });

  test("message without schema_version is not routed by the guard", () => {
    // Unit test — no island needed.
    const naked = { type: "teardown" };
    expect(isVesselToIslandMsg(naked)).toBe(false);
  });
});
