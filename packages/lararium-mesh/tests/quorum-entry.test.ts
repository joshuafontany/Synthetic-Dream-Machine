/**
 * quorum-entry.test.ts — the shared steward-entry byte-image, and the DOMAIN that keeps two boards apart.
 *
 * WHY THIS FILE EXISTS. `src/quorum-entry.ts` holds the canonical bytes the Kapae antigen and the carriage members
 * set both sign over. Its header states that `kind` rides first, stays required, and IS the cross-board separation —
 * "no signature raised on one board can ever be re-presented on the other". Until this file, `quorumEntryBytes`
 * appeared in ZERO test references, and the verify-time gates that enforce the domain
 * (`kapae-antigen.ts:116`, `carriage-registry.ts:117`) were each deleted in a scratch mirror with the whole mesh
 * suite still reporting 1659 passed. The law had no witness at either end.
 *
 * WHAT GETS PROVEN HERE:
 *   ① the image carries exactly the five floor fields, sorted-stable, signatures OUTSIDE,
 *   ② a different `kind` yields DIFFERENT bytes — the separation exists in the image itself,
 *   ③ a real ed25519 signature raised over one board's bytes REFUSES on the other board's — the replay the
 *     domain exists to prevent, walked end to end rather than asserted as a string,
 *   ④ each board's live verifier REJECTS a foreign-domain entry — the two `entry.kind !== …` gates, each one
 *     deleted in scratch and seen to red this file before it landed.
 *
 * WHAT THIS FILE DELIBERATELY DOES NOT DO. It never asserts that a domain constant equals itself. An entry's
 * `kind` field appearing inside its own signed bytes proves nothing about separation — both sides of such an
 * assertion move together under a rename, which is how `kapae-antigen.test.ts` came to call the domain "ridden"
 * while a fused pair would have passed. Every claim below crosses a boundary.
 */
import { describe, test, expect } from "vitest";
import * as ed from "@noble/ed25519";
import { hex, hexToBytes } from "../src/crypto.js";
import { quorumEntryBytes, type QuorumEntryFields } from "../src/quorum-entry.js";
import {
  makeMultiSigQuorumVerifier as makeAntigenVerifier, KAPAE_ANTIGEN_DOMAIN,
  type KapaeAntigenEntry, type KahuRoster,
} from "../src/kapae-antigen.js";
import {
  foldCarriageSet, holdsCarriage, CARRIAGE_ENTRY_DOMAIN, carriageContractBytes,
  type CarriageEntry,
} from "../src/carriage-registry.js";

const EPOCH = "epoch-cid-genesis";
const NYM_SEED   = new Uint8Array(32).fill(11);
const KAHU_SEEDS = [new Uint8Array(32).fill(1), new Uint8Array(32).fill(2), new Uint8Array(32).fill(3)];

const pubOf  = (seed: Uint8Array) => ed.getPublicKeyAsync(seed).then(hex);
const signOf = (seed: Uint8Array) => (bytes: Uint8Array) => ed.signAsync(bytes, seed).then(hex);

/** The five floor fields, one board's domain swapped in. */
function fields(kind: string, over: Partial<QuorumEntryFields> = {}): QuorumEntryFields {
  return {
    kind,
    nym:             over.nym ?? "deadbeef".repeat(8),
    action:          over.action ?? "admit",
    version:         over.version ?? 1,
    sealEpochCid: over.sealEpochCid ?? EPOCH,
  };
}

describe("① the canonical image — five floor fields, signatures OUTSIDE", () => {
  test("the bytes carry exactly kind · nym · action · version · sealEpochCid", () => {
    const decoded = JSON.parse(new TextDecoder().decode(quorumEntryBytes(fields("lar-test/board")))) as Record<string, unknown>;
    expect(Object.keys(decoded).sort()).toEqual(["action", "kind", "nym", "sealEpochCid", "version"]);
  });

  test("the image is sorted-key STABLE — field insertion order cannot change the bytes a quorum signed", () => {
    const a = quorumEntryBytes({ kind: "k", nym: "n", action: "admit", version: 3, sealEpochCid: EPOCH });
    const b = quorumEntryBytes({ sealEpochCid: EPOCH, version: 3, action: "admit", nym: "n", kind: "k" });
    expect(hex(b)).toBe(hex(a));
  });

  test("a signature added beside an entry never re-signs it — the image ignores extra keys", () => {
    const base = fields("lar-test/board");
    const withSigs = { ...base, signatures: [{ signer: "aa", sig: "bb" }] } as QuorumEntryFields;
    expect(hex(quorumEntryBytes(withSigs))).toBe(hex(quorumEntryBytes(base)));
  });

  test("each of the four non-domain fields moves the bytes (no field rides along unsigned)", () => {
    const base = hex(quorumEntryBytes(fields("lar-test/board")));
    expect(hex(quorumEntryBytes(fields("lar-test/board", { nym: "cafe".repeat(16) })))).not.toBe(base);
    expect(hex(quorumEntryBytes(fields("lar-test/board", { action: "revoke" })))).not.toBe(base);
    expect(hex(quorumEntryBytes(fields("lar-test/board", { version: 2 })))).not.toBe(base);
    expect(hex(quorumEntryBytes(fields("lar-test/board", { sealEpochCid: "other-epoch" })))).not.toBe(base);
  });
});

