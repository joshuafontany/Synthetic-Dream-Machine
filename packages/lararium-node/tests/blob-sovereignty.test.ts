/**
 * blob-sovereignty.test.ts — §6 pono federation gate.
 *
 * Proves: a wiki island pulls the TW5 core + plugin bytes by CID from the local
 * CAS (the CID plane), boots TW5, and declares `ea` — without receiving raw bytes
 * over the sync port and without reading them from a CRDT doc.
 *
 * Gate condition: island ea fires ↔ the CID plane served the engine. With no CAS
 * (no resolver / a miss), the island posts fault and ea never fires (pool times
 * out → test fails).
 *
 * Uses the real compiled node-wiki-island.js entry (not a fixture).
 * Requires: pnpm --filter @lararium/node build (dist/src/node-wiki-island.js present).
 *
 * Meme: lar:///ha.ka.ba/lararium/node/blob-sovereignty
 */

import { describe, test, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Repo } from "@automerge/automerge-repo";
import { automergeLoad, ENGINE_CORE_ID } from "@lararium/mesh";
import type { LarDoc } from "@lararium/mesh";
import { VesselIslandPool } from "../src/vessel-island-pool.js";
import { setupCasFromGenesis } from "./cas-test-setup.js";

const __dir       = dirname(fileURLToPath(import.meta.url));
const GENESIS_BIN = join(__dir, "../../../genesis/island.bin");
const ISLAND_JS   = new URL("../dist/src/node-wiki-island.js", import.meta.url);

const WIKI_ID = "lar:///ha.ka.ba/bags/test/blob-sovereignty-wiki";
const TIMEOUT = 30_000;

// Skip the entire suite when build artifacts are absent rather than silently
// passing mid-test. A skip in CI is visible; a silent return is not.
const missingGenesis = !existsSync(GENESIS_BIN);
const missingIsland  = !existsSync(fileURLToPath(ISLAND_JS));
const skipReason =
  missingGenesis ? "genesis/island.bin absent — run: pnpm --filter @lararium/node build:genesis" :
  missingIsland  ? "dist/src/node-wiki-island.js absent — run: pnpm --filter @lararium/node build" :
  false;

describe.skipIf(skipReason)(`§6 blob sovereignty — island reads coreBlob from the CID plane${skipReason ? ` [SKIPPED: ${skipReason}]` : ""}`, () => {
  test("island boots TW5 and declares ea from CAS-sourced bytes", async () => {

    // Load the genesis LarDoc — the CRDT carries blob METADATA only (no bytes); the
    // sha256 is the CID the worker requests from the CAS plane.
    const genesisBytes = new Uint8Array(readFileSync(GENESIS_BIN));
    const genesisDoc   = automergeLoad<LarDoc>(genesisBytes);
    const coreHash     = (genesisDoc.blobs?.[ENGINE_CORE_ID]?.sha256 as string | undefined) ?? null;
    expect(coreHash).toBeTruthy();                                   // metadata present
    expect(genesisDoc.blobs?.[ENGINE_CORE_ID]?.blob).toBeFalsy();    // bytes stripped from the CRDT

    // The CID plane: mirror the genesis CAS files (genesis/cas/<cid>, via the manifest)
    // into a local fs CAS. Each wiki island's nodefs storage is a child of cas.storageDir,
    // so the worker derives the same `<storageDir>/cas` dir and pulls engine + plugins by CID.
    const cas = setupCasFromGenesis(genesisDoc);

    // Seed a vessel Repo — the island needs the lararium doc only for its structural tiddlers;
    // the engine bytes ride the CID plane, never the doc.
    const vesselRepo    = new Repo({ sharePolicy: async () => true });
    const laraiumHandle = vesselRepo.import<LarDoc>(genesisBytes);

    const wikiHandle = vesselRepo.create<LarDoc>();
    wikiHandle.change((d) => {
      (d as unknown as Record<string, unknown>)["tiddlers"] = {};
    });

    const pool = new VesselIslandPool({
      workerScriptUrl: ISLAND_JS,
      mainRepo:        vesselRepo,
      storageRoot:     cas.storageDir,
      ...(cas.pluginCids.length ? { pluginCids: cas.pluginCids } : {}),
    });

    try {
      // mountWiki awaits ea. Timeout → island failed to resolve bytes from the CID plane.
      await pool.mountWiki(WIKI_ID, {
        coreHash,
        recipe:   { wikiSlug: "test" },
        grants:   { islandUrl: laraiumHandle.url, wikiUrl: wikiHandle.url },
      });

      expect(pool.tier(WIKI_ID)).toBe("wela");
    } finally {
      await pool.disposeAll();
      await vesselRepo.shutdown();
      cas.cleanup();
    }
  }, TIMEOUT);
});
