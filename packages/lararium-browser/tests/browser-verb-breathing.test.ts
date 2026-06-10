/**
 * browser-verb-breathing.test.ts — Path M.3 browser transport, pono rewrite.
 *
 * "A system is what it does." Browser parallel to node/m3-breathing.test.ts, but
 * scoped to the platform-honest part the browser uniquely owns: the worker↔pool
 * transport of a verb event.
 *
 *   wiki doc tiddler { verb:"MOVE", listenable:"InteractedWithEvent" }
 *     → CRDT-synced into a real Chromium Web Worker island (browser-verb-island.mjs)
 *     → island emits IslandMsg_Event{ verb, listenable, fromUri }   (stands in for
 *        the reaction-router step — that LOGIC is covered e2e by node m3-breathing)
 *     → BrowserVesselIslandPool.onWorkerEvent receives it at the vessel boundary
 *
 * Replaces the previous browser-m3-breathing.test.ts, which booted a real TW5
 * core inside the worker from a CHECKED-IN, pre-built Vite bundle. That bundle
 * went stale (frozen bytes drifting from source) and the TW5 core UMD assumes a
 * Node `global` absent in browser Workers — so it hung before `ea`. This rewrite
 * keeps the flow, drops the frozen-artifact + TW5-in-worker fragility, and uses
 * the codebase's lightweight hand-written-worker fixture pattern (sibling of
 * browser-repo-in-island-echo.mjs). No build step, no checked-in bundle.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-verb-breathing
 */

import { describe, test, expect } from "vitest";
import { Repo }                    from "@automerge/automerge-repo";
import { mutableLarRecord } from "@lararium/mesh";
import type { LarDoc, IslandMsg_Event, LarTiddlerRecord } from "@lararium/mesh";
import {
  findVerbBreathingEvent, assertVerbBreathingEvent,
  type VerbBreathingContract,
} from "@lararium/mesh";
import { BrowserVesselIslandPool }   from "../src/browser-vessel-island-pool.js";

const FIXTURE_WORKER_URL = new URL("./fixtures/browser-verb-island.mjs", import.meta.url);

const WIKI_ID    = "lar:///ha.ka.ba/@test/browser-verb-breathing";
const BUTTON_URI = "lar:///test/instances/move-button-1";

// The shared verb→event contract — the SAME battery the node real-TW5 island runs.
const CONTRACT = {
  wikiUri:    WIKI_ID,
  buttonUri:  BUTTON_URI,
  verb:       "MOVE",
  listenable: "InteractedWithEvent",
} satisfies VerbBreathingContract;

function waitFor<T>(check: () => T | null | undefined, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const result = check();
      if (result != null) { clearInterval(interval); resolve(result); return; }
      if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error(`timeout (${timeoutMs}ms) waiting for: ${label}`));
      }
    }, 50);
  });
}

describe("browser verb breathing — verb tiddler surfaces as IslandMsg_Event via the pool", () => {
  test("a verb:MOVE tiddler synced into a browser island reaches the vessel boundary", async () => {
    // ── Vessel repo + wiki doc carrying the move-button verb tiddler ──────────
    const vesselRepo = new Repo({ sharePolicy: async () => true });
    const wikiHandle = vesselRepo.create<LarDoc>();
    wikiHandle.change((d) => {
      d.tiddlers = {
        [BUTTON_URI]: mutableLarRecord(BUTTON_URI, {
          verb:       "MOVE",
          listenable: "InteractedWithEvent",
        }, "browser-verb-test") as LarTiddlerRecord,
      };
    });

    // ── Pool — captures IslandMsg_Event from the browser Worker ───────────────
    const events: IslandMsg_Event[] = [];
    const pool = new BrowserVesselIslandPool({
      workerScriptUrl: FIXTURE_WORKER_URL,
      mainRepo:        vesselRepo,
      onWorkerEvent:   (_id, msg) => events.push(msg),
    });

    try {
      // mountWiki transfers the syncPort + manifest and awaits the island's `ea`.
      await pool.mountWiki(WIKI_ID, {
        coreHash: null,
        recipe:   { wikiSlug: "test" },
        grants: { islandUrl: "automerge:fixture-lararium-url", wikiUrl: (wikiHandle as unknown as { url: string }).url },
      });

      const hit = await waitFor(
        () => findVerbBreathingEvent(events, CONTRACT),
        8_000,
        `IslandMsg_Event { verb:"MOVE", listenable:"InteractedWithEvent" } from ${WIKI_ID}`,
      );

      // Shared conformance battery — identical contract on both platforms.
      assertVerbBreathingEvent(hit, CONTRACT, (a, e, l) => expect(a, l as string).toBe(e));
    } finally {
      await pool.disposeAll();
      await vesselRepo.shutdown();
    }
  });
});
