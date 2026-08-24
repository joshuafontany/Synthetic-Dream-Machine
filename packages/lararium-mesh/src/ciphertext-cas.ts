/**
 * ciphertext-cas — the ENCRYPT-ON-CAS primitive: a body leaves the CRDT as CIPHERTEXT, content-addressed by
 * `cid = BLAKE3(ciphertext)`, so an untrusted member relay blind-transits + verifies it holding NO secret
 * (content-resolution.mem #cad-storage, verify-cap ⊥ read-cap). This is the cad-private addressing mode.
 *
 * THE SELF-PROVING SEAL (verify-cap, secret-free). The address IS `BLAKE3(ciphertext)`: any relay recomputes
 * `BLAKE3(bytes) == cid` with NOTHING but the bytes — no key, no per-Nexus secret, no read-cap. That recompute
 * IS the member blind-transit lane's honesty (the relay carries what it can never read AND proves integrity
 * without the read-cap). `verifyCiphertextCid` is that check; it routes through `digestsEqual`, so a stored
 * bare-hex value still matches a freshly-computed `blake3:` tag (agile-digest, fork-① — the sha256→BLAKE3
 * migration rides IN the multihash tag; an old cid stays parseable beside a new one).
 *
 * THE READ-CAP (message-locked, per-Nexus). The body is sealed by a message-locked convergent construction:
 *   · messageKey = BLAKE3(plaintext, key = nexusSecret)          — the READ-CAP; message-locked to (content, secret)
 *   · keystream  = BLAKE3(KEYSTREAM_DOMAIN, key = messageKey, dkLen = |plaintext|)   — a per-body XOF keystream
 *   · ciphertext = plaintext ⊕ keystream
 *   · cid        = BLAKE3(ciphertext)                            — the VERIFY-CAP, secret-free
 * DEDUP is per-Nexus by construction: same (content, secret) → same messageKey → same keystream → same
 * ciphertext → same cid. A DIFFERENT per-Nexus secret → a different messageKey → a different cid → NO
 * cross-Nexus dedup (no confirmation-of-file leak across Nexuses). The read-cap (messageKey) rides the PRIVATE
 * lane (keyhive) and NEVER crosses the relay; the relay sees only ciphertext + cid.
 *
 * ── THE ACCEPTED RESIDUAL (fork-② = A, operator-ruled 2026-07-21) ────────────────────────────────────────
 * A PER-NEXUS convergence secret (not per-file random) admits the classic convergent-encryption INSIDER
 * confirmation-of-file residual: a Nexus member holding the secret can test whether a candidate plaintext
 * seals to a held cid. The operator ACCEPTS this — a Nexus member sits INSIDE the causal-island trust
 * boundary. The OPRF rate-limit throttle [fork-②-B] is DEFERRED to the Sensorium machina and NOT built here.
 *
 * ── THE SURFACED SUB-FORK (fork-②, secret DERIVATION — Provisional, NOT wired here) ──────────────────────
 * This module keeps the per-Nexus secret an INJECTED 32-byte input. WHERE it derives (from Nexus-admission
 * material, re-derivable by every member on re-admission — vs an independent high-entropy secret VERSIONED by
 * a wax-sealed charter epoch) is the keyhive↔charter boundary, and NO shared per-Nexus secret source stands
 * today (the charter carries PUBLIC keys only). The cleanest primitive ships here; the derivation + custody +
 * epoch-rotation is surfaced as the honest gap (the seal FAILS CLOSED with no secret — see the node installer).
 *
 * Platform-blind: `@noble/hashes/blake3` (audited, browser-shippable) + agile-digest + crypto `hex` only.
 * Meme: lar:///ha.ka.ba/lararium/mesh/content-resolution#cad-storage
 */

import { CAD_KEYSTREAM_INFO } from "./domains.js";
import { blake3 } from "@noble/hashes/blake3.js";
import { hex } from "./crypto.js";
import { formatDigest, digestsEqual } from "./agile-digest.js";

/** The BLAKE3 multihash algorithm tag a ciphertext cid carries (agile-digest canonical form `blake3:<hex>`). */
export const CIPHERTEXT_CID_ALGO = "blake3" as const;

/** A per-Nexus convergence secret / a read-cap (messageKey) rides exactly 32 bytes — BLAKE3's keyed-MAC width. */
export const CONVERGENCE_SECRET_LEN = 32 as const;

/** The fixed domain-separation tag the keystream hashes under `key = messageKey` — distinct from the derive step. */
const KEYSTREAM_DOMAIN = new TextEncoder().encode(CAD_KEYSTREAM_INFO);

