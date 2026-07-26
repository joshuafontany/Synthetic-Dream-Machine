/**
 * self-slot-share.test.ts — the federatable-own vs private-own SELF-SLOT SPLIT, proven at the wire the
 * node sharePolicy hands to Automerge.
 *
 * The whole point (the cross-operator security tension two prior spirits declined to force): a peer that
 * carries a DIFFERENT operator identity must reach ONLY this vessel's deterministically-federatable planes
 * (@crossroads / WHO / kapae-antigen), NEVER a private-own plane (@catalog / @personal / home / wikis) —
 * while the operator's OWN device fleet keeps FULL sync of everything.
 *
 * Proven against REAL mesh primitives (DeterministicFederationGate + the real deterministic doc urls +
 * the real carryContractShareDecision the sharePolicy calls) — no stubs in the decision path:
 *   · a SAME-OPERATOR (device-fleet) WS peer gets full sync INCLUDING a private plane (no-break-own-sync),
 *   · a CROSS-OPERATOR WS peer gets a federatable plane but is DENIED @catalog/@personal (the no-leak),
 *   · an UNCLASSIFIED WS peer is treated cross-operator (private DENIED) — fail-closed,
 *   · a Kapae'd cross-operator draws Mu even for a federatable plane (the #59 antigen ahead),
 *   · an in-process island peer full-syncs (a house member),
 *   · a gated peer whose fed gate has not yet stood is DENIED (no boot-window leak).
 *
 * Gate: lar:///ha.ka.ba/lararium/node/self-slot-share
 */
import { describe, test, expect } from "vitest";
import { interpretAsDocumentId, stringifyAutomergeUrl, type BinaryDocumentId, type DocumentId } from "@automerge/automerge-repo";
import { randomBytes } from "node:crypto";
import { DeterministicFederationGate, type AntigenRing, type NexusMembership, type PlaneSeal } from "@lararium/mesh";
import { crossroadsDocUrl, whoBoardDocUrl, kapaeAntigenDocUrl } from "@lararium/mesh";
import { selfSlotShareDecision } from "../src/self-slot-share.js";

// This vessel's operator identity (its Nexus pubkey) — the federatable planes derive from it.
const MY_NEXUS = "1122334455667788990011223344556677889900112233445566778899001122";
const fedGate  = new DeterministicFederationGate(MY_NEXUS);

const docIdOf = (url: string): DocumentId => interpretAsDocumentId(url as never) as DocumentId;

// ── The FEDERATABLE-own planes (a cross-operator MAY reach these) ──────────────────────────────
const CROSSROADS = docIdOf(crossroadsDocUrl(MY_NEXUS));
const WHO_BOARD  = docIdOf(whoBoardDocUrl(MY_NEXUS));
const ANTIGEN    = docIdOf(kapaeAntigenDocUrl(MY_NEXUS));

// ── The PRIVATE-own planes (a cross-operator must NEVER reach these) ───────────────────────────
// @catalog / @personal / home / wiki docs carry RANDOM automerge ids (never the deterministic set), so a
// fresh random doc id is the faithful stand-in — it can never collide with a federatable address.
const randomDocId = (): DocumentId => docIdOf(stringifyAutomergeUrl({ documentId: new Uint8Array(randomBytes(16)) as BinaryDocumentId }));
const CATALOG_LIKE  = randomDocId();
const PERSONAL_LIKE = randomDocId();

const CROSS_PEER = "cross-operator-peer";
const SAME_PEER  = "same-operator-peer";

/** An antigen ring that marks ONE peer Kapae'd, resolving it to a fixed nym; all else clean/null. */
const KAPAED_PEER = "kapaed-cross-peer";
const antigen: AntigenRing = {
  kapaed: new Set(["dead".repeat(16)]),
  presenterNym: (peerId) => (peerId === KAPAED_PEER ? "dead".repeat(16) : null),
};

