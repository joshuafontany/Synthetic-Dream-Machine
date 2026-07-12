/**
 * sensorium-consistency — the Robinson CONSISTENCY-RADIUS over a sensorium's LI (sheaf) planes.
 *
 * The crucible verdict (li-ki-integrities.md#crucible-tested): content/structure/form are SHEAVES (li,
 * contravariant restriction, global→local); bands/coupling are COSHEAVES (ki, covariant extension,
 * local→global). They hold as a DUAL PAIR, and consistency is computed SEPARATELY per posture — one
 * merged contravariant gluing SILENTLY corrupts (it penalizes the flow for failing to be static).
 *
 * This module computes the LI side — the principled li-disagreement signal, buildable NOW:
 *
 *   `li-radius = 0  ⟺  the li-planes GLUE` (agree on every overlap) — a global section exists.
 *   `li-radius > 0`  ⟺  an OBSTRUCTION — the assignment is a valid sheaf carrying NO global section
 *                       (the exact "no-global-now": a positive consistency radius, NOT a failure to be a
 *                       sheaf — that slogan is a category error, per the crucible re-cut).
 *
 * THREE crucible cautions, honored here:
 *  (a) VALUE LIVES IN ENGINEERED OVERLAPS. The comparison stalk must encode GENUINE redundancy — a
 *      SHARED unit universe all three planes speak to. Planes with DISJOINT domains have no overlap to
 *      constrain, so the radius is VACUOUSLY 0 and buys nothing; {@link consistencyRadius} FLAGS that
 *      (`vacuous: true`) rather than reporting a false glue. The CORPUS-side adapters build the REAL
 *      shared-comparison-stalks (node's `stratificationRestrictions` over a skeletal tier; tw5's
 *      `WikiStoreAdapter` over a tiddler-title universe) so the overlap is engineered, not toy.
 *  (b) THE RESTRICTIONS ARE NON-LIPSCHITZ (a one-token edit re-roots a tree / flips a mined pattern), so
 *      the radius reads as a DISAGREEMENT SIGNAL, NEVER a distortion bound. `signalKind` says so on the
 *      wire; no caller may read it as a Lipschitz/metric-distortion guarantee.
 *  (c) THE KI CO-CONSISTENCY IS FOUNDED — {@link kiCoConsistency} is the cosheaf PUSHFORWARD mirror of
 *      this li-radius (Hansen–Ghrist inner-product/adjoint duality: `∂ = δ*`), NOT a cosheaf faked through
 *      a contravariant restriction. It EXTENDS faces UP into a shared coface-stalk (the MODWT-MRA synthesis
 *      is the real extension map) and reads pairwise disagreement on codomain CO-OVERLAPS — the exact dual
 *      of the sheaf's restriction + overlap. The old refusal (faking it through a restriction) is dissolved.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/li-ki-integrities#crucible-tested
 */

// ── the li/ki plane taxonomy (the variance vocabulary the whole dual pair rides) ───────────────────
//
// HOME: this organ enforces the variance gate, so the taxonomy lives HERE (mesh, the platform-blind
// floor); node's sensorium hull and every higher tier re-import it from `@lararium/mesh`.

/** A plane's posture: `sheaf` RESTRICTS (li, contravariant, global→local) · `cosheaf` EXTENDS (ki, covariant, local→global). */
export type Variance = "sheaf" | "cosheaf";

/** The canonical LI (sheaf) planes — content/structure/form RESTRICT (contravariant, global→local). */
export const SHEAF_PLANES = ["content", "structure", "form"] as const;

/**
 * The canonical KI (cosheaf) planes — bands/coupling EXTEND (covariant, local→global). They ride the
 * manifest's own `bands`/`coupling` BASE-cap fields, never `has.*` (they store no leaf-dir bytes), so
 * their cosheaf posture stays structural.
 */
export const COSHEAF_PLANES = ["bands", "coupling"] as const;

// ── per-plane NATIVE pseudometrics (the stalk metrics) ─────────────────────────────────────────────
//
// Each li-plane's OWN stalk carries a native pseudometric — the metric by which two assignments of THAT
// plane compare (and by which a restriction's per-unit salience is derived). content = cosine (embedding
// direction), structure = a near-linear tree pseudometric (DECKARD characteristic-vector embedding, the
// AST grain — no longer the cubic tree-edit that timed out past ~200 nodes), form = Jaccard (the mined
// subpattern SET). All three are DISAGREEMENT SIGNALS (caution b), never distortion bounds — they may obey
// the triangle inequality (angular cosine / Ruzicka do), yet stay NON-Lipschitz (a one-token edit re-roots
// a tree), so the sensorium reads the wave, never a Lipschitz promise about the water.

/** Cosine DISTANCE `1 − cos∠` (content's native metric). Both-zero ⇒ 0; exactly-one-zero ⇒ 1. Range [0,2]. */
export function cosineDistance(a: readonly number[], b: readonly number[]): number {
  const n = Math.max(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] ?? 0, y = b[i] ?? 0;
    dot += x * y; na += x * x; nb += y * y;
  }
  if (na === 0 && nb === 0) return 0;
  if (na === 0 || nb === 0) return 1;
  return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Jaccard DISTANCE `1 − |A∩B|/|A∪B|` (form's native metric). Both-empty ⇒ 0. Range [0,1]. */
export function jaccardDistance<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : 1 - inter / union;
}

