/**
 * cold-boot-ceremony — operator identity tiddler data builder.
 *
 * Pure data — no TW5 runtime, no Automerge, no I/O. Belongs in @lararium/mesh
 * so @lararium/keyhive and any future vessel can import it without pulling the
 * TW5 render stack.
 *
 * The TW5 wiki includes its own self-contained CJS copy in
 * lararium-tw5/src/cold-boot-ceremony.ts (that file inlines helpers to avoid
 * ESM imports inside the CJS wiki context). The two copies MUST stay in sync
 * on the logic; the authoritative TS version lives here.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/cold-boot-ceremony
 */

import { identityTiddlerUri, circleTiddlerUri, IDENTITIES_DOC_URI, CIRCLES_DOC_URI } from "./lar-uris.js";

// ---------------------------------------------------------------------------
// Base58btc — Bitcoin/IPFS alphabet, no external deps
// ---------------------------------------------------------------------------

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58btcEncode(bytes: Uint8Array): string {
  let n = 0n;
  for (const byte of bytes) {
    n = n * 256n + BigInt(byte);
  }
  let out = "";
  while (n > 0n) {
    out = BASE58_ALPHABET[Number(n % 58n)]! + out;
    n = n / 58n;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    out = "1" + out;
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// DID Key derivation
// ---------------------------------------------------------------------------

/** Ed25519 multicodec prefix (varint 0x1300 → bytes 0xed 0x01). */
const ED25519_MULTICODEC = new Uint8Array([0xed, 0x01]);

/**
 * Derive did:key from a hex-encoded 32-byte Ed25519 verifying key.
 *
 * Format: "did:key:z" + base58btc(0xed || 0x01 || pubkeyBytes)
 * Spec: https://w3c-ccg.github.io/did-method-key/#ed25519-x25519
 */
export function didKeyFromVerifyingKey(verifyingKeyHex: string): string {
  const pubkey   = hexToBytes(verifyingKeyHex);
  const prefixed = new Uint8Array(ED25519_MULTICODEC.length + pubkey.length);
  prefixed.set(ED25519_MULTICODEC, 0);
  prefixed.set(pubkey, ED25519_MULTICODEC.length);
  return "did:key:z" + base58btcEncode(prefixed);
}

// ---------------------------------------------------------------------------
// Ceremony output shape
// ---------------------------------------------------------------------------

export interface CeremonyTiddler {
  readonly title:     string;
  readonly bag:       string;
  readonly authority: string;
  readonly fields:    Record<string, string>;
}

/**
 * Build void-start ceremony tiddlers.
 *
 * Returns [IdentityTiddler, CircleTiddler] keyed for IdentitiesDoc and CirclesDoc.
 * Caller writes each into the appropriate Automerge doc handle.
 *
 * Idempotency: caller MUST check the tiddler title doesn't already exist before writing.
 */
export function buildCeremonyTiddlers(
  verifyingKeyHex: string,
  displayName?: string,
): CeremonyTiddler[] {
  const did  = didKeyFromVerifyingKey(verifyingKeyHex);
  const now  = new Date().toISOString();
  const name = displayName ?? did.slice(0, 20) + "…";

  const identityTiddler: CeremonyTiddler = {
    title:     identityTiddlerUri(did),
    bag:       IDENTITIES_DOC_URI,
    authority: "cold-boot-ceremony",
    fields: {
      did:          did,
      displayName:  name,
      createdAt:    now,
      kind:         "device",   // the per-vessel device leaf; the operator identity is the PersonGroup root that delegates to it
      verifyingKey: verifyingKeyHex,
      readPolicy:   "private",
    },
  };

  const groupTiddler: CeremonyTiddler = {
    title:     circleTiddlerUri("operators"),
    bag:       CIRCLES_DOC_URI,
    authority: "cold-boot-ceremony",
    fields: {
      id:               "operators",
      displayName:      "Operators",
      createdAt:        now,
      memberDids:       did,
      capabilityPolicy: "group:operators",
    },
  };

  return [identityTiddler, groupTiddler];
}
