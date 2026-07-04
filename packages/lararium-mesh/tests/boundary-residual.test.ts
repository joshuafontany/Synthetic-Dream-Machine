/**
 * boundary-residual — witness the directed residual bridge (fork 1). Units: projectBoundary (an in-subspace
 * signal reads spe≈0; a rough signal's residual ⊥ W*); controlLimit (the α-quantile); residualComponentEvents
 * (agreement 0.5 at the limit). End-to-end: a directed coupling → the bottom-k boundary → per-frame residual
 * → component events → sink-flow — a NORMAL (in-subspace) regime births no sink; an ANOMALY (rough cross-node)
 * regime births a receiver-boundary purple.
 */
import { describe, expect, test } from "vitest";

import { projectBoundary, controlLimit, residualComponentEvents } from "../src/boundary-residual.js";
import { couplingBoundary } from "../src/directed-boundary.js";
import { runBoundaryResidualFlow } from "../src/sink-flow.js";
import { makeMintRegistry } from "../src/purple-minter.js";
import type { MeshCoupling } from "../src/mesh-coupling.js";

const counter = () => {
  let n = 0;
  return () => `sink-${n++}`;
};

// A directed 4-node coupling: two clusters {a,b} {c,d} + a weak cross-edge (a clear smooth/rough split).
const coupling: MeshCoupling = {
  children: ["a", "b", "c", "d"],
  te: [
    [0, 0.6, 0.1, 0.1],
    [0.5, 0, 0.1, 0.1],
    [0.1, 0.1, 0, 0.6],
    [0.1, 0.1, 0.5, 0],
  ],
  strongestEdge: { from: "a", to: "b", coupling: 0.6 },
  sovereign: false,
};

describe("boundary-residual — projection + control limit + component events", () => {
  test("projectBoundary: an in-subspace signal reads spe≈0; a rough signal's residual is orthogonal to W*", () => {
    // an explicit orthonormal W* (n=4, k=2)
    const Wstar = [
      [1, 0],
      [0, 1],
      [0, 0],
      [0, 0],
    ];
    const inSub = projectBoundary([3, -2, 0, 0], Wstar);
    expect(inSub.spe).toBeLessThan(1e-12); // fully explained by the subspace

    const rough = projectBoundary([0, 0, 4, -1], Wstar);
    expect(rough.spe).toBeCloseTo(17, 6); // 4² + 1²
    // Wᵀ·residual ≈ 0 (the residual lives off the subspace)
    for (let c = 0; c < 2; c++) {
      let d = 0;
      for (let r = 0; r < 4; r++) d += Wstar[r]![c]! * rough.residualVec[r]!;
      expect(Math.abs(d)).toBeLessThan(1e-12);
    }
  });

  test("controlLimit: the per-node (1−α) empirical quantile of residual energy", () => {
    // node 0 residuals 0..99 → energies 0..9801; α=0.05 → ~95th percentile
    const ref = Array.from({ length: 100 }, (_, i) => [i]);
    const q = controlLimit(ref, 0.05);
    expect(q[0]).toBe(94 ** 2); // ceil(0.95*100)-1 = 94 → energy 94²
  });

  test("residualComponentEvents: agreement reads 0.5 exactly at the control limit", () => {
    const proj = { coords: [], residualVec: [2], spe: 4 };
    const ev = residualComponentEvents(proj, ["a"], [4]); // qα = 4 = r² → 0.5
    expect(ev[0]!.agreement).toBeCloseTo(0.5, 12);
    expect(ev[0]!.value).toBe(2);
  });
});

describe("directed residual bridge (fork 1) — end-to-end", () => {
  const b = couplingBoundary(coupling, { k: 1 });
  const start = b.trivialModes.length;
  const smoothCol = (r: number) => b.Wstar[r]![0]!; // the one smooth boundary mode
  const roughCol = (r: number) => b.eigenbasis[r]![start + 1]!; // the first rough (dropped) mode

  const frame = (amp: number, seed: number): number[] => {
    const f = [0, 0, 0, 0];
    const coord = 0.5 * Math.sin(seed);
    for (let r = 0; r < 4; r++) f[r] = coord * smoothCol(r) + amp * roughCol(r);
    return f;
  };

  const normal = Array.from({ length: 40 }, (_, i) => frame(0, i * 0.7)); // in the smooth subspace
  const anomaly = Array.from({ length: 40 }, (_, i) => frame(3, i * 0.7)); // + a rough cross-node mode

  test("a NORMAL (in-subspace) regime births NO sink — the residual stays off, agreement≈0", () => {
    const r = runBoundaryResidualFlow(coupling, normal, normal, makeMintRegistry(), counter(), { boundary: { k: 1 } });
    expect(r.verdict.birth.born).toBe(false);
    expect(r.minted).toBeNull();
  });

  test("an ANOMALY (rough cross-node) regime births a RECEIVER-BOUNDARY purple", () => {
    const r = runBoundaryResidualFlow(coupling, anomaly, normal, makeMintRegistry(), counter(), { boundary: { k: 1 } });
    expect(r.verdict.birth.born).toBe(true); // rough residual corroborates across nodes → cross-plane drive
    expect(r.klass.sinkClass).toBe("receiver-boundary");
    expect(r.minted).not.toBeNull();
    expect(r.minted!.presentInNoPlane).toBe(true);
    expect(r.boundary.trivialColumns.length).toBe(4); // the richer return carries the boundary (forks 2&3)
    expect(r.qAlpha.length).toBe(4);
  });
});

describe("the YIN-collapse fail-loud guards", () => {
  const ref = Array.from({ length: 8 }, (_, i) => [0.5 + 0.01 * i, 0.4, 0.6, 0.5]); // valid 4-node frames

  test("empty refFrames THROWS (a control limit needs a reference — no silent over-birth)", () => {
    expect(() => runBoundaryResidualFlow(coupling, ref, [], makeMintRegistry(), counter())).toThrow(/refFrames/);
  });

  test("a frame of the wrong dimension THROWS (never Wstar[r] undefined → NaN/corruption)", () => {
    const badFrame = [[1, 2, 3]]; // 3 ≠ 4 boundary nodes
    expect(() => runBoundaryResidualFlow(coupling, badFrame, ref, makeMintRegistry(), counter())).toThrow(/boundary nodes/);
  });

  test("an extreme residual reads MAX agreement, never NaN (the run never aborts)", () => {
    const ev = residualComponentEvents({ coords: [], residualVec: [1e200], spe: Infinity }, ["a"], [1]);
    expect(ev[0]!.agreement).toBe(1); // spe→Infinity → agreement 1, not NaN
    expect(Number.isFinite(ev[0]!.value)).toBe(true);
  });

  test("relGap/gapRatio telemetry rides on the boundary (cut decisiveness)", () => {
    const r = runBoundaryResidualFlow(coupling, ref, ref, makeMintRegistry(), counter());
    expect(Number.isFinite(r.boundary.relGap)).toBe(true);
    expect(r.boundary.relGap).toBeGreaterThanOrEqual(0);
  });
});
