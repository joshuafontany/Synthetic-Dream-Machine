/**
 * concurrency-dial — AIMD: additive-increase under headroom, multiplicative-decrease on the first
 * latency-rise, clamped to [min,max], self-tuned to a learned no-load baseline.
 */
import { describe, test, expect } from "vitest";
import { makeDial, observe, DEFAULT_DIAL } from "../src/index.js";

describe("concurrency-dial — AIMD self-tuning", () => {
  test("starts at the floor, baseline unlearned", () => {
    const d = makeDial();
    expect(d.limit).toBe(DEFAULT_DIAL.min);
    expect(d.noLoadLatency).toBe(Infinity);
  });

  test("first sample learns the baseline and HOLDS the limit (no signal yet)", () => {
    const d = observe(makeDial({ min: 4 }, 8), 100);
    expect(d.noLoadLatency).toBe(100);
    expect(d.limit).toBe(8);                    // unchanged on the first sample
  });

  test("headroom → additive-increase (+1 per sample)", () => {
    let d = makeDial({ min: 4, max: 64 }, 10);
    d = observe(d, 100);                          // learn baseline 100
    d = observe(d, 120);                          // 120 ≤ 100×2 → probe up
    expect(d.limit).toBe(11);
    d = observe(d, 130);
    expect(d.limit).toBe(12);                     // additive
  });

  test("overload (latency past baseline×tolerance) → multiplicative-decrease", () => {
    let d = makeDial({ min: 4, max: 64, tolerance: 2, beta: 0.5 }, 20);
    d = observe(d, 100);                          // baseline 100, set-point 200
    d = observe(d, 500);                          // 500 > 200 → back off fast
    expect(d.limit).toBe(10);                     // 20 × 0.5
  });

  test("clamps at the ceiling and the floor", () => {
    let d = makeDial({ min: 4, max: 6 }, 6);
    d = observe(d, 50);                           // baseline
    d = observe(d, 55); d = observe(d, 55);       // headroom, but capped at 6
    expect(d.limit).toBe(6);
    let e = makeDial({ min: 4, max: 64, beta: 0.5 }, 5);
    e = observe(e, 10);                           // baseline 10, set-point 20
    e = observe(e, 999);                          // overload → floor(5×0.5)=2 → clamped to min 4
    expect(e.limit).toBe(4);
  });

  test("the baseline only ever DROPS (learns the true no-load floor)", () => {
    let d = makeDial({}, 8);
    d = observe(d, 100);
    d = observe(d, 60);                           // faster → new baseline
    expect(d.noLoadLatency).toBe(60);
    d = observe(d, 200);                          // slower → baseline unchanged
    expect(d.noLoadLatency).toBe(60);
  });

  test("converges: a burst of overload retreats, then headroom probes back up", () => {
    let d = makeDial({ min: 4, max: 64, tolerance: 2, beta: 0.5 }, 40);
    d = observe(d, 100);                          // baseline 100
    d = observe(d, 400);                          // overload → 20
    d = observe(d, 400);                          // overload → 10
    expect(d.limit).toBe(10);
    d = observe(d, 150);                          // headroom (≤200) → 11
    d = observe(d, 150);                          // → 12
    expect(d.limit).toBe(12);
  });

  test("immutable — observe returns a new dial", () => {
    const d0 = observe(makeDial({}, 8), 100);
    observe(d0, 500);
    expect(d0.limit).toBe(8);
  });
});
