/**
 * charter-reserve — the compromise-resistant custody for the charter pre-rotation's NEXT key-set.
 *
 * KERI pre-rotation commits an epoch to a DIGEST of the next epoch's keys before those keys ever sign
 * (wax-stamp: `charterKeySetHash`, `nextKeyCommit`). This module forges the seed those next keys derive
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
 * A-MULTITUDE-OF-ONE (founding): the operator IS all three kahu, so ONE reserve seed derives the whole
 * next key-set coherently, and Share 1 ("mine") is the operator's — the vessel-sealed copy, the printed
 * card, and any emailed copy all carry the SAME Share 1, so an operator-full-compromise reveals exactly
 * ONE share → nothing. (CABAL-SCALE evolution surfaced to the operator: each kahu holding their OWN reserve
 * seed splits this seam per-kahu; the founding one-seed case sits at handleIndex 0 of that generalization.)
 *
 * Meme: lar:///ha.ka.ba/lararium/api/charter-reserve
 */

import { derivePersonaKeypair, HARDENED_OFFSET } from "./persona-hd.js";
import { charterKeySetHash } from "./wax-stamp.js";
import {
  splitToShares, encodeShareBytes, decodeShareBytes,
  type RecoveryShare, type CustodianTag,
} from "./recovery-share.js";
import { sha256HexSync } from "./crypto.js";
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
  throw new Error("charter-reserve: RESERVE_DOMAIN_INDEX must be a RAW index below the hardened ceiling");
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
 * reproducible: the same (seed, reserveEpoch) always yields the same key-set, so a rotate ceremony
 * re-derives the signing keys from a reconstructed seed WITHOUT ever having persisted them. The path
 * hardens per segment (SLIP-0010 ed25519); a derived signing key never reveals the reserve seed.
 */
