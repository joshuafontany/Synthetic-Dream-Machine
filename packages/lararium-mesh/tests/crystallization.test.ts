/**
 * crystallization — the memetic crystallization cap reads whether a recurring pattern FIXES into shared
 * grammar: born ACROSS strata (cross-coordinate agreement) AND rigid (its recurrence rhythm re-locks). These
 * witnesses plant three ground truths against the operator|agent lens (coordinate = role) and prove the lens
 * stays tunable by re-running the SAME machinery against a stream-id coordinate:
 *   1. a pattern in BOTH strata that re-locks across windows → STANDS (born + rigid);
 *   2. a pattern in ONLY one stratum → NOT born (the lone plane drives zero) → does not stand;
 *   3. a pattern that appears once and never recurs → born-maybe but NOT rigid → does not stand.
 */
import { describe, expect, test } from "vitest";

import { crystallize, type CrystalLens } from "../src/crystallization.js";

/** One occurrence of a pattern — the block carries its own coordinates (role, stream, turn); the lens reads
 *  a coordinate off it without presupposing a schema. */
interface Occ {
  readonly role: "operator" | "agent";
  readonly stream: string;
  readonly turn: number;
  readonly strength: number;
}

/** The operator|agent lens — ONE instance of the tunable lens (grouping coordinate = role). */
const roleLens: CrystalLens<Occ> = {
  stratumOf: (o) => o.role,
  ordinalOf: (o) => o.turn,
  strengthOf: (o) => o.strength,
};

describe("crystallize (memetic crystallization: born-across-strata ⊕ rigid)", () => {
  test("a pattern in BOTH strata that RE-LOCKS across windows STANDS (born + rigid → crystallized)", () => {
    // The pattern fires from operator AND agent every turn, its strength riding a clean period-8 recurrence.
    const occ: Occ[] = [];
    for (let turn = 0; turn < 256; turn++) {
      const strength = 0.5 + 0.4 * Math.sin((2 * Math.PI * turn) / 8);
      occ.push({ role: "operator", stream: "s1", turn, strength });
      occ.push({ role: "agent", stream: "s1", turn, strength });
    }
    const v = crystallize(occ, roleLens);
    expect(v.strata).toEqual(["agent", "operator"]); // two strata resolved
    expect(v.birth.born).toBe(true); // cross-stratum agreement → nucleates
    expect(v.birth.effectivePlanes).toBeGreaterThan(1); // ≥2 corroborating strata drive it
    expect(v.standing.rigid).toBe(true); // the recurrence rhythm re-locks after a kick
    expect(v.crystallized).toBe(true); // born ⊕ rigid → fixes into shared grammar
  });

  test("a pattern in ONLY ONE stratum is NOT born (the lone plane drives zero) → does not stand", () => {
    // Only the operator utters it — even a perfectly periodic solo recurrence cannot cross r*.
    const occ: Occ[] = [];
    for (let turn = 0; turn < 256; turn++) {
      occ.push({ role: "operator", stream: "s1", turn, strength: 0.5 + 0.4 * Math.sin((2 * Math.PI * turn) / 8) });
    }
    const v = crystallize(occ, roleLens);
    expect(v.strata).toEqual(["operator"]); // one stratum
    expect(v.birth.effectivePlanes).toBe(1); // a lone plane
    expect(v.birth.drive).toBe(0); // (effectivePlanes − 1) zeroes the drive
    expect(v.birth.born).toBe(false); // never nucleates
    expect(v.crystallized).toBe(false); // no cross-stratum birth → no crystal
  });

  test("a pattern that appears ONCE and never recurs is born-maybe but NOT rigid → does not stand", () => {
    // A single early burst across both strata, then silence — a one-shot event carries no recurrence to lock.
    const occ: Occ[] = [];
    const ramp = [1.0, 0.8, 0.6, 0.4, 0.2, 0.1];
    ramp.forEach((strength, turn) => {
      occ.push({ role: "operator", stream: "s1", turn, strength });
      occ.push({ role: "agent", stream: "s1", turn, strength });
    });
    const v = crystallize(occ, roleLens);
    expect(v.birth.born).toBe(true); // born-maybe: two strata + support cross r* here
    expect(v.standing.rigid).toBe(false); // one-shot burst never re-locks (no periodic recurrence)
    expect(v.crystallized).toBe(false); // rigidity fails → does not stand as shared grammar
  });

  test("the lens is TUNABLE: the SAME machinery reads a stream-id coordinate (two captured streams)", () => {
    // Re-point the lens at stream-id — crystallization now means a pattern re-locking ACROSS two captures.
    const streamLens: CrystalLens<Occ> = {
      stratumOf: (o) => o.stream,
      ordinalOf: (o) => o.turn,
      strengthOf: (o) => o.strength,
    };
    const occ: Occ[] = [];
    for (let turn = 0; turn < 256; turn++) {
      const strength = 0.5 + 0.4 * Math.sin((2 * Math.PI * turn) / 8);
      occ.push({ role: "operator", stream: "capture-A", turn, strength });
      occ.push({ role: "agent", stream: "capture-B", turn, strength });
    }
    const v = crystallize(occ, streamLens);
    expect(v.strata).toEqual(["capture-A", "capture-B"]); // grouped by stream, not role
    expect(v.crystallized).toBe(true); // agrees across two streams AND re-locks → crystallizes
  });

  test("a non-finite ordinal fails LOUD (invalid), distinct from a valid non-crystallization", () => {
    const bad: Occ[] = [{ role: "operator", stream: "s1", turn: NaN, strength: 1 }];
    const v = crystallize(bad, roleLens);
    expect(v.invalid).toBe(true);
    expect(v.crystallized).toBe(false);
  });

  test("an empty stream reads a valid non-crystallization (nothing to fix), not garbage", () => {
    const v = crystallize([], roleLens);
    expect(v.invalid).toBe(false);
    expect(v.crystallized).toBe(false);
  });
});
