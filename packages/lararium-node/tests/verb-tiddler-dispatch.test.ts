/**
 * verb-tiddler-dispatch.test.ts — M.3 full-TW5-boot verb dispatch gate.
 *
 * Proves the complete path:
 *   tiddler with `verb` field arrives in island wiki (via CRDT sync)
 *   → reaction-router nalu fires → reads tiddler.fields["verb"]
 *   → tm-verse-event { verb, listenable, fromUri }
 *   → island-kernel posts IslandMsg_Event with payload.verb
 *   → vessel onWorkerEvent receives verb
 *
 * Uses the real compiled node-wiki-island.js + genesis blob.
 * Requires: pnpm --filter @lararium/node build and build:genesis.
 *
 * Meme: lar:///ha.ka.ba/@lararium/node/verb-tiddler-dispatch
 */

import { describe, test, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Repo } from "@automerge/automerge-repo";
import { automergeLoad, ENGINE_CORE_ID, LARARIUM_BAG } from "@lararium/mesh";
import type { LarDoc, IslandMsg_Event } from "@lararium/mesh";
import { VesselIslandPool } from "../src/vessel-island-pool.js";
import { setupCasFromGenesis } from "./cas-test-setup.js";

// ---------------------------------------------------------------------------
// Build artifact guards
// ---------------------------------------------------------------------------

const __dir       = dirname(fileURLToPath(import.meta.url));
const GENESIS_BIN = join(__dir, "../../../genesis/island.bin");
const ISLAND_JS   = new URL("../dist/src/node-wiki-island.js", import.meta.url);

const missingGenesis = !existsSync(GENESIS_BIN);
const missingIsland  = !existsSync(fileURLToPath(ISLAND_JS));
const skipReason =
  missingGenesis ? "genesis/island.bin absent — run: pnpm --filter @lararium/node build:genesis" :
  missingIsland  ? "dist/src/node-wiki-island.js absent — run: pnpm --filter @lararium/node build" :
  false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WIKI_ID = "lar:///ha.ka.ba/@test/verb-tiddler-dispatch";
const TIMEOUT = 30_000;

