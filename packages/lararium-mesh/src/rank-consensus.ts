// rank-consensus.ts — fold several ranked lists into one consensus order.
//
// The five Law-of-Fives ladders (aperture · ladder · scope · rating · stage,
// each a 5-point order in ast.ts) rank the same span through different lenses.
// This primitive folds any set of such orders into a single consensus order.
//
// Two methods ride here, both pure and deterministic:
//   • bordaConsensus  — sums each item's positions across the rankings and
//     orders by that sum (a lower sum sits nearer the front). Cheap, trivial.
//   • kemenyConsensus — searches for the order that minimizes total Kendall-tau
//     distance to the inputs (the median order). Exhaustive over permutations,
//     so it fits small item sets (the five-ladder case holds ≤ 5 items).
//
// A ranking reads best-first: position 0 names rank 1. Every input ranking
// MUST cover the same item set exactly once (a strict total order); the
// primitive validates this and throws on a mismatch rather than guessing.
//
// Schema: lar:///ha.ka.ba/lares/api/mu/the-law-of-5s (rank aggregation)

/** A ranking reads best-first: index 0 carries rank 1, the strongest item. */
export type Ranking<T> = readonly T[];

export interface ConsensusResult<T> {
  /** The consensus order, best-first. */
  readonly order: readonly T[];
  /** Per item, the summed 0-based position across all input rankings (Borda). */
  readonly positionSums: ReadonlyMap<T, number>;
  /** Total Kendall-tau distance (discordant pairs) from `order` to the inputs. */
  readonly kendallCost: number;
}

/** Above this item count the exhaustive Kemeny search grows past reach; it throws instead. */
export const KEMENY_MAX_ITEMS = 8;

// ---------------------------------------------------------------------------
// Validation — every ranking covers one shared item set exactly once
// ---------------------------------------------------------------------------

/** Read the shared item set off the first ranking; throw if any ranking disagrees. */
function sharedItemSet<T>(rankings: readonly Ranking<T>[]): readonly T[] {
  if (rankings.length === 0) {
    throw new Error("rank-consensus: at least one ranking must arrive");
  }
  const base = rankings[0]!;
  const baseSet = new Set(base);
  if (baseSet.size !== base.length) {
    throw new Error("rank-consensus: a ranking repeats an item; each must hold a strict order");
  }
  for (let r = 1; r < rankings.length; r++) {
    const ranking = rankings[r]!;
    if (ranking.length !== base.length) {
      throw new Error(
        `rank-consensus: ranking ${r} carries ${ranking.length} items, expected ${base.length}`,
      );
    }
    const seen = new Set<T>();
    for (const item of ranking) {
      if (!baseSet.has(item)) {
        throw new Error(`rank-consensus: ranking ${r} names an item absent from the first ranking`);
      }
      if (seen.has(item)) {
        throw new Error(`rank-consensus: ranking ${r} repeats an item; each must hold a strict order`);
      }
      seen.add(item);
    }
  }
  return base;
}

/** Map each item to its 0-based position within a ranking. */
function positionMap<T>(ranking: Ranking<T>): Map<T, number> {
  const map = new Map<T, number>();
  ranking.forEach((item, index) => map.set(item, index));
  return map;
}

// ---------------------------------------------------------------------------
// Kendall-tau — count the pairs a candidate order and the inputs disagree on
// ---------------------------------------------------------------------------

/**
 * Sum, over every input ranking, the ordered pairs the candidate order flips.
 * For each pair the candidate places (a before b), add one whenever a ranking
 * instead places b before a. Lower reads closer to consensus.
 */
export function kendallTauCost<T>(
  order: readonly T[],
  rankings: readonly Ranking<T>[],
): number {
  const positions = rankings.map(positionMap);
  let cost = 0;
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      const a = order[i]!;
      const b = order[j]!;
      for (const pos of positions) {
        const pa = pos.get(a);
        const pb = pos.get(b);
        if (pa !== undefined && pb !== undefined && pa > pb) cost++;
      }
    }
  }
  return cost;
}

// ---------------------------------------------------------------------------
// Borda — sum positions, order by the sum
// ---------------------------------------------------------------------------

/** Sum each item's 0-based position across the rankings (lower sits nearer the front). */
function bordaPositionSums<T>(
  items: readonly T[],
  rankings: readonly Ranking<T>[],
): Map<T, number> {
  const sums = new Map<T, number>();
  for (const item of items) sums.set(item, 0);
  for (const ranking of rankings) {
    ranking.forEach((item, index) => {
      sums.set(item, (sums.get(item) ?? 0) + index);
    });
  }
  return sums;
}

/**
 * Fold the rankings by Borda count — order items by summed position, ascending.
 *
 * Tie-break (documented, stable): items tied on position-sum keep the order in
 * which they first appear in the first input ranking. So the fold stays a pure
 * function of the inputs, never of item hashing or insertion accident.
 */
export function bordaConsensus<T>(rankings: readonly Ranking<T>[]): ConsensusResult<T> {
  const items = sharedItemSet(rankings);
  const sums = bordaPositionSums(items, rankings);
  const firstRankIndex = positionMap(rankings[0]!);

  const order = [...items].sort((a, b) => {
    const da = (sums.get(a) ?? 0) - (sums.get(b) ?? 0);
    if (da !== 0) return da;
    // Tie-break: appearance order in the first ranking.
    return (firstRankIndex.get(a) ?? 0) - (firstRankIndex.get(b) ?? 0);
  });

  return {
    order,
    positionSums: sums,
    kendallCost: kendallTauCost(order, rankings),
  };
}

// ---------------------------------------------------------------------------
// Kemeny — the median order, minimizing total Kendall-tau distance
// ---------------------------------------------------------------------------

/**
 * Walk every permutation of `seed`, in lexicographic order by the seed's own
 * order, and hand each to `visit`. The seed order surfaces first, so a caller
 * that seeds with the Borda order lets Borda win any downstream tie.
 */
function forEachPermutation<T>(seed: readonly T[], visit: (perm: readonly T[]) => void): void {
  const n = seed.length;
  const chosen: T[] = [];
  const used = new Array<boolean>(n).fill(false);
  const recurse = (): void => {
    if (chosen.length === n) {
      visit(chosen);
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      chosen.push(seed[i]!);
      recurse();
      chosen.pop();
      used[i] = false;
    }
  };
  recurse();
}

/**
 * Fold the rankings into the Kemeny consensus — the order minimizing total
 * Kendall-tau distance to the inputs (the rank-aggregation median).
 *
 * The search runs exhaustively over permutations, seeded from the Borda order,
 * so a tie among equal-cost orders resolves to the Borda-preferred one (the
 * first found wins). By construction the returned cost never exceeds Borda's.
 *
 * Throws above KEMENY_MAX_ITEMS, where the factorial search leaves reach.
 */
export function kemenyConsensus<T>(rankings: readonly Ranking<T>[]): ConsensusResult<T> {
  const seedResult = bordaConsensus(rankings);
  const items = seedResult.order;

  if (items.length > KEMENY_MAX_ITEMS) {
    throw new Error(
      `rank-consensus: ${items.length} items exceed the exhaustive Kemeny reach of ${KEMENY_MAX_ITEMS}`,
    );
  }

  let bestOrder: readonly T[] = items;
  let bestCost = seedResult.kendallCost;

  forEachPermutation(items, (perm) => {
    const cost = kendallTauCost(perm, rankings);
    if (cost < bestCost) {
      bestCost = cost;
      bestOrder = [...perm];
    }
  });

  return {
    order: bestOrder,
    positionSums: seedResult.positionSums,
    kendallCost: bestCost,
  };
}
