/**
 * raise-challenge — the door a recognised operator walks through to raise a vessel off its floor.
 *
 * ── WHY A CHALLENGE AND NOT A CREDENTIAL ────────────────────────────────────────────────────────
 * `vessel-standing` carries the FENCE — a raise stands while `boundEpoch >= effective`. It says nothing
 * about how a raise gets minted, and the missing half is the dangerous one: a vessel at the floor holds no
 * clock and no trustworthy wall time, so any signed material PRESENTED to it replays forever. A thief
 * holding the disk and one captured raise-packet raises the stolen vessel, and the whole point of sealing
 * against a stolen disk evaporates (waking-floor#the-breaks b).
 *
 * So the freshness is VERIFIER-CHOSEN. The vessel emits a nonce bound to its own epoch head; the recogniser
 * signs THAT. A grant is answerable only to the exact challenge that provoked it, on the vessel that
 * provoked it, at the epoch it provoked it under — never a pre-baked blob anyone may carry.
 *
 * ── NOTHING HERE TOUCHES DISK, AND THAT IS THE RULING ───────────────────────────────────────────
 * A raise is PRESENCE, not storage. It lives for as long as the process holding it lives, and a reboot
 * drops the vessel back to its floor with nothing to resume. That is what keeps `SEATED ⊥ RAISED` true at
 * rest: a stolen disk still yields nothing of anybody's person, because no raise was ever written to one.
 * A caller that persists a grant re-opens exactly the bearer-credential hole the nonce closes.
 *
 * ── RECOGNITION REUSES THE MEMBERSHIP FOLD, AND INVENTS NO AUTHORITY ────────────────────────────
 * "Recognised" reads as a predicate this module takes rather than a roster it holds: the caller supplies
 * `recognises(nym)`, and the vessel answers it from the Nexus members fold it already carries — the same
 * quorum-signed, contract-in-verified set `nexus members --list` reports. So the raise borrows the
 * membership authority that already stands and mints no second one.
 *
 * A raise is a ①-VESSEL-layer act (waking-floor#the-raise-is-a-vessel-layer-act). The recogniser's caps
 * ride the recogniser's OWN key; nothing seats a persona root on the raised vessel, and
 * `personaSlotCeiling("herm") === 0` keeps that true whatever stands here.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/waking-floor
 */

import { RAISE_CHALLENGE_DOMAIN } from "./domains.js";
import { canonicalJsonBytes } from "./crypto.js";
import type { RaisedCaps } from "./vessel-standing.js";

/** Domain separation — a raise signature can never be replayed as any other act this house signs. */
const RAISE_DOMAIN = RAISE_CHALLENGE_DOMAIN;

/**
 * What a vessel EMITS to invite a raise. The nonce is the vessel's own; the epoch head names the fence the
 * resulting grant will bind to, so a challenge minted under one epoch cannot answer for another.
 */
export interface RaiseChallenge {
  /** Which vessel asks — its own verifying key. A grant for another vessel answers nothing here. */
  readonly vesselId: string;
  /** Which Nexus this raise would ride. A raise crosses no Nexus boundary. */
  readonly nexus:    string;
  /** The lease epoch standing when the challenge was minted — the fence the grant binds to. */
  readonly epoch:    number;
  /** Fresh, single-use, chosen by the VERIFIER. Never reused; never guessable. */
  readonly nonce:    string;
}

/** A recogniser's answer: their key, over this exact challenge. */
export interface RaiseGrant {
  readonly challenge: RaiseChallenge;
  /** The recogniser — their own key, never the vessel's. Caps ride this. */
  readonly byNym:     string;
  /** ed25519 over `raiseChallengeBytes(challenge)`, by `byNym`. */
  readonly sig:       string;
}

/** Why a grant did not stand. A reason, never a throw — untrusted input crosses this shore. */
export type RaiseRefusal =
  | "wrong-vessel"      // the grant answers a challenge some other vessel emitted
  | "wrong-nexus"       // the challenge names a Nexus this vessel does not carry
  | "stale-challenge"   // the epoch moved under it, or the nonce is not the live one
  | "unrecognised"      // the signer is nobody this vessel's membership fold admits
  | "bad-signature";    // the bytes do not verify under the named key

