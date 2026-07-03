/**
 * nucleation-gate — the critical-nucleus sink-birth gate. Witnesses the behaviors the weird-domain
 * swarm predicted: a saddle (sub-critical dissolves, super-critical is born), supersaturation-adaptive
 * (a burst lowers r*), the drive = cross-plane agreement (unfed / no-agreement never nucleates), the
 * no-parallel-fifths independence guard (correlated planes count once), γ = naming-cost lever, and a
 * continuous condensation order-parameter.
 */
import { describe, expect, test } from "vitest";

import { nucleate, GAMMA_UUID_FIRST, type PlaneSignal } from "../src/nucleation-gate.js";

const P = (agree: number, ...names: string[]): PlaneSignal[] =>
  names.map((plane) => ({ plane, agreement: agree }));

describe("nucleation-gate (critical-nucleus sink-birth)", () => {
  test("a saddle: sub-critical dissolves, super-critical is born", () => {
    const planes = P(0.9, "content", "structure", "form");
    const sub = nucleate({ support: 0.5, planes });
    const sup = nucleate({ support: 50, planes });
    expect(sub.born).toBe(false);   // below r* → dissolve
    expect(sup.born).toBe(true);    // above r* → self-sustains
    expect(sup.criticalRadius).toBeLessThan(Infinity);
  });

  test("no drive → never nucleates (no cross-plane agreement OR unfed island)", () => {
    expect(nucleate({ support: 1e6, planes: P(0, "content", "structure") }).born).toBe(false);
    // an unfed/dilute island (arrivalRate 0) → r*→∞, reap regardless of support
    const unfed = nucleate({ support: 1e6, planes: P(0.9, "content", "structure"), arrivalRate: 0 });
    expect(unfed.born).toBe(false);
    expect(unfed.criticalRadius).toBe(Infinity);
  });

  test("supersaturation-adaptive: a burst lowers r* → born at lower support (the capture-stall cure)", () => {
    const planes = P(0.6, "content", "structure");
    const calm = nucleate({ support: 1, planes, arrivalRate: 1 });
    const burst = nucleate({ support: 1, planes, arrivalRate: 5 });
    expect(burst.criticalRadius).toBeLessThan(calm.criticalRadius); // burst lowers the barrier radius
    expect(burst.born && !calm.born).toBe(true);                    // same support: born only under the burst
  });

  test("the no-parallel-fifths guard: correlated planes count as ONE voice, not two", () => {
    const two = P(0.8, "a", "b");
    const independent = nucleate({ support: 5, planes: two });                                  // 2 voices
    const parallel = nucleate({ support: 5, planes: two, planeCorrelation: [[1, 1], [1, 1]] });  // lockstep → 1 voice
    const single = nucleate({ support: 5, planes: P(0.8, "a") });                                // 1 voice
    expect(parallel.drive).toBeLessThan(independent.drive);         // lockstep does NOT double the drive
    expect(parallel.drive).toBeCloseTo(single.drive, 6);           // it counts as exactly one voice
    expect(independent.drive).toBeCloseTo(2 * single.drive, 6);    // two independent voices genuinely add
  });

  test("γ = naming cost: cheap (UUID-first) lowers r* vs expensive naming", () => {
    const planes = P(0.7, "content", "structure");
    const cheap = nucleate({ support: 3, planes, surfaceCost: GAMMA_UUID_FIRST });
    const dear = nucleate({ support: 3, planes, surfaceCost: 10 });
    expect(cheap.criticalRadius).toBeLessThan(dear.criticalRadius); // cheap γ → smaller barrier radius
    expect(cheap.barrier).toBeLessThan(dear.barrier);               // γ³ in the barrier
  });

  test("condensation is a continuous order-parameter (0.5 at r=r*, monotone in support)", () => {
    const planes = P(0.8, "content", "structure", "form");
    const v = nucleate({ support: 10, planes });
    const atStar = nucleate({ support: v.criticalRadius, planes });
    expect(atStar.condensation).toBeCloseTo(0.5, 6);
    expect(nucleate({ support: 100, planes }).condensation)
      .toBeGreaterThan(nucleate({ support: 1, planes }).condensation);
  });
});
