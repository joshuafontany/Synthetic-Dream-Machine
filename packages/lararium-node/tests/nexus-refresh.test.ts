/**
 * nexus-refresh.test.ts — the LIVE-refold shore (D2 posture-flip + E2 out-of-process board write).
 *
 * Proven:
 *   · POSTURE — an out-of-process `nexus posture open` disk write, then a refresh, reassigns the live posture
 *     (the setter fires with "open"); a torn/absent charter reads PRIVATE (fail-closed).
 *   · BOARD — a real 2-of-3 ban written through a SEPARATE repo on the same storage dir (the CLI's own repo)
 *     does NOT reach a holder standing on a cold board; a refresh re-materializes the board off storage and
 *     re-folds → the victim stands Kapae'd → carryContractShareDecision draws Mu for its peer.
 *   · the running holder's cached (empty) board proves the gap: WITHOUT the refresh the victim is not Kapae'd.
 */
import { afterEach, beforeEach, describe, test, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as ed from "@noble/ed25519";
import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import {
  hex, signAntigenEntry, kapaeAntigenDocUrl, materializeSharedLarDoc, mutableLarRecord,
  genesisSealEpochCid, carryContractShareDecision,
  type KapaeAntigenEntry, type NexusDoc, type FederationPosture,
} from "@lararium/mesh";
import { makeAntigenRingHolder } from "../src/antigen-ring.js";
import { makeNexusMembership } from "../src/nexus-carriage.js";
import { writeNexusDoc } from "../src/nexus-doc.js";
import { runNexusRefresh } from "../src/nexus-refresh.js";

/**
 * Let any storage-backed Repo's armed trailing save land before the temp dir goes. Automerge's
 * StorageSource arms an asyncThrottle (saveDebounceRate, default 100ms) on every materialized doc;
 * neither repo.flush() nor repo.shutdown() cancels that armed timer. A refresh mints + disposes a
 * throwaway storage repo internally, so the test cannot reach that timer — it waits past the debounce
 * window (the timer's deadline ≤ arm+100ms strictly precedes this 200ms deadline, so the timer heap
 * fires it first even under worker starvation) so the trailing write lands on a LIVE dir. Drain, then delete.
 */
const drainStorageThrottle = (): Promise<void> => new Promise((r) => setTimeout(r, 200));

const SEEDS = [new Uint8Array(32).fill(1), new Uint8Array(32).fill(2), new Uint8Array(32).fill(3)];
const VICTIM_SEED = new Uint8Array(32).fill(9);
const signerOf = (seed: Uint8Array) => (bytes: Uint8Array) => ed.signAsync(bytes, seed).then(hex);
const pubOf    = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);
const NEXUS_PUBKEY = "a1b2c3d4e5f6a7b8";

function seatedCharter(keys: string[], posture?: FederationPosture): NexusDoc {
  const base: NexusDoc = {
    kind: "lar-nexus-doc/v1", threshold: 2,
    sealEpochCid: genesisSealEpochCid(keys, 2),
    kahu: [
      { displayName: "Guru Joshua Fontany", verifyingKey: keys[0]! },
      { displayName: "Telarus, KSC",        verifyingKey: keys[1]! },
      { displayName: "The Lindwyrm",        verifyingKey: keys[2]! },
    ],
  };
  return posture ? { ...base, federationPosture: posture } : base;
}

async function banEntry(nym: string, epoch: string): Promise<KapaeAntigenEntry> {
  const signers = await Promise.all([SEEDS[0]!, SEEDS[1]!].map(async (s) => ({ signer: await pubOf(s), sign: signerOf(s) })));
  return signAntigenEntry({ nym, action: "kapae", version: 1, sealEpochCid: epoch }, signers);
}

/** Stand the two live holders on a repo carrying NO storage — a cold in-memory board (the "just booted" state). */
function standHolders(bags: string) {
  const repo = new Repo({});
  const peerMap = new Map<string, string>();
  const antigen = makeAntigenRingHolder({ repo, nexusPubkey: NEXUS_PUBKEY, sealHome: bags, peerIdentifierMap: peerMap });
  const membership = makeNexusMembership({ sealHome: bags, peerIdentifierMap: peerMap, repo, nexusPubkey: NEXUS_PUBKEY });
  return { antigen, membership, peerMap, dispose: () => { antigen.dispose(); membership.dispose(); } };
}

