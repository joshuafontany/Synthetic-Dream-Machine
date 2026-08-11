/**
 * receiver-cap — the ONE lever with measured success, measured here rather than believed.
 *
 * ── WHY THIS SIDE ───────────────────────────────────────────────────────────────────────────────
 * The fold already bounds what a GIVER emits: mass conservation splits a voucher's score across
 * everyone it vouches for, so sybils downstream only re-divide mass that already crossed one edge.
 * The field has measured what giver-side bounds buy. Stack Exchange caps a voter's daily votes — a
 * textbook giver bound — and the RECEIVED distribution still runs a Gini of 0.976. The two systems
 * that reach low concentration both bound the RECEIVER: Slashdot 0.30 with score clamped [−1,+5],
 * participatory budgeting ~0.41 with one approval per project per voter.
 *
 * So these tests ask the receiver-side question directly: can one identity absorb without limit when
 * many hands are generous, and does the cap actually move the concentration it exists to move?
 *
 * A Gini number that only ever gets asserted proves nothing, so it gets COMPUTED from the fold's own
 * output and compared capped-against-uncapped on the same graph.
 */
import { describe, test, expect } from "vitest";
import { rankLineage, type VouchEdge } from "../src/lineage-rank.js";
import { receiverConcentration, vouchConcentration } from "../src/admission-price.js";

const EPS = 0.15;

/** Gini over the received scores — 0 = every receiver equal, → 1 = one identity holds everything. */
function gini(values: readonly number[]): number {
  const xs = [...values].filter((v) => v > 0).sort((a, b) => a - b);
  if (xs.length === 0) return 0;
  const n = xs.length;
  const total = xs.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let weighted = 0;
  for (let i = 0; i < n; i++) weighted += (i + 1) * xs[i]!;
  return (2 * weighted) / (n * total) - (n + 1) / n;
}

/**
 * A STAR OF GENEROSITY: `n` distinct vouchers, each staking on the same joiner, each themselves vouched
 * for by the seed. Every giver behaves perfectly — one vouch apiece, the giver bound untouched — and the
 * mass lands on one identity anyway. This is the shape a giver-side reading cannot see.
 */
function generosityStar(n: number, extra: readonly VouchEdge[] = []): VouchEdge[] {
  const edges: VouchEdge[] = [];
  for (let i = 0; i < n; i++) {
    edges.push({ voucher: "seed", joiner: `giver${i}` });
    edges.push({ voucher: `giver${i}`, joiner: "hub" });
  }
  return [...edges, ...extra];
}

describe("★ absorption runs unbounded while every giver behaves ★", () => {
  test("the hub's score grows with the number of generous hands", () => {
    const small = rankLineage("seed", generosityStar(3), { epsilon: EPS });
    const large = rankLineage("seed", generosityStar(30), { epsilon: EPS });
    expect(small.acyclic && large.acyclic).toBe(true);

    const hubSmall = small.score.get("hub")!;
    const hubLarge = large.score.get("hub")!;
    // Ten times the hands, and the hub absorbs strictly more. No giver did anything a giver bound
    // could object to: each vouched exactly once.
    expect(hubLarge).toBeGreaterThan(hubSmall);
    expect(large.clipped).toBe(0);   // nothing asked for a cap, so nothing was refused
  });

  test("★ the GIVER-side reading calls this healthy — which is why it is not the lever ★", () => {
    const rank = rankLineage("seed", generosityStar(30), { epsilon: EPS });
    const givers = Array.from({ length: 30 }, (_, i) => `giver${i}`);
    // Thirty hands share the power to admit, so giver concentration sits low and reports dispersion…
    expect(vouchConcentration(rank, givers)).toBeLessThan(0.75);
    // …while one identity holds a large share of everything the lineage carries.
    expect(receiverConcentration(rank, "seed")).toBeGreaterThan(0.2);
  });
});

describe("★ the cap binds absorption, and says that it did ★", () => {
  test("no identity exceeds the ceiling, for any number of hands", () => {
    const cap = 0.05;
    for (const hands of [3, 12, 60, 200]) {
      const rank = rankLineage("seed", generosityStar(hands), { epsilon: EPS, receiverCap: cap });
      for (const [who, s] of rank.score) {
        if (who === "seed") continue;   // ε is assigned, never absorbed — the cap bounds crossings
        expect(s, `${who} absorbed past the ceiling at ${hands} hands`).toBeLessThanOrEqual(cap + 1e-12);
      }
    }
  });

  test("the refused mass gets REPORTED rather than inferred", () => {
    const capped = rankLineage("seed", generosityStar(60), { epsilon: EPS, receiverCap: 0.05 });
    expect(capped.clipped).toBeGreaterThan(0);
    // One scalar over the whole fold — the bound working, never a per-identity total.
    expect(typeof capped.clipped).toBe("number");
  });

  test("★ the concentration it exists to move, MOVES — computed, not asserted ★", () => {
    const edges = generosityStar(40);
    const open   = rankLineage("seed", edges, { epsilon: EPS });
    const capped = rankLineage("seed", edges, { epsilon: EPS, receiverCap: 0.02 });

    const rx = (r: typeof open): number[] => [...r.score].filter(([w]) => w !== "seed").map(([, v]) => v);
    const before = gini(rx(open));
    const after  = gini(rx(capped));
    expect(after).toBeLessThan(before);
    expect(receiverConcentration(capped, "seed")).toBeLessThan(receiverConcentration(open, "seed"));
  });
});

describe("the cap changes nothing it was not asked to change", () => {
  test("an absent cap leaves the fold exactly as it stood", () => {
    const edges = generosityStar(10);
    const plain = rankLineage("seed", edges, { epsilon: EPS });
    const wide  = rankLineage("seed", edges, { epsilon: EPS, receiverCap: Infinity });
    expect([...wide.score.entries()]).toEqual([...plain.score.entries()]);
    expect(wide.clipped).toBe(0);
  });

  test("a cap above every score refuses nothing", () => {
    const rank = rankLineage("seed", generosityStar(5), { epsilon: EPS, receiverCap: 10 });
    expect(rank.clipped).toBe(0);
  });

  test("a cycle still refuses to score, and reports no clipping", () => {
    const cyclic: VouchEdge[] = [
      { voucher: "seed", joiner: "a" }, { voucher: "a", joiner: "b" }, { voucher: "b", joiner: "a" },
    ];
    const rank = rankLineage("seed", cyclic, { epsilon: EPS, receiverCap: 0.01 });
    expect(rank.acyclic).toBe(false);
    expect(rank.clipped).toBe(0);
  });
});
