/**
 * mesh-couple — the operational capstone of the locked coupling keel: ONE call from raw child
 * signals to a significance-clean coupling reading. It composes the four floors in order —
 *
 *   whiten (signed-innovation)  →  couple (Gaussian multivariate, full-conditioned)  →
 *   significance-gate (parametric χ²)  →  the MeshCoupling verdict
 *
 * so every surviving edge is a SIGNIFICANT, phantom-guarded, innovation-based directed coupling,
 * and non-significant edges are zeroed (never read as coupling). This is
 * the surface the node-side reader and the sensory-seam call; nothing downstream re-derives it.
 *
 * Platform-blind: composes ./signed-innovation + ./mesh-coupling-mv + ./cmi-significance.
 * Meme: lar:///ha.ka.ba/lararium/mesh/flow
 */

import { whitenChildren } from "./signed-innovation.js";
import { coupleMeshChildrenMV, type ChildSignalMV } from "./mesh-coupling-mv.js";
import { significantCMI } from "./cmi-significance.js";
import { type MeshCoupling } from "./mesh-coupling.js";
import { type ArlDial, REFERENCE_ALPHA } from "./arl-dial.js";

export interface CoupleMeshOptions {
  /** Sovereignty dial — the strongest surviving cross-edge must stay below this (bits). Default 0.5. */
  readonly mergeThreshold?: number;
  /** History length for the conditional-TE embedding. Default 1. */
  readonly lag?: number;
  /** Significance level — edges with χ² p ≥ alpha are zeroed. Sourced from `dial.alpha` when a dial rides,
   *  else this explicit α, else {@link REFERENCE_ALPHA}. */
  readonly alpha?: number;
  /** The ARL₀ dial — when present, `dial.alpha` sets the edge-significance gate (one operator dial governs
   *  which couplings survive). Overrides the bare `alpha`; absent → the reference default. */
  readonly dial?: ArlDial;
  /** Whiten to the signed innovation first (the correct prewhitening). Default true. */
  readonly whiten?: boolean;
}

/**
 * Couple the mesh's children end-to-end: whiten → Gaussian multivariate conditional-TE →
 * χ²-significance gate. Returns a MeshCoupling whose `te` carries only SIGNIFICANT edges (the rest
 * zeroed), with the strongest surviving edge and the sovereign verdict recomputed on the clean matrix.
 */
export function coupleMesh(children: readonly ChildSignalMV[], opts: CoupleMeshOptions = {}): MeshCoupling {
  const mergeThreshold = opts.mergeThreshold ?? 0.5;
  const lag = opts.lag ?? 1;
  const alpha = opts.dial?.alpha ?? opts.alpha ?? REFERENCE_ALPHA; // one dial governs the significance gate
  const whiten = opts.whiten ?? true;

  const prepped = whiten ? whitenChildren(children) : children.map((c) => ({ name: c.name, signal: c.signal }));
  const base = coupleMeshChildrenMV(prepped, mergeThreshold, lag);

  const n = prepped.length;
  const te: number[][] = base.te.map((row) => [...row]);
  let strongest: { from: string; to: string; coupling: number } | null = null;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const T = prepped[j]!.signal.length;
      const N = Math.max(0, T - lag);                              // embedded observation count
      const dfS = prepped[i]!.signal[0]?.length ?? 1;
      const dfT = prepped[j]!.signal[0]?.length ?? 1;
      if (!significantCMI(te[i]![j]!, N, dfS, dfT, alpha)) {
        te[i]![j] = 0;                                             // not a real edge — the bias floor
      }
      if (te[i]![j]! > 0 && (!strongest || te[i]![j]! > strongest.coupling)) {
        strongest = { from: base.children[i]!, to: base.children[j]!, coupling: te[i]![j]! };
      }
    }
  }

  return {
    children: base.children,
    te,
    strongestEdge: strongest,
    sovereign: !strongest || strongest.coupling < mergeThreshold,
    phantomGuarded: base.phantomGuarded,
  };
}

