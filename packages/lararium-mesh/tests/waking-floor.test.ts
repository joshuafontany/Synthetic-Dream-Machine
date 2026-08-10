/**
 * What a vessel stands as when its archive will not open.
 *
 * The starred tests carry the two rulings. A hearth whose archive holds shut must still STAND — refusing
 * turns a power cut into an outage — and it must stand as the class that is faceless BY LAW, not as a
 * hearth with its faces quietly missing.
 */
import { describe, expect, test } from "vitest";

import { effectiveLeaseEpoch } from "../src/epoch-lease.js";
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

describe("★ the raise rides the LEASE EPOCH the house already rolls — no clock, no second mechanism ★", () => {
  const raise = (boundEpoch: number, nexus = "nx1") => ({ byNym: "kai", nexus, boundEpoch });
  const at = (effective: number, nexus = "nx1") => ({ nexus, effective });

  test("★ a raise stands until its Nexus rolls PAST the epoch it bound to ★", () => {
    expect(raiseStands(raise(7), at(7))).toBe(true);   // issued at the current epoch — stands
    expect(raiseStands(raise(7), at(6))).toBe(true);   // the Nexus has not caught up yet
  });

  test("★ it ends by NON-RENEWAL — expiry without any duration anyone must agree on ★", () => {
    // Nothing lowered the raise. The Nexus rolled its lease and the grant simply stopped being current,
    // exactly as `device-delegation` goes stale against the same max-register.
    expect(raiseStands(raise(7), at(8))).toBe(false);
  });

  test("★ a replayed raise self-revokes once the epoch has rolled ★", () => {
    expect(raiseStands(raise(1), at(9))).toBe(false);
  });

  test("★ an epoch means NOTHING outside the Nexus that rolls it ★", () => {
    // A vessel standing in two Nexuses holds two epochs, and neither answers for the other.
    expect(raiseStands(raise(7, "nx1"), at(7, "nx2"))).toBe(false);
  });

  test("the vessel falls BACK to its floor, not to some third state", () => {
    expect(standingClass("herm", raise(7), at(7))).toBe("hearth");
    expect(standingClass("herm", raise(7), at(8))).toBe("herm");
  });

  test("no raise, or no epoch read, stands at the floor", () => {
    expect(raiseStands(null, at(7))).toBe(false);
    expect(raiseStands(raise(7), null)).toBe(false);
  });

  test("★ the epoch a raise reads is the SAME value effectiveLeaseEpoch folds ★", () => {
    // The collapse made concrete: a Nexus's per-writer slots fold by max, and that number IS the fence.
    // If this ever needed its own folder, the mesh would be carrying two mechanisms again.
    const effective = effectiveLeaseEpoch(["3", "7", "5", null, "not-a-number"]);
    expect(effective).toBe(7);
    expect(raiseStands(raise(7), at(effective))).toBe(true);
    expect(raiseStands(raise(6), at(effective))).toBe(false);
  });
});
