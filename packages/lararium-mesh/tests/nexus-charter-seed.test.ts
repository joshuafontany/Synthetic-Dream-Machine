/**
 * nexus-charter-seed.test — the ROSTER-FROM-DOC read, FAIL-CLOSED at every unseated seam (#66).
 *
 * Proven:
 *   · a null / absent doc folds to the EMPTY roster (the antigen ignores every entry),
 *   · a doc with no established charter epoch fails closed even with keys present,
 *   · an unseated doc (keys null) fails closed,
 *   · a seated doc with an established epoch raises a LIVE roster that a real 2-of-3 antigen entry verifies,
 *   · `genesisCharterEpochCid` is deterministic on the sorted seated key-set (re-seat strands nothing),
 *   · a below-threshold seated roster fails closed.
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import { hex } from "../src/crypto.js";
import {
  rosterFromCharterDoc, foundingRoster, foundingQuorumSeated, genesisCharterEpochCid,
  charterChainHead, emptyFoundingCharterDoc, NEXUS_CHARTER_DOC_KIND, type NexusCharterDoc,
} from "../src/nexus-charter-seed.js";
import {
  genesisCharterEpoch, rotateCharterEpoch, charterKeySetHash, mintCharterEpoch, type CharterEpoch,
} from "../src/wax-stamp.js";
import { signAntigenEntry, foldAntigenSet, isKapaed, makeMultiSigQuorumVerifier } from "../src/kapae-antigen.js";

const pubOf = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);
const signerOf = (seed: Uint8Array) => (bytes: Uint8Array) => ed.signAsync(bytes, seed).then(hex);
const verifier = makeMultiSigQuorumVerifier();
const VICTIM = "deadbeef".repeat(8);

const SEEDS = {
  guru:     new Uint8Array(32).fill(1),
  telarus:  new Uint8Array(32).fill(2),
  lindwyrm: new Uint8Array(32).fill(3),
};

/** A doc seated with `n` of the three founding kahu, with a genesis epoch bound to the seated key-set. */
async function seatedDoc(seeds: Uint8Array[]): Promise<NexusCharterDoc> {
  const keys = await Promise.all(seeds.map(pubOf));
  const kahu = [
    { displayName: "Guru Joshua Fontany", verifyingKey: keys[0] ?? null },
    { displayName: "Telarus, KSC",        verifyingKey: keys[1] ?? null },
    { displayName: "The Lindwyrm",        verifyingKey: keys[2] ?? null },
  ];
  const seated = keys;
  return {
    kind: NEXUS_CHARTER_DOC_KIND, threshold: 2,
    charterEpochCid: seated.length >= 2 ? genesisCharterEpochCid(seated, 2) : null,
    kahu,
  };
}

describe("rosterFromCharterDoc — fail-closed reads", () => {
  test("a null doc folds to the empty roster", () => {
    const r = rosterFromCharterDoc(null);
    expect(r.keys).toEqual([]);
    expect(r.charterEpochCid).toBe("");
  });

  test("the unseated scaffold folds to the empty roster (no keys, no epoch)", () => {
    const r = foundingRoster(emptyFoundingCharterDoc());
    expect(r.keys).toEqual([]);
    expect(r.charterEpochCid).toBe("");
    expect(foundingQuorumSeated(emptyFoundingCharterDoc())).toBe(false);
  });

  test("keys present but NO epoch → fail closed (nothing roots)", async () => {
    const doc = await seatedDoc([SEEDS.guru, SEEDS.telarus]);
    const noEpoch: NexusCharterDoc = { ...doc, charterEpochCid: null };
    expect(rosterFromCharterDoc(noEpoch).keys).toEqual([]);
    expect(foundingQuorumSeated(noEpoch)).toBe(false);
  });

  test("a below-threshold seated roster fails closed (one key, no epoch established)", async () => {
    const doc = await seatedDoc([SEEDS.guru]);
    expect(doc.charterEpochCid).toBeNull();
    expect(foundingQuorumSeated(doc)).toBe(false);
  });
});

describe("rosterFromCharterDoc — a seated doc raises a LIVE antigen roster", () => {
  test("a 2-of-3 seated doc verifies a real quorum-signed antigen entry", async () => {
    const doc = await seatedDoc([SEEDS.guru, SEEDS.telarus, SEEDS.lindwyrm]);
    const roster = rosterFromCharterDoc(doc);
    expect(roster.keys.length).toBe(3);
    expect(roster.charterEpochCid).not.toBe("");
    expect(foundingQuorumSeated(doc)).toBe(true);

    // Two founding kahu sign a ban rooting on the doc's own charter epoch → the nym stands Kapae'd.
    const signers = await Promise.all([SEEDS.guru, SEEDS.telarus].map(async (s) => ({ signer: await pubOf(s), sign: signerOf(s) })));
    const entry = await signAntigenEntry(
      { nym: VICTIM, action: "kapae", version: 1, charterEpochCid: roster.charterEpochCid },
      signers,
    );
    const set = await foldAntigenSet([entry], roster, verifier);
    expect(isKapaed(VICTIM, set)).toBe(true);
  });

  test("an entry rooting on a DIFFERENT epoch than the doc establishes is ignored", async () => {
    const doc = await seatedDoc([SEEDS.guru, SEEDS.telarus]);
    const roster = rosterFromCharterDoc(doc);
    const signers = await Promise.all([SEEDS.guru, SEEDS.telarus].map(async (s) => ({ signer: await pubOf(s), sign: signerOf(s) })));
    const entry = await signAntigenEntry(
      { nym: VICTIM, action: "kapae", version: 1, charterEpochCid: "epoch0-someone-elses" },
      signers,
    );
    expect(isKapaed(VICTIM, await foldAntigenSet([entry], roster, verifier))).toBe(false);
  });
});

