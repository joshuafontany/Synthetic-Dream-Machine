/**
 * wiki-activation.test.ts — the activation-on-reference CAP over the ONE collector.
 *
 * Wires makeWikiActivationCap the way a vessel does: a real BagStowage
 * (per-grain-type dials) driving a real VesselIslandPoolCore through onHydrate
 * (→ ensureWiki) / onEvict (→ unmountWiki). Proves the whole F2+F3 loop — a
 * reference reactivates a cold KNOWN grain; a never-opened grain refuses without
 * stranding a phantom resident; the collector drives eviction, not the pool.
 */

import { describe, test, expect } from "vitest";
import { VesselIslandPoolCore } from "../src/vessel-island-pool-core.js";
import { BagStowage } from "../src/bag-residency.js";
import { makeWikiActivationCap } from "../src/wiki-activation.js";
import { mkEa, mkTeardownAck } from "../src/island-protocol.js";
import type { VesselIslandHost, VesselWorkerHandle } from "../src/vessel-host.js";
import type { WikiMountSpec } from "../src/wiki-recipe.js";

const W1 = "lar:///wiki/one", W2 = "lar:///wiki/two";
function spec(): WikiMountSpec {
  return { coreHash: null, recipe: { wikiSlug: "t" }, grants: { islandUrl: "automerge:x", wikiUrl: null } };
}

function countingHost(): { host: VesselIslandHost; spawns: () => number } {
  let spawns = 0;
  const host: VesselIslandHost = {
    spawnWorker(): VesselWorkerHandle {
      spawns++;
      let on: ((raw: unknown) => void) | null = null;
      return {
        post: (msg: unknown) => {
          const type = (msg as { type?: string } | null)?.type;
          queueMicrotask(() => on?.(type === "teardown" ? mkTeardownAck() : mkEa(W1)));
        },
        listen: (h) => { on = h; return () => { on = null; }; },
        onError: () => () => {},
        terminate: () => {},
      };
    },
    newSyncChannel: () => { const { port1, port2 } = new MessageChannel(); return { mainPort: port1, syncPort: port2 }; },
    storage: () => undefined,
  };
  return { host, spawns: () => spawns };
}

/** Wire the pool + collector + cap exactly as a vessel does. */
function makeVesselTrio(wikiCap: number, resolveSpec?: (id: string) => Promise<WikiMountSpec | null>) {
  const { host, spawns } = countingHost();
  const pool = new VesselIslandPoolCore({ host });
  const residency = new BagStowage({
    typeCaps: { wiki: wikiCap },
    onHydrate: async (id, t) => { if (t === "wiki") await pool.ensureWiki(id); },
    onEvict:   async (id, t) => { if (t === "wiki") await pool.unmountWiki(id); },
  });
  const cap = makeWikiActivationCap(residency, pool, { activationCap: wikiCap, pinBudget: 1 }, resolveSpec);
  return { pool, residency, cap, spawns };
}

