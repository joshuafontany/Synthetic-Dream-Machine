/**
 * nexus-bilateral-genesis.test.ts — LIVE-WIRE B4: the bilateral cross-operator CONTRACT (headless proof).
 *
 * TWO INDEPENDENTLY-FOUNDED sovereign hearths stand on one machine — Josh's Enyalios and Freyja's machine, two
 * DISTINCT operators, each rooting its OWN vessel identity, its OWN founding-kahu roster, and its OWN seated
 * genesis charter epoch. Isolation rides the `LAR_ROOT` lever: the persona vault + vessel substrate + charter
 * home all resolve under it, so toggling it between the two roots stands two operators that share no key
 * material, no board, no identity home (`asRoot`).
 *
 * The bilateral flow, each direction mirroring the other (this is what makes it BILATERAL, never one-way):
 *   1. the JOINING operator signs "I accept carriage" bound to the OTHER hearth's charter epoch
 *      (`runNexusAcceptCarriage`) — consent the peer can never manufacture (only the joiner holds the seed),
 *   2. the OTHER hearth's kahu quorum WRITES that operator's nym onto ITS OWN members registry
 *      (`runNexusContract`, quorum ∪ the supplied contract-in, self-verified to COUNT before the board write).
 *
 * Proven end-to-end, off the real verbs on real Automerge boards:
 *   · hearth A's `nexus-membership` fold names B a MEMBER, AND hearth B's fold names A a MEMBER — BOTH sides
 *     fold the OTHER operator in, each off its own local replica (no-global-now), a stranger reads STRANGER,
 *   · NO CONSCRIPTION: `runNexusContract` REFUSES an admit for an operator that has not signed consent (no token,
 *     seed not held) — the members-registry is not the antigen; a Nexus never conscripts an operator,
 *   · REVERT-VERIFY the no-conscription bite: a quorum-signed admit that LACKS the contract-in (the entry the
 *     command refuses to mint) folds to a NON-member under the real guard, but a fold with the contract-in
 *     check DROPPED conscripts the operator to MEMBER — the guard alone stands between quorum and conscription.
 *
 * HONEST BOUND (what only two real machines prove): the out-of-process refold race. A CLI `nexus admit` on a
 * live peer reaches a running holder only at `nexus-refresh` (NodeFS carries no cross-process change bus), so a
 * running peer reads the new member at BOUNDED STALENESS, never instantly. This headless proof folds each
 * hearth's board directly off its own store, so it proves the CONTRACT, not the wire's refold latency.
 */
import { NEXUS_DOC_DOMAIN } from "@lararium/mesh";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as ed from "@noble/ed25519";
import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import {
  hex, genesisSealEpochCid, foundingRoster, foldCarriageSet, holdsCarriage,
  carriageEntryBytes, signCarriageQuorum, ed25519SignerFromSeed,
  type NexusDoc, type KahuRoster, type CarriageEntry,
} from "@lararium/mesh";
import {
  generateOrLoadVesselIdentity, generateOrLoadPersonaGroupRoot,
  loadPersonaGroupRootSeed, loadVesselVerifyingKey,
} from "../src/node-vessel-identity.js";
import { larDataDir } from "../src/vessel-paths.js";
import { writeNexusDoc, readNexusDoc } from "../src/nexus-doc.js";
import { runNexusContract, runNexusAcceptCarriage, runNexusMembersList, NexusContractError } from "../src/commands/nexus-contract.js";
import { makeNexusMembership } from "../src/nexus-carriage.js";

let rootA: string;
let rootB: string;
let priorLarRoot: string | undefined;

beforeEach(() => {
  rootA = mkdtempSync(join(tmpdir(), "lares-hearth-A-"));
  rootB = mkdtempSync(join(tmpdir(), "lares-hearth-B-"));
  priorLarRoot = process.env["LAR_ROOT"];
});
afterEach(async () => {
  if (priorLarRoot === undefined) delete process.env["LAR_ROOT"];
  else process.env["LAR_ROOT"] = priorLarRoot;
  // Drain, then delete: a storage-backed Repo arms an uncancelable asyncThrottle (saveDebounceRate) trailing
  // save on materialize; a rmSync ahead of that timer draws an ENOENT unhandled rejection that bleeds across
  // the run. Wait past the debounce (deadline ≤ arm+100ms < this 200ms) so the write lands on a live dir.
  await new Promise((r) => setTimeout(r, 200));
  rmSync(rootA, { recursive: true, force: true });
  rmSync(rootB, { recursive: true, force: true });
});

/** Run `fn` with LAR_ROOT pointed at one hearth's home — the persona vault, vessel substrate, and charter
 *  home all resolve under it, so the awaited body operates entirely as that one sovereign operator. */
async function asRoot<T>(root: string, fn: () => Promise<T>): Promise<T> {
  const prev = process.env["LAR_ROOT"];
  process.env["LAR_ROOT"] = root;
  try { return await fn(); }
  finally { if (prev === undefined) delete process.env["LAR_ROOT"]; else process.env["LAR_ROOT"] = prev; }
}

