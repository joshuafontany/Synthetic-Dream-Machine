/**
 * seal-reserve — the compromise-resistant custody for the charter pre-rotation's NEXT key-set.
 *
 * KERI pre-rotation commits an epoch to a DIGEST of the next epoch's keys before those keys ever sign
 * (wax-stamp: `sealKeySetHash`, `nextKeyCommit`). This module forges the seed those next keys derive
 * FROM, and custodies it so an operator-full-compromise reveals nothing:
 *
 *   · the reserve seed rides a SEPARATE 32-byte CSPRNG seed — NEVER the live persona-root signing seed —
 *     so a thief of today's signing key learns zero about tomorrow's keys (independent seeds), and
 *   · the next epoch's THREE kahu keypairs derive HARDENED from it via SLIP-0010 ed25519 (persona-hd:
 *     `derivePersonaKeypair`, every path segment HMAC-SHA512 hardened) along a domain-separated path, so
 *     a derived child key never climbs back to the seed (hardened blocks the public-parent attack), and
 *   · the reserve seed itself Shamir-splits 2-of-3 (recovery-share, the impersonation-quorum floor) across
 *     THREE DISTINCT custodian slots — "mine" (the operator, vessel-sealed) + two guardians — so ANY two
 *     shares reconstruct, and the two guardians recover WITHOUT the operator (the two shares carry DISTINCT
 *     custodian tags, satisfying the ≥2-distinct-custodian quorum wall).
 *
 * The 2-of-3 card SHAPE + the confirmation handshake live in `guardian-card` — the SHARED primitive personal
 * identity recovery (recovery-keel-core) issues too, so the guardians who hold a citizen's reserve cards
 * hold the SAME card shape that helps recover their identity (one pattern integrity, two uses).
 *
 * A-MULTITUDE-OF-ONE (founding): the operator IS all three kahu, so ONE reserve seed derives the whole
 * next key-set coherently, and Share 1 ("mine") is the operator's — the vessel-sealed copy, the printed
 * card, and any emailed copy all carry the SAME Share 1, so an operator-full-compromise reveals exactly
 * ONE share → nothing. (CABAL-SCALE evolution surfaced to the operator: each kahu holding their OWN reserve
 * seed splits this shore per-kahu; the founding one-seed case sits at handleIndex 0 of that generalization.)
 *
 * Meme: lar:///ha.ka.ba/lararium/api/seal-reserve
 */

import { derivePersonaKeypair, HARDENED_OFFSET } from "./persona-hd.js";
import { sealKeySetHash } from "./wax-stamp.js";
import type { RecoveryShare } from "./recovery-share.js";
import {
  splitToGuardianCards, guardianShareFromCard,
  type GuardianCard, type GuardianCardSlot, type GuardianCardSplit,
} from "./guardian-card.js";
import type { RandomProvider } from "./crypto.js";

/** The founding reserve derives THREE next-epoch kahu keypairs (the operator stands all three at founding). */
export const RESERVE_KAHU_COUNT = 3;
/** The reserve recovers 2-of-3 — the impersonation-quorum floor (any two DISTINCT custodians reconstruct). */
export const RESERVE_THRESHOLD = 2;
/** The reserve seed carries 32 bytes of CSPRNG entropy — a SLIP-0010 master seed, never the signing seed. */
export const RESERVE_SEED_BYTES = 32;

/**
 * The domain-separation head of the reserve derivation path — a fixed RAW SLIP-0010 segment that walls the
 * reserve key-set off from every ordinary persona-HD path (which derives at `[handleIndex]`). Any fixed
 * raw index below the hardened ceiling suffices; this one spells "charter" as a mnemonic. The path
 * `[RESERVE_DOMAIN_INDEX, reserveEpoch, kahuIndex]` hardens each segment internally (persona-hd).
 */
export const RESERVE_DOMAIN_INDEX = 0x0c_0a_17; // < HARDENED_OFFSET (asserted below); "charter" mnemonic

if (RESERVE_DOMAIN_INDEX >= HARDENED_OFFSET) {
  throw new Error("seal-reserve: RESERVE_DOMAIN_INDEX must be a RAW index below the hardened ceiling");
}

/**
 * Generate ONE reserve seed — 32 CSPRNG bytes. The caller holds this IN MEMORY only, splits it, and
 * zeroizes it; it NEVER reaches disk (the vessel keeps only a sealed SHARE of it, never the seed).
 */
export function generateReserveSeed(rng: RandomProvider): Uint8Array {
  const seed = new Uint8Array(RESERVE_SEED_BYTES);
  rng.getRandomValues(seed);
  return seed;
}

