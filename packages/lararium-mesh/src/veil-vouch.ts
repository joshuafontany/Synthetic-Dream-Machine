/**
 * veil-vouch — the siege-cost that lets a HOLD (refound) carry REPUTATION without a public
 * link. The recorded design (mempalace, #the-siege-gate, a 4-blind-domain swarm: Sybil-graph
 * defense · ZK-credential · immune costimulation · club economics):
 *
 *   · THE VOUCHER IS THE COST — marginal-not-absolute (rb>c, the voucher supplies r); the
 *     voucher CO-PAYS and WATCHES (stakes standing; slashed on the vouchee's misbehavior);
 *     anergy-not-ban (no vouch → stay at the anon floor, re-presentable).
 *   · PRICE THE HOLD AT THE STAKE — a voucher carries DECAYED rep onto the fresh veil (never
 *     full: decay < 1 blocks free rep-teleport). The fresh key stays PUBLIC-unlinkable
 *     (veil-crossing HOLD); the rep rides the VOUCHER edge, not a link to the anon key.
 *   · ONE-TIME NULLIFIER = THE EPOCH-LEASE — consuming the carry spends a one-time slot, so
 *     the same voucher cannot sever-and-refound repeatedly to FARM fresh rep.
 *
 * This builds the MECHANISM; the operator's OPEN forks stay OPEN (parameters, not baked):
 *   · the exact DIAL NUMBERS (decay-rate, stake-fraction) — passed in, never hardcoded.
 *   · ONE kahu vs a THRESHOLD holds the blind-oracle link (Identity-Continuity Paradox:
 *     SOMEONE knows old↔new; fully-p2p zero-trust is impossible) — this floor models the
 *     voucher edge + the nullifier; the actual ZK blind-signature (the kahu certifying
 *     WITHOUT knowing which vessel) is the crypto layer above, deferred.
 *
 * Platform-blind: rides ./epoch-lease + ./veil-crossing only. NO node: imports.
 * Meme: lar:///ha.ka.ba/lares/api/pono/persona-circle
 */

import { leaseEpochSlotUri } from "./epoch-lease.js";
import type { CrossedVeil } from "./veil-crossing.js";

/** A voucher edge — who vouches, and how much of their standing they stake (rb>c, slashable). */
export interface Voucher {
  readonly voucherKeyHex: string;
  /** The rep the voucher co-pays; slashed (by revocation) if the vouchee misbehaves. */
  readonly stakedRep: number;
}

/** DECAYED reputation carried onto a fresh (HOLD) veil, guarded by a one-time nullifier. */
export interface RepCarry {
  /** stakedRep × decayFactor — the fresh veil inherits DECAYED rep, never full. */
  readonly carriedRep: number;
  /** One-time (an epoch-lease slot) — spent once; blocks sever-and-refound rep-farming. */
  readonly nullifier: string;
  readonly voucherKeyHex: string;
}

/**
 * The one-time nullifier for a (voucher, fresh-veil) carry — an epoch-lease slot keyed by
 * the fresh veil + the voucher. Spent once (set in the lease store); a replay reads spent.
 */
export function nullifierForHold(voucherKeyHex: string, freshVeilKeyHex: string): string {
  return leaseEpochSlotUri(freshVeilKeyHex, voucherKeyHex);
}

/**
 * PRICE THE HOLD AT THE STAKE — carry a voucher's DECAYED rep onto a fresh (HOLD) veil.
 * Rides a HOLD only (a LIFT already keeps the linkable key + its rep — no carry needed).
 * `decayFactor` ∈ [0,1] is the operator's dial (recorded design leaves the exact number
 * OPEN); < 1 always, so the fresh veil never inherits full rep (no free teleport).
 */
export function carryRepAcrossHold(voucher: Voucher, held: CrossedVeil, decayFactor: number): RepCarry {
  if (held.mode !== "hold") {
    throw new Error("carryRepAcrossHold: rep-carry rides a HOLD (refound), not a LIFT (already linkable)");
  }
  if (!(decayFactor >= 0 && decayFactor <= 1)) {
    throw new RangeError(`carryRepAcrossHold: decayFactor must be in [0,1], got ${decayFactor}`);
  }
  return {
    carriedRep: voucher.stakedRep * decayFactor,
    nullifier: nullifierForHold(voucher.voucherKeyHex, held.verifyingKey),
    voucherKeyHex: voucher.voucherKeyHex,
  };
}

/** Has this one-time nullifier been spent? (the anti-farming guard; `spent` = the lease store.) */
export function isNullifierSpent(nullifier: string, spent: ReadonlySet<string>): boolean {
  return spent.has(nullifier);
}