// ── Tier-1 densify — couple STRATA of disjoint / gappy support without fabricating covariance ──
//
// GROUND: the χ²-gated Gaussian conditional-TE above holds only for
// WHOLE-AXIS, regular, jointly-Gaussian signals. When a child arrives as STRATA — sub-signals
// each observed on only PART of the shared skeletal grid (disjoint / punched support) — the lagged
// embedding is UNDEFINED over the gaps. The naive cure (align + zero-fill) FABRICATES covariance:
// every stratum's holes carry the SAME constant (0), so independent strata read as synchronized and
// the gate passes a phantom edge. This is the un-densified footgun the gappy-stress test trips.
//
// Tier-1 densify reuses the in-tree MODWT-MRA move (bands_sidecar.py modwt_mra — the sparse per-chunk
// signal → a whole-axis continuous-coefficient series on ONE grid): a presence-weighted à-trous
// (undecimated / stationary-wavelet, Holschneider) approximation fills each hole from the stratum's
// OWN nearby observed samples, NEVER a shared constant. So each densified stratum becomes a continuous
// whole-axis signal on the shared grain, the EXISTING coupleMesh runs UNCHANGED inside its contract,
// and the shared-zero phantom never forms.
//
// MU-DISCIPLINE (the model-agnostic seat): densify is a CHOICE OF TUNNEL — every fill imputes a model
// (here: local smoothness). It is NOT truth. The HONEST-ZERO is the ground state: below the coverage
// floor, across an un-bridgeable void, or with no shared grain for an edge, the densify REFUSES TO
// EMIT rather than fabricate. Tier-2/3 (spline / GP interpolation; continuous-time-TE / CCC) stay a
// NOTED follow-up — richer tunnels, still tunnels. Meme: lar:///ha.ka.ba/lararium/mesh/flow

/**
 * A STRATUM — a child signal observed on only part of the shared skeletal grid. Every stratum rides
 * the SAME grid (ki-anchoring's shared FFZ grain), so a `null` row marks a grid cell the stratum did
 * NOT observe (a hole) — never a re-timed sample. A fully-observed stratum (no nulls) densifies to
 * itself.
 */
export interface Stratum {
  readonly name: string;
  /** One entry per shared-grid cell; `null` marks an unobserved cell (a hole). */
  readonly signal: readonly (readonly number[] | null)[];
}

export interface DensifyOptions {
  /** Minimum fraction of grid cells a stratum must observe, else REFUSE (honest-zero). Default 0.5. */
  readonly minCoverage?: number;
  /** À-trous smoothing depth (the MODWT-MRA approximation levels). Default 4. */
  readonly levels?: number;
  /** Longest contiguous hole the smooth will bridge; a longer void → REFUSE (no shared grain). Default = grid/4. */
  readonly maxGap?: number;
  /** Minimum joint-support overlap (cells both strata observed, minus lag) for a directed edge, else honest-zero. Default 16. */
  readonly minOverlap?: number;
}

/** The longest run of `false` (a hole) in a presence mask — the un-bridgeable-void guard reads it. */
function longestHoleRun(present: readonly boolean[]): number {
  let run = 0, max = 0;
  for (const p of present) {
    if (p) run = 0;
    else { run += 1; if (run > max) max = run; }
  }
  return max;
}

/**
 * Presence-weighted à-trous smoothing — the MODWT-MRA approximation branch, hole-aware. A dilated
 * [1,2,1]/4 kernel (the stationary-wavelet scaling filter) iterated `levels` times, each tap weighted
 * by presence so a hole contributes nothing and fills from OBSERVED neighbours only. Presence
 * propagates outward each level, so after enough levels every cell carries support drawn from the
 * stratum's OWN samples — never a shared constant. Returns the continuous whole-axis approximation.
 */
function atrousSmooth(col: readonly number[], present: readonly boolean[], levels: number): number[] {
  const T = col.length;
  let a = col.slice();
  let w: number[] = present.map((p) => (p ? 1 : 0));
  for (let lvl = 0; lvl < levels; lvl++) {
    const step = 1 << lvl;
    const na = new Array<number>(T).fill(0);
    const nw = new Array<number>(T).fill(0);
    for (let t = 0; t < T; t++) {
      let num = 0, den = 0;
      for (const [ti, wt] of [[t - step, 1], [t, 2], [t + step, 1]] as const) {
        if (ti < 0 || ti >= T) continue;
        const ww = w[ti]! * wt;
        num += ww * a[ti]!;
        den += ww;
      }
      if (den > 0) { na[t] = num / den; nw[t] = 1; }
      else { na[t] = a[t]!; nw[t] = w[t]!; }   // no support in reach yet — carry forward
    }
    a = na; w = nw;
  }
  return a;
}

