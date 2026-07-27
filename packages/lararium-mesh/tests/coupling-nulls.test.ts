// The two coupling nulls (S0, the keystone): a null must PRESERVE what it claims and BREAK only the
// direction under test. The swap — circular-shift on a CONDITIONAL question — is the measured
// anti-conservatism; this suite reproduces its direction and certifies each null's invariant.
import { describe, test, expect } from "vitest";
import { circularShiftSource, localPermutationNull, lag1Autocorr, makeRng } from "../src/null-harness.js";
import { gaussianConditionalTE } from "../src/gaussian-cmi.js";
import { recentredCMISignificance, gaussianCMISignificance } from "../src/cmi-significance.js";

// deterministic AR(1) + Box-Muller gaussian (self-contained; mirrors couple-oracle's LCG idiom).
function gen(seed: number) {
  let s = seed >>> 0;
  const u = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const g = () => Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u());
  return { u, g };
}

// common-driver system: Z drives BOTH X and Y; NO direct X→Y. So TE(X→Y | Z) ≈ 0 truthfully.
function commonDriver(T: number, seed: number) {
  const { g } = gen(seed);
  const z: number[] = [g()];
  for (let t = 1; t < T; t++) z.push(0.7 * z[t - 1]! + g());
  const x: number[][] = [], y: number[][] = [], zc: number[][] = [];
  for (let t = 1; t < T; t++) {
    x.push([0.8 * z[t - 1]! + 0.5 * g()]);   // X ← Z_{t-1}
    y.push([0.8 * z[t - 1]! + 0.5 * g()]);   // Y ← Z_{t-1} (same driver, no X term)
    zc.push([z[t - 1]!]);
  }
  return { x, y, z: zc };
}

describe("S0 · circularShiftSource — the BIVARIATE null preserves source dynamics", () => {
  test("preserves the amplitude multiset exactly (a rotation of the same samples)", () => {
    const { g } = gen(11);
    const series = Array.from({ length: 200 }, () => g());
    const shifted = circularShiftSource(series, makeRng(7), { minShift: 10 });
    expect([...shifted].sort((a, b) => a - b)).toEqual([...series].sort((a, b) => a - b));
  });

  test("preserves the lag-1 autocorrelation within tolerance (the whole point over iid-shuffle)", () => {
    const { g } = gen(3);
    const series: number[] = [g()];
    for (let t = 1; t < 400; t++) series.push(0.7 * series[t - 1]! + g()); // strongly autocorrelated
    const ac0 = lag1Autocorr(series);
    const acS = lag1Autocorr(circularShiftSource(series, makeRng(42), { minShift: 20 }));
    // one wrap-shore in 400 points perturbs the estimate only slightly — the autocorrelation SURVIVES.
    expect(Math.abs(acS - ac0)).toBeLessThan(0.05);
    expect(acS).toBeGreaterThan(0.5); // and stays strongly correlated (iid-shuffle would drop it to ≈0)
  });
});

describe("S0 · localPermutationNull — the CONDITIONAL null preserves p(X|Z)", () => {
  test("permuted-X keeps its Z-alignment: corr(X_perm, Z) stays near corr(X, Z), not near 0", () => {
    const { x, z } = commonDriver(300, 5);
    const xf = x.map((r) => r[0]!), zf = z.map((r) => r[0]!);
    const corr = (a: number[], b: number[]) => {
      const ma = a.reduce((s, v) => s + v, 0) / a.length, mb = b.reduce((s, v) => s + v, 0) / b.length;
      let n = 0, da = 0, db = 0;
      for (let i = 0; i < a.length; i++) { n += (a[i]! - ma) * (b[i]! - mb); da += (a[i]! - ma) ** 2; db += (b[i]! - mb) ** 2; }
      return n / Math.sqrt(da * db);
    };
    const xPerm = localPermutationNull(xf, z, makeRng(9), { kPerm: 5 });
    const c0 = Math.abs(corr(xf, zf)), cP = Math.abs(corr(xPerm, zf));
    expect(c0).toBeGreaterThan(0.6);        // the real X-Z coupling is strong
    expect(cP).toBeGreaterThan(0.5 * c0);   // local-permutation KEEPS most of it (an iid-shuffle would kill it)
  });
});

describe("S1 · recentred χ² significance — the Miller-Madow anti-conservatism cure", () => {
  test("a biased-high null recenters: the recentred p exceeds the raw parametric p (less over-rejection)", () => {
    const n = 200;
    // an observed CMI at a modest positive value, against a NULL whose mean statistic sits ABOVE df (the
    // finite-sample bias): E[G²] > 1 means the raw χ²(1) tail treats ordinary noise as a significant edge.
    const observedBits = 0.02;
    const surrogate = Array.from({ length: 60 }, (_, i) => 0.012 + 0.004 * Math.sin(i)); // biased-high null
    const rawP = gaussianCMISignificance(observedBits, n, 1, 1);
    const recP = recentredCMISignificance(observedBits, n, surrogate, 1, 1);
    expect(recP).toBeGreaterThan(rawP);        // recentring RAISES the p-value → refuses the false edge
    expect(recP).toBeLessThanOrEqual(1);
  });

  test("no surrogates ⇒ falls back to the raw parametric tail (no free recentring)", () => {
    const raw = gaussianCMISignificance(0.05, 300, 1, 1);
    const rec = recentredCMISignificance(0.05, 300, [], 1, 1);
    expect(rec).toBeCloseTo(raw, 12);
  });
});

describe("S0 · the swap-error: the WRONG null over-rejects the conditional question", () => {
  test("on a common-driver system (X⊥Y|Z), local-permutation rejects LESS than circular-shift", () => {
    const SEEDS = 8, TRIALS = 40, alpha = 0.1;
    let rejLocal = 0, rejCircular = 0;
    for (let s = 0; s < SEEDS; s++) {
      const { x, y, z } = commonDriver(160, 100 + s);
      const observed = gaussianConditionalTE(x, y, z);      // truthfully ≈ 0 (no direct X→Y)
      const rng = makeRng(9000 + s);
      const nullLocal: number[] = [], nullCirc: number[] = [];
      for (let t = 0; t < TRIALS; t++) {
        const xL = localPermutationNull(x.map((r) => r[0]!), z, rng, { kPerm: 5 }).map((v) => [v]);
        nullLocal.push(gaussianConditionalTE(xL, y, z));
        const xC = circularShiftSource(x.map((r) => r[0]!), rng, { minShift: 20 }).map((v) => [v]);
        nullCirc.push(gaussianConditionalTE(xC, y, z));
      }
      const pL = (nullLocal.filter((v) => v >= observed).length + 1) / (TRIALS + 1);
      const pC = (nullCirc.filter((v) => v >= observed).length + 1) / (TRIALS + 1);
      if (pL < alpha) rejLocal++;
      if (pC < alpha) rejCircular++;
    }
    // the swap-error direction: the wrong (circular) null on the conditional question rejects the true
    // null MORE than the correct (local-permutation) null. Local-permutation stays near-calibrated.
    expect(rejCircular).toBeGreaterThanOrEqual(rejLocal);
    expect(rejLocal).toBeLessThanOrEqual(Math.ceil(SEEDS * 0.25)); // local-perm holds near α, not inflated
  });
});
