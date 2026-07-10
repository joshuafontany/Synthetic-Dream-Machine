/**
 * persona-hd — SLIP-0010 ed25519 hardened HD key derivation (the persona-side one-seed).
 *
 * Doctrine (canon: lar:///ha.ka.ba/lares/api/pono/persona-circle):
 *   The VEILED-USER / persona keys all descend from ONE seed via ed25519
 *   hierarchical derivation, every path segment HARDENED (SLIP-0010). This file
 *   carries ONLY the persona-side derivation. The VESSEL-KEY stays device-minted
 *   (vessel-identity-core) and never passes through here.
 *
 * Algorithm — SLIP-0010 for the ed25519 curve (https://github.com/satoshilabs/slips/blob/master/slip-0010.md):
 *   - master:  I = HMAC-SHA512(key="ed25519 seed", data=seed);
 *              IL = I[0:32] (the key), IR = I[32:64] (the chain code).
 *   - child (hardened index i, i >= 0x80000000):
 *              data = 0x00 || ser256(key_parent) || ser32(i);
 *              I = HMAC-SHA512(key=chainCode_parent, data);
 *              IL = key, IR = chain code.
 *   ed25519 supports ONLY hardened derivation — there is no public-parent
 *   (non-hardened) step on this curve. This module auto-hardens every raw index.
 *
 * Platform-blind: rides @noble/hashes (hmac, sha512) + @noble/ed25519 + the
 * canonical hex helpers from ./crypto. NO node: imports. Async to match the
 * repo's ed25519 surface (getPublicKeyAsync / signAsync / verifyAsync).
 *
 * Meme: lar:///ha.ka.ba/lararium/api/persona-hd
 */

import { hmac } from "@noble/hashes/hmac.js";
import { sha512 } from "@noble/hashes/sha2.js";
import * as ed25519 from "@noble/ed25519";
import { hex } from "./crypto.js";

/** The hardened-bit offset. ed25519 derivation lives entirely above it. */
export const HARDENED_OFFSET = 0x80000000;

/** A derived node: the 32-byte key material (IL) and the 32-byte chain code (IR). */
export interface HdNode {
  /** IL — the 32-byte private key / seed at this node. */
  key: Uint8Array;
  /** IR — the 32-byte chain code carried to the next child. */
  chainCode: Uint8Array;
}

const ED25519_SEED_KEY = new TextEncoder().encode("ed25519 seed");

/** Split a 64-byte HMAC-SHA512 output I into IL (key) and IR (chain code). */
function splitI(I: Uint8Array): HdNode {
  return { key: I.slice(0, 32), chainCode: I.slice(32, 64) };
}

/** ser32(i): big-endian 4-byte serialization of an unsigned 32-bit integer. */
function ser32(i: number): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = (i >>> 24) & 0xff;
  out[1] = (i >>> 16) & 0xff;
  out[2] = (i >>> 8) & 0xff;
  out[3] = i & 0xff;
  return out;
}

/**
 * masterKeyFromSeed — the SLIP-0010 ed25519 master node.
 * I = HMAC-SHA512("ed25519 seed", seed); IL = key, IR = chain code.
 */
export function masterKeyFromSeed(seed: Uint8Array): HdNode {
  return splitI(hmac(sha512, ED25519_SEED_KEY, seed));
}

/**
 * deriveHardenedChild — one hardened SLIP-0010 ed25519 step.
 *
 * `index` is the RAW index (0, 1, 2, …); the hardening bit (0x80000000) is
 * applied INTERNALLY, because ed25519 admits hardened derivation only. Passing
 * an already-hardened index (>= 0x80000000) throws, so callers cannot
 * double-harden.
 *
 * data = 0x00 || ser256(parentKey) || ser32(index | 0x80000000);
 * I = HMAC-SHA512(parentChainCode, data); IL = key, IR = chain code.
 */
export function deriveHardenedChild(
  key: Uint8Array,
  chainCode: Uint8Array,
  index: number,
): HdNode {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError(`deriveHardenedChild: index must be a non-negative integer, got ${index}`);
  }
  if (index >= HARDENED_OFFSET) {
    throw new RangeError(
      `deriveHardenedChild: pass the RAW index (< 0x80000000); hardening is applied internally (got ${index})`,
    );
  }
  if (key.length !== 32) {
    throw new TypeError(`deriveHardenedChild: parent key must be 32 bytes, got ${key.length}`);
  }
  const hardened = (index + HARDENED_OFFSET) >>> 0;
  const data = new Uint8Array(1 + 32 + 4);
  data[0] = 0x00;
  data.set(key, 1);
  data.set(ser32(hardened), 33);
  return splitI(hmac(sha512, chainCode, data));
}

/**
 * derivePersonaKeypair — derive an ed25519 keypair along an all-hardened path.
 *
 * `path` carries RAW indices (e.g. [0] for m/0', [0,1,2] for m/0'/1'/2'); each
 * segment hardens internally. Returns hex strings matching the repo's
 * PersistedKeypair convention (vessel-identity-core):
 *   - signingKey   = hex(IL) — the 32-byte private seed (64 hex chars).
 *   - verifyingKey = hex(ed25519.getPublicKey(IL)) — the 32-byte ed25519 public
 *     key WITHOUT the SLIP-0010 `00` prefix (64 hex chars).
 *
 * (SLIP-0010 prints the public key as 0x00 || pubkey; the repo stores the bare
 * 32-byte key, so the leading 00 is dropped here.)
 */
export async function derivePersonaKeypair(
  seed: Uint8Array,
  path: readonly number[],
): Promise<{ signingKey: string; verifyingKey: string }> {
  let node = masterKeyFromSeed(seed);
  for (const index of path) {
    node = deriveHardenedChild(node.key, node.chainCode, index);
  }
  const pub = await ed25519.getPublicKeyAsync(node.key);
  return { signingKey: hex(node.key), verifyingKey: hex(pub) };
}
