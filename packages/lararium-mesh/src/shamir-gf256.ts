/**
 * shamir-gf256 — Shamir secret-sharing over GF(256) (the AES field, reduction poly 0x11b), pure and
 * browser-shippable (the island-of-one is the strict teacher). The recovery keel's floor primitive:
 * split the PersonaGroup-root seed into shares of which the recorded code is ONE, so no single share —
 * and no single custodian — reconstructs (the impersonation-quorum invariant, made arithmetic).
 *
 * A t-of-n sharing gives PERFECT secrecy below t: any t-1 shares reveal exactly zero bits of the secret.
 * That same wall means loss of shares below t = permanent, by-design identity loss — which is not a
 * defect but the Camenisch-Lysyanskaya invariant itself: any path that recovered from fewer than t
 * shares would BE an impersonation quorum. No crypto restores a secret from nothing.
 *
 * Rides the RandomProvider seam (crypto.ts) — injectable, so tests pin a deterministic RNG and no
 * `node:` import leaks in. Byte-wise: the secret's k bytes become k independent GF(256) sharings over
 * shared x-coordinates; a share is {x: 1..n, ys: k bytes}.
 */

import type { RandomProvider } from "./crypto.js";

/** One share: its x-coordinate (1..255, never 0 — x=0 IS the secret) and one y per secret byte. */
export interface ShareBytes {
  readonly x:  number;
  readonly ys: Uint8Array;
}

// GF(256) exp/log tables over the AES field: generator g=0x03, reduction poly 0x11b. EXP cycles all
// 255 non-zero elements (3 is a generator), so mul/inv become table lookups.
const EXP = new Uint8Array(255);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    // x *= 3 in GF(256) (Russian-peasant with 0x11b reduction) — bootstraps the tables.
    let a = x, b = 3, p = 0;
    while (b > 0) {
      if ((b & 1) !== 0) p ^= a;
      const hi = a & 0x80;
      a = (a << 1) & 0xff;
      if (hi !== 0) a ^= 0x1b;
      b >>= 1;
    }
    x = p;
  }
}

/** GF(256) multiply: add is XOR (in the callers); this is the field product. 0 annihilates. */
const mul = (a: number, b: number): number => (a === 0 || b === 0 ? 0 : EXP[(LOG[a]! + LOG[b]!) % 255]!);
/** GF(256) divide (a / b). Throws on divide-by-zero (a degenerate share set). */
const div = (a: number, b: number): number => {
  if (b === 0) throw new Error("shamir: division by zero (degenerate shares)");
  return a === 0 ? 0 : EXP[(LOG[a]! - LOG[b]! + 255) % 255]!;
};

/**
 * Split `secret` into `shareCount` shares, any `threshold` of which reconstruct it; fewer than
 * `threshold` reveal nothing. Each secret byte rides its own random degree-(threshold-1) polynomial
 * whose constant term is that byte; a share evaluates every polynomial at its own x.
 */
export function splitSecret(secret: Uint8Array, threshold: number, shareCount: number, rng: RandomProvider): ShareBytes[] {
  if (!Number.isInteger(threshold) || threshold < 2) throw new Error("shamir: threshold must be an integer ≥ 2");
  if (!Number.isInteger(shareCount) || shareCount < threshold) throw new Error("shamir: shareCount must be an integer ≥ threshold");
  if (shareCount > 255) throw new Error("shamir: shareCount must be ≤ 255 (x lives in GF(256)\\{0})");
  if (secret.length === 0) throw new Error("shamir: empty secret");

  // (threshold-1) random coefficients per secret byte — the polynomial above the constant term.
  const coeffs = new Uint8Array(secret.length * (threshold - 1));
  if (coeffs.length > 0) rng.getRandomValues(coeffs);

  const shares: ShareBytes[] = [];
  for (let s = 1; s <= shareCount; s++) {
    const ys = new Uint8Array(secret.length);
    for (let i = 0; i < secret.length; i++) {
      let acc = secret[i]!;      // constant term = the secret byte
      let xp = 1;                // s^k, built up
      for (let k = 1; k < threshold; k++) {
        xp = mul(xp, s);
        acc ^= mul(coeffs[i * (threshold - 1) + (k - 1)]!, xp);
      }
      ys[i] = acc;
    }
    shares.push({ x: s, ys });
  }
  return shares;
}

/**
 * Reconstruct the secret from `shares` via Lagrange interpolation at x=0. Needs ≥ the original
 * threshold of DISTINCT-x shares; passing fewer (or the wrong ones) yields a wrong secret silently —
 * Shamir carries no built-in validity check, so the caller pairs it with a share checksum (recovery-share).
 */
export function combineSecret(shares: readonly ShareBytes[]): Uint8Array {
  if (shares.length < 2) throw new Error("shamir: need ≥ 2 shares to combine");
  const len = shares[0]!.ys.length;
  if (shares.some((s) => s.ys.length !== len)) throw new Error("shamir: shares differ in length");
  const xs = shares.map((s) => s.x);
  if (xs.some((x) => x === 0)) throw new Error("shamir: x=0 is the secret, never a share");
  if (new Set(xs).size !== xs.length) throw new Error("shamir: duplicate x-coordinate");

  const secret = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    let acc = 0;
    for (let j = 0; j < shares.length; j++) {
      // Lagrange basis L_j(0) = ∏_{m≠j} (0 − x_m)/(x_j − x_m) = ∏ x_m/(x_j ⊕ x_m)  (−x = x in GF(2^8)).
      let num = 1, den = 1;
      for (let m = 0; m < shares.length; m++) {
        if (m === j) continue;
        num = mul(num, shares[m]!.x);
        den = mul(den, shares[j]!.x ^ shares[m]!.x);
      }
      acc ^= mul(shares[j]!.ys[i]!, div(num, den));
    }
    secret[i] = acc;
  }
  return secret;
}
