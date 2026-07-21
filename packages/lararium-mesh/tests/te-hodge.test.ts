/**
 * te-hodge — the coupling plane's OWN co-consistency: the Helmholtz-Hodge decomposition of the directed
 * transfer-entropy flow, read for its CIRCULATION. Proves the two regimes that matter: a flow reducible to a
 * lead-lag POTENTIAL is curl-free (the ki-radius co-extends, radius 0 — no irreducible coupling), and a flow
 * that CIRCULATES around a cycle pushes the radius positive, localized to the offending triangle. Drop-in
 * for the retired MODWT-MRA scaffold: the co-restrictions feed kiCoConsistency unchanged.
 */

import { describe, test, expect } from "vitest";
import {
  hodgeDecomposeTEFlow, teFlowHodgeCoRestrictions,
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
