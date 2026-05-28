/**
 * repo-in-island.test.ts — GP-3 deprecation gate test.
 *
 * Proves: a vessel Repo doc change propagates to the island via MessageChannel
 * WITHOUT calling routeChangeset. When this test passes, the GP-3 oracle path
 * becomes provably unreachable and deletion begins.
 *
 * Test structure (from TALK-STORY-NEXT #active-sprint):
 *   1. vessel Repo with real doc
 *   2. VesselIslandPool({ mainRepo })
 *   3. mountWiki → syncPort transferred → island wires its own Repo
 *   4. vessel changes the doc
 *   5. CRDT sync fires handle.on("change") in the island
 *   6. island emits event(repo:change) observable via onWorkerEvent
 *   7. assert event arrives — no routeChangeset call
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/repo-in-island
 */

import { describe, test, expect, afterEach } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import type { IslandMsg_Event } from "@lararium/mesh";
import { VesselIslandPool } from "../src/vessel-island-pool.js";

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const FIXTURE_URL = new URL("./fixtures/repo-in-island-echo.mjs", import.meta.url);
const WIKI_ID     = "lar:///ha.ka.ba/@test/repo-in-island";


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Collect IslandMsg_Events matching listenable from onWorkerEvent.
 * Returns the collector array and the callback to pass to VesselIslandPool.
 */
function eventCollector(filter?: string): {
  events: IslandMsg_Event[];
  callback: (wikiId: string, msg: IslandMsg_Event) => void;
} {
  const events: IslandMsg_Event[] = [];
  return {
    events,
    callback: (_wikiId, msg) => {
      if (!filter || msg.listenable === filter) events.push(msg);
    },
  };
}

/**
 * Wait until collector.events.length >= count, or reject after timeoutMs.
 * Never calls routeChangeset — CRDT sync only.
 */
function waitForEvents(
  collector: { events: IslandMsg_Event[] },
  count: number,
  timeoutMs = 3000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (collector.events.length >= count) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(
          new Error(
            `timeout: expected ${count} repo:change event(s), got ${collector.events.length} after ${timeoutMs}ms`,
          ),
        );
      }
    }, 20);
  });
}

/**
 * Wait for repo:synced in the all-events collector.
 * The fixture emits this after handle.whenReady() resolves and the change listener is live.
 * Must be awaited before any docHandle.change() to avoid the initial-sync race.
 */