describe("rosterFromCharterDoc — the PRE-ROTATED CHAIN roots the antigen on the verified HEAD (#68)", () => {
  /** A seated doc carrying a pre-rotated chain: genesis over `seedsA`, rotated to `seedsB` if supplied. */
  async function chainedDoc(seedsA: Uint8Array[], seedsB?: Uint8Array[]): Promise<NexusCharterDoc> {
    const keysA = await Promise.all(seedsA.map(pubOf));
    const nextCommit = seedsB ? charterKeySetHash(await Promise.all(seedsB.map(pubOf)), 2) : "";
    const g = genesisCharterEpoch(keysA, 2, nextCommit);
    let chain: CharterEpoch[] = [g];
    let keys = keysA;
    if (seedsB) {
      keys = await Promise.all(seedsB.map(pubOf));
      const r = rotateCharterEpoch(g, keys, 2, "");
      if (!r.ok) throw new Error(`rotate failed: ${r.reason}`);
      chain = [g, r.epoch];
    }
    const kahu = keys.map((vk, i) => ({ displayName: ["Guru Joshua Fontany", "Telarus, KSC", "The Lindwyrm"][i]!, verifyingKey: vk }));
    const head = chain[chain.length - 1]!;
    return { kind: NEXUS_CHARTER_DOC_KIND, threshold: 2, charterEpochCid: head.epochCid, charterChain: chain, kahu };
  }

  test("a chain-rooted genesis doc raises a live roster on the head epoch + verifies a real quorum entry", async () => {
    const doc = await chainedDoc([SEEDS.guru, SEEDS.telarus, SEEDS.lindwyrm]);
    const roster = rosterFromCharterDoc(doc);
    expect(roster.keys.length).toBe(3);
    expect(roster.charterEpochCid).toBe(charterChainHead(doc)!.epochCid);
    expect(foundingQuorumSeated(doc)).toBe(true);

    const signers = await Promise.all([SEEDS.guru, SEEDS.telarus].map(async (s) => ({ signer: await pubOf(s), sign: signerOf(s) })));
    const entry = await signAntigenEntry({ nym: VICTIM, action: "kapae", version: 1, charterEpochCid: roster.charterEpochCid }, signers);
    expect(isKapaed(VICTIM, await foldAntigenSet([entry], roster, verifier))).toBe(true);
  });

  test("after a valid rotate, the roster roots on epoch1's head (the seat→rotate round-trip)", async () => {
    const doc = await chainedDoc([SEEDS.guru, SEEDS.telarus], [SEEDS.lindwyrm, SEEDS.guru]);
    const head = charterChainHead(doc)!;
    expect(head.epoch).toBe(1);
    expect(rosterFromCharterDoc(doc).charterEpochCid).toBe(head.epochCid);
    expect(foundingQuorumSeated(doc)).toBe(true);
  });

  test("a BROKEN chain fails closed to the empty (inert) roster", async () => {
    const doc = await chainedDoc([SEEDS.guru, SEEDS.telarus]);
    const head = doc.charterChain![0]!;
    const tampered: NexusCharterDoc = { ...doc, charterChain: [mintCharterEpoch({ ...head, prevEpochCid: "forged" })] };
    expect(rosterFromCharterDoc(tampered).keys).toEqual([]);           // genesis with a non-null prev → broken lineage
    expect(foundingQuorumSeated(tampered)).toBe(false);
  });

  test("a chain HEAD unbound to the seated key-set fails closed (the seated keys don't hash to head.keySetHash)", async () => {
    const doc = await chainedDoc([SEEDS.guru, SEEDS.telarus]);
    // Swap one seated key for a stranger — the head's keySetHash no longer covers the seated set.
    const stranger = "f".repeat(64);
    const kahu = doc.kahu.map((k, i) => (i === 0 ? { ...k, verifyingKey: stranger } : k));
    const unbound: NexusCharterDoc = { ...doc, kahu };
    expect(rosterFromCharterDoc(unbound).keys).toEqual([]);
    expect(foundingQuorumSeated(unbound)).toBe(false);
  });
});

describe("genesisCharterEpochCid — deterministic on the seated key-set", () => {
  test("order-independent + stable across re-derivation", async () => {
    const a = await pubOf(SEEDS.guru), b = await pubOf(SEEDS.telarus);
    expect(genesisCharterEpochCid([a, b], 2)).toBe(genesisCharterEpochCid([b, a], 2));
    expect(genesisCharterEpochCid([a, b], 2)).toMatch(/^epoch0-[0-9a-f]{64}$/);
    // a different key-set or threshold yields a different epoch
    expect(genesisCharterEpochCid([a, b], 2)).not.toBe(genesisCharterEpochCid([a], 1));
  });
});
