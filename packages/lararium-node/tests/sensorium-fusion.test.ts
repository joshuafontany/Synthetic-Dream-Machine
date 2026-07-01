/**
 * sensorium-fusion — the COHOMOLOGICAL GATE. H¹ = ker(δ¹)/im(δ⁰) over the agreement nerve tells apart
 * the EPISTEMIC no-global-now (H¹=0 → FUSE via Chebyshev sheaf-Laplacian diffusion toward H₀) from the
 * ONTOLOGICAL one (H¹≠0, a genuine cocycle → HOLD-OPEN, never averaged), with cost R*_sem = log₂ dim H¹.
 */

import { describe, test, expect } from "vitest";
import type { PlaneRestriction, ComparisonStalk } from "../src/sensorium-consistency.js";
import {
  cohomologyObstruction, agreementNerve, reconciliationCost, fuse,
  denseHeatReference, chebyshevHeatDiffuse, kernelConsensus, coObservationOrder,
  type SheafAssignment,
} from "../src/sensorium-fusion.js";

// ── builders (the PlaneRestriction shape, held directly so the test is independent of the metric surface) ──
const sheaf = (plane: string, o: Record<string, number>): PlaneRestriction =>
  ({ plane, variance: "sheaf", value: new Map(Object.entries(o)) });
const stalkOf = (...units: string[]): ComparisonStalk => ({ units });

// ── the H¹ obstruction reading ─────────────────────────────────────────────────────────────────────

describe("cohomologyObstruction — the H¹ gate", () => {
  test("GLUES (H¹=0) on a common WITNESS unit: three planes share unit a, all agree there → reconcilable", () => {
    // content={a,b}, structure={a,c}, form={a,d} — all pairwise-overlap ONLY on a, agree there, and the
    // triple overlap {a} is nonempty → the 2-simplex fills the triangle → H¹ = 0.
    const assignment: SheafAssignment = {
      restrictions: [
        sheaf("content", { a: 0.5, b: 0.1 }),
        sheaf("structure", { a: 0.5, c: 0.2 }),
        sheaf("form", { a: 0.5, d: 0.3 }),
      ],
      stalk: stalkOf("a", "b", "c", "d"),
    };
    const obs = cohomologyObstruction(assignment);
    expect(obs.dimH1).toBe(0);
    expect(obs.kind).toBe("reconcilable");
    expect(obs.cost).toBe(0);
    expect(obs.nerve.triangles.length).toBe(1);          // the witness unit a fills the triangle
    expect(obs.nerve.triangles[0]!.witness).toEqual(["a"]);
  });

  test("HOLD-OPEN (H¹=1) on the classic COCYCLE: pairwise-agree, NO common witness → ontological", () => {
    // The hollow triangle — content={a,b}, structure={b,c}, form={c,a}. Each PAIR overlaps on a single
    // shared unit and AGREES there (0.5=0.5), yet NO unit lies in all three domains: a genuinely
    // contextual assignment (pairwise-consistent, globally-obstructed). H¹ = 1.
    const assignment: SheafAssignment = {
      restrictions: [
        sheaf("content", { a: 0.5, b: 0.5 }),
        sheaf("structure", { b: 0.5, c: 0.5 }),
        sheaf("form", { c: 0.5, a: 0.5 }),
      ],
      stalk: stalkOf("a", "b", "c"),
    };
    const obs = cohomologyObstruction(assignment);
    expect(obs.nerve.edges.length).toBe(3);              // all three pairs agree → three edges (a cycle)
    expect(obs.nerve.triangles.length).toBe(0);          // no common witness → the triangle stays HOLLOW
    expect(obs.dimH1).toBe(1);                           // the 1-cycle is not filled → an obstruction
    expect(obs.kind).toBe("ontological");
    expect(obs.cost).toBe(reconciliationCost(1));        // log₂ 1 = 0 (one obstruction, minimal address cost)
    expect(obs.cost).toBe(0);
    expect(obs.basis.length).toBe(1);                    // one representative cocycle over the 3 edges
    expect(obs.basis[0]!.length).toBe(3);
  });

  test("cost R*_sem = log₂ dim H¹ scales: TWO disjoint hollow triangles → dim H¹ = 2, cost = 1", () => {
    // Two independent hollow-triangle cocycles on disjoint plane/unit sets → H¹ rank 2 → cost log₂2 = 1.
    const assignment: SheafAssignment = {
      restrictions: [
        sheaf("c0", { a: 0.5, b: 0.5 }), sheaf("s0", { b: 0.5, c: 0.5 }), sheaf("f0", { c: 0.5, a: 0.5 }),
        sheaf("c1", { p: 0.7, q: 0.7 }), sheaf("s1", { q: 0.7, r: 0.7 }), sheaf("f1", { r: 0.7, p: 0.7 }),
      ],
      stalk: stalkOf("a", "b", "c", "p", "q", "r"),
    };
    const obs = cohomologyObstruction(assignment);
    expect(obs.dimH1).toBe(2);
    expect(obs.cost).toBeCloseTo(1, 12);                 // log₂ 2
    expect(obs.kind).toBe("ontological");
  });

  test("DISAGREEING planes are NOT ontological: a disagreement drops the edge → discrete nerve → H¹=0", () => {
    // Same domains as the cocycle, but the pairs DISAGREE on their overlaps → no agreement edges → the
    // nerve is three isolated vertices → H¹ = 0 → reconcilable (the EPISTEMIC case, to be diffused).
    const assignment: SheafAssignment = {
      restrictions: [
        sheaf("content", { a: 0.5, b: 0.1 }),
        sheaf("structure", { b: 0.9, c: 0.5 }),          // disagrees with content at b (0.1 vs 0.9)
        sheaf("form", { c: 0.2, a: 0.8 }),               // disagrees with structure at c, content at a
      ],
      stalk: stalkOf("a", "b", "c"),
    };
    const obs = cohomologyObstruction(assignment);
    expect(obs.nerve.edges.length).toBe(0);
    expect(obs.dimH1).toBe(0);
    expect(obs.kind).toBe("reconcilable");
  });

  test("REFUSES a cosheaf plane — a ki flow through the li restriction is the silent corruption", () => {
    const bad: PlaneRestriction = { plane: "coupling", variance: "cosheaf", value: new Map([["a", 1]]) };
    const assignment: SheafAssignment = { restrictions: [sheaf("content", { a: 1 }), bad], stalk: stalkOf("a") };
    expect(() => cohomologyObstruction(assignment)).toThrow(/sheaf/i);
    expect(() => agreementNerve(assignment)).toThrow(/sheaf/i);
    expect(() => fuse(assignment)).toThrow(/sheaf/i);
  });
});

