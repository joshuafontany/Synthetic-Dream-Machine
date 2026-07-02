/**
 * fisher-rao — the flow-lens on the register simplex. Witnesses: the closed-form distance law
 * (uniform↔point-mass = 2·arccos(1/√n); distinct vertices = π), metric axioms spot-checked, geodesic
 * waypoints riding the simplex with proportional arc, trajectory additivity, the windowed drift-read
 * flagging a synthetic regime shift, degenerate honesty (never NaN), and the exact factor-2 agreement
 * with the bures-metric classical step.
 */
import { describe, test, expect } from "vitest";
import {
  assertSimplex,
  smoothSimplex,
  fisherRaoDistance,
  fisherRaoGeodesic,
  trajectoryIncrements,
  trajectoryLength,
  windowedDrift,
  bhattacharyyaAngle,
  type SimplexPoint,
} from "../src/index.js";

/** Register-points on Δ⁴ (the five confidence bands). */
const P = [0.1, 0.2, 0.4, 0.2, 0.1];
const Q = [0.3, 0.3, 0.2, 0.1, 0.1];
const R = [0.05, 0.15, 0.3, 0.3, 0.2];
const UNIFORM = [0.2, 0.2, 0.2, 0.2, 0.2];
const VERTEX0 = [1, 0, 0, 0, 0];
const VERTEX1 = [0, 1, 0, 0, 0];

describe("fisher-rao — closed-form pairs", () => {
  test("uniform ↔ point-mass reads 2·arccos(1/√n) for n = 2..6", () => {
    for (let n = 2; n <= 6; n++) {
      const uniform = new Array<number>(n).fill(1 / n);
      const vertex = new Array<number>(n).fill(0);
      vertex[0] = 1;
      const d = fisherRaoDistance(uniform, vertex);
      expect(Math.abs(d - 2 * Math.acos(1 / Math.sqrt(n)))).toBeLessThan(1e-9);
    }
  });

  test("two distinct point-mass vertices read π exactly (honest degenerate, never NaN)", () => {
    const d = fisherRaoDistance(VERTEX0, VERTEX1);
    expect(Number.isFinite(d)).toBe(true);
    expect(Math.abs(d - Math.PI)).toBeLessThan(1e-12);
  });

  test("identical points read 0; a point-mass against itself reads 0", () => {
    expect(fisherRaoDistance(P, P)).toBeLessThan(1e-9);
    expect(fisherRaoDistance(VERTEX0, VERTEX0)).toBeLessThan(1e-12);
  });

  test("agrees with the bures-metric classical step at exactly factor 2", () => {
    for (const [a, b] of [[P, Q], [P, R], [Q, R], [UNIFORM, VERTEX0]] as const) {
      expect(Math.abs(fisherRaoDistance(a, b) - 2 * bhattacharyyaAngle(a, b))).toBeLessThan(1e-12);
    }
  });
});

describe("fisher-rao — metric axioms (spot checks)", () => {
  test("symmetry: d(p,q) === d(q,p)", () => {
    for (const [a, b] of [[P, Q], [P, R], [Q, R]] as const) {
      expect(Math.abs(fisherRaoDistance(a, b) - fisherRaoDistance(b, a))).toBeLessThan(1e-12);
    }
  });

  test("triangle inequality: d(p,r) ≤ d(p,q) + d(q,r) across the sample points", () => {
    const pts = [P, Q, R, UNIFORM, VERTEX0, VERTEX1];
    for (const a of pts) for (const b of pts) for (const c of pts) {
      expect(fisherRaoDistance(a, c)).toBeLessThanOrEqual(
        fisherRaoDistance(a, b) + fisherRaoDistance(b, c) + 1e-9,
      );
    }
  });

  test("bounds: every distance lands in [0, π]", () => {
    const pts = [P, Q, R, UNIFORM, VERTEX0, VERTEX1];
    for (const a of pts) for (const b of pts) {
      const d = fisherRaoDistance(a, b);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(Math.PI + 1e-12);
    }
  });
});

