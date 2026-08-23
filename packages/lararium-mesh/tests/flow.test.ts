import { describe, test, expect } from "vitest";
import {
  FLOW_SEEDS, flowSeedByPetname, buildFlowTiddler, parseCapStack, flowUri,
  flowIsEnactable, enactableFlows, HULLS_TS_ONLY, HULLS_FULL,
  type FlowTiddler,
} from "../src/flow.js";
import { DAEMON_BAG_ID } from "../src/lar-uris.js";

// The Flow surface: a pet-name IS the address; a flow is a composed cap-stack + targeting,
// stored as a daemon tiddler and called by ONE verb. These assert the schema, not a compute.

describe("flow — pet-named cap-stacks that kill verb sprawl", () => {
  test("flowUri addresses a flow by its pet-name in the daemon bag", () => {
    expect(flowUri("crystal")).toBe(`${DAEMON_BAG_ID}/flows/crystal`);
    expect(flowUri("rhythm")).toBe(`${DAEMON_BAG_ID}/flows/rhythm`);
  });

  test("the seed flow-set is the small learnable surface — every seed carries a one-line summary", () => {
    expect(FLOW_SEEDS.length).toBeGreaterThanOrEqual(3);
    for (const seed of FLOW_SEEDS) {
      expect(seed.summary.length).toBeGreaterThan(0);        // the anti-sprawl doc-line
      expect(seed.capStack.length).toBeGreaterThan(0);        // a flow composes ≥1 instrument
      expect(["one", "many"]).toContain(seed.arity);
    }
    // the two new capabilities land as FLOWS, not raw verbs
    expect(flowSeedByPetname("rhythm")?.arity).toBe("one");
    expect(flowSeedByPetname("crystal")?.arity).toBe("many");  // the two-stream / two-mind comparison
  });

  test("the couple flow composes the whole cap-stack (whiten → couple → gate → mismatch)", () => {
    const couple = flowSeedByPetname("couple")!;
    expect(couple.capStack.map((s) => s.instrument)).toEqual(["whiten", "couple", "gate", "mismatch"]);
    // the mismatch honesty-check runs daemon-side (the one seat reaching both hulls)
    expect(couple.capStack.find((s) => s.instrument === "mismatch")?.hull).toBe("daemon");
  });

  test("buildFlowTiddler stamps a seed into a stored tiddler — title from the pet-name, daemon bag", () => {
    const t: FlowTiddler = buildFlowTiddler(flowSeedByPetname("crystal")!, "did:key:zTest", "2026-07-24T00:00:00Z");
    expect(t.title).toBe(flowUri("crystal"));
    expect(t.bag).toBe(DAEMON_BAG_ID);
    expect(t.authority).toBe("did:key:zTest");
    expect(t.petname).toBe("crystal");
  });

  test("cap-gating — a vessel seeds/advertises only the flows its hulls can enact", () => {
    // ts-only vessel (browser) → crystal enacts (all-ts); rhythm (py) + couple (daemon) do NOT
    expect(flowIsEnactable(flowSeedByPetname("crystal")!, HULLS_TS_ONLY)).toBe(true);
    expect(flowIsEnactable(flowSeedByPetname("rhythm")!, HULLS_TS_ONLY)).toBe(false);   // a py step
    expect(flowIsEnactable(flowSeedByPetname("couple")!, HULLS_TS_ONLY)).toBe(false);   // a daemon step
    expect(enactableFlows(HULLS_TS_ONLY).map((f) => f.petname)).toEqual(["crystal"]);
    // a full (node) vessel reaches py + daemon → it enacts every seed
    expect(enactableFlows(HULLS_FULL).map((f) => f.petname).sort()).toEqual(["couple", "crystal", "rhythm"]);
  });

  test("parseCapStack round-trips both storage shapes (JSON array + compact TW5 list)", () => {
    const arr = parseCapStack([{ instrument: "phase", hull: "py" }, { instrument: "lens", hull: "py", note: "n" }]);
    expect(arr).toEqual([{ instrument: "phase", hull: "py" }, { instrument: "lens", hull: "py", note: "n" }]);
    const list = parseCapStack("whiten:ts couple:ts mismatch:daemon");
    expect(list.map((s) => s.instrument)).toEqual(["whiten", "couple", "mismatch"]);
    expect(list[2]!.hull).toBe("daemon");
    // garbage / bad hull tokens drop, never throw
    expect(parseCapStack("bad:xx nohull").length).toBe(0);
    expect(parseCapStack(null)).toEqual([]);
  });
});
