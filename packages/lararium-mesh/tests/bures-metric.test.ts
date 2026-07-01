/**
 * bures-metric — the quantum-info-geometry upgrade of the register-drift step. The SAFETY CASE: with
 * zero coherence (diagonal ρ) the Bures angle collapses EXACTLY to the classical Bhattacharyya /
 * Fisher-Rao step `arccos⟨√p,√q⟩` (< 1e-9). Coherence only SHORTENS the drift (a superposition sits
 * closer than its dephased mixture). PSD is preserved. Voice coherence carries the honest structure.
 */
import { describe, test, expect } from "vitest";
import {
  fidelity,
  sqrtFidelity,
  buresDistance,
  buresAngle,
  diagonalDensity,
  bhattacharyyaAngle,
  bhattacharyyaCoefficient,
  matrixSqrt,
  projectPSDDensity,
  isDensityMatrix,
  voiceCoherenceDensity,
  registerMarginal,
  berryHolonomyImag,
  symmetricEigen,
  type DensityMatrix,
} from "../src/index.js";

/** A few register-points on Δ⁴ (the five confidence bands). */
const P = [0.1, 0.2, 0.4, 0.2, 0.1];
const Q = [0.3, 0.3, 0.2, 0.1, 0.1];
const R = [0.05, 0.15, 0.3, 0.3, 0.2];

function traceOf(m: DensityMatrix): number {
  let t = 0; for (let i = 0; i < m.length; i++) t += m[i]![i]!; return t;
}

describe("bures-metric — the diagonal collapse (the safety case)", () => {
  test("buresAngle(diag p, diag q) === arccos Σ√(p_i q_i) to < 1e-9", () => {
    for (const [a, b] of [[P, Q], [P, R], [Q, R], [P, P]] as const) {
      const bures = buresAngle(diagonalDensity(a), diagonalDensity(b));
      const classical = bhattacharyyaAngle(a, b);
      expect(Math.abs(bures - classical)).toBeLessThan(1e-9);
    }
  });

  test("sqrt-fidelity of diagonal ρ === the Bhattacharyya coefficient (< 1e-9)", () => {
    const rootF = sqrtFidelity(diagonalDensity(P), diagonalDensity(Q));
    expect(Math.abs(rootF - bhattacharyyaCoefficient(P, Q))).toBeLessThan(1e-9);
  });

  test("buresDistance(diag p, diag q) === Hellinger distance of the marginals (< 1e-9)", () => {
    // Hellinger² = Σ (√p − √q)² = 2(1 − BC), so d = √(2(1−BC)) = buresDistance on diagonal ρ.
    let hell2 = 0;
    for (let i = 0; i < P.length; i++) hell2 += (Math.sqrt(P[i]!) - Math.sqrt(Q[i]!)) ** 2;
    const hell = Math.sqrt(hell2);
    expect(Math.abs(buresDistance(diagonalDensity(P), diagonalDensity(Q)) - hell)).toBeLessThan(1e-9);
  });

  test("identical densities ⇒ fidelity 1, distance 0", () => {
    expect(fidelity(diagonalDensity(P), diagonalDensity(P))).toBeCloseTo(1, 12);
    expect(buresDistance(diagonalDensity(P), diagonalDensity(P))).toBeLessThan(1e-9);
    expect(buresAngle(diagonalDensity(P), diagonalDensity(P))).toBeLessThan(1e-9);
  });
});

