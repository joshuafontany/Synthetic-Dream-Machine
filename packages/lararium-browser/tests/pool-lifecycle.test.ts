/**
 * pool-lifecycle.test.ts — BrowserVesselIslandPool lifecycle contract.
 *
 * Proves the pono pool API: mountWiki / unmountWiki / disposeAll / has / inspect / size.
 * Uses the repo-in-island echo fixture — no TW5 boot required.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/pool-lifecycle
 */

import { describe, test, expect, afterEach } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import { BrowserVesselIslandPool } from "../src/browser-vessel-island-pool.js";

const FIXTURE_URL = new URL("./fixtures/browser-repo-in-island-echo.mjs", import.meta.url);

const WIKI_A = "lar:///ha.ka.ba/@test/pool-lifecycle/a";
const WIKI_B = "lar:///ha.ka.ba/@test/pool-lifecycle/b";

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
      bagBindings: [{ bagId: "@test", writable: true, mode: "relational", docUrl: "" }],
    });

    expect(pool.has(WIKI_A)).toBe(true);
    expect(pool.size).toBe(1);
  });

  test("mountWiki is idempotent — second call for same id is a no-op", async () => {
    repo = new Repo({ sharePolicy: async () => true });
    pool = new BrowserVesselIslandPool({ workerScriptUrl: FIXTURE_URL, mainRepo: repo });

    await pool.mountWiki(WIKI_A, {
      coreHash:    null,
      bagBindings: [{ bagId: "@test", writable: true, mode: "relational", docUrl: "" }],
    });
    await pool.mountWiki(WIKI_A, {
      coreHash:    null,
      bagBindings: [{ bagId: "@test", writable: true, mode: "relational", docUrl: "" }],
    });

    expect(pool.size).toBe(1);
  });

  test("multiple islands mount independently", async () => {
    repo = new Repo({ sharePolicy: async () => true });
    pool = new BrowserVesselIslandPool({ workerScriptUrl: FIXTURE_URL, mainRepo: repo });

    await Promise.all([
      pool.mountWiki(WIKI_A, { coreHash: null, bagBindings: [] }),
      pool.mountWiki(WIKI_B, { coreHash: null, bagBindings: [] }),
    ]);

    expect(pool.has(WIKI_A)).toBe(true);
    expect(pool.has(WIKI_B)).toBe(true);
    expect(pool.size).toBe(2);

    const phases = pool.inspect().map((s) => s.phase);
    expect(phases).toEqual(["live", "live"]);
  });

  test("unmountWiki removes island; has() reflects it", async () => {
    repo = new Repo({ sharePolicy: async () => true });
    pool = new BrowserVesselIslandPool({ workerScriptUrl: FIXTURE_URL, mainRepo: repo });

    await pool.mountWiki(WIKI_A, { coreHash: null, bagBindings: [] });
    expect(pool.has(WIKI_A)).toBe(true);

    await pool.unmountWiki(WIKI_A);
    expect(pool.has(WIKI_A)).toBe(false);
    expect(pool.size).toBe(0);
  });

  test("unmountWiki on unknown id is a no-op", async () => {
    repo = new Repo({ sharePolicy: async () => true });
    pool = new BrowserVesselIslandPool({ workerScriptUrl: FIXTURE_URL });

    await expect(pool.unmountWiki("lar:///ha.ka.ba/@test/nonexistent")).resolves.toBeUndefined();
  });

  test("disposeAll removes all islands", async () => {
    repo = new Repo({ sharePolicy: async () => true });
    pool = new BrowserVesselIslandPool({ workerScriptUrl: FIXTURE_URL, mainRepo: repo });

    await Promise.all([
      pool.mountWiki(WIKI_A, { coreHash: null, bagBindings: [] }),
      pool.mountWiki(WIKI_B, { coreHash: null, bagBindings: [] }),
    ]);
    expect(pool.size).toBe(2);

    await pool.disposeAll();
    expect(pool.size).toBe(0);
    expect(pool.has(WIKI_A)).toBe(false);
    expect(pool.has(WIKI_B)).toBe(false);
  });

  test("inspect reports id and phase for each live island", async () => {
    repo = new Repo({ sharePolicy: async () => true });
    pool = new BrowserVesselIslandPool({ workerScriptUrl: FIXTURE_URL, mainRepo: repo });

    await pool.mountWiki(WIKI_A, { coreHash: null, bagBindings: [] });

    const snapshot = pool.inspect();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].id).toBe(WIKI_A);
    expect(snapshot[0].phase).toBe("live");
  });
});
