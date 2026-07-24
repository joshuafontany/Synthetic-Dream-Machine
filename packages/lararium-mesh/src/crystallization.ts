/**
 * crystallization — the memetic crystallization cap: it READS whether a recurring pattern FIXES into shared
 * grammar. A pattern crystallizes when it does two things at once, mirroring how a solid condenses out of a
 * melt: it NUCLEATES across strata (born past r* — cross-coordinate corroboration, never lone-plane frequency)
 * AND it re-LOCKS its recurrence rhythm (rigid — a time-crystal beat that survives a perturbation). STANDS =
 * born ⊕ rigid. The cap reuses the machinery whole: `nucleate` decides birth, `temporalRigidity` decides
 * standing; this file only WIRES a lens onto their inputs.
 *
 * THE LENS (the tunable part). The nucleation PLANES become the lens STRATA — a decomposition of the
 * occurrence stream by a coordinate the block ALREADY carries (a #has cap; the lens presupposes no schema).
 * `stratumOf` names the grouping coordinate, so the lens stays TUNABLE, never hardwired:
 *   · role ∈ {operator, agent}   — the operator|agent lens (ONE instance);
 *   · stream-id                   — comparing two+ captured streams (another instance);
 *   · any spatial/temporal axis   — "spoken from role XYZ at turn ABC".
 * A pattern crossing ONLY one stratum yields ONE plane → the gate's `(effectivePlanes − 1)` factor zeroes the
 * drive → never born. So single-coordinate frequency can NEVER crystallize; only cross-stratum agreement can.
 *
 * WHY NO OUTPUT-CORRELATION COLLAPSE (the seam vs the Sink). The Sink passes `planeCorrelation` so DERIVED
 * detectors reading one signal collapse to ~1 effective plane. This lens does the OPPOSITE on purpose: its
 * strata name genuinely DISTINCT speakers/streams (different roles, different captures), so two strata moving
 * in lockstep read as the STRONGEST crystallization — real cross-speaker consensus — not a derived echo. The
 * lens therefore treats distinct coordinate values as independent corroborating strata and omits the
 * collapse matrix; the caller who wants echo-collapse groups by a coordinate that already separates sources.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/mesh/flow
 */

import { nucleate, type NucleationVerdict, type PlaneSignal } from "./nucleation-gate.js";
import { temporalRigidity, normalizeSignal, type RigidityVerdict } from "./temporal-rigidity.js";

/** A lens that strata-decomposes occurrences by a coordinate the block ALREADY carries — the tunable part.
 *  `T` stays the caller's own occurrence shape; the lens reads a coordinate off it, never a fixed schema. */
export interface CrystalLens<T> {
  /** The stratum an occurrence speaks FROM — the grouping coordinate (role, stream-id, any axis). */
  readonly stratumOf: (occ: T) => string;
  /** The window/turn ORDINAL an occurrence sits at (island ordinal, NEVER a wall-clock time) — it bins the
   *  recurrence rhythm the rigidity test re-locks. */
  readonly ordinalOf: (occ: T) => number;
  /** How strongly an occurrence attests the pattern ∈ [0,1] (defaults to 1 — bare presence attests fully). */
  readonly strengthOf?: (occ: T) => number;
}

export interface CrystalOptions {
  /** γ handed to the birth gate (the naming/index cost; defaulted there when omitted). */
  readonly surfaceCost?: number;
  /** Ordinals folded into ONE rhythm bin (default 1 — one bin per ordinal). Widen it to coarsen the beat. */
  readonly windowSize?: number;
  /** standing threshold the rhythm must clear to read RIGID (re-locks). Passes straight to temporalRigidity. */
  readonly rigidityThreshold?: number;
}

export interface CrystalVerdict {
  /** The pattern FIXES into shared grammar — born ACROSS strata AND its recurrence rhythm re-locks. */
  readonly crystallized: boolean;
  /** The cross-stratum birth verdict (a lone stratum drives zero → never born). */
  readonly birth: NucleationVerdict;
  /** The recurrence-rhythm rigidity verdict (a one-shot / non-repeating signal never re-locks). */
  readonly standing: RigidityVerdict;
  /** The coordinate values the lens resolved — the strata that fed the planes (sorted, stable). */
  readonly strata: readonly string[];
  /** Per-stratum agreement fed to `nucleate` — each stratum's mean attestation strength. */
  readonly planeSignals: readonly PlaneSignal[];
  /** The window-binned recurrence signal fed to `temporalRigidity` (aggregate strength per bin). */
  readonly rhythm: readonly number[];
  /** True when the lens read non-finite garbage (a bad ordinal/strength) — distinct from a valid non-stand. */
  readonly invalid: boolean;
}

