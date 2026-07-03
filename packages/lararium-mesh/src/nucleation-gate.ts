/**
 * nucleation-gate — a candidate sink NUCLEATES not on accreted support alone (the frequency trap) but
 * when support crosses a CRITICAL-NUCLEUS barrier. Classical nucleation theory gives a cluster's free energy
 *   ΔG(r) = −(4/3)π·Δg·r³ + 4π·γ·r²
 * fights a VOLUME gain (∝ r³, the driving force Δg) against a SURFACE cost (∝ r², the price γ of positing
 * a bounded standing entity — the naming/index cost a frequency count cannot see). The sum has a SADDLE at
 *   r* = 2γ/Δg          (the critical radius)
 *   ΔG* = 16π·γ³/(3·Δg²) (the barrier height — returned as telemetry; see NOTE below)
 * Below r* the candidate DISSOLVES; above r* it self-sustains (BORN). γ enters the barrier cubically →
 * cheap naming (UUID-first) lowers r* everywhere; r* ADAPTS to supersaturation (a burst raises Δg →
 * lowers r* → nucleates sinks a static threshold would miss; an unfed island's Δg→0 so r*→∞, never born).
 *
 * The DRIVE Δg = mean per-plane agreement × (effective INDEPENDENT PLANES − 1) × supersaturation:
 *   · CROSS-PLANE agreement, not single-plane frequency — the `(effectivePlanes − 1)` factor makes a LONE
 *     plane yield ZERO drive (never born), enforcing the cross-plane thesis STRUCTURALLY, not by comment;
 *   · effectivePlanes = n/(1+(n−1)ρ) on the SIGNED mean correlation ρ (Kish effective sample size),
 *     floored at ρ ≥ −1/(n−1)+ε so anti-correlated planes count as MORE independent (corroboration) yet
 *     never drive to infinity — lockstep/derived planes (ρ→1) collapse to ONE effective plane.
 *
 * ONTOLOGY NOTE: "effective planes" here NAMES independent corroborating SIGNAL STREAMS (the counterpoint
 * no-parallel-fifths rhyme: lockstep lines collapse to one). This stays DISTINCT from the house's "Voice"
 * (a Kahea-able handle on move-potentials/functors in l-space) — do NOT conflate; the code never says "voice".
 *
 * NOTE (honest POSIWID): this function runs PURE + STATELESS — it decides BIRTH from one candidate's
 * (support, plane-agreements, arrivalRate). It holds NO cross-call state, so it cannot itself "reap"
 * sub-critical recurrers or ripen sinks; and `barrier` rides as telemetry but does NOT gate `born`
 * (birth rides the r* radius comparison). Metastable reaping, Ostwald ripening, decay, and the self-adaptive
 * calibration of γ / supersaturation-baseline / thresholds all ride the feed-it-emerges Sink accumulator
 * (the next-phase redesign), never this function.
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
  /** Per-plane agreement signals — the cross-plane drive (a lone plane yields zero drive: never born). */
  readonly planes: readonly PlaneSignal[];
  /** Supersaturation proxy: recent related-material arrival rate (the feeding drive). Default 1. A burst
   *  (>1) lowers r*; an unfed/dilute island (→0) sends r*→∞ (never nucleates). */
  readonly arrivalRate?: number;
  /** γ — the surface cost of positing a bounded entity (the naming/index price). UUID-first keeps it cheap. */
  readonly surfaceCost?: number;
  /** Optional SIGNED pairwise correlation among the planes (n×n, symmetric, diag 1), for the effective-
   *  plane count. Omitted ⇒ all planes independent. A shape mismatch throws (fail-loud). */
  readonly planeCorrelation?: readonly (readonly number[])[];
}

export interface NucleationVerdict {
  /** Did support cross the critical nucleus (self-sustaining) vs stay sub-critical (dissolve)? */
  readonly born: boolean;
  /** r* = 2γ/Δg — the critical radius (Infinity when no drive stands: reap). */
  readonly criticalRadius: number;
  /** ΔG* = 16π·γ³/(3·Δg²) — the barrier height (telemetry only; does NOT gate `born`). */
  readonly barrier: number;
  /** Δg — mean agreement × (effectivePlanes − 1) × supersaturation (the driving force). */
  readonly drive: number;
  /** Effective number of INDEPENDENT PLANES (n/(1+(n−1)ρ), signed-ρ, PSD-floored) — corroborating signal
   *  streams, NOT the house's "Voice". */
  readonly effectivePlanes: number;
  /** Saturation ∈ [0,1): support/(support+r*) — 0.5 at r*, →1 above. A FILL ratio, NOT a naming signal. */
  readonly condensation: number;
  /** True when the input was non-finite/garbage — distinct from a valid sub-critical `born:false`. */
  readonly invalid: boolean;
}

