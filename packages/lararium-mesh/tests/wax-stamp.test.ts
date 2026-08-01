/**
 * wax-stamp.test — the provenance trichotomy: a seal traces to the CURRENT charter, a PAST-authentic
 * one, or a SPOOF; the charter chain verifies pre-rotation + hash-links; duplicity is detectable while
 * fork-legitimacy is deliberately NOT decided.
 */
import { describe, test, expect } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import * as ed25519 from "@noble/ed25519";
import {
  verifySealLineage, classifySeal, detectDuplicity,
  mintWaxStamp, verifyWaxStampSig, singleKeySetHash,
  sealKeySetHash, sealEpochCidOf, mintCharterEpoch,
  genesisCharterEpoch, rotateSealEpoch,
  type SealEpoch, type WaxStamp,
} from "../src/wax-stamp.js";

// A valid 3-epoch chain: each epoch's keySetHash == its predecessor's nextKeyCommit (pre-rotation).
const CHAIN: SealEpoch[] = [
  { epoch: 0, epochCid: "e0", keySetHash: "k0", nextKeyCommit: "k1", prevEpochCid: null },
  { epoch: 1, epochCid: "e1", keySetHash: "k1", nextKeyCommit: "k2", prevEpochCid: "e0" },
  { epoch: 2, epochCid: "e2", keySetHash: "k2", nextKeyCommit: "k3", prevEpochCid: "e1" },  // HEAD
];
const stampUnder = (epochCid: string, sig = `sig-${epochCid}`): WaxStamp =>
  ({ artifactHash: "art-1", epochCid, sealedAt: "itc:[0,4]", signature: sig });
// A faithful sig-verify stub: the signature is "sig-<epochCid>" iff genuinely sealed under that epoch.
const verifySig = (s: WaxStamp, e: SealEpoch): boolean => s.signature === `sig-${e.epochCid}`;

describe("wax-stamp — charter-epoch provenance", () => {
  test("verifySealLineage accepts a pre-rotated hash-linked lineage", () => {
    expect(verifySealLineage(CHAIN)).toBe(true);
  });

  test("verifySealLineage rejects a broken hash-link, broken pre-rotation, or bad genesis", () => {
    expect(verifySealLineage([{ ...CHAIN[0]!, prevEpochCid: "x" }])).toBe(false);                 // genesis has a prev
    const badLink = [CHAIN[0]!, { ...CHAIN[1]!, prevEpochCid: "wrong" }, CHAIN[2]!];
    expect(verifySealLineage(badLink)).toBe(false);                                               // hash-link broken
    const badRot = [CHAIN[0]!, { ...CHAIN[1]!, keySetHash: "forged" }, CHAIN[2]!];
    expect(verifySealLineage(badRot)).toBe(false);                                                // pre-rotation broken
    expect(verifySealLineage([])).toBe(false);
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
    const fork: SealEpoch[] = [CHAIN[0]!, { ...CHAIN[1]!, epochCid: "e1-fork", prevEpochCid: "e0" }];
    expect(detectDuplicity(CHAIN, fork)).toBe(1);        // epoch 1 signed two ways = proof-of-misbehavior
    expect(detectDuplicity(CHAIN, CHAIN)).toBeNull();    // the same lineage duplicates nothing
    // NOTE: which fork is "legitimate" is NOT decided here — higher-order social acceptance, never a signature.
  });
});

describe("wax-stamp R1 — a no-membership reader verifies provenance from the PUBLIC charter, no roster", () => {
  // Three epoch keys — real pre-rotation (each epoch a distinct authorized signer).
  const key = (): { seed: Uint8Array; pub: string } => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const pub  = Buffer.from((publicKey.export({ format: "jwk" }) as { x: string }).x, "base64url").toString("hex");
    const seed = new Uint8Array(Buffer.from((privateKey.export({ format: "jwk" }) as { d: string }).d, "base64url"));
    return { seed, pub };
  };
  const sign = (seed: Uint8Array) => async (bytes: Uint8Array): Promise<string> =>
    Buffer.from(await ed25519.signAsync(bytes, seed)).toString("hex");

  const k0 = key(), k1 = key(), k2 = key(), k3 = key();
  // The PUBLIC charter — keys/thresholds only, hash-linked, pre-rotated. NO member identities anywhere.
  const CHARTER: SealEpoch[] = [
    { epoch: 0, epochCid: "c0", keySetHash: singleKeySetHash(k0.pub), nextKeyCommit: singleKeySetHash(k1.pub), prevEpochCid: null },
    { epoch: 1, epochCid: "c1", keySetHash: singleKeySetHash(k1.pub), nextKeyCommit: singleKeySetHash(k2.pub), prevEpochCid: "c0" },
    { epoch: 2, epochCid: "c2", keySetHash: singleKeySetHash(k2.pub), nextKeyCommit: singleKeySetHash(k3.pub), prevEpochCid: "c1" },  // HEAD
  ];

  test("the reader classifies CURRENT / PAST-AUTHENTIC / SPOOF from the public charter alone", async () => {
    expect(verifySealLineage(CHARTER)).toBe(true);

    // The org mints a stamp under the HEAD epoch, signed by the head's authorized key.
    const current = await mintWaxStamp({ artifactHash: "art-current", epoch: CHARTER[2]!, sealedAt: "itc:[8,12]", sign: sign(k2.seed) });
    // The reader — holding ONLY the public charter + the stamp + the signer key — verifies + classifies.
    const currentOk = await verifyWaxStampSig(current, CHARTER[2]!, k2.pub);
    expect(classifySeal(current, CHARTER, () => currentOk)).toBe("CURRENT");

    // A stamp under an ANCESTOR epoch (signed by epoch-1's key) → genuine, older.
    const past = await mintWaxStamp({ artifactHash: "art-past", epoch: CHARTER[1]!, sealedAt: "itc:[4,8]", sign: sign(k1.seed) });
    const pastOk = await verifyWaxStampSig(past, CHARTER[1]!, k1.pub);
    expect(classifySeal(past, CHARTER, () => pastOk)).toBe("PAST_AUTHENTIC");

    // A SPOOF: signed by a key the cited epoch does NOT authorize (k0 signing under the head epoch).
    const spoof = await mintWaxStamp({ artifactHash: "art-spoof", epoch: CHARTER[2]!, sealedAt: "itc:[8,12]", sign: sign(k0.seed) });
    const spoofOk = await verifyWaxStampSig(spoof, CHARTER[2]!, k0.pub);   // k0 not in the head's key-set → false
    expect(spoofOk).toBe(false);
    expect(classifySeal(spoof, CHARTER, () => spoofOk)).toBe("SPOOF");
  });

  test("the public charter exposes KEYS/THRESHOLDS, never a roster — the reader cannot enumerate members", () => {
    // Every field on every epoch is a key-digest / hash / sequence — no member identity, DID, or name.
    for (const e of CHARTER) {
      expect(Object.keys(e).sort()).toEqual(["epoch", "epochCid", "keySetHash", "nextKeyCommit", "prevEpochCid"]);
    }
    // A key-set hash is one-way: the reader cannot recover WHO holds the key, only verify a presented one.
    expect(CHARTER[2]!.keySetHash).not.toContain(k2.pub);   // the hash reveals nothing of the key itself
  });
});

