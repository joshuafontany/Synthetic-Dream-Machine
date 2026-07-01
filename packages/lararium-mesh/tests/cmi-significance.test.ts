/**
 * cmi-significance — the parametric χ² test beneath every Gaussian coupling edge. Verified against
 * textbook χ² critical values; a strong coupling reads significant, the bias floor does not.
 */
import { describe, test, expect } from "vitest";
import { chiSquareSurvival, gaussianCMISignificance, significantCMI } from "../src/index.js";

describe("cmi-significance — never read a raw TE as coupling", () => {
  test("χ² survival matches textbook critical values", () => {
    expect(chiSquareSurvival(3.841, 1)).toBeCloseTo(0.05, 3);   // χ²₁, α=0.05
    expect(chiSquareSurvival(6.635, 1)).toBeCloseTo(0.01, 3);   // χ²₁, α=0.01
    expect(chiSquareSurvival(5.991, 2)).toBeCloseTo(0.05, 3);   // χ²₂, α=0.05
    expect(chiSquareSurvival(7.815, 3)).toBeCloseTo(0.05, 3);   // χ²₃, α=0.05
    expect(chiSquareSurvival(0, 1)).toBe(1);                    // no statistic → certainly null
  });

  test("a strong coupling with ample N reads SIGNIFICANT; a bias-floor trickle does not", () => {
    // 0.3 bits over 700 samples → 2N·0.3·ln2 ≈ 291 on df=1 → p ≈ 0
    expect(gaussianCMISignificance(0.3, 700, 1, 1)).toBeLessThan(1e-6);
    expect(significantCMI(0.3, 700, 1, 1)).toBe(true);
    // a tiny 0.002-bit trickle over 300 samples → not significant
    expect(gaussianCMISignificance(0.002, 300, 1, 1)).toBeGreaterThan(0.05);
    expect(significantCMI(0.002, 300, 1, 1)).toBe(false);
  });

  test("vector dims raise the df, so a weak edge needs more to clear the same α", () => {
    const p1 = gaussianCMISignificance(0.02, 400, 1, 1);   // df = 1
    const p9 = gaussianCMISignificance(0.02, 400, 3, 3);   // df = 9 — same G², wider null
    expect(p9).toBeGreaterThan(p1);                        // harder to be significant at higher df
  });

  test("zero / nonpositive coupling is never significant", () => {
    expect(gaussianCMISignificance(0, 500)).toBe(1);
    expect(significantCMI(-0.01, 500)).toBe(false);
  });
});