/** A sealed body: the secret-free VERIFY-CAP (cid) + the ciphertext a relay carries + the READ-CAP a member keeps. */
export interface SealedBody {
  /** `blake3:<hex>` — the content-address a relay recomputes secret-free (verify-cap). */
  readonly cid: string;
  /** The ciphertext bytes that rest in the `cid/` CAS tier and blind-transit the member lane. */
  readonly ciphertext: Uint8Array;
  /** The message-locked read-cap (32 bytes) — rides the PRIVATE keyhive lane, NEVER the relay. */
  readonly readCap: Uint8Array;
}

/**
 * Guard a 32-byte secret / read-cap — a stray width never seals (fail-closed at the boundary). Exported so a
 * per-Nexus convergence keyring guards every epoch secret through the ONE width-check the seal itself trusts
 * (a single fail-closed boundary, never two drifting copies).
 */
export function require32(bytes: Uint8Array, what: string): Uint8Array {
  if (!(bytes instanceof Uint8Array) || bytes.length !== CONVERGENCE_SECRET_LEN) {
    throw new TypeError(`ciphertext-cas: ${what} MUST be exactly ${CONVERGENCE_SECRET_LEN} bytes, got ${bytes?.length}`);
  }
  return bytes;
}

/**
 * The self-proving content-address of ciphertext bytes: `blake3:<hex>`. A relay recomputes this with NOTHING
 * but the bytes — the whole verify-cap ⊥ read-cap split rests here. Algorithm-tagged (fork-①), so it sits
 * beside a legacy sha256 cid and carries the migration in-band.
 */
export function ciphertextCid(ciphertext: Uint8Array): string {
  return formatDigest(CIPHERTEXT_CID_ALGO, hex(blake3(ciphertext)));
}

/**
 * THE BLIND VERIFY (secret-free). Recompute `BLAKE3(ciphertext)` and compare to the claimed cid — the check a
 * relay runs to certify a body it can never read. Routes through `digestsEqual` (tag-agnostic): a stored bare
 * hex still matches a computed `blake3:` value. Returns false (never throws) on a malformed cid — a hot-path
 * comparator surfaces a mismatch, it never crashes transit.
 */
export function verifyCiphertextCid(ciphertext: Uint8Array, cid: string): boolean {
  return digestsEqual(ciphertextCid(ciphertext), cid);
}

/**
 * Derive the message-locked read-cap (messageKey) for a body: `BLAKE3(plaintext, key = nexusSecret)`. Message-
 * locked → same (content, secret) yields the same read-cap (per-Nexus dedup); a different secret yields a
 * different read-cap (no cross-Nexus dedup). The output IS the read-cap that rides the private lane.
 */
export function deriveMessageKey(plaintext: Uint8Array, nexusSecret: Uint8Array): Uint8Array {
  require32(nexusSecret, "nexusSecret");
  return blake3(plaintext, { key: nexusSecret, dkLen: CONVERGENCE_SECRET_LEN });
}

/** The per-body XOF keystream: `BLAKE3(KEYSTREAM_DOMAIN, key = messageKey, dkLen = len)`. Deterministic in the
 *  read-cap alone — a member decrypts with the read-cap, never the per-Nexus secret. */
function keystream(readCap: Uint8Array, len: number): Uint8Array {
  require32(readCap, "readCap");
  return blake3(KEYSTREAM_DOMAIN, { key: readCap, dkLen: len });
}

/** XOR two equal-length byte runs into a fresh buffer (the stream-cipher core; length-checked by the caller). */
function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i]! ^ b[i]!;
  return out;
}

/**
 * SEAL a body ON the CAS: message-lock it to the per-Nexus secret, XOR-stream it to ciphertext, address it by
 * `BLAKE3(ciphertext)`. Deterministic → per-Nexus dedup; the read-cap stays with the caller (never the relay).
 * FAIL-CLOSED upstream: a caller with NO per-Nexus secret MUST NOT reach here (the body stays local/unsealed —
 * never a plaintext body registered as sealed). The primitive itself never sees the fail-open path.
 */
export function sealBodyOnCas(plaintext: Uint8Array, nexusSecret: Uint8Array): SealedBody {
  const readCap = deriveMessageKey(plaintext, nexusSecret);
  const ciphertext = xorBytes(plaintext, keystream(readCap, plaintext.length));
  return { cid: ciphertextCid(ciphertext), ciphertext, readCap };
}

/**
 * OPEN a sealed body with its read-cap (the private-lane member path). Recomputes the keystream from the
 * read-cap ALONE — the per-Nexus secret is NOT needed to read, only to (re-)derive the read-cap. The relay,
 * holding neither, carries the ciphertext and reads nothing.
 */
export function openBodyOnCas(ciphertext: Uint8Array, readCap: Uint8Array): Uint8Array {
  return xorBytes(ciphertext, keystream(readCap, ciphertext.length));
}
