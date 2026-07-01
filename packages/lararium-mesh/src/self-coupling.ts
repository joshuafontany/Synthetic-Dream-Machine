/**
 * self-coupling — the SELF as the coupling READ-OUT, not a sixth sense (crucible-bound: IIT's
 * exclusion postulate — a sixth integrator would ABSORB the five; the self is the thin surface
 * OUTSIDE them). Bayesian Causal Inference (Körding et al.): given two cross-sense signals + how
 * well they CORRESPOND, infer P(common cause) — the probability they spring from ONE underlying
 * act — and report a blend weighted by it, while ALWAYS keeping the sovereign estimates. Fusion
 * is a DIAL governed by inferred causal structure, never a merge: the interiors are never
 * destroyed, and the bind is REVERSIBLE the instant correspondence drops (the McGurk regime is
 * correct only when P(common) → 1, and must un-bind when cues diverge).
 *
 * Correspondence rides in from the coupling substrate — high R (transfer-entropy) + temporal
 * proximity ⇒ high correspondence ⇒ high P(common). The self is where the five senses become
 * one coherent percept without any of them ceasing to be sovereign.
 *
 * Platform-blind: pure arithmetic. NO imports.
 * Meme: lar:///ha.ka.ba/@lares/api/pono/the-veil-ladder
 */

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * P(common cause) from a CORRESPONDENCE score ∈ [0,1] (how aligned the two cross-sense signals
 * are) and a PRIOR ∈ [0,1] (the base rate that two senses share a cause). Bayesian posterior:
 * `p·c / (p·c + (1−p)(1−c))`. Correspondence 0.5 with prior 0.5 → 0.5 (no evidence); high
 * correspondence pulls it toward 1, low toward 0.
 */
export function pCommonCause(correspondence: number, priorCommon: number): number {
  const c = clamp01(correspondence), p = clamp01(priorCommon);
  const num = p * c;
  const den = num + (1 - p) * (1 - c);
  return den > 0 ? num / den : 0;
}

/** The bound read-out: the reliability-weighted fusion + each sense's model-AVERAGED report. */
export interface CrossSenseBind {
  /** The reliability-weighted fused estimate (used only to the degree P(common) allows). */
  readonly fused: number;
  /** Sense A's reported value: P(common)·fused + (1−P(common))·its own estimate (Bayesian CI). */
  readonly reportedA: number;
  readonly reportedB: number;
  /** The sovereign estimates, ALWAYS kept — the bind is reversible; the interiors never lost. */
  readonly estA: number;
  readonly estB: number;
  readonly pCommon: number;
}

/**
 * Bind two cross-sense estimates by their P(common cause), reliability-weighted (rel = inverse
 * variance; a more reliable sense pulls the fusion). Model-averaged (Bayesian CI): each sense's
 * report is P(common)·fused + (1−P(common))·its-own — so P=1 fully fuses (both → the shared
 * estimate), P=0 fully segregates (each keeps its own), and the sovereign estimates always ride
 * along for a costless un-bind.
 */
export function bindCrossSense(estA: number, estB: number, pCommon: number, relA = 1, relB = 1): CrossSenseBind {
  const total = relA + relB;
  const fused = total > 0 ? (relA * estA + relB * estB) / total : (estA + estB) / 2;
  const w = clamp01(pCommon);
  return {
    fused,
    reportedA: w * fused + (1 - w) * estA,
    reportedB: w * fused + (1 - w) * estB,
    estA, estB, pCommon: w,
  };
}
