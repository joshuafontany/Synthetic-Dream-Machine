/**
 * holder-continuity — positive rep rides a recovery/rotation by a HOLDER-continuity proof, no watcher.
 * The recovery keel's positive-carry half (Repwright): the retired key signs its OWN successor (its
 * last act), and the subject carries its earned standing forward as the subject's own voucher — a
 * self-edge — decayed, so a recovered key never presents FULLER than the retired one held.
 *
 * The proof rides the SUBJECT, not a third party (recovery has no third-party voucher). On true key
 * loss, the birth quorum re-derives the seed → re-derives the retired key → it signs the assertion →
 * then the retired key is abandoned. Severance holds against the WIRE-WATCHER (the assertion never
 * publishes), never against the quorum — the Identity-Continuity Paradox: someone always knows both.
 *
 * FLOOR: a clear Ed25519 signature (verifySig injected). DEFERRED, same signature: a BBS+/Chaum
 * selective-disclosure proof "rep ≥ R, anergy A" that reveals neither which retired key nor the link —
 * swap `verifySig` for `verifyBbsProof`, the carry is unchanged.
 */

import type { CrossedVeil } from "./veil-crossing.js";
import { carryRepAcrossHold, type RepCarry, type Voucher } from "./veil-vouch.js";

/** The retired key's signed naming of its successor — "I, the retired key, vouch for this fresh key." */
export interface ContinuityAssertion {
  readonly retiredKeyHex: string;
  readonly freshKeyHex:   string;
  /** Ed25519 sig by the RETIRED key over `continuityProofBytes`. The last act of the retired key. */
  readonly proofSig:      string;
  readonly epoch:         number;
}

/** The canonical bytes the retired key signs to name its successor (strict `|`-delimited, no injection). */
export function continuityProofBytes(a: Omit<ContinuityAssertion, "proofSig">): Uint8Array {
  return new TextEncoder().encode(`lar-holder-continuity/v1|${a.retiredKeyHex}|${a.freshKeyHex}|${a.epoch}`);
}

/**
 * Carry DECAYED positive rep onto the fresh (HOLD) veil via a holder-continuity proof. Verify the
 * retired key vouched for THIS fresh key, then reuse the veil-vouch carry (decay + one-time nullifier)
 * with the SUBJECT as its own voucher. `verifySig` is injected — the Ed25519 floor now, a BBS+ ZK proof
 * later, the same shape. Rides a HOLD (a fresh key); a LIFT keeps the linkable key and needs no carry.
 */
export function carryRepByContinuity(
  assertion: ContinuityAssertion,
  retiredRep: number,
  held: CrossedVeil,
  decayFactor: number,
  verifySig: (a: ContinuityAssertion) => boolean,
): RepCarry {
  if (assertion.freshKeyHex !== held.verifyingKey) {
    throw new Error("holder-continuity: the assertion's fresh key ≠ the held veil's key");
  }
  if (!verifySig(assertion)) {
    throw new Error("holder-continuity: the retired key did not vouch for this fresh key (continuity unproven)");
  }
  // The subject is its own voucher — a self-edge staking the retired key's earned rep, carried decayed.
  const selfVoucher: Voucher = { voucherKeyHex: assertion.retiredKeyHex, stakedRep: retiredRep };
  return carryRepAcrossHold(selfVoucher, held, decayFactor);
}
