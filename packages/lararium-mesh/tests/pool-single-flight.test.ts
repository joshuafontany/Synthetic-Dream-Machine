/**
 * pool-single-flight.test.ts — the single-owner activation latch.
 *
 * Activation-on-reference means concurrent references to ONE cold grain may race
 * into `mountWiki` together. The single-flight latch folds them into ONE
 * activation, so no stream ever spawns two sovereign workers (the single-owner
 * law; no safe epsilon). This drives the pool through a spawn-counting fake host
 * and asserts N concurrent mounts of one wikiId spawn exactly ONE worker.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/vessel-island-pool-core
 */

import { describe, test, expect } from "vitest";
import { VesselIslandPoolCore } from "../src/vessel-island-pool-core.js";
import { mkEa, mkTeardownAck } from "../src/island-protocol.js";
import type { VesselIslandHost, VesselWorkerHandle } from "../src/vessel-host.js";
import type { WikiMountSpec } from "../src/wiki-recipe.js";

const WIKI_ID = "lar:///ha.ka.ba/bags/@test/wiki";

function spec(): WikiMountSpec {
  return { coreHash: null, recipe: { wikiSlug: "test" }, grants: { islandUrl: "automerge:fixture", wikiUrl: null } };
}

/** A fake island host that counts worker spawns. Each worker answers the manifest
 *  post with a deferred `ea` (the breath the pool awaits), so a mount settles wela. */
function countingHost(): { host: VesselIslandHost; spawns: () => number } {
  let spawns = 0;
  const host: VesselIslandHost = {
    spawnWorker(): VesselWorkerHandle {
      spawns++;
      let onMsg: ((raw: unknown) => void) | null = null;
      return {
        // Answer the manifest with a deferred `ea` (mount settles wela); answer a
        // teardown with its ack (so disposeAll's handshake settles, no 10s wait).
        post: (msg: unknown) => {
          const type = (msg as { type?: string } | null)?.type;
          queueMicrotask(() => onMsg?.(type === "teardown" ? mkTeardownAck() : mkEa(WIKI_ID)));
        },
        listen: (h) => { onMsg = h; return () => { onMsg = null; }; },
        onError: () => () => {},
        terminate: () => {},
      };
    },
    newSyncChannel: () => { const { port1, port2 } = new MessageChannel(); return { mainPort: port1, syncPort: port2 }; },
    storage: () => undefined,
  };
  return { host, spawns: () => spawns };
}

describe("VesselIslandPoolCore — single-flight activation latch", () => {
  test("N concurrent mounts of one grain spawn exactly ONE worker", async () => {
    const { host, spawns } = countingHost();
    const pool = new VesselIslandPoolCore({ host });

    // Fire eight references at the same cold grain, all in one tick.
    await Promise.all(Array.from({ length: 8 }, () => pool.mountWiki(WIKI_ID, spec())));

    expect(spawns()).toBe(1);       // one sovereign body per stream, never eight
    expect(pool.tier(WIKI_ID)).toBe("wela");
    expect(pool.stats()).toEqual({ pinned: 0, wela: 1, anu: 0 });

    await pool.disposeAll();
  });

  test("a fresh reference after settle re-uses the live slot, still one worker", async () => {
    const { host, spawns } = countingHost();
    const pool = new VesselIslandPoolCore({ host });

    await pool.mountWiki(WIKI_ID, spec());
    await pool.mountWiki(WIKI_ID, spec());   // already wela → no-op, no second spawn

    expect(spawns()).toBe(1);
    await pool.disposeAll();
  });
});

describe("VesselIslandPoolCore — activation-on-reference (ensureWiki)", () => {
  test("ensureWiki re-mounts a cold grain from its retained spec", async () => {
    const { host, spawns } = countingHost();
    const pool = new VesselIslandPoolCore({ host });

    await pool.mountWiki(WIKI_ID, spec());
    expect(pool.tier(WIKI_ID)).toBe("wela");

    await pool.unmountWiki(WIKI_ID);          // cold — worker gone, spec retained
    expect(pool.tier(WIKI_ID)).toBe("anu");

    // A REFERENCE reactivates it — no spec passed; the grain identity outlived the body.
    const live = await pool.ensureWiki(WIKI_ID);
    expect(live).toBe(true);
    expect(pool.tier(WIKI_ID)).toBe("wela");
    expect(spawns()).toBe(2);                 // one original + one reactivation

    await pool.disposeAll();
  });

  test("ensureWiki on a never-mounted grain returns false (caller resolves the spec)", async () => {
    const { host } = countingHost();
    const pool = new VesselIslandPoolCore({ host });

    expect(await pool.ensureWiki("lar:///wiki/unknown")).toBe(false);
    await pool.disposeAll();
  });

  test("concurrent ensureWiki on a cold grain still spawns exactly one worker", async () => {
    const { host, spawns } = countingHost();
    const pool = new VesselIslandPoolCore({ host });

    await pool.mountWiki(WIKI_ID, spec());
    await pool.unmountWiki(WIKI_ID);
    const spawnsAfterFirst = spawns();

    await Promise.all(Array.from({ length: 6 }, () => pool.ensureWiki(WIKI_ID)));
    expect(pool.tier(WIKI_ID)).toBe("wela");
    expect(spawns() - spawnsAfterFirst).toBe(1);   // single-flight holds through ensureWiki

    await pool.disposeAll();
  });
});
