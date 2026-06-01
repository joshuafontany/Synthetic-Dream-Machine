/**
 * Residency Tier Unification (EPIC S11) — thermal + pin model tests.
 *
 * The residency surface relocated from bag-residency.ts into causal-island.ts
 * (S11.1) and reshaped to an orthogonal temperature axis (hot/warm/cold) + pin
 * flag (S11.2). No tests existed before this file (the S6 suite was lost in the
 * @lararium/core → @lararium/mesh port); this is the safety net for the reshape.
 *
 * Covers:
 *   - deriveBagTemperature warmest-wins (S11.4 model)
 *   - pin/unpin as an orthogonal flag (tier() never returns "pinned")
 *   - touch hydration (cold → hot, onHydrate once)
 *   - cool() hoʻoanu transitions: hot→warm (onSuspend, handle retained),
 *     →cold (onEvict, handle drop); refuses pinned + mid-sync
 *   - enforceCap: bounds UNPINNED resident; prefers warm victims; exempts pinned
 *   - sweepOnce two-stage idle cooling (hot→warm at idleMs, warm→cold at 2×idleMs)
 *   - stats shape
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { BagResidencyManager, deriveBagTemperature } from "../src/causal-island.js";

const A = "automerge:aaa";
const B = "automerge:bbb";
const C = "automerge:ccc";

describe("deriveBagTemperature — warmest referencing island wins (S11.4)", () => {
  test("any hot island → hot", () => {
    expect(deriveBagTemperature(["cold", "hot", "warm"])).toBe("hot");
  });
  test("warm without hot → warm", () => {
    expect(deriveBagTemperature(["cold", "warm", "cold"])).toBe("warm");
  });
  test("all cold → cold", () => {
    expect(deriveBagTemperature(["cold", "cold"])).toBe("cold");
  });
  test("no referencing island → cold", () => {
    expect(deriveBagTemperature([])).toBe("cold");
  });
});

describe("BagResidencyManager — pin as orthogonal flag", () => {
  test("registerCold lands a known-but-unloaded bag at cold, unpinned", () => {
    const m = new BagResidencyManager();
    m.registerCold(A);
    expect(m.has(A)).toBe(true);
    expect(m.tier(A)).toBe("cold");
    expect(m.isPinned(A)).toBe(false);
  });

  test("pin a cold bag → hot + pinned, onHydrate fires once", async () => {
    const hydrated: string[] = [];
    const m = new BagResidencyManager({ onHydrate: async (u) => { hydrated.push(u); } });
    m.registerCold(A);
    await m.pin(A, "boot:test");
    expect(m.tier(A)).toBe("hot");      // temperature, NOT "pinned"
    expect(m.isPinned(A)).toBe(true);   // the orthogonal flag
    expect(hydrated).toEqual([A]);
  });

  test("pin an already-hot bag does not re-hydrate", async () => {
    const hydrated: string[] = [];
    const m = new BagResidencyManager({ onHydrate: async (u) => { hydrated.push(u); } });
    await m.touch(A);            // cold → hot, hydrate #1
    await m.pin(A);             // already hot — no second hydrate
    expect(hydrated).toEqual([A]);
    expect(m.isPinned(A)).toBe(true);
  });

  test("unpin clears the flag but keeps the bag resident at its temperature", async () => {
    const m = new BagResidencyManager();
    await m.pin(A);
    expect(m.tier(A)).toBe("hot");
    m.unpin(A);
    expect(m.isPinned(A)).toBe(false);
    expect(m.tier(A)).toBe("hot");      // still resident
  });
});

describe("BagResidencyManager — touch / hydration", () => {
  test("touch an unknown bag creates it hot and hydrates", async () => {
    const hydrated: string[] = [];
    const m = new BagResidencyManager({ onHydrate: async (u) => { hydrated.push(u); } });
    await m.touch(A);
    expect(m.tier(A)).toBe("hot");
    expect(hydrated).toEqual([A]);
  });

  test("touch a warm bag warms it back to hot without re-hydrating", async () => {
    const hydrated: string[] = [];
    const m = new BagResidencyManager({ onHydrate: async (u) => { hydrated.push(u); } });
    await m.touch(A);                 // hydrate #1
    await m.cool(A, "warm");
    expect(m.tier(A)).toBe("warm");
    await m.touch(A);                 // warm → hot, no hydrate (wasn't cold)
    expect(m.tier(A)).toBe("hot");
    expect(hydrated).toEqual([A]);
  });
});

describe("BagResidencyManager — cool() hoʻoanu transitions", () => {
  test("hot → warm calls onSuspend, retains handle (no onEvict)", async () => {
    const suspended: string[] = [];
    const evicted: string[] = [];
    const m = new BagResidencyManager({
      onSuspend: async (u) => { suspended.push(u); },
      onEvict:   async (u) => { evicted.push(u); },
    });
    await m.touch(A);
    expect(await m.cool(A, "warm")).toBe(true);
    expect(m.tier(A)).toBe("warm");
    expect(suspended).toEqual([A]);
    expect(evicted).toEqual([]);       // handle retained
  });

  test("warm → cold calls onEvict (handle drop)", async () => {
    const evicted: string[] = [];
    const m = new BagResidencyManager({ onEvict: async (u) => { evicted.push(u); } });
    await m.touch(A);
    await m.cool(A, "warm");
    expect(await m.cool(A, "cold")).toBe(true);
    expect(m.tier(A)).toBe("cold");
    expect(evicted).toEqual([A]);
  });

  test("hot → cold directly calls onEvict", async () => {
    const evicted: string[] = [];
    const m = new BagResidencyManager({ onEvict: async (u) => { evicted.push(u); } });
    await m.touch(A);
    expect(await m.evict(A)).toBe(true);   // evict == cool to cold
    expect(m.tier(A)).toBe("cold");
    expect(evicted).toEqual([A]);
  });

  test("cool refuses a pinned bag", async () => {
    const m = new BagResidencyManager();
    await m.pin(A);
    expect(await m.cool(A, "cold")).toBe(false);
    expect(await m.cool(A, "warm")).toBe(false);
    expect(m.tier(A)).toBe("hot");
  });

  test("cool to cold refuses a mid-sync bag (#358 invariant)", async () => {
    const evicted: string[] = [];
    const m = new BagResidencyManager({ onEvict: async (u) => { evicted.push(u); } });
    await m.touch(A);
    m.setSyncActive(A, true);
    expect(await m.cool(A, "cold")).toBe(false);
    expect(m.tier(A)).toBe("hot");
    expect(evicted).toEqual([]);
  });

  test("cool to warm only steps down from hot (cold → warm is a no-op)", async () => {
    const m = new BagResidencyManager();
    m.registerCold(A);
    expect(await m.cool(A, "warm")).toBe(false);
    expect(m.tier(A)).toBe("cold");
  });
});

describe("BagResidencyManager — enforceCap (bounds unpinned resident)", () => {
  test("touch past hotCap cools the oldest unpinned bag to cold", async () => {
    const evicted: string[] = [];
    const m = new BagResidencyManager({ hotCap: 2, onEvict: async (u) => { evicted.push(u); } });
    await m.touch(A);
    await m.touch(B);
    await m.touch(C);                  // resident would be 3 > cap 2
    expect(evicted).toEqual([A]);      // A is oldest
    expect(m.tier(A)).toBe("cold");
    expect(m.tier(B)).toBe("hot");
    expect(m.tier(C)).toBe("hot");
  });

  test("enforceCap prefers a warm victim over a hot one", async () => {
    const evicted: string[] = [];
    const m = new BagResidencyManager({ hotCap: 2, onEvict: async (u) => { evicted.push(u); } });
    await m.touch(A);
    await m.cool(A, "warm");           // A warm (resident)
    await m.touch(B);                  // resident: A(warm)+B(hot) = 2, ok
    await m.touch(C);                  // resident 3 > 2 → evict warm A first
    expect(evicted).toEqual([A]);
    expect(m.tier(A)).toBe("cold");
    expect(m.tier(B)).toBe("hot");
    expect(m.tier(C)).toBe("hot");
  });

  test("pinned bags are exempt and do not count against the cap", async () => {
    const evicted: string[] = [];
    const m = new BagResidencyManager({ hotCap: 1, onEvict: async (u) => { evicted.push(u); } });
    await m.pin(A);                    // pinned hot — uncounted
    await m.touch(B);                  // unpinned resident: 1, == cap, ok
    expect(m.tier(A)).toBe("hot");
    expect(m.tier(B)).toBe("hot");
    expect(evicted).toEqual([]);
  });
});

describe("BagResidencyManager — sweepOnce two-stage idle cooling", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test("hot idle > idleMs → warm; warm idle > 2×idleMs → cold", async () => {
    const idleMs = 1000;
    const m = new BagResidencyManager({ idleMs });
    await m.touch(A);                  // lastTouched = t0
    vi.advanceTimersByTime(idleMs + 1);
    let r = await m.sweepOnce();
    expect(r.warmed).toBe(1);
    expect(m.tier(A)).toBe("warm");

    vi.advanceTimersByTime(idleMs + 1); // total > 2×idleMs since t0
    r = await m.sweepOnce();
    expect(r.cooled).toBe(1);
    expect(m.tier(A)).toBe("cold");
  });

  test("sweeper never cools a pinned bag", async () => {
    const idleMs = 1000;
    const m = new BagResidencyManager({ idleMs });
    await m.pin(A);
    vi.advanceTimersByTime(idleMs * 3);
    const r = await m.sweepOnce();
    expect(r.warmed).toBe(0);
    expect(r.cooled).toBe(0);
    expect(m.tier(A)).toBe("hot");
  });

  test("sweeper never cools a mid-sync bag", async () => {
    const idleMs = 1000;
    const m = new BagResidencyManager({ idleMs });
    await m.touch(A);
    m.setSyncActive(A, true);
    vi.advanceTimersByTime(idleMs * 3);
    const r = await m.sweepOnce();
    expect(r.warmed).toBe(0);
    expect(m.tier(A)).toBe("hot");
  });
});

describe("BagResidencyManager — stats", () => {
  test("reports pinned / hot / warm / coldCount / hotCap", async () => {
    const m = new BagResidencyManager({ hotCap: 8 });
    await m.pin(A, "boot");
    await m.touch(B);
    await m.touch(C);
    await m.cool(C, "warm");
    m.registerCold("automerge:ddd");
    const s = m.stats();
    expect(s.pinned).toEqual([A]);
    expect(s.hot.map((e) => e.url)).toEqual([B]);
    expect(s.warm.map((e) => e.url)).toEqual([C]);
    expect(s.coldCount).toBe(1);       // only ddd (A is hot+pinned, not cold)
    expect(s.hotCap).toBe(8);
    // entry carries the orthogonal pin flag
    expect(s.hot[0]?.pinned).toBe(false);
  });
});
