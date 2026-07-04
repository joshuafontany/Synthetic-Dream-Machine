/**
 * null-harness — witness the self-emergent threshold (null-calibration keystone): a structured (NESS) series
 * EXCEEDS its iid-shuffle equilibrium null; iid noise sits WITHIN it. The threshold emerges from the null, no
 * hardcoded constant — the informational ΔS instrument (surrogate = equilibrium, signal = non-equilibrium
 * steady-state; Shannon H, never literal heat). Deterministic (seeded PRNG) — reproducible, no global-now.
 */
import { describe, expect, test } from "vitest";

import { surrogateNull, iidShuffle, lag1Autocorr, makeRng, phaseScramble, timeReversalAsymmetry, calibrateThreshold } from "../src/null-harness.js";
import { makeArlDial } from "../src/arl-dial.js";

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

describe("null-harness — the phase-scramble null (nonlinear lock vs linear-Gaussian spectral artifact)", () => {
  const absAsym = (s: readonly number[]): number => Math.abs(timeReversalAsymmetry(s));

  test("a sawtooth (nonlinear, time-asymmetric) EXCEEDS its phase-scramble null", () => {
    const sawtooth = Array.from({ length: 120 }, (_, t) => (t % 12) / 12); // slow rise, sharp drop
    const v = surrogateNull(sawtooth, absAsym, phaseScramble, { trials: 200, alpha: 0.05, seed: 5 });
    expect(v.exceeds).toBe(true); // real irreversible lock — beats the spectrum-matched surrogate
    expect(v.pValue).toBeLessThan(0.05);
  });

  test("a sine (linear, time-symmetric) sits WITHIN its phase-scramble null (a spectral artifact, no lock)", () => {
    const sine = Array.from({ length: 120 }, (_, t) => Math.sin(t / 5));
    const v = surrogateNull(sine, absAsym, phaseScramble, { trials: 200, alpha: 0.05, seed: 5 });
    expect(v.exceeds).toBe(false); // time-symmetric — the surrogate reproduces it, no nonlinear structure
  });

  test("the surrogate PRESERVES the power spectrum (linear autocorrelation held, only phase destroyed)", () => {
    const saw = Array.from({ length: 96 }, (_, t) => (t % 8) / 8);
    const surr = phaseScramble(saw, makeRng(9));
    // autocorrelation = inverse-FT of the power spectrum → invariant under phase-scramble.
    expect(Math.abs(lag1Autocorr(surr) - lag1Autocorr(saw))).toBeLessThan(0.05);
  });
});

describe("null-harness — the ARL₀ dial governs the self-emergent threshold (the null feeds the one dial)", () => {
  const structured = Array.from({ length: 120 }, (_, t) => Math.sin(t / 6) + t * 0.01);

  test("the threshold emerges from the null at the dial's α (self-emergent + dialed)", () => {
    const v = calibrateThreshold(makeArlDial(20), structured, lag1Autocorr, iidShuffle, { trials: 300, seed: 7 });
    expect(Number.isFinite(v.threshold)).toBe(true); // no hardcoded constant — it emerged
    expect(v.exceeds).toBe(true); // the structured series (NESS) still clears its own equilibrium null
  });

  test("a stricter ARL₀ (smaller α) RAISES the emergent threshold — the dial governs the gate, monotone", () => {
    const loose = calibrateThreshold(makeArlDial(5), structured, lag1Autocorr, iidShuffle, { trials: 400, seed: 7 });
    const strict = calibrateThreshold(makeArlDial(200), structured, lag1Autocorr, iidShuffle, { trials: 400, seed: 7 });
    expect(strict.threshold).toBeGreaterThanOrEqual(loose.threshold); // higher (1−α) quantile → higher threshold
  });
});