/** A labeled ORDERED tree — the structure plane's native stalk value (the AST grain, the jade-vein). */
export interface LabeledTree {
  readonly label: string;
  readonly children: readonly LabeledTree[];
}

function treeSize(t: LabeledTree): number {
  // iterative — a deep chain (n≳10k) never overflows the stack computing its own size.
  let n = 0;
  const stack: LabeledTree[] = [t];
  while (stack.length > 0) {
    const node = stack.pop()!;
    n++;
    for (const c of node.children) stack.push(c);
  }
  return n;
}
function forestSize(f: readonly LabeledTree[]): number {
  return f.reduce((s, t) => s + treeSize(t), 0);
}

// ── the structure-plane distance: a near-linear tree PSEUDOMETRIC (DECKARD default · pq-gram refine) ──
//
// GROUND (research spirit a3e0af90): exact tree-edit (TED) is CUBIC (APTED), and the naive rightmost-root
// forestEditRaw that lived here grew ≈O(n^3.2) — it TIMED OUT past ~200 nodes. And the exact number is NOT
// NEEDED: Robinson's recovery bound wants Lipschitz-K restrictions; ours are NON-Lipschitz (a one-token
// edit re-roots a tree) and the radius reads as a DISAGREEMENT SIGNAL, not a distortion bound — so exact
// TED feeds a guarantee we discard. We descend to a near-linear PSEUDOMETRIC:
//
//   DECKARD (default, hot path) — a fixed-basis CHARACTERISTIC-VECTOR embedding (Jiang et al., ICSE 2007):
//     count each node's q-level atomic subtree pattern into a histogram (O(n) build), then compare two
//     histograms by ANGULAR cosine distance (O(dim)). REUSES the content-plane cosine substrate. Angular
//     distance (arccos∘cos, /π) is a genuine pseudometric — the triangle inequality holds — and rises with
//     edit distance (DECKARD's similarity theorem). 0 ⟺ identical characteristic vectors.
//
//   pq-gram (refine, opt-in) — Augsten et al.'s p-ancestor × w-sibling shingles: shred each tree to a BAG
//     of pq-grams (O(n·w) build), compare by generalized-Jaccard (Ruzicka) distance, a proven pseudometric
//     (triangle inequality) that LOWER-BOUNDS TED. Use on a DECKARD-shortlisted pair when a tighter read is
//     wanted. LICENSE NOTE: the reference impl `@se2p/pq-distance` is GPL-3.0 — NOT taken as a dependency;
//     the construction is elementary (shred → bag → bag-distance) and is INLINED here clean-room, so no GPL
//     obligation touches this MIT tree.
//
//   exact TED (shelved) — {@link treeEditExact} keeps the old forestEditRaw behind the `"exact"` method for
//     the rare certified-count case; it is cubic and caps out ~200 nodes, so it is NEVER the hot path.
//
// All three are DISAGREEMENT SIGNALS (caution b), never distortion bounds.

/** How {@link treeEditDistance} measures — near-linear DECKARD embedding (default), pq-gram refine, or shelved exact TED. */
export type TreeDistanceMethod = "deckard" | "pqgram" | "exact";

export interface TreeDistanceOptions {
  /** the metric: `"deckard"` (default, near-linear embedding) · `"pqgram"` (refine) · `"exact"` (shelved cubic TED). */
  readonly method?: TreeDistanceMethod;
  /** DECKARD: how many tree LEVELS each atomic pattern spans (default 2 — a node + its immediate child labels). */
  readonly q?: number;
  /** pq-gram: the ANCESTOR stem length p (default 2). */
  readonly p?: number;
  /** pq-gram: the SIBLING window width w (default 3). */
  readonly w?: number;
}

// ── DECKARD characteristic-vector embedding (the default hot path) ─────────────────────────────────

/** The dummy/null label the pattern serializer never collides with (no real AST label carries a NUL). */
const NUL = "\u0000";

/** Escape the structural delimiters so a label containing `( ) , \` cannot forge a false pattern boundary. */
function esc(label: string): string {
  return label.replace(/[\\(),]/g, "\\$&");
}

/** Serialize the subtree rooted at `node`, TRUNCATED to `levels` tree-levels — one q-level atomic pattern. */
function patternAt(node: LabeledTree, levels: number): string {
  if (levels <= 1 || node.children.length === 0) return esc(node.label);
  return esc(node.label) + "(" + node.children.map((c) => patternAt(c, levels - 1)).join(",") + ")";
}

/**
 * DECKARD characteristic vector — the histogram of q-level atomic subtree patterns (Jiang et al. 2007).
 * O(n) build: each of n nodes emits ONE bounded-depth pattern, and the inner serialize recurses only `q`
 * deep, so a chain of ANY length never blows the stack. The vector's KEYS form the fixed pattern basis;
 * two trees compare over the union of their keys. Identical trees ⇒ identical vectors.
 */
export function characteristicVector(t: LabeledTree, q = 2): Map<string, number> {
  const vec = new Map<string, number>();
  const stack: LabeledTree[] = [t];
  while (stack.length > 0) {
    const node = stack.pop()!;
    const key = patternAt(node, q);
    vec.set(key, (vec.get(key) ?? 0) + 1);
    for (const c of node.children) stack.push(c);
  }
  return vec;
}

