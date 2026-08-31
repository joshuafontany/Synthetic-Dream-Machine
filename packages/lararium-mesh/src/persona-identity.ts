/**
 * persona-identity — the persona master-seed lifecycle + the two-key atom.
 *
 * Doctrine (canon: lar:///ha.ka.ba/lares/api/pono/persona-circle, #the-atom +
 * #composition):
 *
 *   The base atom carries TWO keys, a real two-axis substrate ≠ sovereignty:
 *     · vessel-key       — the device/substrate identity. DEVICE-MINTED on its
 *                          own device, the private half never leaving
 *                          (vessel-identity-core). It is NEVER derived from the
 *                          persona seed — deriving it would collapse the two
 *                          into the copy-the-key antipattern that dissolves
 *                          per-device revocation (Veilid/SSB).
 *     · veiled-user-key  — the sovereign pseudonym presented through the veil.
 *                          The persona side: it AND the whole persona
 *                          constellation derive from ONE seed via ed25519
 *                          HD-derivation, all-hardened paths (persona-hd,
 *                          SLIP-0010 — structurally immune to the xpub-linkage
 *                          trap). Recover the seed → re-derive the constellation.
 *
 * This file carries the persona TREE: the path convention, the veiled-user-key
 * derivation, and the per-circle scope-pseudonym that extends it one level.
 *
 * RETIRED FROM HERE, and where each went:
 *   · the seed LIFECYCLE  → `persona-vault` holds the live root machinery.
 *   · the two-key ATOM    → `dyad` holds it, and holds it as a RELATION rather than
 *     as a struct of two public keys. That difference carries the ruling: identity
 *     ENACTS a relationship, so the pair was never the thing — the hold between them was.
 *
 * Platform-blind: rides ./persona-hd + ./crypto only. NO node: imports. The
 * randomness arrives through an injected `randomBytes` shore (platform supplies
 * globalThis.crypto.getRandomValues) — NEVER a hardcoded crypto source.
 *
 * DEFER (a later cut — NOT built here): advanced seed CUSTODY + RECOVERY (DKMS,
 * social/trustee recovery, rotation-under-unlinkability). This cut carries the
 * basic lifecycle + derivation + atom assembly only.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/persona-identity
 */

import { CIRCLE_SCOPE_INFO, NEXUS_SCOPE_INFO } from "./domains.js";
import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { derivePersonaKeypair } from "./persona-hd.js";

/** The persona master-seed length in bytes (a fresh 32-byte ed25519-HD seed). */
export const PERSONA_SEED_BYTES = 32;

/**
 * The persona-tree path convention — a BIP44-like ALL-HARDENED two-level tree
 * over the master seed: `m / handle' / context'`.
 *
 *   · handleIndex  (handle')  — selects the handle-Circle / PersonaGroup (the
 *                               "Known Handle with multiple vessels"). Two
 *                               distinct handles share NO derived key material —
 *                               unlinkable-by-construction at the key layer.
 *   · contextIndex (context') — selects the binding WITHIN that handle-Circle
 *                               (the vessel~veil context-self).
 *
 * SLIP-0010 ed25519 admits ONLY hardened derivation, so every level hardens
 * internally (persona-hd.deriveHardenedChild). This is the convention, not a
 * registry — callers own their own index allocation.
 */
export const PERSONA_PATH_DEPTH = 2;

/** A persona derivation path: the RAW [handleIndex, contextIndex] indices. */
export interface PersonaPath {
  /** handle' — selects the handle-Circle / PersonaGroup. */
  handleIndex: number;
  /** context' — selects the vessel~veil binding within the handle-Circle. */
  contextIndex: number;
}

/** Build the RAW path tuple for `derivePersonaKeypair` from a PersonaPath. */
export function personaPathIndices(handleIndex: number, contextIndex: number): readonly number[] {
  return [handleIndex, contextIndex];
}

/**
 * deriveVeiledUserKey — derive the veiled-user (persona) keypair at a path.
 *
 * Wraps `derivePersonaKeypair(seed, [handleIndex, contextIndex])` along the
 * all-hardened `m / handle' / context'` convention. Returns hex strings matching
 * the repo's PersistedKeypair convention (signingKey = 32-byte private seed,
 * verifyingKey = bare 32-byte ed25519 public key).
 */
export async function deriveVeiledUserKey(
  seed: Uint8Array,
  handleIndex: number,
  contextIndex: number,
): Promise<{ signingKey: string; verifyingKey: string }> {
  return derivePersonaKeypair(seed, personaPathIndices(handleIndex, contextIndex));
}

