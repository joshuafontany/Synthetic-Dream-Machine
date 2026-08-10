/**
 * What a vessel stands as when its archive will not open.
 *
 * The starred tests carry the two rulings. A hearth whose archive holds shut must still STAND — refusing
 * turns a power cut into an outage — and it must stand as the class that is faceless BY LAW, not as a
 * hearth with its faces quietly missing.
 */
import { describe, expect, test } from "vitest";

import { personaSlotCeiling, raiseStands, standAs, standingClass } from "../src/vessel-standing.js";

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

describe("★ the raise rides a ROLLING WINDOW — no clock, no scalar ★", () => {
  const raise = (marker: string, nexus = "nx1") => ({ byNym: "kai", nexus, marker });
  const win = (markers: string[], nexus = "nx1") => ({ nexus, markers });

  test("★ a raise stands while its marker stands in the window ★", () => {
    expect(raiseStands(raise("m3"), win(["m1", "m2", "m3"]))).toBe(true);
  });

  test("★ it ends by ROLLING OFF — expiry without any duration anyone must agree on ★", () => {
    // The window advances as the Nexus trades. Nothing lowered the raise; its marker simply left.
    expect(raiseStands(raise("m1"), win(["m2", "m3", "m4"]))).toBe(false);
  });

  test("★ a replayed raise self-revokes once its marker has rolled off ★", () => {
    expect(raiseStands(raise("old"), win(["m9"]))).toBe(false);
  });

  test("★ a marker means NOTHING outside the Nexus that minted it ★", () => {
    // An epoch is per-Nexus. A vessel standing in two holds two windows, and neither answers for the other.
    expect(raiseStands(raise("m1", "nx1"), win(["m1"], "nx2"))).toBe(false);
  });

  test("the vessel falls BACK to its floor, not to some third state", () => {
    expect(standingClass("herm", raise("m1"), win(["m1"]))).toBe("hearth");
    expect(standingClass("herm", raise("m1"), win(["m2"]))).toBe("herm");
  });

  test("no raise, or no window, stands at the floor", () => {
    expect(raiseStands(null, win(["m1"]))).toBe(false);
    expect(raiseStands(raise("m1"), null)).toBe(false);
  });
});
