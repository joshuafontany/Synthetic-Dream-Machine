/**
 * recovery-share.test — the impersonation-quorum guard, made a type + a throw. The crown assertion:
 * a single-custodian set can NEVER assemble a Quorum, so no escrow/peer holding one custodian's shares
 * can reconstruct alone. Plus the split→quorum→reconstruct round-trip and the recorded-share codec.
 */
import { describe, test, expect } from "vitest";
import {
  splitToShares, assembleQuorum, reconstructFromQuorum,
  encodeShareBytes, decodeShareBytes, type RecoveryShare,
} from "../src/recovery-share.js";
import type { RandomProvider } from "../src/crypto.js";

const SECRET = Uint8Array.from(Array.from({ length: 32 }, (_, i) => (i * 53 + 7) & 0xff));

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
const rng = seededRng(0xBEEF);

describe("recovery-share — the impersonation-quorum guard as a type", () => {
  test("split {device, recorded-code} → assemble → reconstruct recovers the root seed", () => {
    const shares = splitToShares(SECRET, 2, ["device", "recorded-code"], 1, rng);
    const q = assembleQuorum(shares, 2);
    expect([...reconstructFromQuorum(q)]).toEqual([...SECRET]);
  });

  test("a SINGLE-custodian set can NEVER assemble a Quorum — the honeypot is unrepresentable", () => {
    // Two shares, BOTH held by the escrow-peer: enough points, but one custodian → forbidden.
    const escrowOnly: RecoveryShare[] = splitToShares(SECRET, 2, ["escrow-peer", "guardian"], 1, rng)
      .map((s) => ({ ...s, custodian: "escrow-peer" as const }));   // re-tag both to one custodian
    expect(() => assembleQuorum(escrowOnly, 2)).toThrow(/single-custodian quorum forbidden/);
  });

  test("a 3-custodian k-of-n (the grown Circle) reconstructs from any 2 distinct custodians", () => {
    const shares = splitToShares(SECRET, 2, ["device", "guardian", "guardian"], 4, rng);
    const q = assembleQuorum([shares[0]!, shares[1]!], 2);   // device + a guardian → 2 distinct tags
    expect([...reconstructFromQuorum(q)]).toEqual([...SECRET]);
  });

  test("assembleQuorum rejects below-threshold, mixed-epoch, and duplicate-x", () => {
    const shares = splitToShares(SECRET, 2, ["device", "recorded-code"], 1, rng);
    expect(() => assembleQuorum([shares[0]!], 2)).toThrow(/below threshold/);
    const mixed = [shares[0]!, { ...shares[1]!, recoveryEpoch: 2 }];
    expect(() => assembleQuorum(mixed, 2)).toThrow(/mixed-epoch/);
    const dupX = [shares[0]!, { ...shares[1]!, bytes: shares[0]!.bytes }];
    expect(() => assembleQuorum(dupX, 2)).toThrow(/duplicate share x/);
  });

  test("splitToShares refuses a solo split (< 2 custodians)", () => {
    expect(() => splitToShares(SECRET, 2, ["device"], 1, rng)).toThrow(/≥ 2 custodians/);
  });

  test("the recorded share round-trips through the transcription codec; a slip is caught", () => {
    const shares = splitToShares(SECRET, 2, ["device", "recorded-code"], 1, rng);
    const codeShare = shares[1]!.bytes;                       // the recorded-code custodian's share
    const encoded = encodeShareBytes(codeShare);
    const decoded = decodeShareBytes(encoded);
    expect(decoded.x).toBe(codeShare.x);
    expect([...decoded.ys]).toEqual([...codeShare.ys]);
    // A transcription slip (one flipped hex nibble) trips the checksum, not a silent bad reconstruct.
    const slipped = (encoded[0] === "a" ? "b" : "a") + encoded.slice(1);
    expect(() => decodeShareBytes(slipped)).toThrow(/checksum mismatch/);
  });
});