/** Default γ — cheap, honoring UUID-first (a low naming cost lowers r* everywhere). */
export const GAMMA_UUID_FIRST = 1;

/** Finite-safe clamp to [0,1] — NaN/±Infinity → 0 (never propagate garbage). */
const clamp01 = (x: number): number => (Number.isFinite(x) ? (x < 0 ? 0 : x > 1 ? 1 : x) : 0);

const INVALID: NucleationVerdict = {
  born: false, criticalRadius: Infinity, barrier: Infinity, drive: 0, effectivePlanes: 0, condensation: 0, invalid: true,
};

/** Signed mean |off-diagonal| correlation among n planes (0 when uncorrelated / < 2 planes). Validates shape. */
function meanSignedCorr(n: number, corr?: readonly (readonly number[])[]): number {
  if (!corr || n <= 1) return 0;
  if (corr.length !== n) throw new Error(`nucleation-gate: planeCorrelation must be ${n}×${n}, got ${corr.length} rows`);
  let sum = 0;
  let cnt = 0;
  for (let i = 0; i < n; i++) {
    const row = corr[i]!;
    if (row.length !== n) throw new Error(`nucleation-gate: planeCorrelation row ${i} must have ${n} entries, got ${row.length}`);
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const c = row[j] ?? 0;
      if (!Number.isFinite(c)) throw new Error(`nucleation-gate: planeCorrelation[${i}][${j}] is non-finite`);
      sum += c;
      cnt += 1;
    }
  }
  return cnt ? sum / cnt : 0;
}

/** Effective independent PLANES n/(1+(n−1)ρ): ρ=0 → n, ρ=1 → 1 (parallel = one plane), ρ<0 → >n
 *  (anti-correlated corroboration), with a PSD-safe floor ρ ≥ −1/(n−1)+ε so it never diverges. */
function effectivePlaneCount(n: number, corr?: readonly (readonly number[])[]): number {
  if (n <= 1) return n;
  const floor = -1 / (n - 1) + 1e-3;                 // PSD-safe: denom stays > 0 → n_eff finite
  const rho = Math.min(1, Math.max(floor, meanSignedCorr(n, corr)));
  return n / (1 + (n - 1) * rho);
}

/**
 * Decide whether a candidate sink NUCLEATES. drive Δg = mean agreement × (effective planes − 1) ×
 * supersaturation; r* = 2γ/Δg; born iff support ≥ r*. A lone plane (effectivePlanes=1 → factor 0) never nucleates.
 * Non-finite input fails loud (invalid), never a deceptive `born:false`. planeCorrelation shape errors throw.
 */
export function nucleate(input: NucleationInput): NucleationVerdict {
  const gamma = input.surfaceCost ?? GAMMA_UUID_FIRST;
  const supersaturation = input.arrivalRate ?? 1;
  const support = input.support;
  // Fail loud on garbage scalars — distinct from a valid sub-critical verdict.
  if (!Number.isFinite(gamma) || !Number.isFinite(supersaturation) || !Number.isFinite(support) || gamma < 0 || supersaturation < 0) {
    return INVALID;
  }
  const size = Math.max(0, support);
  const planes = input.planes;

  let sumA = 0;
  for (const p of planes) sumA += clamp01(p.agreement);
  const meanAgreement = planes.length > 0 ? sumA / planes.length : 0;
  const effectivePlanes = effectivePlaneCount(planes.length, input.planeCorrelation);

  // The driving force: agreement × (independent-corroboration − 1) × supersaturation. The
  // (effectivePlanes − 1) makes a single/lockstep plane yield ZERO drive — the cross-plane thesis,
  // enforced structurally.
  const drive = meanAgreement * Math.max(0, effectivePlanes - 1) * supersaturation;

  if (!(drive > 0)) {
    // No drive (lone plane, no agreement, or unfed) → r*→∞ → never nucleates; reap.
    return { born: false, criticalRadius: Infinity, barrier: Infinity, drive: 0, effectivePlanes, condensation: 0, invalid: false };
  }

  const criticalRadius = (2 * gamma) / drive;
  const barrier = (16 * Math.PI * gamma ** 3) / (3 * drive ** 2); // telemetry — does NOT gate born
  const born = size >= criticalRadius;
  const condensation = size / (size + criticalRadius); // saturation (fill ratio), NOT a naming signal

  return { born, criticalRadius, barrier, drive, effectivePlanes, condensation, invalid: false };
}
