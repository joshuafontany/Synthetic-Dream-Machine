/**
 * stratificationRestrictions — the ENGINEERED shared-comparison-stalk over a REAL skeletal tier
 * (the consistency organ's caution a, made concrete corpus-side; the organ lives in @lararium/mesh).
 */

import { describe, test, expect } from "vitest";
import { consistencyRadius } from "@lararium/mesh";
import { stratify, stratificationRestrictions } from "../src/memetic-wikitext-sensorium.js";

// ── the ENGINEERED overlap over a REAL skeletal tier (caution a, made concrete) ────────────────────

describe("stratificationRestrictions — a genuine shared-comparison-stalk", () => {
  const text = [
    "<<~ confidence Synthesis 12/20 >> The palace holds the grain of the work and re-stands it.",
    "<<~ ward ! L-Prime >> The house wakes from one libation-dish hydration, entire.",
    "<<~ confidence Canon 18/20 >> Every plane already reads a pattern, never the raw water beneath.",
  ].join("\n\n");

  test("builds three SHEAF planes over the shared skeletal stalk (real redundancy, not disjoint)", () => {
    const strat = stratify(text);
    expect(strat.skeletal.length).toBeGreaterThanOrEqual(2);
    const { stalk, restrictions } = stratificationRestrictions(strat);
    expect(stalk.units.length).toBe(strat.skeletal.length);
    expect(restrictions.map((r) => r.plane)).toEqual(["content", "structure", "form"]);
    expect(restrictions.every((r) => r.variance === "sheaf")).toBe(true);
    // all three planes speak EVERY shared unit — the engineered overlap is full, so the read binds.
    const r = consistencyRadius(restrictions, stalk);
    expect(r.vacuous).toBe(false);
    expect(r.radius).toBeGreaterThanOrEqual(0);
    expect(r.radius).toBeLessThanOrEqual(1);
  });

  test("over the REAL stalk: agree ⇒ radius 0 (glue); seed one anchor ⇒ radius positive + localized", () => {
    const strat = stratify(text);
    const { stalk, restrictions } = stratificationRestrictions(strat);
    // Consensus: give all three planes the SAME reading over the genuine skeletal stalk → they glue.
    const consensus = restrictions[0]!.value;
    const glued = restrictions.map((r) => ({ ...r, value: consensus }));
    const g = consistencyRadius(glued, stalk);
    expect(g.vacuous).toBe(false);
    expect(g.radius).toBe(0);
    expect(g.glues).toBe(true);

    // Seed a disagreement at one real anchor on the form plane → the radius goes positive, localized there.
    const seedUnit = stalk.units[0]!;
    const perturbed = new Map(consensus);
    perturbed.set(seedUnit, (consensus.get(seedUnit) ?? 0) + 1);   // a divergent form reading at s0
    const seeded = [glued[0]!, glued[1]!, { ...glued[2]!, value: perturbed }];
    const s = consistencyRadius(seeded, stalk);
    expect(s.radius).toBeGreaterThan(0);
    expect(s.glues).toBe(false);
    expect(s.obstructionLocus).toContain(seedUnit);
  });
});

