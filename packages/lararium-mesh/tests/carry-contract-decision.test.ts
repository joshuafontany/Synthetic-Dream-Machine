/**
 * carry-contract-decision.test.ts — the #59 WIRE: the antigen peer-consult layered ahead of the #58
 * composition.
 *
 * Proven:
 *   · a Kapae'd presenter draws `false` (the Mu the caller emits) — the additive deny fires,
 *   · a non-Kapae'd presenter DEFERS to the existing gate (carry-per-contract),
 *   · a null antigen ring degenerates EXACTLY to identityShareDecision (zero behavior change),
 *   · an UNRESOLVABLE presenter is NOT denied here (deny-by-default lives at the fed gate, not the antigen),
 *   · the antigen board rides the federatable surface.
 */
import { describe, test, expect } from "vitest";
import { interpretAsDocumentId, type DocumentId } from "@automerge/automerge-repo";
import {
  DeterministicFederationGate, carryContractShareDecision, identityShareDecision,
  presenterIsKapaed, type AntigenRing,
} from "../src/federation-gate.js";
import { crossroadsDocUrl, kapaeAntigenDocUrl } from "../src/deterministic-doc.js";

const NX = "abcdef0123456789";
const docIdOf = (url: string): DocumentId => interpretAsDocumentId(url as never) as DocumentId;

const KAPAED_PEER = "peer-kapaed";
const CLEAN_PEER  = "peer-clean";
const KAPAED_NYM  = "cafebabe".repeat(8);

/** A ring that resolves KAPAED_PEER → a Kapae'd nym, CLEAN_PEER → a clean nym, all else → null. */
const antigen: AntigenRing = {
  kapaed: new Set([KAPAED_NYM]),
  presenterNym: (peerId) =>
    peerId === KAPAED_PEER ? KAPAED_NYM : peerId === CLEAN_PEER ? "0".repeat(64) : null,
};

const relayPeers = new Set([KAPAED_PEER, CLEAN_PEER, "peer-unknown"]);

describe("presenterIsKapaed — additive, never fail-closed-deny on unknown", () => {
  test("a Kapae'd presenter reads true", () => {
    expect(presenterIsKapaed(antigen, KAPAED_PEER)).toBe(true);
  });
  test("a clean presenter reads false", () => {
    expect(presenterIsKapaed(antigen, CLEAN_PEER)).toBe(false);
  });
  test("an unresolvable presenter reads false (NOT a deny — the fed gate holds deny-by-default)", () => {
    expect(presenterIsKapaed(antigen, "peer-unknown")).toBe(false);
  });
  test("a null ring reads false", () => {
    expect(presenterIsKapaed(null, KAPAED_PEER)).toBe(false);
  });
});

describe("carryContractShareDecision — the antigen deny layered ahead of #58", () => {
  const fedGate = new DeterministicFederationGate(NX);
  const crossroads = docIdOf(crossroadsDocUrl(NX));   // a federatable public board

  test("a Kapae'd presenter draws `false` even for a federatable board (Mu)", async () => {
    const verdict = await carryContractShareDecision(relayPeers, fedGate, antigen, null, KAPAED_PEER, crossroads);
    expect(verdict).toBe(false);
  });

  test("a clean presenter DEFERS to the gate → the federatable board crosses", async () => {
    const verdict = await carryContractShareDecision(relayPeers, fedGate, antigen, null, CLEAN_PEER, crossroads);
    expect(verdict).toBe(true);
  });

  test("a clean presenter still cannot pull a PRIVATE plane (fed gate deny-by-default holds)", async () => {
    const privateDoc = docIdOf(crossroadsDocUrl("some-other-nexus"));
    const verdict = await carryContractShareDecision(relayPeers, fedGate, antigen, null, CLEAN_PEER, privateDoc);
    expect(verdict).toBe(false);
  });

  test("a null antigen ring degenerates EXACTLY to identityShareDecision", async () => {
    for (const [peer, doc] of [[KAPAED_PEER, crossroads], [CLEAN_PEER, crossroads]] as const) {
      const withAntigen = await carryContractShareDecision(relayPeers, fedGate, null, null, peer, doc);
      const baseline    = await identityShareDecision(relayPeers, fedGate, null, peer, doc);
      expect(withAntigen).toBe(baseline);
    }
  });
});

describe("the antigen board rides the federatable surface (MANDATORY carry)", () => {
  test("DeterministicFederationGate federates the Kapae-antigen board", () => {
    const gate = new DeterministicFederationGate(NX);
    expect(gate.mayFederate(docIdOf(kapaeAntigenDocUrl(NX)))).toBe(true);
  });
});
