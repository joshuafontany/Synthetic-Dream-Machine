/**
 * te-hodge — the coupling plane's OWN co-consistency: the Helmholtz-Hodge decomposition of the directed
 * transfer-entropy flow, read for its CIRCULATION. Proves the two regimes that matter: a flow reducible to a
 * lead-lag POTENTIAL is curl-free (the ki-radius co-extends, radius 0 — no irreducible coupling), and a flow
 * that CIRCULATES around a cycle pushes the radius positive, localized to the offending triangle. Drop-in
 * for the retired MODWT-MRA scaffold: the co-restrictions feed kiCoConsistency unchanged.
 */

import { describe, test, expect } from "vitest";
import {
  hodgeDecomposeTEFlow, teFlowHodgeCoRestrictions, hodgeDecomposeIncompleteTEFlow,
  HODGE_GRADIENT_FACE, HODGE_ROTATIONAL_FACE,
  kiCoConsistency, type TEFlow,
} from "../src/index.js";

/** A TE flow built from an explicit net-flow triangle: te[i][j] carries the directed bits i→j. */
function flow(children: string[], te: number[][]): TEFlow {
  return { children, te };
}

describe("hodgeDecomposeTEFlow — gradient ⊥ rotational split of the TE flow", () => {
  test("a pure GRADIENT flow (te = potential difference) is curl-free — every triangle circulation 0", () => {
    // s = [2, 1, 0] ⇒ net flow w(i,j) = s(i) − s(j) carried as directed TE (only the positive leg).
    // w(0,1)=1, w(0,2)=2, w(1,2)=1 — a consistent lead-lag ranking, no rotation.
    const te = [
      [0, 1, 2],
      [0, 0, 1],
      [0, 0, 0],
    ];
    const d = hodgeDecomposeTEFlow(flow(["a", "b", "c"], te));
    expect(d.circulations).toHaveLength(1);
    expect(d.circulations[0]!.circulation).toBeCloseTo(0, 12);
    expect(d.maxCirculation).toBeCloseTo(0, 12);
    // the potential recovers the ranking (mean-zero): a leads, c trails.
    expect(d.potential[0]!).toBeGreaterThan(d.potential[1]!);
    expect(d.potential[1]!).toBeGreaterThan(d.potential[2]!);
  });

  test("a CIRCULATING flow (a→b→c→a) has no potential — the circulation is the irreducible coupling", () => {
    // a rock-paper-scissors cycle: each beats the next by 1 bit, no consistent ranking.
    const te = [
      [0, 1, 0],
      [0, 0, 1],
      [1, 0, 0],
    ];
    const d = hodgeDecomposeTEFlow(flow(["a", "b", "c"], te));
    expect(d.circulations[0]!.circulation).toBeCloseTo(3, 12);   // w(a,b)+w(b,c)+w(c,a) = 1+1+1
    expect(d.maxCirculation).toBeCloseTo(3, 12);
    // no potential explains a cycle — the HodgeRank scores collapse to ~equal (all divergences 0).
    expect(Math.max(...d.potential.map(Math.abs))).toBeCloseTo(0, 12);
  });
});

describe("teFlowHodgeCoRestrictions — the drop-in ki co-restrictions over the TE flow", () => {
  test("a lead-lag potential CO-EXTENDS: kiCoConsistency radius 0 (no irreducible coupling)", () => {
    const te = [
      [0, 1, 2],
      [0, 0, 1],
      [0, 0, 0],
    ];
    const { stalk, coRestrictions } = teFlowHodgeCoRestrictions(flow(["a", "b", "c"], te));
    expect(stalk.cofaces).toEqual(["t0-1-2"]);
    expect(coRestrictions.map((r) => r.plane)).toEqual([HODGE_GRADIENT_FACE, HODGE_ROTATIONAL_FACE]);
    expect(coRestrictions.every((r) => r.variance === "cosheaf")).toBe(true);
    const k = kiCoConsistency(coRestrictions, stalk);
    expect(k.vacuous).toBe(false);
    expect(k.radius).toBeCloseTo(0, 12);
    expect(k.coExtends).toBe(true);
  });

  test("a circulating flow OBSTRUCTS: radius positive, localized to the offending triangle", () => {
    const te = [
      [0, 1, 0],
      [0, 0, 1],
      [1, 0, 0],
    ];
    const { stalk, coRestrictions } = teFlowHodgeCoRestrictions(flow(["a", "b", "c"], te));
    const k = kiCoConsistency(coRestrictions, stalk);
    expect(k.radius).toBeCloseTo(3, 12);
    expect(k.coExtends).toBe(false);
    expect(k.offendingCoface).toEqual(["t0-1-2"]);
    expect(k.signalKind).toBe("disagreement-signal");
  });

  test("fewer than three children ⇒ no triangle ⇒ an empty coface stalk ⇒ a VACUOUS 0", () => {
    const te = [
      [0, 1],
      [2, 0],
    ];
    const { stalk, coRestrictions } = teFlowHodgeCoRestrictions(flow(["a", "b"], te));
    expect(stalk.cofaces).toEqual([]);
    const k = kiCoConsistency(coRestrictions, stalk);
    expect(k.vacuous).toBe(true);
    expect(k.radius).toBe(0);
  });

  test("a symmetric flow (te[i][j] == te[j][i]) carries zero net flow ⇒ curl-free, co-extends", () => {
    const te = [
      [0, 1, 2],
      [1, 0, 3],
      [2, 3, 0],
    ];
    const d = hodgeDecomposeTEFlow(flow(["a", "b", "c"], te));
    expect(d.maxCirculation).toBeCloseTo(0, 12);   // net flow is 0 on every edge
    const { stalk, coRestrictions } = teFlowHodgeCoRestrictions(flow(["a", "b", "c"], te));
    const k = kiCoConsistency(coRestrictions, stalk);
    expect(k.coExtends).toBe(true);
  });
});

