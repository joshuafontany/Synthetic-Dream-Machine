/**
 * directed-boundary — construct a self-adjoint boundary operator from a DIRECTED plane-signal graph, so
 * the matched orthonormal eigenbasis precipitates even off a directed coupling. The capstone
 * (boundary-generates-the-basis) holds: orthogonality FALLS OUT of a self-adjoint operator, never gets
 * designed. But a directed walk runs NON-NORMAL — no shared orthonormal eigenbasis — so a raw directed
 * coupling (transfer-entropy `te[][]`) cannot generate geometry directly.
 *
 * THE CURE (Chung 2005, the symmetrized directed Laplacian): recover the Perron stationary Φ of the walk
 * P (teleport-regularized to stay ergodic), then form L = I − ½(Π^½ P Π^-½ + Π^-½ Pᵀ Π^½), Π = diag(Φ).
 * L reads SELF-ADJOINT by construction, so jacobiEigen yields a real orthonormal eigenbasis — the Sturm-
 * Liouville capstone enacted on a directed graph. departureFromNormality names the ALARM (large on the raw
 * directed walk, ≈0 on the cured operator); the cure gives the alarm its answer.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/mesh/flow
 */

import { jacobiEigen } from "./ffz-project.js";
import type { MeshCoupling } from "./mesh-coupling.js";

type Mat = readonly (readonly number[])[];

const zeros = (n: number, m: number): number[][] => Array.from({ length: n }, () => new Array<number>(m).fill(0));

const rowSums = (W: Mat): number[] => W.map((row) => row.reduce((s, v) => s + Math.max(0, v), 0));

/** Row-stochastic walk P = D⁻¹W; a dangling row (zero out-degree) spreads uniformly. */
function walk(W: Mat): number[][] {
  const n = W.length;
  const rs = rowSums(W);
  const P = zeros(n, n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) P[i]![j]! = rs[i]! > 0 ? Math.max(0, W[i]![j]!) / rs[i]! : 1 / n;
  }
  return P;
}

/** Teleport-regularize a walk (PageRank move) so it stays ergodic → a unique Perron vector. */
function teleport(P: Mat, beta = 0.85): number[][] {
  const n = P.length;
  const out = zeros(n, n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out[i]![j]! = beta * P[i]![j]! + (1 - beta) / n;
  return out;
}

/** The Perron stationary distribution Φ (πP = π) by power iteration — Φ_i > 0 under teleport. */
function stationary(P: Mat, iters = 400): number[] {
  const n = P.length;
  let pi = new Array<number>(n).fill(1 / n);
  for (let it = 0; it < iters; it++) {
    const next = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) next[j]! += pi[i]! * P[i]![j]!;
    const sum = next.reduce((s, v) => s + v, 0) || 1;
    let delta = 0;
    for (let j = 0; j < n; j++) {
      next[j]! /= sum;
      delta += Math.abs(next[j]! - pi[j]!);
    }
    pi = next;
    if (delta < 1e-14) break;
  }
  return pi;
}

/** ‖A‖_F. */
function frob(A: Mat): number {
  let s = 0;
  for (const row of A) for (const v of row) s += v * v;
  return Math.sqrt(s);
}

/**
 * departureFromNormality — the ALARM. ‖TᵀT − TTᵀ‖_F / ‖T‖_F² for the walk T = D⁻¹W: ≈0 for a NORMAL
 * operator, large for a NON-NORMAL one. Non-normality — not directedness — names WHERE a coupling refuses
 * an orthonormal eigenbasis; a directed graph USUALLY runs non-normal, but a permutation cycle runs
 * directed-yet-normal (orthogonal). The metric gauges the obstruction the Chung cure clears.
 */
export function departureFromNormality(W: Mat): number {
  const T = walk(W);
  const n = T.length;
  const Tt = zeros(n, n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) Tt[j]![i]! = T[i]![j]!;
  const mul = (A: Mat, B: Mat): number[][] => {
    const out = zeros(n, n);
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) for (let j = 0; j < n; j++) out[i]![j]! += A[i]![k]! * B[k]![j]!;
    return out;
  };
  const TtT = mul(Tt, T);
  const TTt = mul(T, Tt);
  const comm = zeros(n, n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) comm[i]![j]! = TtT[i]![j]! - TTt[i]![j]!;
  const denom = frob(T) ** 2;
  return denom > 0 ? frob(comm) / denom : 0;
}

