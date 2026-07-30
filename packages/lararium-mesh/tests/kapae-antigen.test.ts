/**
 * kapae-antigen.test.ts — the quorum-verified immune antigen, DENY-BY-DEFAULT at every shore.
 *
 * Proven:
 *   · a 2-of-3 quorum (two distinct founding kahu sign) VERIFIES → the nym stands Kapae'd,
 *   · one signature alone is BELOW threshold → ignored (a lone node cannot Kapae — the censorship guard),
 *   · a non-roster signer, a duplicated signer, and a tampered entry each FAIL to pad the quorum,
 *   · an entry rooting on the WRONG charter epoch is ignored,
 *   · `denyingQuorumVerifier` (the fail-closed default) ignores EVERYTHING,
 *   · an `un_kapae` at a STRICTLY HIGHER version lifts a ban; a same-version tie STAYS Kapae'd,
 *   · an unbound (empty-key) roster fails closed,
 *   · the DOMAIN separates: the same act at another board's domain signs different bytes, a quorum raised
 *     here does not verify there, and the verifier refuses a foreign-domain entry however well it signs.
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import { hex, hexToBytes } from "../src/crypto.js";
import {
  signAntigenEntry, antigenEntryBytes, foldAntigenSet, isKapaed,
  makeMultiSigQuorumVerifier, denyingQuorumVerifier,
  type KapaeAntigenEntry, type KahuCharterRoster,
} from "../src/kapae-antigen.js";

const EPOCH = "epoch-cid-genesis";

// Three founding kahu + one stranger — fixed seeds so the run is deterministic.
const SEEDS = {
  guru:     new Uint8Array(32).fill(1),
  telarus:  new Uint8Array(32).fill(2),
  lindwyrm: new Uint8Array(32).fill(3),
  stranger: new Uint8Array(32).fill(7),
};
const signerOf = (seed: Uint8Array) => (bytes: Uint8Array) => ed.signAsync(bytes, seed).then(hex);
const pubOf    = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);

const verifier = makeMultiSigQuorumVerifier();
const VICTIM   = "deadbeef".repeat(8);   // the presenter nym under ban — any hex handle

async function roster(): Promise<KahuCharterRoster> {
  const keys = await Promise.all([pubOf(SEEDS.guru), pubOf(SEEDS.telarus), pubOf(SEEDS.lindwyrm)]);
  return { keys, threshold: 2, charterEpochCid: EPOCH };
}

async function banEntry(over: Partial<Pick<KapaeAntigenEntry, "action" | "version" | "charterEpochCid" | "nym">> = {},
                        seeds: Uint8Array[] = [SEEDS.guru, SEEDS.telarus]): Promise<KapaeAntigenEntry> {
  const signers = await Promise.all(seeds.map(async (s) => ({ signer: await pubOf(s), sign: signerOf(s) })));
  return signAntigenEntry({
    nym: over.nym ?? VICTIM, action: over.action ?? "kapae",
    version: over.version ?? 1, charterEpochCid: over.charterEpochCid ?? EPOCH,
  }, signers);
}

describe("makeMultiSigQuorumVerifier — the 2-of-3 quorum", () => {
  test("two distinct founding kahu → verifies → the nym stands Kapae'd", async () => {
    const r = await roster();
    const set = await foldAntigenSet([await banEntry()], r, verifier);
    expect(isKapaed(VICTIM, set)).toBe(true);
  });

  test("ONE signature alone is below threshold → ignored (a lone node cannot Kapae)", async () => {
    const r = await roster();
    const set = await foldAntigenSet([await banEntry({}, [SEEDS.guru])], r, verifier);
    expect(isKapaed(VICTIM, set)).toBe(false);
  });

  test("a non-roster signer does not pad the quorum", async () => {
    const r = await roster();
    // one real kahu + one stranger → only one counts → below threshold
    const set = await foldAntigenSet([await banEntry({}, [SEEDS.guru, SEEDS.stranger])], r, verifier);
    expect(isKapaed(VICTIM, set)).toBe(false);
  });

  test("a duplicated signer counts once → cannot pad the quorum", async () => {
    const r = await roster();
    const e = await banEntry({}, [SEEDS.guru]);
    const dup: KapaeAntigenEntry = { ...e, signatures: [e.signatures[0]!, e.signatures[0]!] };
    const set = await foldAntigenSet([dup], r, verifier);
    expect(isKapaed(VICTIM, set)).toBe(false);
  });

  test("a tampered entry (sig over different bytes) fails to verify", async () => {
    const r = await roster();
    const e = await banEntry();
    const tampered: KapaeAntigenEntry = { ...e, nym: "0".repeat(64) };  // signatures now sign the old nym
    const set = await foldAntigenSet([tampered], r, verifier);
    expect(isKapaed("0".repeat(64), set)).toBe(false);
  });

  test("an entry rooting on the WRONG charter epoch is ignored", async () => {
    const r = await roster();
    const set = await foldAntigenSet([await banEntry({ charterEpochCid: "some-other-epoch" })], r, verifier);
    expect(isKapaed(VICTIM, set)).toBe(false);
  });

  test("an unbound (empty-key) roster fails closed", async () => {
    const empty: KahuCharterRoster = { keys: [], threshold: 2, charterEpochCid: EPOCH };
    const set = await foldAntigenSet([await banEntry()], empty, verifier);
    expect(isKapaed(VICTIM, set)).toBe(false);
  });
});

describe("denyingQuorumVerifier — the fail-closed default", () => {
  test("ignores a perfectly-signed entry (a missing verifier must deny)", async () => {
    const r = await roster();
    const set = await foldAntigenSet([await banEntry()], r, denyingQuorumVerifier);
    expect(isKapaed(VICTIM, set)).toBe(false);
  });
});

describe("foldAntigenSet — monotone lift + fail-closed equivocation", () => {
  test("an un_kapae at a STRICTLY HIGHER version lifts the ban", async () => {
    const r = await roster();
    const ban  = await banEntry({ action: "kapae",    version: 1 });
    const lift = await banEntry({ action: "un_kapae", version: 2 });
    const set = await foldAntigenSet([ban, lift], r, verifier);
    expect(isKapaed(VICTIM, set)).toBe(false);
  });

  test("a same-version ban/lift tie STAYS Kapae'd (a lift never rolls back a ban it ties)", async () => {
    const r = await roster();
    const ban  = await banEntry({ action: "kapae",    version: 5 });
    const lift = await banEntry({ action: "un_kapae", version: 5 });
    // order-independent: try both interleavings
    expect(isKapaed(VICTIM, await foldAntigenSet([ban, lift], r, verifier))).toBe(true);
    expect(isKapaed(VICTIM, await foldAntigenSet([lift, ban], r, verifier))).toBe(true);
  });

  test("a stale lift (lower version) cannot roll back a fresher ban", async () => {
    const r = await roster();
    const lift = await banEntry({ action: "un_kapae", version: 1 });
    const ban  = await banEntry({ action: "kapae",    version: 2 });
    const set = await foldAntigenSet([lift, ban], r, verifier);
    expect(isKapaed(VICTIM, set)).toBe(true);
  });
});

describe("antigenEntryBytes — canonical + domain", () => {
  // The claim this describe carries is SEPARATION, not presence. An earlier version of the test below read
  // `expect(e.kind).toBe(KAPAE_ANTIGEN_DOMAIN)` plus a `toContain` over the bytes — both sides of both assertions
  // reading the same constant, so a domain fused with the carriage board's would have passed unmoved. The full
  // cross-board proof (a real signature refusing on the sibling board, both live verifiers rejecting a foreign
  // domain) rides `tests/quorum-entry.test.ts`; what stays here is the antigen-local half of it.

  test("the domain SEPARATES the image — the same act at another domain signs different bytes", async () => {
    const e = await banEntry();
    const own     = antigenEntryBytes(e);
    const foreign = antigenEntryBytes({ ...e, kind: "lar-some-other-board/v1" } as unknown as Omit<KapaeAntigenEntry, "signatures">);
    // Not "the string appears" — the byte-image MOVES. That is what makes a signature un-presentable elsewhere.
    expect(hex(foreign)).not.toBe(hex(own));
  });

  test("a quorum raised on the antigen does NOT verify against another board's image of the same act", async () => {
    const e = await banEntry();
    const foreignBytes = antigenEntryBytes({ ...e, kind: "lar-some-other-board/v1" } as unknown as Omit<KapaeAntigenEntry, "signatures">);
    const s = e.signatures[0]!;
    // Positive control — the signature is genuinely good on its own board.
    expect(await ed.verifyAsync(hexToBytes(s.sig), antigenEntryBytes(e), hexToBytes(s.signer))).toBe(true);
    expect(await ed.verifyAsync(hexToBytes(s.sig), foreignBytes, hexToBytes(s.signer))).toBe(false);
  });

  test("the verifier REFUSES a foreign-domain entry even when its quorum signs perfectly over its own bytes", async () => {
    const r = await roster();
    const act = { nym: VICTIM, action: "kapae" as const, version: 1, charterEpochCid: EPOCH, kind: "lar-some-other-board/v1" };
    const bytes = antigenEntryBytes(act as unknown as Omit<KapaeAntigenEntry, "signatures">);
    const signatures = await Promise.all([SEEDS.guru, SEEDS.telarus].map(async (seed) => ({
      signer: await pubOf(seed), sig: await signerOf(seed)(bytes),
    })));
    // A flawless 2-of-3 quorum on the WRONG board. Deleting `kapae-antigen.ts:116` makes this read Kapae'd.
    const set = await foldAntigenSet([{ ...act, signatures } as unknown as KapaeAntigenEntry], r, verifier);
    expect(isKapaed(VICTIM, set)).toBe(false);
  });
});
