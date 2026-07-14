/**
 * lineage-rank.test.ts — THE EXPERIMENT. Written to KILL the claim, not to confirm it.
 *
 * The outline (lar:///…/admission-on-a-lineage) asserts a sybil bound it did not re-derive and an algorithm
 * nobody reviewed. This file is experiment (2) of the six it owes: build the lineage, mint sybils, and
 * MEASURE the realised benefit against the bound. A green suite here does not prove the outline. It only
 * fails to kill it — and that distinction is the whole discipline.
 *
 * THE BOUND UNDER TEST (Farach-Colton et al., EC 2023, arXiv:1803.05001, Lemma 3): an attacker who subverts
 * a node of honest score x commands at most x/ε rank for ITSELF PLUS EVERY SYBIL IT MINTS, COMBINED —
 * independent of how many it mints. If minting more sybils raises the attacker's total mass, the claim is
 * dead and this file says so.
 */
import { describe, test, expect } from "vitest";
import { rankLineage, attackerMass, type VouchEdge } from "../src/lineage-rank.js";

const EPS = 0.15;

/** A modest honest lineage: the founder vouches three, each of whom vouches two. Depth 3, branching ~2. */
const HONEST: VouchEdge[] = [
  { voucher: "founder", joiner: "a" },
  { voucher: "founder", joiner: "b" },
  { voucher: "founder", joiner: "c" },
  { voucher: "a", joiner: "a1" }, { voucher: "a", joiner: "a2" },
  { voucher: "b", joiner: "b1" }, { voucher: "b", joiner: "b2" },
  { voucher: "c", joiner: "c1" }, { voucher: "c", joiner: "c2" },
];

/** Mint `n` sybils, all vouched by the attacker. The cheapest and most obvious attack there is. */
function sybils(attacker: string, n: number): VouchEdge[] {
  return Array.from({ length: n }, (_, i) => ({ voucher: attacker, joiner: `${attacker}-sybil-${i}` }));
}
const sybilNames = (attacker: string, n: number) =>
  Array.from({ length: n }, (_, i) => `${attacker}-sybil-${i}`);

describe("the fold is EXACT — the walk terminates instead of mixing", () => {
  test("one topological pass equals the power-iteration fixed point", () => {
    // The claim is that acyclicity TRUNCATES the PPR series, so no iteration is needed. If the one-pass
    // fold disagreed with an iterated computation, the closed form would be wrong and C2 would be dead.
    const exact = rankLineage("founder", HONEST, { epsilon: EPS });

    const nodes = new Set<string>(["founder"]);
    for (const e of HONEST) { nodes.add(e.voucher); nodes.add(e.joiner); }
    const iter = new Map<string, number>([...nodes].map((v) => [v, 0]));
    for (let k = 0; k < 500; k++) {                       // brute force: 500 power iterations
      const next = new Map<string, number>([...nodes].map((v) => [v, 0]));
      next.set("founder", EPS);
      for (const e of HONEST) {
        const out = HONEST.filter((x) => x.voucher === e.voucher).length;
        next.set(e.joiner, (next.get(e.joiner) ?? 0) + (1 - EPS) * (iter.get(e.voucher) ?? 0) / out);
      }
      for (const [v, s] of next) iter.set(v, s);
    }
    for (const v of nodes) {
      expect(exact.score.get(v) ?? 0, `score(${v}) must match the iterated fixed point`)
        .toBeCloseTo(iter.get(v) ?? 0, 10);
    }
  });

  test("a CYCLE refuses to score — a signed lineage cannot make one, so it names a corrupted edge set", () => {
    const cyclic = [...HONEST, { voucher: "a1", joiner: "founder" }];
    const r = rankLineage("founder", cyclic, { epsilon: EPS });
    expect(r.acyclic).toBe(false);
    expect(r.score.size).toBe(0);   // it refuses rather than iterating to a fixed point that means nothing
  });
});

