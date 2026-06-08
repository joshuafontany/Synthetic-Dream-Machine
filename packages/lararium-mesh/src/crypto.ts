/**
 * Web Crypto provider boundary for Lararium.
 *
 * Doctrine: lararium-mesh/CRYPTO.md
 *   - Lararium defines needs; it does not implement primitives.
 *   - Portable code depends on CryptoProvider, never on Node crypto or hand-rolled code.
 *   - All digest operations are async (SubtleCrypto.digest is async).
 *   - Callers must supply canonical bytes, not raw objects.
 *
 * Exception: sha256HexSync — synchronous build-tool path.
 *   Build scripts (Vite plugin, pack transcript, manifest generators) need a sync
 *   sha256. They run only in Node at build time; SubtleCrypto async is not ergonomic
 *   there. sha256HexSync uses @noble/hashes/sha2 directly. Do NOT import it into
 *   browser bundles or runtime code. All runtime callers MUST use sha256Hex().
 */
import { sha256 as nobleSha256 } from "@noble/hashes/sha2.js";

// ---------------------------------------------------------------------------
// Provider interfaces
// ---------------------------------------------------------------------------

export type DigestAlgorithm = "SHA-256" | "SHA-384" | "SHA-512";

export interface DigestProvider {
  digest(algorithm: DigestAlgorithm, data: Uint8Array): Promise<Uint8Array>;
}

export interface RandomProvider {
  getRandomValues<T extends Uint8Array>(array: T): T;
  randomUUID(): string;
}

export interface CryptoProvider extends DigestProvider, RandomProvider {}

// ---------------------------------------------------------------------------
// Platform Web Crypto implementation (Node 19+ and all modern browsers)
// ---------------------------------------------------------------------------

export async function webDigest(
  algorithm: DigestAlgorithm,
  data: Uint8Array,
): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto SubtleCrypto unavailable in this runtime");
  return new Uint8Array(await subtle.digest(algorithm, data.buffer as ArrayBuffer));
}

export function webGetRandomValues<T extends Uint8Array>(array: T): T {
  const fn = globalThis.crypto?.getRandomValues?.bind(globalThis.crypto);
  if (!fn) throw new Error("crypto.getRandomValues unavailable in this runtime");
  return fn(array);
}

export function webRandomUUID(): string {
  const fn = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  if (!fn) throw new Error("crypto.randomUUID unavailable in this runtime");
  return fn();
}

/** Default platform provider — uses globalThis.crypto (Node 19+, all modern browsers). */
export const defaultCryptoProvider: CryptoProvider = {
  digest:          webDigest,
  getRandomValues: webGetRandomValues,
  randomUUID:      webRandomUUID,
};

// ---------------------------------------------------------------------------
// Canonical bytes helpers (CRYPTO.md policy)
// ---------------------------------------------------------------------------

/** Encode a string to UTF-8 bytes. Always use this, never Buffer.from(str). */
export function utf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/**
 * Stable JSON serialization with sorted keys.
 * Rejects undefined, functions, symbols, BigInt, non-finite numbers, and class instances
 * unless they have a well-typed JSON representation.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_, v) => {
    if (v === undefined) return undefined;
    if (typeof v === "function" || typeof v === "symbol" || typeof v === "bigint") {
      throw new TypeError(`canonicalJson: non-serializable value type ${typeof v}`);
    }
    if (typeof v === "number" && !isFinite(v)) {
      throw new TypeError(`canonicalJson: non-finite number ${v}`);
    }
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      // Sort object keys for stability
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      );
    }
    return v;
  });
}

/** `canonicalJson` encoded as UTF-8 bytes. */
export function canonicalJsonBytes(value: unknown): Uint8Array {
  return utf8Bytes(canonicalJson(value));
}

/** Encode a Uint8Array as a lowercase hex string. */
export function hex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Decode a lowercase/uppercase hex string into bytes. Inverse of `hex`.
 * Throws on odd length or non-hex characters — callers pass already-validated
 * hex (e.g. an ed25519 key or signature whose length the caller guards first).
 */
export function hexToBytes(hexStr: string): Uint8Array {
  if (hexStr.length % 2 !== 0) {
    throw new TypeError(`hexToBytes: odd-length hex (${hexStr.length})`);
  }
  const out = new Uint8Array(hexStr.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(hexStr.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new TypeError(`hexToBytes: non-hex at offset ${i * 2}`);
    out[i] = byte;
  }
  return out;
}

/**
 * SHA-256 digest of bytes, returned as lowercase hex.
 * Requires a DigestProvider (use defaultCryptoProvider for platform Web Crypto).
 */
export async function sha256Hex(bytes: Uint8Array, provider: DigestProvider): Promise<string> {
  return hex(await provider.digest("SHA-256", bytes));
}

/**
 * Synchronous SHA-256 of bytes.
 *
 * SCOPE: build-time tooling ONLY — Vite plugin, pack scripts, manifest generators.
 * Runtime code MUST use sha256Hex(bytes, provider) which routes through CryptoProvider.
 * Do NOT import this into browser bundles or any file that ships to a browser runtime.
 *
 * Uses @noble/hashes/sha2 (synchronous), not SubtleCrypto.
 */
export function sha256BytesSync(bytes: Uint8Array): Uint8Array {
  return nobleSha256(bytes);
}

/**
 * Synchronous SHA-256 of bytes, returned as lowercase hex.
 * Build-time tooling only.
 */
export function sha256HexBytesSync(bytes: Uint8Array): string {
  return hex(sha256BytesSync(bytes));
}

/**
 * Synchronous SHA-256 of a UTF-8 string, returned as lowercase hex.
 *
 * SCOPE: build-time tooling ONLY — Vite plugin, pack scripts, manifest generators.
 * Runtime code MUST use sha256Hex(bytes, provider) which routes through CryptoProvider.
 * Do NOT import this into browser bundles or any file that ships to a browser runtime.
 *
 * Uses @noble/hashes/sha2 (synchronous), not SubtleCrypto.
 */
export function sha256HexSync(text: string): string {
  return sha256HexBytesSync(utf8Bytes(text));
}

/**
 * CID design note:
 * - Use CIDv1 raw SHA-256 for content identity where a stable address is needed.
 * - Avoid the full multiformats dependency by emitting only the raw SHA-256
 *   multicodec prefix + content digest, encoded as lowercase base32.
 * - Early alpha intent: canonize CIDs now and avoid preserving hex-only SHA-256
 *   as a long-lived legacy surface.
 */
const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function parseHexDigest(hexDigest: string): Uint8Array {
  if (hexDigest.length !== 64) {
    throw new TypeError(`parseHexDigest: expected 64-char lowercase hex, got ${hexDigest.length}`);
  }
  const result = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    result[i] = Number.parseInt(hexDigest.slice(i * 2, i * 2 + 2), 16);
  }
  return result;
}

/**
 * Encode a 64-byte SHA-256 hex digest as CIDv1 raw SHA-256.
 */
export function cidV1Sha256FromHex(hexDigest: string): string {
  const digest = parseHexDigest(hexDigest);
  const prefix = new Uint8Array([0x01, 0x55, 0x12, 0x20]);
  const cidBytes = new Uint8Array(prefix.length + digest.length);
  cidBytes.set(prefix, 0);
  cidBytes.set(digest, prefix.length);
  return `b${base32Encode(cidBytes)}`;
}

/**
 * CIDv1 raw SHA-256 of content bytes.
 */
export function cidV1Sha256(content: Uint8Array): string {
  return cidV1Sha256FromHex(sha256HexBytesSync(content));
}