describe("bures-metric — superposition sits closer than the mixture", () => {
  test("a coherent state is closer to a coherent reference than its dephased mixture", () => {
    // Two register bands (0,1), equal populations. Reference = the coherent superposition |0⟩+|1⟩.
    // ρ_ref = ½[[1,1],[1,1]] (embed in 5×5). ρ_super shares the phase; ρ_mix = diag(½,½) is dephased.
    const n = 5;
    const zero = () => Array.from({ length: n }, () => new Array<number>(n).fill(0));

    const ref = zero();
    ref[0]![0] = 0.5; ref[0]![1] = 0.5; ref[1]![0] = 0.5; ref[1]![1] = 0.5;

    // a genuinely coherent state with the SAME populations but slightly weaker coherence than ref.
    const superpos = zero();
    superpos[0]![0] = 0.5; superpos[0]![1] = 0.45; superpos[1]![0] = 0.45; superpos[1]![1] = 0.5;

    const mix = zero();
    mix[0]![0] = 0.5; mix[1]![1] = 0.5; // same marginal, ZERO coherence.

    // all three are valid densities.
    expect(isDensityMatrix(ref)).toBe(true);
    expect(isDensityMatrix(projectPSDDensity(superpos))).toBe(true);
    expect(isDensityMatrix(mix)).toBe(true);

    const dSuper = buresDistance(ref, projectPSDDensity(superpos));
    const dMix = buresDistance(ref, mix);

    expect(dSuper).toBeLessThan(dMix); // superposition-closer-than-mixture.
    // and the marginals are identical, so the CLASSICAL step cannot tell them apart:
    const pSuper = registerMarginal(projectPSDDensity(superpos));
    const pMix = registerMarginal(mix);
    for (let i = 0; i < n; i++) expect(Math.abs(pSuper[i]! - pMix[i]!)).toBeLessThan(1e-6);
  });

  test("shared coherence raises fidelity above the dephased (same-marginal) baseline", () => {
    // two states with IDENTICAL register marginals; one carries 0↔1 coherence, one is dephased.
    // Against a reference that shares the coherence, the coherent state scores strictly higher
    // fidelity than the dephased one — the classical marginal cannot see the difference.
    const ref = voiceCoherenceDensity([{ amplitudes: [0.7, 0.5, 0.3, 0.2, 0.1] }]); // pure, coherent.
    const coh = voiceCoherenceDensity([
      { amplitudes: [0.6, 0.55, 0.3, 0.2, 0.1] }, // shares the sign/structure of ref's coherence.
      { amplitudes: [0.2, 0.1, 0.25, 0.15, 0.1] },
    ]);
    const p = registerMarginal(coh);
    const dephased = diagonalDensity(p.map((v) => v / p.reduce((a, b) => a + b, 0))); // same marginal, no coherence.
    expect(fidelity(ref, coh)).toBeGreaterThan(fidelity(ref, dephased));
  });
});

describe("bures-metric — PSD is preserved", () => {
  test("matrixSqrt(ρ)² reconstructs ρ (symmetric PSD)", () => {
    const rho = voiceCoherenceDensity([
      { amplitudes: [0.5, 0.4, 0.2, 0.1, 0.0], weight: 2 },
      { amplitudes: [0.1, 0.3, 0.5, 0.3, 0.2] },
    ]);
    const s = matrixSqrt(rho);
    // s·s ≈ rho
    const n = rho.length;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      let v = 0; for (let k = 0; k < n; k++) v += s[i]![k]! * s[k]![j]!;
      expect(Math.abs(v - rho[i]![j]!)).toBeLessThan(1e-8);
    }
  });

  test("voiceCoherenceDensity assembles a valid density (PSD, symmetric, unit trace)", () => {
    const rho = voiceCoherenceDensity([
      { amplitudes: [0.7, 0.5, 0.3, 0.1, 0.0] },
      { amplitudes: [0.0, 0.2, 0.6, 0.4, 0.2], weight: 1.5 },
      { amplitudes: [0.1, 0.1, 0.1, 0.3, 0.9] },
    ]);
    expect(isDensityMatrix(rho)).toBe(true);
    expect(traceOf(rho)).toBeCloseTo(1, 12);
    const { values } = symmetricEigen(rho);
    for (const lam of values) expect(lam).toBeGreaterThan(-1e-9);
  });

  test("projectPSDDensity clamps a negative eigenvalue and renormalizes", () => {
    // a symmetric matrix with a negative eigenvalue (not PSD).
    const bad = [
      [0.5, 0.6, 0, 0, 0],
      [0.6, 0.5, 0, 0, 0],
      [0, 0, 0.2, 0, 0],
      [0, 0, 0, 0.1, 0],
      [0, 0, 0, 0, 0.1],
    ];
    expect(isDensityMatrix(bad)).toBe(false); // eigenvalue 0.5−0.6 < 0.
    const fixed = projectPSDDensity(bad);
    expect(isDensityMatrix(fixed)).toBe(true);
  });
});

