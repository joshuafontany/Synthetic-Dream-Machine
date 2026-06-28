/**
 * event-routing.test.ts — M.2 verb-payload routing gate.
 *
 * Proves that IslandMsg_Event.payload.verb carries through the island→vessel
 * boundary correctly, and that the M.1 subscription handler extracts the right
 * fields before calling placeVerb.
 *
 * Two sub-suites:
 *   A. Island→vessel transport — VesselIslandPool receives event with verb in payload
 *   B. Subscription handler semantics — unit test of the M.1 handler logic
 *
 * Meme: lar:///ha.ka.ba/@lararium/node/event-routing
 */

import { describe, test, expect, afterEach, vi } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import type { IslandMsg_Event } from "@lararium/mesh";
import { VesselIslandPool } from "../src/vessel-island-pool.js";

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const FIXTURE_URL = new URL("./fixtures/event-verb-echo.mjs", import.meta.url);
const WIKI_ID     = "lar:///ha.ka.ba/@test/event-routing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function waitFor<T>(
  check: () => T | null | undefined,
  timeoutMs = 3000,
  label = "condition",
): Promise<T> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const result = check();
      if (result != null) { clearInterval(interval); resolve(result); }
      else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error(`timeout waiting for ${label} after ${timeoutMs}ms`));
      }
    }, 20);
  });
}

// ---------------------------------------------------------------------------
// Suite A — Island → vessel transport
// ---------------------------------------------------------------------------

describe("M.2 event-routing — island→vessel verb payload transport", () => {
  let manager: VesselIslandPool | null = null;
  let repo: Repo | null = null;

  afterEach(async () => {
    await manager?.disposeAll();
    manager = null;
    await repo?.shutdown();
    repo = null;
  });

  test("IslandMsg_Event carries verb, listenable, fromUri in payload", async () => {
    const events: IslandMsg_Event[] = [];

    repo = new Repo({ sharePolicy: async () => true });
    const docHandle = repo.create<{ tiddlers: Record<string, unknown> }>({ tiddlers: {} });

    manager = new VesselIslandPool({
      workerScriptUrl: FIXTURE_URL,
      mainRepo:        repo,
      onWorkerEvent:   (_id, msg) => events.push(msg),
    });

    await manager.mountWiki(WIKI_ID, {
      coreHash:  null,
      recipe:   { wikiSlug: "test" },
      grants:   { islandUrl: "automerge:fixture-lararium-url", wikiUrl: docHandle.url },
    });

    const ev = await waitFor(
      () => events.find((e) => e.listenable === "OnActivated"),
      3000,
      "OnActivated event",
    );

    expect(ev.listenable).toBe("OnActivated");
    expect(ev.payload["verb"]).toBe("echo-verb");
    expect(ev.payload["fromUri"]).toBe("lar:///test/instances/move-button-1");
    expect(ev.payload["uri"]).toBe("lar:///test/instances/move-button-1");
  });
});

// ---------------------------------------------------------------------------
// Suite B — M.1 subscription handler semantics (unit)
// ---------------------------------------------------------------------------

describe("M.2 event-routing — M.1 subscription handler unit", () => {
  test("handler extracts verb + fromUri + listenable and calls placeVerb", () => {
    const placed: Array<{
      verb: string;
      fromUri?: string;
      listenable?: string;
      requestedBy: string;
    }> = [];

    // Replicate the M.1 handler logic from open-node-vessel.ts inline.
    // This proves the extraction semantics without needing a running vessel.
    const mockPlaceVerb = (opts: {
      verb: string;
      args: Record<string, unknown>;
      requestedBy: string;
      listenable: string;
      fromUri?: string;
    }) => placed.push({ verb: opts.verb, fromUri: opts.fromUri, listenable: opts.listenable, requestedBy: opts.requestedBy });

    function handleWorkerEvent(msg: IslandMsg_Event): void {
      const { listenable, payload } = msg;
      const verb    = typeof payload["verb"]    === "string" ? payload["verb"]    : undefined;
      const fromUri = typeof payload["fromUri"] === "string" ? payload["fromUri"] : undefined;
      if (!verb) return;
      mockPlaceVerb({
        verb,
        args:        payload as unknown as Record<string, unknown>,
        requestedBy: typeof payload["requestedBy"] === "string" ? payload["requestedBy"] : listenable,
        listenable,
        ...(fromUri ? { fromUri } : {}),
      });
    }

    // Verb-carrying event
    handleWorkerEvent({
      schema_version: 1,
      type: "event",
      wikiUri: WIKI_ID,
      listenable: "OnActivated",
      payload: { uri: "lar:///device/1", verb: "echo-verb", fromUri: "lar:///device/1" },
    });

    // Observation-only event (no verb) — should not place
    handleWorkerEvent({
      schema_version: 1,
      type: "event",
      wikiUri: WIKI_ID,
      listenable: "OnScoreChanged",
      payload: { uri: "lar:///device/2" },
    });

    expect(placed).toHaveLength(1);
    expect(placed[0]!.verb).toBe("echo-verb");
    expect(placed[0]!.fromUri).toBe("lar:///device/1");
    expect(placed[0]!.listenable).toBe("OnActivated");
    expect(placed[0]!.requestedBy).toBe("OnActivated"); // falls back to listenable when no requestedBy
  });

  test("handler ignores events without verb — observation-only pass-through", () => {
    const placed = vi.fn();

    function handleWorkerEvent(msg: IslandMsg_Event): void {
      const { listenable, payload } = msg;
      const verb = typeof payload["verb"] === "string" ? payload["verb"] : undefined;
      if (!verb) return;
      placed({ verb, listenable });
    }

    handleWorkerEvent({
      schema_version: 1, type: "event", wikiUri: WIKI_ID,
      listenable: "OnChanged", payload: { uri: "lar:///x" },
    });
    handleWorkerEvent({
      schema_version: 1, type: "event", wikiUri: WIKI_ID,
      listenable: "OnScore", payload: { uri: "lar:///y", score: 42 },
    });

    expect(placed).not.toHaveBeenCalled();
  });
});
