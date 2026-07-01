/**
 * sensorium-pc — ADVERSARIAL numerical-edge QA (The-Advocate, tasked QA-spirit).
 *
 * These are CHARACTERIZATION tests: they pin the CURRENT behavior at the numerical edges the
 * `−ln π` / KL / precision-settle machinery touches, so a future fix (or regression) surfaces
 * loudly. Two live DEFECTS and one bounded-degeneracy are documented here — see each block.
 *
 * Boundary the live runs would otherwise resolve the hard way (li-ki-integrities #crucible-tested):
 *   D1  precisionToConfidence(∞) → NaN — the exported map documents "π→∞ ⇒ 20/20" but returns NaN
 *       AT ∞ (and at any overflow-to-Inf precision). Not internally reachable (the loop bounds π ≤
 *       ~1e9), but a latent public-API NaN source the moment a caller hands it an Inf.
 *   D2  settlePrecision fails to CONVERGE for small ε̄² — the interior optimum π*=1/ε̄² exists and the
 *       closed-form optimalPrecision returns it, but the fixed-lr / fixed-iter gradient flow STALLS
 *       far short (ε̄²=1e-12 ⇒ p≈224, optimum 1e12, settled:false). A near-noiseless (high-precision)
 *       plane never settles. The docstring's "the flow CONVERGES and STOPS there" does NOT hold here.
 */
import { describe, test, expect } from "vitest";
import {
  precisionToConfidence,
  optimalPrecision,
  settlePrecision,
  vfePrecisionTerm,
  gaussianKL,
  freeEnergy,
} from "../src/index.js";

describe("QA: precision↔confidence NaN edge (D1 — latent public-API break)", () => {
  test("precisionToConfidence(Infinity) returns NaN — NOT the documented 20/20 ceiling", () => {
    // 20·π/(1+π) with π=Inf ⇒ Inf/Inf ⇒ NaN. The doc promises "π→∞ ⇒ 20/20".
    expect(Number.isNaN(precisionToConfidence(Infinity))).toBe(true);
    // Any finite-but-overflowing precision multiplied past Number.MAX_VALUE hits the same NaN.
    expect(Number.isNaN(precisionToConfidence(1e308 * 10))).toBe(true);
  });

  test("a LARGE finite precision saturates cleanly (the ceiling holds below ∞)", () => {
    // The internal loop never exceeds ~1/EPS = 1e9, so in-loop it stays finite — the break needs
    // an externally-supplied Inf. Confirm the finite ceiling is well-behaved.
    expect(precisionToConfidence(1e9)).toBeGreaterThan(19.999999);
    expect(precisionToConfidence(1e9)).toBeLessThanOrEqual(20);
    expect(Number.isFinite(precisionToConfidence(1e300))).toBe(true);
  });
});

describe("QA: settlePrecision convergence ceiling (D2 — live gradient-flow defect)", () => {
  test("optimalPrecision (closed form) reaches π*=1/ε̄² but settlePrecision STALLS far short", () => {
    const eps2 = 1e-6;
    // Closed form (above the EPS=1e-9 floor) is exact: π* = 1/ε̄² = 1e6.
    expect(optimalPrecision(eps2)).toBeGreaterThan(9e5);
    // Gradient flow cannot reach it with the default lr/iters — it reports NOT settled and lands
    // orders of magnitude short (~2.2e2 vs 1e6). THIS is the noiseless-plane degeneracy in TS.
    const s = settlePrecision(eps2);
    expect(s.settled).toBe(false);
    expect(s.precision).toBeLessThan(1e3); // nowhere near 1e6 — stalls at ~223
    // the closed form and the settler DISAGREE by ~3.5 orders of magnitude — the defect signal.
    expect(optimalPrecision(eps2) / s.precision).toBeGreaterThan(1e3);
  });

  test("SUB-FINDING: optimalPrecision's own EPS=1e-9 floor CAPS π* at 1e9 for ε̄²<1e-9", () => {
    // The docstring names the optimum π*=1/ε̄² unconditionally, but the internal max(EPS, ε̄²)
    // clamps it: below ε̄²=1e-9 the "unique interior optimum" silently pins at 1e9, diverging
    // from 1/ε̄². A near-noiseless plane's precision is thus quietly ceilinged, not truly optimal.
    expect(optimalPrecision(1e-12)).toBeCloseTo(1e9, -6); // 1/1e-9, NOT 1/1e-12=1e12
    expect(optimalPrecision(0)).toBeCloseTo(1e9, -6);
  });

  test("settlePrecision DOES converge for a moderate ε̄² (the defect is small-ε̄²-specific)", () => {
    const s = settlePrecision(1); // optimum π*=1, easily reached
    expect(s.settled).toBe(true);
    expect(s.precision).toBeCloseTo(1, 2);
  });

  test("the −ln π term stays finite at the π→0 floor (no log-blowup leak)", () => {
    // vfePrecisionTerm floors π at EPS, so −ln π = −ln(1e-9) is large but FINITE, never −Inf.
    expect(Number.isFinite(vfePrecisionTerm(0, 5))).toBe(true);
    expect(Number.isFinite(vfePrecisionTerm(-100, 5))).toBe(true);
  });
});

describe("QA: gaussianKL + freeEnergy NaN containment (no leak into F)", () => {
  test("gaussianKL floors both variances — degenerate/negative σ² stay finite", () => {
    expect(gaussianKL(0, 0, 0, 0)).toBe(0);
    expect(Number.isFinite(gaussianKL(0, -1, 0, -1))).toBe(true); // negative variance floored
    expect(Number.isFinite(gaussianKL(1e6, 1e-30, 0, 1e-30))).toBe(true); // huge but finite
  });

  test("freeEnergy(F) stays finite across adversarial planes (empty / constant / huge-scale)", () => {
    for (const planes of [
      { a: [] as number[] },
      { a: [1] },
      { a: new Array(50).fill(3) },
      { a: Array.from({ length: 50 }, (_, i) => Math.sin(i) * 1e12) },
    ]) {
      const fe = freeEnergy(planes, { confidences: { a: 20 } });
      expect(Number.isFinite(fe.F)).toBe(true);
      expect(Number.isFinite(fe.accuracy)).toBe(true);
      expect(Number.isFinite(fe.precisionPenalty)).toBe(true);
      expect(Number.isFinite(fe.complexity)).toBe(true);
    }
  });
});
