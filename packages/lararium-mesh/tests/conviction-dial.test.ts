/**
 * conviction-dial — the swarm's decay + capture-threshold math. Half-life h → α (never
 * hand-pick α); the decay recurrence + its steady-state cap; the 1Hive convex threshold wall.
 */
import { describe, test, expect } from "vitest";
import {
  alphaFromHalfLife, decayStep, steadyState, captureThreshold,
} from "../src/index.js";

describe("conviction-dial — set the half-life, derive the rate", () => {
  test("alphaFromHalfLife: h=1 → 0.5; larger h → slower decay (α toward 1)", () => {
    expect(alphaFromHalfLife(1)).toBeCloseTo(0.5, 10);
    expect(alphaFromHalfLife(2)).toBeCloseTo(Math.SQRT1_2, 10);   // 0.7071…
    expect(alphaFromHalfLife(100)).toBeGreaterThan(0.99);         // slow standing-clock
    expect(() => alphaFromHalfLife(0)).toThrow(/half-life/);
  });

  test("a value halves after exactly h ticks of pure decay (applied=0)", () => {
    const alpha = alphaFromHalfLife(4);
    let y = 100;
    for (let i = 0; i < 4; i++) y = decayStep(y, 0, alpha);
    expect(y).toBeCloseTo(50, 6);                                 // half-life honored
  });

  test("decayStep + steady-state: constant maintenance caps at y∞ = x/(1-α)", () => {
    const alpha = 0.9;
    let y = 0;
    for (let i = 0; i < 500; i++) y = decayStep(y, 1, alpha);     // constant x=1
    expect(y).toBeCloseTo(steadyState(1, alpha), 4);              // converges to the cap
    expect(steadyState(1, 0.9)).toBeCloseTo(10, 10);             // at α=0.9, warmth tops at 10×
    expect(() => steadyState(1, 1)).toThrow(/alpha/);
  });

  test("two clocks: freshness (short h) caps low, standing (long h) caps high, same maintenance", () => {
    const fresh = alphaFromHalfLife(2);    // rep-freshness decays fast
    const standing = alphaFromHalfLife(50); // earned-standing decays slow
    expect(steadyState(1, standing)).toBeGreaterThan(steadyState(1, fresh));
  });

  test("captureThreshold: a convex wall — cheap while dispersed, Infinity at/over the ceiling β", () => {
    const beta = 0.5, rho = 0.001, S = 1000, alpha = 0.9;
    const low = captureThreshold(0.1, beta, rho, S, alpha);      // power dispersed → low bar
    const high = captureThreshold(0.45, beta, rho, S, alpha);    // one cluster nears β → high bar
    expect(high).toBeGreaterThan(low);
    expect(captureThreshold(0.5, beta, rho, S, alpha)).toBe(Infinity);   // at β — unreachable
    expect(captureThreshold(0.6, beta, rho, S, alpha)).toBe(Infinity);   // over β
  });
});