describe("no-break-own-sync — a SAME-OPERATOR device-fleet peer keeps FULL device sync", () => {
  const same = (documentId: DocumentId) => selfSlotShareDecision({
    hasWsSocket: true, peerClass: "same-operator", selfSlotFedGate: fedGate, antigenRing: null, membership: null, planeSeal: null, peerId: SAME_PEER, documentId,
  });

  test("a PRIVATE plane (@catalog-like) crosses to my own device", async () => {
    expect(await same(CATALOG_LIKE)).toBe(true);
  });
  test("a PRIVATE plane (@personal-like) crosses to my own device", async () => {
    expect(await same(PERSONAL_LIKE)).toBe(true);
  });
  test("a FEDERATABLE plane crosses to my own device too", async () => {
    expect(await same(CROSSROADS)).toBe(true);
  });
});

describe("the no-leak — a CROSS-OPERATOR peer reaches ONLY the federatable-own planes", () => {
  const cross = (documentId: DocumentId) => selfSlotShareDecision({
    hasWsSocket: true, peerClass: "cross-operator", selfSlotFedGate: fedGate, antigenRing: null, membership: null, planeSeal: null, peerId: CROSS_PEER, documentId,
  });

  test("@crossroads crosses (federatable-own)", async () => { expect(await cross(CROSSROADS)).toBe(true); });
  test("the WHO board crosses (federatable-own)", async () => { expect(await cross(WHO_BOARD)).toBe(true); });
  test("the kapae-antigen board crosses (federatable-own, MANDATORY carry)", async () => { expect(await cross(ANTIGEN)).toBe(true); });

  test("a @catalog-like PRIVATE plane is DENIED", async () => { expect(await cross(CATALOG_LIKE)).toBe(false); });
  test("a @personal-like PRIVATE plane is DENIED", async () => { expect(await cross(PERSONAL_LIKE)).toBe(false); });
  test("a no-doc-id decision is DENIED (deny-by-default)", async () => { expect(await cross(undefined)).toBe(false); });
});

describe("fail-closed — an UNCLASSIFIED WS peer is treated cross-operator", () => {
  const unclassified = (documentId: DocumentId | undefined) => selfSlotShareDecision({
    hasWsSocket: true, peerClass: undefined, selfSlotFedGate: fedGate, antigenRing: null, membership: null, planeSeal: null, peerId: "unknown-peer", documentId,
  });

  test("a federatable plane still crosses", async () => { expect(await unclassified(CROSSROADS)).toBe(true); });
  test("a PRIVATE plane is DENIED (stricter class wins)", async () => { expect(await unclassified(CATALOG_LIKE)).toBe(false); });
});

describe("the #59 antigen runs AHEAD — a Kapae'd cross-operator draws Mu", () => {
  test("even a federatable plane draws Mu (false) for a Kapae'd presenter", async () => {
    const verdict = await selfSlotShareDecision({
      hasWsSocket: true, peerClass: "cross-operator", selfSlotFedGate: fedGate, antigenRing: antigen, membership: null, planeSeal: null, peerId: KAPAED_PEER, documentId: CROSSROADS,
    });
    expect(verdict).toBe(false);
  });
  test("a clean cross-operator still reaches the federatable plane with the antigen wired", async () => {
    const verdict = await selfSlotShareDecision({
      hasWsSocket: true, peerClass: "cross-operator", selfSlotFedGate: fedGate, antigenRing: antigen, membership: null, planeSeal: null, peerId: CROSS_PEER, documentId: CROSSROADS,
    });
    expect(verdict).toBe(true);
  });
});

describe("house members + boot edge", () => {
  test("an IN-PROCESS island peer full-syncs a private plane (no WS socket → house member)", async () => {
    const verdict = await selfSlotShareDecision({
      hasWsSocket: false, peerClass: undefined, selfSlotFedGate: fedGate, antigenRing: null, membership: null, planeSeal: null, peerId: "wiki-island", documentId: CATALOG_LIKE,
    });
    expect(verdict).toBe(true);
  });

  test("a gated peer whose fed gate has NOT yet stood is DENIED even a federatable plane (no boot-window leak)", async () => {
    const verdict = await selfSlotShareDecision({
      hasWsSocket: true, peerClass: "cross-operator", selfSlotFedGate: null, antigenRing: null, membership: null, planeSeal: null, peerId: CROSS_PEER, documentId: CROSSROADS,
    });
    expect(verdict).toBe(false);
  });
});