/** Two sparse histograms carry the SAME key→count map (identical characteristic vectors ⇒ exact-0 distance). */
function mapsEqual(a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, x] of a) if (b.get(k) !== x) return false;
  return true;
}

/** ANGULAR cosine distance over two sparse histograms — `arccos(cos∠)/π` ∈ [0,1], a triangle-obeying pseudometric. */
function angularCosine(a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): number {
  // Equal vectors ⇒ EXACTLY 0 — acos amplifies a 1-ULP fp error near sim=1, so snap the reflexive case.
  if (mapsEqual(a, b)) return 0;
  let dot = 0, na = 0, nb = 0;
  for (const [k, x] of a) { na += x * x; const y = b.get(k); if (y !== undefined) dot += x * y; }
  for (const [, y] of b) nb += y * y;
  if (na === 0 && nb === 0) return 0;
  if (na === 0 || nb === 0) return 1;
  const sim = Math.max(-1, Math.min(1, dot / Math.sqrt(na * nb)));
  return Math.acos(sim) / Math.PI;
}

/**
 * DECKARD distance — angular cosine over the two trees' characteristic vectors. Near-linear (O(n) build +
 * O(dim) compare), a triangle-obeying pseudometric in [0,1]; 0 ⟺ the characteristic vectors coincide.
 */
export function deckardDistance(a: LabeledTree, b: LabeledTree, q = 2): number {
  return angularCosine(characteristicVector(a, q), characteristicVector(b, q));
}

// ── pq-gram profile distance (the opt-in refine; algorithm INLINED, the GPL dep avoided) ───────────

/**
 * pq-gram profile — the bag of p-ancestor × w-sibling shingles (Augsten, Böhlen, Gamper 2005). The tree is
 * VIRTUALLY extended with NUL dummies (p−1 stem-padding above every node, w−1 padding each sibling run) so
 * each anchor emits well-formed grams. O(n·w) build, ITERATIVE (a deep chain never overflows). INLINED
 * clean-room — the `@se2p/pq-distance` reference is GPL-3.0 and is NOT vendored; the construction is
 * elementary.
 */
export function pqGramProfile(t: LabeledTree, p = 2, w = 3): Map<string, number> {
  const profile = new Map<string, number>();
  const add = (stem: readonly string[], win: readonly string[]) => {
    const key = stem.map(esc).join("") + "" + win.map(esc).join("");
    profile.set(key, (profile.get(key) ?? 0) + 1);
  };
  // each stack frame carries the node + its ancestor-stem (length p, NUL-padded above the root).
  const stack: Array<{ node: LabeledTree; stem: readonly string[] }> = [
    { node: t, stem: new Array<string>(Math.max(0, p)).fill(NUL) },
  ];
  while (stack.length > 0) {
    const { node, stem } = stack.pop()!;
    const anc = p > 0 ? [...stem.slice(1), node.label] : []; // shift label(node) in → length p
    const kids = node.children;
    if (kids.length === 0) {
      add(anc, new Array<string>(Math.max(0, w)).fill(NUL)); // leaf: one all-dummy sibling window
    } else {
      const sib: string[] = new Array<string>(Math.max(0, w)).fill(NUL);
      for (const c of kids) {
        sib.shift(); sib.push(c.label);
        add(anc, sib);
        stack.push({ node: c, stem: anc });
      }
      for (let k = 0; k < w - 1; k++) { sib.shift(); sib.push(NUL); add(anc, sib); } // flush trailing dummies
    }
  }
  return profile;
}

/** Generalized-Jaccard (Ruzicka) distance over two bags: `1 − Σmin/Σmax` ∈ [0,1], a proven pseudometric. */
function ruzicka(a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): number {
  let inter = 0, union = 0;
  const keys = new Set<string>([...a.keys(), ...b.keys()]);
  for (const k of keys) {
    const x = a.get(k) ?? 0, y = b.get(k) ?? 0;
    inter += Math.min(x, y); union += Math.max(x, y);
  }
  return union === 0 ? 0 : 1 - inter / union;
}

/**
 * pq-gram DISTANCE — Ruzicka distance over the two trees' pq-gram profiles. Near-linear, a triangle-obeying
 * pseudometric in [0,1] that LOWER-BOUNDS the true edit distance; 0 ⟺ identical profiles.
 */
export function pqGramDistance(a: LabeledTree, b: LabeledTree, p = 2, w = 3): number {
  return ruzicka(pqGramProfile(a, p, w), pqGramProfile(b, p, w));
}

// ── exact TED (SHELVED — cubic, off the hot path) ──────────────────────────────────────────────────

/**
 * Raw ordered-forest edit distance (unit insert/delete/relabel costs) — the standard recursive
 * decomposition on RIGHTMOST roots, memoized on serialized (F,G). CUBIC-plus (measured ≈O(n^3.2)); it caps
 * out ~200 nodes and is SHELVED behind {@link treeEditExact} for the rare certified-count case only.
 */
