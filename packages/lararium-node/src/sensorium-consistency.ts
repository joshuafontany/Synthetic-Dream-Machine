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
 *      (`vacuous: true`) rather than reporting a false glue. {@link stratificationRestrictions} builds a
 *      REAL shared-comparison-stalk (the skeletal tier) so the overlap is engineered, not toy.
 *  (b) THE RESTRICTIONS ARE NON-LIPSCHITZ (a one-token edit re-roots a tree / flips a mined pattern), so
 *      the radius reads as a DISAGREEMENT SIGNAL, NEVER a distortion bound. `signalKind` says so on the
 *      wire; no caller may read it as a Lipschitz/metric-distortion guarantee.
 *  (c) THE KI CO-CONSISTENCY IS ASPIRATIONAL — {@link kiCoConsistency} is an HONEST STUB returning a
 *      not-yet-built marker. Faking a cosheaf reading through a contravariant (restriction) map is the
 *      silent corruption; we refuse to.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/li-ki-integrities#crucible-tested
 */

import type { Variance } from "./sensorium.js";
import { SHEAF_PLANES } from "./sensorium.js";
import type { Stratification } from "./memetic-wikitext-sensorium.js";

// ── per-plane NATIVE pseudometrics (the stalk metrics) ─────────────────────────────────────────────
//
// Each li-plane's OWN stalk carries a native pseudometric — the metric by which two assignments of THAT
// plane compare (and by which a restriction's per-unit salience is derived). content = cosine (embedding
// direction), structure = tree-edit (the AST grain), form = Jaccard (the mined subpattern SET). All three
// are DISAGREEMENT SIGNALS (caution b), never distortion bounds — normalized-edit + cosine are not true
// metrics, and that is fine: the sensorium reads the wave, never a Lipschitz promise about the water.

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
  return 1 + t.children.reduce((s, c) => s + treeSize(c), 0);
}
function forestSize(f: readonly LabeledTree[]): number {
  return f.reduce((s, t) => s + treeSize(t), 0);
}

/**
 * Raw ordered-forest edit distance (unit insert/delete/relabel costs) — the standard recursive
 * decomposition on RIGHTMOST roots. Memoized on serialized (F,G) so tiny trees stay cheap. Exact for the
 * skeletal-scale trees a sensorium reads.
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
 * Tree-edit DISTANCE normalized to [0,1] (structure's native metric): raw ordered edit distance over
 * `max(|a|,|b|)`. 0 ⟺ identical trees. NON-Lipschitz by nature (a re-root spikes it), read as a
 * disagreement signal only.
 */
