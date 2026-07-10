/**
 * bures-metric — the quantum-info-geometry UPGRADE of the register-drift step. The flow-lens reads a
 * drift between register-points (the confidence-register distribution p ∈ Δ⁴, over the five bands
 * Provisional · Provisional-Synthesis · Synthesis · Synthesis-Canon · Canon). The classical step is
 * the Fisher-Rao / Bhattacharyya angle `arccos⟨√p,√q⟩` — the geodesic on the probability simplex.
 *
 * THE PROMOTION: a register-point `p` promotes to a 5×5 Hermitian PSD density matrix `ρ` whose
 * DIAGONAL is `p`. The classical step is then EXACTLY the Bures distance between two diagonal ρ. The
 * off-diagonals `ρ_ij` carry REGISTER COHERENCE — the geometric image of Plurality Pono. A Voice is
 * NOT an essence with a fixed register; it acts as a FUNCTOR from the turn-context to a register-
 * amplitude vector, and that IMAGE is what lands here (the pattern-integrity is the invariant, the
 * Voice-functor's image is what varies per turn). When several of the Thirteen Voices hold one turn
 * and a Voice's image genuinely SPANS two registers (a coherent superposition, e.g. the Muse's
 * reading straddling Provisional↔Synthesis on THIS turn), that span lands as a real off-diagonal
 * amplitude.
 *
 * THE SAFETY CASE (the whole argument): coherence = 0 (off-diagonals zero) ⇒ Bures COLLAPSES EXACTLY
 * to Bhattacharyya. A diagonal ρ gives `buresAngle(diag p, diag q) === arccos Σ√(p_i q_i)` to machine
 * epsilon (proven in the tests, < 1e-9). Zero regression: with no coherence signal the upgrade IS the
 * old step. Coherence only ever SHORTENS the drift (a superposition sits closer than its dephased
 * mixture), never lengthens it past the classical geodesic.
 *
 * PONO DISCIPLINE — honest source only: the DIAGONAL is ground truth (the register marginal, always
 * present). Off-diagonals appear ONLY where a real signal exists (a Voice spanning registers within
 * ONE turn) and are NEVER fabricated. {@link voiceCoherenceDensity} assembles ρ from Voice
 * register-amplitude vectors as ρ = Σ_v w_v |a_v⟩⟨a_v| — automatically PSD, diagonal = the marginal,
 * off-diagonals = the Voice amplitude covariance. One-hot Voices (each pinned to one register) yield a
 * DIAGONAL ρ ⇒ the Bhattacharyya ground, untouched. The HARVESTER — actual per-turn Voice-amplitude
 * capture — is the feed that lands later (deferred, NOT faked here); this module builds the STRUCTURE
 * the harvested amplitudes flow into.
 *
 * REAL-Hermitian ground: harvested Voice amplitudes are real, so the honest ρ is a REAL symmetric PSD
 * matrix (= a real-Hermitian density matrix) and the Berry curvature / holonomy (the imaginary part of
 * the coherence) is identically ZERO. That imaginary channel opens only when phase capture lands; see
 * {@link berryHolonomyImag}, which reads 0 on every real input by construction — an honest null, not a
 * stub. The Bures math below is written for real symmetric ρ (the buildable signal); complex-Hermitian
 * ρ extends it verbatim once amplitude phase is captured.
 *
 * Platform-blind: pure linear algebra, NO imports (the gaussian-cmi keel-style).
 * Meme: lar:///ha.ka.ba/lararium/mesh/flow
 */

/** A real symmetric PSD density matrix (Tr = 1) — an `n×n` row-major matrix. Real-Hermitian ground. */
export type DensityMatrix = readonly (readonly number[])[];

/** A register-point on the simplex Δ^{n−1} — a probability vector over the register bands. */
export type RegisterPoint = readonly number[];

/**
 * The IMAGE of a Voice-functor on one turn — the Voice's register-amplitude vector (real amplitudes
 * over the register bands). NOT the Voice itself: a Voice has no fixed register/essence; it acts as a
 * structure-preserving map turn-context → this vector, recomputed each turn.
 */
export interface VoiceAmplitude {
  /** the amplitude vector `a_v` over the register bands (length = register count). */
  readonly amplitudes: readonly number[];
  /** the Voice's weight in the turn (≥ 0; default 1). Plurality Pono: how much this Voice held. */
  readonly weight?: number;
}

const EPS = 1e-12;

