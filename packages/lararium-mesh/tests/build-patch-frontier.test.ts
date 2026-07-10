/**
 * build-patch — the worldline HANDLE branch-frontier. A same-session FORK (a transcript turn
 * with two children in the parentUuid turn-DAG) makes both branches derive the same `run`
 * handle → worldlineClockFor folds two timelines into one (the collision). A branch-frontier
 * component keyed into the run-handle keeps the two forks DISTINCT; a normal spawn is
 * UNAFFECTED (no frontier ⇒ byte-identical to before).
 *
 * Meme: lar:///ha.ka.ba/lararium/api/agent-worldline#name (the rhizome fork-cut)
 */

import { describe, test, expect } from "vitest";
import { buildPatch, harvestTurnGradient, deriveBranchFrontier } from "../src/index.js";

const h = () => harvestTurnGradient("Lares (Mapper): the verb leads");
const MAIN = "claude__sessXYZ.jsonl"; // a main-agent transcript: <surface>__<run>.jsonl
const SPIRIT = "Mapper__agent-abc123__run-sessXYZ.jsonl"; // a spirit: <name>__agent-<id>__run-<run>.jsonl

describe("deriveBranchFrontier — stable, order-independent, dependency-free token", () => {
  test("a single divergence uuid yields an 8-hex token", () => {
    const t = deriveBranchFrontier({ frontier: "turn-uuid-1" });
    expect(t).toMatch(/^[0-9a-f]{8}$/);
  });

  test("a head SET is order-independent (sorted before folding)", () => {
    const a = deriveBranchFrontier({ frontier: ["u1", "u2", "u3"] });
    const b = deriveBranchFrontier({ frontier: ["u3", "u1", "u2"] });
    expect(a).toBe(b);
  });

  test("distinct frontiers yield distinct tokens; absent/empty yields null", () => {
    expect(deriveBranchFrontier({ frontier: "u1" })).not.toBe(deriveBranchFrontier({ frontier: "u2" }));
    expect(deriveBranchFrontier(undefined)).toBeNull();
    expect(deriveBranchFrontier({})).toBeNull();
    expect(deriveBranchFrontier({ frontier: [] })).toBeNull();
    expect(deriveBranchFrontier({ frontier: "" })).toBeNull();
  });
});

describe("main-agent root handle — two same-session forks stop colliding", () => {
  test("no frontier ⇒ the root handle is exactly the run (unaffected)", () => {
    const p = buildPatch(h(), MAIN);
    expect(p["lar_agent_handle"]).toBe("sessXYZ");
    expect(p["lar_root_handle"]).toBe("sessXYZ");
  });

  test("two forks of ONE session derive DISTINCT root handles", () => {
    const forkA = buildPatch(h(), MAIN, { frontier: "turnA" });
    const forkB = buildPatch(h(), MAIN, { frontier: "turnB" });
    expect(forkA["lar_agent_handle"]).not.toBe(forkB["lar_agent_handle"]);
    expect(forkA["lar_root_handle"]).not.toBe(forkB["lar_root_handle"]);
    // both still carry the run prefix (the branch-specific run `run~frontier`)
    expect(String(forkA["lar_agent_handle"])).toMatch(/^sessXYZ~[0-9a-f]{8}$/);
  });
});

describe("spirit handle — the frontier rides the RUN component, parent/root follow", () => {
  test("no frontier ⇒ handle = run.agentId, parent/root = run (unaffected spawn)", () => {
    const p = buildPatch(h(), SPIRIT);
    expect(p["lar_agent_handle"]).toBe("sessXYZ.abc123"); // run.agentId (the pet-name is lar_agent)
    expect(p["lar_parent_handle"]).toBe("sessXYZ");
    expect(p["lar_root_handle"]).toBe("sessXYZ");
  });

  test("a forked session: the spirit handle + its parent/root all branch-key", () => {
    const p = buildPatch(h(), SPIRIT, { frontier: "turnA" });
    const front = deriveBranchFrontier({ frontier: "turnA" });
    expect(p["lar_agent_handle"]).toBe(`sessXYZ~${front}.abc123`);
    // the run component (split on ".") carries the frontier, so the spirit attributes to
    // the branch-specific root — not the colliding shared run
    expect(p["lar_parent_handle"]).toBe(`sessXYZ~${front}`);
    expect(p["lar_root_handle"]).toBe(`sessXYZ~${front}`);
  });

  test("two same-session spirit forks derive DISTINCT handles", () => {
    const a = buildPatch(h(), SPIRIT, { frontier: "turnA" });
    const b = buildPatch(h(), SPIRIT, { frontier: "turnB" });
    expect(a["lar_agent_handle"]).not.toBe(b["lar_agent_handle"]);
    expect(a["lar_parent_handle"]).not.toBe(b["lar_parent_handle"]);
  });
});