describe("wiki-activation cap — activation-on-reference over the one collector", () => {
  test("a never-opened grain refuses without stranding a phantom resident", async () => {
    const { residency, cap } = makeVesselTrio(2);
    expect(await cap.ensureActive("lar:///wiki/never")).toBe(false);
    expect(residency.tier("lar:///wiki/never")).toBeNull();   // no phantom wela in the collector
  });

  test("a NEVER-opened grain resolves its spec and activates (the true multi-wiki swap)", async () => {
    const W3 = "lar:///wiki/three";
    let resolvedFor = "";
    // The resolver knows W3 (a wiki the pool never mounted) but not others.
    const resolveSpec = async (id: string): Promise<WikiMountSpec | null> => {
      if (id !== W3) return null;
      resolvedFor = id;
      return spec();
    };
    const { pool, residency, cap, spawns } = makeVesselTrio(2, resolveSpec);

    // A bare reference to a never-opened wiki: resolveSpec → registerSpec → touch → mount.
    expect(pool.knowsSpec(W3)).toBe(false);
    expect(await cap.ensureActive(W3)).toBe(true);
    expect(resolvedFor).toBe(W3);
    expect(pool.tier(W3)).toBe("wela");
    expect(residency.tier(W3)).toBe("wela");
    expect(spawns()).toBe(1);                       // one clean activation

    // An unknown reference the resolver refuses → false, no phantom.
    expect(await cap.ensureActive("lar:///wiki/unknown")).toBe(false);
    expect(residency.tier("lar:///wiki/unknown")).toBeNull();

    await pool.disposeAll();
  });

  test("concurrent references to a never-opened grain resolve + spawn exactly ONE worker", async () => {
    const W3 = "lar:///wiki/three";
    let resolveCalls = 0;
    const resolveSpec = async (id: string): Promise<WikiMountSpec | null> => {
      resolveCalls++;
      return id === W3 ? spec() : null;
    };
    const { pool, cap, spawns } = makeVesselTrio(4, resolveSpec);

    // Fire six references at one never-opened grain in one tick — single-owner holds.
    const results = await Promise.all(Array.from({ length: 6 }, () => cap.ensureActive(W3)));
    expect(results.every((r) => r === true)).toBe(true);
    expect(pool.tier(W3)).toBe("wela");
    expect(spawns()).toBe(1);                       // never two sovereign workers for one stream

    await pool.disposeAll();
  });

  test("an already-live grain short-circuits to true", async () => {
    const { pool, cap } = makeVesselTrio(2);
    await pool.mountWiki(W1, spec());
    expect(await cap.ensureActive(W1)).toBe(true);
    await pool.disposeAll();
  });

  test("a reference reactivates a cold KNOWN grain (the full loop)", async () => {
    const { pool, residency, cap, spawns } = makeVesselTrio(2);

    // Boot the grain the vessel way: mount (pool retains spec) + register in the collector.
    await pool.mountWiki(W1, spec());
    await residency.touch(W1, "wiki");
    expect(spawns()).toBe(1);

    // Cool THROUGH the collector — onEvict unmounts the pool; both agree it is anu.
    await residency.cool(W1);
    expect(pool.tier(W1)).toBe("anu");
    expect(residency.tier(W1)).toBe("anu");

    // A REFERENCE reactivates it: ensureActive → collector.touch → onHydrate → ensureWiki.
    expect(await cap.ensureActive(W1)).toBe(true);
    expect(pool.tier(W1)).toBe("wela");
    expect(residency.tier(W1)).toBe("wela");
    expect(spawns()).toBe(2);   // one original + one reactivation, never a double-spawn

    await pool.disposeAll();
  });

  test("the collector drives eviction at the wiki cap, pool no longer self-bounds", async () => {
    const { pool, residency, cap } = makeVesselTrio(1);   // wiki cap 1
    await pool.mountWiki(W1, spec());
    await residency.touch(W1, "wiki");                    // collector: W1 wela (1/1)

    // A second grain references in: pool knows its spec, the cap touches it → the
    // collector enforces cap 1 → evicts W1 (onEvict → unmountWiki). One live wiki.
    await pool.mountWiki(W2, spec());
    await pool.unmountWiki(W2);                           // make W2 cold+known, then activate on reference
    expect(await cap.ensureActive(W2)).toBe(true);

    expect(pool.tier(W2)).toBe("wela");
    expect(residency.tier(W1)).toBe("anu");              // W1 evicted by the collector's wiki cap
    expect(pool.tier(W1)).toBe("anu");

    await pool.disposeAll();
  });
});

describe("wiki-activation cap — rotatable pins + pin-budget (the switcher's hold)", () => {
  const W1 = "lar:///wiki/one", W2 = "lar:///wiki/two", W3 = "lar:///wiki/three";
  const anySpec = async (): Promise<WikiMountSpec> => spec();

  // makeVesselTrio wires pinBudget 1 (the browser gradient: @daemon always + ONE rotatable).
  test("hold pins a live wiki; release unpins it; held() tracks the set", async () => {
    const { residency, cap } = makeVesselTrio(4, anySpec);
    expect(cap.grant.pinBudget).toBe(1);
    expect(await cap.hold(W1)).toBe(true);
    expect(residency.isPinned(W1)).toBe(true);           // exempt from collection
    expect([...cap.held()]).toEqual([W1]);

    cap.release(W1);
    expect(residency.isPinned(W1)).toBe(false);
    expect([...cap.held()]).toEqual([]);
  });

  test("pin-budget 1 rotates: W1 → W2 → W3 keeps exactly the newest held, releases the rest", async () => {
    const { residency, cap } = makeVesselTrio(4, anySpec);
    await cap.hold(W1);
    await cap.hold(W2);   // budget full → W1 (LRU) releases
    expect(residency.isPinned(W1)).toBe(false);
    expect(residency.isPinned(W2)).toBe(true);
    expect([...cap.held()]).toEqual([W2]);

    await cap.hold(W3);   // W2 (LRU) releases
    expect(residency.isPinned(W2)).toBe(false);
    expect(residency.isPinned(W3)).toBe(true);
    expect([...cap.held()]).toEqual([W3]);
  });

  test("re-holding an already-held grain refreshes recency, never self-evicts", async () => {
    const { residency, cap } = makeVesselTrio(4, anySpec);
    await cap.hold(W1);
    await cap.hold(W1);                            // idempotent — still held, still one
    expect([...cap.held()]).toEqual([W1]);
    expect(residency.isPinned(W1)).toBe(true);
  });
});