// ── the GATE: fuse vs hold-open ──────────────────────────────────────────────────────────────────

describe("fuse — the cohomological gate", () => {
  test("H¹=0 → FUSE: disagreeing full-domain planes diffuse to the per-unit consensus (a global section)", () => {
    // All three planes share the FULL domain {a,b} but disagree → no agreement edges → H¹=0 → diffuse.
    const assignment: SheafAssignment = {
      restrictions: [
        sheaf("content", { a: 0.0, b: 1.0 }),
        sheaf("structure", { a: 0.6, b: 0.4 }),
        sheaf("form", { a: 0.9, b: 0.1 }),
      ],
      stalk: stalkOf("a", "b"),
    };
    const r = fuse(assignment, { diffusionTime: 8, chebyshevOrder: 40 });
    expect(r.verdict).toBe("fuse");
    if (r.verdict !== "fuse") throw new Error("unreachable");
    // consensus at a = mean(0, 0.6, 0.9) = 0.5; at b = mean(1, 0.4, 0.1) = 0.5.
    expect(r.fused.consensus.get("a")!).toBeCloseTo(0.5, 9);
    expect(r.fused.consensus.get("b")!).toBeCloseTo(0.5, 9);
    // the diffused per-plane fields converge onto that consensus (residual to the exact P_ker is tiny).
    expect(r.fused.diffusion.residualToKernel).toBeLessThan(1e-4);
    for (const p of r.fused.planes) {
      expect(p.value.get("a")!).toBeCloseTo(0.5, 3);
      expect(p.value.get("b")!).toBeCloseTo(0.5, 3);
    }
    expect(r.obstruction).toBeNull();
  });

  test("H¹>0 → HOLD-OPEN: the cocycle is NEVER averaged — fused:null + obstruction {dimH1,basis,cost}", () => {
    const assignment: SheafAssignment = {
      restrictions: [
        sheaf("content", { a: 0.5, b: 0.5 }),
        sheaf("structure", { b: 0.5, c: 0.5 }),
        sheaf("form", { c: 0.5, a: 0.5 }),
      ],
      stalk: stalkOf("a", "b", "c"),
    };
    const r = fuse(assignment);
    expect(r.verdict).toBe("hold-open");
    if (r.verdict !== "hold-open") throw new Error("unreachable");
    expect(r.fused).toBeNull();
    expect(r.obstruction.dimH1).toBe(1);
    expect(r.obstruction.cost).toBe(0);                  // log₂ 1
    expect(r.obstruction.basis.length).toBe(1);
  });
});

