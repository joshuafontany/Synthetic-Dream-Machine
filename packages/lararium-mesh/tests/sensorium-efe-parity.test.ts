/**
 * sensorium-efe-parity — the TS↔py fixture bridge for the EFE keystone (the RUN arc pays the
 * owed-py-twin). Reads a committed fixture the py twin produced (scripts/sensorium_efe.py),
 * recomputes the SAME cases through the TS `scoreEfe` / `efeSelect` / `efeGate`, and asserts the
 * two bodies agree on every term (pragmatic · epistemic · optionLoss · the derived reversibility ·
 * the argmin · the H¹-first gate fork). Regenerate with:
 *   ~/.venv/bin/python3 packages/lararium-mempalace/scripts/sensorium_efe.py fixture
 */
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { scoreEfe, efeSelect, efeGate, type VerbDelta, type CVector } from "../src/sensorium-efe.js";
import type { SheafAssignment } from "../src/sensorium-fusion.js";
import type { PlaneRestriction } from "../src/sensorium-consistency.js";

interface FixtureScore {
  readonly verb: string; readonly efe: number; readonly pragmatic: number;
  readonly epistemic: number; readonly optionLoss: number; readonly reversible: boolean;
}
interface Fixture {
  readonly planeReads: Record<string, number[]>;
  readonly c: CVector;
  readonly scoreCases: Array<{ verb: VerbDelta; gamma?: number; preferenceVariance?: number; expected: FixtureScore }>;
  readonly selectCase: {
    readonly verbs: VerbDelta[];
    readonly expected: { chosen: string; margin: number; ranked: string[]; needsReview: boolean };
  };
  readonly gateCases: Array<{
    readonly assignment: {
      restrictions: Array<{ plane: string; variance: "sheaf" | "cosheaf"; value: Record<string, number> }>;
      stalk: { units: string[] };
    };
    readonly agreementTolerance: number;
    readonly expected: { verdict: string; chosen?: string; dimH1?: number; cost?: number };
  }>;
}
const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(here, "fixtures", "sensorium-efe-parity.json"), "utf8"),
) as Fixture;

describe("sensorium-efe-parity — TS EFE keystone matches the py twin", () => {
  test(`scoreEfe terms agree across ${String(fixture.scoreCases.length)} verb cases`, () => {
    for (const c of fixture.scoreCases) {
      const opts = {
        ...(c.gamma !== undefined ? { gamma: c.gamma } : {}),
        ...(c.preferenceVariance !== undefined ? { preferenceVariance: c.preferenceVariance } : {}),
      };
      const s = scoreEfe(fixture.planeReads, c.verb, fixture.c, opts);
      expect(s.verb, c.verb.verb).toBe(c.expected.verb);
      expect(s.efe, c.verb.verb).toBeCloseTo(c.expected.efe, 5);
      expect(s.pragmatic, c.verb.verb).toBeCloseTo(c.expected.pragmatic, 5);
      expect(s.epistemic, c.verb.verb).toBeCloseTo(c.expected.epistemic, 5);
      expect(s.optionLoss, c.verb.verb).toBeCloseTo(c.expected.optionLoss, 5);
      expect(s.reversible, c.verb.verb).toBe(c.expected.reversible);
    }
  });

  test("efeSelect agrees on the argmin, the ranking, and the margin", () => {
    const sel = efeSelect(fixture.planeReads, fixture.selectCase.verbs, fixture.c);
    expect(sel.chosen.verb).toBe(fixture.selectCase.expected.chosen);
    expect(sel.ranked.map((s) => s.verb)).toEqual(fixture.selectCase.expected.ranked);
    expect(sel.margin).toBeCloseTo(fixture.selectCase.expected.margin, 5);
    expect(sel.needsReview).toBe(fixture.selectCase.expected.needsReview);
  });

  test(`efeGate forks H¹-first identically across ${String(fixture.gateCases.length)} cases`, () => {
    for (const c of fixture.gateCases) {
      const assignment: SheafAssignment = {
        restrictions: c.assignment.restrictions.map((r): PlaneRestriction =>
          ({ plane: r.plane, variance: r.variance, value: new Map(Object.entries(r.value)) })),
        stalk: { units: c.assignment.stalk.units },
      };
      const g = efeGate(assignment, fixture.planeReads, fixture.selectCase.verbs, fixture.c, {
        agreementTolerance: c.agreementTolerance,
      });
      expect(g.verdict, `tol=${String(c.agreementTolerance)}`).toBe(c.expected.verdict);
      if (g.verdict === "select" && c.expected.chosen !== undefined) {
        expect(g.selection.chosen.verb).toBe(c.expected.chosen);
      }
      if (g.verdict === "surface-disagreement") {
        expect(g.disagreement.dimH1).toBe(c.expected.dimH1);
        expect(g.disagreement.cost).toBeCloseTo(c.expected.cost ?? 0, 9);
      }
    }
  });
});
