/**
 * sensorium-efe — a THIN regression-guard on the EFE keystone gate (NOT a full suite; the py EFE port
 * supersedes, and the numeric compute rides the TS↔py parity oracle + the bifurcation bench). Pins the two
 * gate branches — H¹=0 → SELECT the min-EFE verb · H¹≠0 → SURFACE the disagreement carrying R*_sem — and
 * efeSelect's empty-verbs throw.
 */

import { describe, test, expect } from "vitest";
import type { PlaneRestriction, ComparisonStalk } from "../src/sensorium-consistency.js";
import type { SheafAssignment } from "../src/sensorium-fusion.js";
import { efeGate, efeSelect, type VerbDelta, type CVector } from "../src/sensorium-efe.js";

// ── builders (the PlaneRestriction shape, held directly — mirrors the sensorium-fusion test) ─────────
const sheaf = (plane: string, o: Record<string, number>): PlaneRestriction =>
  ({ plane, variance: "sheaf", value: new Map(Object.entries(o)) });
const stalkOf = (...units: string[]): ComparisonStalk => ({ units });

// ── the shared verb-set + C set-point the gate scores when a global section stands ───────────────────
const planes: Record<string, number[]> = {
  content: [0.1, 0.2, 0.15, 0.25, 0.2, 0.3],
  structure: [0.3, 0.1, 0.4, 0.2, 0.35, 0.15],
  form: [0.2, 0.25, 0.15, 0.3, 0.2, 0.28],
};
const c: CVector = { mu: { content: 0, structure: 0, form: 0 } };
const verbs: readonly VerbDelta[] = [
  { verb: "hold", scale: 1, shift: 0, precisionGain: 1 },
  { verb: "align", scale: 0, shift: 0, precisionGain: 1 }, // steer the mean to the C set-point (0)
];

describe("efeGate — the B×C keystone gate", () => {
  test("H¹=0 (common witness) → SELECTS the min-EFE verb, no disagreement", () => {
    // content={a,b}, structure={a,c}, form={a,d} — all glue on the shared witness a → H¹ = 0.
    const glue: SheafAssignment = {
      restrictions: [
        sheaf("content", { a: 0.5, b: 0.1 }),
        sheaf("structure", { a: 0.5, c: 0.2 }),
        sheaf("form", { a: 0.5, d: 0.3 }),
      ],
      stalk: stalkOf("a", "b", "c", "d"),
    };
    const res = efeGate(glue, planes, verbs, c);
    expect(res.verdict).toBe("select");
    expect(res.disagreement).toBeNull();
    expect(res.selection).not.toBeNull();
    const sel = res.selection!;
    // the chosen verb reads the minimum EFE across the ranking, and leads the ascending rank.
    expect(sel.chosen.efe).toBe(Math.min(...sel.ranked.map((s) => s.efe)));
    expect(sel.ranked[0]!.verb).toBe(sel.chosen.verb);
    expect(Number.isFinite(sel.chosen.efe)).toBe(true);
  });

  test("H¹≠0 (hollow triangle) → SURFACES the disagreement with R*_sem = log₂ dim H¹, no selection", () => {
    // content={a,b}, structure={b,c}, form={c,a} — pairwise-agree, NO common witness → a genuine cocycle, H¹≥1.
    const cocycle: SheafAssignment = {
      restrictions: [
        sheaf("content", { a: 0.5, b: 0.5 }),
        sheaf("structure", { b: 0.5, c: 0.5 }),
        sheaf("form", { c: 0.5, a: 0.5 }),
      ],
      stalk: stalkOf("a", "b", "c"),
    };
    const res = efeGate(cocycle, planes, verbs, c);
    expect(res.verdict).toBe("surface-disagreement");
    expect(res.selection).toBeNull();
    expect(res.disagreement).not.toBeNull();
    const dis = res.disagreement!;
    expect(dis.dimH1).toBeGreaterThan(0);
    expect(dis.cost).toBeCloseTo(Math.log2(dis.dimH1), 12); // R*_sem = log₂ dim H¹ (Thomas–Chen)
  });
});

describe("efeSelect — the argmin selector", () => {
  test("THROWS on an empty verb-set (nothing to score)", () => {
    expect(() => efeSelect(planes, [], c)).toThrow();
  });
});
