/**
 * mesh-palace — the federated FLOW-map store's pure core.
 *
 * Proves the load-bearing properties of the first scaffold:
 *   - each record kind (dial · vessel cap-stack · routing slot) round-trips
 *     through a LarDoc tiddler, and decode never throws (returns null);
 *   - hold ≠ express (a vessel advertises only its lit wire-caps);
 *   - the disclosure membrane keeps only the coarse public FLOW (dial@public +
 *     routes), dropping the private territory (vessel-local dials, held caps);
 *   - the public FLOW-map publishes as a content-addressed snapshot (rehash
 *     verifies; a tamper is a different name) — the Two-Faced read-face.
 * Canon: lar:///ha.ka.ba/@lararium/mesh/vessel-caps
 */

import { describe, test, expect } from "vitest";
import { Repo } from "@automerge/automerge-repo";
import type { LarDoc } from "../src/base-doc.js";
import type { LarTiddlerRecord } from "../src/tiddler-store.js";
import { verifyOracleSnapshotBytes } from "../src/oracle-substrate.js";
import {
  CARRIAGE_CAPS, VESSEL_CAPS, isCap, isCarriageCap, isVesselCap,
  dialEntryToRecord, recordToDialEntry,
  vesselCapStackToRecord, recordToVesselCapStack,
  routingSlotToRecord, recordToRoutingSlot,
  publicFlowMap, snapshotPublicFlowMap,
  MeshPalace, emptyMeshPalaceDoc,
  type DialEntry, type VesselCapStack, type RoutingSlot, type MeshPalaceDoc,
} from "../src/mesh-palace.js";

const AUTH = "lar:///ha.ka.ba/@meshpalace/test";

function docOf(records: LarTiddlerRecord[]): LarDoc {
  const tiddlers: Record<string, LarTiddlerRecord> = {};
  for (const r of records) tiddlers[r.tiddler.title] = r;
  return { schemaVersion: "0.1", tiddlers };
}

describe("mesh-palace records round-trip", () => {
  test("a dial-record survives encode → decode", () => {
    const e: DialEntry = {
      bearing: "lar:///ha.ka.ba/@daemon",
      verifyingKeyHex: "a".repeat(64),
      endpoint: "ws://127.0.0.1:8080/ws",
      scale: "dreamnet",
      expiry: 1_900_000_000_000,
    };
    expect(recordToDialEntry(dialEntryToRecord(e, AUTH))).toEqual(e);
  });

  test("a vessel cap-stack round-trips, and hold ≠ express", () => {
    const v: VesselCapStack = {
      vesselId: "vessel-abc",
      held: ["tuber", "rhizome", "bulb"],     // the genome
      expressed: ["tuber.author"],            // only the lit wire-cap
    };
    const back = recordToVesselCapStack(vesselCapStackToRecord(v, AUTH));
    expect(back).toEqual(v);
    // a held carriage cap (rhizome) is NOT advertised unless expressed
    expect(back?.expressed).not.toContain("rhizome.forward");
  });

  test("a routing slot round-trips its (r, θ)", () => {
    const s: RoutingSlot = { bearing: "lar:///ha.ka.ba/@daemon", r: 12.5, theta: 3.14159 };
    expect(recordToRoutingSlot(routingSlotToRecord(s, AUTH))).toEqual(s);
  });

  test("decode never throws on a foreign / malformed record (returns null)", () => {
    const foreign = { tiddler: { title: "x", kind: "wat" }, meta: { authority: AUTH } } as LarTiddlerRecord;
    expect(recordToDialEntry(foreign)).toBeNull();
    expect(recordToVesselCapStack(null)).toBeNull();
    expect(recordToRoutingSlot(undefined)).toBeNull();
  });
});