describe("THE ATTACK — mint sybils and measure what they actually buy", () => {
  test("★ minting MORE sybils buys the attacker NO MORE TOTAL MASS ★", () => {
    // THE HEADLINE CLAIM, and the one most likely to be false. If the attacker's TOTAL commanded rank grows
    // with the number of sybils, the whole outline collapses here, in this assertion, today.
    const masses: number[] = [];
    for (const n of [1, 10, 100, 1000]) {
      const edges = [...HONEST, ...sybils("a1", n)];
      const r = rankLineage("founder", edges, { epsilon: EPS });
      masses.push(attackerMass(r, ["a1", ...sybilNames("a1", n)]));
    }
    // Every mass must agree: a1's own score splits among its sybils, and the SUM is conserved.
    for (const m of masses) {
      expect(m, `total attacker mass must not grow with the sybil count (got ${masses.join(", ")})`)
        .toBeCloseTo(masses[0]!, 9);
    }
  });

  test("per-sybil rank COLLAPSES as the swarm grows — the comforting number, and the useless one", () => {
    // A naive instrument would read per-sybil rank, watch it fall toward zero, and declare victory while the
    // attacker held exactly as much power as before. This test exists to name that trap, not to celebrate it.
    const one  = rankLineage("founder", [...HONEST, ...sybils("a1", 1)],   { epsilon: EPS });
    const many = rankLineage("founder", [...HONEST, ...sybils("a1", 100)], { epsilon: EPS });
    expect(many.score.get("a1-sybil-0")!).toBeLessThan(one.score.get("a1-sybil-0")! / 50);
    // …and yet the TOTAL is unchanged. The per-sybil number fell 100×; the attacker gained nothing.
    expect(attackerMass(many, ["a1", ...sybilNames("a1", 100)]))
      .toBeCloseTo(attackerMass(one, ["a1", ...sybilNames("a1", 1)]), 9);
  });

  test("the attacker's total mass stays UNDER the x/ε bound", () => {
    // Lemma 3: subverting a node of honest score x commands at most x/ε, attacker AND sybils combined.
    const honest = rankLineage("founder", HONEST, { epsilon: EPS });
    const x = honest.score.get("a1")!;                    // the subverted node's HONEST score
    const bound = x / EPS;

    for (const n of [1, 50, 500]) {
      const r = rankLineage("founder", [...HONEST, ...sybils("a1", n)], { epsilon: EPS });
      const got = attackerMass(r, ["a1", ...sybilNames("a1", n)]);
      expect(got, `with ${n} sybils, attacker mass ${got} must stay under x/ε = ${bound}`)
        .toBeLessThanOrEqual(bound);
    }
  });

  test("a DEEP sybil chain buys nothing either — attenuation kills it faster than breadth", () => {
    // The other obvious attack: not many sybils, but a LONG chain, hoping depth accumulates rank.
    const chain: VouchEdge[] = [];
    let prev = "a1";
    for (let i = 0; i < 50; i++) { chain.push({ voucher: prev, joiner: `deep-${i}` }); prev = `deep-${i}`; }
    const r = rankLineage("founder", [...HONEST, ...chain], { epsilon: EPS });
    const names = ["a1", ...Array.from({ length: 50 }, (_, i) => `deep-${i}`)];
    const honest = rankLineage("founder", HONEST, { epsilon: EPS });
    expect(attackerMass(r, names)).toBeLessThanOrEqual(honest.score.get("a1")! / EPS);
  });

  test("SELF-BOOSTING IS UNREPRESENTABLE — a sybil cannot vouch back up its own lineage", () => {
    // The strongest known attack on PageRank is routing heavy CYCLES back through yourself. On an acyclic
    // lineage that edge cannot exist: a sybil is by construction a DESCENDANT. This test shows what happens
    // if someone tries anyway — the graph is refused, not scored. The attack is forbidden by the data model.
    const boosted = [...HONEST, ...sybils("a1", 5), { voucher: "a1-sybil-0", joiner: "a1" }];
    expect(rankLineage("founder", boosted, { epsilon: EPS }).acyclic).toBe(false);
  });
});

describe("the CRDT properties the architecture leans on", () => {
  test("CONFLUENT — arrival order cannot change the score", () => {
    // Two islands holding the same converged vouch set MUST compute the same ranks, whatever order the
    // vouches reached them. This is what licenses "re-evaluate at use, never cache the decision".
    const shuffled = [...HONEST].reverse();
    const a = rankLineage("founder", HONEST, { epsilon: EPS });
    const b = rankLineage("founder", shuffled, { epsilon: EPS });
    for (const [v, s] of a.score) expect(b.score.get(v)).toBeCloseTo(s, 12);
  });

  test("NON-MONOTONE — a new vouch LOWERS the voucher's existing children, and that is the price of the bound", () => {
    // The uncomfortable one. Mass conservation means admission can SHRINK as facts arrive — so an admitted
    // set is not a growing set, and a cached "admitted" flag would not converge. The outline claims you
    // cannot have both conservation and monotonicity; here is conservation costing us monotonicity, live.
    const before = rankLineage("founder", HONEST, { epsilon: EPS });
    const after  = rankLineage("founder", [...HONEST, { voucher: "a", joiner: "newcomer" }], { epsilon: EPS });
    expect(after.score.get("a1")!, "a's existing child must LOSE score when a vouches for one more")
      .toBeLessThan(before.score.get("a1")!);
  });

  test("an UNREACHED node is UNRANKED, never zero-by-assertion — the partitioned island's honest map", () => {
    // A mesh cut off for centuries computes a NARROWER map, never a fabricated one. Absence reads as "I have
    // never heard of you" — the floor, anergy — and not as a verdict.
    const r = rankLineage("founder", HONEST, { epsilon: EPS });
    expect(r.score.has("a-stranger-from-neo-thracia")).toBe(false);
  });
});

