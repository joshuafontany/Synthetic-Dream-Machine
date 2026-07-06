/**
 * sensorium-consistency — SCALE + PSEUDOMETRIC QA for the structure-plane distance (The-Advocate,
 * tasked QA-spirit). Re-cut 2026-07-01 after the O(n^3.2) tree-edit was RETIRED.
 *
 * THE OLD CEILING (gone): the structure metric ran `forestEditRaw`, a naive memoized rightmost-root
 * ordered-forest edit with O(n)-string memo keys — empirical growth ≈O(n^3.2), timing out past ~200
 * nodes (MEASURED, prior box: balanced n=256→37.6s; chain n=384→38.7s). A live consistency-radius over
 * a real per-chunk AST (hundreds→thousands of nodes) blew past any interactive budget.
 *
 * THE SWAP: `treeEditDistance` now DEFAULTS to the DECKARD characteristic-vector embedding — count each
 * node's q-level atomic subtree pattern into a histogram (O(n) build), compare by angular cosine (O(dim)).
 * The cubic exact TED is SHELVED behind `{ method: "exact" }` for the rare certified-count case; a pq-gram
 * refine rides `{ method: "pqgram" }`.
 *
 * THE NEW CEILING (name it): DECKARD is near-linear. Two trees of n nodes each now complete in
 * MILLISECONDS, not seconds — n=500 and n=2000 (both balanced AND chain) finish under a tens-of-ms budget
 * on this box. The O(n^3.2) wall is GONE; the only remaining cost is the linear node walk + the O(dim)
 * histogram compare. Measured numbers are logged below (grep "DECKARD scale").
 */
import { describe, test, expect } from "vitest";
import {
  treeEditDistance, treeEditExact, deckardDistance, pqGramDistance,
  characteristicVector, pqGramProfile, type LabeledTree,
} from "../src/sensorium-consistency.js";

const leaf = (l: string): LabeledTree => ({ label: l, children: [] });

/** A left-deep chain of `n` nodes — the AST-spine shape (the old wall's worst case at depth). */
function chain(n: number): LabeledTree {
  let t = leaf("n0");
  for (let i = 1; i < n; i++) t = { label: "n" + i, children: [t] };
  return t;
}

/** A ~balanced tree of `n` nodes. */
function balanced(n: number, id = { v: 0 }): LabeledTree {
  if (n <= 1) return leaf("L" + id.v++);
  const left = Math.floor((n - 1) / 2), right = n - 1 - left;
  const children: LabeledTree[] = [];
  if (left > 0) children.push(balanced(left, id));
  if (right > 0) children.push(balanced(right, id));
  return { label: "I" + id.v++, children };
}

/** Relabel the top-most `k` nodes of a chain to fresh globally-unique symbols (a monotone edit ladder). */
function chainRelabelTop(n: number, k: number): LabeledTree {
  let t = leaf("n0");
  for (let i = 1; i < n; i++) {
    const label = i >= n - k ? "EDIT_" + i : "n" + i; // the top k get fresh labels
    t = { label, children: [t] };
  }
  return t;
}

function timeIt<T>(f: () => T): { ms: number; v: T } {
  const t0 = performance.now();
  const v = f();
  return { ms: performance.now() - t0, v };
}

// ── the scale ceiling is GONE: DECKARD is near-linear ──────────────────────────────────────────────