function waitFor<T>(
  check: () => T | null | undefined,
  timeoutMs = 5000,
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
    }, 50);
  });
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe.skipIf(skipReason)(
  `M.3 verb-tiddler-dispatch — full TW5 boot${skipReason ? ` [SKIPPED: ${skipReason}]` : ""}`,
  () => {

  test(
    "tiddler with verb field triggers IslandMsg_Event with payload.verb via reaction-router",
    async () => {
      const genesisBytes  = new Uint8Array(readFileSync(GENESIS_BIN));
      const genesisDoc    = automergeLoad<LarDoc>(genesisBytes);
      const coreHash      = (genesisDoc.blobs?.[ENGINE_CORE_ID]?.sha256 as string | undefined) ?? null;

      const vesselRepo    = new Repo({ sharePolicy: async () => true });
      const laraiumHandle = vesselRepo.import<LarDoc>(genesisBytes);
      const wikiHandle    = vesselRepo.create<LarDoc>();
      wikiHandle.change((d) => {
        (d as unknown as Record<string, unknown>)["tiddlers"] = {};
      });

      const events: IslandMsg_Event[] = [];
      const cas = setupCasFromGenesis(genesisDoc);

      const pool = new VesselIslandPool({
        workerScriptUrl: ISLAND_JS,
        mainRepo:        vesselRepo,
        storageRoot:     cas.storageDir,
        ...(cas.pluginCids.length ? { pluginCids: cas.pluginCids } : {}),
        onWorkerEvent:   (_id, msg) => { console.log("[test] onWorkerEvent:", JSON.stringify(msg)); events.push(msg); },
      });

      try {
        // Boot island — waits for ea (TW5 live, Repo synced).
        // Pass the fresh plugin tiddler so reaction-router.ts runs with current code,
        // not the version baked into genesis/island.bin.
        await pool.mountWiki(WIKI_ID, {
          coreHash,
          recipe:   { wikiSlug: "test" },
          grants:   { islandUrl: laraiumHandle.url, wikiUrl: wikiHandle.url },
        });
        expect(pool.tier(WIKI_ID)).toBe("wela");

        // Write a tiddler with `verb` and `listenable` fields to the wiki CRDT doc.
        // CRDT sync propagates to island → IslandAdaptor → wiki.addTiddler → nalu fires
        // → reaction-router reads fields["verb"] → tm-verse-event → IslandMsg_Event.
        const DEVICE_URI = "lar:///test/devices/move-button-1";
        wikiHandle.change((d) => {
          const tiddlers = (d as unknown as Record<string, unknown>)["tiddlers"] as
            Record<string, unknown>;
          // CRDT record format: { tiddler: { ...fields } } where title = key (not nested).
          // The nalu engine restores title from change.title when applying to the wiki.
          tiddlers[DEVICE_URI] = {
            tiddler: {
              verb:       "MOVE",
              listenable: "InteractedWithEvent",
              text:       "test device tiddler",
              tags:       "",
            },
          };
        });

        // Wait for the verb event to arrive via onWorkerEvent.
        const ev = await waitFor(
          () => events.find((e) => e.payload["verb"] === "MOVE"),
          8000,
          "IslandMsg_Event with payload.verb=MOVE",
        );

        expect(ev.listenable).toBe("InteractedWithEvent");
        expect(ev.payload["verb"]).toBe("MOVE");
        expect(ev.payload["fromUri"]).toBe(DEVICE_URI);
        expect(ev.payload["uri"]).toBe(DEVICE_URI);
        expect(ev.wikiUri).toBe(WIKI_ID);

      } finally {
        await pool.disposeAll();
        await vesselRepo.shutdown();
        cas.cleanup();
      }
    },
    TIMEOUT,
  );

  test(
    "tiddler without verb field fires no verb event (observation-only)",
    async () => {
      const genesisBytes  = new Uint8Array(readFileSync(GENESIS_BIN));
      const genesisDoc    = automergeLoad<LarDoc>(genesisBytes);
      const coreHash      = (genesisDoc.blobs?.[ENGINE_CORE_ID]?.sha256 as string | undefined) ?? null;

      const vesselRepo    = new Repo({ sharePolicy: async () => true });
      const laraiumHandle = vesselRepo.import<LarDoc>(genesisBytes);
      const wikiHandle    = vesselRepo.create<LarDoc>();
      wikiHandle.change((d) => {
        (d as unknown as Record<string, unknown>)["tiddlers"] = {};
      });

      const verbEvents: IslandMsg_Event[] = [];
      const cas = setupCasFromGenesis(genesisDoc);

      const pool = new VesselIslandPool({
        workerScriptUrl: ISLAND_JS,
        mainRepo:        vesselRepo,
        storageRoot:     cas.storageDir,
        ...(cas.pluginCids.length ? { pluginCids: cas.pluginCids } : {}),
        onWorkerEvent:   (_id, msg) => {
          if (msg.payload["verb"]) verbEvents.push(msg);
        },
      });

      try {
        await pool.mountWiki(WIKI_ID + "-obs", {
          coreHash,
          recipe:   { wikiSlug: "test" },
          grants:   { islandUrl: laraiumHandle.url, wikiUrl: wikiHandle.url },
        });

        // Write a tiddler WITHOUT a verb field — should not trigger verb dispatch.
        wikiHandle.change((d) => {
          const tiddlers = (d as unknown as Record<string, unknown>)["tiddlers"] as
            Record<string, unknown>;
          tiddlers["lar:///test/devices/observation-only-1"] = {
            title: "lar:///test/devices/observation-only-1",
            text:  "no verb here",
            tags:  "",
          };
        });

        // Give the island time to process (if a verb event were to fire, it would
        // arrive within ~1 s). Asserting silence after a wait window.
        await new Promise((resolve) => setTimeout(resolve, 1500));

        expect(verbEvents).toHaveLength(0);

      } finally {
        await pool.disposeAll();
        await vesselRepo.shutdown();
        cas.cleanup();
      }
    },
    TIMEOUT,
  );
},
);
