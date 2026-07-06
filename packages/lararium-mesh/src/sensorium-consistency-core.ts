/**
 * sensorium-consistency-core — the PURE, shared-low LI (sheaf) consistency-radius the cross-tier
 * wiki-sensorium rides. It LIFTS the minimal pure sub-core of the node organ
 * (lararium-node/src/sensorium-consistency.ts) DOWN into `@lararium/mesh` so BOTH the node AND the
 * browser reach ONE hull — the island-isomorphism (a wiki-island's consistency read differs by
 * GRANT, never by hull). The node organ keeps its heavy sides (the DECKARD tree pseudometrics, the
 * KI cosheaf mirror, the single-text `stratificationRestrictions`); this core carries ONLY what the
 * store-level cross-plane witness needs: the Robinson radius over an engineered comparison stalk.
 *
 * The dep law that forces the lift: `mesh` sits at the BOTTOM (it imports no sibling package), `tw5`
 * imports `mesh`, and `node`/`browser` import both. The organ lives at the TOP (in `node`), so `tw5`
 * — where the wiki-sensorium cap eventually stands — cannot reach it without a cycle. Lifting the
 * pure math down clears the cycle by construction.
 *
 *   li-radius = 0 ∧ !vacuous  ⟺  the li-planes GLUE (a global section exists — they agree on the overlap).
 *   li-radius > 0             ⟺  an OBSTRUCTION — a valid sheaf carrying no global section (the exact
 *                                "no-global-now": a positive consistency radius, not a failure to glue).
 *   vacuous                   ⟺  no engineered overlap constrained it — a 0 that buys nothing (the trap).
 *
 * TWO cautions ride from the organ (verbatim in force here):
 *  (a) VALUE LIVES IN ENGINEERED OVERLAPS. The comparison stalk must encode GENUINE redundancy — a
 *      shared unit universe every plane speaks to. Planes with disjoint domains carry no overlap to
 *      constrain, so the radius reads VACUOUSLY 0; {@link consistencyRadius} FLAGS that (`vacuous: true`)
 *      rather than reporting a false glue. A caller that wires the stalk naively goes green proving nothing.
 *  (b) THE RESTRICTIONS RUN NON-LIPSCHITZ (a one-token edit re-roots a tree / flips a mined pattern), so
 *      the radius carries a DISAGREEMENT SIGNAL, never a distortion bound. `signalKind` says so on the wire.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/li-ki-integrities#crucible-tested
 */

// ── the li/ki dual-pair posture tag (mirrors node/sensorium.ts Variance, kept standalone) ──────────

/**
 * The gluing POSTURE a plane's cap takes — `sheaf` (li 理, contravariant restriction, global→local:
 * content/structure/form) or `cosheaf` (ki 氣, covariant extension, local→global: bands/coupling).
 * The core admits SHEAF planes only; a cosheaf read through a restriction map silently corrupts.
 */
export type Variance = "sheaf" | "cosheaf";

/** The canonical LI (sheaf) planes — content/structure/form RESTRICT (contravariant, global→local). */
export const SHEAF_PLANES = ["content", "structure", "form"] as const;

// ── the shared comparison stalk + the sheaf restrictions ───────────────────────────────────────────

/**
 * The SHARED comparison stalk — the finite unit universe the sheaf planes restrict INTO. The
 * engineered OVERLAP (caution a): its value comes from genuine redundancy, so the planes must all
 * SPEAK to these units. An empty stalk renders any radius vacuous.
 */
export interface ComparisonStalk {
  readonly units: readonly string[];
}

/**
 * One sheaf plane's RESTRICTION into the comparison stalk — a per-unit VALUE at each unit the plane
 * OBSERVES. The key set names the plane's DOMAIN; two planes compare only on their domain OVERLAP
 * (Robinson: sections constrain each other on overlaps, nowhere else). The value carries a normalized
 * salience in [0,1] — a common reading every lens gives the same unit, so they AGREE or DISAGREE there.
 */
