/**
 * Residency Tier Unification (EPIC S11) — two-state ʻōlelo thermal model tests.
 *
 * The residency surface relocated from bag-residency.ts into causal-island.ts
 * (S11.1). After an adversarial + kupono + YIN research pass (2026-06-01) the
 * `warm` tier was CUT: the model is a TWO-state thermal axis in ʻōlelo Hawaiʻi —
 * wela (hot) / anu (cold) — plus an orthogonal pin flag. No tests existed before
 * this file (the S6 suite was lost in the @lararium/core → @lararium/mesh port).
 *
 * Covers:
 *   - deriveBagTemperature (any wela referrer → wela, else anu) — S11.4 model
 *   - pin/unpin as an orthogonal flag (tier() returns "wela"/"anu", never "pinned")
 *   - touch hydration (anu → wela, onHydrate once)
 *   - cool() hoʻoanu wela → anu (onEvict, handle drop); refuses pinned + mid-sync
 *   - cool() TOCTOU guard: aborts if a touch lands during the onEvict await
 *   - enforceCap: bounds UNPINNED wela; exempts pinned
 *   - sweepOnce single-stage idle cooling (wela idle > idleMs → anu)
 *   - stats shape (pinned / wela / anuCount / hotCap)
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { BagResidencyManager, deriveBagTemperature } from "../src/causal-island.js";

const A = "automerge:aaa";
const B = "automerge:bbb";
const C = "automerge:ccc";

describe("deriveBagTemperature — reachability from a live island (S11.4)", () => {
  test("any wela referencing island → wela", () => {
    expect(deriveBagTemperature(["anu", "wela", "anu"])).toBe("wela");
  });
  test("all anu → anu", () => {
    expect(deriveBagTemperature(["anu", "anu"])).toBe("anu");
  });
  test("no referencing island → anu", () => {
    expect(deriveBagTemperature([])).toBe("anu");
  });
});

describe("BagResidencyManager — pin as orthogonal flag", () => {
  test("registerCold lands a known-but-unloaded bag at anu, unpinned", () => {
    const m = new BagResidencyManager();
    m.registerCold(A);
    expect(m.has(A)).toBe(true);
    expect(m.tier(A)).toBe("anu");
    expect(m.isPinned(A)).toBe(false);
  });

  test("pin an anu bag → wela + pinned, onHydrate fires once", async () => {
    const hydrated: string[] = [];
    const m = new BagResidencyManager({ onHydrate: async (u) => { hydrated.push(u); } });
    m.registerCold(A);
    await m.pin(A, "boot:test");
    expect(m.tier(A)).toBe("wela");     // temperature, NOT "pinned"
    expect(m.isPinned(A)).toBe(true);   // the orthogonal flag
    expect(hydrated).toEqual([A]);
  });

  test("pin an already-wela bag does not re-hydrate", async () => {
    const hydrated: string[] = [];
    const m = new BagResidencyManager({ onHydrate: async (u) => { hydrated.push(u); } });
    await m.touch(A);            // anu → wela, hydrate #1
    await m.pin(A);             // already wela — no second hydrate
    expect(hydrated).toEqual([A]);
    expect(m.isPinned(A)).toBe(true);
  });

  test("unpin clears the flag but keeps the bag wela", async () => {
    const m = new BagResidencyManager();
    await m.pin(A);
    expect(m.tier(A)).toBe("wela");
    m.unpin(A);
    expect(m.isPinned(A)).toBe(false);
    expect(m.tier(A)).toBe("wela");     // still resident
  });
});

describe("BagResidencyManager — touch / hydration (hoʻowela)", () => {
  test("touch an unknown bag creates it wela and hydrates", async () => {
    const hydrated: string[] = [];
    const m = new BagResidencyManager({ onHydrate: async (u) => { hydrated.push(u); } });
    await m.touch(A);
    expect(m.tier(A)).toBe("wela");
    expect(hydrated).toEqual([A]);
  });

  test("touch a wela bag does not re-hydrate", async () => {
    const hydrated: string[] = [];
    const m = new BagResidencyManager({ onHydrate: async (u) => { hydrated.push(u); } });
    await m.touch(A);            // hydrate #1
    await m.touch(A);           // already wela — no hydrate
    expect(hydrated).toEqual([A]);
  });
});

describe("BagResidencyManager — cool() hoʻoanu (wela → anu)", () => {
  test("cool calls onEvict and drops to anu", async () => {
    const evicted: string[] = [];
    const m = new BagResidencyManager({ onEvict: async (u) => { evicted.push(u); } });
    await m.touch(A);
    expect(await m.cool(A)).toBe(true);
    expect(m.tier(A)).toBe("anu");
    expect(evicted).toEqual([A]);
  });

  test("evict is an alias for cool", async () => {
    const m = new BagResidencyManager();
    await m.touch(A);
    expect(await m.evict(A)).toBe(true);
    expect(m.tier(A)).toBe("anu");
  });

  test("cool refuses a pinned bag", async () => {
    const m = new BagResidencyManager();
    await m.pin(A);
    expect(await m.cool(A)).toBe(false);
    expect(m.tier(A)).toBe("wela");
  });

  test("cool refuses a mid-sync bag (#358 invariant)", async () => {
    const evicted: string[] = [];
    const m = new BagResidencyManager({ onEvict: async (u) => { evicted.push(u); } });
    await m.touch(A);
    m.setSyncActive(A, true);
    expect(await m.cool(A)).toBe(false);
    expect(m.tier(A)).toBe("wela");
    expect(evicted).toEqual([]);
  });

  test("cool is a no-op on an already-anu bag", async () => {
    const m = new BagResidencyManager();
    m.registerCold(A);
    expect(await m.cool(A)).toBe(false);
    expect(m.tier(A)).toBe("anu");
  });

  // The adversarial spirit's #1 code bug: an async onEvict that resolves AFTER a
  // concurrent touch must not clobber the now-live bag to anu.
  test("cool aborts if the bag is touched during the onEvict await (TOCTOU)", async () => {
    const evicted: string[] = [];
    const m: BagResidencyManager = new BagResidencyManager({
      onEvict: async (u) => {
        evicted.push(u);
        await m.touch(u);          // a concurrent read lands mid-evict
      },
    });
    await m.touch(A);
    const moved = await m.cool(A);
    expect(moved).toBe(false);       // aborted — bag went live during the evict
    expect(m.tier(A)).toBe("wela");  // NOT dropped
    expect(evicted).toEqual([A]);    // onEvict still ran (must be idempotent)
  });
});

describe("BagResidencyManager — enforceCap (bounds unpinned wela)", () => {
  test("touch past hotCap cools the oldest unpinned bag to anu", async () => {
    const evicted: string[] = [];
    const m = new BagResidencyManager({ hotCap: 2, onEvict: async (u) => { evicted.push(u); } });
    await m.touch(A);
    await m.touch(B);
    await m.touch(C);                  // resident would be 3 > cap 2
    expect(evicted).toEqual([A]);      // A is oldest
    expect(m.tier(A)).toBe("anu");
    expect(m.tier(B)).toBe("wela");
    expect(m.tier(C)).toBe("wela");
  });

  test("pinned bags are exempt and do not count against the cap", async () => {
    const evicted: string[] = [];
    const m = new BagResidencyManager({ hotCap: 1, onEvict: async (u) => { evicted.push(u); } });
    await m.pin(A);                    // pinned wela — uncounted
    await m.touch(B);                  // unpinned resident: 1, == cap, ok
    expect(m.tier(A)).toBe("wela");
    expect(m.tier(B)).toBe("wela");
    expect(evicted).toEqual([]);
  });
});

describe("BagResidencyManager — sweepOnce single-stage idle cooling", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test("wela idle > idleMs cools to anu", async () => {
    const idleMs = 1000;
    const m = new BagResidencyManager({ idleMs });
    await m.touch(A);                  // lastTouched = t0
    vi.advanceTimersByTime(idleMs + 1);
    const r = await m.sweepOnce();
    expect(r.cooled).toBe(1);
    expect(m.tier(A)).toBe("anu");
  });

  test("sweeper never cools a pinned bag", async () => {
    const idleMs = 1000;
    const m = new BagResidencyManager({ idleMs });
    await m.pin(A);
    vi.advanceTimersByTime(idleMs * 3);
    const r = await m.sweepOnce();
    expect(r.cooled).toBe(0);
    expect(m.tier(A)).toBe("wela");
  });

  test("sweeper never cools a mid-sync bag", async () => {
    const idleMs = 1000;
    const m = new BagResidencyManager({ idleMs });
    await m.touch(A);
    m.setSyncActive(A, true);
    vi.advanceTimersByTime(idleMs * 3);
    const r = await m.sweepOnce();
    expect(r.cooled).toBe(0);
    expect(m.tier(A)).toBe("wela");
  });
});

describe("BagResidencyManager — stats", () => {
  test("reports pinned / wela / anuCount / hotCap, buckets disjoint", async () => {
    const m = new BagResidencyManager({ hotCap: 8 });
    await m.pin(A, "boot");      // pinned-wela
    await m.touch(B);            // unpinned wela
    m.registerCold(C);          // anu
    const s = m.stats();
    expect(s.pinned).toEqual([A]);
    expect(s.wela.map((e) => e.url)).toEqual([B]);   // pinned A NOT here (disjoint)
    expect(s.anuCount).toBe(1);                       // only C
    expect(s.hotCap).toBe(8);
    expect(s.wela[0]?.pinned).toBe(false);            // entry carries the flag
  });
});
