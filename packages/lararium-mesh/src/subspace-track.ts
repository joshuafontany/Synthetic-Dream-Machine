/**
 * subspace-track — the ONLINE WRITE face of the boundary keel (Sprint-2 R1, the proof-mover). Where the batch
 * `projectBoundary` reads a FROZEN anchor Π₀, `track(frame)` reads the LIVE subspace U_t, returns the
 * innovation, THEN folds the frame in — advance-AFTER-read (detection reads the subspace the frame has not yet
 * entered; entrainment lags a step, rhyming capture-drain's watermark-advances-after-commit). Two residuals,
 * two questions, ONE self-emergence witness: the frozen anchor's residual STAYS HIGH under a persistent regime
 * shift (the world moved off the reference), while the tracker's innovation COLLAPSES (it entrained). Their
 * divergence witnesses Claim B — a new basin grows that a frozen Π can never span.
 *
 * This rides BESIDE the batch files on PLAIN ARRAYS (U0, deflate — row-major n×k, matching projectBoundary's
 * Wstar/trivialColumns) — it imports nothing from directed-boundary or boundary-residual, so the deferred M4
 * collapse renames those without touching this source (the strangler repoints one witness import, never this
 * file). Runtime hand-rolled (no proven JS GROUSE exists; the kernel runs a few vector ops): GROUSE rank-1
 * geodesic step (a per-frame rotation BOUNDED by the arc θ = step·arctan(‖r‖/‖w‖) ≤ step·π/2) toward the
 * innovation + Gram-Schmidt re-orthonormalize — Balzano, Nowak & Recht 2010 (arXiv:1006.4046); Oja 1982
 * (Hebbian PCA ascent). principalAngles rides the existing jacobiEigen — Björck &
 * Golub 1973 ("Numerical methods for computing angles between linear subspaces"). The persistence+corroboration
 * fold-rate gate and the exact β(ARL₀) horizon defer to the null-calibration sprint; R1 folds plain (fixed
 * step) to prove convergence, not to feed the sink.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/mesh/flow
 */

import { jacobiEigen } from "./ffz-project.js";

type Mat = readonly (readonly number[])[]; // row-major: M[row][col]

/** One reading off a subspace — value in the kept span, residual in its complement, null the scalar surprise. */
export interface Reading {
  /** W*ᵀx⊥ — the coordinates within the tracked subspace (length k). */
  readonly value: number[];
  /** r = x⊥ − U_t·value — the innovation, the part the subspace does not yet explain (length n). */
  readonly residual: number[];
  /** ‖r‖² — the scalar innovation energy (the SPE against the LIVE subspace). */
  readonly null: number;
}

export interface Tracker {
  /** Read the live subspace, return the innovation Reading, THEN fold the frame in (advance-after-read). */
  track(frame: readonly number[]): Reading;
  /** The current tracked basis U_t (row-major n×k, orthonormal columns) — a snapshot for a witness/parity read. */
  basis(): number[][];
}

export interface TrackerOpts {
  /** GROUSE ascent step (fixed = tracking; small + many frames → converges toward the batch subspace). */
  readonly step?: number;
}

/** Deflate x over the trivial columns D (row-major n×dCols): x⊥ = x − Σ_c (D[:,c]ᵀx) D[:,c] — DC/Perron first. */
function deflateVec(x: readonly number[], D: Mat): number[] {
  const n = x.length;
  const out = x.slice();
  const dCols = D.length > 0 ? (D[0]?.length ?? 0) : 0;
  for (let c = 0; c < dCols; c++) {
    let coef = 0;
    for (let r = 0; r < n; r++) coef += (D[r]?.[c] ?? 0) * (x[r] ?? 0);
    for (let r = 0; r < n; r++) out[r] = (out[r] ?? 0) - coef * (D[r]?.[c] ?? 0);
  }
  return out;
}

/** Gram-Schmidt re-orthonormalize the k COLUMNS of a row-major n×k basis, in place (k small — the keel keeps k≤~8). */
function gramSchmidtColumns(U: number[][], n: number, k: number): void {
  for (let j = 0; j < k; j++) {
    for (let i = 0; i < j; i++) {
      let c = 0;
      for (let r = 0; r < n; r++) c += (U[r]?.[j] ?? 0) * (U[r]?.[i] ?? 0);
      for (let r = 0; r < n; r++) U[r]![j] = (U[r]?.[j] ?? 0) - c * (U[r]?.[i] ?? 0);
    }
    let nj = 0;
    for (let r = 0; r < n; r++) nj += (U[r]?.[j] ?? 0) ** 2;
    nj = Math.sqrt(nj);
    if (nj > 1e-12) for (let r = 0; r < n; r++) U[r]![j] = (U[r]?.[j] ?? 0) / nj;
  }
}

/**
 * Make an online subspace tracker from an initial basis U0 (row-major n×k, orthonormal columns) and the
 * deflation columns D. `track(frame)` reads U_t → returns the innovation Reading → folds the frame in (GROUSE
 * ascent + Gram-Schmidt). It mutates ONLY U_t — no frozen anchor lives here (the caller holds that separately,
 * via projectBoundary against a frozen Wstar), so the two-residual contrast never shares mutable state.
 */
