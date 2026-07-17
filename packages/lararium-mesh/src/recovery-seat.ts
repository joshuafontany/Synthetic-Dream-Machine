/**
 * recovery-seat — the recovery keel's non-transferability guard (Repwright): recovery restores the
 * {seat + positive-via-continuity}, and the negative marks FOLLOW the subject via anergy-inheritance —
 * bound to the SAME nullifier, so you cannot spend the positive without emitting the negative. "Recover
 * into a clean slate" becomes unrepresentable.
 *
 * Three interlocking guards encode anonymity ⊥ non-transferability (Camenisch-Lysyanskaya):
 *   1. SHARED NULLIFIER — the positive carry and the anergy inheritance consume the ONE continuity slot.
 *      No path spends the rep without returning `inheritedAnergy`; want the credit, take the debts.
 *   2. LEDGER-READ, NON-OPTIONAL — `inheritedAnergy` is read from the ledger here, never caller-supplied;
 *      a caller cannot fabricate an empty slate.
 *   3. THE CLEAN SLATE ALREADY HAS A NAME — a genuinely clean state is `throwawayVeil` (rep=0), which IS
 *      the burn (forfeit rep + name + publication). The only door to a clean slate is to forfeit the
 *      standing — the differential price the ladder charges. Keep your debts with your credit, or shed
 *      both; never sort them.
 */

import type { CrossedVeil } from "./veil-crossing.js";
import { throwawayVeil, type VeilState } from "./veil-ladder.js";
import { isNullifierSpent } from "./veil-vouch.js";
import { carryRepByContinuity, type ContinuityAssertion } from "./holder-continuity.js";
import { inheritAnergy, type AnergyMark, type AnergyLedger } from "./anergy-ledger.js";

/** The seat a recovery restores. Constructible ONLY by `recoverSeat` — no public path yields positive
 *  rep with a fabricated-empty anergy set from a retired key that carried marks. */
export interface RecoveredVeil {
  readonly veil:            VeilState;              // rep = carried POSITIVE only (decayed)
  readonly inheritedAnergy: readonly AnergyMark[];  // NON-OPTIONAL — always present, may be empty
  readonly nullifier:       string;                 // the SAME slot the positive carry spent
}

/**
 * Recover a seat: carry the retired key's DECAYED positive rep forward by holder-continuity, and inherit
 * its anergy onto the fresh key — bound to one nullifier, indivisible. Throws if the continuity slot is
 * already spent (no recover-repeatedly-to-shed) or the continuity proof fails. The caller MUST hold the
 * fresh key (a HOLD crossing); the recovered veil sits at the LIVED rung carrying earned standing.
 */
export function recoverSeat(
  assertion: ContinuityAssertion,
  retired: { keyHex: string; rep: number },
  held: CrossedVeil,
  ledger: AnergyLedger,
  spent: ReadonlySet<string>,
  dials: { decayFactor: number },
  verifySig: (a: ContinuityAssertion) => boolean,
): RecoveredVeil {
  if (assertion.retiredKeyHex !== retired.keyHex) {
    throw new Error("recoverSeat: assertion retired key ≠ the named retired seat");
  }
  // (1) carry decayed positive rep by continuity — yields the one-time nullifier.
  const carry = carryRepByContinuity(assertion, retired.rep, held, dials.decayFactor, verifySig);
  // (2) the SAME nullifier is one-time: a spent slot blocks recover-repeatedly-to-shed.
  if (isNullifierSpent(carry.nullifier, spent)) {
    throw new Error("recoverSeat: continuity slot already spent (no repeat-recover-to-shed)");
  }
  // (3) inherit the retired key's anergy — READ from the ledger, never caller-supplied; age/hold preserved.
  const inheritedAnergy = inheritAnergy(ledger.marksFor(retired.keyHex), held.verifyingKey);
  // The recovered seat: lived rung, positive rep carried, negatives bound to the same nullifier.
  const veil: VeilState = { ...throwawayVeil(held.verifyingKey), rung: "lived", rep: carry.carriedRep };
  return { veil, inheritedAnergy, nullifier: carry.nullifier };
}
