/**
 * nucleation-gate — a candidate sink is BORN not on accreted support alone (the frequency trap) but
 * when support crosses a CRITICAL-NUCLEUS barrier. Classical nucleation theory: a cluster's free energy
 *   ΔG(r) = −(4/3)π·Δg·r³ + 4π·γ·r²
 * fights a VOLUME gain (∝ r³, the driving force Δg) against a SURFACE cost (∝ r², the price γ of positing
 * a bounded standing entity — the naming/index cost a frequency count cannot see). The sum has a SADDLE at
 *   r* = 2γ/Δg          (the critical radius)
 *   ΔG* = 16π·γ³/(3·Δg²) (the barrier height)
 * Below r* surface dominates → the candidate DISSOLVES (reap it, never re-mint). Above r* volume dominates
 * → it self-sustains (BORN). Three consequences a linear threshold cannot give:
 *   · the gate is a saddle with a metastable band → sub-critical recurrers are REAPED, not re-minted;
 *   · γ enters the barrier cubically → cheap naming (UUID-first) is barrier ENGINEERING, not ergonomics;
 *   · r* is SUPERSATURATION-ADAPTIVE (r*=2γ/Δg): a dense feed raises Δg → lowers r* → nucleates sinks a
 *     static threshold would miss (the capture-stall cure — an unfed island's r*→∞, so it never nucleates).
 *
 * The DRIVE Δg is CROSS-PLANE AGREEMENT (a sink survives because the planes agree — surprise, not
 * single-plane frequency), weighted by plane INDEPENDENCE: two planes moving in lockstep collapse into one
 * voice (the no-parallel-fifths guard), so correlated/derived planes count once, not twice.
 *
 * The condensation order-parameter grades naming (bare UUID → canonical) — naming is a phase transition
 * crossed on cross-plane cementation, not a labelling act.
 *
 * Rigidity certification (does a born sink RE-LOCK its rhythm after a perturbation — the time-crystal
 * transfer) rides a separate perturb-and-resettle pass; this gate decides BIRTH from support + agreement.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/mesh/flow
 */

/** A per-plane agreement signal for one candidate: how strongly this plane attests the unit (0..1). */
export interface PlaneSignal {
  readonly plane: string;
  readonly agreement: number; // clamped to [0,1]
}

export interface NucleationInput {
  /** Accreted support — the candidate's "size" r (reference/cap count; ≥ 0). */
  readonly support: number;
  /** Per-plane agreement signals — the cross-plane drive (a sink needs ≥2 planes to be more than noise). */
  readonly planes: readonly PlaneSignal[];
  /** Supersaturation proxy: recent related-material arrival rate (the Floquet drive / feeding). Default 1
   *  = equilibrium. >1 = a burst (lowers r*); →0 = an unfed/dilute island (r*→∞, never nucleates). */
  readonly arrivalRate?: number;
  /** γ — the surface cost of positing a bounded entity (the naming/index price). UUID-first keeps it cheap. */
  readonly surfaceCost?: number;
  /** Optional pairwise |correlation| among the planes (same order as `planes`), for the independence guard.
   *  A plane's weight = 1 − mean|corr| with the others; omitted ⇒ all planes fully independent. */
  readonly planeCorrelation?: readonly (readonly number[])[];
}

export interface NucleationVerdict {
  /** Did support cross the critical nucleus (self-sustaining) vs stay sub-critical (dissolve)? */
  readonly born: boolean;
  /** r* = 2γ/Δg — the critical radius (Infinity when there is no drive: reap). */
  readonly criticalRadius: number;
  /** ΔG* = 16π·γ³/(3·Δg²) — the barrier height (Infinity when there is no drive). */
  readonly barrier: number;
  /** Δg — the independence-weighted cross-plane agreement × supersaturation (the driving force). */
  readonly drive: number;
  /** The condensation order-parameter ∈ [0,1): 0 = pure fluctuation, →1 = canonical. 0.5 at r = r*. */
  readonly condensation: number;
}

/** Default γ — cheap, honoring UUID-first (a low naming cost lowers r* everywhere). */
export const GAMMA_UUID_FIRST = 1;

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Mean |off-diagonal correlation| among the planes (0 when uncorrelated / < 2 planes). */
function meanOffDiagCorr(n: number, corr?: readonly (readonly number[])[]): number {
  if (!corr || n <= 1) return 0;
  let sum = 0;
  let cnt = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      sum += Math.abs(corr[i]?.[j] ?? 0);
      cnt += 1;
    }
  }
  return cnt ? clamp01(sum / cnt) : 0;
}

/** Effective number of INDEPENDENT voices: n/(1+(n−1)ρ). Uncorrelated (ρ=0) → n; fully-parallel (ρ=1) → 1
 *  (the no-parallel-fifths guard: lockstep planes collapse to ONE voice, never doubling the drive). */
function effectiveVoices(n: number, corr?: readonly (readonly number[])[]): number {
  if (n <= 1) return n;
  const rho = meanOffDiagCorr(n, corr);
  return n / (1 + (n - 1) * rho);
}

/**
 * Decide whether a candidate sink NUCLEATES. The drive Δg = (independence-weighted mean cross-plane
 * agreement) × (supersaturation); r* = 2γ/Δg; born iff support ≥ r*.
 */
export function nucleate(input: NucleationInput): NucleationVerdict {
  const gamma = input.surfaceCost ?? GAMMA_UUID_FIRST;
  const supersaturation = Math.max(0, input.arrivalRate ?? 1);
  const planes = input.planes;

  // Mean per-plane agreement (how strongly each plane attests) × the effective number of INDEPENDENT
  // voices (corroboration adds; lockstep planes count once — the no-parallel-fifths guard).
  let sumA = 0;
  for (const p of planes) sumA += clamp01(p.agreement);
  const meanAgreement = planes.length > 0 ? sumA / planes.length : 0;
  const voices = effectiveVoices(planes.length, input.planeCorrelation);

  // The driving force: agreement × independent-corroboration × supersaturation (the feeding drive).
  const drive = meanAgreement * voices * supersaturation;

  if (drive <= 0) {
    // No drive (no agreement, or an unfed island) → r*→∞, ΔG*→∞ → never nucleates; reap.
    return { born: false, criticalRadius: Infinity, barrier: Infinity, drive: 0, condensation: 0 };
  }

  const criticalRadius = (2 * gamma) / drive;                       // r* = 2γ/Δg
  const barrier = (16 * Math.PI * gamma ** 3) / (3 * drive ** 2);   // ΔG* = 16πγ³/3Δg²
  const born = input.support >= criticalRadius;
  // Condensation order-parameter: 0.5 at the barrier, →1 far above, →0 far below (Hill-like, smooth).
  const condensation = input.support / (input.support + criticalRadius);

  return { born, criticalRadius, barrier, drive, condensation };
}
