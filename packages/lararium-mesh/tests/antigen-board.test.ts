/**
 * antigen-board.test.ts — the DOC face of the antigen: extract entries off the board `LarDoc`, then the
 * full pure path board → fold → carry-contract → Mu.
 *
 * Proven:
 *   · a well-formed antigen tiddler extracts; a foreign / torn / non-JSON tiddler is SKIPPED,
 *   · an absent / empty board surfaces NO entries (fail-closed → no bans),
 *   · the extractor is permissive but the FOLD adjudicates: an unverified entry that extracts still dies
 *     at the quorum verifier (never trusted),
 *   · the LIVE deny path: a real 2-of-3 signed ban in the board → the victim nym stands Kapae'd → a
 *     presenter resolving to that nym draws `false` from carryContractShareDecision (the Mu),
 *   · the Mu is BYTE-INDISTINGUISHABLE: kapae-denied and sync-complete draw the identical void.
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import { hex } from "../src/crypto.js";
import { antigenEntriesFromBoard } from "../src/antigen-board.js";
import {
  signAntigenEntry, foldAntigenSet, makeMultiSigQuorumVerifier,
  KAPAE_ANTIGEN_DOMAIN, type KapaeAntigenEntry, type KahuCharterRoster,
} from "../src/kapae-antigen.js";
import { carryContractShareDecision, type AntigenRing } from "../src/federation-gate.js";
import { muVoidBytes, syncCompleteVoid, kapaeDeniedVoid } from "../src/mu-void.js";
import { mutableLarRecord, type LarDoc } from "../src/base-doc.js";

const EPOCH = "epoch-cid-genesis";
const SEEDS = {
  guru:     new Uint8Array(32).fill(1),
  telarus:  new Uint8Array(32).fill(2),
  lindwyrm: new Uint8Array(32).fill(3),
};
const signerOf = (seed: Uint8Array) => (bytes: Uint8Array) => ed.signAsync(bytes, seed).then(hex);
const pubOf    = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);
const verifier = makeMultiSigQuorumVerifier();

async function roster(): Promise<KahuCharterRoster> {
  const keys = await Promise.all([pubOf(SEEDS.guru), pubOf(SEEDS.telarus), pubOf(SEEDS.lindwyrm)]);
  return { keys, threshold: 2, charterEpochCid: EPOCH };
}

async function banEntry(nym: string, seeds = [SEEDS.guru, SEEDS.telarus]): Promise<KapaeAntigenEntry> {
  const signers = await Promise.all(seeds.map(async (s) => ({ signer: await pubOf(s), sign: signerOf(s) })));
  return signAntigenEntry({ nym, action: "kapae", version: 1, charterEpochCid: EPOCH }, signers);
}

/** A board LarDoc carrying the given tiddler texts (each a would-be antigen entry). */
function boardWith(texts: Record<string, string>): LarDoc {
  const tiddlers: LarDoc["tiddlers"] = {};
  for (const [title, text] of Object.entries(texts)) tiddlers[title] = mutableLarRecord(title, { text }, "test");
  return { schemaVersion: "0.1", tiddlers };
}

describe("antigenEntriesFromBoard — extract, skip the torn/foreign", () => {
  test("an absent / empty board surfaces no entries (fail closed)", () => {
    expect(antigenEntriesFromBoard(undefined)).toEqual([]);
    expect(antigenEntriesFromBoard(null)).toEqual([]);
    expect(antigenEntriesFromBoard({ schemaVersion: "0.1", tiddlers: {} })).toEqual([]);
  });

  test("a well-formed antigen tiddler extracts; foreign + torn + non-JSON are skipped", async () => {
    const entry = await banEntry("cafebabe".repeat(8));
    const doc = boardWith({
      "ban:victim":   JSON.stringify(entry),
      "not-json":     "just prose, not an entry",
      "wrong-kind":   JSON.stringify({ kind: "something-else", nym: "x" }),
      "torn-missing": JSON.stringify({ kind: KAPAE_ANTIGEN_DOMAIN, nym: "y" }),  // no action/version/epoch/sigs
      "readme":       "# the antigen board\nhuman notes",
    });
    const got = antigenEntriesFromBoard(doc);
    expect(got).toHaveLength(1);
    expect(got[0]!.nym).toBe("cafebabe".repeat(8));
    expect(got[0]!.kind).toBe(KAPAE_ANTIGEN_DOMAIN);
  });

  test("extraction is permissive but the FOLD adjudicates — an under-signed entry extracts yet never Kapae's", async () => {
    const under = await banEntry("deadbeef".repeat(8), [SEEDS.guru]);   // ONE signer — below the 2-of-3 quorum
    const doc = boardWith({ "ban:under": JSON.stringify(under) });
    expect(antigenEntriesFromBoard(doc)).toHaveLength(1);              // it extracts...
    const set = await foldAntigenSet(antigenEntriesFromBoard(doc), await roster(), verifier);
    expect(set.has("deadbeef".repeat(8))).toBe(false);                // ...but the quorum verifier ignores it
  });
});

describe("the LIVE pure path — board → fold → carry-contract → Mu", () => {
  const VICTIM = "cafebabe".repeat(8);
  const CLEAN  = "0".repeat(64);

  test("a real 2-of-3 ban in the board → the victim Kapae's → a presenter on that nym draws `false` (Mu)", async () => {
    const doc = boardWith({ "ban:victim": JSON.stringify(await banEntry(VICTIM)) });
    const kapaed = await foldAntigenSet(antigenEntriesFromBoard(doc), await roster(), verifier);
    expect(kapaed.has(VICTIM)).toBe(true);

    const ring: AntigenRing = {
      kapaed,
      presenterNym: (peerId) => (peerId === "peer-victim" ? VICTIM : peerId === "peer-clean" ? CLEAN : null),
    };
    const noRelay = new Set<string>();
    // The node seam's exact call: no relay ring, no fed gate, self-slot inert (identity null).
    expect(await carryContractShareDecision(noRelay, null, ring, null, "peer-victim", undefined)).toBe(false); // Mu
    expect(await carryContractShareDecision(noRelay, null, ring, null, "peer-clean",  undefined)).toBe(true);  // admitted
    expect(await carryContractShareDecision(noRelay, null, ring, null, "peer-unknown", undefined)).toBe(true); // unresolved → not denied
  });

  test("the Mu is byte-indistinguishable — kapae-denied === sync-complete === the frozen void", () => {
    expect(muVoidBytes()).toEqual(muVoidBytes());
    expect(kapaeDeniedVoid()).toEqual(syncCompleteVoid());   // the deny and the caught-up draw the SAME void
  });
});