describe("nexus-refresh — POSTURE re-read (D2)", () => {
  let bags: string;
  let storage: string;
  beforeEach(() => { bags = mkdtempSync(join(tmpdir(), "lares-refresh-bags-")); storage = mkdtempSync(join(tmpdir(), "lares-refresh-store-")); });
  afterEach(async () => { await drainStorageThrottle(); rmSync(bags, { recursive: true, force: true }); rmSync(storage, { recursive: true, force: true }); });

  test("an out-of-process posture flip to OPEN is picked up by a refresh (the setter fires with open)", async () => {
    const keys = await Promise.all(SEEDS.map(pubOf));
    const holders = standHolders(bags);
    let live: FederationPosture = "private";   // the live sharePolicy default, as the node boots it
    try {
      // The operator's `lares nexus posture open` rewrites the disk charter beside the running node.
      writeNexusDoc(bags, seatedCharter(keys, "open"));
      const r = await runNexusRefresh({
        storageDir: storage, sealHome: bags, nexusPubkey: NEXUS_PUBKEY,
        antigen: holders.antigen, membership: holders.membership, setPosture: (p) => { live = p; },
      });
      expect(r.posture).toBe("open");
      expect(live).toBe("open");   // the sharePolicy's live posture reassigned — no bounce
    } finally { holders.dispose(); }
  });

  test("FAIL CLOSED — an absent charter reads PRIVATE (a broken read only ever tightens)", async () => {
    const holders = standHolders(bags);
    let live: FederationPosture = "open";
    try {
      const r = await runNexusRefresh({
        storageDir: storage, sealHome: bags, nexusPubkey: NEXUS_PUBKEY,
        antigen: holders.antigen, membership: holders.membership, setPosture: (p) => { live = p; },
      });
      expect(r.posture).toBe("private");
      expect(live).toBe("private");
    } finally { holders.dispose(); }
  });
});

describe("nexus-refresh — out-of-process BOARD write (E2)", () => {
  let bags: string;
  let storage: string;
  beforeEach(() => { bags = mkdtempSync(join(tmpdir(), "lares-refresh-bags-")); storage = mkdtempSync(join(tmpdir(), "lares-refresh-store-")); });
  afterEach(async () => { await drainStorageThrottle(); rmSync(bags, { recursive: true, force: true }); rmSync(storage, { recursive: true, force: true }); });

  test("a ban written through a SEPARATE repo → cold holder misses it → refresh re-folds → Mu", async () => {
    const keys    = await Promise.all(SEEDS.map(pubOf));
    const victim  = await pubOf(VICTIM_SEED);
    const charter = seatedCharter(keys);
    writeNexusDoc(bags, charter);

    const holders = standHolders(bags);
    holders.peerMap.set("peer-victim", `prefix:${victim}`);
    try {
      // The running holder stood on a COLD board — the victim is NOT yet Kapae'd (the gap E2 names).
      await holders.antigen.refold();
      expect(holders.antigen.ring.kapaed.has(victim)).toBe(false);

      // The CLI writes the ban through its OWN repo on the SAME storage dir, then flushes (out-of-process shape).
      const writer = new Repo({ storage: new NodeFSStorageAdapter(storage) });
      const board  = await materializeSharedLarDoc(writer, kapaeAntigenDocUrl(NEXUS_PUBKEY), "@kapae-antigen");
      const ban    = await banEntry(victim, charter.sealEpochCid!);
      board.change((d) => { d.tiddlers["ban:victim"] = mutableLarRecord("ban:victim", { text: JSON.stringify(ban) }, "test"); });
      await writer.flush();
      await writer.shutdown();   // dispose the CLI's throwaway writer whole — the ban bytes stay on disk, no repo lingers

      // The cold holder STILL misses it (its cached in-memory board never saw the out-of-process write).
      await holders.antigen.refold();
      expect(holders.antigen.ring.kapaed.has(victim)).toBe(false);

      // The refresh re-materializes the board off storage and re-folds → the victim now stands Kapae'd.
      const r = await runNexusRefresh({
        storageDir: storage, sealHome: bags, nexusPubkey: NEXUS_PUBKEY,
        antigen: holders.antigen, membership: holders.membership, setPosture: () => {},
      });
      expect(r.antigenEntries).toBe(1);
      expect(holders.antigen.ring.kapaed.has(victim)).toBe(true);

      // The presenter now draws Mu (the same `false` a caught-up peer draws) at the share decision.
      const noRelay = new Set<string>();
      expect(await carryContractShareDecision(noRelay, null, holders.antigen.ring, null, "peer-victim", undefined)).toBe(false);
    } finally { holders.dispose(); }
  });
});
