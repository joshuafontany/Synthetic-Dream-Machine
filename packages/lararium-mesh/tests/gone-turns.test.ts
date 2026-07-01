/**
 * gone-turns — the rewind detector primitive: turn-uuids the index holds but the live transcript
 * dropped (a rewound/edited message). Pure set-diff, order = first-seen-in-prev, dedup + empty-drop.
 */
import { describe, test, expect } from "vitest";
import {
  detectGoneTurns,
  reconstructCurrentBranch,
  rewindOrphanUuids,
  liveKeysForRewind,
  detectGoneTurnsOnBranch,
  type BranchNode,
  type KeyedBranchNode,
} from "../src/index.js";

/** A tiny transcript-record builder for the branch tests. */
function node(uuid: string, parentUuid: string | null, type = "assistant", isSidechain = false): BranchNode {
  return { uuid, parentUuid, type, isSidechain };
}
function keyed(uuid: string, parentUuid: string | null, type = "assistant", isSidechain = false): KeyedBranchNode {
  return { uuid, parentUuid, type, isSidechain, key: uuid };
}

describe("detectGoneTurns — prev (index) minus current (live transcript)", () => {
  test("a turn in the index but absent from the live transcript reads as gone", () => {
    expect(detectGoneTurns(["a", "b", "c"], ["a", "c"])).toEqual(["b"]);
  });

  test("nothing gone when the live transcript still carries every indexed turn", () => {
    expect(detectGoneTurns(["a", "b"], ["a", "b", "c"])).toEqual([]);
  });

  test("order follows first appearance in prev; duplicates + empties dropped", () => {
    expect(detectGoneTurns(["x", "x", "", "y", "z"], ["z"])).toEqual(["x", "y"]);
  });

  test("an empty current ⇒ every indexed turn is gone (a wholesale rewind)", () => {
    expect(detectGoneTurns(["a", "b"], [])).toEqual(["a", "b"]);
  });

  test("an empty prev ⇒ nothing to reconcile", () => {
    expect(detectGoneTurns([], ["a"])).toEqual([]);
  });
});

describe("reconstructCurrentBranch — walk parentUuid from the live leaf to the root", () => {
  test("a linear transcript reconstructs root → leaf in order", () => {
    const recs = [node("R", null, "user"), node("A", "R"), node("B", "A", "user"), node("C", "B")];
    expect(reconstructCurrentBranch(recs)).toEqual(["R", "A", "B", "C"]);
  });

  test("a /rewind leaves the rewound tail OFF the current branch (the flat-read blind spot)", () => {
    // R→A→B is the old branch; after /rewind, D re-parents off A and becomes the live leaf. B orphaned.
    const recs = [node("R", null, "user"), node("A", "R"), node("B", "A"), node("D", "A")];
    expect(reconstructCurrentBranch(recs)).toEqual(["R", "A", "D"]);
  });

  test("sidechains are filtered from the main branch", () => {
    const recs = [node("R", null, "user"), node("S", "R", "assistant", true), node("A", "R")];
    expect(reconstructCurrentBranch(recs)).toEqual(["R", "A"]);
  });
});

describe("rewindOrphanUuids — same-type re-issue vs benign stream-split", () => {
  test("a SAME-TYPE sibling (a real re-issue) marks the orphaned tail", () => {
    // A carries two assistant children: B (orphaned) and D (on-branch, the re-issue).
    const recs = [node("R", null, "user"), node("A", "R"), node("B", "A"), node("D", "A")];
    expect([...rewindOrphanUuids(recs)]).toEqual(["B"]);
  });

  test("the whole orphaned SUB-TREE is marked, not just the divergence root", () => {
    const recs = [node("R", null, "user"), node("A", "R"), node("B", "A"), node("C", "B"), node("D", "A")];
    expect([...rewindOrphanUuids(recs)].sort()).toEqual(["B", "C"]);
  });

  test("a DIFFERENT-type sibling (a stream-split) is NOT a rewind", () => {
    // A (assistant) carries X (assistant, orphaned) + Y (user, on-branch) — normal continue→reply flow.
    const recs = [node("R", null, "user"), node("A", "R"), node("X", "A", "assistant"), node("Y", "A", "user")];
    expect([...rewindOrphanUuids(recs)]).toEqual([]);
  });
});

describe("liveKeysForRewind + detectGoneTurnsOnBranch — the wired refinement", () => {
  test("the rewound tail reads gone against the prior index (found via parentUuid)", () => {
    const recs = [keyed("R", null, "user"), keyed("A", "R"), keyed("B", "A"), keyed("D", "A")];
    const live = liveKeysForRewind(recs);
    expect(live.has("B")).toBe(false); // the orphaned re-issue is not live
    expect(live.has("D")).toBe(true);
    expect(detectGoneTurns(["R", "A", "B"], live)).toEqual(["B"]);
  });

  test("a stream-split orphan stays LIVE — never false-positives as gone", () => {
    const recs = [keyed("R", null, "user"), keyed("A", "R"), keyed("X", "A", "assistant"), keyed("Y", "A", "user")];
    const live = liveKeysForRewind(recs);
    expect(live.has("X")).toBe(true);
    expect(detectGoneTurns(["R", "A", "X"], live)).toEqual([]);
  });

  test("a wholesale rewind (prior keys absent from the transcript) reads every prior turn gone", () => {
    const recs = [node("N", null, "user")]; // a fresh branch, none of the old uuids present
    expect(detectGoneTurnsOnBranch(["old1", "old2"], recs).sort()).toEqual(["old1", "old2"]);
  });

  test("un-uuid'd records always count live (never false-gone)", () => {
    const recs: KeyedBranchNode[] = [{ uuid: "", parentUuid: null, type: "user", key: "hash-abc" }];
    expect(liveKeysForRewind(recs).has("hash-abc")).toBe(true);
  });
});
