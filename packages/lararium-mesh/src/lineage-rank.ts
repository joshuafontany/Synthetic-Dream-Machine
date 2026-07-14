/**
 * lineage-rank — a seed-rooted trust score over an ACYCLIC vouch lineage, computed EXACTLY in one pass.
 *
 * THE GRAPH IS THE GIFT. Every published sybil defence assumes an undirected, FAST-MIXING social graph, and
 * a vouch lineage is a near-tree whose conductance is terrible by construction. That looked like a
 * disqualification. It is the opposite: on an acyclic graph the personalized-PageRank series TRUNCATES,
 * because a walk that cannot return upstream must eventually fall off the lineage. So the score has a
 * CLOSED FORM and needs no power iteration, no convergence test, and no mixing time at all.
 *
 *     score(v) = (1 − ε) · Σ_{u ∈ parents(v)} score(u) / outdeg(u)      score(seed) += ε
 *
 * The walk TERMINATES instead of mixing. One topological sweep, O(|V| + |E|), exact.
 *
 * WHAT ACYCLICITY BUYS BESIDES SPEED. A sybil is, by construction, a DESCENDANT of the edge that admitted
 * it, and can never vouch back up its own lineage — a cycle is structurally unrepresentable. The strongest
 * known attack on PageRank is precisely "route heavy cycles back through yourself", so the primary attack
 * is forbidden by the DATA MODEL rather than by the algorithm.
 *
 * MASS CONSERVATION IS NOT NEGOTIABLE. A voucher's score SPLITS across everyone it vouches for. That is
 * what makes the fold sybil-resistant, and it is also what makes it NON-MONOTONE: a new vouch LOWERS the
 * score of the voucher's existing children. The tempting alternative — a max-times metric that does not
 * split — is perfectly order-independent AND perfectly sybil-broken, since one attacker then mints
 * unbounded sybils that each inherit its full score. Conservation and monotonicity cannot both hold.
 *
 * SO: NEVER CACHE THE VERDICT. The score is a pure deterministic function of the edge set, so two islands
 * holding the same converged graph compute the same score whatever order the vouches arrived in. Admission
 * therefore RE-EVALUATES at use. A cached "admitted" flag is a decision, and decisions do not merge.
 *
 * THE BOUND THIS RESTS ON — cited, and NOT re-derived here: Farach-Colton et al., "Graph Ranking and the
 * Cost of Sybil Defense" (EC 2023, arXiv:1803.05001, Lemma 3) prove trust-PPR ε-spam-resistant ON ALL GRAPH
 * CLASSES — no mixing, no conductance, no undirectedness. An attacker subverting a node of score x buys at
 * most x/ε rank for itself AND every sybil it mints, COMBINED. `tests/lineage-rank.test.ts` measures whether
 * our implementation actually honours that, rather than believing it.
 *
 * THE PRICE, also proven and also not ours to wish away: absent fast mixing, NO PageRank variant achieves
 * low distortion. Honest kin far from the seed starve toward zero. That is a false-REJECTION rate, it is the
 * cost of the bound, and a mesh cut off for centuries pays it in full.
 *
 * Design-of-record: lar:///ha.ka.ba/lares/api/pono/admission-on-a-lineage (an OUTLINE, unproven).
 */

/** A vouch: `voucher` staked its standing on `joiner`. The edge is the object; the identity is free. */
export interface VouchEdge {
  readonly voucher: string;
  readonly joiner:  string;
}

export interface LineageRankOptions {
  /**
   * The teleport/reset mass ε ∈ (0,1) — the fraction of the walk that restarts at the seed each step.
   *
   * It is the DIAL, and it is the whole gate. A walk that wanders into sybil territory stays trapped for
   * ~1/ε steps, so ε sets what an attacker's foothold is WORTH: high ε keeps trust tight around the seed
   * (invite-only), low ε lets it wander (open protocol). Same fold, same code, one number.
   */
  readonly epsilon: number;
}

export interface LineageRank {
  /** score(v) for every reachable node. A node the seed cannot reach is ABSENT, never zero-by-assertion. */
  readonly score: ReadonlyMap<string, number>;
  /** Topological order actually used. Empty when the edge set carries a cycle (see `acyclic`). */
  readonly order: readonly string[];
  /** False when the vouch set contains a cycle — which a signed lineage cannot produce, so it reads as a bug. */
  readonly acyclic: boolean;
}