function forestEditRaw(F: readonly LabeledTree[], G: readonly LabeledTree[], memo: Map<string, number>): number {
  if (F.length === 0 && G.length === 0) return 0;
  if (F.length === 0) return forestSize(G);
  if (G.length === 0) return forestSize(F);
  const key = serializeForest(F) + "|" + serializeForest(G);
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  const f = F[F.length - 1]!, g = G[G.length - 1]!;
  const del = forestEditRaw([...F.slice(0, -1), ...f.children], G, memo) + 1;               // delete f's root
  const ins = forestEditRaw(F, [...G.slice(0, -1), ...g.children], memo) + 1;               // insert g's root
  const rel = forestEditRaw(f.children, g.children, memo)
    + forestEditRaw(F.slice(0, -1), G.slice(0, -1), memo)
    + (f.label === g.label ? 0 : 1);                                                        // match roots
  const out = Math.min(del, ins, rel);
  memo.set(key, out);
  return out;
}
function serializeForest(f: readonly LabeledTree[]): string {
  return "(" + f.map((t) => t.label + serializeForest(t.children)).join(",") + ")";
}

/**
 * EXACT tree-edit distance normalized to [0,1] — the SHELVED cubic path (Zhang-Shasha-family recursion):
 * raw ordered edit distance over `max(|a|,|b|)`. 0 ⟺ identical trees. Use ONLY for a small tree where a
 * certified edit count is truly needed; the hot path is {@link deckardDistance}. NON-Lipschitz (a re-root
 * spikes it), a disagreement signal, never a distortion bound. CAUTION: caps out ~200 nodes.
 */
export function treeEditExact(a: LabeledTree, b: LabeledTree): number {
  const raw = forestEditRaw([a], [b], new Map());
  const denom = Math.max(treeSize(a), treeSize(b));
  return denom === 0 ? 0 : raw / denom;
}

/**
 * Tree-edit DISTANCE in [0,1] (structure's native stalk metric) — DEFAULTS to the near-linear DECKARD
 * embedding (was the naive cubic forestEditRaw that timed out past ~200 nodes). 0 ⟺ identical trees
 * (identical characteristic vectors). NON-Lipschitz by nature (a re-root spikes it), read as a DISAGREEMENT
 * SIGNAL only. `opts.method` selects `"pqgram"` (the refine) or `"exact"` (the shelved cubic TED).
 */
export function treeEditDistance(a: LabeledTree, b: LabeledTree, opts: TreeDistanceOptions = {}): number {
  switch (opts.method ?? "deckard") {
    case "exact": return treeEditExact(a, b);
    case "pqgram": return pqGramDistance(a, b, opts.p ?? 2, opts.w ?? 3);
    case "deckard":
    default: return deckardDistance(a, b, opts.q ?? 2);
  }
}

// ── the shared comparison stalk + the sheaf restrictions ───────────────────────────────────────────

/**
 * The SHARED comparison stalk — the finite unit universe (skeletal-tier unit ids) the sheaf planes
 * restrict INTO. The engineered OVERLAP (caution a): its value comes from genuine redundancy — the
 * planes must all SPEAK to these units. An empty stalk ⇒ any radius is vacuous.
 */
export interface ComparisonStalk {
  readonly units: readonly string[];
}

/**
 * One sheaf plane's RESTRICTION into the comparison stalk — the restriction map's image: a per-unit
 * VALUE at each unit the plane OBSERVES. The key set is the plane's DOMAIN; two planes compare only on
 * their domain OVERLAP (Robinson: sections constrain each other on overlaps, nowhere else). The value is
 * a normalized salience in [0,1] — a common reading (boundary/hub/pattern weight) all three lenses give
 * the same unit, so they can AGREE or DISAGREE there.
 */
export interface PlaneRestriction {
  readonly plane: string;
  /** MUST be `sheaf` — the li-radius runs over the sheaf planes ONLY; a cosheaf plane is refused here. */
  readonly variance: Variance;
  /** unit id → the plane's [0,1] salience value at that unit. The key set is the observed DOMAIN. */
  readonly value: ReadonlyMap<string, number>;
}

// ── the consistency radius (the sup over overlaps) ─────────────────────────────────────────────────

/** One localized pair OBSTRUCTION — where two planes disagree, and by how much, on their shared overlap. */
export interface PairObstruction {
  readonly a: string;
  readonly b: string;
  /** the pair's disagreement on the overlap (the stalk pseudometric); 0 ⟺ they glue there. */
  readonly distance: number;
  /** the overlap unit(s) that MAXIMIZE the disagreement — the localizable obstruction locus for this pair. */
  readonly locus: readonly string[];
  /** this pair's domains do not overlap — no constraint, a vacuous 0 (caution a). */
  readonly vacuous: boolean;
}

/** The li-consistency verdict — a sheaf reading over the engineered overlap. */
export interface ConsistencyRadius {
  /** the sup over pairwise overlaps — the Robinson consistency radius; 0 ⟺ the li-planes glue. */
  readonly radius: number;
  /** a real global SECTION exists: radius === 0 AND the reading is not vacuous (a genuine overlap held). */
  readonly glues: boolean;
  /** NO engineered overlap constrained the radius (empty stalk / all pairs domain-disjoint) — 0 buys nothing. */
  readonly vacuous: boolean;
  /** per-pair localizable obstructions (each carries its own overlap locus). */
  readonly pairs: readonly PairObstruction[];
  /** the union of the maximizing loci across the binding (non-vacuous) pairs — where to look. */
  readonly obstructionLocus: readonly string[];
  /**
   * the value is a DISAGREEMENT SIGNAL, never a distortion bound (caution b). The restrictions are
   * non-Lipschitz; no caller may read `radius` as a metric-distortion / Lipschitz guarantee.
   */
  readonly signalKind: "disagreement-signal";
  /** a human note when the reading is vacuous or degenerate. */
  readonly note?: string;
}