/** The next epoch's key-set derived from the reserve seed — public verifying keys + private signing keys. */
export interface ReserveKeySet {
  /** The THREE next-epoch verifying keys (public, 64-hex each) — what the pre-rotation commit folds. */
  readonly verifyingKeys: string[];
  /** The THREE next-epoch signing keys (private, 64-hex each) — reproduced from the seed at rotate, never persisted. */
  readonly signingKeys: string[];
}

/**
 * Derive the NEXT epoch's three kahu keypairs HARDENED from the reserve seed. Deterministic and
 * `reserveEpoch` is a ROTATION GENERATION — carrier-A shaped (a monotone integer that rolls on a rotate),
 * riding here as an HD path segment rather than as a fence anyone reads. It never names a wall-clock and
 * never names Keyhive's CGKA epoch (epoch-binding-surfaces#whose-word-is-it).
 *
 * reproducible: the same (seed, reserveEpoch) always yields the same key-set, so a rotate ceremony
 * re-derives the signing keys from a reconstructed seed WITHOUT ever having persisted them. The path
 * hardens per segment (SLIP-0010 ed25519); a derived signing key never reveals the reserve seed.
 */
export async function deriveReserveKeySet(reserveSeed: Uint8Array, reserveEpoch: number): Promise<ReserveKeySet> {
  if (!Number.isInteger(reserveEpoch) || reserveEpoch < 0 || reserveEpoch >= HARDENED_OFFSET) {
    throw new RangeError(`seal-reserve: reserveEpoch out of range: ${reserveEpoch}`);
  }
  const verifyingKeys: string[] = [];
  const signingKeys: string[] = [];
  for (let kahu = 0; kahu < RESERVE_KAHU_COUNT; kahu++) {
    const { signingKey, verifyingKey } = await derivePersonaKeypair(
      reserveSeed, [RESERVE_DOMAIN_INDEX, reserveEpoch, kahu],
    );
    verifyingKeys.push(verifyingKey);
    signingKeys.push(signingKey);
  }
  return { verifyingKeys, signingKeys };
}

/**
 * The public pre-rotation commitment for a reserve key-set — the `--next-key-commit` value the operator
 * feeds `nexus seal seat`. Folds the sorted, de-duped verifying keys AND the threshold (sealKeySetHash),
 * so the digest is order-blind and recovers no key. One-way: it commits the next keys without revealing them.
 */
export function reserveNextKeyCommit(verifyingKeys: readonly string[], threshold = RESERVE_THRESHOLD): string {
  return sealKeySetHash(verifyingKeys, threshold);
}

// ── The three recovery cards — the SHARED guardian-card primitive, one card shape for both keels ──────
// The reserve issues the SAME "Recovery-card mine + guardian-A/B" shape personal identity recovery issues
// (guardian-card): mine→device, guardian-a→guardian, guardian-b→escrow-peer. The reserve's names carry
// through the shared aliases so nexus.ts and the reserve tests read unchanged.

/** Which custodian holds a reserve card — the shared guardian-card slot. */
export type ReserveCardSlot = GuardianCardSlot;

/** A printable reserve recovery card — the shared guardian-card shape. */
export type ReserveCard = GuardianCard;

/** A split's output: the three cards + the raw "mine" share the vessel seals at rest. */
export type ReserveSplit = GuardianCardSplit;

/**
 * Split the reserve seed 2-of-3 into the shared guardian-card shape (mine + guardian-A/B). Delegates to the
 * shared `splitToGuardianCards` so the reserve and personal identity recovery issue the IDENTICAL card and
 * handshake. The "mine" share seals to the vessel (the caller's node adapter seals it); the two guardian
 * cards leave the device. The seed itself is never returned in a card — only its shares.
 */
export function splitReserveSeed(
  reserveSeed:   Uint8Array,
  guardianA:     string | null,
  guardianB:     string | null,
  recoveryEpoch: number,
  rng:           RandomProvider,
): ReserveSplit {
  return splitToGuardianCards(reserveSeed, guardianA, guardianB, recoveryEpoch, rng);
}

/**
 * Reconstruct a RecoveryShare from a reserve card's printed code — the shared guardian-card bridge,
 * checksum-guarded (THROWS on a transcription slip BEFORE a doomed reconstruct). FAILS CLOSED.
 */
export function reserveShareFromCard(card: ReserveCard, recoveryEpoch: number): RecoveryShare {
  return guardianShareFromCard(card, recoveryEpoch);
}

// `confirmationPhrase` — the confirmation handshake — rides the shared `guardian-card` module, exported
// from the mesh barrel there; the reserve's tests and ceremonies read it through the one shared origin.
