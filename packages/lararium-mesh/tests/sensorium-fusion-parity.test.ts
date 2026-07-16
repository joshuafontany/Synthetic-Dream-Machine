/**
 * sensorium-fusion-parity — the TS↔py fixture bridge for the H¹ gate (the RUN arc pays the
 * owed-py-twin). Reads a committed fixture the py twin produced (scripts/sensorium_fusion.py),
 * recomputes the SAME cases through the TS `cohomologyObstruction` + `fuse`, and asserts the two
 * bodies agree on dim H¹ / dim H⁰ / R*_sem / the gate verdict / the H₀ consensus. The py fuse reads
 * the EXACT kernel projection; the TS Chebyshev diffusion converges to that same target, and its
 * `fused.consensus` carries the exact P_ker — so the consensus binds cleanly. Regenerate with:
 *   ~/.venv/bin/python3 packages/lararium-sensorium/scripts/sensorium_fusion.py fixture
 */
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { cohomologyObstruction, fuse, type SheafAssignment } from "../src/sensorium-fusion.js";
import type { PlaneRestriction } from "../src/sensorium-consistency.js";

interface FixtureAssignment {
  readonly restrictions: Array<{ plane: string; variance: "sheaf" | "cosheaf"; value: Record<string, number> }>;
  readonly stalk: { units: string[] };
}
interface FusionCase {
  readonly note: string;
  readonly assignment: FixtureAssignment;
  readonly agreementTolerance: number;
  readonly expected: {
    readonly dimH1: number;
    readonly dimH0: number;
    readonly cost: number;
    readonly kind: "reconcilable" | "ontological";
    readonly edges: number;
    readonly triangles: number;
    readonly verdict: "fuse" | "hold-open";
    readonly consensus?: Record<string, number>;
  };
}
const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(here, "fixtures", "sensorium-fusion-parity.json"), "utf8"),
) as { cases: FusionCase[] };

const toAssignment = (a: FixtureAssignment): SheafAssignment => ({
  restrictions: a.restrictions.map((r): PlaneRestriction =>
    ({ plane: r.plane, variance: r.variance, value: new Map(Object.entries(r.value)) })),
  stalk: { units: a.stalk.units },
});

describe("sensorium-fusion-parity — TS H¹ gate matches the py twin", () => {
  test(`dim H¹ / dim H⁰ / R*_sem / verdict agree across ${String(fixture.cases.length)} cases`, () => {
    for (const c of fixture.cases) {
      const assignment = toAssignment(c.assignment);
      const obs = cohomologyObstruction(assignment, { agreementTolerance: c.agreementTolerance });
      expect(obs.dimH1, c.note).toBe(c.expected.dimH1);
      expect(obs.dimH0, c.note).toBe(c.expected.dimH0);
      expect(obs.cost, c.note).toBeCloseTo(c.expected.cost, 9);
      expect(obs.kind, c.note).toBe(c.expected.kind);
      expect(obs.nerve.edges.length, c.note).toBe(c.expected.edges);
      expect(obs.nerve.triangles.length, c.note).toBe(c.expected.triangles);

      const gate = fuse(assignment, { agreementTolerance: c.agreementTolerance });
      expect(gate.verdict, c.note).toBe(c.expected.verdict);
      if (c.expected.verdict === "fuse" && c.expected.consensus && gate.verdict === "fuse") {
        for (const [unit, value] of Object.entries(c.expected.consensus)) {
          expect(gate.fused.consensus.get(unit), `${c.note} · consensus@${unit}`).toBeCloseTo(value, 9);
        }
      }
    }
  });
});
