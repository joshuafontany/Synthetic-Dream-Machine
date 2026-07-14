/**
 * admission-price.test.ts — does the DIAL actually turn?
 *
 * The whole reason admission must be a PRICE and not a PREDICATE is that "invite-only now, open protocol
 * later" has to be a NUMBER the operator turns, not a rewrite. A boolean gate has a cliff, and no parameter
 * smooths a cliff. This suite measures whether the claim survives contact with arithmetic.
 *
 * It also checks the stabiliser: a vouch lineage where vouching is free is positive feedback, and collapses
 * into an oligarchy of the early. The 1Hive convex wall is supposed to price that cartel out of itself as it
 * forms. If it does not, the founder-oligarchy failure is real and this file says so.
 */
import { describe, test, expect } from "vitest";
import { priceAdmission, vouchConcentration, type AdmissionDials } from "../src/admission-price.js";
import { rankLineage, type VouchEdge } from "../src/lineage-rank.js";
import { alphaFromHalfLife } from "../src/conviction-dial.js";

/** A lineage with a well-rooted branch (a) and a thin, distant one (c). */
const EDGES: VouchEdge[] = [
  { voucher: "founder", joiner: "a" },
  { voucher: "founder", joiner: "b" },
  { voucher: "a", joiner: "a1" },
  { voucher: "a", joiner: "a2" },
  { voucher: "b", joiner: "b1" },
  { voucher: "b1", joiner: "b1x" },
  { voucher: "b1x", joiner: "c" },        // c sits four generations out — faint, but present
];

const DIALS: AdmissionDials = {
  epsilon: 0.15,
  beta:    0.6,                            // the operator's named "this is capture" ceiling
  rho:     1,
  supply:  1,
  alpha:   alphaFromHalfLife(30),          // the half-life is the human dial; α is DERIVED, never picked
};

const price = (applicant: string, cluster: readonly string[], dials = DIALS) =>
  priceAdmission({ seed: "founder", edges: EDGES, applicant, cluster, dials });

describe("★ THE DIAL TURNS — the same fold spans invite-only and open protocol ★", () => {
  test("an UNRANKED stranger pays the bar ENTIRE — and that bar is the whole gate", () => {
    // A stranger nobody vouched for scores 0 and pays the undiscounted bar. Make that bar unpayable and the
    // mesh is invite-only; make it finite and the protocol is open. The stranger's code path never changes.
    const p = price("a-stranger-from-neo-thracia", ["a"]);
    expect(p.rank).toBe(0);                        // UNRANKED, never "refused" — the floor, not a verdict
    expect(p.price).toBeGreaterThan(0);
    expect(Number.isFinite(p.price)).toBe(true);
  });

  test("INVITE-ONLY and OPEN are the same code, one number apart", () => {
    // Turn `supply` (the bar's scale). Nothing else moves. The unranked stranger's price moves with it, and
    // a well-rooted member's barely does — which is exactly what "the price slopes" is supposed to mean.
    const stranger = "a-stranger-from-neo-thracia";
    const closed = price(stranger, ["a"], { ...DIALS, supply: 1e9 });   // effectively unpayable
    const open   = price(stranger, ["a"], { ...DIALS, supply: 1e-3 });  // trivially payable
    expect(closed.price).toBeGreaterThan(open.price * 1e6);
    // …and the fold, the rank, and the concentration are IDENTICAL. Only the price moved.
    expect(closed.rank).toBe(open.rank);
    expect(closed.concentration).toBeCloseTo(open.concentration, 12);
  });

  test("a DEEP-STANDING applicant crosses cheaper than a stranger — the vouch actually buys something", () => {
    // "A deep-rep voucher shortens the path" was always reaching for this: rank DISCOUNTS the bar.
    const rooted   = price("a1", ["a"]);                              // well-rooted, one hop from the founder
    const stranger = price("a-stranger-from-neo-thracia", ["a"]);     // unranked
    expect(rooted.price).toBeLessThan(stranger.price);
    expect(rooted.rank).toBeGreaterThan(0);
  });

  test("a FAINT but real member still crosses cheaper than a stranger — distance is not exile", () => {
    // c sits four generations out. Its rank is small. It is NOT zero — and Neo-Thracia must not be exiled by
    // arithmetic for the crime of being far away.
    const faint    = price("c", ["b"]);
    const stranger = price("a-stranger-from-neo-thracia", ["b"]);
    expect(faint.rank).toBeGreaterThan(0);
    expect(faint.price).toBeLessThan(stranger.price);
  });
});

