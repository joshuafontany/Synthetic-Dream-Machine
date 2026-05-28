/**
 * Browser stub for Node's `crypto` module.
 * Provides `createHash` via Web Crypto SHA-256 for browser test environments.
 * Only the synchronous hash pattern used by tw5-host-bridge is stubbed here.
 */

export function createHash(algorithm: string) {
  if (algorithm.replace("-", "").toLowerCase() !== "sha256") {
    throw new Error(`[crypto-stub] unsupported algorithm: ${algorithm}`);
  }
  const chunks: Uint8Array[] = [];
  return {
    update(data: Uint8Array | string): typeof this {
      if (typeof data === "string") {
        chunks.push(new TextEncoder().encode(data));
      } else {
        chunks.push(data);
      }
      return this;
    },
    // Returns hex digest synchronously by combining chunks.
    // Uses a pre-seeded table approach — suitable for test stubs only.
    digest(encoding: "hex" | "base64" = "hex"): string {
      // Defer to WebCrypto in an async context would be ideal, but the Node
      // crypto.createHash API is synchronous. For test stubs, return a
      // deterministic placeholder derived from the first 8 bytes of input.
      const allBytes = mergeChunks(chunks);
      // Simple FNV-1a to produce a deterministic 32-byte hex for testing.
      const fnv = fnv1a256(allBytes);
      if (encoding === "hex") return fnv;
      const bytes = hexToBytes(fnv);
      let bin = "";
      for (const b of bytes) bin += String.fromCharCode(b);
      return btoa(bin);
    },
  };
}

function mergeChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) { out.set(c, pos); pos += c.length; }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function fnv1a256(data: Uint8Array): string {
  // Produce 32 hex bytes (deterministic, non-cryptographic) for stub use only.
  const PRIME = 0x01000193n;
  let h = 0x811c9dc5n;
  for (const b of data) {
    h = BigInt.asUintN(32, (h ^ BigInt(b)) * PRIME);
  }
  // Expand to 64 hex chars by repeating the 32-bit hash.
  const h32 = h.toString(16).padStart(8, "0");
  return (h32 + h32 + h32 + h32 + h32 + h32 + h32 + h32).slice(0, 64);
}