/** The stalk pseudometric on a pair's OVERLAP — default L∞ (Chebyshev) over the shared units' values. */
export type StalkMetric = (
  vp: ReadonlyMap<string, number>, vq: ReadonlyMap<string, number>, overlap: readonly string[],
) => { distance: number; locus: readonly string[] };

/**
 * The shared L∞-argmax core the two default posture-metrics ride: `max_c |vp(c) − vq(c)|` over the shared
 * cells; locus = the argmax cell(s) (empty when the max is 0). The li stalk-metric and the ki coface-metric
 * are the SAME computation under a renamed locus — this is that one computation. It NEVER merges the
 * postures: each metric wraps it and re-labels the locus into its own posture's field.
 */
function linfArgmax(
  vp: ReadonlyMap<string, number>, vq: ReadonlyMap<string, number>, cells: readonly string[],
): { distance: number; locus: readonly string[] } {
  let distance = 0;
  const diffs: Array<{ cell: string; d: number }> = [];
  for (const c of cells) {
    const d = Math.abs((vp.get(c) ?? 0) - (vq.get(c) ?? 0));
    diffs.push({ cell: c, d });
    if (d > distance) distance = d;
  }
  const locus = distance > 0 ? diffs.filter((x) => x.d === distance).map((x) => x.cell) : [];
  return { distance, locus };
}

/** L∞ over the overlap: `max_u |vp(u) − vq(u)|`; 0 ⟺ equal on every shared unit; locus = the argmax unit(s). */
export const chebyshevStalkMetric: StalkMetric = (vp, vq, overlap) => linfArgmax(vp, vq, overlap);

export interface ConsistencyOptions {
  /** the pair-overlap pseudometric; default {@link chebyshevStalkMetric}. */
  readonly stalkMetric?: StalkMetric;
}

/** A posture-neutral restriction — the common shape the li sheaf-restriction and ki cosheaf-face share. */
interface CellRestriction {
  readonly plane: string;
  readonly variance: Variance;
  readonly value: ReadonlyMap<string, number>;
}

/** The neutral pair metric the sup rides — disagreement + argmax locus over a pair's shared cells. */
type CellMetric = (
  vp: ReadonlyMap<string, number>, vq: ReadonlyMap<string, number>, overlap: readonly string[],
) => { distance: number; locus: readonly string[] };

/**
 * The SUP-OVER-PAIRS core both postures ride (li restrict/meet · ki extend/coface) — the ONE Robinson
 * radius mechanism, parameterized by the shared cell set and the pair metric. It projects each
 * restriction's key set onto the shared cells, reads pairwise disagreement on each pair's overlap, and
 * returns the sup, the union of maximizing loci, and whether ANY pair bound (non-vacuous). It NEVER merges
 * the postures: each caller passes ONLY its own posture's restrictions and its own cells (units / cofaces),
 * enforces its own variance gate first, and re-labels this neutral result into its own typed verdict — the
 * li/ki dual stays two functions over one mechanism (the "line-for-line" mirror, de-duplicated in truth).
 */
function supOverPairs(
  restrictions: readonly CellRestriction[], cells: readonly string[], metric: CellMetric,
): { radius: number; vacuous: boolean; pairs: PairObstruction[]; bindingLoci: string[] } {
  const cellSet = new Set(cells);
  // Each restriction's domain, intersected with the SHARED stalk — the engineered-overlap projection.
  const domains = restrictions.map((r) => {
    const dom = new Set<string>();
    for (const u of r.value.keys()) if (cellSet.has(u)) dom.add(u);
    return dom;
  });

  const pairs: PairObstruction[] = [];
  let radius = 0;
  const bindingLoci = new Set<string>();
  let anyBinding = false;

  for (let i = 0; i < restrictions.length; i++) {
    for (let j = i + 1; j < restrictions.length; j++) {
      const overlap = [...domains[i]!].filter((u) => domains[j]!.has(u));
      if (overlap.length === 0) {
        pairs.push({ a: restrictions[i]!.plane, b: restrictions[j]!.plane, distance: 0, locus: [], vacuous: true });
        continue;
      }
      anyBinding = true;
      const { distance, locus } = metric(restrictions[i]!.value, restrictions[j]!.value, overlap);
      pairs.push({ a: restrictions[i]!.plane, b: restrictions[j]!.plane, distance, locus, vacuous: false });
      if (distance > radius) radius = distance;
      for (const u of locus) bindingLoci.add(u);
    }
  }

  return { radius, vacuous: !anyBinding, pairs, bindingLoci: [...bindingLoci] };
}

/**
 * Compute the Robinson CONSISTENCY-RADIUS over the LI (sheaf) planes — the SUP of pairwise disagreement
 * on domain OVERLAPS, restricted to the engineered comparison stalk. Only `variance === "sheaf"`
 * restrictions are admitted (a cosheaf here would be the silent corruption — it is thrown out, loudly).
 *
 *   radius === 0 && !vacuous  ⟹  the li-planes GLUE (a global section exists).
 *   radius  >  0              ⟹  an OBSTRUCTION, localized in `pairs[*].locus` / `obstructionLocus`.
 *   vacuous                   ⟹  no engineered overlap constrained it (caution a) — 0 means nothing.
 */