describe("bures-metric — the Voice coherence channel (Plurality Pono, honest source)", () => {
  test("one-hot Voices ⇒ a DIAGONAL ρ ⇒ the Bhattacharyya ground (no fabricated coherence)", () => {
    // each Voice pinned to exactly one register (a classical mixture) — off-diagonals must be zero.
    const rho = voiceCoherenceDensity([
      { amplitudes: [1, 0, 0, 0, 0], weight: 0.1 },
      { amplitudes: [0, 1, 0, 0, 0], weight: 0.2 },
      { amplitudes: [0, 0, 1, 0, 0], weight: 0.4 },
      { amplitudes: [0, 0, 0, 1, 0], weight: 0.2 },
      { amplitudes: [0, 0, 0, 0, 1], weight: 0.1 },
    ]);
    const n = rho.length;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i !== j) expect(Math.abs(rho[i]![j]!)).toBeLessThan(1e-12);
    }
    // the diagonal reproduces the weights (the register marginal), so Bures = Bhattacharyya here.
    expect(registerMarginal(rho)).toEqual(
      expect.arrayContaining([expect.closeTo(0.1, 9), expect.closeTo(0.4, 9)]),
    );
    const bAngle = buresAngle(rho, diagonalDensity(Q));
    const cAngle = bhattacharyyaAngle(registerMarginal(rho), Q);
    expect(Math.abs(bAngle - cAngle)).toBeLessThan(1e-9);
  });

  test("a spanning Voice ⇒ a real off-diagonal (coherence lands only where the signal exists)", () => {
    const rho = voiceCoherenceDensity([
      { amplitudes: [0.6, 0.6, 0, 0, 0] }, // spans registers 0↔1.
      { amplitudes: [0, 0, 0.5, 0.5, 0] }, // spans registers 2↔3.
    ]);
    expect(Math.abs(rho[0]![1]!)).toBeGreaterThan(1e-6); // 0↔1 coherence present.
    expect(Math.abs(rho[2]![3]!)).toBeGreaterThan(1e-6); // 2↔3 coherence present.
    expect(Math.abs(rho[0]![2]!)).toBeLessThan(1e-12);   // 0↔2 NOT spanned ⇒ zero (never fabricated).
    expect(Math.abs(rho[1]![4]!)).toBeLessThan(1e-12);   // 1↔4 NOT spanned ⇒ zero.
  });

  test("berryHolonomyImag reads 0 on the real-Hermitian ground (honest null, not a stub)", () => {
    const rho = voiceCoherenceDensity([{ amplitudes: [0.5, 0.5, 0.4, 0.3, 0.2] }]);
    expect(berryHolonomyImag(rho)).toBe(0);
  });
});

describe("bures-metric — input guards", () => {
  test("diagonalDensity rejects a point off the simplex", () => {
    expect(() => diagonalDensity([0.2, 0.2, 0.2, 0.2])).toThrow(/simplex|sums/);
    expect(() => diagonalDensity([0.5, 0.6, 0, 0, -0.1])).toThrow(/negative|simplex|sums/);
  });

  test("voiceCoherenceDensity rejects empty input and mismatched lengths", () => {
    expect(() => voiceCoherenceDensity([])).toThrow(/no Voices/);
    expect(() => voiceCoherenceDensity([{ amplitudes: [1, 0, 0] }])).toThrow(/registers/);
    expect(() => voiceCoherenceDensity([{ amplitudes: [1, 0, 0, 0, 0], weight: -1 }])).toThrow(/weight/);
  });
});