// ── THE CARRY-SPLIT — a MEMBER blind-transits a SEALED private plane; a STRANGER gets the public shelf ──
// A membership consult that names ONLY MEMBER_PEER a member; a seal oracle that marks ONLY SEALED_PLANE sealed.
const MEMBER_PEER  = "member-cross-peer";
const STRANGER_PEER = "stranger-cross-peer";
const membership: NexusMembership = { holdsCarriagePeer: (peerId) => peerId === MEMBER_PEER };
const SEALED_PLANE   = randomDocId();   // a private-own plane the seal oracle proves sealed (ciphertext)
const CLEARTEXT_PLANE = randomDocId();  // a private-own plane the seal oracle CANNOT prove sealed (plaintext)
const planeSeal: PlaneSeal = { isSealedPlane: (docId) => docId === SEALED_PLANE };

describe("the carry-split — the mesh BREATHES: a MEMBER blind-transits a sealed private plane", () => {
  const decide = (peerId: string, documentId: DocumentId | undefined) => selfSlotShareDecision({
    hasWsSocket: true, peerClass: "cross-operator", selfSlotFedGate: fedGate,
    antigenRing: null, membership, planeSeal, peerId, documentId,
  });

  test("a MEMBER blind-transits a SEALED private plane (carry TRUE — the ciphertext relays)", async () => {
    expect(await decide(MEMBER_PEER, SEALED_PLANE)).toBe(true);
  });
  test("a MEMBER is DENIED a CLEARTEXT-local private plane (encrypt-first — never carried)", async () => {
    expect(await decide(MEMBER_PEER, CLEARTEXT_PLANE)).toBe(false);
  });
  test("a MEMBER still reaches the federatable public shelf", async () => {
    expect(await decide(MEMBER_PEER, CROSSROADS)).toBe(true);
  });

  test("a STRANGER gets the public shelf ONLY — a SEALED private plane is DENIED (no sealed carriage)", async () => {
    expect(await decide(STRANGER_PEER, SEALED_PLANE)).toBe(false);
  });
  test("a STRANGER reaches the federatable public shelf", async () => {
    expect(await decide(STRANGER_PEER, CROSSROADS)).toBe(true);
  });
  test("a STRANGER is DENIED a cleartext private plane too", async () => {
    expect(await decide(STRANGER_PEER, CLEARTEXT_PLANE)).toBe(false);
  });
});

describe("the seal-guard fail-closed — DENY_ALL seal keeps the member lane INERT (today's wire)", () => {
  test("even a MEMBER cannot carry a private plane when planeSeal is null (no sealed plane provable)", async () => {
    const verdict = await selfSlotShareDecision({
      hasWsSocket: true, peerClass: "cross-operator", selfSlotFedGate: fedGate,
      antigenRing: null, membership, planeSeal: null, peerId: MEMBER_PEER, documentId: SEALED_PLANE,
    });
    expect(verdict).toBe(false);
  });
  test("with a null membership consult, every cross-operator is a STRANGER (no sealed carriage)", async () => {
    const verdict = await selfSlotShareDecision({
      hasWsSocket: true, peerClass: "cross-operator", selfSlotFedGate: fedGate,
      antigenRing: null, membership: null, planeSeal, peerId: MEMBER_PEER, documentId: SEALED_PLANE,
    });
    expect(verdict).toBe(false);
  });
});

describe("the read-lane stays absolute — a Kapae'd MEMBER draws Mu even for a sealed plane", () => {
  const kapaedMember = "kapaed-member";
  const antigenMember: AntigenRing = {
    kapaed: new Set(["beef".repeat(16)]),
    presenterNym: (peerId) => (peerId === kapaedMember ? "beef".repeat(16) : null),
  };
  const memberIncludingKapaed: NexusMembership = { holdsCarriagePeer: (peerId) => peerId === kapaedMember };

  test("a banned MEMBER cannot blind-transit even a sealed plane (Kapae stays ahead of the carry-split)", async () => {
    const verdict = await selfSlotShareDecision({
      hasWsSocket: true, peerClass: "cross-operator", selfSlotFedGate: fedGate,
      antigenRing: antigenMember, membership: memberIncludingKapaed, planeSeal, peerId: kapaedMember, documentId: SEALED_PLANE,
    });
    expect(verdict).toBe(false);
  });
});
