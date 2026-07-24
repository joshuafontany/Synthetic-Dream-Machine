/**
 * sensorium-pc — ADVERSARIAL / property-based attack on the −ln π precision term + the KL
 * complexity (The-Sword QA, 2026-07-01). Many random + adversarial cases per invariant; the
 * invariant must NEVER break.
 *
 * RESOLVED (2026-07-01): {@link settlePrecision}'s gradient flow used to be non-contractive for
 * meanSqErr ≳ 2.83 (STALL / divergence to the wrong boundary). The settle is now the analytic
 * closed form π* = 1/(ε̄²+EPS_REL) — no iteration, no stall — so the "converges from either side"
 * invariant holds for EVERY ε̄² (the block below asserts it directly).
 */

import { describe, test, expect } from "vitest";
import {
  vfePrecisionTerm, optimalPrecision, settlePrecision,
  planePc, gaussianKL, temporalKL,
} from "../src/index.js";

// deterministic RNG (mulberry32) — seeded, so a break reproduces.
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const RUNS = 400;

// ── the −ln π precision term: strict convexity + unique interior optimum (random ε̄) ─────────

describe("vfePrecisionTerm — strictly convex, unique interior optimum at 1/ε̄² (property)", () => {
  test("optimalPrecision = 1/ε̄² and IS the min, reached from either side, for random ε̄²", () => {
    const u = rng(101);
    for (let i = 0; i < RUNS; i++) {
      const m = 0.01 + u() * 20; // ε̄² across a broad realistic-and-beyond range
      const star = optimalPrecision(m);
      expect(star).toBeCloseTo(1 / m, 9);
      const fStar = vfePrecisionTerm(star, m);
      // neighbours on BOTH sides carry strictly higher free energy (a true trough)
      for (const scale of [0.5, 0.9, 1.1, 2]) {
        expect(vfePrecisionTerm(star * scale, m)).toBeGreaterThan(fStar - 1e-12);
      }
    }
  });

  test("strict convexity — the midpoint sits below the chord (Jensen), any random triple", () => {
    const u = rng(202);
    for (let i = 0; i < RUNS; i++) {
      const m = 0.01 + u() * 20;
      const a = 1e-3 + u() * 50;
      const b = 1e-3 + u() * 50;
      if (Math.abs(a - b) < 1e-6) continue;
      const mid = 0.5 * (a + b);
      const chord = 0.5 * (vfePrecisionTerm(a, m) + vfePrecisionTerm(b, m));
      expect(vfePrecisionTerm(mid, m)).toBeLessThan(chord + 1e-12);
    }
  });

  test("gradient ½(ε̄² − 1/π) has exactly ONE sign change (no second optimum): −left, +right", () => {
    const u = rng(303);
    for (let i = 0; i < RUNS; i++) {
      const m = 0.01 + u() * 20;
      const star = 1 / m;
      const grad = (p: number) => 0.5 * (m - 1 / p);
      expect(grad(star * 0.5)).toBeLessThan(0); // below the optimum ⇒ push up
      expect(grad(star * 2)).toBeGreaterThan(0); // above ⇒ push down
      expect(Math.abs(grad(star))).toBeLessThan(1e-9); // stationary AT the optimum
    }
  });
});

// ── the settle FLOW: the invariant that is claimed ("converges from either side") ────────────

describe("settlePrecision — the SAFE region where the flow genuinely converges", () => {
  test("ε̄² ∈ [0.1, 2.7] with the default start: settles to π* = 1/ε̄² (holds)", () => {
    const u = rng(404);
    for (let i = 0; i < RUNS; i++) {
      const m = 0.1 + u() * 2.6; // inside the contractive region (default init = 1)
      const star = 1 / m;
      const r = settlePrecision(m); // the natural call — default init = 1
      expect(r.settled).toBe(true);
      expect(r.precision).toBeCloseTo(star, 3);
    }
  });
});

