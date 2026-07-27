/**
 * membership-registry.test.ts — the operator MEMBERS-registry (the Kapae-antigen's ALLOW-twin), FAIL-CLOSED
 * at every shore and holding the three Build-2 doctrine invariants.
 *
 * Proven:
 *   · a 2-of-3 kahu quorum + the operator's contract-in → the nym reads MEMBER (admit),
 *   · a SUB-QUORUM admit → ignored (a lone node cannot admit),
 *   · an admit MISSING / with a BAD contract-in → ignored (a Nexus cannot conscript an operator — WAX-SEALS-ONLY),
 *   · a REVOKE (kahu quorum only, no contract-in) drops membership,
 *   · a revoke at a STRICTLY HIGHER version supersedes an admit; a same-version tie stays NON-member (fail-closed),
 *   · an entry on the WRONG charter epoch, and an unbound roster, both fail closed,
 *   · USER-NEVER-WRITTEN — the signed payload carries ONLY the operator-contract floor (pubkey · action · version
 *     · charter-epoch); no name/email/device/behavior field can ride the signed bytes.
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import { hex } from "../src/crypto.js";
import {
  signCarriageQuorum, signCarriageContract, carriageEntryBytes, foldCarriageSet, holdsCarriage,
  CARRIAGE_ENTRY_DOMAIN, type CarriageEntry, type QuorumSignature,
} from "../src/carriage-registry.js";
import type { KahuCharterRoster } from "../src/kapae-antigen.js";

const EPOCH = "epoch-cid-genesis";

// Three founding kahu + one joining operator + a stranger — fixed seeds → deterministic run.
const SEEDS = {
  guru:     new Uint8Array(32).fill(1),
  telarus:  new Uint8Array(32).fill(2),
  lindwyrm: new Uint8Array(32).fill(3),
  joiner:   new Uint8Array(32).fill(5),   // the operator being admitted
  stranger: new Uint8Array(32).fill(7),
};
const signerOf = (seed: Uint8Array) => (bytes: Uint8Array) => ed.signAsync(bytes, seed).then(hex);
const pubOf    = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);

async function roster(threshold = 2): Promise<KahuCharterRoster> {
  const keys = await Promise.all([pubOf(SEEDS.guru), pubOf(SEEDS.telarus), pubOf(SEEDS.lindwyrm)]);
  return { keys, threshold, charterEpochCid: EPOCH };
}

/** The joining operator's "accepts carriage" contract-in for the current epoch. */
async function contractIn(seed: Uint8Array, epoch = EPOCH): Promise<QuorumSignature> {
  const nym = await pubOf(seed);
  return signCarriageContract(nym, epoch, signerOf(seed));
}

async function admitEntry(over: Partial<Pick<CarriageEntry, "action" | "version" | "charterEpochCid">> = {},
                          kahu: Uint8Array[] = [SEEDS.guru, SEEDS.telarus],
                          contract: QuorumSignature | undefined = undefined,
                          joinerSeed: Uint8Array = SEEDS.joiner): Promise<CarriageEntry> {
  const nym     = await pubOf(joinerSeed);
  const signers = await Promise.all(kahu.map(async (s) => ({ signer: await pubOf(s), sign: signerOf(s) })));
  const cs      = contract ?? (over.action === "revoke" ? undefined : await contractIn(joinerSeed, over.charterEpochCid ?? EPOCH));
  return signCarriageQuorum(
    { nym, action: over.action ?? "admit", version: over.version ?? 1, charterEpochCid: over.charterEpochCid ?? EPOCH },
    signers, cs,
  );
}

