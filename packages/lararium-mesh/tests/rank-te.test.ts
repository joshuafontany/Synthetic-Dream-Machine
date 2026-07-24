/**
 * rank-te — the order-reading escalation. Bandt-Pompe ordinal symbolization stays invariant under a
 * monotone re-scaling, so symbolic TE catches a monotone-nonlinear or heavy-tailed coupling the
 * Gaussian default (TE = GC/2) under-reads: a monotone unidirectional drive reads TE(x→y) ≫ TE(y→x)
 * and > 0, independent streams land ≈0 inside the surrogate cloud, and where heavy-tailed noise
 * dilutes the Gaussian covariance the ordinal read still clears its shuffled-source null.
 */
import { describe, test, expect } from "vitest";
import {
  ordinalSymbolize,
  rankTransferEntropy,
  rankConditionalTransferEntropy,
  gaussianConditionalTE,
} from "../src/index.js";

// seeded standard-normal generator (Box-Muller over an LCG) — reproducible.
function gaussGen(seed: number): () => number {
  let s = seed >>> 0;
  const u = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s >>> 0) / 4294967296; };
  return () => Math.sqrt(-2 * Math.log(Math.max(u(), 1e-12))) * Math.cos(2 * Math.PI * u());
}

describe("rank-te — Bandt-Pompe symbolic transfer entropy", () => {
  test("ordinalSymbolize: a monotone series collapses to one pattern; descending hits the max", () => {
    const asc = ordinalSymbolize([1, 2, 3, 4, 5], 3, 1);
    expect(asc).toEqual([0, 0, 0]); // every ascending window is the identity permutation → index 0
    const desc = ordinalSymbolize([5, 4, 3, 2, 1], 3, 1);
    expect(desc).toEqual([5, 5, 5]); // every descending window is the reversal → index m!−1 = 5
  });

  test("ordinalSymbolize: invariant under a monotone re-scaling (reads ORDER, not magnitude)", () => {
    const g = gaussGen(9);
    const x = Array.from({ length: 200 }, () => g());
    const monotone = x.map((v) => Math.tanh(3 * v) + 7); // strictly increasing, adds/saturates
    expect(ordinalSymbolize(x, 3, 1)).toEqual(ordinalSymbolize(monotone, 3, 1));
  });

  test("a MONOTONE-NONLINEAR drive (y[t]=x[t-1]³+noise) → TE(x→y) ≫ TE(y→x), and > 0, significant", () => {
    const g = gaussGen(3);
    const N = 800;
    const x = Array.from({ length: N }, () => g());
    const y: number[] = [g()];
    for (let t = 1; t < N; t++) y.push(Math.pow(x[t - 1]!, 3) + 0.3 * g());
    const fwd = rankTransferEntropy(x, y, { order: 3, surrogates: 50, seed: 7 });
    const bwd = rankTransferEntropy(y, x, { order: 3, surrogates: 50, seed: 7 });
    expect(fwd.te).toBeGreaterThan(0.3); // the drive reads strong
    expect(fwd.te).toBeGreaterThan(bwd.te + 0.3); // clearly directed
    expect(fwd.surrogate!.pValue).toBeLessThan(0.05); // clears the shuffled-source null
  });

  test("INDEPENDENT streams → both directions ≈ 0, inside the surrogate cloud (not significant)", () => {
    const g = gaussGen(21);
    const N = 800;
    const x = Array.from({ length: N }, () => g());
    const y = Array.from({ length: N }, () => g());
    const fwd = rankTransferEntropy(x, y, { order: 3, surrogates: 50, seed: 7 });
    const bwd = rankTransferEntropy(y, x, { order: 3, surrogates: 50, seed: 7 });
    expect(Math.abs(fwd.te)).toBeLessThan(0.05);
    expect(Math.abs(bwd.te)).toBeLessThan(0.05);
    expect(fwd.surrogate!.pValue).toBeGreaterThan(0.05); // lands in the null, no false edge
  });

  test("BONUS: heavy-tailed noise makes Gaussian-CMI under-read, but rank-TE catches it", () => {
    const g = gaussGen(3);
    const N = 900;
    const x = Array.from({ length: N }, () => g());
    const y: number[] = [g()];
    for (let t = 1; t < N; t++) {
      const z = g();
      y.push(Math.tanh(3 * x[t - 1]!) + 1.2 * z * z * z); // monotone drive + heavy (cubed) noise
    }
    const gaussTE = gaussianConditionalTE(x.map((v) => [v]), y.map((v) => [v]));
    const rank = rankTransferEntropy(x, y, { order: 3, surrogates: 50, seed: 7 });
    expect(gaussTE).toBeLessThan(0.08); // the heavy tails dilute the Gaussian covariance → misses it
    expect(rank.te).toBeGreaterThan(0.1); // the order read still sees the coupling
    expect(rank.te).toBeGreaterThan(gaussTE * 2); // caught where the default under-read
    expect(rank.surrogate!.pValue).toBeLessThan(0.05); // and it clears the null
  });

  test("Papana rank-vector PARTIAL TE runs and returns a finite conditioned read", () => {
    const g = gaussGen(5);
    const N = 600;
    const x = Array.from({ length: N }, () => g());
    const y: number[] = [g()];
    for (let t = 1; t < N; t++) y.push(Math.pow(x[t - 1]!, 3) + 0.3 * g());
    const z = Array.from({ length: N }, () => g()); // an unrelated third stream
    const partial = rankConditionalTransferEntropy(x, y, z, { order: 3 });
    expect(Number.isFinite(partial.te)).toBe(true);
    expect(partial.te).toBeGreaterThan(0.2); // conditioning on an unrelated stream keeps the real edge
  });
});
