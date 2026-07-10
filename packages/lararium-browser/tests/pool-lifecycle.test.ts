/**
 * pool-lifecycle.test.ts — BrowserVesselIslandPool lifecycle contract.
 *
 * Proves the pono pool API: mountWiki / unmountWiki / disposeAll / has / inspect / size.
 * Uses the repo-in-island echo fixture — no TW5 boot required.
 *
 * Meme: lar:///ha.ka.ba/lararium/browser/pool-lifecycle
 */

import { describe, test, expect, afterEach } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import { BrowserVesselIslandPool } from "../src/browser-vessel-island-pool.js";

const FIXTURE_URL = new URL("./fixtures/browser-repo-in-island-echo.mjs", import.meta.url);

const WIKI_A = "lar:///ha.ka.ba/bags/@test/pool-lifecycle/a";
const WIKI_B = "lar:///ha.ka.ba/bags/@test/pool-lifecycle/b";

describe("BrowserVesselIslandPool lifecycle contract", () => {
  let pool: BrowserVesselIslandPool | null = null;
  let repo: Repo | null = null;

  afterEach(async () => {
    await pool?.disposeAll();
    pool = null;
    await repo?.shutdown();
    repo = null;
  });

  test("mountWiki registers island; has() and size reflect it", async () => {
    repo = new Repo({ sharePolicy: async () => true });
    pool = new BrowserVesselIslandPool({ workerScriptUrl: FIXTURE_URL, mainRepo: repo });

    expect(pool.has(WIKI_A)).toBe(false);
    expect(pool.size).toBe(0);

    await pool.mountWiki(WIKI_A, {
      coreHash:    null,
      recipe: { wikiSlug: "test" }, grants: { islandUrl: "automerge:fixture-lararium-url" },
    });

    expect(pool.has(WIKI_A)).toBe(true);
    expect(pool.size).toBe(1);
  });

  test("mountWiki is idempotent — second call for same id is a no-op", async () => {
    repo = new Repo({ sharePolicy: async () => true });
    pool = new BrowserVesselIslandPool({ workerScriptUrl: FIXTURE_URL, mainRepo: repo });

    await pool.mountWiki(WIKI_A, {
      coreHash:    null,
      recipe: { wikiSlug: "test" }, grants: { islandUrl: "automerge:fixture-lararium-url" },
    });
    await pool.mountWiki(WIKI_A, {
      coreHash:    null,
      recipe: { wikiSlug: "test" }, grants: { islandUrl: "automerge:fixture-lararium-url" },
    });

    expect(pool.size).toBe(1);
  });

  test("multiple islands mount independently", async () => {
    repo = new Repo({ sharePolicy: async () => true });
    pool = new BrowserVesselIslandPool({ workerScriptUrl: FIXTURE_URL, mainRepo: repo });

    await Promise.all([
      pool.mountWiki(WIKI_A, { coreHash: null, recipe: { wikiSlug: "test" }, grants: { islandUrl: "automerge:fixture-lararium-url" } }),
      pool.mountWiki(WIKI_B, { coreHash: null, recipe: { wikiSlug: "test" }, grants: { islandUrl: "automerge:fixture-lararium-url" } }),
    ]);

    expect(pool.has(WIKI_A)).toBe(true);
    expect(pool.has(WIKI_B)).toBe(true);
    expect(pool.size).toBe(2);

    const temps = pool.inspect().map((s) => s.temperature);
    expect(temps).toEqual(["wela", "wela"]);
  });

  test("unmountWiki takes island cold (anu); has() reflects it", async () => {
    repo = new Repo({ sharePolicy: async () => true });
    pool = new BrowserVesselIslandPool({ workerScriptUrl: FIXTURE_URL, mainRepo: repo });

    await pool.mountWiki(WIKI_A, { coreHash: null, recipe: { wikiSlug: "test" }, grants: { islandUrl: "automerge:fixture-lararium-url" } });
    expect(pool.has(WIKI_A)).toBe(true);

    await pool.unmountWiki(WIKI_A);
    // Unified residency: explicit unmount leaves a cold (anu) slot recorded —
    // no longer live (has=false), but remembered (tier=anu, coldSince set).
    expect(pool.has(WIKI_A)).toBe(false);
    expect(pool.tier(WIKI_A)).toBe("anu");
    expect(pool.coldSince(WIKI_A)).not.toBeNull();
  });

  test("unmountWiki on unknown id is a no-op", async () => {
    repo = new Repo({ sharePolicy: async () => true });
    pool = new BrowserVesselIslandPool({ workerScriptUrl: FIXTURE_URL });

    await expect(pool.unmountWiki("lar:///ha.ka.ba/bags/@test/nonexistent")).resolves.toBeUndefined();
  });

  test("disposeAll removes all islands", async () => {
    repo = new Repo({ sharePolicy: async () => true });
    pool = new BrowserVesselIslandPool({ workerScriptUrl: FIXTURE_URL, mainRepo: repo });

    await Promise.all([
      pool.mountWiki(WIKI_A, { coreHash: null, recipe: { wikiSlug: "test" }, grants: { islandUrl: "automerge:fixture-lararium-url" } }),
      pool.mountWiki(WIKI_B, { coreHash: null, recipe: { wikiSlug: "test" }, grants: { islandUrl: "automerge:fixture-lararium-url" } }),
    ]);
    expect(pool.size).toBe(2);

    await pool.disposeAll();
    expect(pool.size).toBe(0);
    expect(pool.has(WIKI_A)).toBe(false);
    expect(pool.has(WIKI_B)).toBe(false);
  });

  test("inspect reports wikiId and temperature for each island", async () => {
    repo = new Repo({ sharePolicy: async () => true });
    pool = new BrowserVesselIslandPool({ workerScriptUrl: FIXTURE_URL, mainRepo: repo });

    await pool.mountWiki(WIKI_A, { coreHash: null, recipe: { wikiSlug: "test" }, grants: { islandUrl: "automerge:fixture-lararium-url" } });

    const snapshot = pool.inspect();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].wikiId).toBe(WIKI_A);
    expect(snapshot[0].temperature).toBe("wela");
  });
});
