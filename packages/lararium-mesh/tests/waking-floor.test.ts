/**
 * What a vessel stands as when its archive will not open.
 *
 * The starred tests carry the two rulings. A hearth whose archive holds shut must still STAND — refusing
 * turns a power cut into an outage — and it must stand as the class that is faceless BY LAW, not as a
 * hearth with its faces quietly missing.
 */
import { describe, expect, test } from "vitest";

import { personaSlotCeiling, standAs, standsAtFloor } from "../src/vessel-standing.js";

describe("★ every node stands first as a Herm ★", () => {
  test("★ a hearth whose archive holds shut STANDS — at the floor, never refusing ★", () => {
    // Refusing converts an ordinary restart into an outage. The seal exists against a stolen disk, never
    // to gate a power cut.
    const st = standAs("hearth", false);
    expect(st.cls).toBe("herm");
    expect(st.reason).toBe("archive-sealed-shut");
  });

  test("★ standing at the floor is FACELESS BY LAW, not a hearth missing its faces ★", () => {
    // The class carries the guarantee structurally: no dial raises a Herm's ceiling, so a vessel at the
    // floor cannot stand a persona root even by mistake.
    const st = standAs("hearth", false);
    expect(personaSlotCeiling(st.cls)).toBe(0);
    expect(personaSlotCeiling(st.cls, 99)).toBe(0);
  });

  test("an open archive stands the class that was asked for — the operator lit the fire", () => {
    expect(standAs("hearth", true)).toEqual({ cls: "hearth", reason: "as-asked" });
    expect(standAs("leaf", true)).toEqual({ cls: "leaf", reason: "as-asked" });
  });

  test("a Herm stands as asked whatever the archive says — nothing about it waits on a raise", () => {
    expect(standAs("herm", false)).toEqual({ cls: "herm", reason: "as-asked" });
    expect(standAs("herm", true)).toEqual({ cls: "herm", reason: "as-asked" });
  });
});

describe("the announcement can tell the two Herms apart", () => {
  test("★ a floor-standing vessel reads DIFFERENTLY from a vessel that IS a Herm ★", () => {
    // Both are Herms and both are correct; only one is waiting for a key. An announcement that could not
    // tell them apart would either alarm a crossroads operator or hide a hearth's waiting.
    expect(standsAtFloor(standAs("hearth", false))).toBe(true);
    expect(standsAtFloor(standAs("herm", false))).toBe(false);
  });
});
