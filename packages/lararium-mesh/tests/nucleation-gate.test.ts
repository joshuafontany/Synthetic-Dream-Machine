/**
 * nucleation-gate — the critical-nucleus sink-birth gate, hardened per the QA swap-dialectic. Witnesses:
 * the saddle, the (voices−1) single-plane guard (lone voice never nucleates), supersaturation-adaptivity,
 * the no-parallel-fifths guard (lockstep = one voice → zero drive), SIGNED-ρ anti-correlation (counts as
 * MORE voices), the γ naming-cost lever, saturation, and fail-loud on garbage/ragged input.
 */
import { describe, expect, test } from "vitest";

import { nucleate, GAMMA_UUID_FIRST, type PlaneSignal } from "../src/nucleation-gate.js";

const P = (agree: number, ...names: string[]): PlaneSignal[] =>
  names.map((plane) => ({ plane, agreement: agree }));

describe("nucleation-gate (critical-nucleus sink-birth, hardened)", () => {
  test("a saddle: sub-critical dissolves, super-critical is born", () => {
    const planes = P(0.9, "content", "structure", "form");
    expect(nucleate({ support: 0.3, planes }).born).toBe(false);
    expect(nucleate({ support: 50, planes }).born).toBe(true);
  });

  test("the single-plane frequency trap is BLOCKED — a lone voice never nucleates", () => {
    const v = nucleate({ support: 1e6, planes: P(1.0, "only-one") });
    expect(v.born).toBe(false);      // (voices−1) = 0 → zero drive, regardless of support
    expect(v.drive).toBe(0);
    expect(v.voices).toBe(1);
  });

  test("no drive → never nucleates (no agreement OR unfed island)", () => {
    expect(nucleate({ support: 1e6, planes: P(0, "a", "b") }).born).toBe(false);
    const unfed = nucleate({ support: 1e6, planes: P(0.9, "a", "b"), arrivalRate: 0 });
    expect(unfed.born).toBe(false);
    expect(unfed.criticalRadius).toBe(Infinity);
  });

  test("supersaturation-adaptive: a burst lowers r* → born at lower support (the capture-stall cure)", () => {
    const planes = P(0.6, "content", "structure");
    const calm = nucleate({ support: 2, planes, arrivalRate: 1 });
    const burst = nucleate({ support: 2, planes, arrivalRate: 5 });
    expect(burst.criticalRadius).toBeLessThan(calm.criticalRadius);
    expect(burst.born && !calm.born).toBe(true);
  });

  test("no-parallel-fifths: lockstep planes collapse to ONE voice → zero drive (not born)", () => {
    const two = P(0.8, "a", "b");
    const independent = nucleate({ support: 5, planes: two });
    const parallel = nucleate({ support: 5, planes: two, planeCorrelation: [[1, 1], [1, 1]] });
    expect(independent.voices).toBeCloseTo(2, 6);
    expect(parallel.voices).toBeCloseTo(1, 6);       // lockstep → one voice
    expect(parallel.drive).toBe(0);                  // (1−1) → zero drive
    expect(parallel.born).toBe(false);
    expect(independent.born).toBe(true);
  });

  test("SIGNED anti-correlation counts as MORE independent voices (corroboration), never one", () => {
    const two = P(0.8, "a", "b");
    const indep = nucleate({ support: 5, planes: two });
    const anti = nucleate({ support: 5, planes: two, planeCorrelation: [[1, -1], [-1, 1]] });
    expect(anti.voices).toBeGreaterThan(indep.voices);   // ρ<0 → >n voices (PSD-floored, finite)
    expect(Number.isFinite(anti.voices)).toBe(true);     // never diverges
    expect(anti.drive).toBeGreaterThan(indep.drive);
  });

  test("γ = naming cost: cheap (UUID-first) lowers r* + barrier vs expensive naming", () => {
    const planes = P(0.7, "content", "structure");
    const cheap = nucleate({ support: 5, planes, surfaceCost: GAMMA_UUID_FIRST });
    const dear = nucleate({ support: 5, planes, surfaceCost: 10 });
    expect(cheap.criticalRadius).toBeLessThan(dear.criticalRadius);
    expect(cheap.barrier).toBeLessThan(dear.barrier);
  });

  test("saturation is continuous (0.5 at r=r*, monotone in support)", () => {
    const planes = P(0.8, "content", "structure", "form");
    const v = nucleate({ support: 10, planes });
    expect(nucleate({ support: v.criticalRadius, planes }).condensation).toBeCloseTo(0.5, 6);
    expect(nucleate({ support: 100, planes }).condensation)
      .toBeGreaterThan(nucleate({ support: 1, planes }).condensation);
  });

  test("fail loud: garbage input → invalid (never a deceptive born:false); ragged matrix throws", () => {
    expect(nucleate({ support: NaN, planes: P(0.9, "a", "b") }).invalid).toBe(true);
    expect(nucleate({ support: 5, planes: P(0.9, "a", "b"), arrivalRate: Infinity }).invalid).toBe(true);
    // a non-finite agreement is clamped to 0 (not fatal), yielding a valid non-born verdict:
    expect(nucleate({ support: 5, planes: [{ plane: "a", agreement: NaN }, { plane: "b", agreement: 0.9 }] }).invalid).toBe(false);
    // negative support clamps to 0 → sub-critical, not born (not invalid):
    expect(nucleate({ support: -5, planes: P(0.9, "a", "b") }).born).toBe(false);
    // a wrong-shaped correlation matrix fails LOUD:
    expect(() => nucleate({ support: 5, planes: P(0.9, "a", "b", "c"), planeCorrelation: [[1, 1]] })).toThrow(/planeCorrelation/);
  });
});