export function consistencyRadius(
  restrictions: readonly PlaneRestriction[], stalk: ComparisonStalk, opts: ConsistencyOptions = {},
): ConsistencyRadius {
  const metric = opts.stalkMetric ?? chebyshevStalkMetric;

  const nonSheaf = restrictions.filter((r) => r.variance !== "sheaf");
  if (nonSheaf.length > 0) {
    throw new Error(
      `sensorium-consistency: the li-radius admits SHEAF planes only; got cosheaf plane(s) `
      + `[${nonSheaf.map((r) => r.plane).join(", ")}] — a cosheaf read through a restriction map is the `
      + `silent corruption (li-ki-integrities.md#crucible-tested). Route bands/coupling to kiCoConsistency.`,
    );
  }

  if (stalk.units.length === 0) {
    return {
      radius: 0, glues: false, vacuous: true, pairs: [], obstructionLocus: [],
      signalKind: "disagreement-signal",
      note: "empty comparison stalk — no engineered overlap; a vacuous 0 (caution a).",
    };
  }

  // the li posture: restrict onto the meet-stalk units, read L∞ disagreement (the StalkMetric IS a CellMetric).
  const { radius, vacuous, pairs, bindingLoci } = supOverPairs(restrictions, stalk.units, metric);
  return {
    radius: vacuous ? 0 : radius,
    glues: !vacuous && radius === 0,
    vacuous,
    pairs,
    obstructionLocus: bindingLoci,
    signalKind: "disagreement-signal",
    ...(vacuous
      ? { note: "no pair shares a domain overlap — disjoint aspects, a vacuous 0 (caution a)." }
      : {}),
  };
}

/** Guard: assert every restriction rides a canonical li (sheaf) plane, so nothing cosheaf leaks in. */
export function assertSheafPlanes(restrictions: readonly PlaneRestriction[]): void {
  const known = new Set<string>(SHEAF_PLANES);
  for (const r of restrictions) {
    if (r.variance !== "sheaf") {
      throw new Error(`sensorium-consistency: plane "${r.plane}" is ${r.variance}, not a sheaf.`);
    }
    if (!known.has(r.plane)) {
      // An OPEN record (has-stack clause 4) may carry a novel sheaf plane; we allow it, tag-driven.
    }
  }
}

// ── the KI co-consistency — the cosheaf PUSHFORWARD mirror (caution c, now FOUNDED) ────────────────
//
// The categorical DUAL of the li-radius (li-ki-integrities.md#crucible-tested), on Hansen–Ghrist
// INNER-PRODUCT/ADJOINT duality: once a metric sits on the stalks, the cosheaf boundary `∂ = δ*`, and the
// co-consistency-radius is the PUSHFORWARD mirror of Robinson's radius. Where the sheaf RESTRICTS a plane's
// section DOWN into a shared meet-stalk and reads pairwise disagreement on domain OVERLAPS, the cosheaf
// EXTENDS a face's value UP into a shared coface-stalk and reads pairwise disagreement on codomain
// CO-OVERLAPS — restriction ⇄ extension, limit ⇄ colimit, overlap ⇄ co-overlap; everything else the same
// shape as {@link consistencyRadius}, line-for-line.
//
//   ki-radius = 0  ⟺  the local flows CO-EXTEND coherently (a global CO-section) — every face that
//                     synthesizes up into a shared coface AGREES on the coefficient there.
//   ki-radius > 0  ⟺  a localizable CO-OBSTRUCTION, keyed to the offending coface.
//
// The extension operator is REAL, never faked through a restriction (the old caution-c refusal is
// dissolved): the bands plane's MODWT-MRA SYNTHESIS (the additive reconstruction `x = ΣD_j + A`) IS the
// extension — a fine detail band synthesizes UP into a coarse coface (a coarse-block coefficient), and the
// check reads whether the fine cells AGREE on the coarse coefficient they jointly produce. Under real scale
// separation every fine band is ZERO-MEAN over a coarse block, so the bands co-extend to the same coarse
// read (0). A band that LEAKS coarse energy pushes its block coefficient off the others — a co-obstruction
// localized to that coface. {@link bandSynthesisCoRestrictions} builds this from the MODWT-MRA output.
//
// The SAME cautions ride (self-dual): (a) value lives in ENGINEERED CO-OVERLAPS — faces with disjoint
// codomains share no coface, a VACUOUS 0, flagged never false-co-glued; (b) the extensions are
// NON-LIPSCHITZ (wavelet synthesis is no metric-distortion bound), so the radius reads as a DISAGREEMENT
// SIGNAL, `signalKind` says so; no caller may read it as a Lipschitz guarantee.

/**
 * The shared COFACE stalk — the finite COARSE-cell universe the cosheaf faces EXTEND into (the dual of
 * {@link ComparisonStalk}). The engineered CO-OVERLAP (caution a): its value comes from genuine redundancy
 * — many fine faces must synthesize UP into these SAME coarse cells. An empty stalk ⇒ any radius is vacuous.
 */
export interface CofaceStalk {
  readonly cofaces: readonly string[];
}