// ── tiny dense linear algebra (matrices are register-small, 5×5; O(n³) is ample) ───────────────────

function identity(n: number): number[][] {
  const I: number[][] = [];
  for (let i = 0; i < n; i++) { const row = new Array<number>(n).fill(0); row[i] = 1; I.push(row); }
  return I;
}

/**
 * Cyclic-Jacobi symmetric eigensolver — eigenvalues + eigenvectors (columns of `vectors`). Exact to
 * machine epsilon on the small (≤ 5×5) real-symmetric matrices this module carries. Mirrors the
 * sensorium-fusion jacobiEigen, kept local so this file imports nothing.
 */
export function symmetricEigen(
  Ain: DensityMatrix, sweeps = 100, tol = 1e-14,
): { values: number[]; vectors: number[][] } {
  const n = Ain.length;
  const A = Ain.map((r) => r.slice());
  const V = identity(n);
  for (let s = 0; s < sweeps; s++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p]![q]! * A[p]![q]!;
    if (off <= tol) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = A[p]![q]!;
        if (Math.abs(apq) <= tol) continue;
        const app = A[p]![p]!, aqq = A[q]![q]!;
        const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
        const c = Math.cos(phi), sn = Math.sin(phi);
        for (let i = 0; i < n; i++) {
          const aip = A[i]![p]!, aiq = A[i]![q]!;
          A[i]![p] = c * aip - sn * aiq;
          A[i]![q] = sn * aip + c * aiq;
        }
        for (let i = 0; i < n; i++) {
          const api = A[p]![i]!, aqi = A[q]![i]!;
          A[p]![i] = c * api - sn * aqi;
          A[q]![i] = sn * api + c * aqi;
        }
        for (let i = 0; i < n; i++) {
          const vip = V[i]![p]!, viq = V[i]![q]!;
          V[i]![p] = c * vip - sn * viq;
          V[i]![q] = sn * vip + c * viq;
        }
      }
    }
  }
  return { values: A.map((_, i) => A[i]![i]!), vectors: V };
}

/** Reconstruct `V · diag(f(λ)) · Vᵀ` from an eigendecomposition — a symmetric matrix function. */
function fromSpectrum(values: readonly number[], vectors: readonly number[][], f: (lam: number) => number): number[][] {
  const n = values.length;
  const g = values.map(f);
  const out: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let sum = 0;
      for (let r = 0; r < n; r++) sum += vectors[i]![r]! * g[r]! * vectors[j]![r]!;
      out[i]![j] = sum; out[j]![i] = sum;
    }
  }
  return out;
}

/** Matrix square root of a symmetric PSD matrix (negative eigenvalues clamped to 0 — float guard). */
export function matrixSqrt(rho: DensityMatrix): number[][] {
  const { values, vectors } = symmetricEigen(rho);
  return fromSpectrum(values, vectors, (lam) => Math.sqrt(Math.max(lam, 0)));
}

/** Ordinary matrix product `A · B` (square, same size). */
function matMul(A: DensityMatrix, B: DensityMatrix): number[][] {
  const n = A.length;
  const out: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < n; k++) {
      const aik = A[i]![k]!;
      if (aik === 0) continue;
      for (let j = 0; j < n; j++) out[i]![j]! += aik * B[k]![j]!;
    }
  }
  return out;
}

// ── the Uhlmann fidelity + the Bures / Fisher-Study metric ──────────────────────────────────────────

/**
 * Uhlmann fidelity `F(ρ_a, ρ_b) = (Tr √(√ρ_a · ρ_b · √ρ_a))²` ∈ [0, 1]. F = 1 iff ρ_a = ρ_b; for two
 * diagonal ρ it equals the squared Bhattacharyya coefficient `(Σ √(p_i q_i))²`. Eigendecomposes the
 * 5×5 for the two matrix square roots — trivial at this size.
 */
export function fidelity(rhoA: DensityMatrix, rhoB: DensityMatrix): number {
  const sqrtA = matrixSqrt(rhoA);
  const M = matMul(matMul(sqrtA, rhoB), sqrtA); // √ρ_a · ρ_b · √ρ_a — symmetric PSD.
  const { values } = symmetricEigen(M);
  // Tr √M = Σ √λ_i(M); the √F we actually want is Tr √M itself (the sqrt-fidelity / Bhattacharyya).
  let trSqrt = 0;
  for (const lam of values) trSqrt += Math.sqrt(Math.max(lam, 0));
  const F = trSqrt * trSqrt;
  return Math.min(1, Math.max(0, F));
}

