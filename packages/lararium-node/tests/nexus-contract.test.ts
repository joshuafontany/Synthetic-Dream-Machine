/**
 * nexus-contract.test.ts — the CONTRACT side of the operator MEMBERS-registry, end-to-end through the node
 * command, and the members{} ∪ kahu-floor UNION the sharePolicy member gate reads.
 *
 * Proven, against a SYNTHETIC seated roster on a temp LAR_ROOT (real vessel identity, real founder persona-roots,
 * a real Automerge board on disk):
 *   · the full loop ADMIT → board → read → fold → holdsCarriage — a 2-of-3 signed + contract-in admit lands on the
 *     always-carried members board and folds the operator nym to MEMBER (the a-multitude-of-one self-contract),
 *   · a REVOKE at a higher version drops membership,
 *   · a SUB-QUORUM admit REFUSES (nothing written),
 *   · an UNSEATED charter REFUSES,
 *   · an admit for a nym the vessel does NOT hold, with NO --contract token, REFUSES (no conscription),
 *   · the members{} ∪ kahu-floor UNION: the makeNexusMembership holder reads BOTH a seated kahu AND an admitted
 *     non-kahu operator as MEMBER, off the SAME board the admit wrote (SELF-SLOT-B lit),
 *   · USER-NEVER-WRITTEN: the board carries operator-pubkey nyms only.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as ed from "@noble/ed25519";
import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import { hex, genesisCharterEpochCid, type NexusCharterDoc } from "@lararium/mesh";
import { generateOrLoadVesselIdentity, generateOrLoadPersonaGroupRoot, loadVesselVerifyingKey } from "../src/node-vessel-identity.js";
import { larDataDir } from "../src/vessel-paths.js";
import { writeNexusCharterDoc } from "../src/nexus-charter-doc.js";
import { runNexusContract, runNexusAcceptCarriage, runNexusMembersList, NexusContractError } from "../src/commands/nexus-contract.js";
import { makeNexusMembership } from "../src/nexus-carriage.js";

let root: string;
let priorLarRoot: string | undefined;
const bagsDir = (): string => join(root, "bags");

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "lares-admit-"));
  priorLarRoot = process.env["LAR_ROOT"];
  process.env["LAR_ROOT"] = root;
});
afterEach(async () => {
  if (priorLarRoot === undefined) delete process.env["LAR_ROOT"];
  else process.env["LAR_ROOT"] = priorLarRoot;
  // Drain, then delete: a storage-backed Repo arms an uncancelable asyncThrottle (saveDebounceRate) trailing
  // save on materialize; a rmSync ahead of that timer draws an ENOENT unhandled rejection that bleeds across
  // the run. Wait past the debounce (deadline ≤ arm+100ms < this 200ms) so the write lands on a live dir.
  await new Promise((r) => setTimeout(r, 200));
  rmSync(root, { recursive: true, force: true });
});

function seatCharter(keys: string[], threshold = 2): void {
  const doc: NexusCharterDoc = {
    kind: "lar-nexus-charter/v1", threshold,
    charterEpochCid: genesisCharterEpochCid(keys, threshold),
    kahu: [
      { displayName: "Guru Joshua Fontany", verifyingKey: keys[0] ?? null },
      { displayName: "Telarus, KSC",        verifyingKey: keys[1] ?? null },
      { displayName: "The Lindwyrm",        verifyingKey: keys[2] ?? null },
    ],
  };
  writeNexusCharterDoc(bagsDir(), doc);
}

describe("nexus admit — the RAISE side end-to-end (Build-2)", () => {
  it("ADMIT (self-contract) → board → fold → holdsCarriage: a 2-of-3 held-root admit contracts the operator", async () => {
    await generateOrLoadVesselIdentity(larDataDir());
    // The vessel holds 4 persona-roots: 0-2 are the founding kahu; 3 is the joining operator it self-contracts.
    const roots = await Promise.all([0, 1, 2, 3].map((i) => generateOrLoadPersonaGroupRoot(larDataDir(), i)));
    seatCharter(roots.slice(0, 3).map((r) => r.verifyingKey));
    const joinerNym = roots[3]!.verifyingKey.toLowerCase();

    const res = await runNexusContract({ action: "admit", nym: joinerNym, bagsDir: bagsDir() });
    expect(res.version).toBe(1);
    expect(res.signers).toHaveLength(2);       // exactly the 2-of-3 quorum
    expect(res.contractIn).toBe("self");       // multitude-of-one: the vessel held the joiner's seed
    expect(res.memberNow).toBe(true);

    const list = await runNexusMembersList({ bagsDir: bagsDir() });
    expect(list.members).toContain(joinerNym);
    expect(list.entries).toHaveLength(1);
    expect(list.entries[0]).toMatchObject({ nym: joinerNym, action: "admit", version: 1, signers: 2, contractIn: true });
  });

  it("accept-carriage → admit --contract: a joiner's out-of-band token admits it", async () => {
    await generateOrLoadVesselIdentity(larDataDir());
    const roots = await Promise.all([0, 1, 2, 3].map((i) => generateOrLoadPersonaGroupRoot(larDataDir(), i)));
    seatCharter(roots.slice(0, 3).map((r) => r.verifyingKey));

    // The joiner mints its 'accepts carriage' token (index 3 on this same vessel stands in for the joiner's vessel).
    const token = await runNexusAcceptCarriage({ handleIndex: 3, bagsDir: bagsDir() });
    const res = await runNexusContract({ action: "admit", nym: token.nym, contractSig: token.contractSig, bagsDir: bagsDir() });
    expect(res.contractIn).toBe("supplied");
    expect(res.memberNow).toBe(true);
  });

  it("REVOKE at a higher version drops membership", async () => {
    await generateOrLoadVesselIdentity(larDataDir());
    const roots = await Promise.all([0, 1, 2, 3].map((i) => generateOrLoadPersonaGroupRoot(larDataDir(), i)));
    seatCharter(roots.slice(0, 3).map((r) => r.verifyingKey));
    const joinerNym = roots[3]!.verifyingKey.toLowerCase();

    await runNexusContract({ action: "admit", nym: joinerNym, bagsDir: bagsDir() });
    const rev = await runNexusContract({ action: "revoke", nym: joinerNym, bagsDir: bagsDir() });
    expect(rev.version).toBe(2);
    expect(rev.memberNow).toBe(false);

    const list = await runNexusMembersList({ bagsDir: bagsDir() });
    expect(list.members).not.toContain(joinerNym);
  });

  it("SUB-QUORUM admit REFUSES (one held root against a 2-of-3 roster) — nothing written", async () => {
    await generateOrLoadVesselIdentity(larDataDir());
    const held = await generateOrLoadPersonaGroupRoot(larDataDir(), 0);
    const s1 = hex(await ed.getPublicKeyAsync(new Uint8Array(32).fill(7)));
    const s2 = hex(await ed.getPublicKeyAsync(new Uint8Array(32).fill(8)));
    seatCharter([held.verifyingKey, s1, s2]);
    const joiner = hex(await ed.getPublicKeyAsync(new Uint8Array(32).fill(9)));

    await expect(runNexusContract({ action: "admit", nym: joiner, contractSig: "00".repeat(64), bagsDir: bagsDir() }))
      .rejects.toBeInstanceOf(NexusContractError);
    const list = await runNexusMembersList({ bagsDir: bagsDir() });
    expect(list.entries).toHaveLength(0);
  });

  it("UNSEATED charter REFUSES", async () => {
    await generateOrLoadVesselIdentity(larDataDir());
    await generateOrLoadPersonaGroupRoot(larDataDir(), 0);
    await expect(runNexusContract({ action: "admit", nym: "ab".repeat(32), contractSig: "00".repeat(64), bagsDir: bagsDir() }))
      .rejects.toBeInstanceOf(NexusContractError);
  });

  it("admit for a NON-HELD nym with NO --contract REFUSES (no conscription — WAX-SEALS-ONLY)", async () => {
    await generateOrLoadVesselIdentity(larDataDir());
    const roots = await Promise.all([0, 1, 2].map((i) => generateOrLoadPersonaGroupRoot(larDataDir(), i)));
    seatCharter(roots.map((r) => r.verifyingKey));
    const foreign = hex(await ed.getPublicKeyAsync(new Uint8Array(32).fill(42)));   // not a held persona
    await expect(runNexusContract({ action: "admit", nym: foreign, bagsDir: bagsDir() }))
      .rejects.toBeInstanceOf(NexusContractError);   // no contract-in obtainable → refuse
  });
});

describe("the members{} ∪ kahu-floor UNION — the sharePolicy member gate (SELF-SLOT-B lit)", () => {
  it("the holder reads a seated kahu AND an admitted non-kahu operator as MEMBER (no-global-now: off the local replica)", async () => {
    await generateOrLoadVesselIdentity(larDataDir());
    const roots = await Promise.all([0, 1, 2, 3].map((i) => generateOrLoadPersonaGroupRoot(larDataDir(), i)));
    seatCharter(roots.slice(0, 3).map((r) => r.verifyingKey));
    const kahuNym   = roots[0]!.verifyingKey.toLowerCase();
    const joinerNym = roots[3]!.verifyingKey.toLowerCase();

    // Contract-in + admit the non-kahu operator onto the board.
    await runNexusContract({ action: "admit", nym: joinerNym, bagsDir: bagsDir() });

    // Stand the membership holder over the SAME store (its own replica, as-of-last-sync) + the SAME board.
    const nexusPubkey = await loadVesselVerifyingKey(larDataDir());
    const repo = new Repo({ storage: new NodeFSStorageAdapter(larDataDir()) });
    const peerMap = new Map<string, string>([
      ["peer-kahu",   `prefix:${kahuNym}`],     // a seated kahu → MEMBER (the floor)
      ["peer-joiner", `prefix:${joinerNym}`],   // an admitted non-kahu operator → MEMBER (members{}) — SELF-SLOT-B
      ["peer-foreign", `prefix:${"ab".repeat(32)}`],  // never admitted → STRANGER
    ]);
    const holder = makeNexusMembership({ bagsDir: bagsDir(), peerIdentifierMap: peerMap, repo, nexusPubkey });
    await holder.refold();   // fold the members board atop the kahu floor

    expect(holder.membership.holdsCarriagePeer("peer-kahu")).toBe(true);      // kahu floor
    expect(holder.membership.holdsCarriagePeer("peer-joiner")).toBe(true);    // members{} — the light that flips SELF-SLOT-B
    expect(holder.membership.holdsCarriagePeer("peer-foreign")).toBe(false);  // fail-closed stranger
    holder.dispose();
  });

  it("no-global-now — an EMPTY local replica (unsynced board, unseated charter) reads NOBODY member (fail-closed-stale)", async () => {
    await generateOrLoadVesselIdentity(larDataDir());
    const roots = await Promise.all([0, 1].map((i) => generateOrLoadPersonaGroupRoot(larDataDir(), i)));
    // No seatCharter, no admit — the local replica is blank (as-of-a-sync-that-never-happened).
    const nexusPubkey = await loadVesselVerifyingKey(larDataDir());
    const repo = new Repo({ storage: new NodeFSStorageAdapter(larDataDir()) });
    const peerMap = new Map<string, string>([["peer-kahu", `prefix:${roots[0]!.verifyingKey.toLowerCase()}`]]);
    const holder = makeNexusMembership({ bagsDir: bagsDir(), peerIdentifierMap: peerMap, repo, nexusPubkey });
    await holder.refold();
    expect(holder.membership.holdsCarriagePeer("peer-kahu")).toBe(false);   // no charter, no board → nobody member
    holder.dispose();
  });
});