export async function deriveReserveKeySet(reserveSeed: Uint8Array, reserveEpoch: number): Promise<ReserveKeySet> {
  if (!Number.isInteger(reserveEpoch) || reserveEpoch < 0 || reserveEpoch >= HARDENED_OFFSET) {
    throw new RangeError(`charter-reserve: reserveEpoch out of range: ${reserveEpoch}`);
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
 * feeds `nexus charter seat`. Folds the sorted, de-duped verifying keys AND the threshold (charterKeySetHash),
 * so the digest is order-blind and recovers no key. One-way: it commits the next keys without revealing them.
 */
export function reserveNextKeyCommit(verifyingKeys: readonly string[], threshold = RESERVE_THRESHOLD): string {
  return charterKeySetHash(verifyingKeys, threshold);
}

// ── The three recovery cards — one per custodian slot ────────────────────────────────────────────────

/** Which custodian holds a card. The three slots map to DISTINCT recovery-share custodian tags below. */
export type ReserveCardSlot = "mine" | "guardian-a" | "guardian-b";

/**
 * Slot → recovery-share custodian tag. The three tags stay DISTINCT so EVERY two-share subset — including
 * {guardian-a, guardian-b} — forms a ≥2-distinct-custodian quorum (recovery-share's impersonation-quorum
 * wall). That is exactly the compromise-resistance the keel vows: the guardians recover WITHOUT "mine".
 */
const SLOT_CUSTODIAN: Record<ReserveCardSlot, CustodianTag> = {
  "mine":       "device",
  "guardian-a": "guardian",
  "guardian-b": "escrow-peer",
};

/** A printable recovery card the operator places by hand (web3-pure — no cloud/email/API coupling here). */
export interface ReserveCard {
  readonly slot:          ReserveCardSlot;
  /** The human label ("Recovery-card mine" / "Recovery-card guardian-A (name)"). */
  readonly label:         string;
  /** The recovery-share custodian tag this card carries (the type-wall identity, not the human label). */
  readonly custodian:     CustodianTag;
  /** The transcribable share code — checksummed hex (encodeShareBytes), decode-guarded against a slip. */
  readonly shareCode:     string;
  /** A short out-of-band confirmation phrase — distinct per card, the receipt + recovery handshake. */
  readonly confirmPhrase: string;
}

/** The founding split's output: the three cards + the raw "mine" share the vessel seals at rest. */
export interface ReserveSplit {
  readonly cards:     ReserveCard[];
  /** The "mine" share (custodian "device") — the ONLY share the vessel persists, sealed. */
  readonly mineShare: RecoveryShare;
}

function cardLabel(slot: ReserveCardSlot, guardianA: string | null, guardianB: string | null): string {
  switch (slot) {
    case "mine":       return "Recovery-card mine";
    case "guardian-a": return `Recovery-card guardian-A (${guardianA ?? "unassigned"})`;
    case "guardian-b": return `Recovery-card guardian-B (${guardianB ?? "unassigned"})`;
  }
}

/**
 * Split the reserve seed 2-of-3 across the three custodian slots and render one card per slot. The "mine"
 * share seals to the vessel (the caller's node adapter does the sealing); the two guardian cards leave the
 * device entirely. Each card carries a checksummed, decode-guarded share code + a distinct confirmation
 * phrase. The seed itself is never returned in a card — only its shares.
 */
export function splitReserveSeed(
  reserveSeed:   Uint8Array,
  guardianA:     string | null,
  guardianB:     string | null,
  recoveryEpoch: number,
  rng:           RandomProvider,
): ReserveSplit {
  const slots: ReserveCardSlot[] = ["mine", "guardian-a", "guardian-b"];
  const custodians = slots.map((s) => SLOT_CUSTODIAN[s]);
  const shares = splitToShares(reserveSeed, RESERVE_THRESHOLD, custodians, recoveryEpoch, rng);
  const cards: ReserveCard[] = slots.map((slot, i) => {
    const shareCode = encodeShareBytes(shares[i]!.bytes);
    return {
      slot,
      label:         cardLabel(slot, guardianA, guardianB),
      custodian:     shares[i]!.custodian,
      shareCode,
      confirmPhrase: confirmationPhrase(shareCode),
    };
  });
  return { cards, mineShare: shares[0]! };
}

/**
 * Reconstruct a RecoveryShare from a card's printed code — checksum-guarded (decodeShareBytes THROWS on a
 * transcription slip BEFORE a doomed reconstruct). The recovery ceremony feeds two of these to
 * `assembleQuorum` / `reconstructFromQuorum` (recovery-share) to rebuild the reserve seed. FAILS CLOSED:
 * a tampered code, or fewer than two distinct-custodian shares, never reconstructs.
 */
export function reserveShareFromCard(card: ReserveCard, recoveryEpoch: number): RecoveryShare {
  return { bytes: decodeShareBytes(card.shareCode), custodian: card.custodian, recoveryEpoch };
}

// ── The confirmation phrase — a short human-verifiable cross-check, distinct per card ─────────────────
// Derived from a domain-separated hash of the card's share code. A card's own holder already holds the
// share, so the phrase reveals nothing new to them; it lets the operator confirm out-of-band ("does your
// card read heron-amber-tide?") that a guardian holds the RIGHT card before a recovery ceremony trusts it.
// A tiny self-contained 64-word list keeps this pure-TS (no BIP39/wordlist dependency).

const CONFIRM_WORDS: readonly string[] = [
  "amber", "anchor", "arbor", "ash", "aster", "birch", "brass", "brook",
  "cedar", "cinder", "clay", "cliff", "cove", "crane", "crest", "dawn",
  "delta", "dune", "ember", "fern", "flint", "frost", "gale", "glade",
  "grove", "harbor", "hazel", "heron", "ivy", "kelp", "lark", "loam",
  "maple", "marsh", "mesa", "mist", "moss", "oak", "onyx", "opal",
  "pearl", "pine", "quartz", "reed", "ridge", "river", "sable", "sage",
  "sand", "shale", "shore", "slate", "spruce", "tide", "topaz", "vale",
  "vine", "wave", "willow", "wind", "wren", "yarrow", "zephyr", "zinc",
];

/**
 * A 3-word confirmation phrase over 18 bits (three 6-bit picks) of the share code's digest — distinct per
 * card because each share differs. Deterministic: the same card always reads the same phrase, so the
 * operator and a guardian confirm a match over the phone.
 */
export function confirmationPhrase(shareCode: string): string {
  const digest = sha256HexSync(`lar-charter-reserve-confirm/v1|${shareCode}`);
  const n = Number.parseInt(digest.slice(0, 8), 16) >>> 0;
  const word = (shift: number): string => CONFIRM_WORDS[(n >>> shift) & 0x3f]!;
  return `${word(0)}-${word(6)}-${word(12)}`;
}