describe("settlePrecision — the CLOSED FORM converges for EVERY ε̄² (Defect 2 FIXED, 2026-07-01)", () => {
  // The old fixed-lr gradient flow was non-contractive for ε̄² ≳ 2.83 (stalled / diverged to the
  // WRONG boundary). The settle is now the analytic optimum π* = 1/(ε̄²+EPS_REL) — no flow, no stall.
  test("the DEFAULT call settlePrecision(ε̄²) settles at π* = 1/ε̄² for every ε̄² ∈ {5,8,10,20,50}", () => {
    for (const m of [5, 8, 10, 20, 50]) {
      const r = settlePrecision(m);
      expect(r.settled).toBe(true); // closed form — always settled, no runaway
      expect(r.precision).toBeCloseTo(1 / m, 6); // lands ON π* = 1/ε̄² (not the 2.5e8 boundary)
      expect(Math.abs(r.grad)).toBeLessThan(1e-9); // gradient vanishes AT the optimum
    }
  });

  test("ε̄² = 3 (the old STALL point) settles cleanly at π* = 1/3", () => {
    const r = settlePrecision(3);
    expect(r.settled).toBe(true);
    expect(r.precision).toBeCloseTo(1 / 3, 6);
  });

  // THE INTENDED INVARIANT the module docstring PROMISES — now delivered, a real assertion.
  test("settles to 1/ε̄² for EVERY ε̄² up to 50 (was known-broken above ~2.83)", () => {
    for (const m of [0.25, 1, 2, 3, 5, 10, 50]) {
      const r = settlePrecision(m);
      expect(r.settled).toBe(true);
      expect(r.precision).toBeCloseTo(1 / m, 6);
    }
  });
});

// ── the −ln π penalty is INERT in estimate mode (gain 1 ⇒ penalty 0), for ANY signal ────────

describe("logPrecisionPenalty — inert at gain 1 (bottom-up estimate), lit only by a vow", () => {
  test("no confidence vow ⇒ gain === 1 and the −½ln π penalty === 0, for random signals", () => {
    const u = rng(505);
    for (let i = 0; i < RUNS; i++) {
      const n = 2 + Math.floor(u() * 60);
      const sig = Array.from({ length: n }, () => (u() - 0.5) * (1 + u() * 100));
      const r = planePc(sig, u() < 0.5 ? { model: "ewma" } : { model: "ar1" });
      expect(r.precision).toBe(1);
      expect(r.confidence).toBeNull(); // no vow ⇒ confidence null (standing carries the measure)
      expect(Math.abs(r.logPrecisionPenalty)).toBe(0); // exactly inert (±0 both accepted)
    }
  });

  test("a top-down vow lights the penalty with the correct SIGN (over-confident ⇒ < 0)", () => {
    const u = rng(606);
    for (let i = 0; i < 200; i++) {
      const n = 8 + Math.floor(u() * 40);
      const sig = Array.from({ length: n }, () => (u() - 0.5) * 4);
      const conf = 11 + u() * 8; // > 10 ⇒ gain > 1 ⇒ penalty < 0 (regularizing)
      const r = planePc(sig, { confidence: conf });
      expect(r.confidence).toBeCloseTo(conf, 9); // the vow rides the confidence field
      expect(r.logPrecisionPenalty).toBeLessThan(1e-12);
    }
  });
});

// ── the KL complexity ≥ 0 always; temporal KL = 0 iff no belief movement ─────────────────────

describe("KL complexity — non-negative always; temporalKL = 0 iff the belief never moves", () => {
  test("gaussianKL ≥ 0 for random law pairs (a divergence is never negative)", () => {
    const u = rng(707);
    for (let i = 0; i < RUNS; i++) {
      const muQ = (u() - 0.5) * 20, muP = (u() - 0.5) * 20;
      const varQ = 1e-3 + u() * 50, varP = 1e-3 + u() * 50;
      expect(gaussianKL(muQ, varQ, muP, varP)).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  test("temporalKL ≥ 0 always; == 0 on a CONSTANT belief, > 0 as soon as it moves", () => {
    const u = rng(808);
    for (let i = 0; i < RUNS; i++) {
      const n = 2 + Math.floor(u() * 30);
      const c = (u() - 0.5) * 100;
      expect(temporalKL(new Array(n).fill(c), 1e-3 + u() * 5)).toBeCloseTo(0, 9);
      const moving = Array.from({ length: n }, () => (u() - 0.5) * 100);
      const kl = temporalKL(moving, 1);
      expect(kl).toBeGreaterThanOrEqual(0);
      // a genuine step guarantees strictly positive movement cost
      const stepped = [0, 0, 5, 5];
      expect(temporalKL(stepped, 1)).toBeGreaterThan(0);
    }
  });

  test("planePc's complexityKL (temporal prior) ≥ 0 for random single/multi-dim planes", () => {
    const u = rng(909);
    for (let i = 0; i < RUNS; i++) {
      const n = 2 + Math.floor(u() * 40);
      const dims = 1 + Math.floor(u() * 3);
      const sig = Array.from({ length: n }, () =>
        Array.from({ length: dims }, () => (u() - 0.5) * (1 + u() * 50)),
      );
      const r = planePc(sig, u() < 0.5 ? { model: "ewma" } : { model: "ar1" });
      expect(r.complexityKL).toBeGreaterThanOrEqual(-1e-9);
      expect(Number.isFinite(r.complexityKL)).toBe(true);
    }
  });
});
