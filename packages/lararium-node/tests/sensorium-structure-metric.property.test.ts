/**
 * The STRUCTURE-plane distance — property-based attack on the near-linear tree pseudometric that replaced
 * the cubic tree-edit (The-Sword QA, 2026-07-01). Both the DECKARD default (angular cosine over the
 * characteristic-vector embedding) and the pq-gram refine (Ruzicka over the pq-gram bag) must hold:
 *
 *   · 0 ⟺ identical trees (reflexive, the vectors/profiles coincide).
 *   · symmetric: d(a,b) === d(b,a).
 *   · in-range: d ∈ [0,1].
 *   · TRIANGLE INEQUALITY over random triples — the pseudometric law the swap was CHOSEN to keep
 *     (angular cosine + Ruzicka both obey it; a raw 1−cos would NOT — that is the whole point).
 *   · MONOTONE RISE: relabeling MORE nodes never DECREASES the distance from the original (more edits →
 *     larger disagreement signal), and any single seeded edit reads strictly positive.
 */
import { describe, test, expect } from "vitest";
import {
  deckardDistance, pqGramDistance, treeEditDistance, type LabeledTree,
} from "../src/sensorium-consistency.js";

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const RUNS = 300;
const EPS = 1e-9;

/** A random small ordered tree, ≤ `maxNodes`, labels drawn from a small alphabet (forces real overlap). */
function randTree(u: () => number, maxNodes: number): LabeledTree {
  let budget = 1 + Math.floor(u() * maxNodes);
  const alphabet = ["A", "B", "C", "D", "E"];
  const build = (): LabeledTree => {
    const label = alphabet[Math.floor(u() * alphabet.length)]!;
    const children: LabeledTree[] = [];
    const maxKids = Math.floor(u() * 3); // 0..2 children
    for (let i = 0; i < maxKids && budget > 1; i++) {
      budget--;
      children.push(build());
    }
    return { label, children };
  };
  return build();
}

const metrics: Array<{ name: string; d: (a: LabeledTree, b: LabeledTree) => number }> = [
  { name: "DECKARD (default)", d: (a, b) => deckardDistance(a, b) },
  { name: "pq-gram (refine)", d: (a, b) => pqGramDistance(a, b) },
];

for (const { name, d } of metrics) {
  describe(`structure metric — ${name} — is a clean pseudometric`, () => {
    test("reflexive (identical trees ⇒ 0), symmetric, and in-range [0,1]", () => {
      const u = rng(101);
      for (let i = 0; i < RUNS; i++) {
        const a = randTree(u, 12), b = randTree(u, 12);
        expect(d(a, a)).toBe(0); // identical ⇒ exactly 0
        const ab = d(a, b), ba = d(b, a);
        expect(ab).toBeCloseTo(ba, 12); // symmetric
        expect(ab).toBeGreaterThanOrEqual(0);
        expect(ab).toBeLessThanOrEqual(1);
      }
    });

    test("TRIANGLE INEQUALITY holds over random triples: d(a,c) ≤ d(a,b) + d(b,c)", () => {
      const u = rng(202);
      for (let i = 0; i < RUNS; i++) {
        const a = randTree(u, 14), b = randTree(u, 14), c = randTree(u, 14);
        const ac = d(a, c), ab = d(a, b), bc = d(b, c);
        expect(ac).toBeLessThanOrEqual(ab + bc + EPS);
      }
    });
  });
}

// ── MONOTONE RISE: more seeded edits ⇒ a never-smaller disagreement signal ────────────────────────

describe("structure metric — rises with seeded edits (both DECKARD and pq-gram)", () => {
  const leaf = (l: string): LabeledTree => ({ label: l, children: [] });

  /** A chain of `n` nodes with the top `k` nodes relabeled to fresh globally-unique symbols. */
  function chainTopRelabel(n: number, k: number): LabeledTree {
    let t = leaf("c0");
    for (let i = 1; i < n; i++) {
      t = { label: i >= n - k ? "E" + i : "c" + i, children: [t] };
    }
    return t;
  }

  test("relabeling MORE of the top nodes never DECREASES distance from the original", () => {
    const N = 40;
    const base = chainTopRelabel(N, 0);
    for (const d of [deckardDistance, pqGramDistance]) {
      let prev = -1;
      for (const k of [0, 1, 2, 4, 8, 16, 30]) {
        const variant = chainTopRelabel(N, k);
        const dist = d(base, variant);
        expect(dist).toBeGreaterThanOrEqual(prev - EPS); // monotone non-decreasing
        if (k === 0) expect(dist).toBe(0);
        if (k > 0) expect(dist).toBeGreaterThan(0); // any real edit reads positive
        prev = dist;
      }
    }
  });

  test("a single relabel/insert over a random tree reads strictly positive (no false glue)", () => {
    const u = rng(303);
    for (let i = 0; i < RUNS; i++) {
      const a = randTree(u, 10);
      // insert a fresh unique child under the root → a genuine structural change
      const b: LabeledTree = { label: a.label, children: [...a.children, leaf("UNIQ_" + i)] };
      expect(deckardDistance(a, b)).toBeGreaterThan(0);
      expect(pqGramDistance(a, b)).toBeGreaterThan(0);
      expect(treeEditDistance(a, b)).toBeGreaterThan(0); // the default dispatches to DECKARD
    }
  });
});
