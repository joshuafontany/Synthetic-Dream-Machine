/**
 * What a vessel stands as when its archive will not open.
 *
 * The starred tests carry the two rulings. A hearth whose archive holds shut must still STAND — refusing
 * turns a power cut into an outage — and it must stand as the class that is faceless BY LAW, not as a
 * hearth with its faces quietly missing.
 */
import { describe, expect, test } from "vitest";

import { personaSlotCeiling, standAs } from "../src/vessel-standing.js";

describe("★ every node stands first as a Herm ★", () => {
  test("★ a hearth whose archive holds shut STANDS — at the floor, never refusing ★", () => {
    // Refusing converts an ordinary restart into an outage. The seal exists against a stolen disk, never
    // to gate a power cut.
    expect(standAs("hearth", false)).toBe("herm");
  });

  test("★ standing at the floor is FACELESS BY LAW, not a hearth missing its faces ★", () => {
    // The class carries the guarantee structurally: no dial raises a Herm's ceiling, so a vessel at the
    // floor cannot stand a persona root even by mistake.
    const cls = standAs("hearth", false);
    expect(personaSlotCeiling(cls)).toBe(0);
    expect(personaSlotCeiling(cls, 99)).toBe(0);
  });

  test("an open archive stands the class that was asked for — the operator lit the fire", () => {
    expect(standAs("hearth", true)).toBe("hearth");
    expect(standAs("leaf", true)).toBe("leaf");
  });

  test("a Herm stands as asked whatever the archive says — nothing about it waits on a raise", () => {
    expect(standAs("herm", false)).toBe("herm");
    expect(standAs("herm", true)).toBe("herm");
  });
});

describe("★ one floor, not two kinds of Herm ★", () => {
  test("★ an unraised crossroads and a shut hearth stand in the SAME state ★", () => {
    // Naming them apart froze a difference that does not survive contact: any vessel at the floor may be
    // raised when someone who can raise it arrives.
    expect(standAs("herm", false)).toBe(standAs("hearth", false));
  });
});
