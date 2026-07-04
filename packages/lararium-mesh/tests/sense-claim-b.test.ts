/**
 * sense-claim-b — witness Claim-B (self-emergence under drift) THROUGH THE KEEL HANDLE, driven by the reusable
 * synthetic-drift producer (the frame-source's synthetic mode). On a persistent regime shift, the keel's
 * FROZEN project() residual STAYS HIGH (Π₀ built on the reference regime cannot span the new basin) while the
 * live track() innovation COLLAPSES (U_t entrains). Their divergence IS self-emergence — measured through the
 * SAME buildSpectralKeel API the senseIsland composes, not the raw functions. This is W12, the positive
 * control: a detector that never fires would pass every refusal test vacuously.
 */
import { describe, expect, test } from "vitest";

import { buildSpectralKeel, couplingBoundary } from "../src/spectral-keel.js";
import { regimeShiftStream, driftStream } from "../src/synthetic-drift.js";
import type { MeshCoupling } from "../src/mesh-coupling.js";

// Two couplings with DISTINCT smooth boundaries: S0 pairs {a,b}&{c,d}; S1 pairs {a,c}&{b,d} — a real shift.
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

const col = (W: readonly (readonly number[])[]): number[] => W.map((row) => row[0] ?? 0);
const w0 = col(couplingBoundary(S0, { k: 1 }).Wstar);
const w1 = col(couplingBoundary(S1, { k: 1 }).Wstar);

describe("sense-claim-b — W12: self-emergence under drift, through the keel handle", () => {
  test("on a persistent regime shift, the frozen project() STAYS HIGH while track() COLLAPSES", () => {
    const keel = buildSpectralKeel(S0, { k: 1, step: 0.5 });
    const frames = regimeShiftStream(w0, w1, 50, 140, { seed: 7 }); // shift at frame 50
    let frozenTail = 0, trackedTail = 0, tail = 0;
    frames.forEach((f, t) => {
      const frozen = keel.project(f).spe; // frozen Π₀ — never moves
      const tracked = keel.track(f).null; // live U_t — entrains (advance-after-read)
      if (t >= 100) { frozenTail += frozen; trackedTail += tracked; tail++; } // well past the shift + burn-in
    });
    frozenTail /= tail;
    trackedTail /= tail;
    // The divergence witnesses self-emergence: the frozen basin cannot span S1; the tracker grew it.
    expect(frozenTail).toBeGreaterThan(trackedTail * 3);
  });

  test("on a stationary reference stream, frozen and tracked BOTH read low (no false divergence)", () => {
    const keel = buildSpectralKeel(S0, { k: 1, step: 0.5 });
    const frames = driftStream({ length: 120, regimes: [{ from: 0, center: w0 }], seed: 3 });
    let frozenTail = 0, trackedTail = 0, tail = 0;
    frames.forEach((f, t) => {
      if (t >= 80) { frozenTail += keel.project(f).spe; trackedTail += keel.track(f).null; tail++; }
    });
    frozenTail /= tail;
    trackedTail /= tail;
    // A signal IN the reference regime reads low residual on BOTH faces — no spurious regime-shift.
    expect(frozenTail).toBeLessThan(0.15);
    expect(trackedTail).toBeLessThan(0.15);
  });
});
