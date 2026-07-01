/**
 * sensorium-consistency — ADVERSARIAL scale QA (The-Advocate, tasked QA-spirit).
 *
 * THE SCALE CEILING: the structure-plane pseudometric `treeEditDistance` runs `forestEditRaw`, a
 * NAIVE memoized rightmost-root ordered-forest edit — NOT Zhang–Shasha (no keyroots / LR
 * decomposition). Two compounding costs make it far worse than the O(n²–n³) its docstring implies:
 *   1. the recursion splices children into the forest (`[...F.slice(0,-1), ...f.children]`), so the
 *      space of distinct subforest subproblems is not bounded to the O(n²) ZS "special subforests";
 *   2. every memo key is `serializeForest(F)+"|"+serializeForest(G)` — an O(n) STRING build per
 *      lookup, so even memoized work carries an extra n factor.
 *
 * MEASURED (this box, 2026-07-01, node v24) — two trees of n nodes each, one root relabel:
 *   balanced:  n=64→0.45s   n=128→4.1s   n=192→14.4s   n=256→37.6s
 *   chain:     n=128→1.2s    n=256→10.0s  n=384→38.7s
 * Empirical growth ≈ O(n^3.2). The docstring's "skeletal trees stay cheap / exact" holds ONLY for
 * tiny trees (≲ ~64 nodes). A real per-chunk or coarse structural AST at the tw5 corpus scale
 * (hundreds→thousands of nodes) blows past any interactive budget:
 *
 *   THE LIVE-RUN BOUNDARY (name it): a single treeEditDistance over two structure trees of ≳200
 *   nodes each ⇒ multi-second → timeout; ≳400 nodes ⇒ tens of seconds. This is the hard-problem
 *   boundary a live consistency-radius run would otherwise hit the hard way. The consistency-radius
 *   itself is cheap (3 planes, sup over overlaps); the cost lives ENTIRELY in the tree-edit stalk
 *   metric, so guarding it (a size cap → sampled/approximate edit, or a real ZS with O(1) keys) is
 *   the fix, not touching the radius.
 */
import { describe, test, expect } from "vitest";
import { treeEditDistance, type LabeledTree } from "../src/sensorium-consistency.js";

const leaf = (l: string): LabeledTree => ({ label: l, children: [] });

/** A left-deep chain of `n` nodes — the AST-spine shape. */
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

function timeEdit(a: LabeledTree, b: LabeledTree): { ms: number; d: number } {
  const t0 = performance.now();
  const d = treeEditDistance(a, b);
  return { ms: performance.now() - t0, d };
}

describe("QA: tree-edit scale ceiling (the structure-plane hot spot)", () => {
  test("correct on tiny skeletal trees (the design regime)", () => {
    const a: LabeledTree = { label: "root", children: [leaf("x"), leaf("y")] };
    expect(treeEditDistance(a, a)).toBe(0);
    const relabel: LabeledTree = { label: "root", children: [leaf("x"), leaf("z")] };
    expect(treeEditDistance(a, relabel)).toBeGreaterThan(0);
    expect(treeEditDistance(a, relabel)).toBeLessThanOrEqual(1);
  });

  test("growth is SUPER-QUADRATIC — the O(n^3+) ceiling is real, not O(n²) as the docstring implies", () => {
    // Warm up (JIT), then measure two sizes. Ratio ≈ (2)^3.2 ≈ 9 in practice; assert > 3 (well
    // above quadratic's 4×… wait: quadratic doubling is 4×, so > 4.5 proves SUPER-quadratic).
    timeEdit(balanced(24), balanced(24));
    const small = timeEdit(balanced(48), balanced(48));
    const big = timeEdit(balanced(96), balanced(96));
    // both stay correct (identical trees ⇒ distance 0)
    expect(small.d).toBe(0);
    expect(big.d).toBe(0);
    // guard against dividing noise: the small measurement must be non-trivial.
    if (small.ms >= 20) {
      const ratio = big.ms / small.ms;
      // doubling n under true O(n²) ⇒ 4×; we measure ≈8–9×. Assert > 4.5 ⇒ provably super-quadratic.
      expect(ratio).toBeGreaterThan(4.5);
    }
    // and n=96 stays under a very loose 20s cap (measured ~1.8s) — a canary: if this ever TRIPS,
    // the ceiling has moved into the interactive path.
    expect(big.ms).toBeLessThan(20_000);
  });

  test("a ~200-node structure tree is the practical wall (documented, not run here)", () => {
    // We do NOT run n≳200 in CI (measured ≥14s — a timeout risk). This test PINS the boundary as a
    // fast n=100 canary: it must still complete quickly; n≳200 is where a live run stalls.
    const r = timeEdit(chain(100), chain(100));
    expect(r.d).toBe(0);
    expect(r.ms).toBeLessThan(10_000); // n=100 chain ~0.5s; the wall is at ~2–4× this size
  });
});
