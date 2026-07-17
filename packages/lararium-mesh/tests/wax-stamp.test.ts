/**
 * wax-stamp.test — the provenance trichotomy: a seal traces to the CURRENT charter, a PAST-authentic
 * one, or a SPOOF; the charter chain verifies pre-rotation + hash-links; duplicity is detectable while
 * fork-legitimacy is deliberately NOT decided.
 */
import { describe, test, expect } from "vitest";
import {
  verifyCharterChain, classifySeal, detectDuplicity,
  type CharterEpoch, type WaxStamp,
} from "../src/wax-stamp.js";

// A valid 3-epoch chain: each epoch's keySetHash == its predecessor's nextKeyCommit (pre-rotation).
const CHAIN: CharterEpoch[] = [
  { epoch: 0, epochCid: "e0", keySetHash: "k0", nextKeyCommit: "k1", prevEpochCid: null },
  { epoch: 1, epochCid: "e1", keySetHash: "k1", nextKeyCommit: "k2", prevEpochCid: "e0" },
  { epoch: 2, epochCid: "e2", keySetHash: "k2", nextKeyCommit: "k3", prevEpochCid: "e1" },  // HEAD
];
const stampUnder = (epochCid: string, sig = `sig-${epochCid}`): WaxStamp =>
  ({ artifactHash: "art-1", epochCid, sealedAt: "itc:[0,4]", signature: sig });
// A faithful sig-verify stub: the signature is "sig-<epochCid>" iff genuinely sealed under that epoch.
const verifySig = (s: WaxStamp, e: CharterEpoch): boolean => s.signature === `sig-${e.epochCid}`;

describe("wax-stamp — charter-epoch provenance", () => {
  test("verifyCharterChain accepts a pre-rotated hash-linked lineage", () => {
    expect(verifyCharterChain(CHAIN)).toBe(true);
  });

  test("verifyCharterChain rejects a broken hash-link, broken pre-rotation, or bad genesis", () => {
    expect(verifyCharterChain([{ ...CHAIN[0]!, prevEpochCid: "x" }])).toBe(false);                 // genesis has a prev
    const badLink = [CHAIN[0]!, { ...CHAIN[1]!, prevEpochCid: "wrong" }, CHAIN[2]!];
    expect(verifyCharterChain(badLink)).toBe(false);                                               // hash-link broken
    const badRot = [CHAIN[0]!, { ...CHAIN[1]!, keySetHash: "forged" }, CHAIN[2]!];
    expect(verifyCharterChain(badRot)).toBe(false);                                                // pre-rotation broken
    expect(verifyCharterChain([])).toBe(false);
  });

  test("a seal under the HEAD epoch reads CURRENT", () => {
    expect(classifySeal(stampUnder("e2"), CHAIN, verifySig)).toBe("CURRENT");
  });

  test("a seal under an ANCESTOR epoch reads PAST_AUTHENTIC (genuine, older)", () => {
    expect(classifySeal(stampUnder("e1"), CHAIN, verifySig)).toBe("PAST_AUTHENTIC");
    expect(classifySeal(stampUnder("e0"), CHAIN, verifySig)).toBe("PAST_AUTHENTIC");
  });

  test("SPOOF: an unknown epoch, a failed signature, or a broken chain", () => {
    expect(classifySeal(stampUnder("e9"), CHAIN, verifySig)).toBe("SPOOF");                        // no such epoch
    expect(classifySeal(stampUnder("e2", "forged"), CHAIN, verifySig)).toBe("SPOOF");              // sig fails
    const brokenChain = [CHAIN[0]!, { ...CHAIN[1]!, keySetHash: "forged" }, CHAIN[2]!];
    expect(classifySeal(stampUnder("e2"), brokenChain, verifySig)).toBe("SPOOF");                  // lineage broken
  });

  test("duplicity is detectable (two CIDs at one sequence); a consistent pair is clean", () => {
    const fork: CharterEpoch[] = [CHAIN[0]!, { ...CHAIN[1]!, epochCid: "e1-fork", prevEpochCid: "e0" }];
    expect(detectDuplicity(CHAIN, fork)).toBe(1);        // epoch 1 signed two ways = proof-of-misbehavior
    expect(detectDuplicity(CHAIN, CHAIN)).toBeNull();    // the same lineage duplicates nothing
    // NOTE: which fork is "legitimate" is NOT decided here — higher-order social acceptance, never a signature.
  });
});
