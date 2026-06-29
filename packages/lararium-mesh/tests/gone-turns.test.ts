/**
 * gone-turns — the rewind detector primitive: turn-uuids the index holds but the live transcript
 * dropped (a rewound/edited message). Pure set-diff, order = first-seen-in-prev, dedup + empty-drop.
 */
import { describe, test, expect } from "vitest";
import { detectGoneTurns } from "../src/index.js";

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
