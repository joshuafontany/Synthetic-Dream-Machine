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
 * Meme: lar:///ha.ka.ba/lararium/mesh/island-protocol
 */

import { describe, test, expect, afterEach } from "vitest";
import { Worker, MessageChannel } from "worker_threads";
import {
  isVesselToIslandMsg,
  isIslandToVesselMsg,
  ISLAND_PROTOCOL_VERSION,
  mkTeardown,
  mkManifest,
  mkDaemonDeriveSkeletonRequest,
  mkDaemonDeriveSkeletonResult,
  mkDaemonWorldlineCompareRequest,
  mkDaemonWorldlineCompareResult,
  mkDaemonWorldlineTrajectoryRequest,
  mkDaemonWorldlineTrajectoryResult,
  delegationEdge,
  type IslandMsg_TeardownAck,
  type IslandMsg_Ea,
  type IslandMsg_Event,
  type IslandStorageConfig,
  type WikiRecipe,
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

// ── WikiRecipe + grants shape (unit) ──────────────────────────────────────

describe("WikiRecipe + grants — manifest payload shape", () => {
  test("mkManifest carries recipe + typed grants in message", () => {
    const { port2: syncPort } = new MessageChannel();
    const recipe: WikiRecipe = {
      wikiSlug: "test",
      libraryBags: ["lar:///ha.ka.ba/bags/@sdm"],
    };
    // Library bags (@sdm) never ride the grants — the island resolves them
    // from @catalog itself (boot = first reconcile).
    const grants = {
      islandUrl:  "automerge:abc",
      wikiUrl:    "automerge:xyz",
      catalogUrl: "automerge:cat",
    };
    const msg = mkManifest(
      "lar:///test",
      syncPort as unknown as globalThis.MessagePort,
      recipe,
      grants,
    );
    syncPort.close();
    expect(msg.recipe.wikiSlug).toBe("test");
    expect(msg.recipe.libraryBags).toHaveLength(1);
    expect(msg.grants.wikiUrl).toBe("automerge:xyz");
    expect(msg.grants.islandUrl).toBe("automerge:abc");
    expect(msg.grants.catalogUrl).toBe("automerge:cat");
    expect(isVesselToIslandMsg(msg)).toBe(true);
  });

  test("mkManifest with minimal recipe produces valid manifest (cold boot)", () => {
    const { port2: syncPort } = new MessageChannel();
    const msg = mkManifest(
      "lar:///test-cold",
      syncPort as unknown as globalThis.MessagePort,
      { wikiSlug: "cold" },
      { islandUrl: "automerge:engine" },
    );
    syncPort.close();
    expect(msg.recipe.wikiSlug).toBe("cold");
    expect(msg.grants.islandUrl).toBe("automerge:engine");
    expect(msg.grants.wikiUrl).toBeUndefined();
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
      syncPort as unknown as globalThis.MessagePort,
      { wikiSlug: "test-storage" },
      {},
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
    expect(isVesselToIslandMsg(mkManifest("lar:///test", _p as unknown as globalThis.MessagePort, { wikiSlug: "test" }, {}))).toBe(true);
    _p.close();
    expect(isVesselToIslandMsg({ schema_version: 1, type: "hooanu", wikiUri: "lar:///test" })).toBe(true);
    expect(isVesselToIslandMsg(mkTeardown())).toBe(true);
  });

  test("all four islandToMain types pass isIslandToVesselMsg", () => {
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
    expect(isIslandToVesselMsg({ schema_version: 1, type: "fault", wikiUri: "lar:///test", error: "boom" })).toBe(true);
  });

  test("derive-skeleton request is vessel→island, result is island→vessel (the in-VM query-derive channel)", () => {
    const req = mkDaemonDeriveSkeletonRequest({ requestId: "derive-1", query: "<<~ ward ! L-Prime >>" });
    expect(req.type).toBe("daemon:derive-skeleton-request");
    expect(isVesselToIslandMsg(req)).toBe(true);
    expect(isIslandToVesselMsg(req)).toBe(false);

    // a real derivation — skeleton + serialized basis ride back as plain objects (GP-2).
    const hit = mkDaemonDeriveSkeletonResult({
      requestId: "derive-1",
      skeleton: { stream: [], graph: [{ kind: "Sigil" }] },
      basis: { axes: [], dimension: 12 },
    });
    expect(hit.type).toBe("daemon:derive-skeleton-result");
    expect(isIslandToVesselMsg(hit)).toBe(true);
    expect(isVesselToIslandMsg(hit)).toBe(false);

    // a graceful null — both planes absent (→ recall fuses content-only).
    const empty = mkDaemonDeriveSkeletonResult({ requestId: "derive-1" });
    expect(empty.skeleton).toBeUndefined();
    expect(empty.basis).toBeUndefined();
    expect(isIslandToVesselMsg(empty)).toBe(true);
  });

  test("worldline-compare/-trajectory requests are vessel→island, results island→vessel (the in-VM worldline reads)", () => {
    // Well 1 — the ITC LIVE-READ. The edge-DAG rides IN (GP-2 plain objects); the verdict rides back.
    const cmpReq = mkDaemonWorldlineCompareRequest({
      requestId: "wl-1", a: "run", b: "run.a",
      opens: [delegationEdge("run", "run.a", { validFrom: "2026-06-29T00:00:00Z" })],
      root: "run",
    });
    expect(cmpReq.type).toBe("daemon:worldline-compare-request");
    expect(isVesselToIslandMsg(cmpReq)).toBe(true);
    expect(isIslandToVesselMsg(cmpReq)).toBe(false);

    const cmpHit = mkDaemonWorldlineCompareResult({ requestId: "wl-1", order: "before" });
    expect(cmpHit.type).toBe("daemon:worldline-compare-result");
    expect(isIslandToVesselMsg(cmpHit)).toBe(true);
    expect(isVesselToIslandMsg(cmpHit)).toBe(false);
    // an unknown handle → a graceful error (never a thrown wire).
    expect(mkDaemonWorldlineCompareResult({ requestId: "wl-1", error: "unknown handle" }).error).toBe("unknown handle");

    // Well 3 + Well 4 — the trajectory. The stubs (form-vectors shipped) ride IN; the path rides back.
    const trajReq = mkDaemonWorldlineTrajectoryRequest({
      requestId: "wl-2", handle: "run.x",
      stubs: [{ verbatimSha: "sha-a", tickCounter: 1, formVector: { indices: [0], values: [1] } }],
      joinForm: true, includeNull: true, seed: 3,
    });
    expect(trajReq.type).toBe("daemon:worldline-trajectory-request");
    expect(isVesselToIslandMsg(trajReq)).toBe(true);

    const trajHit = mkDaemonWorldlineTrajectoryResult({
      requestId: "wl-2",
      trajectory: { handle: "run.x", steps: [{ verbatimSha: "sha-a" }] },
      nullBaseline: { handle: "run.x", steps: [{ verbatimSha: "sha-a" }], shuffled: true },
    });
    expect(trajHit.type).toBe("daemon:worldline-trajectory-result");
    expect(isIslandToVesselMsg(trajHit)).toBe(true);
    expect(isVesselToIslandMsg(trajHit)).toBe(false);
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
    worker.postMessage(
      mkManifest(wikiUri, syncPort as unknown as globalThis.MessagePort, { wikiSlug: "test" }, {}),
      [syncPort],
    );
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