interface Hearth {
  readonly root:        string;
  readonly bags:        string;
  readonly nexusPubkey: string;   // the members board's address seed (this hearth's own gate key)
  readonly operatorNym: string;   // this operator's nym — persona h0, the founder who also carries the operator seat
  readonly epoch:       string;   // the seated genesis charter epoch
}

/** Stand ONE sovereign hearth: mint a vessel identity + 3 founding-kahu persona-roots and SEAT a genesis
 *  charter epoch over them. Persona h0 doubles as the operator nym the PEER hearth will admit. */
async function standHearth(root: string, threshold = 2): Promise<Hearth> {
  return asRoot(root, async () => {
    const dir = larDataDir();
    await generateOrLoadVesselIdentity(dir);
    const roots = await Promise.all([0, 1, 2].map((i) => generateOrLoadPersonaGroupRoot(dir, i)));
    const nexusPubkey = await loadVesselVerifyingKey(dir);
    const keys = roots.map((r) => r.verifyingKey);
    const bags = join(root, "state", "nexus");
    const doc: NexusDoc = {
      kind: NEXUS_DOC_DOMAIN, threshold,
      sealEpochCid: genesisSealEpochCid(keys, threshold),
      kahu: [
        { displayName: "Founder-0", verifyingKey: keys[0]! },
        { displayName: "Founder-1", verifyingKey: keys[1]! },
        { displayName: "Founder-2", verifyingKey: keys[2]! },
      ],
    };
    writeNexusDoc(bags, doc);
    return { root, bags, nexusPubkey, operatorNym: keys[0]!.toLowerCase(), epoch: doc.sealEpochCid };
  });
}