/**
 * Rank a vouch lineage from `seed`, exactly, in one topological pass.
 *
 * A node absent from the result is UNRANKED, not refused: the seed's sub-graph never reached it. That is
 * the floor — anergy — and it is what a partitioned island computes for everyone it has never heard of.
 * The correct behaviour of an isolated mesh is a NARROWER map, never a fabricated one.
 *
 * Returns `acyclic: false` and an empty order if the edges carry a cycle. A signed vouch lineage cannot
 * contain one (a joiner cannot have vouched for its own ancestor), so a cycle here names a corrupted edge
 * set, and this refuses to score it rather than silently iterating to a fixed point that means nothing.
 */
export function rankLineage(
  seed: string,
  edges: readonly VouchEdge[],
  opts: LineageRankOptions,
): LineageRank {
  const { epsilon } = opts;
  if (!(epsilon > 0 && epsilon < 1)) {
    throw new Error(`lineage-rank: epsilon must sit in (0,1); got ${epsilon}`);
  }

  const children  = new Map<string, string[]>();
  const parents   = new Map<string, string[]>();
  const outdeg    = new Map<string, number>();
  const nodes     = new Set<string>([seed]);

  for (const { voucher, joiner } of edges) {
    nodes.add(voucher);
    nodes.add(joiner);
    (children.get(voucher) ?? children.set(voucher, []).get(voucher)!).push(joiner);
    (parents.get(joiner)   ?? parents.set(joiner, []).get(joiner)!).push(voucher);
    outdeg.set(voucher, (outdeg.get(voucher) ?? 0) + 1);
  }

  // Kahn's order, restricted to what the SEED can reach. An island scores its own sub-graph and nothing
  // else — which is the honest computation, not a degraded one.
  const reachable = new Set<string>();
  const stack = [seed];
  while (stack.length) {
    const v = stack.pop() as string;
    if (reachable.has(v)) continue;
    reachable.add(v);
    for (const c of children.get(v) ?? []) stack.push(c);
  }

  const indeg = new Map<string, number>();
  for (const v of reachable) {
    indeg.set(v, (parents.get(v) ?? []).filter((p) => reachable.has(p)).length);
  }
  const order: string[] = [];
  const ready = [...reachable].filter((v) => (indeg.get(v) ?? 0) === 0).sort();
  while (ready.length) {
    const v = ready.shift() as string;
    order.push(v);
    for (const c of children.get(v) ?? []) {
      if (!reachable.has(c)) continue;
      const d = (indeg.get(c) ?? 0) - 1;
      indeg.set(c, d);
      if (d === 0) ready.push(c);
    }
  }
  if (order.length !== reachable.size) {
    return { score: new Map(), order: [], acyclic: false };
  }

  // THE FOLD. One sweep in topological order: every parent is fully scored before any child reads it, so
  // no value is ever revised and no iteration is needed. This is Felsenstein's pruning, run downward.
  const score = new Map<string, number>();
  for (const v of order) score.set(v, 0);
  score.set(seed, epsilon);
  for (const v of order) {
    const s = score.get(v) ?? 0;
    const kids = (children.get(v) ?? []).filter((c) => reachable.has(c));
    if (!kids.length) continue;                       // a SINK. Its mass leaves the lineage and returns to
    const share = (1 - epsilon) * s / (outdeg.get(v) ?? 1);   // the seed's reset pool — never to the graph,
    for (const c of kids) score.set(c, (score.get(c) ?? 0) + share);  // which would reintroduce a cycle and
  }                                                   // destroy the closed form outright.

  return { score, order, acyclic: true };
}

/**
 * The total rank an ATTACKER commands: its own score plus every sybil it minted, summed.
 *
 * The bound this measures against says the SUM is what is capped — not the per-sybil score. An attacker who
 * mints a thousand sybils splits the same stolen mass a thousand ways. Measuring per-sybil rank would show a
 * comfortingly small number while the attacker held exactly as much power as before, so the sum is the only
 * honest instrument.
 */
export function attackerMass(
  rank: LineageRank,
  attackerAndSybils: readonly string[],
): number {
  let total = 0;
  for (const v of attackerAndSybils) total += rank.score.get(v) ?? 0;
  return total;
}