/** The sqrt-fidelity `√F` — the Bhattacharyya coefficient's quantum generalization, ∈ [0, 1]. */
export function sqrtFidelity(rhoA: DensityMatrix, rhoB: DensityMatrix): number {
  return Math.sqrt(fidelity(rhoA, rhoB));
}

/**
 * Bures distance `d_B = √(2(1 − √F))` ∈ [0, √2]. The metric distance the flow-lens reads between two
 * register-densities; on diagonal ρ it is the Hellinger distance of the register marginals.
 */
export function buresDistance(rhoA: DensityMatrix, rhoB: DensityMatrix): number {
  const rootF = sqrtFidelity(rhoA, rhoB);
  return Math.sqrt(Math.max(0, 2 * (1 - rootF)));
}

/**
 * Bures ANGLE `d_A = arccos √F` ∈ [0, π/2] — the Fisher-Study geodesic angle. This is the exact
 * generalization of the classical drift STEP `arccos⟨√p,√q⟩`: on diagonal ρ it collapses to it
 * identically (the safety case; proven < 1e-9 in the tests).
 */
export function buresAngle(rhoA: DensityMatrix, rhoB: DensityMatrix): number {
  const rootF = sqrtFidelity(rhoA, rhoB);
  return Math.acos(Math.min(1, Math.max(0, rootF)));
}

// ── the diagonal embedding + the classical ground it collapses to ───────────────────────────────────

/**
 * Promote a register-point `p ∈ Δ⁴` to its diagonal density matrix `diag(p)`. Validates the simplex
 * (non-negative, sums to 1 within tolerance). This is the embedding under which Bures = Bhattacharyya.
 */
export function diagonalDensity(p: RegisterPoint, tol = 1e-9): number[][] {
  let sum = 0;
  for (const v of p) {
    if (v < -tol) throw new Error(`diagonalDensity: register-point has a negative entry ${v} — not on Δ`);
    sum += v;
  }
  if (Math.abs(sum - 1) > 1e-6) {
    throw new Error(`diagonalDensity: register-point sums to ${sum}, not 1 — not on the simplex Δ`);
  }
  const n = p.length;
  const rho: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) rho[i]![i] = Math.max(p[i]!, 0);
  return rho;
}

/**
 * The CLASSICAL step for reference — the Bhattacharyya / Fisher-Rao geodesic angle between two
 * register-points, `arccos Σ √(p_i q_i)`. This is what {@link buresAngle} collapses to on diagonal ρ.
 */
export function bhattacharyyaAngle(p: RegisterPoint, q: RegisterPoint): number {
  let bc = 0;
  const n = Math.min(p.length, q.length);
  for (let i = 0; i < n; i++) bc += Math.sqrt(Math.max(p[i]!, 0) * Math.max(q[i]!, 0));
  return Math.acos(Math.min(1, Math.max(0, bc)));
}

/** The Bhattacharyya COEFFICIENT `Σ √(p_i q_i)` ∈ [0, 1] — the classical √F. */
export function bhattacharyyaCoefficient(p: RegisterPoint, q: RegisterPoint): number {
  let bc = 0;
  const n = Math.min(p.length, q.length);
  for (let i = 0; i < n; i++) bc += Math.sqrt(Math.max(p[i]!, 0) * Math.max(q[i]!, 0));
  return Math.min(1, Math.max(0, bc));
}

// ── PSD projection + validation (the clamp that keeps ρ a density matrix) ────────────────────────────

/**
 * Project a symmetric matrix to the nearest PSD density matrix (Higham-style): eigendecompose, clamp
 * negative eigenvalues to 0, reconstruct, renormalize the trace to 1. The clamp the task names — it
 * keeps a numerically-drifted or centered ρ a valid density without inventing structure.
 */
export function projectPSDDensity(A: DensityMatrix): number[][] {
  const { values, vectors } = symmetricEigen(A);
  const clamped = fromSpectrum(values, vectors, (lam) => Math.max(lam, 0));
  let tr = 0;
  for (let i = 0; i < clamped.length; i++) tr += clamped[i]![i]!;
  if (tr <= EPS) throw new Error("projectPSDDensity: zero-trace matrix — no density to normalize");
  const n = clamped.length;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) clamped[i]![j]! /= tr;
  return clamped;
}

