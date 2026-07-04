/**
 * null-harness — witness the self-emergent threshold (null-calibration keystone): a structured (NESS) series
 * EXCEEDS its iid-shuffle equilibrium null; iid noise sits WITHIN it. The threshold emerges from the null, no
 * hardcoded constant — the informational ΔS instrument (surrogate = equilibrium, signal = non-equilibrium
 * steady-state; Shannon H, never literal heat). Deterministic (seeded PRNG) — reproducible, no global-now.
 */
import { describe, expect, test } from "vitest";

import { surrogateNull, iidShuffle, lag1Autocorr, makeRng } from "../src/null-harness.js";

describe("null-harness — the self-emergent threshold (surrogate = equilibrium, signal = NESS)", () => {
  test("a structured (autocorrelated) series EXCEEDS its iid-shuffle equilibrium null", () => {
    // A slow ramp+sine — strong temporal order (a NESS held above the shuffled equilibrium).
    const structured = Array.from({ length: 120 }, (_, t) => Math.sin(t / 6) + t * 0.01);
    const v = surrogateNull(structured, lag1Autocorr, iidShuffle, { trials: 300, alpha: 0.05, seed: 7 });
    expect(v.exceeds).toBe(true); // observed autocorr above the (1−α) null quantile — structure detected
    expect(v.pValue).toBeLessThan(0.05); // significant departure from the equilibrium null
    expect(v.observed).toBeGreaterThan(v.threshold);
  });

  test("iid noise sits WITHIN its own shuffle null (no false NESS — the equilibrium reads flat)", () => {
    const rng = makeRng(42);
    const noise = Array.from({ length: 120 }, () => rng() - 0.5); // order-free (equilibrium) draws
    const v = surrogateNull(noise, lag1Autocorr, iidShuffle, { trials: 300, alpha: 0.05, seed: 7 });
    expect(v.exceeds).toBe(false); // no structure above the shuffle null
    expect(v.pValue).toBeGreaterThan(0.05);
  });

  test("the threshold EMERGES from the null and reproduces under the same seed (deterministic)", () => {
    const s = Array.from({ length: 80 }, (_, t) => Math.cos(t / 4));
    const a = surrogateNull(s, lag1Autocorr, iidShuffle, { trials: 200, seed: 3 });
    const b = surrogateNull(s, lag1Autocorr, iidShuffle, { trials: 200, seed: 3 });
    expect(a.threshold).toBe(b.threshold); // same seed → same null → same emergent threshold
    expect(Number.isFinite(a.threshold)).toBe(true);
  });
});
