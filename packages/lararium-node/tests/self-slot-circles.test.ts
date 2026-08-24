/**
 * self-slot-circles — @circles FLEET-syncs same-operator, NEVER federates to a stranger (STRUCTURAL).
 *
 * The operator ruling: the follow-graph rides the sovereign @circles Automerge doc, PRIVATE-but-fleet-synced
 * (matching @catalog) — a follow shows on ALL the operator's OWN devices, and NEVER on anyone else's. This
 * holds that posture structurally at the sharePolicy shore, no vessel booted:
 *
 *   · @circles is a PRIVATE bag: its random doc id sits OUTSIDE the DeterministicFederationGate's fixed
 *     federatable set {crossroads · who · kapae-antigen · members · persona-KEL}. A cross-operator peer is
 *     denied it even with the Nexus OPEN — only the public shelf crosses. (never-federates)
 *   · a SAME-OPERATOR WS peer full-syncs @circles (the device-fleet lane; empty relay ring → shared freely).
 *     (fleet-sync)
 *
 * A circles doc from ANOTHER key models @circles's own random private doc id — NOT in the gate built for
 * THIS Nexus, exactly as a private bag's id is not in the deterministic public set.
 */

import { describe, expect, test } from "vitest";
import { interpretAsDocumentId, type DocumentId } from "@automerge/automerge-repo";
import { DeterministicFederationGate, crossroadsDocUrl } from "@lararium/mesh";
import { selfSlotShareDecision } from "../src/self-slot-share.js";

const NEXUS   = "ab".repeat(32);           // this operator's Nexus key
const OTHER   = "cd".repeat(32);           // a different key — its doc models @circles's random private id
const gate    = new DeterministicFederationGate(NEXUS);
const crossroadsId  = interpretAsDocumentId(crossroadsDocUrl(NEXUS)) as DocumentId;   // the PUBLIC shelf
const circlesStandIn = interpretAsDocumentId(crossroadsDocUrl(OTHER)) as DocumentId;  // a PRIVATE-bag-shaped id

describe("@circles fleet-sync-but-never-federate (structural)", () => {
  test("the federatable set is the fixed public shelf — @circles is NOT in it", () => {
    expect(gate.mayFederate(crossroadsId)).toBe(true);    // the public shelf federates
    expect(gate.mayFederate(circlesStandIn)).toBe(false); // a private-bag id never does
  });

  test("a SAME-OPERATOR WS peer FLEET-syncs @circles (the device fleet)", async () => {
    const shared = await selfSlotShareDecision({
      hasWsSocket: true, peerClass: "same-operator",
      selfSlotFedGate: gate, antigenRing: null, membership: null, planeSeal: null,
      federationPosture: "private", peerId: "same-op-device", documentId: circlesStandIn,
    });
    expect(shared).toBe(true);   // the operator's own fleet carries every private plane, @circles included
  });

  test("a CROSS-OPERATOR peer is DENIED @circles even with the Nexus OPEN", async () => {
    const base = {
      hasWsSocket: true, peerClass: "cross-operator" as const,
      selfSlotFedGate: gate, antigenRing: null, membership: null, planeSeal: null,
      federationPosture: "open" as const, peerId: "stranger",
    };
    // The public shelf DOES cross under OPEN — proving the denial below is SELECTIVE, not a blanket block.
    expect(await selfSlotShareDecision({ ...base, documentId: crossroadsId })).toBe(true);
    // @circles never crosses to a stranger — the follow-graph stays home.
    expect(await selfSlotShareDecision({ ...base, documentId: circlesStandIn })).toBe(false);
  });

  test("a CROSS-OPERATOR peer is denied @circles under a PRIVATE Nexus too", async () => {
    const denied = await selfSlotShareDecision({
      hasWsSocket: true, peerClass: "cross-operator",
      selfSlotFedGate: gate, antigenRing: null, membership: null, planeSeal: null,
      federationPosture: "private", peerId: "stranger", documentId: circlesStandIn,
    });
    expect(denied).toBe(false);
  });
});
