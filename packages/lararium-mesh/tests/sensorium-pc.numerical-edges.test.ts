/**
 * sensorium-pc — numerical-edge QA, FLIPPED to assert the fixes (Artificer, 2026-07-01).
 *
 * These were characterization tests pinning two live DEFECTS; the minimalist robust-numerics
 * fixes landed (one relative constant `EPS_REL` governs the precision floor AND the confidence
 * cap), so they now ASSERT the cure. See each block.
 *
 *   D1 (FIXED)  precisionToStanding(∞) ⇒ 20 EXACTLY — the complementary form `20·(1−1/(1+π))`
 *       makes `1/(1+∞)=0`, never `Inf/Inf ⇒ NaN`, and an isFinite guard returns the ceiling.
 *   D2 (FIXED)  settlePrecision is the CLOSED FORM `π* = 1/(ε̄²+EPS_REL)` — exact for every ε̄²,
 *       no gradient-flow stall; the relative floor caps a near-noiseless plane at PI_MAX instead
 *       of the old absolute-EPS `1e9` ceiling.
 */
import { describe, test, expect } from "vitest";
import {
  precisionToStanding,
  optimalPrecision,
  settlePrecision,
  vfePrecisionTerm,
  gaussianKL,
  freeEnergy,
} from "../src/index.js";

describe("D1 FIXED: precisionToStanding(∞) ⇒ 20 exactly (complementary form + isFinite guard)", () => {
  test("precisionToStanding(Infinity) returns the 20/20 ceiling — NOT NaN", () => {
    // 20·(1−1/(1+π)) with π=Inf ⇒ 20·(1−0) = 20, and the isFinite guard returns the ceiling.
    expect(precisionToStanding(Infinity)).toBe(20);
    // A finite-but-overflowing precision (past Number.MAX_VALUE ⇒ Inf) also lands on the ceiling.
    expect(precisionToStanding(1e308 * 10)).toBe(20);
  });

  test("a LARGE finite precision saturates cleanly (the ceiling holds below ∞)", () => {
    // The internal loop never exceeds ~1/EPS = 1e9, so in-loop it stays finite — the break needs
    // an externally-supplied Inf. Confirm the finite ceiling is well-behaved.
    expect(precisionToStanding(1e9)).toBeGreaterThan(19.999999);
    expect(precisionToStanding(1e9)).toBeLessThanOrEqual(20);
    expect(Number.isFinite(precisionToStanding(1e300))).toBe(true);
  });
});

describe("D2 FIXED: settlePrecision is the closed form π*=1/(ε̄²+EPS_REL) — no stall", () => {
  test("optimalPrecision AND settlePrecision AGREE at π*=1/ε̄² for small ε̄² (closed form, exact)", () => {
    const eps2 = 1e-6;
    // Closed form is exact: π* = 1/(ε̄²+EPS_REL) ≈ 1e6.
    expect(optimalPrecision(eps2)).toBeGreaterThan(9e5);
    // The settler NO LONGER iterates — it returns the same closed form, settled, no stall.
    const s = settlePrecision(eps2);
    expect(s.settled).toBe(true);
    expect(s.precision).toBeGreaterThan(9e5); // reaches ~1e6, not the old ~223 stall
    // closed form and settler now AGREE (to machine precision), not off by 3.5 orders of magnitude.
    expect(s.precision).toBeCloseTo(optimalPrecision(eps2), 6);
  });

  test("the relative floor UNCAPS π* — near-noiseless ε̄²<1e-9 reaches ~1/ε̄², not the old 1e9", () => {
    // The old absolute EPS=1e-9 floor clamped π* at 1e9 for any ε̄²<1e-9. The relative EPS_REL
    // floor lifts it: ε̄²=1e-12 now reaches ~1e12 (order 1/ε̄²), and ε̄²=0 caps at PI_MAX=1/EPS_REL.
    expect(optimalPrecision(1e-12)).toBeGreaterThan(1e11); // ~1e12, NOT ceilinged at 1e9
    expect(optimalPrecision(0)).toBeGreaterThan(1e15); // PI_MAX = 1/Number.EPSILON ≈ 4.5e15
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