// ── Per-circle SCOPE-PSEUDONYM (the beyond-Ink&Switch unlinkability FLOOR) ──

const CIRCLE_SCOPE_HMAC_KEY = new TextEncoder().encode(CIRCLE_SCOPE_INFO);
const NEXUS_SCOPE_HMAC_KEY  = new TextEncoder().encode(NEXUS_SCOPE_INFO);

/**
 * circleScopeIndex — the per-circle hardened index for the scope-pseudonym leaf.
 *
 * Maps a circle's sentinel docId to a DETERMINISTIC raw index (< 0x80000000) via
 * domain-separated HMAC-SHA256(docId) → the first 4 bytes → uint32 masked to 31 bits.
 * Same circle → same index → same leaf key (rejoin-stable); a different circle → a
 * different leaf (cross-circle unlinkable). The 31-bit space bounds a human's own K
 * circles far below any birthday concern; a collision would link only two of ONE human's
 * own circles — a FLOOR-tier leak, never a security break (the CEILING BBS/AnonCred tier
 * serves collusion-facing islands: voting, benefits, the DMV-face).
 */
export function circleScopeIndex(circleDocIdHex: string): number {
  const mac = hmac(sha256, CIRCLE_SCOPE_HMAC_KEY, new TextEncoder().encode(circleDocIdHex));
  const u32 = new DataView(mac.buffer, mac.byteOffset, 4).getUint32(0, false);
  return u32 & 0x7fffffff; // mask to a raw (pre-hardening) index < 0x80000000
}

/**
 * deriveCircleScopedKey — the per-circle SCOPE-PSEUDONYM (the beyond-Ink&Switch FLOOR).
 *
 * Extends the persona tree ONE level: `m / handle' / context' / circle-scope'`, where
 * circle-scope' = circleScopeIndex(circleDocId). The SAME persona presents a DIFFERENT
 * key/agentId to each circle it joins — cross-circle-unlinkable by construction — so a
 * colluding host that sees the persona in two circles reads no shared key. This changes
 * only WHICH key a persona-cloud delegates INTO a circle; it touches neither BeeKEM's
 * ratchet tree nor keyhive's GroupId, and reuses persona-hd's proven all-hardened
 * derivation. Rejoin-stable for the same (seed, handle, context, circle).
 */
export async function deriveCircleScopedKey(
  seed: Uint8Array,
  handleIndex: number,
  contextIndex: number,
  circleDocIdHex: string,
): Promise<{ signingKey: string; verifyingKey: string }> {
  return derivePersonaKeypair(seed, [handleIndex, contextIndex, circleScopeIndex(circleDocIdHex)]);
}

/**
 * nexusScopeIndex — the per-ISLAND hardened index for a Nexus scope leaf.
 *
 * Canon states the shape: "the name DERIVES from the compartment's own material. Each plane answers to
 * a domain-separated MAC over that PersonaGroup's own doc id." An island carries its own material —
 * the genesis epoch AID, content-addressed over the seated key-set and threshold — so a leaf derives
 * from that and from nothing a vessel owns.
 *
 * SEPARATE FROM `circleScopeIndex` BY DOMAIN, and deliberately. A circle names a human's own
 * compartment; a Nexus names an island several operators share. One MAC domain across both would let a
 * leaf derived for a compartment collide with a leaf derived for an island — the collision the two
 * levels stay apart to forbid.
 *
 * Same island → same index → same leaf, so a face rejoining an island presents the key it presented
 * before. Different islands → different leaves, so an observer reading two islands finds no shared key.
 * The 31-bit space bounds a human's own islands far below a birthday concern, and a collision would
 * link only two of ONE human's own islands — a floor-tier leak rather than a break.
 *
 * IT NORMALISES CASE WHERE `circleScopeIndex` DOES NOT, and the difference follows the material rather
 * than an inconsistency. An AID carries hex, where two spellings name one value, so folding case keeps
 * one island from deriving two leaves. A circle answers to a doc id in base58, where case CARRIES —
 * two spellings name two documents — and folding it there would merge distinct circles.
 */
export function nexusScopeIndex(nexusAid: string): number {
  const mac = hmac(sha256, NEXUS_SCOPE_HMAC_KEY, new TextEncoder().encode(nexusAid.trim().toLowerCase()));
  const u32 = new DataView(mac.buffer, mac.byteOffset, 4).getUint32(0, false);
  return u32 & 0x7fffffff;
}
