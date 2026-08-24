/**
 * gate-widening.test.ts — the DaemonAuthGate widening, proven END-TO-END against Wardwright's LIVE
 * self-slot split (no synthetic peerClass in the braid).
 *
 * The dormancy this activates: the self-slot downstream (DeterministicFederationGate · peerClassMap ·
 * selfSlotShareDecision's cross-operator branch) already stood, but the verify chain NEVER produced a
 * "cross-operator" class — a foreign operator was DENIED at the gate (verifyPeer's terminal denial), so it
 * could never reach the sharePolicy. The widening flips that terminal denial into a BOUNDED cross-operator
 * admission via `classifyCrossOperatorAdmission`. This test drives the REAL classifier → feeds its class into
 * the REAL selfSlotShareDecision over the REAL DeterministicFederationGate + deterministic doc urls, so the
 * whole braid runs live:
 *   · a valid, proof-carrying FOREIGN identity → classified cross-operator → reaches crossroads/WHO/antigen,
 *     but is DENIED catalog/personal (the widening grants NOTHING beyond the federatable set),
 *   · a FOREIGN identity that cannot prove possession → DENIED admission (fail-closed on the widened surface),
 *   · a SAME-OPERATOR peer keeps FULL device sync — the classifier is never reached for it (no regression),
 *   · a Kapae'd cross-operator draws Mu even for a federatable plane (the #59 antigen ahead).
 *
 * Gate: lar:///ha.ka.ba/lararium/mesh/carry-contract#carry-read-contract
 */
import { describe, test, expect } from "vitest";
import { interpretAsDocumentId, stringifyAutomergeUrl, type BinaryDocumentId, type DocumentId } from "@automerge/automerge-repo";
import { randomBytes } from "node:crypto";
import {
  DeterministicFederationGate, classifyCrossOperatorAdmission,
  crossroadsDocUrl, whoBoardDocUrl, kapaeAntigenDocUrl,
  type AntigenRing,
} from "@lararium/mesh";
import { selfSlotShareDecision } from "../src/self-slot-share.js";

// This vessel's operator identity (its Nexus pubkey) — the federatable planes derive from it.
const MY_NEXUS = "1122334455667788990011223344556677889900112233445566778899001122";
const fedGate  = new DeterministicFederationGate(MY_NEXUS);

const docIdOf = (url: string): DocumentId => interpretAsDocumentId(url as never) as DocumentId;

// The FEDERATABLE-own planes (a cross-operator MAY reach these).
const CROSSROADS = docIdOf(crossroadsDocUrl(MY_NEXUS));
const WHO_BOARD  = docIdOf(whoBoardDocUrl(MY_NEXUS));
const ANTIGEN    = docIdOf(kapaeAntigenDocUrl(MY_NEXUS));

// The PRIVATE-own planes (a cross-operator must NEVER reach these) — random ids, never the deterministic set.
const randomDocId = (): DocumentId => docIdOf(stringifyAutomergeUrl({ documentId: new Uint8Array(randomBytes(16)) as BinaryDocumentId }));
const CATALOG_LIKE  = randomDocId();
const PERSONAL_LIKE = randomDocId();

const FOREIGN_PEER = "foreign-operator-peer";

describe("the classifier — a proof-carrying FOREIGN identity earns the BOUNDED cross-operator class", () => {
  test("proofVerified → admit at the cross-operator federatable-carry tier", () => {
    const v = classifyCrossOperatorAdmission(true);
    expect(v.ok).toBe(true);
    expect(v.peerClass).toBe("cross-operator");
  });

  test("it NEVER hands back same-operator (the widening cannot manufacture full-sync)", () => {
    expect(classifyCrossOperatorAdmission(true).peerClass).not.toBe("same-operator");
  });

  test("FAIL-CLOSED — no proven possession → DENY admission (no cross-operator class)", () => {
    const v = classifyCrossOperatorAdmission(false);
    expect(v.ok).toBe(false);
    expect(v.peerClass).toBeUndefined();
  });
});

describe("END-TO-END — the classified cross-operator reaches the federatable set, DENIED the private planes", () => {
  // The BRAID: the REAL classifier decides the class; the REAL self-slot decision consumes it.
  const admit = classifyCrossOperatorAdmission(true);
  const share = (documentId: DocumentId | undefined, antigenRing: AntigenRing | null = null) =>
    selfSlotShareDecision({
      hasWsSocket: true, peerClass: admit.peerClass, selfSlotFedGate: fedGate,
      antigenRing, peerId: FOREIGN_PEER, documentId,
    });

  test("crossroads crosses (MANDATORY public/infra carriage)", async () => { expect(await share(CROSSROADS)).toBe(true); });
  test("the WHO board crosses", async () => { expect(await share(WHO_BOARD)).toBe(true); });
  test("the kapae-antigen board crosses (MANDATORY immune carriage)", async () => { expect(await share(ANTIGEN)).toBe(true); });

  test("a catalog-like PRIVATE plane is DENIED — the widening grants NOTHING beyond readcrossroads", async () => {
    expect(await share(CATALOG_LIKE)).toBe(false);
  });
  test("a personal-like PRIVATE plane is DENIED", async () => { expect(await share(PERSONAL_LIKE)).toBe(false); });
  test("a no-doc-id decision is DENIED (deny-by-default)", async () => { expect(await share(undefined)).toBe(false); });
});

describe("no-same-operator-regression — a SAME-OPERATOR peer keeps FULL device sync", () => {
  // The classifier is only reached AFTER admindaemon fails + no valid edge, so a same-operator admit never
  // routes through it. Proven structurally here: the live self-slot decision full-syncs a same-operator peer.
  const same = (documentId: DocumentId) => selfSlotShareDecision({
    hasWsSocket: true, peerClass: "same-operator", selfSlotFedGate: fedGate, antigenRing: null,
    peerId: "own-device-peer", documentId,
  });
  test("a PRIVATE plane (catalog-like) still crosses to my own device", async () => { expect(await same(CATALOG_LIKE)).toBe(true); });
  test("a PRIVATE plane (personal-like) still crosses to my own device", async () => { expect(await same(PERSONAL_LIKE)).toBe(true); });
  test("a federatable plane crosses too", async () => { expect(await same(CROSSROADS)).toBe(true); });
});

describe("the #59 antigen runs AHEAD — a Kapae'd cross-operator draws Mu", () => {
  const KAPAED_PEER = "kapaed-foreign-peer";
  const KAPAED_NYM  = "dead".repeat(16);
  const antigen: AntigenRing = {
    kapaed: new Set([KAPAED_NYM]),
    presenterNym: (peerId) => (peerId === KAPAED_PEER ? KAPAED_NYM : null),
  };
  const admit = classifyCrossOperatorAdmission(true);

  test("even a federatable plane draws Mu (false) for a Kapae'd cross-operator", async () => {
    const verdict = await selfSlotShareDecision({
      hasWsSocket: true, peerClass: admit.peerClass, selfSlotFedGate: fedGate,
      antigenRing: antigen, peerId: KAPAED_PEER, documentId: CROSSROADS,
    });
    expect(verdict).toBe(false);
  });
  test("a clean cross-operator still reaches the federatable plane with the antigen wired", async () => {
    const verdict = await selfSlotShareDecision({
      hasWsSocket: true, peerClass: admit.peerClass, selfSlotFedGate: fedGate,
      antigenRing: antigen, peerId: FOREIGN_PEER, documentId: CROSSROADS,
    });
    expect(verdict).toBe(true);
  });
});