describe("hodgeDecomposeIncompleteTEFlow — the genuine harmonic reading over a holed flow graph", () => {
  /** All ascending pairs over n vertices — the complete-graph present-edge set. */
  function allEdges(n: number): [number, number][] {
    const es: [number, number][] = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) es.push([i, j]);
    return es;
  }

  test("a PURE GRADIENT flow (w = potential difference) on a holed graph ⇒ harmonic 0, curl 0", () => {
    // s = [3, 1, 0, -2] over a 4-cycle (NO diagonals). w(i,j) = s[i] − s[j] on each present edge.
    const s = [3, 1, 0, -2];
    const te = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const edges: [number, number][] = [[0, 1], [1, 2], [2, 3], [0, 3]];
    for (const [i, j] of edges) {
      const w = s[i]! - s[j]!;           // carry the whole net flow on the positive leg
      if (w >= 0) te[i]![j] = w; else te[j]![i] = -w;
    }
    const d = hodgeDecomposeIncompleteTEFlow(flow(["a", "b", "c", "d"], te), edges);
    expect(d.harmonicEnergy).toBeCloseTo(0, 12);
    expect(d.maxCirculation).toBeCloseTo(0, 12);
    expect(d.residual.every((r) => Math.abs(r) < 1e-9)).toBe(true);
    expect(d.betti1).toBe(1);            // the square carries one hole, but a gradient fills none of it
  });

  test("K_n input ⇒ agrees with hodgeDecomposeTEFlow (harmonic 0, same potential)", () => {
    const te = [
      [0, 1, 0, 2],
      [0, 0, 1, 0],
      [3, 0, 0, 1],
      [0, 1, 0, 0],
    ];
    const children = ["a", "b", "c", "d"];
    const complete = hodgeDecomposeTEFlow(flow(children, te));
    const incomplete = hodgeDecomposeIncompleteTEFlow(flow(children, te), allEdges(4));
    expect(incomplete.harmonicEnergy).toBeCloseTo(0, 9); // filled clique complex is contractible, H¹ = 0
    expect(incomplete.betti1).toBe(0);
    // the HodgeRank potential matches the closed form div/n on K_n, node for node.
    for (let i = 0; i < 4; i++) expect(incomplete.potential[i]!).toBeCloseTo(complete.potential[i]!, 9);
  });

  test("a 4-CYCLE with a circulating flow (all +c around, NO diagonals) ⇒ harmonic = FULL residual (β₁=1)", () => {
    const c = 2;
    // 0→1→2→3→0, each leg +c bits; no chord to attribute the circulation to.
    const te = [
      [0, c, 0, 0],
      [0, 0, c, 0],
      [0, 0, 0, c],
      [c, 0, 0, 0],
    ];
    const edges: [number, number][] = [[0, 1], [1, 2], [2, 3], [0, 3]];
    const d = hodgeDecomposeIncompleteTEFlow(flow(["a", "b", "c", "d"], te), edges);
    expect(d.betti1).toBe(1);                          // one hole, no filled triangle
    expect(d.circulations).toHaveLength(0);            // no present triangle exists
    // the divergence is 0 everywhere (a pure loop) ⇒ potential 0, residual = the whole flow.
    expect(Math.max(...d.potential.map(Math.abs))).toBeCloseTo(0, 9);
    const flowEnergy = d.netEdgeFlow.reduce((a, w) => a + w * w, 0); // 4 · c²
    expect(d.harmonicEnergy).toBeCloseTo(flowEnergy, 9);
    expect(d.harmonicEnergy).toBeCloseTo(4 * c * c, 9);
    expect(d.harmonicEnergy).toBeGreaterThan(0);       // NOT zero — the hole carries irreducible content
  });

  test("a single FILLED triangle with any flow ⇒ harmonic 0 (all residual is curl)", () => {
    const te = [
      [0, 5, 2],
      [1, 0, 4],
      [7, 3, 0],
    ];
    const edges: [number, number][] = [[0, 1], [1, 2], [0, 2]];
    const d = hodgeDecomposeIncompleteTEFlow(flow(["a", "b", "c"], te), edges);
    expect(d.circulations).toHaveLength(1);            // the one filled triangle
    expect(d.betti1).toBe(0);                          // no hole — the triangle bounds the cycle
    expect(d.harmonicEnergy).toBeCloseTo(0, 9);        // every divergence-free cycle is the triangle's curl
    expect(Math.abs(d.circulations[0]!.circulation)).toBeGreaterThan(0);
  });
});
