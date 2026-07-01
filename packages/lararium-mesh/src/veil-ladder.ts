/**
 * veil-ladder — the three rungs of a self on the DreamNet, in code: THROWAWAY anon →
 * LIVED anon → pledged HANDLE. Reputation is BORN bottom-up (earned by works at the lived
 * rung, not granted by a pledge). The lived rung walks the rep⊥anonymity tightrope by
 * ROTATION — carry positive rep onto a fresh key (a veil-crossing HOLD), resetting the
 * linkability clock. The pledge PROMOTES a lived anon into a published Handle on a
 * slashable voucher-edge (veil-vouch).
 *
 * Canon: lar:///ha.ka.ba/@lares/api/pono/the-veil-ladder.
 * Platform-blind: rides ./veil-vouch types + a fresh key from ./veil-crossing. NO node:.
 * Meme: lar:///ha.ka.ba/@lares/api/pono/the-veil-ladder
 */

import type { Voucher } from "./veil-vouch.js";

export type VeilRung = "throwaway" | "lived" | "handle";

/** A self's current standing on the ladder. Immutable; every transition returns a new state. */
export interface VeilState {
  readonly rung: VeilRung;
  /** The key currently presented. A rotation or a burn swaps it for a fresh one. */
  readonly verifyingKey: string;
  /** Earned reputation — 0 at the throwaway floor; BORN at the lived rung by works. */
  readonly rep: number;
  /** Uses since the last refound — the linkability clock (higher = more deanonymizable). */
  readonly linkAge: number;
  /** Handle only — a DID/CID published to the DreamNet (multi-vessel, burnable). */
  readonly published: boolean;
  /** A chosen (lived) or published (Handle) name. Absent = nameless (throwaway). */
  readonly petname?: string;
  /** Handle only — the voucher key that pledged it (the slashable pledge-edge). */
  readonly pledgedBy?: string;
}

/** A fresh THROWAWAY veil — the privacy floor: one key, no name, no rep, no history. */
export function throwawayVeil(verifyingKey: string): VeilState {
  return { rung: "throwaway", verifyingKey, rep: 0, linkAge: 0, published: false };
}

/** THROWAWAY → LIVED: begin to persist. Reputation starts accruing by works from here. */
export function persistToLived(veil: VeilState, petname?: string): VeilState {
  if (veil.rung !== "throwaway") throw new Error("persistToLived: only a throwaway veil begins a lived life");
  const next: VeilState = { ...veil, rung: "lived" };
  return petname !== undefined ? { ...next, petname } : next;
}

/** EARN rep by works — LIVED only (rep is born here, not at a throwaway nor granted to a
 *  Handle). Persistence spends anonymity: each act of works climbs the linkability clock. */
export function earnRep(veil: VeilState, works: number): VeilState {
  if (veil.rung !== "lived") throw new Error("earnRep: reputation is born at the LIVED rung — a throwaway earns nothing, a Handle is granted not earning");
  if (!(works >= 0)) throw new RangeError(`earnRep: works must be >= 0, got ${works}`);
  return { ...veil, rep: veil.rep + works, linkAge: veil.linkAge + 1 };
}

/** ROTATE (lived → lived): carry POSITIVE rep onto a FRESH key, resetting the linkability
 *  clock to zero — the reconciliation of rep⊥anonymity. `freshVerifyingKey` comes from a
 *  veil-crossing HOLD (a fresh all-hardened path, no public back-link). Only earned rep
 *  rides; nothing negative can (that is the price, #the-price). */
export function rotate(veil: VeilState, freshVerifyingKey: string): VeilState {
  if (veil.rung !== "lived") throw new Error("rotate: only a lived anon rotates (a throwaway carries nothing; a Handle is published)");
  return { ...veil, verifyingKey: freshVerifyingKey, linkAge: 0 };   // rep carries; the clock resets
}

/** PLEDGE (lived → handle): a guild member pledges the anon's EARNED standing into a
 *  published, multi-vessel Handle on a slashable voucher-edge. The pledge LIFTS earned
 *  standing into the open — it never creates it (only a lived anon, with rep, may be pledged). */
export function pledgeToHandle(veil: VeilState, publishedName: string, voucher: Voucher): VeilState {
  if (veil.rung !== "lived") throw new Error("pledgeToHandle: only a lived anon may be pledged up — the pledge lifts earned standing, it does not create it");
  return { ...veil, rung: "handle", published: true, petname: publishedName, pledgedBy: voucher.voucherKeyHex };
}

/** BURN (handle → throwaway): the price. Forfeit the multi-vessel caps + the published
 *  standing, drop to the anon floor with a fresh key and nothing else. Dear for the accrued,
 *  worthless to a throwaway (the differential price of shedding a name). */
export function burn(veil: VeilState, freshVerifyingKey: string): VeilState {
  if (veil.rung !== "handle") throw new Error("burn: only a published Handle burns (a lived anon rotates or is abandoned; a throwaway is already floor)");
  return throwawayVeil(freshVerifyingKey);   // rep, name, publication, pledge — all gone
}

/** The linkability the tightrope has spent since the last refound — a lived veil watches
 *  this and rotates before it grows loud enough for the intersection attack to converge. */
export function linkability(veil: VeilState): number {
  return veil.linkAge;
}
