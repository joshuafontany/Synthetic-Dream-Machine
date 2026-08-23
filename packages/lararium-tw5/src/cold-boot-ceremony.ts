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

// INNER PATHS — a title names its own record and never the entity holding it. An address carries three
// slots, each named once: the HOME, the ENTITY (`{bags,wikis}/@name`, the only place `@` stands) and the
// INNER PATH. These build the third, so a title carries no `@` and no bag: the record's `bag` field already
// names the face's `@…-<tag>`, and a title repeating it would say the entity twice. Keeping the inner path
// free of the entity is also what lets ONE internal shape serve every face — a record written on one
// persona's plane reads identically on the next, because nothing in its title knows which plane holds it.
//
// These MIRROR `@lararium/mesh`'s `lar-uris` and stay inlined only because this module is CJS and must not
// import it. THE TWO SPELLINGS MUST MATCH BYTE-FOR-BYTE: a title minted here and read there resolves to
// one record, or to none at all.
const SOCIAL_HOST         = "ha.ka.ba";
// The INNER stem a title extends — no `@`, no bag. Mirrors mesh's `IDENTITIES_INNER`/`CIRCLES_INNER`.
const IDENTITIES_INNER     = `lar:///${SOCIAL_HOST}/identities`;
const CIRCLES_INNER        = `lar:///${SOCIAL_HOST}/circles`;
// The ENTITY a record lands in — `bags/name`, the one slot `@` stands in. Mirrors mesh's
// `IDENTITIES_NAMESPACE`/`CIRCLES_NAMESPACE`, and a record's `bag` field carries THIS, never the stem
// above: one constant serving both slots would fuse the two and route a record by the wrong string.
const IDENTITIES_NAMESPACE = `lar:///${SOCIAL_HOST}/bags/identities`;
const CIRCLES_NAMESPACE    = `lar:///${SOCIAL_HOST}/bags/circles`;

function identityTiddlerUri(did: string): string {
  return `${IDENTITIES_INNER}/${did}`;
}

function circleTiddlerUri(id: string): string {
  return `${CIRCLES_INNER}/${id}`;
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
