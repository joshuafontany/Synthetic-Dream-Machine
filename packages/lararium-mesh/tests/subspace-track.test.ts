/**
 * subspace-track — witness CLAIM B (self-emergence under drift), the Sprint-2 proof-mover. The frozen anchor
 * (batch Wstar of the reference regime S₀) and the live tracker start from the SAME cut (U₀=Wstar₀); their
 * residual curves diverge ONLY under a regime shift. On a stream that shifts S₀→S₁, the frozen anchor's
 * residual STAYS HIGH (S₁'s smooth mode lies outside span(Wstar₀) — a basin a frozen Π can never reach) while
 * the tracker's innovation COLLAPSES (U_t rotates into S₁). That divergence, plus principalAngles(U_t,S₁)→0,
 * IS self-emergence — measured, not asserted green. Streaming parity: from a tilted init, a stationary in-span
 * feed converges the tracker toward the batch Wstar (subspace-distance, never trajectory).
 */
import { describe, expect, test } from "vitest";

import { makeTracker, principalAngles, subspaceDistance } from "../src/subspace-track.js";
import { couplingBoundary, projectBoundary } from "../src/spectral-keel.js";
import type { MeshCoupling } from "../src/mesh-coupling.js";

const jitter = (s: number): number => {
  const x = Math.sin(s * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x) - 0.5;
};

// Two couplings with DISTINCT smooth boundaries: S₀ pairs {a,b} & {c,d}; S₁ pairs {a,c} & {b,d}. Their
// Laplacian smooth modes separate different blocks → near-orthogonal Wstar → a real regime shift.
const S0: MeshCoupling = {
  children: ["a", "b", "c", "d"],
  te: [[0, 0.7, 0.05, 0.05], [0.7, 0, 0.05, 0.05], [0.05, 0.05, 0, 0.7], [0.05, 0.05, 0.7, 0]],
  strongestEdge: { from: "a", to: "b", coupling: 0.7 },
  sovereign: false,
};
const S1: MeshCoupling = {
  children: ["a", "b", "c", "d"],
  te: [[0, 0.05, 0.7, 0.05], [0.05, 0, 0.05, 0.7], [0.7, 0.05, 0, 0.05], [0.05, 0.7, 0.05, 0]],
  strongestEdge: { from: "a", to: "c", coupling: 0.7 },
  sovereign: false,
};

const b0 = couplingBoundary(S0, { k: 1 });
const b1 = couplingBoundary(S1, { k: 1 });
const col = (W: readonly (readonly number[])[]): number[] => W.map((row) => row[0] ?? 0); // n×1 → length-n
const w0 = col(b0.Wstar);
const w1 = col(b1.Wstar);
// a frame in a regime: unit-magnitude along that regime's smooth mode + small deterministic noise.
const frame = (w: readonly number[], t: number): number[] => w.map((v, i) => v + 0.04 * jitter(t * 7 + i * 13));

describe("subspace-track — principalAngles (the subspace-distance metric)", () => {
  test("identical bases → 0; the two regime boundaries → a large angle", () => {
    expect(subspaceDistance(b0.Wstar, b0.Wstar)).toBeLessThan(1e-6);
    expect(subspaceDistance(b0.Wstar, b1.Wstar)).toBeGreaterThan(0.5); // radians — the regimes genuinely differ
  });
});

describe("subspace-track — CLAIM B: the frozen anchor stays high, the tracker entrains", () => {
  test("on a regime shift S₀→S₁, frozen residual STAYS HIGH while the tracker's COLLAPSES", () => {
    const tracker = makeTracker(b0.Wstar, b0.trivialColumns, { step: 0.5 });
    const anchorAngleToS1 = subspaceDistance(b0.Wstar, b1.Wstar);
    let frozenTail = 0;
    let trackedTail = 0;
    let tail = 0;
    for (let t = 0; t < 140; t++) {
      const regimeW = t < 50 ? w0 : w1; // shift at t=50
      const f = frame(regimeW, t);
      const frozen = projectBoundary(f, b0.Wstar, b0.trivialColumns).spe; // anchor = frozen Wstar₀, never moves
      const tracked = tracker.track(f).null;
      if (t >= 100) { frozenTail += frozen; trackedTail += tracked; tail++; } // tail = well past the shift + burn-in
    }
    frozenTail /= tail;
    trackedTail /= tail;
    // The divergence witnesses self-emergence: the anchor cannot span S₁, the tracker grew the new basin.
    expect(frozenTail).toBeGreaterThan(trackedTail * 3);
    // The tracker entrained toward S₁; the frozen anchor stayed at S₀ (never moved from its distance to S₁).
    expect(subspaceDistance(tracker.basis(), b1.Wstar)).toBeLessThan(anchorAngleToS1 * 0.5);
  });
});

describe("subspace-track — the bounded-arc guard (a gross frame never hijacks the basis)", () => {
  test("a gross outlier rotates the subspace by ≤ step·π/2 — arctan saturates, no over-rotation", () => {
    const step = 0.5;
    const tracker = makeTracker(b0.Wstar, b0.trivialColumns, { step });
    const before = tracker.basis();
    // A gross frame: an in-span component + a HUGE orthogonal spike (‖r‖ ≫ ‖w‖). The old product angle
    // θ=step·‖r‖·‖w‖ would wrap through many half-turns; arctan(‖r‖/‖w‖)→π/2 caps the turn at step·π/2.
    const gross = w0.map((v, i) => v * 1.0 + (i === 1 ? 1e6 : 0));
    tracker.track(gross);
    const moved = subspaceDistance(before, tracker.basis());
    expect(Number.isFinite(moved)).toBe(true); // no NaN blowup
    expect(moved).toBeLessThanOrEqual(step * (Math.PI / 2) + 1e-6); // bounded arc — the outlier cannot flip U
  });

  test("one moderate outlier moves the subspace less than a full flip (basin survives a single shock)", () => {
    const tracker = makeTracker(b0.Wstar, b0.trivialColumns, { step: 0.5 });
    const shock = w1.map((v) => v * 8); // a big frame from the OTHER regime — a shock, not the new steady state
    tracker.track(shock);
    // A single shock nudges toward S₁ but does NOT snap the basis onto it — entrainment stays gradual.
    expect(subspaceDistance(tracker.basis(), b1.Wstar)).toBeGreaterThan(0.2);
  });
});

describe("subspace-track — streaming parity (recovers the batch subspace)", () => {
  test("from a tilted init, a stationary in-span feed converges the tracker toward the batch Wstar", () => {
    // Init tilted well off Wstar₀ (but not orthogonal — GROUSE needs overlap to gain traction).
    const raw = w0.map((v, i) => v + [0.5, -0.5, 0.4, -0.3][i]!);
    const nrm = Math.sqrt(raw.reduce((s, v) => s + v * v, 0));
    const init = raw.map((v) => [v / nrm]); // row-major n×1
    const startAngle = subspaceDistance(init, b0.Wstar);
    expect(startAngle).toBeGreaterThan(0.3); // the init genuinely differs from the batch answer

    const tracker = makeTracker(init, b0.trivialColumns, { step: 0.3 });
    for (let t = 0; t < 500; t++) tracker.track(frame(w0, t));
    expect(subspaceDistance(tracker.basis(), b0.Wstar)).toBeLessThan(0.15); // recovered the batch subspace
  });
});