/** Finite-safe clamp to [0,1] — non-finite folds to 0 (never propagate garbage into an agreement). */
const clamp01 = (x: number): number => (Number.isFinite(x) ? (x < 0 ? 0 : x > 1 ? 1 : x) : 0);

const NOT_CRYSTALLIZED = (invalid: boolean): CrystalVerdict => ({
  crystallized: false,
  birth: { born: false, criticalRadius: Infinity, barrier: Infinity, drive: 0, effectivePlanes: 0, condensation: 0, invalid },
  standing: { period: 0, lockQuality: 0, recovery: 0, standing: 0, rigid: false, invalid },
  strata: [],
  planeSignals: [],
  rhythm: [],
  invalid,
});

/**
 * Read whether a recurring pattern CRYSTALLIZES. The lens groups the occurrences by coordinate → per-stratum
 * PlaneSignals (the cross-stratum drive) and one window-binned aggregate rhythm (the recurrence). `nucleate`
 * decides birth on the strata; `temporalRigidity` decides re-lock on the rhythm; crystallized = born ⊕ rigid.
 * An empty stream reads a valid non-crystallization; a non-finite ordinal/strength fails loud (invalid).
 */
export function crystallize<T>(
  occurrences: readonly T[],
  lens: CrystalLens<T>,
  opts: CrystalOptions = {},
): CrystalVerdict {
  if (occurrences.length === 0) return NOT_CRYSTALLIZED(false);
  const windowSize = opts.windowSize && opts.windowSize > 0 ? Math.floor(opts.windowSize) : 1;

  // First pass reads coordinate + ordinal + strength off each occurrence; a non-finite ordinal/strength fails
  // loud (the reading fabricated nothing — it hit garbage).
  const strengthOf = lens.strengthOf ?? (() => 1);
  const rows: { stratum: string; ordinal: number; strength: number }[] = [];
  let minOrd = Infinity;
  let maxOrd = -Infinity;
  for (const occ of occurrences) {
    const ordinal = lens.ordinalOf(occ);
    const rawStrength = strengthOf(occ);
    if (!Number.isFinite(ordinal) || !Number.isFinite(rawStrength)) return NOT_CRYSTALLIZED(true);
    const stratum = lens.stratumOf(occ);
    const strength = clamp01(rawStrength);
    rows.push({ stratum, ordinal, strength });
    if (ordinal < minOrd) minOrd = ordinal;
    if (ordinal > maxOrd) maxOrd = ordinal;
  }

  // The strata: each distinct coordinate value becomes one plane. Mean attestation strength per stratum feeds
  // the cross-stratum agreement drive; support accretes the whole occurrence count (the nucleus "size").
  const perStratum = new Map<string, number[]>();
  for (const r of rows) {
    const s = perStratum.get(r.stratum);
    if (s) s.push(r.strength);
    else perStratum.set(r.stratum, [r.strength]);
  }
  const strata = [...perStratum.keys()].sort();
  const planeSignals: PlaneSignal[] = strata.map((stratum) => {
    const series = perStratum.get(stratum)!;
    const agreement = series.reduce((a, b) => a + b, 0) / series.length;
    return { plane: stratum, agreement };
  });

  // The recurrence rhythm: fold occurrence strength into window bins over the ordinal span (a genuinely
  // periodic recurrence reads a period the rigidity test re-locks; a one-shot burst carries no repetition).
  const binOf = (ordinal: number): number => Math.floor((ordinal - minOrd) / windowSize);
  const numBins = binOf(maxOrd) + 1;
  const rhythm = new Array<number>(numBins).fill(0);
  for (const r of rows) rhythm[binOf(r.ordinal)]! += r.strength;

  // Birth: the gate reads cross-stratum agreement. A lone stratum → one plane → (effectivePlanes − 1) = 0 →
  // zero drive → never born (single-coordinate frequency can never crystallize).
  const birth = nucleate({
    support: occurrences.length,
    planes: planeSignals,
    ...(opts.surfaceCost !== undefined ? { surfaceCost: opts.surfaceCost } : {}),
  });

  // Standing: the recurrence rhythm re-locks (rigid) or stays floppy. Normalize to keep extreme amplitudes
  // finite through the autocorrelation, matching the Sink's own standing path.
  const standing = temporalRigidity({
    signal: normalizeSignal(rhythm),
    ...(opts.rigidityThreshold !== undefined ? { threshold: opts.rigidityThreshold } : {}),
  });

  return {
    crystallized: birth.born && standing.rigid,
    birth,
    standing,
    strata,
    planeSignals,
    rhythm,
    invalid: false,
  };
}