/** The exact bytes a recogniser signs. Strict field set — nothing about the vessel's contents rides here. */
export function raiseChallengeBytes(c: RaiseChallenge): Uint8Array {
  return canonicalJsonBytes({
    kind: RAISE_DOMAIN, vesselId: c.vesselId, nexus: c.nexus, epoch: c.epoch, nonce: c.nonce,
  });
}

/**
 * Mint the challenge a vessel emits. The caller supplies the randomness, so this stays platform-blind and
 * a test may pin it; a live caller MUST pass cryptographically random bytes, since the nonce IS the
 * freshness. A guessable nonce hands back the bearer credential the design removed.
 */
export function mintRaiseChallenge(args: {
  vesselId: string; nexus: string; epoch: number; nonce: string;
}): RaiseChallenge {
  return { vesselId: args.vesselId, nexus: args.nexus, epoch: args.epoch, nonce: args.nonce };
}

/**
 * Read a grant against the challenge this vessel actually emitted, and mint the caps it earns.
 *
 * Every check FAILS CLOSED and names its refusal. The order runs cheapest-first, and the signature check
 * runs LAST so a mismatched challenge never spends a verify — but no check is skipped on the strength of
 * another, because each closes a different door.
 *
 * `liveChallenge` is the one the vessel holds RIGHT NOW. Passing a remembered challenge re-opens replay;
 * the caller MUST drop its live challenge after one answer, whichever way that answer went.
 */
export async function verifyRaiseGrant(args: {
  grant:      RaiseGrant;
  /** The challenge this vessel emitted and still holds. `null` → nothing was asked, so nothing answers. */
  live:       RaiseChallenge | null;
  /** Whether this vessel's membership fold admits the signer. The vessel's own reading, as of last sync. */
  recognises: (nym: string) => boolean | Promise<boolean>;
  /** Verify `sig` over `bytes` by `nym`. Supplied so this module stays free of any one crypto binding. */
  verify:     (nym: string, bytes: Uint8Array, sig: string) => boolean | Promise<boolean>;
}): Promise<{ ok: true; caps: RaisedCaps } | { ok: false; why: RaiseRefusal }> {
  const { grant, live } = args;
  if (!live)                                     return { ok: false, why: "stale-challenge" };
  if (grant.challenge.vesselId !== live.vesselId) return { ok: false, why: "wrong-vessel" };
  if (grant.challenge.nexus    !== live.nexus)    return { ok: false, why: "wrong-nexus" };
  // Nonce AND epoch both, never either alone: the nonce closes replay, the epoch closes a grant minted
  // under a fence that has since rolled.
  if (grant.challenge.nonce !== live.nonce || grant.challenge.epoch !== live.epoch) {
    return { ok: false, why: "stale-challenge" };
  }
  if (!(await args.recognises(grant.byNym)))     return { ok: false, why: "unrecognised" };
  if (!(await args.verify(grant.byNym, raiseChallengeBytes(grant.challenge), grant.sig))) {
    return { ok: false, why: "bad-signature" };
  }
  // The caps bind to the epoch the CHALLENGE named, so the fence `raiseStands` reads is the one the
  // recogniser actually consented under — never whatever the epoch has become since.
  return { ok: true, caps: { byNym: grant.byNym, nexus: live.nexus, boundEpoch: live.epoch } };
}

/** A recogniser's half — sign the challenge as handed, with no field of one's own. */
export async function signRaiseGrant(args: {
  challenge: RaiseChallenge;
  byNym:     string;
  sign:      (bytes: Uint8Array) => Promise<string> | string;
}): Promise<RaiseGrant> {
  return {
    challenge: args.challenge,
    byNym:     args.byNym,
    sig:       await args.sign(raiseChallengeBytes(args.challenge)),
  };
}