function waitForSynced(all: { events: IslandMsg_Event[] }, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (all.events.some((e) => e.listenable === "repo:synced")) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error(`timeout waiting for repo:synced after ${timeoutMs}ms`));
      }
    }, 20);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Repo-in-island — CRDT sync gate (GP-3 deprecation proof)", () => {
  let manager: VesselIslandPool | null = null;
  let repo: Repo | null = null;

  afterEach(async () => {
    await manager?.disposeAll();
    manager = null;
    await repo?.shutdown();
    repo = null;
  });

  test("doc change on vessel reaches island via syncPort without routeChangeset", async () => {
    const all     = eventCollector();           // all events — used to await repo:synced
    const changes = eventCollector("repo:change"); // filtered — the assertion target

    repo = new Repo({ sharePolicy: async () => true });
    const laraiumHandle = repo.create({ schemaVersion: "0.1" });
    const docHandle = repo.create<{ tiddlers: Record<string, unknown> }>({ tiddlers: {} });

    manager = new VesselIslandPool({
      workerScriptUrl: FIXTURE_URL,
      mainRepo:        repo,
      laraiumDocUrl:   laraiumHandle.url,
      onWorkerEvent:   (id, msg) => { all.callback(id, msg); changes.callback(id, msg); },
    });

    await manager.mountWiki(WIKI_ID, {
      docHandle: docHandle as never,
      coreHash:  null,
    });

    // Wait for the fixture's change listener to be live before mutating.
    // The fixture selects the writable relational binding (b.writable) to skip
    // the read-only @lararium binding prepended at index 0 by VesselIslandPool.
    // The fixture emits repo:synced after handle.whenReady() resolves.
    await waitForSynced(all);

    // Change the doc on the vessel — no routeChangeset call.
    docHandle.change((d) => {
      d.tiddlers["lar:///test/pono"] = { title: "lar:///test/pono", text: "pono" };
    });

    // CRDT sync propagates via MessageChannel → island handle.on("change") fires
    // → island emits event(repo:change) → onWorkerEvent fires.
    await waitForEvents(changes, 1);

    expect(changes.events.length).toBeGreaterThanOrEqual(1);
    const ev = changes.events[0]!;
    expect(ev.listenable).toBe("repo:change");
    expect(ev.wikiUri).toBe(WIKI_ID);
    expect(ev.payload.frameCount).toBe(1);
    expect(ev.payload.tiddlerCount).toBeGreaterThanOrEqual(1);
  });

  test("multiple doc changes produce multiple repo:change events without routeChangeset", async () => {
    const all     = eventCollector();
    const changes = eventCollector("repo:change");

    repo = new Repo({ sharePolicy: async () => true });
    const laraiumHandle = repo.create({ schemaVersion: "0.1" });
    const docHandle = repo.create<{ tiddlers: Record<string, unknown> }>({ tiddlers: {} });

    manager = new VesselIslandPool({
      workerScriptUrl: FIXTURE_URL,
      mainRepo:        repo,
      laraiumDocUrl:   laraiumHandle.url,
      onWorkerEvent:   (id, msg) => { all.callback(id, msg); changes.callback(id, msg); },
    });

    await manager.mountWiki(WIKI_ID, {
      docHandle: docHandle as never,
      coreHash:  null,
    });

    await waitForSynced(all);

    // Three changes — automerge may batch rapid successive changes into fewer sync events.
    // The invariant: all three tiddlers arrive at the island via CRDT sync.
    docHandle.change((d) => { d.tiddlers["a"] = { title: "a" }; });
    docHandle.change((d) => { d.tiddlers["b"] = { title: "b" }; });
    docHandle.change((d) => { d.tiddlers["c"] = { title: "c" }; });

    // Wait for at least one repo:change event and for tiddlerCount to reach 3.
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout waiting for 3 tiddlers")), 5000);
      const interval = setInterval(() => {
        const last = changes.events.at(-1);
        if (last && (last.payload.tiddlerCount as number) >= 3) {
          clearInterval(interval);
          clearTimeout(timer);
          resolve();
        }
      }, 20);
    });

    expect(changes.events.length).toBeGreaterThanOrEqual(1);
    const lastEvent = changes.events.at(-1)!;
    expect(lastEvent.payload.tiddlerCount).toBeGreaterThanOrEqual(3);
    expect(lastEvent.payload.frameCount).toBeGreaterThanOrEqual(1);
  }, 10_000);

  test("CRDT changes arrive; quiescent period produces no additional events", async () => {
    const all     = eventCollector();
    const changes = eventCollector("repo:change");

    repo = new Repo({ sharePolicy: async () => true });
    const laraiumHandle = repo.create({ schemaVersion: "0.1" });
    const docHandle = repo.create<{ tiddlers: Record<string, unknown> }>({ tiddlers: {} });

    manager = new VesselIslandPool({
      workerScriptUrl: FIXTURE_URL,
      mainRepo:        repo,
      laraiumDocUrl:   laraiumHandle.url,
      onWorkerEvent:   (id, msg) => { all.callback(id, msg); changes.callback(id, msg); },
    });

    await manager.mountWiki(WIKI_ID, {
      docHandle: docHandle as never,
      coreHash:  null,
    });

    await waitForSynced(all);

    // One CRDT change — arrives via MessageChannel.
    docHandle.change((d) => { d.tiddlers["lar:///test/via-crdt"] = { title: "lar:///test/via-crdt" }; });
    await waitForEvents(changes, 1);

    const countAfterChange = changes.events.length;
    expect(countAfterChange).toBeGreaterThanOrEqual(1);

    // No further mutations: event count stays stable.
    await new Promise<void>((r) => setTimeout(r, 200));
    expect(changes.events.length).toBe(countAfterChange);
  });
});