export function makeTracker(U0: Mat, D: Mat = [], opts: TrackerOpts = {}): Tracker {
  const n = U0.length;
  const k = n > 0 ? (U0[0]?.length ?? 0) : 0;
  const U: number[][] = U0.map((row) => row.slice());
  const step = opts.step ?? 0.5;

  const readCoords = (xperp: readonly number[]): number[] => {
    const w = new Array<number>(k).fill(0);
    for (let c = 0; c < k; c++) {
      let s = 0;
      for (let r = 0; r < n; r++) s += (U[r]?.[c] ?? 0) * (xperp[r] ?? 0);
      w[c] = s;
    }
    return w;
  };
  const reconstruct = (w: readonly number[]): number[] => {
    const p = new Array<number>(n).fill(0);
    for (let r = 0; r < n; r++) {
      let s = 0;
      for (let c = 0; c < k; c++) s += (U[r]?.[c] ?? 0) * (w[c] ?? 0);
      p[r] = s;
    }
    return p;
  };

  return {
    track(frame) {
      if (frame.length !== n) throw new Error(`track: frame length ${frame.length} ≠ ${n} tracked dims (fail loud, no NaN corruption)`);
      const xperp = deflateVec(frame, D);
      const w = readCoords(xperp); // value — read the CURRENT subspace (pre-fold)
      const p = reconstruct(w);
      const r = xperp.map((v, i) => v - (p[i] ?? 0)); // innovation
      let nullEnergy = 0;
      for (const v of r) nullEnergy += v * v;

      // Fold AFTER the read: GROUSE geodesic rank-1 step (Balzano, Nowak & Recht 2010). Rotate U along the
      // Grassmannian geodesic toward the innovation by a step-fraction of the angle-to-full-fit
      // θ = step·arctan(‖r‖/‖w‖), then re-orthonormalize. arctan SATURATES at π/2, so the per-frame rotation
      // stays BOUNDED by step·π/2 no matter how gross the frame — a single outlier turns the subspace by a
      // bounded arc, where both the old linear kick (ΔU ∝ ‖r‖, unbounded) and the vanilla product angle
      // (θ ∝ ‖r‖·‖w‖, unbounded → wraps and flips) over-rotate. ‖w‖²,‖r‖² guard against a NaN on a
      // zero-coordinate / zero-residual frame (numerical clamp, never the fold-rate — the
      // persistence+corroboration rate-gate defers to the null-calib sprint). ‖p‖ = ‖w‖ holds for
      // orthonormal U (an isometry), so p̂ = p/‖w‖.
      let wNorm2 = 0;
      for (const v of w) wNorm2 += v * v;
      if (wNorm2 > 1e-12 && nullEnergy > 1e-24) {
        const wNorm = Math.sqrt(wNorm2);
        const rNorm = Math.sqrt(nullEnergy);
        const theta = step * Math.atan2(rNorm, wNorm); // arctan(‖r‖/‖w‖) — bounded in [0, step·π/2)
        const cosm1 = Math.cos(theta) - 1;
        const sinT = Math.sin(theta);
        for (let c = 0; c < k; c++) {
          const wUnit = (w[c] ?? 0) / wNorm; // (w/‖w‖)_c
          for (let rr = 0; rr < n; rr++) {
            // ΔU = [ (cosθ−1)·p̂ + sinθ·r̂ ] (w/‖w‖)ᵀ — the geodesic move, bounded by the arc.
            const dir = cosm1 * ((p[rr] ?? 0) / wNorm) + sinT * ((r[rr] ?? 0) / rNorm);
            U[rr]![c] = (U[rr]?.[c] ?? 0) + dir * wUnit;
          }
        }
        gramSchmidtColumns(U, n, k);
      }
      return { value: w, residual: r, null: nullEnergy };
    },
    basis: () => U.map((row) => row.slice()),
  };
}

/**
 * Principal angles (radians, ascending) between two orthonormal bases A (row-major n×kA) and B (n×kB). M = AᵀB;
 * the singular values of M give the cosines of the principal angles. For the small bases the keel keeps, read
 * them off the eigenvalues of MᵀM via the existing jacobiEigen (σ² = eigenvalue). Björck & Golub 1973; Knyazev
 * & Argentati 2002. Pairs with subspaceDistance = the largest angle (→ 0 ⟺ B lies within A's span).
 */
export function principalAngles(A: Mat, B: Mat): number[] {
  const n = A.length;
  const kA = n > 0 ? (A[0]?.length ?? 0) : 0;
  const kB = n > 0 ? (B[0]?.length ?? 0) : 0;
  // M = AᵀB (kA×kB): M[i][j] = A[:,i]ᵀ B[:,j]
  const M: number[][] = [];
  for (let i = 0; i < kA; i++) {
    const row: number[] = [];
    for (let j = 0; j < kB; j++) {
      let s = 0;
      for (let r = 0; r < n; r++) s += (A[r]?.[i] ?? 0) * (B[r]?.[j] ?? 0);
      row.push(s);
    }
    M.push(row);
  }
  // MᵀM (kB×kB symmetric): eigenvalues = σ² (squared cosines).
  const MtM: number[][] = [];
  for (let i = 0; i < kB; i++) {
    const row: number[] = [];
    for (let j = 0; j < kB; j++) {
      let s = 0;
      for (let r = 0; r < kA; r++) s += (M[r]?.[i] ?? 0) * (M[r]?.[j] ?? 0);
      row.push(s);
    }
    MtM.push(row);
  }
  const { values } = jacobiEigen(MtM);
  return values
    .map((lam) => Math.acos(Math.sqrt(Math.min(1, Math.max(0, lam)))))
    .sort((a, b) => a - b);
}

/** The subspace distance — the largest principal angle (0 ⟺ B lies within A's span). */
export function subspaceDistance(A: Mat, B: Mat): number {
  const angles = principalAngles(A, B);
  return angles[angles.length - 1] ?? 0;
}
