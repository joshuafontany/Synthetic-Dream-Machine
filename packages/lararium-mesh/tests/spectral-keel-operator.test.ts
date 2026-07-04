/**
 * spectral-keel (operator face) — witness the Chung cure (Sprint 2). Proves the alarm has an answer: a directed walk
 * reads NON-NORMAL (departureFromNormality large), the Chung symmetrized Laplacian arrives SELF-ADJOINT,
 * and its eigenbasis precipitates ORTHONORMAL (VᵀV≈I) — orthogonality falls out on a directed graph. The
 * Ki `te[][]` coupling now generates a boundary basis for the first time.
 */
import { describe, expect, test } from "vitest";

import {
  departureFromNormality,
  chungDirectedLaplacian,
  boundaryEigenbasis,
  couplingBoundary,
} from "../src/spectral-keel.js";
import type { MeshCoupling } from "../src/mesh-coupling.js";

const undirectedRing = (n: number): number[][] => {
  const W = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    W[i]![(i + 1) % n]! = 1;
    W[i]![(i - 1 + n) % n]! = 1;
  }
  return W;
};

const directedChain = (n: number): number[][] => {
  const W = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n - 1; i++) W[i]![i + 1]! = 1;
  return W;
};

const isOrthonormal = (V: readonly (readonly number[])[], tol = 1e-8): boolean => {
  const n = V.length;
  for (let c1 = 0; c1 < n; c1++) {
    for (let c2 = 0; c2 < n; c2++) {
      let dot = 0;
      for (let r = 0; r < n; r++) dot += V[r]![c1]! * V[r]![c2]!;
      if (Math.abs(dot - (c1 === c2 ? 1 : 0)) > tol) return false;
    }
  }
  return true;
};

const isSymmetric = (M: readonly (readonly number[])[], tol = 1e-9): boolean => {
  const n = M.length;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (Math.abs(M[i]![j]! - M[j]![i]!) > tol) return false;
  return true;
};

describe("directed-boundary — the Chung cure (the alarm gets its answer)", () => {
  test("departureFromNormality reads ≈0 on an undirected ring, LARGE on a directed chain", () => {
    expect(departureFromNormality(undirectedRing(6))).toBeLessThan(1e-9);
    expect(departureFromNormality(directedChain(6))).toBeGreaterThan(0.1);
  });

  test("the Chung directed Laplacian arrives SELF-ADJOINT (L ≈ Lᵀ)", () => {
    const { L } = chungDirectedLaplacian(directedChain(6));
    expect(isSymmetric(L)).toBe(true);
  });

  test("a DIRECTED coupling's eigenbasis precipitates ORTHONORMAL (orthogonality falls out on the cure)", () => {
    const b = boundaryEigenbasis(directedChain(6), { directed: true });
    expect(b.reversibilized).toBe(true);
    expect(isOrthonormal(b.eigenbasis)).toBe(true);
    expect(b.eigenvalues.every((v) => Number.isFinite(v))).toBe(true);
    expect(departureFromNormality(b.operator)).toBeLessThan(1e-9); // the CURED operator reads normal
  });

  test("a SYMMETRIC coupling takes the normalized Laplacian directly, still orthonormal, constant mode ~0", () => {
    const b = boundaryEigenbasis(undirectedRing(6));
    expect(b.reversibilized).toBe(false);
    expect(isOrthonormal(b.eigenbasis)).toBe(true);
    expect(Math.abs(b.eigenvalues[0]!)).toBeLessThan(1e-6); // the smoothest (constant) boundary mode
  });

  test("couplingBoundary pipes a directed te[][] → an orthonormal boundary basis (the Ki→eigensolver pipe)", () => {
    // a synthetic 3-child directed coupling (a common-driver: child 0 → 1 and 0 → 2)
    const coupling: MeshCoupling = {
      children: ["content", "structure", "form"],
      te: [
        [0, 0.6, 0.5],
        [0.05, 0, 0.02],
        [0.04, 0.03, 0],
      ],
      strongestEdge: { from: "content", to: "structure", coupling: 0.6 },
      sovereign: false,
    };
    const b = couplingBoundary(coupling);
    expect(b.reversibilized).toBe(true);
    expect(isOrthonormal(b.eigenbasis)).toBe(true);
    expect(b.eigenbasis.length).toBe(3);
  });
});