/** hex → bytes (test-local; the mesh keeps its own private one). */
function hexToBytes(h: string): Uint8Array {
  const clean = h.toLowerCase();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * The REVERTED count — `carriageEntryCounts` with the contract-in check DROPPED (quorum alone, exactly as a
 * REVOKE counts). This models "revert the fix": if an admit counted on its kahu quorum WITHOUT the operator's
 * own consent, a Nexus could conscript. Verifies ≥ threshold distinct roster signatures over the entry bytes.
 */
async function countsQuorumOnly(entry: CarriageEntry, roster: KahuRoster): Promise<boolean> {
  if (entry.sealEpochCid !== roster.sealEpochCid) return false;
  const rosterKeys = new Set(roster.keys.map((k) => k.toLowerCase()));
  const bytes = carriageEntryBytes({
    kind: entry.kind, nym: entry.nym, action: entry.action,
    version: entry.version, sealEpochCid: entry.sealEpochCid,
  });
  const counted = new Set<string>();
  for (const s of entry.signatures) {
    const signer = s.signer.toLowerCase();
    if (counted.has(signer) || !rosterKeys.has(signer)) continue;
    let ok = false;
    try { ok = await ed.verifyAsync(hexToBytes(s.sig), bytes, hexToBytes(signer)); } catch { ok = false; }
    if (ok) counted.add(signer);
  }
  return counted.size >= roster.threshold;   // NO verifyContractIn — the conscripting count
}

describe("LIVE-WIRE B4 — two hearths write each other into membership (the bilateral genesis contract)", () => {
  it("BOTH sides fold the OTHER operator in: A names B a MEMBER, B names A a MEMBER", async () => {
    const A = await standHearth(rootA);
    const B = await standHearth(rootB);

    // The two operators are genuinely distinct — no shared identity home across the LAR_ROOT wall.
    expect(A.operatorNym).not.toBe(B.operatorNym);
    expect(A.nexusPubkey).not.toBe(B.nexusPubkey);
    expect(A.epoch).not.toBe(B.epoch);

    // ── Direction 1: Freyja (B) accepts carriage into A's nexus; Josh's (A) kahu admit her onto board A. ──
    const tokenF = await asRoot(rootB, () => runNexusAcceptCarriage({ handleIndex: 0, sealHome: A.bags }));
    expect(tokenF.nym).toBe(B.operatorNym);        // signed with Freyja's own seed
    expect(tokenF.sealEpochCid).toBe(A.epoch);  // bound to the OTHER hearth's charter epoch (the wax-stamp)

    const admitF = await asRoot(rootA, () =>
      runNexusContract({ action: "admit", nym: B.operatorNym, contractSig: tokenF.contractSig, sealHome: A.bags }));
    expect(admitF.contractIn).toBe("supplied");            // the joiner's out-of-band consent, not a self-sign
    expect(admitF.sealEpochCid).toBe(A.epoch);          // the entry binds A's epoch cid (provenance)
    expect(admitF.signers).toHaveLength(2);                // exactly the 2-of-3 founding-kahu quorum
    expect(admitF.memberNow).toBe(true);

    // ── Direction 2: Josh (A) accepts carriage into B's nexus; Freyja's (B) kahu admit him onto board B. ──
    const tokenJ = await asRoot(rootA, () => runNexusAcceptCarriage({ handleIndex: 0, sealHome: B.bags }));
    expect(tokenJ.nym).toBe(A.operatorNym);
    expect(tokenJ.sealEpochCid).toBe(B.epoch);

    const admitJ = await asRoot(rootB, () =>
      runNexusContract({ action: "admit", nym: A.operatorNym, contractSig: tokenJ.contractSig, sealHome: B.bags }));
    expect(admitJ.contractIn).toBe("supplied");
    expect(admitJ.memberNow).toBe(true);

    // ── The bilateral assertion — each hearth's OWN nexus-membership fold, off its OWN local replica. ──
    const strangerNym = hex(await ed.getPublicKeyAsync(new Uint8Array(32).fill(123)));

    await asRoot(rootA, async () => {
      const repo = new Repo({ storage: new NodeFSStorageAdapter(larDataDir()) });
      const holder = makeNexusMembership({
        sealHome: A.bags, nexusPubkey: A.nexusPubkey, repo,
        peerIdentifierMap: new Map<string, string>([
          ["peer-b",        `prefix:${B.operatorNym}`],   // the peer operator → MEMBER (members{} write)
          ["peer-stranger", `prefix:${strangerNym}`],     // never admitted → STRANGER
        ]),
      });
      await holder.refold();
      expect(holder.membership.holdsCarriagePeer("peer-b")).toBe(true);        // A folds B IN
      expect(holder.membership.holdsCarriagePeer("peer-stranger")).toBe(false);
      holder.dispose();

      const list = await runNexusMembersList({ sealHome: A.bags });
      expect(list.members).toContain(B.operatorNym);
      expect(list.members).not.toContain(strangerNym);
    });

    await asRoot(rootB, async () => {
      const repo = new Repo({ storage: new NodeFSStorageAdapter(larDataDir()) });
      const holder = makeNexusMembership({
        sealHome: B.bags, nexusPubkey: B.nexusPubkey, repo,
        peerIdentifierMap: new Map<string, string>([["peer-a", `prefix:${A.operatorNym}`]]),
      });
      await holder.refold();
      expect(holder.membership.holdsCarriagePeer("peer-a")).toBe(true);        // B folds A IN
      holder.dispose();

      const list = await runNexusMembersList({ sealHome: B.bags });
      expect(list.members).toContain(A.operatorNym);
    });
  });

  it("NO CONSCRIPTION — an admit for an operator that never signed consent REFUSES (no token, seed not held)", async () => {
    const A = await standHearth(rootA);
    await standHearth(rootB);   // a real peer exists, but its operator never signs carriage into A

    // A nym A neither holds nor received a carriage token for — the members-registry is NOT the antigen.
    const unconsented = hex(await ed.getPublicKeyAsync(new Uint8Array(32).fill(200)));
    await asRoot(rootA, async () => {
      await expect(runNexusContract({ action: "admit", nym: unconsented, sealHome: A.bags }))
        .rejects.toBeInstanceOf(NexusContractError);   // no contract-in obtainable → fail-closed, no board write
      const list = await runNexusMembersList({ sealHome: A.bags });
      expect(list.entries).toHaveLength(0);         // nothing written
    });
  });

  it("REVERT-VERIFY the bite — dropping the contract-in check turns a quorum-signed admit into CONSCRIPTION", async () => {
    const A = await standHearth(rootA);
    const unconsented = hex(await ed.getPublicKeyAsync(new Uint8Array(32).fill(201)));

    await asRoot(rootA, async () => {
      const rosterA = foundingRoster(readNexusDoc(A.bags));
      const dir = larDataDir();

      // Hand-build the entry `runNexusContract` REFUSES to mint: a valid 2-of-3 kahu quorum over an admit that
      // carries NO operator contract-in (bypassing the command's `resolveContractIn` gate outright).
      const signers = await Promise.all([0, 1].map(async (i) => {
        const r = await generateOrLoadPersonaGroupRoot(dir, i);
        return { signer: r.verifyingKey, sign: ed25519SignerFromSeed(await loadPersonaGroupRootSeed(dir, i)) };
      }));
      const conscript: CarriageEntry = await signCarriageQuorum(
        { nym: unconsented, action: "admit", version: 1, sealEpochCid: rosterA.sealEpochCid },
        signers,
        undefined,   // NO contract-in
      );

      // REAL fold — the contract-in guard IGNORES the unconsented admit: NOT a member (no conscription).
      const real = await foldCarriageSet([conscript], rosterA);
      expect(holdsCarriage(unconsented, real)).toBe(false);

      // REVERTED fold — drop `verifyContractIn` (quorum alone) → the SAME entry conscripts the operator to
      // MEMBER. The no-conscription refusal FAILS once the guard is bypassed, which is exactly its load.
      expect(await countsQuorumOnly(conscript, rosterA)).toBe(true);
    });
  });
});