describe("charter-epoch CHAIN minter — pre-rotation seat + rotate ceremony (#68)", () => {
  const K = (n: number): string[] => [`${n}${"a".repeat(63)}`, `${n}${"b".repeat(63)}`];   // a 2-key set, distinct per epoch
  const GEN = K(1), E1 = K(2), E2 = K(3);
  const commit1 = sealKeySetHash(GEN, 2);   // note: GEN's own digest, for a self-consistency check

  test("sealKeySetHash is order-blind + threshold-bound; sealEpochCidOf is tamper-evident", () => {
    expect(sealKeySetHash(GEN, 2)).toBe(sealKeySetHash([...GEN].reverse(), 2));   // order-blind
    expect(sealKeySetHash(GEN, 2)).not.toBe(sealKeySetHash(GEN, 1));              // threshold-bound
    const f = { epoch: 0, keySetHash: "k0", nextKeyCommit: "k1", prevEpochCid: null };
    expect(sealEpochCidOf(f)).toBe(mintCharterEpoch(f).epochCid);
    expect(sealEpochCidOf({ ...f, nextKeyCommit: "TAMPERED" })).not.toBe(sealEpochCidOf(f));  // a flip moves the cid
  });

  test("genesis seats sequence 0 with null prev; a valid rotate ACCEPTS + the chain verifies", () => {
    // seat: genesis pre-commits epoch1's key-set (E1).
    const g = genesisCharterEpoch(GEN, 2, sealKeySetHash(E1, 2));
    expect(g.epoch).toBe(0);
    expect(g.prevEpochCid).toBeNull();
    expect(g.keySetHash).toBe(sealKeySetHash(GEN, 2));
    expect(verifySealLineage([g])).toBe(true);

    // rotate: reveal E1 (matches the commitment), pre-commit E2 → epoch1 hash-links to genesis.
    const r = rotateSealEpoch(g, E1, 2, sealKeySetHash(E2, 2));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.epoch.epoch).toBe(1);
    expect(r.epoch.prevEpochCid).toBe(g.epochCid);
    expect(r.epoch.keySetHash).toBe(sealKeySetHash(E1, 2));
    const chain: SealEpoch[] = [g, r.epoch];
    expect(verifySealLineage(chain)).toBe(true);   // seat→rotate round-trip verifies whole
  });

  test("a mismatched reveal REFUSES (fail-closed): the revealed key-set is not the pre-committed one", () => {
    const g = genesisCharterEpoch(GEN, 2, sealKeySetHash(E1, 2));   // committed E1
    const r = rotateSealEpoch(g, E2, 2, sealKeySetHash(K(4), 2)); // but reveal E2 → mismatch
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toMatch(/reveal mismatch/);
  });

  test("an UNARMED head (no pre-commitment) REFUSES rotation — nothing was committed to verify", () => {
    const g = genesisCharterEpoch(GEN, 2, "");   // rotation unarmed
    const r = rotateSealEpoch(g, E1, 2, sealKeySetHash(E2, 2));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toMatch(/unarmed/);
  });

  test("a broken prev-link REFUSES at chain-verify (a forged successor cannot splice in)", () => {
    const g = genesisCharterEpoch(GEN, 2, sealKeySetHash(E1, 2));
    const r = rotateSealEpoch(g, E1, 2, sealKeySetHash(E2, 2));
    if (!r.ok) throw new Error("rotate should have accepted");
    const forged = mintCharterEpoch({ ...r.epoch, prevEpochCid: "WRONG-PREV" });   // re-mint with a broken link
    expect(verifySealLineage([g, forged])).toBe(false);
    // and a forged reveal (keySetHash not pre-committed) fails the pre-rotation guard even with a good link
    const forgedKeys = mintCharterEpoch({ epoch: 1, keySetHash: sealKeySetHash(K(9), 2), nextKeyCommit: "x", prevEpochCid: g.epochCid });
    expect(verifySealLineage([g, forgedKeys])).toBe(false);
    void commit1;
  });
});
