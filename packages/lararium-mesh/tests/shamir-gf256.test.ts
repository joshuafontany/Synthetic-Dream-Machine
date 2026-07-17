/**
 * shamir-gf256.test — GF(256) Shamir round-trips + the perfect-secrecy floor. The recovery keel's
 * foundation: t-of-n reconstructs from ANY t shares, and FEWER than t reveal nothing — which is the
 * impersonation-quorum invariant made arithmetic (no path recovers from below threshold).
 */
import { describe, test, expect } from "vitest";
import { splitSecret, combineSecret, type ShareBytes } from "../src/shamir-gf256.js";
import type { RandomProvider } from "../src/crypto.js";

// 32-byte secret (a stand-in for the PersonaGroup-root seed).
const SECRET = Uint8Array.from(Array.from({ length: 32 }, (_, i) => (i * 37 + 11) & 0xff));

/** A deterministic RNG (LCG) so tests pin split output — never for production. */
function seededRng(seed: number): RandomProvider {
  let s = seed >>> 0;
  return {
    getRandomValues<T extends Uint8Array<ArrayBuffer>>(arr: T): T {
      for (let i = 0; i < arr.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; arr[i] = (s >>> 24) & 0xff; }
      return arr;
    },
    randomUUID(): string { return "00000000-0000-0000-0000-000000000000"; },
  };
}
const rng = seededRng(0xC0FFEE);

describe("shamir-gf256 — the recovery keel's split/combine floor", () => {
  test("2-of-2 round-trips (the birth quorum {device, recorded-code})", () => {
    const shares = splitSecret(SECRET, 2, 2, rng);
    expect(shares).toHaveLength(2);
    expect([...combineSecret(shares)]).toEqual([...SECRET]);
  });

  test("3-of-5 recovers from ANY threshold subset (the grown Circle quorum)", () => {
    const shares = splitSecret(SECRET, 3, 5, rng);
    for (const pick of [[0, 1, 2], [0, 2, 4], [1, 3, 4], [2, 3, 4]]) {
      expect([...combineSecret(pick.map((i) => shares[i]!))]).toEqual([...SECRET]);
    }
  });

  test("below threshold reveals NOTHING — a lone share is not the secret, and cannot combine", () => {
    const shares = splitSecret(SECRET, 2, 3, rng);
    for (const s of shares) expect([...s.ys]).not.toEqual([...SECRET]);   // a share ≠ the secret
    expect(() => combineSecret([shares[0]!])).toThrow(/≥ 2/);             // one share cannot reconstruct
  });

  test("fewer-than-threshold shares combine to a WRONG secret (Shamir carries no validity check)", () => {
    const shares = splitSecret(SECRET, 3, 5, rng);
    // Two shares of a 3-threshold interpolate a different constant — silently wrong, by design.
    expect([...combineSecret([shares[0]!, shares[1]!])]).not.toEqual([...SECRET]);
  });

  test("the same seed yields the same shares; a fresh split is safe to combine either way", () => {
    const a = splitSecret(SECRET, 2, 2, seededRng(42));
    const b = splitSecret(SECRET, 2, 2, seededRng(42));
    expect([...a[0]!.ys]).toEqual([...b[0]!.ys]);           // deterministic under a pinned RNG
    expect([...combineSecret(a)]).toEqual([...SECRET]);
  });

  test("large fan-out: any 2 of a 2-of-16 recover (the escrow-peer availability spread)", () => {
    const shares = splitSecret(SECRET, 2, 16, rng);
    expect([...combineSecret([shares[3]!, shares[11]!])]).toEqual([...SECRET]);
  });

  test("rejects degenerate parameters", () => {
    expect(() => splitSecret(SECRET, 1, 2, rng)).toThrow(/threshold/);
    expect(() => splitSecret(SECRET, 3, 2, rng)).toThrow(/shareCount/);
    expect(() => splitSecret(SECRET, 2, 256, rng)).toThrow(/255/);
    expect(() => splitSecret(new Uint8Array(0), 2, 2, rng)).toThrow(/empty/);
    const shares = splitSecret(SECRET, 2, 3, rng);
    expect(() => combineSecret([shares[0]!, shares[0]!])).toThrow(/duplicate/);
    const forgedZero: ShareBytes = { x: 0, ys: shares[0]!.ys };
    expect(() => combineSecret([forgedZero, shares[1]!])).toThrow(/x=0/);
  });
});
