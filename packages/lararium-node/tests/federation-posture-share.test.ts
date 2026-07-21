/**
 * federation-posture-share.test.ts — the open-beta POSTURE outer gate at the node sharePolicy wire.
 *
 * The posture composes as the OUTER gate over the cross-operator carry: PRIVATE (the live fail-closed default the
 * node caller sets) denies a cross-Nexus NON-member foreign operator ALL co-federation — not even the world-public
 * shelf crosses; OPEN restores the prior bounded public-carry. NEITHER posture ever opens a private plane.
 *
 * Proven against real mesh primitives (DeterministicFederationGate + real deterministic urls + the real
 * selfSlotShareDecision):
 *   · PRIVATE + non-member cross-operator → the public shelf is DENIED (co-federation refused entirely),
 *   · PRIVATE + SAME-Nexus member → the public shelf crosses (same-Nexus co-federates),
 *   · OPEN + non-member → the public shelf crosses (the prior behavior),
 *   · NEITHER posture opens a private plane — a private-own plane stays DENIED to a cross-operator in BOTH,
 *   · a same-operator device peer is UNGATED by posture (full sync in both).
 */
import { describe, test, expect } from "vitest";
import { interpretAsDocumentId, stringifyAutomergeUrl, type BinaryDocumentId, type DocumentId } from "@automerge/automerge-repo";
import { randomBytes } from "node:crypto";
import { DeterministicFederationGate, crossroadsDocUrl, type NexusMembership } from "@lararium/mesh";
import { selfSlotShareDecision } from "../src/self-slot-share.js";

const MY_NEXUS = "1122334455667788990011223344556677889900112233445566778899001122";
const fedGate  = new DeterministicFederationGate(MY_NEXUS);
const docIdOf  = (url: string): DocumentId => interpretAsDocumentId(url as never) as DocumentId;

const CROSSROADS   = docIdOf(crossroadsDocUrl(MY_NEXUS));   // a world-public federatable plane
const PRIVATE_LIKE = docIdOf(stringifyAutomergeUrl({ documentId: new Uint8Array(randomBytes(16)) as BinaryDocumentId }));

const MEMBER_PEER  = "member-peer";
const FOREIGN_PEER = "foreign-peer";
const membership: NexusMembership = { isMemberPeer: (p) => p === MEMBER_PEER };

const decide = (posture: "private" | "open", peerId: string, documentId: DocumentId) =>
  selfSlotShareDecision({
    hasWsSocket: true, peerClass: "cross-operator", selfSlotFedGate: fedGate,
    antigenRing: null, membership, planeSeal: null, federationPosture: posture, peerId, documentId,
  });

describe("PRIVATE posture — a cross-Nexus NON-member is denied co-federation entirely", () => {
  test("a non-member foreign operator is DENIED even the world-public shelf", async () => {
    expect(await decide("private", FOREIGN_PEER, CROSSROADS)).toBe(false);
  });
  test("a SAME-Nexus member DOES reach the public shelf (same-Nexus co-federates)", async () => {
    expect(await decide("private", MEMBER_PEER, CROSSROADS)).toBe(true);
  });
  test("a member is STILL denied a private plane (posture never opens a private plane)", async () => {
    expect(await decide("private", MEMBER_PEER, PRIVATE_LIKE)).toBe(false);
  });
});

describe("OPEN posture — the prior bounded public-carry restored", () => {
  test("a non-member foreign operator reaches the public shelf", async () => {
    expect(await decide("open", FOREIGN_PEER, CROSSROADS)).toBe(true);
  });
  test("a non-member is STILL denied a private plane (open never opens a private plane)", async () => {
    expect(await decide("open", FOREIGN_PEER, PRIVATE_LIKE)).toBe(false);
  });
});

describe("posture never gates a same-operator device peer", () => {
  test("a same-operator peer full-syncs a private plane under PRIVATE posture", async () => {
    const v = await selfSlotShareDecision({
      hasWsSocket: true, peerClass: "same-operator", selfSlotFedGate: fedGate,
      antigenRing: null, membership: null, planeSeal: null, federationPosture: "private",
      peerId: "my-device", documentId: PRIVATE_LIKE,
    });
    expect(v).toBe(true);
  });
});
