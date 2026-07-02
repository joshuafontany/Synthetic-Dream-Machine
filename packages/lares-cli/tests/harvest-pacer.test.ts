/**
 * harvest-pacer — the flow-control witnesses for cuts 1/3/4:
 *   1. pacing math: cost above target grows the window multiplicatively (AIMD back-off),
 *      headroom shrinks additively, the deadband holds.
 *   3. the FFZ floor: the delay sequence never settles on a fixed period (statistical).
 *   4. WAL-depth pressure: inflating the depth reading widens the feeder window.
 */

import { describe, expect, it } from "vitest";

import { makeHarvestPacer, PONO_HARVEST_SERVO } from "../src/harvest-pacer.js";

/** Deterministic LCG — reproducible jitter for the statistical assertions. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("harvest-pacer — the bulk feeder's window servo (cut 1)", () => {
  it("grows the window multiplicatively when batch cost runs above target", () => {
    const pacer = makeHarvestPacer({ seedHex: "cafe01", rand: lcg(1) });
    const w0 = pacer.next(8000).windowMs; // 4× target — overload
    const w1 = pacer.next(8000).windowMs;
    const w2 = pacer.next(8000).windowMs;
    expect(w0).toBeGreaterThan(PONO_HARVEST_SERVO.minMs);
    expect(w1).toBeGreaterThan(w0);
    expect(w2).toBeGreaterThan(w1);
    // multiplicative: the growth ratio holds (default growFactor 1.5), never additive creep
    expect(w1 / w0).toBeCloseTo(1.5, 1);
  });

  it("shrinks additively on headroom and clamps at the floor", () => {
    const pacer = makeHarvestPacer({ seedHex: "cafe02", rand: lcg(2) });
    for (let i = 0; i < 6; i++) pacer.next(8000); // drive the window up
    const high = pacer.trajectory().at(-1)!.windowMs;
    let w = high;
    for (let i = 0; i < 200; i++) w = pacer.next(10).windowMs; // fast batches — recover slow
    expect(w).toBeLessThan(high);
    expect(w).toBe(PONO_HARVEST_SERVO.minMs); // additive recovery reaches the floor, never below
    const steps = pacer.trajectory().slice(6, 12).map((s) => s.windowMs);
    for (let i = 1; i < steps.length; i++) {
      const drop = steps[i - 1]! - steps[i]!;
      expect(drop).toBeGreaterThanOrEqual(0);
      expect(drop).toBeLessThanOrEqual(PONO_HARVEST_SERVO.minMs); // additive step, not a collapse
    }
  });

  it("holds the window inside the deadband (noise not chased)", () => {
    const pacer = makeHarvestPacer({ seedHex: "cafe03", rand: lcg(3) });
    for (let i = 0; i < 4; i++) pacer.next(8000);
    const held = pacer.trajectory().at(-1)!.windowMs;
    // observed ≈ target (within the 0.25 hysteresis band) → the window HOLDS
    const w = pacer.next(PONO_HARVEST_SERVO.targetMs * 1.1).windowMs;
    expect(w).toBe(held);
  });

  it("self-clocks: the delay derives from cost + floor only (no wall-clock config)", () => {
    const pacer = makeHarvestPacer({ seedHex: "cafe04", rand: lcg(4) });
    const step = pacer.next(100);
    expect(step.delayMs).toBe(Math.max(step.floorMs, step.windowMs));
  });
});

describe("harvest-pacer — the FFZ incommensurable floor (cut 3)", () => {
  it("the delay sequence never settles on a fixed period", () => {
    const pacer = makeHarvestPacer({ seedHex: "deadbeef01", rand: lcg(5) });
    // Constant fast batches: the servo window sits pinned at its floor, so the delay
    // sequence exposes the FFZ floor draws alone — the phase-lock hazard case.
    const delays: number[] = [];
    for (let i = 0; i < 200; i++) delays.push(pacer.next(10).delayMs);
    const distinct = new Set(delays);
    expect(distinct.size).toBeGreaterThan(50); // renewal-randomized, not a fixed period
    // no long constant run (a settled period would repeat one value)
    let longestRun = 1;
    let run = 1;
    for (let i = 1; i < delays.length; i++) {
      run = delays[i] === delays[i - 1] ? run + 1 : 1;
      longestRun = Math.max(longestRun, run);
    }
    expect(longestRun).toBeLessThanOrEqual(3);
    // and the mean sits near the seeded incommensurable band (bounded, floored)
    for (const d of delays) expect(d).toBeGreaterThanOrEqual(250);
  });

  it("distinct seeds carry distinct incommensurable cadences (no shared phase)", () => {
    const a = makeHarvestPacer({ seedHex: "aaaa01", rand: () => 0.5 });
    const b = makeHarvestPacer({ seedHex: "bbbb02", rand: () => 0.5 });
    // jitter pinned — only the deterministic per-seed factor differs
    expect(a.next(10).floorMs).not.toBe(b.next(10).floorMs);
  });
});

describe("harvest-pacer — WAL-depth as the servo's cost signal (cut 4)", () => {
  it("an inflated depth reading widens the feeder window", () => {
    let depth = 0;
    const pacer = makeHarvestPacer({ seedHex: "cafe05", rand: lcg(6), readDepth: () => depth });
    // batches land just UNDER the deadband — without sink pressure the window holds at the floor
    const calm = pacer.next(PONO_HARVEST_SERVO.targetMs).windowMs;
    expect(calm).toBe(PONO_HARVEST_SERVO.minMs);
    // the sink backs up: same raw batch cost, WAL depth inflates the effective cost
    depth = 128; // 4× the depth scale → 5× effective cost
    const pressured = pacer.next(PONO_HARVEST_SERVO.targetMs);
    expect(pressured.costMs).toBeGreaterThan(pressured.observedMs);
    expect(pressured.windowMs).toBeGreaterThan(calm);
    // pressure released → the window recovers (additively) back down
    depth = 0;
    let w = pressured.windowMs;
    for (let i = 0; i < 50; i++) w = pacer.next(10).windowMs;
    expect(w).toBe(PONO_HARVEST_SERVO.minMs);
  });

  it("a throwing depth seam reads as zero pressure, never a failed batch", () => {
    const pacer = makeHarvestPacer({
      seedHex: "cafe06",
      rand: lcg(7),
      readDepth: () => {
        throw new Error("wal unreadable");
      },
    });
    const step = pacer.next(100);
    expect(step.depth).toBe(0);
    expect(step.costMs).toBe(100);
  });
});
