/**
 * dom-input-bound.test — the text leg crosses the island boundary BOUNDED, or it does not cross.
 *
 * The click leg states an explicit primitives-only allowlist (GP-2). Text rides its own kind rather than
 * widening that allowlist, so two properties need pinning and these tests pin both: the click path keeps
 * exactly the shape it had, and the text path carries one field, one type, one bound — refused at the
 * island door, which is the single gate every island message passes.
 */
import { describe, test, expect } from "vitest";
import {
  boundedDomInputValue, mkWikiDomInput, mkWikiDomEvent, isVesselToIslandMsg,
  DOM_INPUT_MAX_CHARS, ISLAND_PROTOCOL_VERSION,
} from "../src/island-protocol.js";

describe("the bounded text leg", () => {
  test("a value within the bound reads back whole; the bound itself stands", () => {
    expect(boundedDomInputValue("a tiddler body")).toBe("a tiddler body");
    expect(boundedDomInputValue("")).toBe("");
    expect(boundedDomInputValue("x".repeat(DOM_INPUT_MAX_CHARS))).toHaveLength(DOM_INPUT_MAX_CHARS);
  });

  test("one character past the bound REFUSES — fail-closed, never truncated", () => {
    expect(boundedDomInputValue("x".repeat(DOM_INPUT_MAX_CHARS + 1))).toBeNull();
  });

  test("anything that is not a string refuses — the field carries text, never a smuggled shape", () => {
    for (const v of [null, undefined, 7, true, {}, [], { toString: () => "x" }]) {
      expect(boundedDomInputValue(v)).toBeNull();
    }
  });

  test("the send shore throws on an over-long value, where the stack still names the caller", () => {
    expect(() => mkWikiDomInput({ renderId: "1", eventType: "input", value: "x".repeat(DOM_INPUT_MAX_CHARS + 1) }))
      .toThrow(/at most/);
    expect(mkWikiDomInput({ renderId: "1", eventType: "input", value: "hi" })).toEqual({
      schema_version: ISLAND_PROTOCOL_VERSION, type: "wiki:dom-input", renderId: "1", eventType: "input", value: "hi",
    });
  });

  test("THE ISLAND DOOR refuses an over-long arrival — no behavior, no cap, no TW5 handler sees it", () => {
    const inBound = { schema_version: ISLAND_PROTOCOL_VERSION, type: "wiki:dom-input", renderId: "1", eventType: "input", value: "hi" };
    expect(isVesselToIslandMsg(inBound)).toBe(true);
    expect(isVesselToIslandMsg({ ...inBound, value: "x".repeat(DOM_INPUT_MAX_CHARS + 1) })).toBe(false);
    // A sender that omits the field, or sends a non-string in it, fails the same door the same way.
    expect(isVesselToIslandMsg({ ...inBound, value: undefined })).toBe(false);
    expect(isVesselToIslandMsg({ ...inBound, value: { length: 3 } })).toBe(false);
    expect(isVesselToIslandMsg({ ...inBound, value: 42 })).toBe(false);
  });

  test("the CLICK path keeps its primitives-only shape — the text kind widened nothing", () => {
    const click = mkWikiDomEvent({ renderId: "1", eventType: "click", fields: { button: 0, metaKey: false } });
    expect(isVesselToIslandMsg(click)).toBe(true);
    expect(Object.keys(click)).toEqual(["schema_version", "type", "renderId", "eventType", "fields"]);
    expect("value" in click).toBe(false);
  });
});