describe("fisher-rao — the geodesic", () => {
  test("endpoints: γ(0) = p, γ(1) = q", () => {
    const g0 = fisherRaoGeodesic(P, Q, 0);
    const g1 = fisherRaoGeodesic(P, Q, 1);
    for (let i = 0; i < P.length; i++) {
      expect(Math.abs(g0[i]! - P[i]!)).toBeLessThan(1e-9);
      expect(Math.abs(g1[i]! - Q[i]!)).toBeLessThan(1e-9);
    }
  });

  test("every waypoint rides the simplex and splits the arc proportionally", () => {
    const dPQ = fisherRaoDistance(P, Q);
    for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const g = fisherRaoGeodesic(P, Q, t);
      assertSimplex(g); // on Δ, or this throws.
      expect(Math.abs(fisherRaoDistance(P, g) - t * dPQ)).toBeLessThan(1e-9);
      expect(Math.abs(fisherRaoDistance(g, Q) - (1 - t) * dPQ)).toBeLessThan(1e-9);
    }
  });

  test("fused endpoints degenerate honestly: γ(t) = p, never NaN", () => {
    const g = fisherRaoGeodesic(P, P, 0.5);
    for (let i = 0; i < P.length; i++) {
      expect(Number.isFinite(g[i]!)).toBe(true);
      expect(Math.abs(g[i]! - P[i]!)).toBeLessThan(1e-9);
    }
  });

  test("extrapolation fails loud (t outside [0,1])", () => {
    expect(() => fisherRaoGeodesic(P, Q, -0.1)).toThrow(/interpolates on \[0, 1\]/);
    expect(() => fisherRaoGeodesic(P, Q, 1.5)).toThrow(/interpolates on \[0, 1\]/);
  });
});

describe("fisher-rao — the walk measure", () => {
  test("trajectory additivity: length over geodesic waypoints === the endpoint distance", () => {
    const walk = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => fisherRaoGeodesic(P, Q, t));
    expect(Math.abs(trajectoryLength(walk) - fisherRaoDistance(P, Q))).toBeLessThan(1e-9);
  });

  test("length(a→b→c) === length(a→b) + length(b→c)", () => {
    const whole = trajectoryLength([P, Q, R]);
    const split = trajectoryLength([P, Q]) + trajectoryLength([Q, R]);
    expect(Math.abs(whole - split)).toBeLessThan(1e-12);
  });

  test("increments match pairwise distances, one per step", () => {
    const inc = trajectoryIncrements([P, Q, R, UNIFORM]);
    expect(inc).toHaveLength(3);
    expect(Math.abs(inc[0]! - fisherRaoDistance(P, Q))).toBeLessThan(1e-12);
    expect(Math.abs(inc[1]! - fisherRaoDistance(Q, R))).toBeLessThan(1e-12);
    expect(Math.abs(inc[2]! - fisherRaoDistance(R, UNIFORM))).toBeLessThan(1e-12);
  });

  test("zero-length walks read honestly: [] increments, length 0, never NaN", () => {
    expect(trajectoryIncrements([])).toEqual([]);
    expect(trajectoryIncrements([P])).toEqual([]);
    expect(trajectoryLength([])).toBe(0);
    expect(trajectoryLength([P])).toBe(0);
  });
});

