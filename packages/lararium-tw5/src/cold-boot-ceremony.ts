/*\
title: lar:///ha.ka.ba/lararium/tw5/modules/cold-boot-ceremony
type: application/javascript
module-type: library
\*/
/**
 * cold-boot-ceremony — void-start operator identity tiddler builder.
 *
 * Runs in TW5 VM (compiled as CJS) and in Node (imported as TS module).
 * Produces the IdentityTiddler + operators CircleTiddler for the device operator
 * on first boot, when IdentitiesDoc has no principals.
 *
 * Key derivation (Brooklyn Zelenka / UCAN / Keyhive alignment):
 *   did:key = "did:key:z" + base58btc(0xed 0x01 || verifyingKeyBytes)
 *   multicodec prefix 0xed01 = Ed25519 public key (varint-encoded 0x1300)
 *   verifyingKeyBytes = raw 32-byte Ed25519 public key
 *
 * The device Ed25519 keypair is the identity root.
 * GitHub / BlueSky auth enriches displayName only — they do not own the DID.
 * verifyingKey field is populated now; Keyhive BeeKEM consumes it when available.
 *
 * No external imports — self-contained CJS in TW5 wiki context.
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/modules/cold-boot-ceremony
 */

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
// Tiddler URI helpers — inlined to avoid @lararium/mesh import in CJS
// ---------------------------------------------------------------------------

// NAMESPACES, never bags. A title resolves verbatim inside its own document, so `@identities/<did>` and
// `@circles/operators` spell the same in every face's planes and one internal shape serves them all. The
// BAGS answering to them carry the face's tag — `@identities-<tag>`, `@circles-<tag>` — because a face's
// relations travel with the FACE and a vessel-global bag would correlate the faces a multitude holds apart.
const SOCIAL_HOST         = "ha.ka.ba";
const IDENTITIES_NAMESPACE = `lar:///${SOCIAL_HOST}/@identities`;
const CIRCLES_NAMESPACE    = `lar:///${SOCIAL_HOST}/@circles`;

function identityTiddlerUri(did: string): string {
  return `${IDENTITIES_NAMESPACE}/${did}`;
}

function circleTiddlerUri(id: string): string {
  return `${CIRCLES_NAMESPACE}/${id}`;
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
    bag:       IDENTITIES_NAMESPACE,
    authority: "cold-boot-ceremony",
    fields: {
      did:          did,
      displayName:  name,
      createdAt:    now,
      kind:         "device",   // the per-vessel device leaf; the operator identity is the PersonaGroup root that delegates to it
      verifyingKey: verifyingKeyHex,
      readPolicy:   "private",
    },
  };

  const groupTiddler: CeremonyTiddler = {
    title:     circleTiddlerUri("operators"),
    bag:       CIRCLES_NAMESPACE,
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
