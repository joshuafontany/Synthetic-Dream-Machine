/**
 * clock-recovery — the gate recovers the FFZ clock from the fed stream's cadence (no wall-clock). The
 * bands EMERGE as subharmonics of one recovered beat; a sparse/flat feed → HOLDOVER (never a fabricated
 * beat). Witnesses the feed-it-emerges chronometer the astral-sea swarm grounded.
 */
import { describe, expect, test } from "vitest";

import { recoverClock, FFZ_BANDS_FINE_TO_COARSE } from "../src/clock-recovery.js";

const periodic = (n: number, p: number): number[] =>
  Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * i) / p));

const flat = (n: number): number[] => Array.from({ length: n }, () => 1);

const noise = (n: number): number[] =>
  Array.from({ length: n }, (_, i) => {
    const x = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  });

describe("clock-recovery (feed-it-emerges FFZ clock from the stream)", () => {
  test("recovers the fundamental beat from a periodic stream", () => {
    const r = recoverClock({ signal: periodic(160, 8) });
    expect(r.locked).toBe(true);
    expect(r.holdover).toBe(false);
    expect(Math.abs(r.beat - 8)).toBeLessThanOrEqual(1);
    expect(r.lockQuality).toBeGreaterThan(0.3);
  });

  test("the bands EMERGE as nested subharmonics of the recovered beat (not hardcoded)", () => {
    const r = recoverClock({ signal: periodic(160, 8), nBands: 5, nestRatio: 2 });
    expect(r.bands.length).toBe(5);
    expect(r.bands.map((b) => b.name)).toEqual([...FFZ_BANDS_FINE_TO_COARSE]);
    // each band = beat × 2^level (dyadic subharmonic cascade)
    for (let k = 0; k < r.bands.length; k++) {
      expect(r.bands[k]!.period).toBeCloseTo(r.beat * 2 ** k, 6);
    }
    // the finest bands resolve; a subharmonic longer than n/2 is unresolved (holdover for that band)
    expect(r.bands[0]!.resolved).toBe(true);
    expect(r.bands[4]!.resolved).toBe(false); // theme = beat×16 = 128 > 160/2
  });

  test("a flat / sparse feed → HOLDOVER (no lock, no fabricated beat, no bands)", () => {
    const r = recoverClock({ signal: flat(160) });
    expect(r.locked).toBe(false);
    expect(r.holdover).toBe(true);
    expect(r.beat).toBe(0);
    expect(r.bands.length).toBe(0);
  });

  test("white noise → HOLDOVER (no recoverable beat from read-order)", () => {
    const r = recoverClock({ signal: noise(160) });
    expect(r.locked).toBe(false);
    expect(r.holdover).toBe(true);
  });
});
