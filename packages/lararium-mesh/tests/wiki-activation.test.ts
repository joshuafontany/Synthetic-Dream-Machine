/**
 * wiki-activation.test.ts — the activation-on-reference CAP over the ONE collector.
 *
 * Wires makeWikiActivationCap the way a vessel does: a real BagResidencyManager
 * (per-grain-type dials) driving a real VesselIslandPoolCore through onHydrate
 * (→ ensureWiki) / onEvict (→ unmountWiki). Proves the whole F2+F3 loop — a
 * reference reactivates a cold KNOWN grain; a never-opened grain refuses without
 * stranding a phantom resident; the collector drives eviction, not the pool.
 */

import { describe, test, expect } from "vitest";
import { VesselIslandPoolCore } from "../src/vessel-island-pool-core.js";
import { BagResidencyManager } from "../src/bag-residency.js";
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
function makeVesselTrio(wikiCap: number) {
  const { host, spawns } = countingHost();
  const pool = new VesselIslandPoolCore({ host });
  const residency = new BagResidencyManager({
    typeCaps: { wiki: wikiCap },
    onHydrate: async (id, t) => { if (t === "wiki") await pool.ensureWiki(id); },
    onEvict:   async (id, t) => { if (t === "wiki") await pool.unmountWiki(id); },
  });
  const cap = makeWikiActivationCap(residency, pool, { activationCap: wikiCap, pinBudget: 1 });
  return { pool, residency, cap, spawns };
}

describe("wiki-activation cap — activation-on-reference over the one collector", () => {
  test("a never-opened grain refuses without stranding a phantom resident", async () => {
    const { residency, cap } = makeVesselTrio(2);
    expect(await cap.ensureActive("lar:///wiki/never")).toBe(false);
    expect(residency.tier("lar:///wiki/never")).toBeNull();   // no phantom wela in the collector
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