/**
 * One cosheaf face's EXTENSION into the coface stalk — the extension map's image: a per-coface VALUE at each
 * coarse cell the face synthesizes UP into (the dual of {@link PlaneRestriction}). The key set is the face's
 * CO-DOMAIN; two faces compare only on their codomain CO-OVERLAP (the dual of Robinson: co-sections
 * constrain each other on co-overlaps, nowhere else). The value is the face's coarse coefficient there — a
 * common reading (the synthesized block coefficient) every face gives the same coface, so they can AGREE or
 * DISAGREE.
 */
export interface PlaneCoRestriction {
  readonly plane: string;
  /** MUST be `cosheaf` — the ki-radius runs over the cosheaf faces ONLY; a sheaf plane is refused here. */
  readonly variance: Variance;
  /** coface id → the face's coarse coefficient there. The key set is the synthesized CO-DOMAIN. */
  readonly value: ReadonlyMap<string, number>;
}

/** One localized pair CO-OBSTRUCTION — where two faces disagree, and by how much, on their shared coface(s). */
export interface CoPairObstruction {
  readonly a: string;
  readonly b: string;
  /** the pair's disagreement on the co-overlap (the coface pseudometric); 0 ⟺ they co-extend there. */
  readonly distance: number;
  /** the shared coface(s) that MAXIMIZE the disagreement — the localizable co-obstruction locus for this pair. */
  readonly offendingCoface: readonly string[];
  /** this pair's codomains share no coface — no constraint, a vacuous 0 (caution a). */
  readonly vacuous: boolean;
}

/**
 * The ki-co-consistency verdict — a cosheaf reading over the engineered co-overlap (the dual of
 * {@link ConsistencyRadius}).
 */
export interface KiCoConsistency {
  /** the sup over pairwise co-overlaps — the co-consistency radius; 0 ⟺ the ki-faces co-extend. */
  readonly radius: number;
  /** a real global CO-SECTION exists: radius === 0 AND the reading is not vacuous (a genuine co-overlap held). */
  readonly coExtends: boolean;
  /** NO engineered co-overlap constrained the radius (empty stalk / all pairs codomain-disjoint) — 0 buys nothing. */
  readonly vacuous: boolean;
  /** per-pair localizable co-obstructions (each carries its own coface locus). */
  readonly pairs: readonly CoPairObstruction[];
  /** the union of the maximizing cofaces across the binding (non-vacuous) pairs — where to look. */
  readonly offendingCoface: readonly string[];
  /**
   * the value is a DISAGREEMENT SIGNAL, never a distortion bound (caution b). The extensions are
   * non-Lipschitz; no caller may read `radius` as a metric-distortion / Lipschitz guarantee.
   */
  readonly signalKind: "disagreement-signal";
  /** a human note when the reading is vacuous or degenerate. */
  readonly note?: string;
}

/** The coface pseudometric on a pair's CO-OVERLAP — default L∞ over the shared cofaces' coarse coefficients. */
export type CofaceMetric = (
  vp: ReadonlyMap<string, number>, vq: ReadonlyMap<string, number>, coOverlap: readonly string[],
) => { distance: number; offendingCoface: readonly string[] };

/**
 * L∞ over the co-overlap: `max_τ |vp(τ) − vq(τ)|`; 0 ⟺ equal on every shared coface; locus = the argmax
 * coface(s). The coarse coefficients the faces carry are ALREADY the Parseval/energy read (the synthesized
 * block coefficient), so an L∞ over them IS the scale-weighted disagreement — a triangle-obeying
 * pseudometric, the dual of {@link chebyshevStalkMetric}.
 */
export const energyCofaceMetric: CofaceMetric = (vp, vq, coOverlap) => {
  const { distance, locus } = linfArgmax(vp, vq, coOverlap);
  return { distance, offendingCoface: locus };
};

export interface KiCoConsistencyOptions {
  /** the pair-co-overlap pseudometric; default {@link energyCofaceMetric}. */
  readonly cofaceMetric?: CofaceMetric;
}

/**
 * Compute the KI CO-CONSISTENCY-RADIUS over the KI (cosheaf) faces — the SUP of pairwise disagreement on
 * codomain CO-OVERLAPS, restricted to the engineered coface stalk. The PUSHFORWARD mirror of
 * {@link consistencyRadius}: only `variance === "cosheaf"` faces are admitted (a sheaf here would be the
 * mirror silent corruption — a static section pushed through an extension map — so it is thrown out, loudly).
 *
 *   radius === 0 && !vacuous  ⟹  the ki-faces CO-EXTEND (a global co-section exists).
 *   radius  >  0              ⟹  a CO-OBSTRUCTION, localized in `pairs[*].offendingCoface` / `offendingCoface`.
 *   vacuous                   ⟹  no engineered co-overlap constrained it (caution a) — 0 means nothing.
 */