export interface PlaneRestriction {
  readonly plane: string;
  /** MUST read `sheaf` — the li-radius runs over the sheaf planes ONLY; a cosheaf plane draws a refusal. */
  readonly variance: Variance;
  /** unit id → the plane's [0,1] salience at that unit. The key set names the observed DOMAIN. */
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
  /** this pair's domains carry no overlap — no constraint, a vacuous 0 (caution a). */
  readonly vacuous: boolean;
}

/** The li-consistency verdict — a sheaf reading over the engineered overlap. */
export interface ConsistencyRadius {
  /** the sup over pairwise overlaps — the Robinson consistency radius; 0 ⟺ the li-planes glue. */
  readonly radius: number;
  /** a real global SECTION stands: radius === 0 AND the reading holds non-vacuous (a genuine overlap bound). */
  readonly glues: boolean;
  /** NO engineered overlap constrained the radius (empty stalk / all pairs domain-disjoint) — 0 buys nothing. */
  readonly vacuous: boolean;
  /** per-pair localizable obstructions (each carries its own overlap locus). */
  readonly pairs: readonly PairObstruction[];
  /** the union of the maximizing loci across the binding (non-vacuous) pairs — where to look. */
  readonly obstructionLocus: readonly string[];
  /**
   * the value carries a DISAGREEMENT SIGNAL, never a distortion bound (caution b). The restrictions
   * run non-Lipschitz; no caller may read `radius` as a metric-distortion / Lipschitz guarantee.
   */
  readonly signalKind: "disagreement-signal";
  /** a human note when the reading reads vacuous or degenerate. */
  readonly note?: string;
}

/** The stalk pseudometric on a pair's OVERLAP — default L∞ (Chebyshev) over the shared units' values. */
export type StalkMetric = (
  vp: ReadonlyMap<string, number>, vq: ReadonlyMap<string, number>, overlap: readonly string[],
) => { distance: number; locus: readonly string[] };

/**
 * The shared L∞-argmax core the default stalk-metric rides: `max_c |vp(c) − vq(c)|` over the shared
 * cells; locus = the argmax cell(s) (empty when the max reads 0).
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

/**
 * The SUP-OVER-PAIRS core the radius rides — the Robinson radius mechanism, parameterized by the
 * shared cell set and the pair metric. It projects each restriction's key set onto the shared cells,
 * reads pairwise disagreement on each pair's overlap, and returns the sup, the union of maximizing
 * loci, and whether ANY pair bound (non-vacuous).
 */
function supOverPairs(
  restrictions: readonly PlaneRestriction[], cells: readonly string[], metric: StalkMetric,
): { radius: number; vacuous: boolean; pairs: PairObstruction[]; bindingLoci: string[] } {
  const cellSet = new Set(cells);
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
 * Compute the Robinson CONSISTENCY-RADIUS over the LI (sheaf) planes — the SUP of pairwise
 * disagreement on domain OVERLAPS, restricted to the engineered comparison stalk. Only
 * `variance === "sheaf"` restrictions pass (a cosheaf here draws the silent corruption; it throws,
 * loudly).
 *
 *   radius === 0 && !vacuous  ⟹  the li-planes GLUE (a global section stands).
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
      `sensorium-consistency-core: the li-radius admits SHEAF planes only; got cosheaf plane(s) `
      + `[${nonSheaf.map((r) => r.plane).join(", ")}] — a cosheaf read through a restriction map is the `
      + `silent corruption (li-ki-integrities.md#crucible-tested). Route bands/coupling to the ki mirror.`,
    );
  }

  if (stalk.units.length === 0) {
    return {
      radius: 0, glues: false, vacuous: true, pairs: [], obstructionLocus: [],
      signalKind: "disagreement-signal",
      note: "empty comparison stalk — no engineered overlap; a vacuous 0 (caution a).",
    };
  }

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
