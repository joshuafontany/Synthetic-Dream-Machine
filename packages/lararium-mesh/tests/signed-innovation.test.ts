/**
 * signed-innovation — the whitening reduction: an autocorrelated series collapses to its (small,
 * white) increments; white noise passes through; the sign is kept so a real coupling survives.
 */
import { describe, test, expect } from "vitest";
import { signedInnovation, whitenChildren, gaussianConditionalTE, type ChildSignalMV } from "../src/index.js";

function gaussGen(seed: number): () => number {
  let s = seed >>> 0;
  const u = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s >>> 0) / 4294967296; };
  return () => Math.sqrt(-2 * Math.log(Math.max(u(), 1e-12))) * Math.cos(2 * Math.PI * u());
}
const variance = (xs: number[]): number => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length;
};

describe("signed-innovation — whiten to the residual, keep the sign", () => {
  test("a random walk (strongly autocorrelated) whitens to small increments", () => {
    const g = gaussGen(1);
    const rw: number[][] = [[0]];
    for (let t = 1; t < 800; t++) rw.push([rw[t - 1]![0]! + g()]);   // variance grows with t
    const innov = signedInnovation(rw);
    const rawVar = variance(rw.map((r) => r[0]!));
    const innovVar = variance(innov.map((r) => r[0]!));
    expect(innovVar).toBeLessThan(rawVar * 0.5);                     // the predictable part removed
  });

  test("white noise passes through ≈ unchanged (nothing to whiten)", () => {
    const g = gaussGen(2);
    const wn: number[][] = Array.from({ length: 800 }, () => [g()]);
    const innov = signedInnovation(wn);
    const rawVar = variance(wn.map((r) => r[0]!));
    const innovVar = variance(innov.map((r) => r[0]!));
    expect(innovVar).toBeGreaterThan(rawVar * 0.6);                  // ~preserved
  });

  test("per-dimension on vectors; shape preserved", () => {
    const g = gaussGen(3);
    const sig = Array.from({ length: 100 }, () => [g(), g(), g()]);
    const innov = signedInnovation(sig);
    expect(innov.length).toBe(100);
    expect(innov[0]!.length).toBe(3);
  });

  test("a real lagged coupling SURVIVES whitening (the sign is kept)", () => {
    const g = gaussGen(5);
    const who = Array.from({ length: 700 }, () => [g()]);
    const authority: number[][] = [[g()]];
    for (let t = 1; t < 700; t++) authority.push([who[t - 1]![0]! + 0.3 * g()]);
    const [wW, wA] = whitenChildren([
      { name: "who", signal: who }, { name: "authority", signal: authority },
    ] as ChildSignalMV[]);
    // whitened who still informs whitened authority's future
    expect(gaussianConditionalTE(wW!.signal, wA!.signal)).toBeGreaterThan(0.3);
  });
});