export function kiCoConsistency(
  coRestrictions: readonly PlaneCoRestriction[], stalk: CofaceStalk, opts: KiCoConsistencyOptions = {},
): KiCoConsistency {
  const metric = opts.cofaceMetric ?? energyCofaceMetric;

  const nonCosheaf = coRestrictions.filter((r) => r.variance !== "cosheaf");
  if (nonCosheaf.length > 0) {
    throw new Error(
      `sensorium-consistency: the ki-radius admits COSHEAF faces only; got sheaf plane(s) `
      + `[${nonCosheaf.map((r) => r.plane).join(", ")}] — a sheaf read through an extension map is the mirror `
      + `silent corruption (li-ki-integrities.md#crucible-tested). Route content/structure/form to consistencyRadius.`,
    );
  }

  if (stalk.cofaces.length === 0) {
    return {
      radius: 0, coExtends: false, vacuous: true, pairs: [], offendingCoface: [],
      signalKind: "disagreement-signal",
      note: "empty coface stalk — no engineered co-overlap; a vacuous 0 (caution a).",
    };
  }

  // the ki posture: EXTEND onto the coface stalk, read the SAME sup — adapt the coface-metric's
  // `offendingCoface` locus into the neutral `locus` the core rides, then re-label the loci back on the way out.
  const neutralMetric: CellMetric = (vp, vq, cells) => {
    const { distance, offendingCoface } = metric(vp, vq, cells);
    return { distance, locus: offendingCoface };
  };
  const { radius, vacuous, pairs, bindingLoci } = supOverPairs(coRestrictions, stalk.cofaces, neutralMetric);
  return {
    radius: vacuous ? 0 : radius,
    coExtends: !vacuous && radius === 0,
    vacuous,
    pairs: pairs.map((p): CoPairObstruction => ({
      a: p.a, b: p.b, distance: p.distance, offendingCoface: p.locus, vacuous: p.vacuous,
    })),
    offendingCoface: bindingLoci,
    signalKind: "disagreement-signal",
    ...(vacuous
      ? { note: "no pair shares a coface co-overlap — disjoint flows, a vacuous 0 (caution a)." }
      : {}),
  };
}

// ── an ENGINEERED co-overlap over the MODWT-MRA synthesis (caution a, the dual made concrete) ──────

/**
 * The MODWT-MRA SYNTHESIS output — the additive multi-resolution decomposition the bands sidecar produces
 * (bands_sidecar.py `modwt_mra`): the detail bands fine→coarse plus the coarse smooth, with the exact
 * reconstruction `x = ΣD_j + A`. This IS the extension operator's substrate — each detail band synthesizes
 * UP into a coarse coface (the {@link bandSynthesisCoRestrictions} builder reuses it, never re-derives it).
 */
export interface ModwtMra {
  /** detail bands fine→coarse (D1..Dk); each length N — the maximal-overlap (undecimated) detail bands. */
  readonly details: readonly (readonly number[])[];
  /** the coarse smooth A_k (length N) — the coarse coefficient carrier the details must not disturb. */
  readonly smooth: readonly number[];
}

export interface BandSynthesisOptions {
  /** the coarse coface grain — how many samples each coarse block spans (default: ⌈N/4⌉ ⇒ ~4 cofaces). */
  readonly blockSize?: number;
  /** weight each band's coface coefficient by `√(energy fraction)` (Parseval scale-weight) — off by default. */
  readonly energyWeight?: boolean;
}

/**
 * Build the cosheaf co-restrictions from a REAL MODWT-MRA synthesis — the engineered coface-redundancy
 * (caution a), the dual of {@link stratificationRestrictions}. The coface stalk is the COARSE-block partition
 * `c{0..m}`; each detail band `D{j}` is a FACE that EXTENDS up into every block via the synthesis operator,
 * its per-block value = the coarse read of the band's synthesis over the block (the BLOCK MEAN). Under real
 * scale separation every detail band is ZERO-MEAN over a coarse block, so all bands co-extend to the same
 * coarse coefficient (~0) and the radius is ~0 (they co-extend). A band that LEAKS coarse energy (a nonzero
 * block mean where the others sit at 0) pushes its coefficient off the others and the radius goes positive,
 * localized to the offending block.
 *
 * Returns `{ stalk, coRestrictions }` ready for {@link kiCoConsistency}. With fewer than two detail bands
 * (or an empty signal) the faces share no binding coface and the read is a VACUOUS 0.
 */
export function bandSynthesisCoRestrictions(mra: ModwtMra, opts: BandSynthesisOptions = {}): {
  stalk: CofaceStalk; coRestrictions: PlaneCoRestriction[];
} {
  const n = mra.smooth.length;
  const bs = Math.max(1, opts.blockSize ?? Math.max(1, Math.floor(n / 4)));
  const nBlocks = n === 0 ? 0 : Math.ceil(n / bs);
  const cofaces = Array.from({ length: nBlocks }, (_, c) => `c${c}`);

  // per-band Parseval energy (variance ≈ detail energy), normalized to the max so weights ride [0,1].
  const energies = mra.details.map((d) => {
    if (d.length === 0) return 0;
    const mean = d.reduce((s, x) => s + x, 0) / d.length;
    return d.reduce((s, x) => s + (x - mean) * (x - mean), 0) / d.length;
  });
  const maxE = Math.max(1e-30, ...energies);

  const coRestrictions: PlaneCoRestriction[] = mra.details.map((band, j) => {
    const value = new Map<string, number>();
    const w = opts.energyWeight ? Math.sqrt((energies[j] ?? 0) / maxE) : 1;
    for (let c = 0; c < nBlocks; c++) {
      const start = c * bs, end = Math.min(n, start + bs);
      let sum = 0;
      for (let t = start; t < end; t++) sum += band[t] ?? 0;
      const mean = end > start ? sum / (end - start) : 0;   // the coarse read = the block MEAN of the band's synthesis
      value.set(cofaces[c]!, w * mean);
    }
    return { plane: `D${j + 1}`, variance: "cosheaf", value };
  });

  return { stalk: { cofaces }, coRestrictions };
}
