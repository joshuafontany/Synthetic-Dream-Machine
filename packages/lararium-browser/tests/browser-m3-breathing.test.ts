/**
 * browser-m3-breathing.test.ts — Path M.3 browser: breathing gate in Chromium.
 *
 * "A system is what it does." — isomorphic browser parallel to node/m3-breathing.test.ts.
 *
 * Identical pipeline, platform-honest infrastructure:
 *
 *   wiki doc tiddler { verb: "promote", listenable: "InteractedWithEvent" }
 *     → seeded into real TW5 browser island via CRDT bagBinding
 *     → reaction-router.ts startup module (TW5 "change" nalu — rAF drain)
 *     → fireReactionsForUri → wiki.dispatchEvent("tm-verse-event", { verb, listenable, fromUri })
 *     → IslandKernel.onVerseEvent consumer
 *     → IslandMsg_Event { verb: "promote", listenable: "InteractedWithEvent", fromUri }
 *     → BrowserVesselIslandPool.onWorkerEvent
 *
 * ## Platform deltas vs Node
 *   - Worker script: Vite-bundled `browser-wiki-worker-bundle.js` (bare specifiers
 *     cannot resolve in Web Workers without bundling — `dist/` TSC output is insufficient)
 *   - Genesis bytes: fetched via Vite dev server (server.fs.allow covers ../lararium-node/)
 *   - Drain loop: requestAnimationFrame (setTimeout 16ms fallback in Safari workers)
 *   - Message I/O: self.postMessage / self.addEventListener (not parentPort)
 *
 * ## Prerequisites
 *   pnpm --filter @lararium/browser run build:test-worker
 *   (produces tests/fixtures/browser-wiki-worker-bundle.js)
 *
 * Runs in Chromium via Playwright. Failures name the exact broken link.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-m3-breathing
 */

import { describe, test, expect } from "vitest";
import { Repo }                    from "@automerge/automerge-repo";
import {
  automergeLoad,
  BAG_IDS,
  ENGINE_CORE_ID,
  mutableLarRecord,
} from "@lararium/mesh";
import type { LarDoc, IslandMsg_Event } from "@lararium/mesh";
import { BrowserVesselIslandPool }      from "../src/browser-vessel-island-pool.js";

// ── Artifact gates ─────────────────────────────────────────────────────────
// Browser workers can't resolve bare workspace specifiers — we need the
// Vite-bundled worker. Fetch detects if the bundle has been built.

const WORKER_BUNDLE_URL = new URL(
  "./fixtures/browser-wiki-worker-bundle.js",
  import.meta.url,
);

const GENESIS_URL = new URL(
  // vitest.config.ts server.fs.allow covers packages/ — this resolves correctly.
  "../../lararium-node/genesis/island.bin",
  import.meta.url,
);

async function checkArtifacts(): Promise<string | false> {
  try {
    const workerResp  = await fetch(WORKER_BUNDLE_URL, { method: "HEAD" });
    if (!workerResp.ok) {
      return `browser-wiki-worker-bundle.js absent — run: pnpm --filter @lararium/browser run build:test-worker`;
    }
    const genesisResp = await fetch(GENESIS_URL, { method: "HEAD" });
    if (!genesisResp.ok) {
      return `genesis/island.bin not served — check vitest.config.ts server.fs.allow`;
    }
    return false;
  } catch {
    return "artifact fetch failed — check dev server config";
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function waitFor<T>(
  check:     () => T | null | undefined,
  timeoutMs: number,
  label:     string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const start    = Date.now();
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

// ── Constants ──────────────────────────────────────────────────────────────

const WIKI_ID    = "lar:///ha.ka.ba/@test/browser-m3-breathing";
const BUTTON_URI = "lar:///test/instances/promote-button-1";
const TIMEOUT    = 30_000;

// ── Suite ──────────────────────────────────────────────────────────────────

describe("browser M.3 breathing gate — promote-button nalu end-to-end in Chromium", () => {
  test(
    "wiki tiddler verb:promote fires IslandMsg_Event via real TW5 reaction-router — no fixture injection",
    async () => {
      // ── Artifact guard ────────────────────────────────────────────────
      const skipReason = await checkArtifacts();
      if (skipReason) {
        console.warn(`[browser-m3-breathing] SKIPPED: ${skipReason}`);
        return;
      }

      // ── Load genesis ──────────────────────────────────────────────────
      const genesisResp  = await fetch(GENESIS_URL);
      const genesisBytes = new Uint8Array(await genesisResp.arrayBuffer());
      const genesisDoc   = automergeLoad<LarDoc>(genesisBytes);
      const coreHash     = (genesisDoc.blobs?.[ENGINE_CORE_ID]?.sha256 as string | undefined) ?? null;

      expect(coreHash, "genesis must carry ENGINE_CORE_ID coreHash").not.toBeNull();

      // ── Vessel repo — imports genesis so island can sync @lararium ────
      const vesselRepo    = new Repo({ sharePolicy: async () => true });
      const laraiumHandle = vesselRepo.import<LarDoc>(genesisBytes);

      // ── Wiki doc — carries the promote-button instance tiddler ────────
      // Platform delta vs Node: none. The tiddler structure is identical.
      // The reaction-router.ts startup module runs the same code on both platforms.
      const wikiHandle = vesselRepo.create<LarDoc>();
      (wikiHandle as unknown as { change: (fn: (d: Record<string, unknown>) => void) => void })
        .change((d: Record<string, unknown>) => {
          d["tiddlers"] = {
            [BUTTON_URI]: mutableLarRecord(BUTTON_URI, {
              verb:       "promote",
              listenable: "InteractedWithEvent",
            }, "browser-m3-test"),
          };
        });

      // ── Pool — captures IslandMsg_Event from browser Worker ───────────
      const events: IslandMsg_Event[] = [];

      const pool = new BrowserVesselIslandPool({
        workerScriptUrl: WORKER_BUNDLE_URL,
        mainRepo:        vesselRepo,
        onWorkerEvent:   (_id, msg) => events.push(msg),
      });

      try {
        // mountWiki awaits ea — island has booted TW5 in a Web Worker,
        // seeded the wiki doc, declared sovereignty via self.postMessage.
        await pool.mountWiki(WIKI_ID, {
          coreHash,
          bagBindings: [
            { bagId: BAG_IDS.lararium, writable: false, mode: "relational", docUrl: laraiumHandle.url },
            { bagId: WIKI_ID,          writable: true,  mode: "relational", docUrl: (wikiHandle as unknown as { url: string }).url },
          ],
        });

        // ── Gate — verb event arrives at vessel boundary in Chromium ──
        // rAF drain: the browser island fires after the first animation frame
        // following ea. Timing is a few frames longer than Node setInterval.
        const hit = await waitFor(
          () => events.find(
            (e) => typeof e.payload["verb"] === "string" &&
                   e.payload["verb"]       === "promote" &&
                   e.listenable            === "InteractedWithEvent",
          ),
          8_000,  // slightly wider than Node — rAF after ea, not immediate
          `IslandMsg_Event { verb:"promote", listenable:"InteractedWithEvent" } from ${WIKI_ID}`,
        );

        expect(hit.type).toBe("event");
        expect(hit.wikiUri).toBe(WIKI_ID);
        expect(hit.listenable).toBe("InteractedWithEvent");
        expect(hit.payload["verb"]).toBe("promote");
        expect(hit.payload["fromUri"]).toBe(BUTTON_URI);
        expect(hit.payload["uri"]).toBe(BUTTON_URI);

      } finally {
        await pool.disposeAll();
        await vesselRepo.shutdown();
      }
    },
    TIMEOUT,
  );
});
