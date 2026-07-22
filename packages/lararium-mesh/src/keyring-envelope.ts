/**
 * keyring-envelope — STAGE 2 (A1-①): deliver the per-Nexus convergence keyring to a newly-admitted device via a
 * SEALED ENVELOPE, reusing the persona-admit ceremony's sealed-box shape (NOT BeeKEM — ruling A1-①=sealed-envelope).
 *
 * THE READ-KEY RIDES THE PRIVATE LANE, NEVER THE RELAY. The @cad seal producer message-locks a carrier body's
 * ciphertext to the per-Nexus convergence secret; a member needs that `{epoch → secret}` keyring to READ a sealed
 * body it blind-transits. This envelope hands the keyring to a joinee at admission: an X25519 static-recipient
 * sealed box (an ephemeral sender ECDH → HKDF-SHA256 → XChaCha20-Poly1305 AEAD, the SAME construction the
 * persona-admit grant rides). The joinee mints an X25519 recipient keypair at admit and keeps its SECRET
 * on-device; the founder seals the keyring to the recipient pubkey. Only the live recipient opens it.
 *
 * CARRY ⊥ READ, made concrete: a NON-admitted peer carries a sealed body's ciphertext (verify-cap secret-free)
 * but has no keyring, so it reads NOTHING. An admitted device opens THIS envelope, holds the keyring, and reads.
 * Delivering the keyring is exactly what turns a carry-only member into a read-capable one — and it happens ONLY
 * at a consented admission, never on the open wire.
 *
 * TRACK-CONTRACTS-NEVER-IDENTITIES: the envelope carries key-material (the salt secrets) keyed by integer epoch —
 * no name, no identity. WITHHOLD-not-forge: a garbled / wrong-recipient envelope opens to `null`, never a throw.
 *
 * CRYPTO: @noble X25519 + XChaCha20-Poly1305 + HKDF-SHA256 — pure-JS, offline, no wasm, no node-gyp.
 * Meme: lar:///ha.ka.ba/lararium/mesh/keyring-envelope
 */

import { x25519 } from "@noble/curves/ed25519.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hex, hexToBytes, utf8Bytes, canonicalJsonBytes, webGetRandomValues, base64UrlEncode, base64UrlDecode } from "./crypto.js";

export const KEYRING_ENVELOPE_DOMAIN = "lar-keyring-envelope/v1" as const;
/** The HKDF `info` — domain-separates THIS delivery's key-derivation from every other X25519 use. */
const HKDF_INFO = utf8Bytes("lar-keyring-envelope/v1");
const AEAD_NONCE_LEN = 24;

/** One epoch's secret in the delivered set — the integer epoch + its 32-byte salt as hex. */
export interface KeyringEntryWire {
  readonly epoch:     number;
  readonly secretHex: string;
}

/** The sealed keyring envelope a founder hands a joinee at admission (a QR / paste / the admit payload). */
export interface KeyringEnvelope {
  readonly kind:                  typeof KEYRING_ENVELOPE_DOMAIN;
  /** The ephemeral X25519 sender pubkey (hex) — the recipient completes the ECDH with it. */
  readonly senderEphemeralPubkey: string;
  /** The XChaCha20-Poly1305 nonce (hex, 24 bytes). */
  readonly aeadNonce:             string;
  /** base64url of the sealed `{ entries: KeyringEntryWire[] }`. */
  readonly ciphertext:            string;
}

/** Derive the seal key from the ECDH shared secret, salted by BOTH pubkeys (bind the derivation to the pair). */
function deriveKey(shared: Uint8Array, senderPubHex: string, recipientPubHex: string): Uint8Array {
  const salt = new Uint8Array([...hexToBytes(senderPubHex), ...hexToBytes(recipientPubHex)]);
  return hkdf(sha256, shared, salt, HKDF_INFO, 32);
}

/**
 * Seal the `{epoch → secret}` keyring to a joinee's X25519 recipient pubkey — an ephemeral-sender sealed box.
 * Only the holder of the matching recipient SECRET opens it; a photograph / a non-recipient reads nothing.
 */
export function sealKeyringEnvelope(entries: readonly KeyringEntryWire[], recipientX25519Pubkey: string): KeyringEnvelope {
  const senderSecret = x25519.utils.randomSecretKey();
  const senderEphemeralPubkey = hex(x25519.getPublicKey(senderSecret));
  const shared = x25519.getSharedSecret(senderSecret, hexToBytes(recipientX25519Pubkey));
  const key = deriveKey(shared, senderEphemeralPubkey, recipientX25519Pubkey.toLowerCase());
  const aeadNonceBytes = webGetRandomValues(new Uint8Array(AEAD_NONCE_LEN));
  const ciphertext = xchacha20poly1305(key, aeadNonceBytes).encrypt(
    canonicalJsonBytes({ entries: entries.map((e) => ({ epoch: e.epoch, secretHex: e.secretHex.toLowerCase() })) }),
  );
  return {
    kind: KEYRING_ENVELOPE_DOMAIN,
    senderEphemeralPubkey,
    aeadNonce: hex(aeadNonceBytes),
    ciphertext: base64UrlEncode(ciphertext),
  };
}

/**
 * Open a sealed keyring envelope with the recipient's X25519 SECRET → the `{epoch, secret}` entries, or `null`
 * (a wrong recipient / tamper / a photograph without the secret). FAIL-CLOSED: a malformed entry set reads null.
 */
export function openKeyringEnvelope(envelope: KeyringEnvelope, recipientX25519Secret: Uint8Array): KeyringEntryWire[] | null {
  if (envelope?.kind !== KEYRING_ENVELOPE_DOMAIN) return null;
  const recipientPub = hex(x25519.getPublicKey(recipientX25519Secret));
  try {
    const shared = x25519.getSharedSecret(recipientX25519Secret, hexToBytes(envelope.senderEphemeralPubkey));
    const key = deriveKey(shared, envelope.senderEphemeralPubkey, recipientPub);
    const plaintext = xchacha20poly1305(key, hexToBytes(envelope.aeadNonce)).decrypt(base64UrlDecode(envelope.ciphertext));
    const parsed = JSON.parse(new TextDecoder().decode(plaintext)) as { entries?: unknown };
    if (!Array.isArray(parsed.entries)) return null;
    const out: KeyringEntryWire[] = [];
    for (const raw of parsed.entries) {
      const e = raw as Record<string, unknown>;
      if (!Number.isInteger(e["epoch"]) || (e["epoch"] as number) < 0) return null;
      if (typeof e["secretHex"] !== "string" || !/^[0-9a-f]{64}$/.test(e["secretHex"])) return null;
      out.push({ epoch: e["epoch"] as number, secretHex: e["secretHex"] });
    }
    return out;
  } catch {
    return null;   // wrong recipient / tampered / no secret → the keyring DID NOT ARRIVE
  }
}

/** Mint a fresh X25519 recipient keypair for a joinee — the secret stays on-device; the pubkey rides the admit. */
export function mintKeyringRecipient(): { recipientSecret: Uint8Array; recipientPubkey: string } {
  const recipientSecret = x25519.utils.randomSecretKey();
  return { recipientSecret, recipientPubkey: hex(x25519.getPublicKey(recipientSecret)) };
}
