/**
 * Rank aggregation — fold several ranked lists into one consensus order.
 *
 * Witnesses Borda count and the Kemeny (Kendall-tau median) consensus over the
 * kind of 5-point ladders the Law of Fives carries (aperture · ladder · scope ·
 * rating · stage). Every ranking reads best-first: index 0 names rank 1.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/the-law-of-5s
 */

import { describe, test, expect } from "vitest";
import {
  bordaConsensus,
  kemenyConsensus,
  kendallTauCost,
  KEMENY_MAX_ITEMS,
} from "../src/index.js";
import type { Ranking } from "../src/index.js";

// ---------------------------------------------------------------------------
// Identity — identical rankings fold to that ranking
// ---------------------------------------------------------------------------

describe("identity — identical inputs return the shared ranking", () => {
  const one: Ranking<string> = ["pulse", "beat", "measure", "arc", "theme"];
  const three: Ranking<string>[] = [one, one, one];

  test("Borda returns the shared order", () => {
    expect(bordaConsensus(three).order).toEqual([...one]);
  });

  test("Kemeny returns the shared order at zero cost", () => {
    const result = kemenyConsensus(three);
    expect(result.order).toEqual([...one]);
    expect(result.kendallCost).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Worked example — a known Borda order over 4 items, 3 rankers
// ---------------------------------------------------------------------------

describe("worked example — the known Borda order", () => {
  // Position sums (0-based): a=0+0+1=1, b=1+2+0=3, c=2+1+2=5, d=3+3+3=9.
  const rankings: Ranking<string>[] = [
    ["a", "b", "c", "d"],
    ["a", "c", "b", "d"],
    ["b", "a", "c", "d"],
  ];

  test("Borda orders a, b, c, d", () => {
    const result = bordaConsensus(rankings);
    expect(result.order).toEqual(["a", "b", "c", "d"]);
    expect(result.positionSums.get("a")).toBe(1);
    expect(result.positionSums.get("b")).toBe(3);
    expect(result.positionSums.get("c")).toBe(5);
    expect(result.positionSums.get("d")).toBe(9);
  });

  test("Kemeny is never worse than Borda on the worked example", () => {
    const borda = bordaConsensus(rankings);
    const kemeny = kemenyConsensus(rankings);
    expect(kemeny.kendallCost).toBeLessThanOrEqual(borda.kendallCost);
  });
});

// ---------------------------------------------------------------------------
// Cyclic example — Kemeny strictly improves on Borda where a cycle bites
// ---------------------------------------------------------------------------

describe("cyclic example — Kemeny holds or beats Borda", () => {
  // A near-Condorcet spread: no order satisfies every ranker, so the median
  // order matters. Kemeny minimizes disagreement; it must not read worse.
  const rankings: Ranking<string>[] = [
    ["x", "y", "z"],
    ["y", "z", "x"],
    ["z", "x", "y"],
    ["x", "z", "y"],
  ];

  test("Kemeny cost ≤ Borda cost", () => {
    const borda = bordaConsensus(rankings);
    const kemeny = kemenyConsensus(rankings);
    expect(kemeny.kendallCost).toBeLessThanOrEqual(borda.kendallCost);
  });

  test("the reported Kemeny order truly carries the reported cost", () => {
    const kemeny = kemenyConsensus(rankings);
    expect(kendallTauCost(kemeny.order, rankings)).toBe(kemeny.kendallCost);
  });
});

// ---------------------------------------------------------------------------
// Ties — equal Borda sums break stably by first-ranking appearance order
// ---------------------------------------------------------------------------

describe("ties — a stable, documented tie-break", () => {
  const rankings: Ranking<string>[] = [
    ["x", "y"],
    ["y", "x"],
  ];

  test("Borda does not crash and breaks the tie by first-ranking order", () => {
    const result = bordaConsensus(rankings);
    expect(result.positionSums.get("x")).toBe(result.positionSums.get("y"));
    expect(result.order).toEqual(["x", "y"]); // x appears first in ranking 0
  });

  test("Kemeny resolves the tie the same way (Borda-seeded)", () => {
    expect(kemenyConsensus(rankings).order).toEqual(["x", "y"]);
  });
});

// ---------------------------------------------------------------------------
// Validation — malformed input surfaces, never guesses
// ---------------------------------------------------------------------------

describe("validation — mismatched rankings throw", () => {
  test("no rankings throws", () => {
    expect(() => bordaConsensus([])).toThrow(/at least one ranking/);
  });

  test("a differing item set throws", () => {
    expect(() =>
      bordaConsensus([
        ["a", "b", "c"],
        ["a", "b", "d"],
      ]),
    ).toThrow(/absent from the first ranking/);
  });

  test("a repeated item throws", () => {
    expect(() => bordaConsensus([["a", "a", "b"]])).toThrow(/repeats an item/);
  });
});

// ---------------------------------------------------------------------------
// Five-ladder shape — the canonical use folds five 5-point orders
// ---------------------------------------------------------------------------

describe("five-ladder shape — folds five bands cleanly", () => {
  const bands = ["pulse", "beat", "measure", "arc", "theme"];
  // Five ladders that mostly agree, with a couple local swaps.
  const rankings: Ranking<string>[] = [
    ["pulse", "beat", "measure", "arc", "theme"],
    ["pulse", "beat", "measure", "arc", "theme"],
    ["beat", "pulse", "measure", "arc", "theme"],
    ["pulse", "beat", "measure", "theme", "arc"],
    ["pulse", "beat", "measure", "arc", "theme"],
  ];

  test("consensus covers exactly the five bands", () => {
    const result = kemenyConsensus(rankings);
    expect([...result.order].sort()).toEqual([...bands].sort());
    expect(result.order.length).toBe(5);
  });

  test("five items sit within the exhaustive Kemeny reach", () => {
    expect(bands.length).toBeLessThanOrEqual(KEMENY_MAX_ITEMS);
  });
});
