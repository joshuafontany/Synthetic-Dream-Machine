/**
 * gaussian-cmi — the native closed-form default coupling. Gaussian CMI/TE: independent → ≈0,
 * linear coupling → directed + asymmetric, conditioning removes the common-driver phantom, and
 * it reads continuous VECTOR signals (no discretization).
 */
import { describe, test, expect } from "vitest";
import { gaussianCMI, gaussianConditionalTE } from "../src/index.js";

// seeded standard-normal generator (Box-Muller over an LCG) — reproducible.
function gaussGen(seed: number): () => number {
  let s = seed >>> 0;
  const u = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s >>> 0) / 4294967296; };
  return () => Math.sqrt(-2 * Math.log(Math.max(u(), 1e-12))) * Math.cos(2 * Math.PI * u());
}
const scalarSeq = (n: number, g: () => number): number[][] => Array.from({ length: n }, () => [g()]);

describe("gaussian-cmi — the native closed-form coupling", () => {
  test("gaussianCMI: independent → ≈0; strongly dependent → large", () => {
    const g = gaussGen(1);
    const X = scalarSeq(800, g), Y = scalarSeq(800, g);
    const empty = X.map(() => []);
    expect(Math.abs(gaussianCMI(X, Y, empty))).toBeLessThan(0.05);   // I(X;Y) ≈ 0
    const Ydep = X.map((r) => [r[0]! + 0.05 * g()]);                 // Y ≈ X
    expect(gaussianCMI(X, Ydep, empty)).toBeGreaterThan(2);         // strong MI
  });

  test("a linear coupling (target[t] = source[t-1] + noise) → strong DIRECTED TE, asymmetric", () => {
    const g = gaussGen(3);
    const source = scalarSeq(700, g);
    const target: number[][] = [[g()]];
    for (let t = 1; t < 700; t++) target.push([source[t - 1]![0]! + 0.3 * g()]);
    const forward = gaussianConditionalTE(source, target);   // source informs target's future
    const backward = gaussianConditionalTE(target, source);  // source is iid → nothing back
    expect(forward).toBeGreaterThan(0.5);
    expect(forward).toBeGreaterThan(backward + 0.4);
  });

  test("CONDITIONING removes the common-driver phantom (flow drives who AND authority)", () => {
    const g = gaussGen(7);
    const flow = scalarSeq(800, g);
    // flow hits the two at DIFFERENT lags: who instant, authority delayed → who's past aligns
    // with authority's future through flow (the real phantom). Same-lag from an iid driver has none.
    const who: number[][] = [];
    for (let t = 0; t < 800; t++) who.push([flow[t]![0]! + 0.3 * g()]);           // instant copy
    const authority: number[][] = [[g()]];
    for (let t = 1; t < 800; t++) authority.push([flow[t - 1]![0]! + 0.3 * g()]);  // lag-1 copy
    const pairwise = gaussianConditionalTE(who, authority);              // phantom (shared flow)
    const conditioned = gaussianConditionalTE(who, authority, [flow]);   // flow conditioned out
    expect(pairwise).toBeGreaterThan(0.1);
    expect(conditioned).toBeLessThan(pairwise - 0.05);                   // the phantom shrinks
    expect(conditioned).toBeLessThan(0.15);
  });

  test("reads continuous VECTOR signals (2-D), coupling carried in one dimension", () => {
    const g = gaussGen(11);
    const source: number[][] = Array.from({ length: 700 }, () => [g(), g()]);   // 2-D
    const target: number[][] = [[g(), g()]];
    for (let t = 1; t < 700; t++) target.push([source[t - 1]![0]! + 0.3 * g(), g()]);   // dim-0 coupled
    expect(gaussianConditionalTE(source, target)).toBeGreaterThan(0.3);
  });

  test("independent vector children → TE ≈ 0 (the honest zero)", () => {
    const g = gaussGen(21);
    const a = Array.from({ length: 700 }, () => [g(), g()]);
    const b = Array.from({ length: 700 }, () => [g(), g()]);
    expect(Math.abs(gaussianConditionalTE(a, b))).toBeLessThan(0.1);
  });
});
