/**
 * independence-reading — the split-cartel evasion, and the clique a mass reading cannot see.
 *
 * `vouchConcentration` reads one named cluster, so a cartel that SPLITS gets read twice at half mass and
 * clears a ceiling the pair together never would. These two readings close different halves of that, and
 * the tests below pin exactly which half each one closes — including what each still misses, because a
 * reading trusted past its reach does more harm than no reading.
 *
 * Canon: lar:///ha.ka.ba/lararium/mesh/attestation-plane
 */
import { describe, test, expect } from "vitest";
import { lineageHHI, effectiveVoucherCount, cliqueCoVouchShare } from "../src/independence-reading.js";
import { rankLineage, type VouchEdge } from "../src/lineage-rank.js";
import { vouchConcentration } from "../src/admission-price.js";

const EPS = 0.15;
const rank = (edges: readonly VouchEdge[]) => rankLineage("seed", edges, { epsilon: EPS });

/** One seed vouching `n` children — the flattest lineage of a given width. */
const fan = (n: number): VouchEdge[] =>
  Array.from({ length: n }, (_, i) => ({ voucher: "seed", joiner: `v${i}` }));

describe("HHI catches the split a single-cluster share cannot", () => {
  test("★ splitting a cartel in two buys its members NOTHING under HHI ★", () => {
    // one hand holding the whole second generation …
    const whole = rank([{ voucher: "seed", joiner: "solo" }]);
    // … versus the same mass divided across two hands
    const split = rank([{ voucher: "seed", joiner: "a" }, { voucher: "seed", joiner: "b" }]);

    // the single-cluster reading RELAXES when the cartel divides — each half reads smaller
    expect(vouchConcentration(split, ["a"])).toBeLessThan(vouchConcentration(whole, ["solo"]));
    // HHI reads the whole distribution, so dividing costs the pair rather than paying them
    expect(lineageHHI(split)).toBeLessThan(lineageHHI(whole));
    expect(effectiveVoucherCount(split)).toBeGreaterThan(effectiveVoucherCount(whole));
  });

  test("HHI falls monotonically as a lineage widens — dispersal reads as dispersal", () => {
    const widths = [1, 2, 4, 8].map((n) => lineageHHI(rank(fan(n))));
    for (let i = 1; i < widths.length; i++) expect(widths[i]!).toBeLessThan(widths[i - 1]!);
  });

  test("the effective count tracks the hands actually holding mass", () => {
    // a flat fan of 4 reads close to 4 effective hands (the seed itself carries the reset mass)
    expect(effectiveVoucherCount(rank(fan(4)))).toBeGreaterThan(2.5);
    expect(effectiveVoucherCount(rank(fan(1)))).toBeLessThan(2.5);
  });

  // A lineage with no vouches still holds its SEED, and one hand holding everything reads as TOTAL
  // concentration — HHI 1, one effective hand. That answers honestly rather than reporting a
  // dispersal nobody earned: an unvouched lineage sits at the concentrated end, not off the scale.
  test("a lineage of one hand reads TOTALLY concentrated, never 'dispersed by absence'", () => {
    const seedOnly = rank([]);
    expect(lineageHHI(seedOnly)).toBe(1);
    expect(effectiveVoucherCount(seedOnly)).toBe(1);
  });
});

describe("the clique reading catches what mass concentration cannot", () => {
  // Ten vouchers at a tenth each read DISPERSED under any mass measure — whether or not one hand holds
  // them all. That gap is the whole reason this second reading exists.
  test("★ a clique co-vouching the same joiners scores high; disjoint hands score zero ★", () => {
    const clique: VouchEdge[] = [];
    for (const v of ["c1", "c2", "c3"]) {
      for (const j of ["j1", "j2", "j3"]) clique.push({ voucher: v, joiner: j });
    }
    expect(cliqueCoVouchShare(clique)).toBe(1);          // every edge rides an entangled voucher

    const disjoint: VouchEdge[] = [
      { voucher: "a", joiner: "x" }, { voucher: "b", joiner: "y" }, { voucher: "c", joiner: "z" },
    ];
    expect(cliqueCoVouchShare(disjoint)).toBe(0);        // nobody shares a joiner with anybody
  });

  test("it reads a PARTIAL clique as a partial share, never all-or-nothing", () => {
    const mixed: VouchEdge[] = [
      { voucher: "c1", joiner: "j1" }, { voucher: "c2", joiner: "j1" },   // the pair …
      { voucher: "c1", joiner: "j2" }, { voucher: "c2", joiner: "j2" },   // … sharing two joiners
      { voucher: "solo", joiner: "j9" },                                   // and one hand alone
    ];
    const share = cliqueCoVouchShare(mixed);
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThan(1);
    expect(share).toBeCloseTo(4 / 5, 10);
  });

  test("ONE shared joiner reads as coincidence — the floor keeps noise out", () => {
    const brush: VouchEdge[] = [{ voucher: "a", joiner: "j" }, { voucher: "b", joiner: "j" }];
    expect(cliqueCoVouchShare(brush)).toBe(0);                    // default floor of 2
    expect(cliqueCoVouchShare(brush, 1)).toBe(1);                 // lowered deliberately, it counts
  });

  test("★ the gap this exists for: ten dispersed vouchers read INDEPENDENT by mass and ENTANGLED by pattern ★", () => {
    // Each voucher must DESCEND from the seed to carry mass — an unreachable node scores nothing,
    // which is the fold refusing to rank an island it cannot walk to.
    const edges: VouchEdge[] = [];
    for (let v = 0; v < 10; v++) edges.push({ voucher: "seed", joiner: `v${v}` });
    for (let v = 0; v < 10; v++) {
      for (const j of ["j1", "j2"]) edges.push({ voucher: `v${v}`, joiner: j });
    }
    // Mass says dispersed — the claim rides a COMPARISON rather than a tuned constant, so it survives any ε
    // the operator turns. Measured at ε=0.15: one hand reads ~1.99 effective, these ten read ~4.96.
    //
    // Ten vouchers reading ~5 rather than ~10 tells the truth rather than flattering it: the seed and the
    // two joiners carry mass of their own, so the effective count reads the WHOLE distribution's hands, not
    // a headcount of vouchers. Anyone reading it as "how many vouchers" mis-reads the instrument.
    const dispersed = effectiveVoucherCount(rank(edges));
    const oneHand   = effectiveVoucherCount(rank([{ voucher: "seed", joiner: "solo" }]));
    expect(dispersed).toBeGreaterThan(oneHand * 2);
    // Pattern says otherwise — all ten keep landing on the same two joiners. Across the WHOLE graph the
    // reading lands at 2/3, not 1, and that lands correctly: the seed's own ten edges each reach a joiner
    // nobody else touches, so the seed reads INDEPENDENT — which it is. Only the tier below it entangles.
    expect(cliqueCoVouchShare(edges)).toBeCloseTo(2 / 3, 10);
    // Read the entangled tier alone and it saturates — every one of the ten rides the shared joiners.
    expect(cliqueCoVouchShare(edges.filter((e) => e.voucher !== "seed"))).toBe(1);
  });

  test("an empty edge set reads 0", () => {
    expect(cliqueCoVouchShare([])).toBe(0);
  });
});
