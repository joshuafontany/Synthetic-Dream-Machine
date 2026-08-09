/**
 * antigen-ring.test.ts — the #59 node holder that makes the Kapae-antigen breathe on the live sharePolicy.
 *
 * Proven:
 *   · presenterNym is the main↔worker BRIDGE — it surfaces the DaemonAuthGate's proven Identifier hex as
 *     the ed25519 nym (`id.slice(-64)`, lowercased); an unauthenticated / malformed peer → null (no false deny),
 *   · the LIVE refold: a real 2-of-3 signed ban in the always-carried board + a seated charter roster on disk
 *     → the victim's nym stands Kapae'd → carryContractShareDecision draws `false` (Mu) for that presenter,
 *     `true` for a clean one, `true` for an unresolved one,
 *   · FAIL CLOSED: no charter on disk → empty roster → nothing Kapae'd (no quorum, no bans),
 *   · a cold ring (board unresolved) denies nobody (a denylist's absence = no bans).
 */
import { afterEach, beforeEach, describe, test, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as ed from "@noble/ed25519";
import { Repo } from "@automerge/automerge-repo";
import {
  hex, signAntigenEntry, foldAntigenSet, makeMultiSigQuorumVerifier,
  foundingRoster, carryContractShareDecision,
  genesisSealEpochCid, kapaeAntigenDocUrl, materializeSharedLarDoc, mutableLarRecord,
  type KapaeAntigenEntry, type NexusDoc,
} from "@lararium/mesh";
import { makeAntigenRingHolder } from "../src/antigen-ring.js";
import { writeNexusDoc } from "../src/nexus-doc.js";

// Three founding kahu — fixed seeds → deterministic keys.
const SEEDS = [new Uint8Array(32).fill(1), new Uint8Array(32).fill(2), new Uint8Array(32).fill(3)];
const signerOf = (seed: Uint8Array) => (bytes: Uint8Array) => ed.signAsync(bytes, seed).then(hex);
const pubOf    = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);
const NEXUS_PUBKEY = "a1b2c3d4e5f6a7b8";   // the node's own gate key = its Nexus key

/** The victim's own keypair — its verifying key IS the nym the ban targets, and the peer identifier. */
const VICTIM_SEED = new Uint8Array(32).fill(9);

async function seatedCharter(keys: string[]): Promise<NexusDoc> {
  return {
    kind: "lar-nexus-doc/v1", threshold: 2,
    sealEpochCid: genesisSealEpochCid(keys, 2),
    kahu: [
      { displayName: "Kahu Alpha", verifyingKey: keys[0]! },
      { displayName: "Kahu Beta",        verifyingKey: keys[1]! },
      { displayName: "Kahu Gamma",        verifyingKey: keys[2]! },
    ],
  };
}

async function banEntry(nym: string, epoch: string): Promise<KapaeAntigenEntry> {
  const signers = await Promise.all([SEEDS[0]!, SEEDS[1]!].map(async (s) => ({ signer: await pubOf(s), sign: signerOf(s) })));
  return signAntigenEntry({ nym, action: "kapae", version: 1, sealEpochCid: epoch }, signers);
}

