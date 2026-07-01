/**
 * change-point — detects BOTH mean and variance regime shifts (a mean-only detector would pass
 * a covariance break, which is equally fatal to the Gaussian estimate).
 */
import { describe, test, expect } from "vitest";
import { detectShift } from "../src/index.js";

function gaussGen(seed: number): () => number {
  let s = seed >>> 0;
  const u = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s >>> 0) / 4294967296; };
  return () => Math.sqrt(-2 * Math.log(Math.max(u(), 1e-12))) * Math.cos(2 * Math.PI * u());
}
const seq = (n: number, g: () => number, mu = 0, sd = 1): number[][] =>
  Array.from({ length: n }, () => [mu + sd * g()]);

describe("change-point — reset when the regime breaks", () => {
  test("same regime → not shifted", () => {
    const g = gaussGen(1);
    const r = detectShift(seq(200, g), seq(200, g), 3);
    expect(r.shifted).toBe(false);
    expect(r.score).toBeLessThan(3);
  });

  test("a MEAN shift is detected", () => {
    const g = gaussGen(2);
    const r = detectShift(seq(200, g, 0, 1), seq(200, g, 5, 1), 3);   // +5σ mean move
    expect(r.shifted).toBe(true);
    expect(r.dim).toBe(0);
  });

  test("a VARIANCE shift is detected (the case a mean-only detector would miss)", () => {
    const g = gaussGen(3);
    const r = detectShift(seq(200, g, 0, 1), seq(200, g, 0, 6), 3);   // same mean, 6× spread
    expect(r.shifted).toBe(true);
  });

  test("finds the worst dimension in a vector series", () => {
    const g = gaussGen(4);
    const ref = Array.from({ length: 200 }, () => [g(), g()]);
    const rec = Array.from({ length: 200 }, () => [g(), g() + 6]);    // dim 1 shifted
    const r = detectShift(ref, rec, 3);
    expect(r.shifted).toBe(true);
    expect(r.dim).toBe(1);
  });

  test("empty / tiny windows → not shifted (no false alarm)", () => {
    expect(detectShift([], [], 3).shifted).toBe(false);
    expect(detectShift([[1]], [[9]], 3).shifted).toBe(false);
  });
});