// ── the Chebyshev diffusion: sparse, order-K dial, matches the dense reference, converges to H₀ ─────

describe("Chebyshev sheaf-Laplacian diffusion", () => {
  // a co-observation with mixed coupling: a,b shared by all three planes; c,d private.
  const assignment: SheafAssignment = {
    restrictions: [
      sheaf("content", { a: 0.0, b: 1.0, c: 0.3 }),
      sheaf("structure", { a: 0.6, b: 0.4, d: 0.7 }),
      sheaf("form", { a: 0.9, b: 0.1 }),
    ],
    stalk: stalkOf("a", "b", "c", "d"),
  };
  const order = coObservationOrder(assignment);
  const x0 = order.map((c) => assignment.restrictions[c.plane]!.value.get(c.unit)!);

  test("matches the DENSE eigendecomposition reference e^{−tL₀}x on a small case (sparse == dense)", () => {
    const t = 3;
    const dense = denseHeatReference(assignment, x0, t);
    const { diffused } = chebyshevHeatDiffuse(assignment, x0, { diffusionTime: t, chebyshevOrder: 40 });
    let err = 0;
    for (let i = 0; i < dense.length; i++) err = Math.max(err, Math.abs(dense[i]! - diffused[i]!));
    expect(err).toBeLessThan(1e-6);
  });

  test("the ORDER-K dial trades accuracy for cost: higher K → smaller error, more matvecs", () => {
    const t = 3;
    const dense = denseHeatReference(assignment, x0, t);
    const errAt = (K: number) => {
      const { diffused } = chebyshevHeatDiffuse(assignment, x0, { diffusionTime: t, chebyshevOrder: K });
      let e = 0;
      for (let i = 0; i < dense.length; i++) e = Math.max(e, Math.abs(dense[i]! - diffused[i]!));
      return e;
    };
    const lo = errAt(2), mid = errAt(6), hi = errAt(30);
    expect(mid).toBeLessThan(lo);                        // more terms → closer
    expect(hi).toBeLessThan(mid);
    expect(hi).toBeLessThan(1e-6);
    // cost: the matvec count IS the order K (one sparse matvec per Chebyshev term).
    const { matvecs } = chebyshevHeatDiffuse(assignment, x0, { diffusionTime: t, chebyshevOrder: 30 });
    expect(matvecs).toBe(30);
  });

  test("converges to H₀ = ker(L₀): at large t the diffusion reaches the exact per-unit consensus", () => {
    const kerRef = kernelConsensus(assignment, x0);       // the exact P_ker projection (per-unit mean)
    const { diffused } = chebyshevHeatDiffuse(assignment, x0, { diffusionTime: 12, chebyshevOrder: 60 });
    let err = 0;
    for (let i = 0; i < kerRef.length; i++) err = Math.max(err, Math.abs(kerRef[i]! - diffused[i]!));
    expect(err).toBeLessThan(1e-4);
    // the shared units a,b reach the mean; the private units c,d are UNCOUPLED → held at their input.
    const aCoords = order.map((c, i) => ({ c, i })).filter((x) => x.c.unit === "a");
    for (const { i } of aCoords) expect(diffused[i]!).toBeCloseTo(0.5, 3);   // mean(0,0.6,0.9)
    const cIdx = order.findIndex((c) => c.unit === "c");
    expect(diffused[cIdx]!).toBeCloseTo(0.3, 6);          // private → untouched by the flow
  });
});
