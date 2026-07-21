/**
 * sensorium-consistency — the LI (sheaf) consistency-radius: 0 ⟺ the li-planes GLUE, positive ⟺ a
 * localizable OBSTRUCTION over an ENGINEERED overlap (never a vacuous 0); the ki co-consistency FOUNDED, the
 * dual read, its co-restrictions now built from the TE-flow Hodge circulation (te-hodge.test.ts).
 */

import { describe, test, expect } from "vitest";
import {
  cosineDistance, jaccardDistance, treeEditDistance,
  consistencyRadius,
  kiCoConsistency,
  type PlaneRestriction, type ComparisonStalk, type LabeledTree,
  type PlaneCoRestriction, type CofaceStalk,
} from "../src/sensorium-consistency.js";

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

// ── the KI co-consistency — the cosheaf PUSHFORWARD mirror (caution c, FOUNDED) ─────────────────────

const coface3: CofaceStalk = { cofaces: ["c0", "c1", "c2"] };
const coval = (o: Record<string, number>) => new Map(Object.entries(o));
const face = (plane: string, o: Record<string, number>): PlaneCoRestriction =>
  ({ plane, variance: "cosheaf", value: coval(o) });

describe("kiCoConsistency — the ki-radius (the dual of consistencyRadius)", () => {
  test("radius === 0 AND coExtends when the faces CO-EXTEND coherently (a global co-section)", () => {
    const agree = { c0: 0, c1: 0, c2: 0 };
    const k = kiCoConsistency(
      [face("D1", agree), face("D2", agree), face("D3", agree)], coface3,
    );
    expect(k.radius).toBe(0);
    expect(k.coExtends).toBe(true);
    expect(k.vacuous).toBe(false);
    expect(k.offendingCoface).toEqual([]);
    expect(k.signalKind).toBe("disagreement-signal");
  });

  test("radius POSITIVE + LOCALIZED to the offending coface on a seeded co-obstruction (one band leaks)", () => {
    const clean = { c0: 0, c1: 0, c2: 0 };
    const leak = { c0: 0, c1: 0.6, c2: 0 };   // D3 leaks coarse energy into c1
    const k = kiCoConsistency(
      [face("D1", clean), face("D2", clean), face("D3", leak)], coface3,
    );
    expect(k.radius).toBeCloseTo(0.6, 12);
    expect(k.coExtends).toBe(false);
    expect(k.vacuous).toBe(false);
    expect(k.offendingCoface).toEqual(["c1"]);   // localizable to the leaking coface
    const d12 = k.pairs.find((p) => p.a === "D1" && p.b === "D2")!;
    const d13 = k.pairs.find((p) => p.a === "D1" && p.b === "D3")!;
    expect(d12.distance).toBe(0);                 // D1↔D2 still co-extend
    expect(d13.distance).toBeCloseTo(0.6, 12);
    expect(d13.offendingCoface).toEqual(["c1"]);
  });

  test("VACUOUS 0 on an empty coface stalk — no engineered co-overlap buys nothing (caution a)", () => {
    const k = kiCoConsistency([face("D1", { c0: 1 })], { cofaces: [] });
    expect(k.vacuous).toBe(true);
    expect(k.coExtends).toBe(false);
    expect(k.radius).toBe(0);
    expect(k.note).toMatch(/vacuous/i);
  });

  test("VACUOUS 0 on DISJOINT codomains — disjoint flows co-extend trivially (caution a)", () => {
    const k = kiCoConsistency(
      [face("D1", { c0: 1 }), face("D2", { c1: 1 }), face("D3", { c2: 1 })], coface3,
    );
    expect(k.vacuous).toBe(true);
    expect(k.coExtends).toBe(false);
    expect(k.radius).toBe(0);
    expect(k.pairs.every((p) => p.vacuous)).toBe(true);
  });

  test("REFUSES a sheaf plane — a static section pushed through an extension map is the mirror corruption", () => {
    const bad: PlaneCoRestriction = { plane: "content", variance: "sheaf", value: coval({ c0: 1 }) };
    expect(() => kiCoConsistency([face("D1", { c0: 1 }), bad], coface3)).toThrow(/cosheaf/i);
  });
});