/** The Chung symmetrized directed Laplacian L = I − ½(Π^½PΠ^-½ + Π^-½PᵀΠ^½) — self-adjoint by build. */
export function chungDirectedLaplacian(W: Mat): { L: number[][]; stationary: number[] } {
  const n = W.length;
  const P = teleport(walk(W));
  const phi = stationary(P);
  const s = phi.map((p) => Math.sqrt(Math.max(p, 1e-300)));
  // M = Π^½ P Π^-½ ; L = I − ½(M + Mᵀ).
  const L = zeros(n, n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const mij = (s[i]! * P[i]![j]!) / s[j]!;
      const mji = (s[j]! * P[j]![i]!) / s[i]!;
      L[i]![j]! = (i === j ? 1 : 0) - 0.5 * (mij + mji);
    }
  }
  return { L, stationary: phi };
}

/** Reads true when W runs symmetric (W ≈ Wᵀ) — the real precondition for the symmetric-Laplacian path. */
function isSymmetric(W: Mat, tol = 1e-9): boolean {
  const n = W.length;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (Math.abs(W[i]![j]! - (W[j]?.[i] ?? 0)) > tol) return false;
  return true;
}

/** The symmetric normalized Laplacian L = I − D^-½ W D^-½ (for an already-symmetric coupling). */
export function symmetricNormalizedLaplacian(W: Mat): number[][] {
  const n = W.length;
  const rs = rowSums(W);
  const d = rs.map((r) => (r > 0 ? 1 / Math.sqrt(r) : 0));
  const L = zeros(n, n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) L[i]![j]! = (i === j ? 1 : 0) - d[i]! * Math.max(0, W[i]![j]!) * d[j]!;
  return L;
}

export interface BoundaryEigenbasis {
  /** The self-adjoint boundary operator L (Chung-cured when directed, normalized-Laplacian when symmetric). */
  readonly operator: number[][];
  /** The eigenbasis V — columns are the orthonormal eigenvectors (the matched partition; V⁻¹ = Vᵀ). */
  readonly eigenbasis: number[][];
  /** The eigenvalues, ascending (the smoothest boundary modes lead). */
  readonly eigenvalues: number[];
  /** The non-normality of the RAW walk — the alarm the cure answered (≈0 already-normal, large directed). */
  readonly departure: number;
  /** True when the Chung cure ran (a directed coupling). */
  readonly reversibilized: boolean;
}

/**
 * Build the boundary eigenbasis from a coupling graph. A directed (asymmetric) coupling routes through the
 * Chung cure (reversibilize → self-adjoint L → orthonormal eigenbasis); a symmetric one takes the
 * normalized Laplacian directly. Either way orthogonality FALLS OUT — jacobiEigen on a self-adjoint L.
 * Auto-routing gates on W's SYMMETRY (not its normality): a directed-yet-normal graph still needs the
 * Chung path, since symmetricNormalizedLaplacian on an asymmetric W would hand jacobiEigen a non-symmetric
 * operator. `departure` rides on as a diagnostic. Suits coupling/sensorium-scale graphs — jacobiEigen
 * holds its accuracy at small n (a plane-count of ~3-8), not a large Ki link-graph.
 */
export function boundaryEigenbasis(W: Mat, opts: { directed?: boolean } = {}): BoundaryEigenbasis {
  const departure = departureFromNormality(W);
  const directed = opts.directed ?? !isSymmetric(W);
  const operator = directed ? chungDirectedLaplacian(W).L : symmetricNormalizedLaplacian(W);
  const { values, vecs } = jacobiEigen(operator);
  // sort eigenpairs ascending (smoothest boundary modes first)
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const eigenvalues = order.map((o) => o.v);
  const n = operator.length;
  const eigenbasis = zeros(n, n);
  order.forEach((o, c) => {
    for (let r = 0; r < n; r++) eigenbasis[r]![c]! = vecs[r]?.[o.i] ?? 0;
  });
  return { operator, eigenbasis, eigenvalues, departure, reversibilized: directed };
}

/** The Ki→eigensolver pipe: a mesh coupling's directed `te[][]` → the boundary eigenbasis (Chung-cured). */
export function couplingBoundary(coupling: MeshCoupling): BoundaryEigenbasis {
  return boundaryEigenbasis(coupling.te, { directed: true });
}
