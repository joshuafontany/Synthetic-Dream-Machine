/**
 * LarVessel — causal island vessel contracts.
 *
 * LarVessel holds no content truth. It receives the assembled CompositeStore
 * (system → corpus:* → wiki → draft) from the factory. Relay and browser
 * vessels share the same class — capability presets encode the environmental
 * difference.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/v0.1/lararium/lar-vessel
 */

import { describe, test, expect } from "vitest";
import {
  LarVessel,
  LAR_VESSEL_CAPABILITIES_NODE,
  LAR_VESSEL_CAPABILITIES_BROWSER,
  LAR_VESSEL_CAPABILITIES_NONE,
  type OpenVesselOptions,
  type OpenVesselResult,
  OpenIdentitySlot,
  CompositeStore,
  BAG_IDS,
} from "../src/index.js";
import { MemoryTiddlerStore } from "../../lararium-tw5/src/memory-store.js";
import type { LarTiddlerChange } from "../src/tiddler-store.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeStore(): CompositeStore {
  const store = new CompositeStore();
  const wiki  = new MemoryTiddlerStore();
  store.addLayer({ bagId: BAG_IDS.lararium, store: wiki, writable: true });
  return store;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe("LarVessel — construction", () => {
  test("constructs with a CompositeStore and a vesselId", () => {
    const store = makeStore();
    const vessel  = new LarVessel({ vesselId: "altar-fire", store });
    expect(vessel.vesselId).toBe("altar-fire");
    expect(vessel.store).toBe(store);
  });

  test("vmPool starts null", () => {
    const vessel = new LarVessel({ vesselId: "p1", store: makeStore() });
    expect(vessel.vmPool).toBeNull();
    expect(vessel.ready).toBe(false);
  });

  test("attachVmPool makes vessel ready", () => {
    const vessel = new LarVessel({ vesselId: "p1", store: makeStore() });
    vessel.attachVmPool({ kind: "mock-pool" });
    expect(vessel.vmPool).toEqual({ kind: "mock-pool" });
    expect(vessel.ready).toBe(true);
  });

  test("dispose clears vmPool", () => {
    const vessel = new LarVessel({ vesselId: "p1", store: makeStore() });
    vessel.attachVmPool("pool");
    vessel.dispose();
    expect(vessel.vmPool).toBeNull();
    expect(vessel.ready).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Capability presets — symmetric node/browser/none
// ---------------------------------------------------------------------------

describe("LarVessel — capability presets", () => {
  test("LAR_VESSEL_CAPABILITIES_NODE: disk + relay + hostfulReactions", () => {
    expect(LAR_VESSEL_CAPABILITIES_NODE.diskAccess).toBe(true);
    expect(LAR_VESSEL_CAPABILITIES_NODE.persistentRelay).toBe(true);
    expect(LAR_VESSEL_CAPABILITIES_NODE.hostfulReactions).toBe(true);
    expect(LAR_VESSEL_CAPABILITIES_NODE.broadcastChannel).toBe(false);
  });

  test("LAR_VESSEL_CAPABILITIES_BROWSER: BC + no disk + no hostfulReactions", () => {
    expect(LAR_VESSEL_CAPABILITIES_BROWSER.diskAccess).toBe(false);
    expect(LAR_VESSEL_CAPABILITIES_BROWSER.broadcastChannel).toBe(true);
    expect(LAR_VESSEL_CAPABILITIES_BROWSER.hostfulReactions).toBe(false);
  });

  test("LAR_VESSEL_CAPABILITIES_NONE: all false", () => {
    for (const v of Object.values(LAR_VESSEL_CAPABILITIES_NONE)) {
      expect(v).toBe(false);
    }
  });

  test("vessel applies capability overrides from options", () => {
    const vessel = new LarVessel({
      vesselId: "p",
      store:  makeStore(),
      capabilities: { diskAccess: true, hostfulReactions: true },
    });
    expect(vessel.capabilities.diskAccess).toBe(true);
    expect(vessel.capabilities.broadcastChannel).toBe(false); // default
  });
});

// ---------------------------------------------------------------------------
// OpenIdentitySlot — DID-based identity (alpha open model)
// ---------------------------------------------------------------------------

describe("OpenIdentitySlot — DID shape", () => {
  test("DID encodes vesselId into did:web:elyncia.app/vessels/<id> namespace", () => {
    const slot = new OpenIdentitySlot("altar-fire");
    expect(slot.did).toContain("did:web:elyncia.app/vessels/");
    expect(slot.did).toContain("altar-fire");
  });

  test("deriveActorId returns a UUID-formatted string (stable per vesselId)", async () => {
    const slot = new OpenIdentitySlot("my-vessel");
    const id1  = await slot.deriveActorId();
    const id2  = await slot.deriveActorId();
    // UUID format: 8-4-4-4-12 hex groups
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(id1).toBe(id2); // deterministic
  });

  test("different vesselIds produce different actorIds", async () => {
    const a = await new OpenIdentitySlot("vessel-a").deriveActorId();
    const b = await new OpenIdentitySlot("vessel-b").deriveActorId();
    expect(a).not.toBe(b);
  });

  test("alpha open model: verifyCapability always returns true", async () => {
    const slot = new OpenIdentitySlot("any");
    expect(await slot.verifyCapability("automerge:xyz", "read")).toBe(true);
    expect(await slot.verifyCapability("automerge:xyz", "write")).toBe(true);
  });

  test("alpha open model: delegateCapability returns null token", async () => {
    const slot  = new OpenIdentitySlot("issuer");
    const token = await slot.delegateCapability("automerge:doc", "did:web:target", "read");
    expect(token).toBeNull();
  });

  test("vessel gets identity slot from vesselId when not provided", () => {
    const vessel = new LarVessel({ vesselId: "my-host", store: makeStore() });
    expect(vessel.identity.did).toContain("my-host");
  });
});

// ---------------------------------------------------------------------------
// addProjection — wires to the composite store subscribe
// ---------------------------------------------------------------------------

describe("LarVessel — addProjection", () => {
  test("projection receives changes from the store", async () => {
    const wiki  = new MemoryTiddlerStore();
    const composite = new CompositeStore();
    composite.addLayer({ bagId: BAG_IDS.lararium, store: wiki, writable: true });
    const vessel = new LarVessel({ vesselId: "p", store: composite });

    const changes: LarTiddlerChange[] = [];
    const unsub = vessel.addProjection({ onUriChanged: (c) => changes.push(c) });

    await wiki.put({ tiddler: { title: "lar:///test" } }, { kind: "crdt-remote", edgeIsland: "wiki" });
    unsub();

    expect(changes.some((c) => c.title === "lar:///test")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Operator-vessel contract — shared browser/node factory surface
// ---------------------------------------------------------------------------

describe("open-vessel contract — shared boot surface", () => {
  test("shared options carry host/wiki identity and optional VM factory", () => {
    const options: OpenVesselOptions = {
      hostId: "elyncia",
      wikiId: "altar-fire",
      recipeUri: "lar:///ha.ka.ba/@lararium/recipes/default",
    };

    expect(options.hostId).toBe("elyncia");
    expect(options.wikiId).toBe("altar-fire");
    expect(options.recipeUri).toContain("/recipes/default");
  });

  test("shared result surface exposes vessel/repo/store/pool symmetry", () => {
    const vessel = new LarVessel({ vesselId: "p", store: makeStore() });
    const result: OpenVesselResult<LarVessel<"pool">, "pool", { kind: "repo" }, CompositeStore> = {
      vessel,
      pool: "pool",
      repo: { kind: "repo" },
      store: vessel.store as CompositeStore,
      catalogHandleUrl: "automerge:catalog",
      larariumDocUrl: "automerge:island",
      phase: "live",
    };

    expect(result.vessel).toBe(vessel);
    expect(result.store).toBe(vessel.store);
    expect(result.phase).toBe("live");
  });
});
