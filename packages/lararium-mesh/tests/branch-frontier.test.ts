/**
 * branch-frontier — the fork detector over a parentUuid turn-DAG, end-to-end through buildPatch.
 *
 * Proves slice-2's frontier-FEED: a forked transcript DAG → distinct per-branch frontiers →
 * (fed to buildPatch's 3rd arg) → distinct handles. Slice-1 made buildPatch ABLE; this makes it DO.
 */
import { describe, test, expect } from "vitest";
import {
  buildChildIndex,
  findBranchPoints,
  branchContextForTurn,
  buildPatch,
  harvestTurnGradient,
  type TurnNode,
} from "../src/index.js";

const h = () => harvestTurnGradient("a plain turn, no instruments");

/** A forked session: root r → a; a forks into b1 and b2 (the branch point); each extends. */
const FORKED: TurnNode[] = [
  { uuid: "r", parentUuid: null },
  { uuid: "a", parentUuid: "r" },
  { uuid: "b1", parentUuid: "a" }, // branch 1 head
  { uuid: "b2", parentUuid: "a" }, // branch 2 head (a has ≥2 children → fork)
  { uuid: "c1", parentUuid: "b1" }, // deeper on branch 1
  { uuid: "c2", parentUuid: "b2" }, // deeper on branch 2
];

describe("fork detection over the parentUuid DAG", () => {
  test("buildChildIndex counts distinct children, dedups repeated edges", () => {
    const idx = buildChildIndex([...FORKED, { uuid: "b1", parentUuid: "a" }]);
    expect(idx.get("a")?.sort()).toEqual(["b1", "b2"]);
    expect(idx.get("r")).toEqual(["a"]);
  });

  test("findBranchPoints flags the parent with ≥2 children", () => {
    const forks = findBranchPoints(FORKED);
    expect(forks.has("a")).toBe(true);
    expect(forks.has("r")).toBe(false);
    expect(forks.size).toBe(1);
  });

  test("a linear (unforked) DAG has no branch points and no frontier", () => {
    const linear: TurnNode[] = [
      { uuid: "r", parentUuid: null },
      { uuid: "a", parentUuid: "r" },
      { uuid: "b", parentUuid: "a" },
    ];
    expect(findBranchPoints(linear).size).toBe(0);
    expect(branchContextForTurn(linear, "b")).toBeUndefined();
  });
});

describe("branchContextForTurn — the per-turn frontier", () => {
  test("siblings of one fork get DISTINCT frontiers (their own branch choice)", () => {
    const f1 = branchContextForTurn(FORKED, "c1");
    const f2 = branchContextForTurn(FORKED, "c2");
    expect(f1?.frontier).toEqual(["b1"]);
    expect(f2?.frontier).toEqual(["b2"]);
  });

  test("the branch heads themselves carry their own choice", () => {
    expect(branchContextForTurn(FORKED, "b1")?.frontier).toEqual(["b1"]);
    expect(branchContextForTurn(FORKED, "b2")?.frontier).toEqual(["b2"]);
  });

  test("a turn ABOVE the fork (the common ancestor) carries no frontier", () => {
    expect(branchContextForTurn(FORKED, "a")).toBeUndefined();
    expect(branchContextForTurn(FORKED, "r")).toBeUndefined();
  });

  test("nested forks accumulate (the set of all branch choices on the path)", () => {
    // a forks (b1/b2); b1 forks again (d1/d2).
    const nested: TurnNode[] = [
      ...FORKED,
      { uuid: "d1", parentUuid: "c1" },
      { uuid: "d2", parentUuid: "c1" }, // c1 now a fork
      { uuid: "e", parentUuid: "d1" },
    ];
    const f = branchContextForTurn(nested, "e");
    expect(f?.frontier?.slice().sort()).toEqual(["b1", "d1"]);
  });

  test("a parent cycle terminates (cycle-safe)", () => {
    const cyclic: TurnNode[] = [
      { uuid: "x", parentUuid: "y" },
      { uuid: "y", parentUuid: "x" },
    ];
    expect(() => branchContextForTurn(cyclic, "x")).not.toThrow();
  });
});

describe("END-TO-END: forked DAG → branchContextForTurn → buildPatch → DISTINCT handles", () => {
  // The two branches are the SAME session run, so the source_file run-part collides.
  const MAIN = "claude__sessRUN.jsonl";
  const SPIRIT = "Scout__agent-abc123__run-sessRUN.jsonl";

  test("main-agent: two branches mint distinct root handles", () => {
    const pa = buildPatch(h(), MAIN, branchContextForTurn(FORKED, "c1"));
    const pb = buildPatch(h(), MAIN, branchContextForTurn(FORKED, "c2"));
    expect(pa["lar_agent_handle"]).not.toBe(pb["lar_agent_handle"]);
    expect(String(pa["lar_agent_handle"])).toMatch(/^sessRUN~[0-9a-f]{8}$/);
    expect(String(pb["lar_root_handle"])).toMatch(/^sessRUN~[0-9a-f]{8}$/);
  });

  test("spirit: two branches mint distinct lineage handles AND distinct parents", () => {
    const pa = buildPatch(h(), SPIRIT, branchContextForTurn(FORKED, "c1"));
    const pb = buildPatch(h(), SPIRIT, branchContextForTurn(FORKED, "c2"));
    expect(pa["lar_agent_handle"]).not.toBe(pb["lar_agent_handle"]);
    expect(pa["lar_parent_handle"]).not.toBe(pb["lar_parent_handle"]);
    expect(String(pa["lar_agent_handle"])).toMatch(/^sessRUN~[0-9a-f]{8}\.abc123$/);
  });

  test("the common-ancestor turn (no fork) leaves the handle byte-identical to unforked", () => {
    const above = buildPatch(h(), MAIN, branchContextForTurn(FORKED, "a"));
    const unforked = buildPatch(h(), MAIN);
    expect(above["lar_agent_handle"]).toBe(unforked["lar_agent_handle"]);
    expect(above["lar_agent_handle"]).toBe("sessRUN");
  });
});