describe("THE PRICE — distortion, MEASURED, and it is not what I predicted", () => {
  // I wrote this suite expecting distant honest kin to STARVE, because the literature warns that absent fast
  // mixing no PageRank variant achieves low distortion. The measurement refused that prediction, and the
  // refusal is the finding: DEPTH is cheap, BRANCHING is expensive, and I had conflated them.

  test("DEPTH costs only geometric attenuation — a long thin lineage keeps its rank", () => {
    // In a chain every node has out-degree 1, so NOTHING SPLITS: only the (1−ε) reset leaks mass. So
    // score(gen-k) = ε·(1−ε)^(k+1), and after 20 generations a distant honest member still holds
    // (1−ε)^19 ≈ 4.6% of a first-generation member's rank. That is ATTENUATION, not starvation.
    const chain: VouchEdge[] = [];
    let prev = "founder";
    for (let i = 0; i < 20; i++) { chain.push({ voucher: prev, joiner: `gen-${i}` }); prev = `gen-${i}`; }
    const r = rankLineage("founder", chain, { epsilon: EPS });
    const near = r.score.get("gen-0")!;
    const far  = r.score.get("gen-19")!;

    expect(far / near).toBeCloseTo((1 - EPS) ** 19, 9);   // the exact law, not a hand-waved bound
    expect(far / near).toBeGreaterThan(0.04);             // ≈4.6% — Neo-Thracia is FAINT, and still audible
  });

  test("BRANCHING is what actually starves the distant — and it is brutal", () => {
    // Mass conservation splits a voucher's score across ALL its children. So a WIDE lineage dilutes by
    // 1/Π(outdeg) on top of the attenuation — and THAT is the term that kills distant kin, not depth.
    // The instrument the tree offers is therefore the BRANCHING NUMBER, not the path length.
    const wide: VouchEdge[] = [];
    let frontier = ["founder"];
    for (let d = 0; d < 5; d++) {                 // depth 5, branching 4 → 4^5 = 1024 leaves
      const next: string[] = [];
      for (const p of frontier) {
        for (let k = 0; k < 4; k++) { const c = `${p}.${k}`; wide.push({ voucher: p, joiner: c }); next.push(c); }
      }
      frontier = next;
    }
    const r = rankLineage("founder", wide, { epsilon: EPS });

    // Same DEPTH as five chain-generations, but each hop also divides by the out-degree of 4.
    const leaf = r.score.get("founder.0.0.0.0.0")!;
    expect(leaf).toBeCloseTo(EPS * ((1 - EPS) / 4) ** 5, 12);

    // Contrast: a chain-of-5 keeps ~44% of the seed's mass; a branch-4 tree of the same depth keeps ~0.001%.
    const chainDepth5 = EPS * (1 - EPS) ** 5;
    expect(leaf).toBeLessThan(chainDepth5 / 1000);
  });

  test("so the DIAL is b·t, exactly as a branching process says — not conductance", () => {
    // A tree has no useful conductance, but it has an EXACT critical quantity: branching number × per-hop
    // retention. Retention per hop = (1−ε)/outdeg. With b·(1−ε)/b = (1−ε), a lineage that branches by b and
    // is scored with out-degree normalisation conserves its TOTAL mass per generation regardless of b —
    // which is why the sybil bound holds on every shape, and why an individual's rank still collapses with b.
    const EPS2 = 0.2;
    for (const b of [2, 4, 8]) {
      const edges: VouchEdge[] = Array.from({ length: b }, (_, k) => ({ voucher: "founder", joiner: `k${k}` }));
      const r = rankLineage("founder", edges, { epsilon: EPS2 });
      const generationMass = Array.from({ length: b }, (_, k) => r.score.get(`k${k}`)!).reduce((x, y) => x + y, 0);
      // The GENERATION conserves (1−ε) of the seed's mass whatever b is: the swarm splits, it never grows.
      expect(generationMass).toBeCloseTo(EPS2 * (1 - EPS2), 12);
    }
  });
});
