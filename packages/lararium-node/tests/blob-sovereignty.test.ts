/**
 * blob-sovereignty.test.ts — §6 pono federation gate.
 *
 * Proves: a wiki island reads TW5 core bytes from `LarDoc.blobs[ENGINE_CORE_ID]`
 * on the @lararium CRDT doc, boots TW5, and declares `ea` — without receiving
 * raw bytes in the manifest.
 *
 * Gate condition: island ea fires ↔ bytes traveled via CRDT, not manifest.
 * If the @lararium binding is absent or the blob is missing, the island posts
 * fault and ea never fires (pool times out → test fails).
 *
 * Uses the real compiled node-wiki-island.js entry (not a fixture).
 * Requires: pnpm --filter @lararium/node build (dist/src/node-wiki-island.js present).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/blob-sovereignty
 */

import { describe, test, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Repo } from "@automerge/automerge-repo";
import { automergeLoad, ENGINE_CORE_ID, LARARIUM_BAG } from "@lararium/mesh";
import type { LarDoc } from "@lararium/mesh";
import { VesselIslandPool } from "../src/vessel-island-pool.js";

const __dir       = dirname(fileURLToPath(import.meta.url));
const GENESIS_BIN = join(__dir, "../genesis/island.bin");
const ISLAND_JS   = new URL("../dist/src/node-wiki-island.js", import.meta.url);

const WIKI_ID = "lar:///ha.ka.ba/@test/blob-sovereignty-wiki";
const TIMEOUT = 30_000;

// Skip the entire suite when build artifacts are absent rather than silently
// passing mid-test. A skip in CI is visible; a silent return is not.
const missingGenesis = !existsSync(GENESIS_BIN);
const missingIsland  = !existsSync(fileURLToPath(ISLAND_JS));
const skipReason =
  missingGenesis ? "genesis/island.bin absent — run: pnpm --filter @lararium/node build:genesis" :
  missingIsland  ? "dist/src/node-wiki-island.js absent — run: pnpm --filter @lararium/node build" :
  false;

describe.skipIf(skipReason)(`§6 blob sovereignty — island reads coreBlob from @lararium CRDT${skipReason ? ` [SKIPPED: ${skipReason}]` : ""}`, () => {
  test("island boots TW5 and declares ea from CRDT-sourced bytes", async () => {

    // Load the genesis LarDoc — carries blobs[ENGINE_CORE_ID] + plugin blobs.
    const genesisBytes    = new Uint8Array(readFileSync(GENESIS_BIN));
    const genesisDoc = automergeLoad<LarDoc>(genesisBytes);
    const coreHash   = (genesisDoc.blobs?.[ENGINE_CORE_ID]?.sha256 as string | undefined) ?? null;
    expect(genesisDoc.blobs?.[ENGINE_CORE_ID]?.blob).toBeTruthy();

    // Seed a vessel Repo by importing the full genesis artifact.
    // repo.import() loads the existing Automerge doc (with blobs intact) into the local Repo.
    // The island syncs it via MessageChannel and reads blobs[ENGINE_CORE_ID] from its own copy.
    const vesselRepo = new Repo({ sharePolicy: async () => true });
    const laraiumHandle = vesselRepo.import<LarDoc>(genesisBytes);

    // Minimal empty wiki doc — island only needs @lararium for TW5 boot.
    const wikiHandle = vesselRepo.create<LarDoc>();
    wikiHandle.change((d) => {
      (d as unknown as Record<string, unknown>)["tiddlers"] = {};
    });

    const pool = new VesselIslandPool({
      workerScriptUrl: ISLAND_JS,
      mainRepo:        vesselRepo,
    });

    try {
      // mountWiki awaits ea. Timeout → island failed to resolve bytes from CRDT.
      await pool.mountWiki(WIKI_ID, {
        coreHash,
        recipe:   { wikiSlug: "test" },
        grants:   { islandUrl: laraiumHandle.url, wikiUrl: wikiHandle.url },
      });

      expect(pool.tier(WIKI_ID)).toBe("wela");
    } finally {
      await pool.disposeAll();
      await vesselRepo.shutdown();
    }
  }, TIMEOUT);
});
