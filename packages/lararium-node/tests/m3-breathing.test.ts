/**
 * m3-breathing.test.ts — Path M.3: breathing gate.
 *
 * "A system is what it does."
 *
 * Proves the full nalu pipeline end-to-end without fixture injection:
 *
 *   wiki doc tiddler { verb: "promote", listenable: "InteractedWithEvent" }
 *     → seeded into real TW5 island via CRDT bagBinding
 *     → reaction-router.ts startup module (TW5 change event)
 *     → fireReactionsForUri → wiki.dispatchEvent("tm-verse-event", { verb, listenable, fromUri })
 *     → IslandKernel.onVerseEvent consumer
 *     → IslandMsg_Event { verb: "promote", listenable: "InteractedWithEvent", fromUri }
 *     → vessel VesselIslandPool.onWorkerEvent
 *
 * Uses the real compiled lar-wiki-island.js + genesis/island.bin.
 * Failures are pono alignment intent vectors — they name the exact broken link
 * in the pipeline above.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/m3-breathing
 */

import { describe, test, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Repo } from "@automerge/automerge-repo";
import {
  automergeLoad,
  ENGINE_CORE_ID,
  mutableLarRecord,
} from "@lararium/mesh";
import type { LarDoc, IslandMsg_Event } from "@lararium/mesh";
import { VesselIslandPool } from "../src/vessel-island-pool.js";

// ── Artifact gates ─────────────────────────────────────────────────────────

const __dir       = dirname(fileURLToPath(import.meta.url));
const GENESIS_BIN = join(__dir, "../genesis/island.bin");
const ISLAND_JS   = new URL("../dist/src/lar-wiki-island.js", import.meta.url);

const missingGenesis = !existsSync(GENESIS_BIN);
const missingIsland  = !existsSync(fileURLToPath(ISLAND_JS));
const skipReason =
  missingGenesis ? "genesis/island.bin absent — run: pnpm --filter @lararium/node build:genesis" :
  missingIsland  ? "dist/src/lar-wiki-island.js absent — run: pnpm --filter @lararium/node build"  :
  false;

// ── Helpers ────────────────────────────────────────────────────────────────

/** Poll until predicate passes or timeout. Returns the matched value. */
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

const WIKI_ID    = "lar:///ha.ka.ba/@test/m3-breathing";
const BUTTON_URI = "lar:///test/instances/promote-button-1";
const TIMEOUT    = 30_000;

// ── Suite ──────────────────────────────────────────────────────────────────

describe.skipIf(skipReason)(
  `M.3 breathing gate — promote-button nalu end-to-end${skipReason ? ` [SKIPPED: ${skipReason}]` : ""}`,
  () => {
    test(
      "wiki tiddler verb:promote fires IslandMsg_Event via real TW5 reaction-router — no fixture injection",
      async () => {
        // ── Load genesis ──────────────────────────────────────────────────
        const genesisBytes = new Uint8Array(readFileSync(GENESIS_BIN));
        const genesisDoc   = automergeLoad<LarDoc>(genesisBytes);
        const coreHash     = (genesisDoc.blobs?.[ENGINE_CORE_ID]?.sha256 as string | undefined) ?? null;

        expect(coreHash, "genesis must carry ENGINE_CORE_ID coreHash").not.toBeNull();

        // ── Vessel repo — imports genesis so island can sync @lararium ────
        const vesselRepo    = new Repo({ sharePolicy: async () => true });
        const laraiumHandle = vesselRepo.import<LarDoc>(genesisBytes);

        // ── Wiki doc — carries the promote-button instance tiddler ────────
        // verb + listenable fields are the exact contract fireReactionsForUri reads.
        // No papalohe edge wiring needed — direct field dispatch (M.2 architecture).
        const wikiHandle = vesselRepo.create<LarDoc>();
        wikiHandle.change((d) => {
          (d as unknown as Record<string, unknown>)["tiddlers"] = {
            [BUTTON_URI]: mutableLarRecord(BUTTON_URI, {
              verb:       "promote",
              listenable: "InteractedWithEvent",
            }, "m3-test"),
          };
        });

        // ── Pool — captures IslandMsg_Event from island ───────────────────
        const events: IslandMsg_Event[] = [];

        const pool = new VesselIslandPool({
          workerScriptUrl: ISLAND_JS,
          mainRepo:        vesselRepo,
          laraiumDocUrl:   laraiumHandle.url,
          onWorkerEvent:   (_id, msg) => events.push(msg),
        });

        try {
          // mountWiki awaits ea — island has booted TW5, seeded wiki, declared sovereignty.
          await pool.mountWiki(WIKI_ID, {
            docHandle: wikiHandle,
            coreHash,
          });

          // ── Gate — verb event arrives at vessel boundary ───────────────
          // The reaction-router fires on the seed tiddler via the TW5 "change" nalu.
          // The drain loop then carries it to IslandMsg_Event after ea.
          const hit = await waitFor(
            () => events.find(
              (e) => typeof e.payload["verb"] === "string" &&
                     e.payload["verb"]       === "promote" &&
                     e.listenable            === "InteractedWithEvent",
            ),
            5_000,
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
  },
);
