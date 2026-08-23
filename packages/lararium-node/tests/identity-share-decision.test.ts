/**
 * identity-share-decision.test.ts — the #58 COMPOSED gate against the real WASM.
 *
 * identityShareDecision layers the #49 federation gate (OUTER ring) OVER a real
 * KeyhiveIdentitySlot's capability barrier (INNER ring), deny-by-default with AND
 * semantics. These cases are the proof the OpenIdentitySlot socket could never
 * give — the composed decision DENIES an undelegated peer's doc-share and ALLOWS
 * a delegated one, both verdicts riding genuine Keyhive accessForDoc crypto.
 *
 * Mirrors federation-gate.test.ts (the ring shape) ∪ keyhive-identity-slot.test.ts
 * (two real KeyhiveProviders exchange cards, A grants, the slot for the audience
 * verifies). In-process, real keyhive WASM — no crypto stubbed.
 */

import { describe, test, expect } from "vitest";
import {
  interpretAsDocumentId, stringifyAutomergeUrl,
  type BinaryDocumentId, type DocumentId, type PeerId,
} from "@automerge/automerge-repo";
import {
  DeterministicFederationGate, identityShareDecision, type IdentityRing,
} from "@lararium/mesh";
import { KeyhiveProvider, KeyhiveIdentitySlot } from "@lararium/keyhive";

const memStore = () => ({ put: async () => {}, list: async () => [] });
const NX  = "abcdef0123456789";
const BAG = "lar:///ha.ka.ba/bags/test/identity-share-decision";
const RELAY = "relay-peer" as PeerId;

/** A stable AutomergeUrl + its DocumentId for the shared bag — the doc the relay asks for. */
function bagDoc(): { url: string; id: DocumentId } {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = (i * 37 + 11) & 0xff;   // fixed, not random — a stable board
  const url = stringifyAutomergeUrl({ documentId: bytes as BinaryDocumentId });
  return { url, id: interpretAsDocumentId(url as never) as DocumentId };
}

describe("identityShareDecision — the #49 fed gate OVER the real Keyhive barrier", () => {
  test("DENIES an undelegated peer's doc-share, ALLOWS a delegated one (composed, real crypto)", async () => {
    const A = new KeyhiveProvider();   // grantor
    const B = new KeyhiveProvider();   // delegated audience — SHOULD clear
    const C = new KeyhiveProvider();   // known agent, NEVER delegated — SHOULD deny
    await A.init({ seed: new Uint8Array(32).fill(7),  eventStore: memStore() });
    await B.init({ seed: new Uint8Array(32).fill(9),  eventStore: memStore() });
    await C.init({ seed: new Uint8Array(32).fill(11), eventStore: memStore() });
    try {
      const { id: bId } = await A.receiveContactCard(await B.contactCard());
      const { id: cId } = await A.receiveContactCard(await C.contactCard());
      await A.registerBag(BAG);
      await A.delegate({ audience: bId, bagUrl: BAG, access: "read" });

      const doc = bagDoc();
      // The fed gate must federate this doc so the OUTER ring passes and the INNER
      // ring (the cap barrier) becomes the deciding factor — an extra public board.
      const fedGate   = new DeterministicFederationGate(NX, [doc.url as never]);
      const relayPeers = new Set<string>([RELAY]);

      const ringFor = (did: string): IdentityRing => ({
        slot: new KeyhiveIdentitySlot({ provider: A, did }),
        bagUrlForDoc: (d) => (d === doc.id ? BAG : null),
      });

      // ALLOW: the delegated audience clears BOTH rings.
      expect(await identityShareDecision(relayPeers, fedGate, ringFor(bId), RELAY, doc.id)).toBe(true);

      // DENY: a never-delegated agent passes the fed gate (public board) but the
      // INNER cap barrier refuses — the composition denies (AND semantics).
      expect(await identityShareDecision(relayPeers, fedGate, ringFor(cId), RELAY, doc.id)).toBe(false);
    } finally {
      await A.dispose();
      await B.dispose();
      await C.dispose();
    }
  });

  test("the OUTER fed gate still denies a private doc even when the INNER barrier would clear", async () => {
    const A = new KeyhiveProvider();
    const B = new KeyhiveProvider();
    await A.init({ seed: new Uint8Array(32).fill(7), eventStore: memStore() });
    await B.init({ seed: new Uint8Array(32).fill(9), eventStore: memStore() });
    try {
      const { id: bId } = await A.receiveContactCard(await B.contactCard());
      await A.registerBag(BAG);
      await A.delegate({ audience: bId, bagUrl: BAG, access: "read" });

      // A PRIVATE doc — NOT one of the fed gate's federatable boards.
      const priv = bagDoc();
      const fedGate    = new DeterministicFederationGate(NX);   // no extra boards → priv is private
      const relayPeers = new Set<string>([RELAY]);
      const ring: IdentityRing = {
        slot: new KeyhiveIdentitySlot({ provider: A, did: bId }),
        bagUrlForDoc: () => BAG,   // the inner barrier WOULD clear (bId holds read)...
      };
      // ...but the outer ring never lets the private doc reach it → DENY.
      expect(await identityShareDecision(relayPeers, fedGate, ring, RELAY, priv.id)).toBe(false);
    } finally {
      await A.dispose();
      await B.dispose();
    }
  });

  test("a null inner ring degenerates EXACTLY to the fed gate (the socket stays inert)", async () => {
    const doc = bagDoc();
    const fedGate    = new DeterministicFederationGate(NX, [doc.url as never]);
    const relayPeers = new Set<string>([RELAY]);
    // Public board → fed gate allows; no inner ring → that verdict is the whole decision.
    expect(await identityShareDecision(relayPeers, fedGate, null, RELAY, doc.id)).toBe(true);
    // A private doc with no inner ring → fed gate denies.
    const priv = bagDoc();
    const fedGate2 = new DeterministicFederationGate(NX);
    expect(await identityShareDecision(relayPeers, fedGate2, null, RELAY, priv.id)).toBe(false);
  });
});
