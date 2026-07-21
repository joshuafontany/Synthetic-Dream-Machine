/**
 * member-carry-decision.test.ts — the CARRY-SPLIT that lets the mesh BREATHE across a Nexus (operator-ruled
 * 2026-07-20): a cross-operator MEMBER blind-transits a PROVABLY-sealed private plane (carry the ciphertext,
 * never the read-cap); a STRANGER reaches ONLY the federatable public shelf.
 *
 * Proven against the REAL federatable gate + the real deterministic doc urls (no stubs in the decision path):
 *   · the FLOOR is untouched — federatable/public crosses to member AND stranger; a Kapae'd presenter draws Mu,
 *   · a MEMBER + a SEALED private plane → carry TRUE (the blind-transit lane opens),
 *   · a MEMBER + a CLEARTEXT-local plane → DENY (the encrypt-first guard),
 *   · a STRANGER + a SEALED plane → DENY (no sealed carriage for a non-member),
 *   · a Kapae'd MEMBER → Mu even for a sealed plane (the antigen stays ahead of the split),
 *   · READ-LANE UNTOUCHED: with membership=null OR seal=null the fn degenerates EXACTLY to
 *     carryContractShareDecision — the split adds a lane, never widens the floor, never adds a decrypt path.
 */
import { describe, test, expect } from "vitest";
import { interpretAsDocumentId, stringifyAutomergeUrl, type BinaryDocumentId, type DocumentId } from "@automerge/automerge-repo";
import { randomBytes } from "node:crypto";
import {
  DeterministicFederationGate, carryContractShareDecision, memberCarryShareDecision,
  type AntigenRing, type NexusMembership, type PlaneSeal,
} from "../src/federation-gate.js";
import { crossroadsDocUrl } from "../src/deterministic-doc.js";

const NX = "abcdef0123456789";
const fedGate = new DeterministicFederationGate(NX);
const docIdOf = (url: string): DocumentId => interpretAsDocumentId(url as never) as DocumentId;
const randomDocId = (): DocumentId => docIdOf(stringifyAutomergeUrl({ documentId: new Uint8Array(randomBytes(16)) as BinaryDocumentId }));

const CROSSROADS      = docIdOf(crossroadsDocUrl(NX));   // a federatable public board (the floor)
const SEALED_PLANE    = randomDocId();                    // a private plane the seal oracle proves sealed
const CLEARTEXT_PLANE = randomDocId();                    // a private plane the seal oracle cannot prove sealed

const MEMBER_PEER   = "peer-member";
const STRANGER_PEER = "peer-stranger";
const relayPeers = new Set([MEMBER_PEER, STRANGER_PEER]);

const membership: NexusMembership = { isMemberPeer: (peerId) => peerId === MEMBER_PEER };
const seal: PlaneSeal = { isSealedPlane: (docId) => docId === SEALED_PLANE };

const decide = (
  peerId: string, documentId: DocumentId | undefined,
  m: NexusMembership | null = membership, s: PlaneSeal | null = seal, antigen: AntigenRing | null = null,
) => memberCarryShareDecision(relayPeers, fedGate, antigen, null, m, s, peerId, documentId);

describe("the floor is untouched — federatable/public crosses to member AND stranger", () => {
  test("a MEMBER reaches the federatable board", async () => { expect(await decide(MEMBER_PEER, CROSSROADS)).toBe(true); });
  test("a STRANGER reaches the federatable board", async () => { expect(await decide(STRANGER_PEER, CROSSROADS)).toBe(true); });
});

describe("the MEMBER blind-transit lane", () => {
  test("a MEMBER blind-transits a SEALED private plane (carry TRUE)", async () => {
    expect(await decide(MEMBER_PEER, SEALED_PLANE)).toBe(true);
  });
  test("a MEMBER is DENIED a CLEARTEXT-local private plane (encrypt-first)", async () => {
    expect(await decide(MEMBER_PEER, CLEARTEXT_PLANE)).toBe(false);
  });
  test("a MEMBER with no doc id is DENIED (deny-by-default)", async () => {
    expect(await decide(MEMBER_PEER, undefined)).toBe(false);
  });
});

describe("a STRANGER gets the public shelf ONLY — never sealed carriage", () => {
  test("a STRANGER is DENIED a SEALED private plane", async () => { expect(await decide(STRANGER_PEER, SEALED_PLANE)).toBe(false); });
  test("a STRANGER is DENIED a CLEARTEXT private plane", async () => { expect(await decide(STRANGER_PEER, CLEARTEXT_PLANE)).toBe(false); });
});

describe("the antigen stays AHEAD of the carry-split — a Kapae'd MEMBER draws Mu", () => {
  const KAPAED_NYM = "cafebabe".repeat(8);
  const antigen: AntigenRing = {
    kapaed: new Set([KAPAED_NYM]),
    presenterNym: (peerId) => (peerId === MEMBER_PEER ? KAPAED_NYM : null),
  };
  test("a banned MEMBER cannot blind-transit even a sealed plane (Mu)", async () => {
    expect(await decide(MEMBER_PEER, SEALED_PLANE, membership, seal, antigen)).toBe(false);
  });
  test("a banned MEMBER draws Mu even for the federatable floor", async () => {
    expect(await decide(MEMBER_PEER, CROSSROADS, membership, seal, antigen)).toBe(false);
  });
});

describe("READ-LANE UNTOUCHED — degenerates EXACTLY to carryContractShareDecision without the two oracles", () => {
  const cells: ReadonlyArray<readonly [string, DocumentId]> = [
    [MEMBER_PEER, CROSSROADS], [MEMBER_PEER, SEALED_PLANE], [MEMBER_PEER, CLEARTEXT_PLANE],
    [STRANGER_PEER, CROSSROADS], [STRANGER_PEER, SEALED_PLANE],
  ];
  test("membership = null → identical to the pre-split decision (no lane opens)", async () => {
    for (const [peer, doc] of cells) {
      const split = await memberCarryShareDecision(relayPeers, fedGate, null, null, null, seal, peer, doc);
      const base  = await carryContractShareDecision(relayPeers, fedGate, null, null, peer, doc);
      expect(split).toBe(base);
    }
  });
  test("seal = null → identical to the pre-split decision (nothing provably sealed → no lane)", async () => {
    for (const [peer, doc] of cells) {
      const split = await memberCarryShareDecision(relayPeers, fedGate, null, null, membership, null, peer, doc);
      const base  = await carryContractShareDecision(relayPeers, fedGate, null, null, peer, doc);
      expect(split).toBe(base);
    }
  });
});