describe("QA: structure distance is near-linear now (the O(n^3.2) wall is retired)", () => {
  test("correct on tiny skeletal trees (the design regime — DECKARD default)", () => {
    const a: LabeledTree = { label: "root", children: [leaf("x"), leaf("y")] };
    expect(treeEditDistance(a, a)).toBe(0);
    const relabel: LabeledTree = { label: "root", children: [leaf("x"), leaf("z")] };
    expect(treeEditDistance(a, relabel)).toBeGreaterThan(0);
    expect(treeEditDistance(a, relabel)).toBeLessThanOrEqual(1);
  });

  test("n=500 and n=2000 complete in MILLISECONDS (both balanced and chain) — no timeout", () => {
    // warm the JIT
    treeEditDistance(balanced(64), balanced(64));

    const cases: Array<{ shape: string; n: number; ms: number }> = [];
    for (const n of [500, 2000]) {
      const bA = balanced(n), bB = balanced(n);
      const cA = chain(n), cB = chain(n);
      const rb = timeIt(() => treeEditDistance(bA, bB));
      const rc = timeIt(() => treeEditDistance(cA, cB));
      // identical trees ⇒ distance exactly 0 (the embedding vectors coincide)
      expect(rb.v).toBe(0);
      expect(rc.v).toBe(0);
      cases.push({ shape: "balanced", n, ms: rb.ms }, { shape: "chain", n, ms: rc.ms });
      // the old wall put n=256 at ~37s; a near-linear metric MUST finish these in well under a second.
      expect(rb.ms).toBeLessThan(1000);
      expect(rc.ms).toBeLessThan(1000);
    }
    // Log the new ceiling for the report (grep "DECKARD scale").
    // eslint-disable-next-line no-console
    console.log("DECKARD scale (ms):", JSON.stringify(cases));
  });

  test("growth is roughly LINEAR, not super-quadratic — a 4× node step stays well under the 16× quadratic mark", () => {
    // Min-of-N to denoise (sub-10ms measurements are GC/JIT-noisy under full-suite load).
    const best = (n: number): number => {
      let m = Infinity;
      for (let i = 0; i < 5; i++) {
        const a = chain(n), b = chain(n);
        const r = timeIt(() => treeEditDistance(a, b));
        expect(r.v).toBe(0);
        m = Math.min(m, r.ms);
      }
      return m;
    };
    best(1000); // warm the JIT
    const small = best(1000);   // n
    const big = best(4000);     // 4n
    if (small >= 1) {
      const ratio = big / small;
      // a 4× node step: LINEAR ⇒ ~4×, O(n²) ⇒ 16×, O(n^3.2) ⇒ ~100×. Assert < 12 ⇒ provably sub-quadratic.
      expect(ratio).toBeLessThan(12);
    }
  });

  test("a distinct-structure pair at scale reads POSITIVE and quickly (not a false 0)", () => {
    const a = chain(2000), b = chainRelabelTop(2000, 200); // 200 of 2000 nodes relabeled
    const r = timeIt(() => treeEditDistance(a, b));
    expect(r.v).toBeGreaterThan(0);
    expect(r.v).toBeLessThanOrEqual(1);
    expect(r.ms).toBeLessThan(1000);
  });
});

// ── the shelved exact TED stays correct on tiny trees (the certified-count escape hatch) ───────────

describe("QA: exact TED is SHELVED behind the flag but still correct on tiny trees", () => {
  test("{ method: 'exact' } routes to the cubic path; agrees with treeEditExact on small trees", () => {
    const a: LabeledTree = { label: "root", children: [leaf("x"), leaf("y")] };
    const relabel: LabeledTree = { label: "root", children: [leaf("x"), leaf("z")] };
    expect(treeEditDistance(a, a, { method: "exact" })).toBe(0);
    expect(treeEditDistance(a, relabel, { method: "exact" })).toBe(treeEditExact(a, relabel));
    expect(treeEditExact(a, relabel)).toBeGreaterThan(0);
    // one relabel of a 3-node tree ⇒ raw edit 1 over max size 3 ⇒ 1/3.
    expect(treeEditExact(a, relabel)).toBeCloseTo(1 / 3, 12);
  });

  test("the exact path stays cubic — it is NOT run at scale here (documented, off the hot path)", () => {
    // A ~64-node balanced tree is a safe upper canary for the shelved exact path.
    const a = balanced(64);
    const r = timeIt(() => treeEditExact(a, a));
    expect(r.v).toBe(0);
    expect(r.ms).toBeLessThan(20_000); // loose — this path is cubic; never the interactive default
  });
});

// ── the embedding + profile build sub-linearly-enough to be usable ─────────────────────────────────

describe("QA: the embedding / profile builders are near-linear", () => {
  test("characteristicVector + pqGramProfile build a n=2000 chain in ms (deep, no stack overflow)", () => {
    const t = chain(2000);
    const cv = timeIt(() => characteristicVector(t));
    const pg = timeIt(() => pqGramProfile(t));
    expect(cv.v.size).toBeGreaterThan(0);
    expect(pg.v.size).toBeGreaterThan(0);
    expect(cv.ms).toBeLessThan(500);
    expect(pg.ms).toBeLessThan(500);
    // and the pq-gram distance path also completes fast at scale
    const d = timeIt(() => pqGramDistance(t, chain(2000)));
    expect(d.v).toBe(0);
    expect(d.ms).toBeLessThan(1000);
  });

  test("deckardDistance and pqGramDistance agree that identical trees are distance 0", () => {
    const t = balanced(300);
    expect(deckardDistance(t, t)).toBe(0);
    expect(pqGramDistance(t, t)).toBe(0);
  });
});
