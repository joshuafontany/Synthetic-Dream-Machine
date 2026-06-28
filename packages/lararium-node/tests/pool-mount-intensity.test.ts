/**
 * pool-mount-intensity.test.ts — pono startup flow for pooled islands.
 *
 * OTP MaxR/MaxT discipline at the pool choke point: a failed mount cleans up
 * after itself (the spawned worker terminates, the sync port closes, the
 * failure gets recorded), and repeated failures inside the intensity window
 * fail FAST with a named cap error instead of burning another full silence
 * budget per attempt — the restart-storm guard.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/vessel-island-pool-core
 */

import { describe, test, expect, afterEach } from "vitest";
import { VesselIslandPool } from "../src/vessel-island-pool.js";
import type { WikiMountSpec } from "@lararium/mesh";

const SILENT_FIXTURE_URL = new URL("./fixtures/silent-island.mjs", import.meta.url);
const ECHO_FIXTURE_URL   = new URL("./fixtures/vm-pool-echo.mjs",  import.meta.url);

const WIKI_ID = "lar:///ha.ka.ba/@test/wiki";

function spec(): WikiMountSpec {
  return { coreHash: null, recipe: { wikiSlug: "test" }, grants: { islandUrl: "automerge:fixture-lararium-url", wikiUrl: null } };
}

describe("VesselIslandPool — mount intensity cap", () => {
  let pool: VesselIslandPool | null = null;

  afterEach(async () => {
    await pool?.disposeAll();
    pool = null;
  });

  test("a silent island times out on the silence budget; repeats hit the cap fast", async () => {
    pool = new VesselIslandPool({
      workerScriptUrl:      SILENT_FIXTURE_URL,
      mountSilenceMs:       200,
      maxMountFailures:     2,
      mountFailureWindowMs: 60_000,
    });

    // Attempts 1 + 2 — each burns the silence budget and records a failure.
    await expect(pool.mountWiki(WIKI_ID, spec())).rejects.toThrow(/timeout waiting for ea/);
    await expect(pool.mountWiki(WIKI_ID, spec())).rejects.toThrow(/timeout waiting for ea/);

    // Attempt 3 — the cap rejects BEFORE spawning, far under the budget.
    const start = Date.now();
    await expect(pool.mountWiki(WIKI_ID, spec())).rejects.toThrow(/mount intensity cap/);
    expect(Date.now() - start).toBeLessThan(100);

    // The failed slot never reads hot.
    expect(pool.tier(WIKI_ID)).toBeNull();
  }, 15_000);

  test("a successful mount clears the failure history", async () => {
    pool = new VesselIslandPool({
      workerScriptUrl:      ECHO_FIXTURE_URL,
      maxMountFailures:     1,
      mountFailureWindowMs: 60_000,
    });

    await pool.mountWiki(WIKI_ID, spec());
    expect(pool.tier(WIKI_ID)).toBe("wela");
  });
});