/**
 * Densify ONE stratum onto the shared grid, or REFUSE (return null) when the honest-zero fires:
 * coverage below `minCoverage`, or a contiguous void longer than `maxGap` (no grain to bridge). On
 * success every hole fills from the stratum's own presence-weighted à-trous smooth; observed cells
 * pass through verbatim, so a fully-observed stratum densifies to itself.
 */
export function densifyStratum(
  s: Stratum, opts: DensifyOptions = {},
): { name: string; signal: number[][]; present: boolean[] } | null {
  const T = s.signal.length;
  const minCoverage = opts.minCoverage ?? 0.5;
  const levels = opts.levels ?? 4;
  const maxGap = opts.maxGap ?? Math.max(1, Math.floor(T / 4));
  const present = s.signal.map((r) => r !== null);
  const observed = present.reduce((n, p) => n + (p ? 1 : 0), 0);
  if (T === 0 || observed / T < minCoverage) return null;          // honest-zero: too sparse
  if (longestHoleRun(present) > maxGap) return null;               // honest-zero: an un-bridgeable void
  const firstRow = s.signal.find((r) => r !== null) ?? [];
  const dims = firstRow.length;
  const cols: number[][] = [];
  for (let d = 0; d < dims; d++) {
    const col = s.signal.map((r) => (r ? (r[d] ?? 0) : 0));
    const sm = atrousSmooth(col, present, levels);
    cols.push(s.signal.map((r, t) => (r ? (r[d] ?? 0) : sm[t]!)));
  }
  const signal = Array.from({ length: T }, (_, t) => cols.map((c) => c[t]!));
  return { name: s.name, signal, present };
}

export interface StrataCoupling extends MeshCoupling {
  /** Strata the densify REFUSED (honest-zero: below coverage floor / un-bridgeable void). */
  readonly refused: readonly string[];
}

/**
 * Couple STRATA end-to-end: Tier-1 densify (honest-zero the un-bridgeable) → the unchanged coupleMesh
 * (whiten → Gaussian-MV conditional-TE → χ²-gate). One extra honest-zero rides at the edge: a directed
 * edge whose two strata barely co-observe (joint support − lag < `minOverlap`) is REFUSED (zeroed),
 * because the densify's fill — not shared data — would carry it. The strongest edge and the sovereign
 * verdict recompute on the clean matrix.
 */
export function coupleMeshStrata(strata: readonly Stratum[], opts: CoupleMeshOptions & DensifyOptions = {}): StrataCoupling {
  const lag = opts.lag ?? 1;
  const minOverlap = opts.minOverlap ?? 16;
  const mergeThreshold = opts.mergeThreshold ?? 0.5;
  const densified: ChildSignalMV[] = [];
  const masks: boolean[][] = [];
  const refused: string[] = [];
  for (const s of strata) {
    const d = densifyStratum(s, opts);
    if (d === null) { refused.push(s.name); continue; }
    densified.push({ name: d.name, signal: d.signal });
    masks.push(d.present);
  }
  if (densified.length < 2) {
    const names = densified.map((d) => d.name);
    return {
      children: names,
      te: names.map(() => names.map(() => 0)),
      strongestEdge: null, sovereign: true, phantomGuarded: false, refused,
    };
  }
  const base = coupleMesh(densified, opts);
  const n = densified.length;
  const te = base.te.map((row) => [...row]);
  let strongest: { from: string; to: string; coupling: number } | null = null;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      let overlap = 0;
      const mi = masks[i]!, mj = masks[j]!;
      for (let t = 0; t < mi.length; t++) if (mi[t] && mj[t]) overlap += 1;
      if (overlap - lag < minOverlap) te[i]![j] = 0;              // honest-zero: no shared grain
      if (te[i]![j]! > 0 && (!strongest || te[i]![j]! > strongest.coupling)) {
        strongest = { from: base.children[i]!, to: base.children[j]!, coupling: te[i]![j]! };
      }
    }
  }
  return {
    children: base.children, te, strongestEdge: strongest,
    sovereign: !strongest || strongest.coupling < mergeThreshold,
    phantomGuarded: base.phantomGuarded, refused,
  };
}
