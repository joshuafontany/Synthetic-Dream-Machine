/**
 * node-vm-manager.test.ts — NodeVmManager lifecycle integration tests.
 *
 * Uses the vm-manager-echo.mjs fixture Worker (no TW5/RE) to verify:
 *   mountWiki   → Worker spawned, promote sent, slot becomes hot
 *   routeChangeset → delta forwarded to Worker; Worker applies and echoes
 *   unmountWiki → teardown handshake; snapshotTiddlers captured; slot becomes cold
 *   event forwarding → onWorkerEvent callback fires for Worker events
 *
 * All tests run against the full NodeVmManager (no mocking of internals).
 * DocHandle is stubbed with a minimal shape — no Automerge-repo dependency.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/node-vm-manager
 */

import { describe, test, expect, afterEach } from "vitest";
import type { DocHandle } from "@automerge/automerge-repo";
import type { MemeStoreDoc } from "@lararium/mesh";
import { NodeVmManager } from "../src/node-vm-manager.js";
import type { WorkerMsg_Event } from "@lararium/mesh";

// ---------------------------------------------------------------------------
// Fixture Worker URL
// ---------------------------------------------------------------------------

const FIXTURE_URL = new URL("./fixtures/vm-manager-echo.mjs", import.meta.url);

// ---------------------------------------------------------------------------
// Minimal DocHandle stub — no Automerge-repo required in tests
// ---------------------------------------------------------------------------

function makeDocHandleStub(
  tiddlers: Record<string, unknown> = {},
): DocHandle<MemeStoreDoc> {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  const on = (event: string, fn: (...args: unknown[]) => void) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(fn);
  };
  const off = (event: string, fn: (...args: unknown[]) => void) => {
    listeners.get(event)?.delete(fn);
  };

  return {
    doc: () => ({ schemaVersion: "0.1", tiddlers }) as unknown as MemeStoreDoc,
    on,
    off,
  } as unknown as DocHandle<MemeStoreDoc>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WIKI_ID = "lar:///ha.ka.ba/@test/wiki";

/** Nominal coreBlob stub — fixture worker ignores the bytes; type remains honest. */
const STUB_CORE_BLOB = { bytes: new Uint8Array() } as const;