describe("fisher-rao — the windowed drift-read (the drift-lens primitive)", () => {
  test("a synthetic regime shift — flat walk → jump → flat — spikes the window at the jump", () => {
    // 4 turns resting at P, one jump to R, 4 turns resting at R.
    const walk: SimplexPoint[] = [P, P, P, P, R, R, R, R, R];
    const readings = windowedDrift(walk, 3);
    const speeds = readings.map((r) => r.speed);
    // windows fully inside a flat regime read speed 0…
    expect(speeds[0]).toBeLessThan(1e-12); // P P P
    expect(speeds[speeds.length - 1]!).toBeLessThan(1e-12); // R R R
    // …and every window straddling the jump reads a strictly positive spike.
    const jump = fisherRaoDistance(P, R);
    const peak = Math.max(...speeds);
    expect(peak).toBeGreaterThan(jump / 4); // the flag: an unmistakable spike over the flat floor.
    const peakAt = speeds.indexOf(peak);
    expect(readings[peakAt]!.end).toBeGreaterThanOrEqual(4); // the spiking window covers the jump step.
    expect(readings[peakAt]!.start).toBeLessThanOrEqual(3);
  });

  test("a stationary window reads speed 0 AND turning 0 (no motion carries no fold) — never NaN", () => {
    const readings = windowedDrift([P, P, P], 3);
    expect(readings).toHaveLength(1);
    expect(readings[0]!.speed).toBe(0);
    expect(readings[0]!.turning).toBe(0);
    expect(Number.isFinite(readings[0]!.chordLength)).toBe(true);
  });

  test("a straight geodesic walk reads turning ≈ 0; a fold-back walk reads turning near 1", () => {
    const straight = [0, 0.25, 0.5, 0.75, 1].map((t) => fisherRaoGeodesic(P, Q, t));
    for (const r of windowedDrift(straight, 5)) expect(r.turning).toBeLessThan(1e-6);
    const foldBack = [P, Q, P]; // out and straight back — chord 0, path 2·d(P,Q).
    const [r] = windowedDrift(foldBack, 3);
    expect(r!.turning).toBeGreaterThan(1 - 1e-9);
  });

  test("GRAIN-AGNOSTIC: caller-supplied ticks rescale speed (FFZ ticks ride in from outside)", () => {
    const walk = [P, Q, R];
    const unit = windowedDrift(walk, 3); // default ticks 0,1,2 — span 2.
    const ffz = windowedDrift(walk, 3, [100, 105, 120]); // span 20 — 10× slower clock.
    expect(Math.abs(unit[0]!.pathLength - ffz[0]!.pathLength)).toBeLessThan(1e-12); // arc unchanged…
    expect(Math.abs(ffz[0]!.speed - unit[0]!.speed * (2 / 20))).toBeLessThan(1e-12); // …speed re-grained.
  });

  test("a walk shorter than the window returns [] (honest, not an error)", () => {
    expect(windowedDrift([P, Q], 3)).toEqual([]);
  });

  test("fails loud: window < 2, tick/point mismatch, non-increasing ticks", () => {
    expect(() => windowedDrift([P, Q, R], 1)).toThrow(/at least 2 points/);
    expect(() => windowedDrift([P, Q, R], 2, [0, 1])).toThrow(/one tick per point/);
    expect(() => windowedDrift([P, Q, R], 2, [0, 5, 5])).toThrow(/strictly increasing/);
  });
});

describe("fisher-rao — validation + the explicit smoothing", () => {
  test("non-distributions fail loud (negative entry · bad sum · NaN · empty · dimension mismatch)", () => {
    expect(() => assertSimplex([0.5, -0.1, 0.6])).toThrow(/negative entry/);
    expect(() => assertSimplex([0.5, 0.6])).toThrow(/not 1/);
    expect(() => assertSimplex([0.5, Number.NaN])).toThrow(/non-finite/);
    expect(() => assertSimplex([])).toThrow(/empty/);
    expect(() => fisherRaoDistance([0.5, 0.5], [1, 0, 0])).toThrow(/dimension mismatch/);
    expect(() => fisherRaoDistance([0.7, 0.7], Q.slice(0, 2))).toThrow(/not 1/);
  });

  test("smoothSimplex: explicit ε pulls toward the barycenter, stays on Δ; ε = 0 = identity; ε < 0 fails loud", () => {
    const s = smoothSimplex(VERTEX0, 0.01);
    assertSimplex(s);
    for (let i = 1; i < s.length; i++) expect(s[i]!).toBeGreaterThan(0); // support opened, declared.
    expect(s[0]!).toBeLessThan(1);
    const id = smoothSimplex(P, 0);
    for (let i = 0; i < P.length; i++) expect(Math.abs(id[i]! - P[i]!)).toBeLessThan(1e-15);
    expect(() => smoothSimplex(P, -0.1)).toThrow(/declared by the caller/);
    expect(() => smoothSimplex(P, Number.NaN)).toThrow(/declared by the caller/);
  });
});
