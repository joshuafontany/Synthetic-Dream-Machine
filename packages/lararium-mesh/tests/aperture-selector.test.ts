/**
 * aperture-selector — the EI/causal-emergence scale-selector (arXiv 2502.08261): the same Fisher
 * matrix `AᵀΣ⁻¹A` the drift-lens reads, here read through its SINGULAR SPECTRUM to CHOOSE the
 * aperture band. Verifies the thin linear-Gaussian fit, the γ_α / ΔΓ(ε) gradient, the coarse-graining
 * projector W* + its price, the ladder selector, and the Emergent-Complexity gauge. Gaussian regime.
 */
import { describe, test, expect } from "vitest";
import {
  APERTURE_LADDER,
  fitLinearGaussianBand,
  bandEmergence,
  selectAperture,
  selectApertureFromSignal,
  emergentComplexity,
} from "../src/index.js";

/** Deterministic mulberry32 → a reproducible synthetic signal (no Math.random in a test). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(u: () => number): number {
  return Math.sqrt(-2 * Math.log(Math.max(u(), 1e-12))) * Math.cos(2 * Math.PI * u());
}

describe("fitLinearGaussianBand — the thin Fisher fit", () => {
  test("recovers a known scalar AR(1) transition", () => {
    const u = rng(7);
    const a = 0.8;
    const x: number[] = [0];
    for (let t = 1; t < 400; t++) x.push(a * x[t - 1]! + 0.3 * gauss(u));
    const band = fitLinearGaussianBand(x);
    expect(band.d).toBe(1);
    expect(band.degenerate).toBe(false);
    expect(band.A[0]![0]!).toBeCloseTo(a, 1); // recovered within ~0.1
    expect(band.Sigma[0]![0]!).toBeGreaterThan(0);
  });

  test("recovers a known 2×2 VAR(1) transition", () => {
    const u = rng(11);
    const A = [
      [0.6, 0.1],
      [-0.2, 0.5],
    ];
    const X: number[][] = [[0, 0]];
    for (let t = 1; t < 3000; t++) {
      const p = X[t - 1]!;
      X.push([
        A[0]![0]! * p[0]! + A[0]![1]! * p[1]! + 0.2 * gauss(u),
        A[1]![0]! * p[0]! + A[1]![1]! * p[1]! + 0.2 * gauss(u),
      ]);
    }
    const band = fitLinearGaussianBand(X);
    expect(band.d).toBe(2);
    // recovered within ~0.05 of the true VAR(1) coefficients (finite-sample + noise).
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) expect(Math.abs(band.A[i]![j]! - A[i]![j]!)).toBeLessThan(0.06);
  });

  test("graceful persistence fallback on too-few frames", () => {
    const band = fitLinearGaussianBand([[1, 2], [3, 4]]);
    expect(band.degenerate).toBe(true);
    expect(band.A).toEqual([[1, 0], [0, 1]]); // A = I
    expect(band.d).toBe(2);
  });

  test("empty signal → d=0, degenerate", () => {
    const band = fitLinearGaussianBand([]);
    expect(band.d).toBe(0);
    expect(band.degenerate).toBe(true);
  });
});

describe("bandEmergence — γ_α, the projector W*, the price", () => {
  test("γ, γ(ε), ΔΓ, spectra, projector all finite + coherent", () => {
    const u = rng(3);
    const X: number[][] = [[0, 0, 0]];
    for (let t = 1; t < 300; t++) {
      const p = X[t - 1]!;
      X.push([0.7 * p[0]! + 0.2 * gauss(u), 0.5 * p[1]! + 0.2 * gauss(u), 0.3 * p[2]! + 0.5 * gauss(u)]);
    }
    const e = bandEmergence(fitLinearGaussianBand(X), { alpha: 1, epsilonRel: 1e-2 });
    expect(Number.isFinite(e.gamma)).toBe(true);
    expect(Number.isFinite(e.gammaCoarse)).toBe(true);
    expect(e.deltaGamma).toBeCloseTo(e.gammaCoarse - e.gamma, 12);
    expect(e.fisherSpectrum.length).toBe(3);
    expect(e.precisionSpectrum.length).toBe(3);
    // descending
    for (let i = 1; i < e.fisherSpectrum.length; i++) expect(e.fisherSpectrum[i]!).toBeLessThanOrEqual(e.fisherSpectrum[i - 1]!);
    expect(e.kept + e.dropped).toBe(3);
    expect(e.projector.length).toBe(3); // d rows
    if (e.kept > 0) expect(e.projector[0]!.length).toBe(e.kept); // kept columns
    expect(Number.isFinite(e.price)).toBe(true);
  });

  test("a redundant (collinear) dimension is dropped by coarse-graining, with a price", () => {
    const u = rng(5);
    const X: number[][] = [];
    for (let t = 0; t < 300; t++) {
      const s = t === 0 ? 0 : 0.9 * (X[t - 1]![0]!) + 0.2 * gauss(u);
      X.push([s, s, 0.01 * gauss(u)]); // dim1 ≡ dim0 (collinear), dim2 near-zero
    }
    // a low-rank Fisher: at least one near-zero singular ⇒ dropped at a modest ε.
    const e = bandEmergence(fitLinearGaussianBand(X), { alpha: 1, epsilonRel: 1e-2 });
    expect(e.dropped).toBeGreaterThanOrEqual(1);
    expect(e.projector[0]!.length).toBe(e.kept);
    expect(Number.isFinite(e.price)).toBe(true);
  });
});

describe("selectAperture — the ladder pick + the steer", () => {
  test("picks the emergent (coarse) band on a two-timescale signal", () => {
    // slow random walk changing every 8 steps + fast white noise: fine scale ≈ noise,
    // coarse (×8) scale ≈ a clean, highly-predictable walk ⇒ a coarse band emerges.
    const u = rng(9);
    let s0 = 0;
    let s1 = 0;
    const X: number[][] = [];
    for (let t = 0; t < 512; t++) {
      if (t % 8 === 0) {
        s0 += 0.6 * gauss(u);
        s1 += 0.6 * gauss(u);
      }
      X.push([s0 + 0.9 * gauss(u), s1 + 0.9 * gauss(u)]);
    }
    const sel = selectApertureFromSignal(X, { alpha: 1, epsilonRel: 1e-2 });
    expect(sel.bands.length).toBe(5);
    expect(sel.bands.map((b) => b.band)).toEqual([...APERTURE_LADDER]);
    // the emergent band should NOT be the finest (Pulse) — the slow structure lives coarser.
    expect(sel.emergentIndex).toBeGreaterThan(0);
    expect(["coarser", "finer", "hold"]).toContain(sel.steer);
    // W* of the emergent band has the right shape, and its price is finite.
    expect(Number.isFinite(sel.price)).toBe(true);
    if (sel.projector.length) expect(sel.projector.length).toBe(sel.bands[sel.emergentIndex]!.projector.length);
  });

  test("empty ladder holds", () => {
    const sel = selectAperture([]);
    expect(sel.emergentBand).toBe("hold");
    expect(sel.steer).toBe("hold");
    expect(sel.emergentIndex).toBe(-1);
  });
});

describe("emergentComplexity — the HUD gauge", () => {
  test("top-heavy profile ⇒ low entropy, single scale", () => {
    const g = emergentComplexity([0.9, 0.02, 0.01, 0.0, 0.01]);
    expect(g.singleScale).toBe(true);
    expect(g.dominantIndex).toBe(0);
    expect(g.reading).toBeLessThan(10); // concentrated ⇒ low on the 0..20 register
  });

  test("flat profile ⇒ maximal entropy, spread mesoscale", () => {
    const g = emergentComplexity([0.2, 0.2, 0.2, 0.2, 0.2]);
    expect(g.singleScale).toBe(false);
    expect(g.normalized).toBeCloseTo(1, 6); // uniform ⇒ full entropy
    expect(g.reading).toBeCloseTo(20, 4);
  });

  test("all-zero / empty profile ⇒ 0 (no emergence)", () => {
    expect(emergentComplexity([0, 0, 0]).reading).toBe(0);
    expect(emergentComplexity([]).reading).toBe(0);
    expect(emergentComplexity([]).dominantIndex).toBe(-1);
  });

  test("reading always within the 0..20 register", () => {
    const u = rng(21);
    for (let trial = 0; trial < 50; trial++) {
      const profile = Array.from({ length: 5 }, () => gauss(u));
      const g = emergentComplexity(profile);
      expect(g.reading).toBeGreaterThanOrEqual(0);
      expect(g.reading).toBeLessThanOrEqual(20 + 1e-9);
    }
  });
});