export function treeEditDistance(a: LabeledTree, b: LabeledTree): number {
  const raw = forestEditRaw([a], [b], new Map());
  const denom = Math.max(treeSize(a), treeSize(b));
  return denom === 0 ? 0 : raw / denom;
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

/** L∞ over the overlap: `max_u |vp(u) − vq(u)|`; 0 ⟺ equal on every shared unit; locus = the argmax unit(s). */
export const chebyshevStalkMetric: StalkMetric = (vp, vq, overlap) => {
  let distance = 0;
  const diffs: Array<{ unit: string; d: number }> = [];
  for (const u of overlap) {
    const d = Math.abs((vp.get(u) ?? 0) - (vq.get(u) ?? 0));
    diffs.push({ unit: u, d });
    if (d > distance) distance = d;
  }
  const locus = distance > 0 ? diffs.filter((x) => x.d === distance).map((x) => x.unit) : [];
  return { distance, locus };
};

export interface ConsistencyOptions {
  /** the pair-overlap pseudometric; default {@link chebyshevStalkMetric}. */
  readonly stalkMetric?: StalkMetric;
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

  const stalkUnits = new Set(stalk.units);
  // Each plane's domain, intersected with the SHARED stalk — the engineered-overlap projection.
  const domains = restrictions.map((r) => {
    const dom = new Set<string>();
    for (const u of r.value.keys()) if (stalkUnits.has(u)) dom.add(u);
    return dom;
  });

  if (stalk.units.length === 0) {
    return {
      radius: 0, glues: false, vacuous: true, pairs: [], obstructionLocus: [],
      signalKind: "disagreement-signal",
      note: "empty comparison stalk — no engineered overlap; a vacuous 0 (caution a).",
    };
  }

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

  const vacuous = !anyBinding;
  return {
    radius: vacuous ? 0 : radius,
    glues: !vacuous && radius === 0,
    vacuous,
    pairs,
    obstructionLocus: [...bindingLoci],
    signalKind: "disagreement-signal",
    ...(vacuous
      ? { note: "no pair shares a domain overlap — disjoint aspects, a vacuous 0 (caution a)." }
      : {}),
  };
}

// ── an ENGINEERED overlap over a real skeletal tier (caution a, made concrete) ─────────────────────

/**
 * Build the three sheaf-plane restrictions from a REAL {@link Stratification} — the engineered
 * shared-comparison-stalk (caution a). The stalk is the skeletal tier: each anchor `s{i}` is a shared
 * unit ALL THREE planes speak to (genuine redundancy, not disjoint aspects). Each plane gives every
 * anchor a [0,1] salience through its OWN lens, so a coherent text has the three coincide (they glue),
 * and a unit that is content-heavy yet structurally trivial and pattern-absent makes them DIVERGE:
 *
 *   content   — normalized PROSE MASS (the recurring-coherence carrier: how much black prose the anchor holds).
 *   structure — normalized ASSOCIATION DEGREE (the AST grain: how many red strata dock onto the anchor).
 *   form      — RECURRING-RELATION participation (the induced grammar: 1 iff the anchor is governed by a
 *               relation label that occurs ≥2× across the associations, else 0).
 *
 * Returns `{ stalk, restrictions }` ready for {@link consistencyRadius}. On a well-formed corpus the three
 * agree on the salient units and the radius is ~0; seed a disagreement (an ungoverned prose anchor) and it
 * goes positive, localized to that anchor.
 */
export function stratificationRestrictions(strat: Stratification): {
  stalk: ComparisonStalk; restrictions: PlaneRestriction[];
} {
  const units = strat.skeletal.map((_, i) => `s${i}`);

  // structure: association degree per anchor.
  const degree = new Array<number>(strat.skeletal.length).fill(0);
  // form: which relation labels recur (≥2 occurrences), and which anchors they govern.
  const relCount = new Map<string, number>();
  for (const e of strat.associations) relCount.set(e.relation, (relCount.get(e.relation) ?? 0) + 1);
  for (const e of strat.associations) degree[e.anchor] = (degree[e.anchor] ?? 0) + 1;

  const maxLen = Math.max(1, ...strat.skeletal.map((a) => a.span[1] - a.span[0]));
  const maxDeg = Math.max(1, ...degree);

  const content = new Map<string, number>();
  const structure = new Map<string, number>();
  const form = new Map<string, number>();
  for (let i = 0; i < strat.skeletal.length; i++) {
    const a = strat.skeletal[i]!;
    content.set(units[i]!, (a.span[1] - a.span[0]) / maxLen);
    structure.set(units[i]!, (degree[i] ?? 0) / maxDeg);
  }
  for (let i = 0; i < strat.skeletal.length; i++) form.set(units[i]!, 0);
  for (const e of strat.associations) {
    if ((relCount.get(e.relation) ?? 0) >= 2) form.set(units[e.anchor]!, 1);
  }

  return {
    stalk: { units },
    restrictions: [
      { plane: "content", variance: "sheaf", value: content },
      { plane: "structure", variance: "sheaf", value: structure },
      { plane: "form", variance: "sheaf", value: form },
    ],
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

// ── the KI co-consistency — HONESTLY STUBBED (caution c) ───────────────────────────────────────────

/** The honest not-yet-built marker for the cosheaf (ki) co-consistency. */
export const KI_CO_CONSISTENCY_STUB = "ki-co-consistency-not-yet-built" as const;

/** The result of the ki co-consistency — a stub until the dual (cosheaf) construction lands. */
export interface KiCoConsistency {
  readonly built: false;
  readonly marker: typeof KI_CO_CONSISTENCY_STUB;
  /** the cosheaf planes this would read (bands/coupling) — recorded so the seam is legible, not run. */
  readonly planes: readonly string[];
  readonly note: string;
}

/**
 * The KI co-consistency (cosheaf extension) — ASPIRATIONAL, honestly stubbed (caution c).
 *
 * TODO(ki-cosheaf): a cosheaf glues local→global by EXTENSION maps and a COLIMIT, the categorical DUAL of
 * the sheaf's restriction + limit. bands/coupling live there — a coarse wavelet coefficient depends on
 * data OUTSIDE its span, so the sheaf's restriction map isn't even well-defined for them. Computing a
 * "ki-radius" by pushing bands/coupling through the SAME contravariant restriction the li-radius uses is
 * the SILENT CORRUPTION the crucible names — it penalizes the flow for failing to be static. So this
 * refuses to fake it: it returns the not-yet-built marker. The real build needs extension maps + a
 * co-consistency (cosheaf) construction, not a restriction; that is research, not buildable-now.
 */
export function kiCoConsistency(planes: readonly string[] = ["bands", "coupling"]): KiCoConsistency {
  return {
    built: false,
    marker: KI_CO_CONSISTENCY_STUB,
    planes: [...planes],
    note:
      "cosheaf co-consistency is aspirational — needs extension maps + a colimit gluing (the DUAL of the "
      + "sheaf restriction), not a contravariant restriction. Faking it through the li restriction map is the "
      + "silent corruption (li-ki-integrities.md#crucible-tested). Not-yet-built by design.",
  };
}
