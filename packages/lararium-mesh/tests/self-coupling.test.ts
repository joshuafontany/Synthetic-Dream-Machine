/**
 * self-coupling — the self as the coupling read-out (Bayesian CI). Fusion is a dial by
 * P(common cause); the sovereign estimates are always kept (reversible bind, never a merge).
 */
import { describe, test, expect } from "vitest";
import { pCommonCause, bindCrossSense } from "../src/index.js";

describe("self-coupling — bind by inferred common cause, never merge", () => {
  test("pCommonCause: high correspondence → toward 1, low → toward 0, ambiguous → the prior", () => {
    expect(pCommonCause(0.95, 0.5)).toBeGreaterThan(0.9);
    expect(pCommonCause(0.05, 0.5)).toBeLessThan(0.1);
    expect(pCommonCause(0.5, 0.5)).toBeCloseTo(0.5, 6);     // no evidence → the prior
    expect(pCommonCause(0.5, 0.2)).toBeCloseTo(0.2, 6);     // no evidence → the (low) prior
  });

  test("P(common)=1 FULLY fuses — both senses report the shared estimate", () => {
    const b = bindCrossSense(10, 20, 1);
    expect(b.reportedA).toBeCloseTo(15, 6);                 // fused (equal reliability)
    expect(b.reportedB).toBeCloseTo(15, 6);
    expect(b.reportedA).toBe(b.reportedB);
  });

  test("P(common)=0 FULLY segregates — each sense keeps its own", () => {
    const b = bindCrossSense(10, 20, 0);
    expect(b.reportedA).toBeCloseTo(10, 6);
    expect(b.reportedB).toBeCloseTo(20, 6);
  });

  test("partial P(common) blends, and the SOVEREIGN estimates always ride along (reversible)", () => {
    const b = bindCrossSense(10, 20, 0.5);
    expect(b.reportedA).toBeCloseTo(12.5, 6);               // 0.5·15 + 0.5·10
    expect(b.reportedB).toBeCloseTo(17.5, 6);               // 0.5·15 + 0.5·20
    expect(b.estA).toBe(10);                                // the interiors never lost
    expect(b.estB).toBe(20);                                // → un-bind is costless
  });

  test("reliability weights the fusion — the more reliable sense pulls it", () => {
    const b = bindCrossSense(10, 20, 1, /*relA*/ 3, /*relB*/ 1);
    expect(b.fused).toBeCloseTo((3 * 10 + 1 * 20) / 4, 6);  // = 12.5, nearer the reliable A
    expect(b.reportedA).toBeCloseTo(12.5, 6);
  });
});