/** Collect Worker events (type === listenable) forwarded via onWorkerEvent. */
function eventCollector(): {
  events: WorkerMsg_Event[];
  callback: (wikiId: string, msg: WorkerMsg_Event) => void;
} {
  const events: WorkerMsg_Event[] = [];
  return { events, callback: (_wikiId, msg) => events.push(msg) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("NodeVmManager — Worker lifecycle", () => {
  let manager: NodeVmManager | null = null;

  afterEach(async () => {
    await manager?.disposeAll();
    manager = null;
  });

  test("mountWiki promotes slot to hot tier", async () => {
    manager = new NodeVmManager({ workerScriptUrl: FIXTURE_URL });
    const handle = makeDocHandleStub();

    await manager.mountWiki(WIKI_ID, { docHandle: handle, coreBlob: STUB_CORE_BLOB });

    expect(manager.tier(WIKI_ID)).toBe("hot");
    expect(manager.snapshot(WIKI_ID)).toBeNull(); // hot slot has no snapshot yet
  });

  test("mountWiki is idempotent — second call is a no-op", async () => {
    manager = new NodeVmManager({ workerScriptUrl: FIXTURE_URL });
    const handle = makeDocHandleStub();

    await manager.mountWiki(WIKI_ID, { docHandle: handle, coreBlob: STUB_CORE_BLOB });
    await manager.mountWiki(WIKI_ID, { docHandle: handle, coreBlob: STUB_CORE_BLOB }); // no-op

    expect(manager.tier(WIKI_ID)).toBe("hot");
  });

  test("routeChangeset delivers added/deleted to the Worker", async () => {
    const collector = eventCollector();
    manager = new NodeVmManager({
      workerScriptUrl: FIXTURE_URL,
      onWorkerEvent:   collector.callback,
    });

    await manager.mountWiki(WIKI_ID, { docHandle: makeDocHandleStub(), coreBlob: STUB_CORE_BLOB });

    // Collect the changeset:applied echo from the fixture Worker.
    const applied = new Promise<WorkerMsg_Event>((resolve) => {
      const orig = collector.callback;
      collector.callback = (wikiId, msg) => {
        orig(wikiId, msg);
        if (msg.listenable === "changeset:applied") resolve(msg);
      };
      // Patch the manager's callback — access via reassignment since it's a closure.
      // Simpler: just resolve from the collector events array after routeChangeset.
    });

    manager.routeChangeset(
      WIKI_ID,
      [{ title: "lar:///ha.ka.ba/@test/wiki/page-a", text: "hello" }],
      ["lar:///ha.ka.ba/@test/wiki/stale"],
    );

    // Wait briefly for the async postMessage round-trip.
    await new Promise<void>((r) => setTimeout(r, 200));

    const echos = collector.events.filter((e) => e.listenable === "changeset:applied");
    expect(echos.length).toBeGreaterThanOrEqual(1);
    expect(echos[0]!.payload.addedCount).toBe(1);
    expect(echos[0]!.payload.deletedCount).toBe(1);
  });

  test("unmountWiki moves slot to cold and captures snapshot from teardown:ack", async () => {
    manager = new NodeVmManager({ workerScriptUrl: FIXTURE_URL });
    const seedTiddlers = { "lar:///ha.ka.ba/@test/wiki/seed": { title: "lar:///ha.ka.ba/@test/wiki/seed", text: "seed" } };
    const handle = makeDocHandleStub(seedTiddlers);

    await manager.mountWiki(WIKI_ID, { docHandle: handle, coreBlob: STUB_CORE_BLOB });

    // Route a changeset so the fixture has tiddlers to snapshot.
    manager.routeChangeset(
      WIKI_ID,
      [{ title: "lar:///ha.ka.ba/@test/wiki/added", text: "new" }],
      [],
    );
    await new Promise<void>((r) => setTimeout(r, 100));

    await manager.unmountWiki(WIKI_ID);

    expect(manager.tier(WIKI_ID)).toBe("cold");
    const snap = manager.snapshot(WIKI_ID);
    expect(snap).not.toBeNull();
    // The fixture echoes back all tiddlers it accumulated.
    expect(snap!.tiddlers.length).toBeGreaterThanOrEqual(1);
  });

  test("onWorkerEvent callback fires for events from the Worker", async () => {
    const collector = eventCollector();
    manager = new NodeVmManager({
      workerScriptUrl: FIXTURE_URL,
      onWorkerEvent:   collector.callback,
    });

    await manager.mountWiki(WIKI_ID, { docHandle: makeDocHandleStub(), coreBlob: STUB_CORE_BLOB });

    manager.routeChangeset(WIKI_ID, [{ title: "lar:///ha.ka.ba/@test/wiki/x" }], []);
    await new Promise<void>((r) => setTimeout(r, 200));

    expect(collector.events.some((e) => e.listenable === "changeset:applied")).toBe(true);
    expect(collector.events.every((e) => e.wikiUri === WIKI_ID)).toBe(true);
  });

  test("stats() reflects tier counts correctly", async () => {
    manager = new NodeVmManager({ workerScriptUrl: FIXTURE_URL });

    expect(manager.stats()).toEqual({ pinned: 0, hot: 0, cold: 0 });

    await manager.mountWiki(WIKI_ID, { docHandle: makeDocHandleStub(), coreBlob: STUB_CORE_BLOB });
    expect(manager.stats()).toEqual({ pinned: 0, hot: 1, cold: 0 });

    await manager.unmountWiki(WIKI_ID);
    expect(manager.stats()).toEqual({ pinned: 0, hot: 0, cold: 1 });
  });

  test("re-mountWiki from cold slot — cold snapshot captured, Worker live after re-mount", async () => {
    // GP-3 warm-start via snapshotTiddlers in the promote message is @deprecated.
    // Repo-in-Worker path restores state via CRDT sync over syncPort, not tiddler injection.
    // This test verifies: (a) cold snapshot captures tiddlers from teardown:ack, and
    // (b) the re-mounted Worker is live and responsive.
    const collector = eventCollector();
    manager = new NodeVmManager({
      workerScriptUrl: FIXTURE_URL,
      onWorkerEvent:   collector.callback,
    });

    // Mount, add a tiddler, unmount → cold slot with snapshot.
    await manager.mountWiki(WIKI_ID, { docHandle: makeDocHandleStub(), coreBlob: STUB_CORE_BLOB });
    manager.routeChangeset(WIKI_ID, [{ title: "lar:///ha.ka.ba/@test/wiki/persisted", text: "kept" }], []);
    await new Promise<void>((r) => setTimeout(r, 100));
    await manager.unmountWiki(WIKI_ID);

    // Cold snapshot carries the Worker's final tiddler state (GP-3 teardown:ack path).
    const snap = manager.snapshot(WIKI_ID);
    expect(snap).not.toBeNull();
    expect(snap!.tiddlers.length).toBeGreaterThanOrEqual(1);

    // Re-mount — Worker spawns fresh; slot is hot and responsive.
    await manager.mountWiki(WIKI_ID, { docHandle: makeDocHandleStub(), coreBlob: STUB_CORE_BLOB });
    expect(manager.tier(WIKI_ID)).toBe("hot");

    // Route a changeset to confirm the Worker is live.
    manager.routeChangeset(WIKI_ID, [{ title: "lar:///ha.ka.ba/@test/wiki/new", text: "fresh" }], []);
    await new Promise<void>((r) => setTimeout(r, 150));

    const echos = collector.events.filter((e) => e.listenable === "changeset:applied");
    expect(echos.length).toBeGreaterThanOrEqual(1);
    // Worker started fresh (no snapshotTiddlers in promote — Repo-in-Worker path).
    // addedCount reflects only the changeset we just sent.
    expect(echos.at(-1)!.payload.addedCount).toBe(1);
  });
});
