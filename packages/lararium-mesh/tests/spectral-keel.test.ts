/**
 * spectral-keel — witness the M4 collapse keystone: buildSpectralKeel freezes the boundary anchor (matching
 * the raw eigenbasis — the collapse preserves the batch subspace) and binds the frozen `project` verb, whose
 * reading reproduces projectBoundary. The Karoubi split shows: a signal in the smooth span reads ~0 residual,
 * one off it reads high. (The whole existing suite reproducing green through the transitional shims is the
 * behavior-preservation witness; this covers the new keel API.)
 */
import { describe, expect, test } from "vitest";

import { buildSpectralKeel, boundaryEigenbasis, projectBoundary } from "../src/spectral-keel.js";
import { subspaceDistance } from "../src/subspace-track.js";
import type { MeshCoupling } from "../src/mesh-coupling.js";

const S0: MeshCoupling = {
  children: ["a", "b", "c", "d"],
  te: [[0, 0.7, 0.05, 0.05], [0.7, 0, 0.05, 0.05], [0.05, 0.05, 0, 0.7], [0.05, 0.05, 0.7, 0]],
  strongestEdge: { from: "a", to: "b", coupling: 0.7 },
  sovereign: false,
};

describe("spectral-keel — the frozen anchor + project verb (M4 collapse keystone)", () => {
  test("buildSpectralKeel freezes the boundary Wstar (matches boundaryEigenbasis) and binds project", () => {
    const keel = buildSpectralKeel(S0, { k: 1 });
    const raw = boundaryEigenbasis(S0.te, { directed: true, k: 1 });
    expect(subspaceDistance(keel.boundary.Wstar, raw.Wstar)).toBeLessThan(1e-9); // collapse preserves the subspace
    expect(keel.boundary.k).toBe(1);
    const frame = [0.6, -0.4, 0.1, 0.3];
    const viaKeel = keel.project(frame);
    const viaFn = projectBoundary(frame, keel.boundary.Wstar, keel.boundary.trivialColumns);
    expect(viaKeel.spe).toBeCloseTo(viaFn.spe, 12); // the verb reproduces the function
    expect(viaKeel.coords).toEqual(viaFn.coords);
  });

  test("the frozen anchor reads low residual in-span, high off it (the Karoubi split)", () => {
    const keel = buildSpectralKeel(S0, { k: 1 });
    const wcol = keel.boundary.Wstar.map((row) => row[0]!);
    const inSpan = keel.project(wcol.map((v) => 2 * v)); // a signal along the smooth mode
    const offSpan = keel.project([1, -1, 1, -1]); // a rough signal, ~orthogonal to the smooth mode
    expect(inSpan.spe).toBeLessThan(offSpan.spe);
  });
});
