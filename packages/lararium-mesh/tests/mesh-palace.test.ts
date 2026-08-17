/**
 * mesh-palace — the federated FLOW-map store's pure core.
 *
 * Proves the load-bearing properties of the first scaffold:
 *   - each record kind (dial · vessel cap-stack · routing slot) round-trips
 *     through a LarDoc tiddler, and decode never throws (returns null);
 *   - hold ≠ express (a vessel advertises only its lit wire-caps);
 *   - the disclosure shore keeps only the coarse public FLOW (dial@public +
 *     routes), dropping the private territory (vessel-local dials, held caps);
 *   - the public FLOW-map publishes as a content-addressed snapshot (rehash
 *     verifies; a tamper is a different name) — the Two-Faced read-face.
 * Canon: lar:///ha.ka.ba/lararium/mesh/vessel-caps
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
  hyperbolicDistance, angularSeparation, greedyNextHop, radialCoordinate, bearingVector,
  gravityPressureNextHop, GP_GRAVITY, type GpState,
  seedTheta, childCone, coneCenter, ROOT_CONE, type Coord,
  hermCanRead, HERM_CAPS,
  MeshPalace, emptyMeshPalaceDoc,
  bagOf,
  type DialEntry, type VesselCapStack, type RoutingSlot, type MeshPalaceDoc,
} from "../src/mesh-palace.js";
import { deriveMeshSelf, deriveMeshLeaf, meshSelfDial, meshSelfSeed } from "../src/carriage-caps.js";

const AUTH = "lar:///ha.ka.ba/bags/@meshpalace/test";

describe("MeshSelf — the leaf↔full tier is ONE field (endpoint present-vs-absent)", () => {
  test("a full node advertises a dial; a leaf carries-in but has no reachable endpoint", () => {
    const full = deriveMeshSelf("http://node:8080", ["http://boot:8080"]);
    expect(full.endpoint).toBe("http://node:8080");
    expect(meshSelfDial(full)).toBeDefined();            // full node → a dial peers can reach
    expect(meshSelfSeed(full)).toHaveLength(1);
    const leaf = deriveMeshLeaf("browser-origin-xyz", ["http://relay:8080"]);
    expect(leaf.endpoint).toBeUndefined();               // a LEAF has NO reachable endpoint (not dial-able)
    expect(leaf.peers).toEqual(["http://relay:8080"]);   // …yet it still carries-in
    expect(leaf.coord.r).toBeGreaterThanOrEqual(0);      // …and holds a coord for the proximity re-rank
    expect(meshSelfDial(leaf)).toBeUndefined();          // no dial
    expect(meshSelfSeed(leaf)).toEqual([]);              // → no self-announce seed
    expect(leaf.bearing).toContain("@oracle/leaf/");     // its own leaf identity
  });
});

function docOf(records: LarTiddlerRecord[]): LarDoc {
  const tiddlers: Record<string, LarTiddlerRecord> = {};
  for (const r of records) tiddlers[r.tiddler.title] = r;
  return { schemaVersion: "0.1", tiddlers };
}

describe("mesh-palace records round-trip", () => {
  test("a dial-record survives encode → decode", () => {
    const e: DialEntry = {
      bearing: "lar:///ha.ka.ba/bags/@daemon",
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
    const s: RoutingSlot = { bearing: "lar:///ha.ka.ba/bags/@daemon", r: 12.5, theta: 3.14159 };
    expect(recordToRoutingSlot(routingSlotToRecord(s, AUTH))).toEqual(s);
  });

  test("decode never throws on a foreign / malformed record (returns null)", () => {
    const foreign = { tiddler: { title: "x", kind: "wat" }, meta: { authority: AUTH } } as LarTiddlerRecord;
    expect(recordToDialEntry(foreign)).toBeNull();
    expect(recordToVesselCapStack(null)).toBeNull();
    expect(recordToRoutingSlot(undefined)).toBeNull();
  });
});

describe("the disclosure shore", () => {
  test("keeps coarse public FLOW, drops the private territory", () => {
    const publicDial: DialEntry  = { bearing: "lar:///ha.ka.ba/bags/@oracle",  verifyingKeyHex: "b".repeat(64), endpoint: "ws://relay/1", scale: "dreamnet" };
    const localDial:  DialEntry  = { bearing: "lar:///ha.ka.ba/bags/@daemon",  verifyingKeyHex: "c".repeat(64), endpoint: "ws://local/2" }; // no scale → local
    const route:      RoutingSlot = { bearing: "lar:///ha.ka.ba/bags/@oracle", r: 4, theta: 1 };
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
      dialEntryToRecord({ bearing: "lar:///ha.ka.ba/bags/@oracle", verifyingKeyHex: "d".repeat(64), endpoint: "ws://relay/x", scale: "nexus" }, AUTH),
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

    palace.putDial({ bearing: "lar:///ha.ka.ba/bags/@oracle", verifyingKeyHex: "e".repeat(64), endpoint: "ws://relay/p", scale: "dreamnet" });
    palace.putDial({ bearing: "lar:///ha.ka.ba/bags/@daemon", verifyingKeyHex: "f".repeat(64), endpoint: "ws://local/q" }); // no scale → local
    palace.putVessel({ vesselId: "v9", held: ["tuber", "rhizome"], expressed: ["rhizome.forward"] });
    palace.putRoute({ bearing: "lar:///ha.ka.ba/bags/@oracle", r: 7, theta: 2 });

    expect(palace.getDial("lar:///ha.ka.ba/bags/@oracle")?.endpoint).toBe("ws://relay/p");
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

describe("greedy geometric routing — the native-disk chart", () => {
  test("hyperbolic distance matches known geodesics", () => {
    expect(hyperbolicDistance({ r: 0, theta: 0 }, { r: 0, theta: 0 })).toBeCloseTo(0);
    // same angle → |r₁ − r₂|
    expect(hyperbolicDistance({ r: 1, theta: 0.5 }, { r: 3, theta: 0.5 })).toBeCloseTo(2);
    // from the center → the other's radius
    expect(hyperbolicDistance({ r: 0, theta: 0 }, { r: 2.5, theta: 1 })).toBeCloseTo(2.5);
    // antipodal θ, equal r → 2r (the geodesic runs through the center)
    expect(hyperbolicDistance({ r: 1.5, theta: 0 }, { r: 1.5, theta: Math.PI })).toBeCloseTo(3);
    // symmetric
    const a: Coord = { r: 1, theta: 0.3 }, b: Coord = { r: 2, theta: 1.1 };
    expect(hyperbolicDistance(a, b)).toBeCloseTo(hyperbolicDistance(b, a));
  });

  test("angular separation wraps the cyclic θ the short way", () => {
    expect(angularSeparation(0, Math.PI)).toBeCloseTo(Math.PI);
    expect(angularSeparation(0.1, 2 * Math.PI - 0.1)).toBeCloseTo(0.2);
  });

  test("greedy picks the neighbor that makes progress; null at a local minimum", () => {
    const dest: Coord = { r: 3, theta: 0 };
    const self: Coord = { r: 1, theta: 1.0 };
    const neighbors = [
      { bearing: "lar:///ha.ka.ba/bags/@a", r: 2,   theta: 0.2 },  // toward dest
      { bearing: "lar:///ha.ka.ba/bags/@b", r: 0.5, theta: 2.5 },  // away
    ];
    expect(greedyNextHop(self, neighbors, dest)?.bearing).toBe("lar:///ha.ka.ba/bags/@a");

    // a neighbor sitting AT the destination wins outright
    const atDest = { bearing: "lar:///ha.ka.ba/bags/@d", r: 3, theta: 0 };
    expect(greedyNextHop(self, [atDest], dest)?.bearing).toBe("lar:///ha.ka.ba/bags/@d");

    // local minimum: self already near dest, no neighbor improves → null (caller direct-dials)
    const nearDest: Coord = { r: 3, theta: 0.01 };
    const farOnly = [{ bearing: "lar:///ha.ka.ba/bags/@x", r: 0.1, theta: 3 }];
    expect(greedyNextHop(nearDest, farOnly, dest)).toBeNull();
  });

  test("radial coordinate seats high-carriage near the center, leaves at the rim", () => {
    const opts = { R: 12, minDegree: 1 };
    expect(radialCoordinate(1, opts)).toBeCloseTo(12);                            // a min-degree leaf → the rim
    expect(radialCoordinate(10, opts)).toBeLessThan(radialCoordinate(1, opts));   // more carriage → nearer center
    expect(radialCoordinate(2, opts)).toBeGreaterThan(radialCoordinate(8, opts)); // monotone decreasing
    expect(radialCoordinate(1e6, opts)).toBeGreaterThanOrEqual(0);                // clamped onto the disk
  });

  test("gravityPressureNextHop — greedy until a local minimum, then pressure delivers (no dead-end)", () => {
    const slot = (bearing: string, r: number, theta: number): RoutingSlot => ({ bearing, r, theta });
    const dest = { r: 0, theta: 0 }; // the origin
    // GRAVITY: forwards to the neighbour closest to dest
    const g = gravityPressureNextHop({ r: 3, theta: 0 }, "@self", [slot("@near", 1, 0), slot("@far", 5, 0)], dest, GP_GRAVITY);
    expect(g.next?.bearing).toBe("@near");
    // LOCAL MINIMUM → PRESSURE: no neighbour beats self, yet ALWAYS a hop; the valley is recorded
    const p = gravityPressureNextHop({ r: 1, theta: 0 }, "@self", [slot("@a", 5, 0), slot("@b", 6, 0)], dest, GP_GRAVITY);
    expect(p.next).not.toBeNull();
    expect(p.state.valleyDist).toBeCloseTo(hyperbolicDistance({ r: 1, theta: 0 }, dest));
    // PRESSURE forwards to the LEAST-visited neighbour
    const pressured: GpState = { visits: { "@a": 3, "@b": 1 }, valleyDist: 0.5 };
    expect(gravityPressureNextHop({ r: 1, theta: 0 }, "@self", [slot("@a", 5, 0), slot("@b", 5, 0.1)], dest, pressured).next?.bearing).toBe("@b");
    // RECOVER: closer than the valley → back to gravity (greedy)
    const rec = gravityPressureNextHop({ r: 0.5, theta: 0 }, "@self", [slot("@near", 0.1, 0), slot("@far", 5, 0)], dest, { visits: {}, valleyDist: 2.0 });
    expect(rec.state.valleyDist).toBe(Infinity);
    expect(rec.next?.bearing).toBe("@near");
    // the only dead-end: zero neighbours
    expect(gravityPressureNextHop({ r: 1, theta: 0 }, "@self", [], dest, GP_GRAVITY).next).toBeNull();
  });

  test("bearingVector — the log-map L2 store-vector: ‖v‖ = r, origin → 0, radially-aligned L2 == geodesic", () => {
    expect(bearingVector({ r: 0, theta: 1.2 })).toEqual([0, 0]);                  // origin maps to 0
    const v = bearingVector({ r: 2.5, theta: 0.7 });
    expect(Math.hypot(v[0], v[1])).toBeCloseTo(2.5, 9);                            // ‖v‖ = r (the geodesic radial)
    // radially-aligned (same θ) → L2 EXACTLY equals hyperbolicDistance — the recall basis for the L2 ANN
    const a = { r: 1.0, theta: 0.4 }, b = { r: 3.0, theta: 0.4 };
    const [ax, ay] = bearingVector(a), [bx, by] = bearingVector(b);
    expect(Math.hypot(ax - bx, ay - by)).toBeCloseTo(hyperbolicDistance(a, b), 9); // = |r₁−r₂| = 2
  });

  test("seedTheta samples the cyclic [0, 2π) — content-blind by construction", () => {
    expect(seedTheta(() => 0)).toBeCloseTo(0);
    expect(seedTheta(() => 0.5)).toBeCloseTo(Math.PI);
    const t = seedTheta(() => 0.999);
    expect(t).toBeGreaterThanOrEqual(0);
    expect(t).toBeLessThan(2 * Math.PI);
  });

  test("the tree-cone subdivides, nests, and centers — greedy descends the tree", () => {
    const kids = [0, 1, 2, 3].map((i) => childCone(ROOT_CONE, i, 4));
    expect(kids[0]).toEqual({ start: 0, end: Math.PI / 2 });           // tiles the circle…
    expect(kids[3]).toEqual({ start: 3 * Math.PI / 2, end: 2 * Math.PI }); // …disjoint + covering
    // a descendant NESTS inside its ancestor (the greedy-descent property)
    const parent = childCone(ROOT_CONE, 1, 2);   // [π, 2π)
    const grandchild = childCone(parent, 0, 2);  // [π, 3π/2)
    expect(grandchild.start).toBeGreaterThanOrEqual(parent.start);
    expect(grandchild.end).toBeLessThanOrEqual(parent.end);
    // a node's θ is its cone's center
    expect(coneCenter(childCone(ROOT_CONE, 0, 4))).toBeCloseTo(Math.PI / 4);
  });
});

describe("the Herm read-scope (Lares Viales) — sighted on the map, blind to the territory", () => {
  test("a Herm reads the public waymarks, never the sovereign hearths", () => {
    // sighted on the map — the public floor
    expect(hermCanRead("lar:///ha.ka.ba/bags/@oracle/blobs/tiddlywikicore")).toBe(true);
    expect(hermCanRead("lar:///ha.ka.ba/bags/@meshpalace/dial/x")).toBe(true);
    expect(hermCanRead("lar:///ha.ka.ba/lares/api/pono/has-stack")).toBe(true);
    expect(hermCanRead("lar:///ha.ka.ba/lararium/mesh/vessel-caps")).toBe(true);
    // blind to the territory — the operator's sovereign hearths
    expect(hermCanRead("lar:///ha.ka.ba/bags/@catalog/corpus/private")).toBe(false);
    expect(hermCanRead("lar:///ha.ka.ba/bags/@persona/binding/signer-did")).toBe(false);
    expect(hermCanRead("lar:///ha.ka.ba/bags/@daemon/sentinel/mesh-cabal/doc-id")).toBe(false);
    // fail-closed on the unknown / unparseable
    expect(hermCanRead("lar:///ha.ka.ba/bags/@some-operator-bag/x")).toBe(false);
    expect(hermCanRead("not-a-lar-uri")).toBe(false);
  });

  test("a Herm expresses pure carriage — no tuber sovereignty", () => {
    expect(HERM_CAPS).toContain("rhizome.forward");
    expect(HERM_CAPS).not.toContain("tuber.author");
    expect(HERM_CAPS).not.toContain("tuber.store");
  });
});

describe("★ the classifier REFUSES what the grammar never declared ★", () => {
  // An exclusion list is an enumeration. Excluding `wikis` and `cid` — the two kinds the grammar declares
  // — and coercing everything else into `@segment` handed a bag identity to every kind minted WITHOUT a
  // kind-segment. The reads then failed closed only because the caller's allowlist happened not to name
  // those: the right verdict by accident of a list, from a classifier giving the wrong answer.
  test("★ a bag surface names its bag ★", () => {
    expect(bagOf("lar:///ha.ka.ba/bags/@daemon/flows/crystal")).toBe("@daemon");
    expect(bagOf("lar:///ha.ka.ba/bags/@lares")).toBe("@lares");
  });

  test("a meme namespace belongs to the bag of the same name", () => {
    expect(bagOf("lar:///ha.ka.ba/lares/api/pono/persona-circle")).toBe("@lares");
    expect(bagOf("lar:///ha.ka.ba/lararium/mesh/open-vessel")).toBe("@lararium");
  });

  test("★ every kind that names NO bag answers undefined, never a bag it never had ★", () => {
    expect(bagOf("lar:///ha.ka.ba/tags/SharktoothSigil")).toBeUndefined();      // a tag
    expect(bagOf("lar:///ha.ka.ba/state/boot-splash/active")).toBeUndefined();  // vessel state
    expect(bagOf("lar:///ha.ka.ba/sentinel/persona-group")).toBeUndefined();   // a membership document
    expect(bagOf("lar:///ha.ka.ba/sentinel/kahu-cabal")).toBeUndefined();         // a membership document
    expect(bagOf("lar:///ha.ka.ba/wikis/@notes")).toBeUndefined();              // a wiki identity
    expect(bagOf("lar:///ha.ka.ba/cid/abc123")).toBeUndefined();                // a content body
  });

  test("a Herm reads none of those either — the verdict now follows the classifier, not luck", () => {
    expect(hermCanRead("lar:///ha.ka.ba/sentinel/persona-group")).toBe(false);
    expect(hermCanRead("lar:///ha.ka.ba/tags/SharktoothSigil")).toBe(false);
    expect(hermCanRead("lar:///ha.ka.ba/lares/api/pono/persona-circle")).toBe(true);  // a waymark still crosses
  });
});