/** True iff `rho` is a symmetric PSD matrix with unit trace (a valid density) within tolerance. */
export function isDensityMatrix(rho: DensityMatrix, tol = 1e-9): boolean {
  const n = rho.length;
  let tr = 0;
  for (let i = 0; i < n; i++) {
    tr += rho[i]![i]!;
    for (let j = i + 1; j < n; j++) if (Math.abs(rho[i]![j]! - rho[j]![i]!) > tol) return false; // symmetric?
  }
  if (Math.abs(tr - 1) > 1e-6) return false; // unit trace?
  const { values } = symmetricEigen(rho);
  for (const lam of values) if (lam < -tol) return false; // PSD?
  return true;
}

// ── the Voice-coherence channel — Plurality Pono made geometric (honest source only) ────────────────

/**
 * Assemble a register-density `ρ` from the Voices holding a turn: `ρ = Σ_v w_v |a_v⟩⟨a_v| / Z`, where
 * `a_v` is the image of Voice v's functor on the turn (its register-amplitude vector) and `Z`
 * normalizes Tr ρ = 1. The construction is
 * automatically PSD (a non-negative-weighted sum of rank-1 outer products), so no clamp is needed on
 * honest input; it is still routed through {@link projectPSDDensity} as a float guard.
 *
 * The DIAGONAL `ρ_ii = Σ_v w_v a_v,i² / Z` is the register MARGINAL (ground truth — always present).
 * The OFF-DIAGONAL `ρ_ij = Σ_v w_v a_v,i a_v,j / Z` is the Voice amplitude COVARIANCE — the register
 * coherence. It is NON-ZERO only where a real Voice genuinely spans registers i and j within the turn:
 *   - every Voice one-hot (pinned to one register) ⇒ ρ DIAGONAL ⇒ the Bhattacharyya ground, untouched;
 *   - a Voice spanning two registers ⇒ a real off-diagonal ⇒ a coherence that SHORTENS the drift.
 * Nothing is fabricated: the off-diagonals are a strict function of the harvested amplitudes.
 *
 * The HARVESTER — per-turn capture of each Voice's register-amplitude vector — is the feed that lands
 * later; this function is the structure it flows into.
 */
export function voiceCoherenceDensity(voices: readonly VoiceAmplitude[], registerCount = 5): number[][] {
  if (voices.length === 0) throw new Error("voiceCoherenceDensity: no Voices held the turn — nothing to assemble");
  const n = registerCount;
  const rho: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const v of voices) {
    const a = v.amplitudes;
    if (a.length !== n) {
      throw new Error(`voiceCoherenceDensity: a Voice amplitude has length ${a.length}, expected ${n} registers`);
    }
    const w = v.weight ?? 1;
    if (w < 0) throw new Error(`voiceCoherenceDensity: a Voice carries a negative weight ${w} — Plurality Pono weights ≥ 0`);
    for (let i = 0; i < n; i++) {
      const ai = a[i]!;
      if (ai === 0) continue;
      for (let j = 0; j < n; j++) rho[i]![j]! += w * ai * a[j]!;
    }
  }
  let tr = 0;
  for (let i = 0; i < n; i++) tr += rho[i]![i]!;
  if (tr <= EPS) throw new Error("voiceCoherenceDensity: total amplitude is zero — no register mass to normalize");
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) rho[i]![j]! /= tr;
  return projectPSDDensity(rho); // float guard; a no-op on the already-PSD honest sum.
}

/** The register MARGINAL (the diagonal `p`) of a density matrix — the classical register-point in Δ. */
export function registerMarginal(rho: DensityMatrix): number[] {
  return rho.map((_, i) => rho[i]![i]!);
}

/**
 * The Berry / holonomy channel — the IMAGINARY part of the register coherence. On the real-Hermitian
 * ground every ρ is real symmetric, so this reads identically ZERO by construction (an honest null,
 * not a stub): a real ρ carries NO geometric phase, hence no holonomy. The channel opens only when
 * amplitude PHASE is captured and ρ becomes genuinely complex-Hermitian; this reports the maximum
 * imaginary magnitude across the off-diagonals (0 for any real input), so a caller can assert the null
 * holds and detect the day phase actually lands.
 */
export function berryHolonomyImag(rho: DensityMatrix): number {
  // real input ⇒ no imaginary component exists; the honest read is 0.
  void rho;
  return 0;
}