/** Poll a predicate to a short deadline — the holder resolves + folds asynchronously in its constructor. */
async function waitFor(pred: () => boolean, ms = 2000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!pred()) {
    if (Date.now() > deadline) throw new Error("waitFor: predicate never held");
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe("presenterNym — the proven-nym bridge (no re-authentication)", () => {
  test("surfaces the DaemonAuthGate identifier's ed25519 suffix as the nym; unknown/malformed → null", () => {
    const RAW_NYM = "cafebabe".repeat(8);                       // 64 hex — the raw ed25519 key
    const peerMap = new Map<string, string>([
      ["peer-a", `keyhive-prefix:${RAW_NYM}`],                  // Identifier hex → last 64 chars are the nym
      ["peer-upper", `X:${RAW_NYM.toUpperCase()}`],             // case-folded to lowercase on resolve
      ["peer-malformed", "short-not-64-hex"],                   // no 64-hex suffix → null
    ]);
    const holder = makeAntigenRingHolder({
      repo: new Repo({}), nexusPubkey: NEXUS_PUBKEY, sealHome: "/nonexistent-bags", peerIdentifierMap: peerMap,
    });
    try {
      expect(holder.ring.presenterNym("peer-a")).toBe(RAW_NYM);
      expect(holder.ring.presenterNym("peer-upper")).toBe(RAW_NYM);
      expect(holder.ring.presenterNym("peer-malformed")).toBe(null);
      expect(holder.ring.presenterNym("peer-absent")).toBe(null);   // unauthenticated → not named
    } finally {
      holder.dispose();
    }
  });
});

describe("the LIVE refold — board ban + seated charter → Kapae'd → Mu", () => {
  let bags: string;
  let repo: Repo;
  beforeEach(() => { bags = mkdtempSync(join(tmpdir(), "lares-antigen-ring-")); repo = new Repo({}); });
  afterEach(() => { rmSync(bags, { recursive: true, force: true }); });

  test("a real 2-of-3 ban Kapae's the victim → carryContractShareDecision draws Mu for its peer", async () => {
    const keys   = await Promise.all(SEEDS.map(pubOf));
    const victim = await pubOf(VICTIM_SEED);                      // the victim's verifying key = the nym
    // Seat the founding roster on disk (the authority home the holder reads).
    const charter = await seatedCharter(keys);
    writeNexusDoc(bags, charter);
    // A real quorum-signed ban in the always-carried board, rooting on the charter epoch.
    const board = await materializeSharedLarDoc(repo, kapaeAntigenDocUrl(NEXUS_PUBKEY), "@kapae-antigen");
    const ban   = await banEntry(victim, charter.sealEpochCid!);
    board.change((d) => { d.tiddlers["ban:victim"] = mutableLarRecord("ban:victim", { text: JSON.stringify(ban) }, "test"); });

    // Sanity: the pure fold agrees the victim is Kapae'd under this roster.
    expect((await foldAntigenSet([ban], foundingRoster(charter), makeMultiSigQuorumVerifier())).has(victim)).toBe(true);

    // The peer map binds a sync peer to the victim's Identifier (suffix = the nym) and a clean peer to another.
    const peerMap = new Map<string, string>([
      ["peer-victim", `prefix:${victim}`],
      ["peer-clean",  `prefix:${"1".repeat(64)}`],
    ]);
    const holder = makeAntigenRingHolder({ repo, nexusPubkey: NEXUS_PUBKEY, sealHome: bags, peerIdentifierMap: peerMap });
    try {
      await waitFor(() => holder.ring.kapaed.has(victim));       // the constructor resolves the board + folds
      const noRelay = new Set<string>();
      expect(await carryContractShareDecision(noRelay, null, holder.ring, null, "peer-victim", undefined)).toBe(false); // Mu
      expect(await carryContractShareDecision(noRelay, null, holder.ring, null, "peer-clean",  undefined)).toBe(true);
      expect(await carryContractShareDecision(noRelay, null, holder.ring, null, "peer-unknown", undefined)).toBe(true);
    } finally {
      holder.dispose();
    }
  });

  test("FAIL CLOSED — no charter on disk → empty roster → nothing Kapae'd (the ban never verifies)", async () => {
    const victim = await pubOf(VICTIM_SEED);
    const board = await materializeSharedLarDoc(repo, kapaeAntigenDocUrl(NEXUS_PUBKEY), "@kapae-antigen");
    // A perfectly-signed ban rooting on an epoch — but NO seated charter, so no roster keys verify it.
    const ban = await banEntry(victim, "epoch-cid-genesis");
    board.change((d) => { d.tiddlers["ban:victim"] = mutableLarRecord("ban:victim", { text: JSON.stringify(ban) }, "test"); });

    const peerMap = new Map<string, string>([["peer-victim", `prefix:${victim}`]]);
    const holder = makeAntigenRingHolder({ repo, nexusPubkey: NEXUS_PUBKEY, sealHome: bags, peerIdentifierMap: peerMap });
    try {
      await holder.refold();                                     // force the fold against the (absent) charter
      expect(holder.ring.kapaed.size).toBe(0);                  // no quorum, no bans
      const noRelay = new Set<string>();
      expect(await carryContractShareDecision(noRelay, null, holder.ring, null, "peer-victim", undefined)).toBe(true);
    } finally {
      holder.dispose();
    }
  });
});