describe("the members fold — admit needs BOTH the kahu quorum AND the operator contract-in", () => {
  test("2-of-3 kahu + contract-in → the nym reads MEMBER", async () => {
    const r = await roster();
    const nym = await pubOf(SEEDS.joiner);
    const set = await foldCarriageSet([await admitEntry()], r);
    expect(holdsCarriage(nym, set)).toBe(true);
  });

  test("SUB-QUORUM (one kahu) → ignored, never a member", async () => {
    const r = await roster();
    const nym = await pubOf(SEEDS.joiner);
    const set = await foldCarriageSet([await admitEntry({}, [SEEDS.guru])], r);
    expect(holdsCarriage(nym, set)).toBe(false);
  });

  test("admit with NO contract-in → ignored (a Nexus cannot conscript an operator)", async () => {
    const r = await roster();
    const nym = await pubOf(SEEDS.joiner);
    // A perfectly-quorum'd admit, but the operator never signed 'accepts carriage'.
    const entry = await admitEntry({}, [SEEDS.guru, SEEDS.telarus], undefined, SEEDS.joiner);
    const noContract: CarriageEntry = { ...entry, contractSig: undefined };
    const set = await foldCarriageSet([noContract], r);
    expect(holdsCarriage(nym, set)).toBe(false);
  });

  test("admit with a FORGED contract-in (someone else's signature) → ignored", async () => {
    const r = await roster();
    const nym = await pubOf(SEEDS.joiner);
    // The stranger signs a carriage token but claims the joiner's nym as signer → verify fails (signer≠nym or bad sig).
    const forged = await contractIn(SEEDS.stranger);
    const misattributed: QuorumSignature = { signer: nym, sig: forged.sig };   // wrong sig under the joiner's nym
    const entry = await admitEntry({}, [SEEDS.guru, SEEDS.telarus], misattributed);
    const set = await foldCarriageSet([entry], r);
    expect(holdsCarriage(nym, set)).toBe(false);
  });

  test("a non-roster kahu signer does not pad the quorum", async () => {
    const r = await roster();
    const nym = await pubOf(SEEDS.joiner);
    const set = await foldCarriageSet([await admitEntry({}, [SEEDS.guru, SEEDS.stranger])], r);
    expect(holdsCarriage(nym, set)).toBe(false);
  });

  test("an admit on the WRONG charter epoch is ignored", async () => {
    const r = await roster();
    const nym = await pubOf(SEEDS.joiner);
    const set = await foldCarriageSet([await admitEntry({ charterEpochCid: "some-other-epoch" })], r);
    expect(holdsCarriage(nym, set)).toBe(false);
  });

  test("an unbound (empty-key) roster fails closed", async () => {
    const empty: KahuCharterRoster = { keys: [], threshold: 2, charterEpochCid: EPOCH };
    const nym = await pubOf(SEEDS.joiner);
    const set = await foldCarriageSet([await admitEntry()], empty);
    expect(holdsCarriage(nym, set)).toBe(false);
  });
});

describe("revoke — kahu quorum only, monotone, fail-closed equivocation", () => {
  test("a revoke at a STRICTLY HIGHER version supersedes an admit (no contract-in needed)", async () => {
    const r = await roster();
    const nym = await pubOf(SEEDS.joiner);
    const admit  = await admitEntry({ action: "admit",  version: 1 });
    const revoke = await admitEntry({ action: "revoke", version: 2 });
    const set = await foldCarriageSet([admit, revoke], r);
    expect(holdsCarriage(nym, set)).toBe(false);
  });

  test("a same-version admit/revoke tie stays NON-member (a tie never grants membership)", async () => {
    const r = await roster();
    const nym = await pubOf(SEEDS.joiner);
    const admit  = await admitEntry({ action: "admit",  version: 5 });
    const revoke = await admitEntry({ action: "revoke", version: 5 });
    expect(holdsCarriage(nym, await foldCarriageSet([admit, revoke], r))).toBe(false);
    expect(holdsCarriage(nym, await foldCarriageSet([revoke, admit], r))).toBe(false);   // order-independent
  });

  test("a stale revoke (lower version) cannot roll back a fresher admit", async () => {
    const r = await roster();
    const nym = await pubOf(SEEDS.joiner);
    const revoke = await admitEntry({ action: "revoke", version: 1 });
    const admit  = await admitEntry({ action: "admit",  version: 2 });
    const set = await foldCarriageSet([revoke, admit], r);
    expect(holdsCarriage(nym, set)).toBe(true);
  });
});

describe("TRACK CONTRACTS, NEVER IDENTITIES — the signed payload is the operator-contract FLOOR", () => {
  test("the signed bytes carry ONLY pubkey · action · version · charter-epoch — no identity field", async () => {
    const nym = await pubOf(SEEDS.joiner);
    const decoded = JSON.parse(new TextDecoder().decode(
      carriageEntryBytes({ kind: CARRIAGE_ENTRY_DOMAIN, nym, action: "admit", version: 1, charterEpochCid: EPOCH }),
    )) as Record<string, unknown>;
    // Exactly the floor keys — nothing that could name a human.
    expect(Object.keys(decoded).sort()).toEqual(["action", "charterEpochCid", "kind", "nym", "version"]);
    expect(decoded["nym"]).toBe(nym);                       // an ed25519 pubkey, never a name
    expect(JSON.stringify(decoded)).not.toMatch(/name|email|device|behavior/i);
  });

  test("the contract-in the operator signs carries ONLY nym + charter-epoch (version-independent)", async () => {
    const cs = await contractIn(SEEDS.joiner);
    const nym = await pubOf(SEEDS.joiner);
    expect(cs.signer).toBe(nym);   // the seal is the operator's OWN — proves consent, names no human
  });
});