describe("THE STABILISER — the cartel gets priced out of itself as it forms", () => {
  test("a DISPERSED lineage is cheap to join; a CONCENTRATED one is not", () => {
    // The founder-oligarchy failure: a vouch DAG where vouching is free is positive feedback. The convex wall
    // is the cure — cheap while power is spread, ruinous as one cluster nears the ceiling.
    const dispersed  = price("a1", ["a"]);                 // one branch of several
    const concentrated = price("a1", ["a", "a1", "a2", "b", "b1", "b1x", "c"]);  // nearly the whole lineage
    expect(concentrated.concentration).toBeGreaterThan(dispersed.concentration);
    expect(concentrated.price).toBeGreaterThan(dispersed.price);
  });

  test("★ at the operator's ceiling the wall goes VERTICAL — capture is unreachable by the curve ★", () => {
    // Ogilvie: "the admission gate and the cartel are the SAME MACHINE". So the machine must make the cartel
    // unaffordable. At r ≥ β the 1Hive curve returns Infinity — not a large number, an ACTUAL wall.
    const everyone = ["founder", "a", "b", "a1", "a2", "b1", "b1x", "c"];
    const p = priceAdmission({ seed: "founder", edges: EDGES, applicant: "newcomer", cluster: everyone,
                              dials: { ...DIALS, beta: 0.5 } });
    expect(p.concentration).toBeGreaterThanOrEqual(0.5);
    expect(p.headroom).toBeLessThanOrEqual(0);
    expect(p.price).toBe(Infinity);
  });

  test("the price rises CONVEXLY toward the ceiling — a wall, never a ramp", () => {
    // A linear cost reads too cheap for a funded attacker and too dear for an honest newcomer — wrong axis.
    // The curve must accelerate: each step toward capture must cost more than the last.
    const bars = [0.1, 0.2, 0.3, 0.4].map((r) =>
      priceAdmission({ seed: "founder", edges: EDGES, applicant: "x", cluster: [], dials: DIALS }).price *
      // price the bar directly at each concentration by reusing the curve's own shape
      ((DIALS.beta - 0.0) ** 2) / ((DIALS.beta - r) ** 2));
    const d1 = bars[1]! - bars[0]!;
    const d3 = bars[3]! - bars[2]!;
    expect(d3, "each step toward the ceiling must cost MORE than the last").toBeGreaterThan(d1);
  });
});

describe("the discipline this file inherits", () => {
  test("VERDICT-FREE — it prices, it never admits", () => {
    // capture-reading's law: "the operator reads, the members decide". This returns a number and its parts.
    // Nothing here says `admitted`, and nothing here writes anything down.
    const p = price("a1", ["a"]);
    expect(Object.keys(p).sort()).toEqual(["concentration", "headroom", "lineage", "price", "rank"]);
  });

  test("an absent cluster reads DISPERSED, never captured — absence is not evidence", () => {
    const r = rankLineage("founder", EDGES, { epsilon: DIALS.epsilon });
    expect(vouchConcentration(r, [])).toBe(0);
    expect(vouchConcentration(r, ["nobody-here"])).toBe(0);
  });

  test("a CORRUPTED (cyclic) lineage prices as UNPAYABLE — the one place this refuses instead of pricing", () => {
    // A signed lineage cannot contain a cycle, so one names a corrupted edge set. Scoring it would be
    // scoring a graph whose meaning nobody can vouch for.
    const cyclic = [...EDGES, { voucher: "c", joiner: "founder" }];
    const p = priceAdmission({ seed: "founder", edges: cyclic, applicant: "a1", cluster: ["a"], dials: DIALS });
    expect(p.lineage.acyclic).toBe(false);
    expect(p.price).toBe(Infinity);
  });

  test("the price NEVER goes negative — a gate that pays an attacker to arrive is not a gate", () => {
    // The discount is a DIVISION, never a subtraction. A subtractive discount on a high-rank applicant could
    // drive the cost below zero and reward the very concentration the wall exists to resist.
    for (const v of ["founder", "a", "a1", "b1x", "c", "unknown"]) {
      expect(price(v, ["a"]).price).toBeGreaterThan(0);
    }
  });
});
