/**
 * sensorium-consistency — the LI (sheaf) consistency-radius: 0 ⟺ the li-planes GLUE, positive ⟺ a
 * localizable OBSTRUCTION over an ENGINEERED overlap (never a vacuous 0), the ki co-consistency stubbed.
 */

import { describe, test, expect } from "vitest";
import {
  cosineDistance, jaccardDistance, treeEditDistance,
  consistencyRadius, stratificationRestrictions, kiCoConsistency, KI_CO_CONSISTENCY_STUB,
  type PlaneRestriction, type ComparisonStalk, type LabeledTree,
} from "../src/sensorium-consistency.js";
import { stratify } from "../src/memetic-wikitext-sensorium.js";

// ── the per-plane native pseudometrics ─────────────────────────────────────────────────────────────

describe("native pseudometrics (the stalk metrics)", () => {
  test("cosineDistance — 0 on parallel, 1 on orthogonal, both-zero ⇒ 0, one-zero ⇒ 1", () => {
    expect(cosineDistance([1, 2, 3], [2, 4, 6])).toBeCloseTo(0, 12);   // parallel
    expect(cosineDistance([1, 0], [0, 1])).toBeCloseTo(1, 12);          // orthogonal
    expect(cosineDistance([0, 0], [0, 0])).toBe(0);
    expect(cosineDistance([0, 0], [1, 1])).toBe(1);
    expect(cosineDistance([1, 1], [1, 1])).toBeCloseTo(0, 12);
  });

  test("jaccardDistance — 0 on equal sets, 1 on disjoint, both-empty ⇒ 0", () => {
    expect(jaccardDistance(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(0);
    expect(jaccardDistance(new Set(["a"]), new Set(["b"]))).toBe(1);
    expect(jaccardDistance(new Set<string>(), new Set<string>())).toBe(0);
    expect(jaccardDistance(new Set(["a", "b"]), new Set(["b", "c"]))).toBeCloseTo(1 - 1 / 3, 12);
  });

  test("treeEditDistance — 0 on identical trees, positive under a relabel / an added node", () => {
    const leaf = (l: string): LabeledTree => ({ label: l, children: [] });
    const a: LabeledTree = { label: "root", children: [leaf("x"), leaf("y")] };
    const same: LabeledTree = { label: "root", children: [leaf("x"), leaf("y")] };
    const relabel: LabeledTree = { label: "root", children: [leaf("x"), leaf("z")] };
    const bigger: LabeledTree = { label: "root", children: [leaf("x"), leaf("y"), leaf("w")] };
    expect(treeEditDistance(a, same)).toBe(0);
    expect(treeEditDistance(a, relabel)).toBeGreaterThan(0);
    expect(treeEditDistance(a, bigger)).toBeGreaterThan(0);
    expect(treeEditDistance(a, relabel)).toBeLessThanOrEqual(1);
  });
});

// ── the consistency radius (0 iff glue, positive = localizable obstruction) ────────────────────────

const stalk4: ComparisonStalk = { units: ["u0", "u1", "u2", "u3"] };
const val = (o: Record<string, number>) => new Map(Object.entries(o));
const sheaf = (plane: string, o: Record<string, number>): PlaneRestriction =>
  ({ plane, variance: "sheaf", value: val(o) });

describe("consistencyRadius — the li-radius", () => {
  test("radius === 0 AND glues on an AGREEING assignment (the li-planes glue → a global section)", () => {
    const agree = { u0: 1, u1: 0.5, u2: 0, u3: 0.2 };
    const r = consistencyRadius(
      [sheaf("content", agree), sheaf("structure", agree), sheaf("form", agree)], stalk4,
    );
    expect(r.radius).toBe(0);
    expect(r.glues).toBe(true);
    expect(r.vacuous).toBe(false);
    expect(r.obstructionLocus).toEqual([]);
    expect(r.signalKind).toBe("disagreement-signal");
  });

  test("radius POSITIVE + LOCALIZED on a seeded disagreement over the engineered overlap", () => {
    const base = { u0: 1, u1: 0.5, u2: 0, u3: 0.2 };
    const seeded = { u0: 1, u1: 0.9, u2: 0, u3: 0.2 };   // form diverges at u1
    const r = consistencyRadius(
      [sheaf("content", base), sheaf("structure", base), sheaf("form", seeded)], stalk4,
    );
    expect(r.radius).toBeCloseTo(0.4, 12);
    expect(r.glues).toBe(false);
    expect(r.vacuous).toBe(false);
    expect(r.obstructionLocus).toEqual(["u1"]);   // localizable to the contested unit
    // the obstruction is the two form-pairs; content↔structure still glue (distance 0)
    const cs = r.pairs.find((p) => p.a === "content" && p.b === "structure")!;
    const cf = r.pairs.find((p) => p.a === "content" && p.b === "form")!;
    expect(cs.distance).toBe(0);
    expect(cf.distance).toBeCloseTo(0.4, 12);
    expect(cf.locus).toEqual(["u1"]);
  });

  test("VACUOUS 0 on an empty stalk — no engineered overlap buys nothing (caution a)", () => {
    const r = consistencyRadius([sheaf("content", { u0: 1 })], { units: [] });
    expect(r.vacuous).toBe(true);
    expect(r.glues).toBe(false);
    expect(r.radius).toBe(0);
    expect(r.note).toMatch(/vacuous/i);
  });

  test("VACUOUS 0 on DISJOINT domains — disjoint aspects glue trivially (caution a)", () => {
    const r = consistencyRadius(
      [sheaf("content", { u0: 1 }), sheaf("structure", { u1: 1 }), sheaf("form", { u2: 1 })], stalk4,
    );
    expect(r.vacuous).toBe(true);         // no pair shares a domain overlap
    expect(r.glues).toBe(false);          // a vacuous 0 is NOT a glue
    expect(r.radius).toBe(0);
    expect(r.pairs.every((p) => p.vacuous)).toBe(true);
  });

  test("REFUSES a cosheaf plane — a ki read through the li restriction map is the silent corruption", () => {
    const bad: PlaneRestriction = { plane: "coupling", variance: "cosheaf", value: val({ u0: 1 }) };
    expect(() => consistencyRadius([sheaf("content", { u0: 1 }), bad], stalk4)).toThrow(/sheaf/i);
  });
});

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

// ── the KI co-consistency — honestly stubbed (caution c) ───────────────────────────────────────────

describe("kiCoConsistency — the honest stub (caution c)", () => {
  test("returns the not-yet-built marker; never fakes a cosheaf read through a restriction map", () => {
    const k = kiCoConsistency();
    expect(k.built).toBe(false);
    expect(k.marker).toBe(KI_CO_CONSISTENCY_STUB);
    expect(k.planes).toEqual(["bands", "coupling"]);
    expect(k.note).toMatch(/cosheaf|extension|colimit/i);
  });
});