describe("the disclosure membrane", () => {
  test("keeps coarse public FLOW, drops the private territory", () => {
    const publicDial: DialEntry  = { bearing: "lar:///ha.ka.ba/@oracle",  verifyingKeyHex: "b".repeat(64), endpoint: "ws://relay/1", scale: "dreamnet" };
    const localDial:  DialEntry  = { bearing: "lar:///ha.ka.ba/@daemon",  verifyingKeyHex: "c".repeat(64), endpoint: "ws://local/2" }; // no scale → local
    const route:      RoutingSlot = { bearing: "lar:///ha.ka.ba/@oracle", r: 4, theta: 1 };
    const vessel:     VesselCapStack = { vesselId: "v1", held: ["tuber"], expressed: ["tuber.author"] };

    const full = docOf([
      dialEntryToRecord(publicDial, AUTH),
      dialEntryToRecord(localDial, AUTH),
      routingSlotToRecord(route, AUTH),
      vesselCapStackToRecord(vessel, AUTH),
    ]);
    expect(Object.keys(full.tiddlers)).toHaveLength(4);

    const pub = publicFlowMap(full);
    const titles = Object.keys(pub.tiddlers);
    expect(titles).toHaveLength(2);                                   // only the public dial + the route cross
    expect(pub.tiddlers).toHaveProperty(dialEntryToRecord(publicDial, AUTH).tiddler.title);
    expect(pub.tiddlers).toHaveProperty(routingSlotToRecord(route, AUTH).tiddler.title);
    // the private territory never crosses:
    expect(pub.tiddlers).not.toHaveProperty(dialEntryToRecord(localDial, AUTH).tiddler.title);
    expect(pub.tiddlers).not.toHaveProperty(vesselCapStackToRecord(vessel, AUTH).tiddler.title);
  });
});

describe("the public read-face (Two-Faced Substrate)", () => {
  test("the FLOW-map publishes as a content-addressed snapshot; tamper is a different name", async () => {
    const full = docOf([
      dialEntryToRecord({ bearing: "lar:///ha.ka.ba/@oracle", verifyingKeyHex: "d".repeat(64), endpoint: "ws://relay/x", scale: "nexus" }, AUTH),
    ]);
    const snap = await snapshotPublicFlowMap(full);
    expect(await verifyOracleSnapshotBytes(snap.bytes, snap.cid)).toBe(true);
    const tampered = new Uint8Array(snap.bytes); tampered[tampered.length - 1] ^= 0xff;
    expect(await verifyOracleSnapshotBytes(tampered, snap.cid)).toBe(false);
  });
});

describe("the live MeshPalace surface", () => {
  test("put/get round-trips through a real DocHandle; the public snapshot verifies", async () => {
    const repo = new Repo({ sharePolicy: async () => true });
    const handle = repo.create<MeshPalaceDoc>(emptyMeshPalaceDoc());
    const palace = new MeshPalace(handle, AUTH);

    palace.putDial({ bearing: "lar:///ha.ka.ba/@oracle", verifyingKeyHex: "e".repeat(64), endpoint: "ws://relay/p", scale: "dreamnet" });
    palace.putDial({ bearing: "lar:///ha.ka.ba/@daemon", verifyingKeyHex: "f".repeat(64), endpoint: "ws://local/q" }); // no scale → local
    palace.putVessel({ vesselId: "v9", held: ["tuber", "rhizome"], expressed: ["rhizome.forward"] });
    palace.putRoute({ bearing: "lar:///ha.ka.ba/@oracle", r: 7, theta: 2 });

    expect(palace.getDial("lar:///ha.ka.ba/@oracle")?.endpoint).toBe("ws://relay/p");
    expect(palace.dials()).toHaveLength(2);
    expect(palace.vessels()[0]?.expressed).toEqual(["rhizome.forward"]);
    expect(palace.routes()).toHaveLength(1);

    // the public projection drops the local dial + the vessel cap-stack
    expect(Object.keys(palace.publicProjection().tiddlers)).toHaveLength(2);

    const snap = await palace.exportPublicSnapshot();
    expect(await verifyOracleSnapshotBytes(snap.bytes, snap.cid)).toBe(true);
  });
});

describe("the cap vocabulary", () => {
  test("five caps in two families crossing AUTHORITY ⊥ FLOW", () => {
    expect([...CARRIAGE_CAPS]).toEqual(["rhizome", "stolon"]);
    expect([...VESSEL_CAPS]).toEqual(["tuber", "bulb", "corm"]);
    expect(isCarriageCap("rhizome")).toBe(true);
    expect(isVesselCap("tuber")).toBe(true);
    expect(isCap("relay")).toBe(false);   // "relay" is the machinery; "rhizome" is the cap
  });
});