describe("② the DOMAIN separates the image — same act, two boards, different bytes", () => {
  test("the antigen image and the carriage image of the SAME act differ", () => {
    const antigen  = quorumEntryBytes(fields(KAPAE_ANTIGEN_DOMAIN));
    const carriage = quorumEntryBytes(fields(CARRIAGE_ENTRY_DOMAIN));
    expect(hex(carriage)).not.toBe(hex(antigen));
  });

  test("the two live board domains are not the same string", () => {
    // Stated bluntly rather than inferred. Fusing these two constants is the collapse the module refuses.
    expect(CARRIAGE_ENTRY_DOMAIN).not.toBe(KAPAE_ANTIGEN_DOMAIN);
  });
});

describe("③ THE REPLAY, walked end to end — a real signature crossing boards", () => {
  test("a kahu signature raised over the ANTIGEN image does not verify over the CARRIAGE image", async () => {
    const seed = KAHU_SEEDS[0]!;
    const signer = await pubOf(seed);
    const act = { nym: await pubOf(NYM_SEED), action: "admit", version: 1, sealEpochCid: EPOCH };

    const antigenBytes  = quorumEntryBytes({ kind: KAPAE_ANTIGEN_DOMAIN,  ...act });
    const carriageBytes = quorumEntryBytes({ kind: CARRIAGE_ENTRY_DOMAIN, ...act });
    const sig = await signOf(seed)(antigenBytes);

    // Positive control — the signature IS good, on its own board.
    expect(await ed.verifyAsync(hexToBytes(sig), antigenBytes, hexToBytes(signer))).toBe(true);
    // The separation: the identical signer, the identical act, refused on the sibling board.
    expect(await ed.verifyAsync(hexToBytes(sig), carriageBytes, hexToBytes(signer))).toBe(false);
  });
});

describe("④ each board's LIVE verifier rejects a foreign-domain entry", () => {
  async function roster(): Promise<KahuRoster> {
    return { keys: await Promise.all(KAHU_SEEDS.map(pubOf)), threshold: 2, sealEpochCid: EPOCH };
  }

  /** An entry signed by two real kahu over WHATEVER `kind` it carries — a well-formed quorum on the wrong board. */
  async function signedAtDomain(kind: string): Promise<KapaeAntigenEntry> {
    const act = { nym: await pubOf(NYM_SEED), action: "kapae", version: 1, sealEpochCid: EPOCH };
    const bytes = quorumEntryBytes({ kind, ...act });
    const signatures = await Promise.all(KAHU_SEEDS.slice(0, 2).map(async (s) => ({
      signer: await pubOf(s), sig: await signOf(s)(bytes),
    })));
    return { kind, ...act, signatures } as unknown as KapaeAntigenEntry;
  }

  test("the antigen verifier ACCEPTS its own domain (positive control)", async () => {
    const verifier = makeAntigenVerifier();
    expect(await verifier.verifyQuorum(await signedAtDomain(KAPAE_ANTIGEN_DOMAIN), await roster())).toBe(true);
  });

  test("the antigen verifier REJECTS a validly-signed CARRIAGE-domain entry", async () => {
    // The signatures verify over the bytes; only the domain differs. Without `kapae-antigen.ts:116` this passes,
    // and a carriage steward act becomes a ban.
    const verifier = makeAntigenVerifier();
    expect(await verifier.verifyQuorum(await signedAtDomain(CARRIAGE_ENTRY_DOMAIN), await roster())).toBe(false);
  });

  test("the antigen verifier REJECTS an unknown third domain", async () => {
    const verifier = makeAntigenVerifier();
    expect(await verifier.verifyQuorum(await signedAtDomain("lar-some-other-board/v1"), await roster())).toBe(false);
  });

  test("the carriage fold REJECTS a validly-signed ANTIGEN-domain entry (contract-in and all)", async () => {
    const nym = await pubOf(NYM_SEED);
    const act = { nym, action: "admit", version: 1, sealEpochCid: EPOCH };
    const contractSig = { signer: nym, sig: await signOf(NYM_SEED)(carriageContractBytes({ nym, sealEpochCid: EPOCH })) };

    const build = async (kind: string): Promise<CarriageEntry> => {
      const bytes = quorumEntryBytes({ kind, ...act });
      const signatures = await Promise.all(KAHU_SEEDS.slice(0, 2).map(async (s) => ({
        signer: await pubOf(s), sig: await signOf(s)(bytes),
      })));
      return { kind, ...act, signatures, contractSig } as unknown as CarriageEntry;
    };

    const r = await roster();
    // Positive control — the same operator, the same consent, on its OWN domain, reads MEMBER.
    expect(holdsCarriage(nym, await foldCarriageSet([await build(CARRIAGE_ENTRY_DOMAIN)], r))).toBe(true);
    // The separation: swap only the domain and the very same quorum stops meaning membership.
    expect(holdsCarriage(nym, await foldCarriageSet([await build(KAPAE_ANTIGEN_DOMAIN)], r))).toBe(false);
  });
});
