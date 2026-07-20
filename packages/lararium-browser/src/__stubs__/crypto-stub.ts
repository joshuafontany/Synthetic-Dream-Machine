/**
 * Browser stub for Node's `crypto` module — TEST ENVIRONMENTS ONLY.
 * `createHash("sha256")` returns a DETERMINISTIC non-crypto FNV-1a digest, NOT a real
 * SHA-256. It stands in for the synchronous hash pattern tw5-host-bridge uses, where a
 * test asserts value STABILITY, never cryptographic strength. Never reach this off the
 * test path — a real digest needs Node `crypto` or an async WebCrypto call.
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
    // Synchronous hex digest — the Node createHash API is synchronous, so a real async
    // WebCrypto call cannot stand here. FNV-1a over ALL input bytes gives a deterministic,
    // test-stable value (never a cryptographic digest).
    digest(encoding: "hex" | "base64" = "hex"): string {
      const allBytes = mergeChunks(chunks);
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
