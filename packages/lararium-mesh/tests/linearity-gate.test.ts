/**
 * linearity-gate — the Tier-0 screen: a linear relationship stays on the Gaussian default; a
 * nonlinear one (dCor-gap) or a heavy-tailed innovation (excess-kurtosis) escalates toward KSG.
 */
import { describe, test, expect } from "vitest";
import { pearson, distanceCorrelation, excessKurtosis, linearityGate } from "../src/index.js";

function gaussGen(seed: number): () => number {
  let s = seed >>> 0;
  const u = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s >>> 0) / 4294967296; };
  return () => Math.sqrt(-2 * Math.log(Math.max(u(), 1e-12))) * Math.cos(2 * Math.PI * u());
}

describe("linearity-gate — Tier-0 screen (effect-size, not raw p)", () => {
  test("pearson & distanceCorrelation basics", () => {
    const g = gaussGen(1);
    const x = Array.from({ length: 300 }, () => g());
    const yLin = x.map((v) => 2 * v + 0.01 * g());
    expect(Math.abs(pearson(x, yLin))).toBeGreaterThan(0.99);
    expect(distanceCorrelation(x, yLin)).toBeGreaterThan(0.9);
    const yInd = Array.from({ length: 300 }, () => g());
    expect(distanceCorrelation(x, yInd)).toBeLessThan(0.2);          // independent → ~0
  });

  test("excessKurtosis: Gaussian ≈ 0, heavy-tailed ≫ 0", () => {
    const g = gaussGen(2);
    expect(Math.abs(excessKurtosis(Array.from({ length: 2000 }, () => g())))).toBeLessThan(0.5);
    const heavy = Array.from({ length: 2000 }, () => { const z = g(); return z * z * z; });   // cubed → heavy tails
    expect(excessKurtosis(heavy)).toBeGreaterThan(3);
  });

  test("a LINEAR relationship stays on the Gaussian default (no escalation)", () => {
    const g = gaussGen(3);
    const x = Array.from({ length: 400 }, () => g());
    const y = x.map((v) => 1.5 * v + 0.2 * g());
    const r = linearityGate(x, y);
    expect(r.escalate).toBe(false);
    expect(r.dCorGap).toBeLessThan(0.1);
    expect(r.excessKurtosis).toBeLessThan(1);
  });

  test("a NONLINEAR relationship (y = x²) escalates — Pearson ≈ 0 but dCor sees it", () => {
    const g = gaussGen(4);
    const x = Array.from({ length: 400 }, () => g());
    const y = x.map((v) => v * v + 0.1 * g());          // symmetric → Pearson ≈ 0
    const r = linearityGate(x, y);
    expect(Math.abs(pearson(x, y))).toBeLessThan(0.2);   // linear correlation blind to it
    expect(r.dCorGap).toBeGreaterThan(0.1);              // dCor sees the dependence
    expect(r.escalate).toBe(true);
  });

  test("a heavy-tailed INNOVATION escalates via excess-kurtosis (effect size, not p)", () => {
    const g = gaussGen(5);
    const x = Array.from({ length: 400 }, () => g());
    const y = x.map((v) => { const z = g(); return 2 * v + z * z * z; });   // linear + heavy-tailed noise
    const r = linearityGate(x, y);
    expect(r.excessKurtosis).toBeGreaterThan(1);
    expect(r.escalate).toBe(true);
  });
});
