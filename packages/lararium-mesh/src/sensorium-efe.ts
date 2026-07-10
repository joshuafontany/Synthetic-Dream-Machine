/**
 * sensorium-efe — the EXPECTED-FREE-ENERGY organ, the thesis-organ B×C keystone. The cohomological gate
 * (sensorium-fusion) reads WHICH no-global-now stands; this module DECIDES what to do inside it. It composes
 * the BUILT pieces — it wires, it does NOT roll fresh numerics:
 *
 *   B-1  the VERB-CONDITIONED forward model. `ar1FitPredict` (sensorium-pc) carries the one-step autonomous
 *        dynamics; a per-verb affine Δ (the servo action, per-island — no global B) BENDS that prediction.
 *        `predictNext(planeReads, verb) → {mu, precision}` runs the autonomous forecast, then applies the verb.
 *   B-2  the EFE SCORER. `EFE(verb) = pragmatic (risk = KL to the C set-point) + γ·epistemic (ambiguity) +
 *        γ·optionLoss`, where `optionLoss = Σ_planes (ln π_after − ln π_baseline)` reuses the SAME −ln π
 *        log-precision arithmetic the F primitive runs — the empowerment / reachable-future-entropy term.
 *        The risk term rides the BUILT Gaussian `gaussianKL`; the ambiguity term rides the BUILT −ln π.
 *   B-3  SELECTION. `efeSelect(verbs) → argmin EFE`. The reversibility axis FALLS OUT as `sign(optionLoss)`
 *        (derived, never a declared boolean grid): a verb that COLLAPSES a plane's reachable-future-entropy
 *        (σ²→0) drives optionLoss high → EFE high → the selector passes it over.
 *
 * ── THE KEYSTONE GATE (B×C) ──────────────────────────────────────────────────────────────────────────
 *
 * `efeGate` reads H¹ FIRST (sensorium-fusion's `cohomologyObstruction`), then forks:
 *   • H¹ = 0 — a global section stands reachable, so a GLOBAL EFE is well-posed → `efeSelect` picks the verb.
 *   • H¹ ≠ 0 — the planes carry an ontological cocycle: NO global section, so a single EFE argmin averages
 *     away a real disagreement. `surfaceDisagreement` emits a disagreement-SURFACING move (never a reconcile
 *     move), carrying the reconciliation cost `R*_sem = log₂ dim H¹` (Thomas–Chen).
 *
 * ── SEAMS held open, NOT wired (per the S3 charge) ────────────────────────────────────────────────────
 *
 *   γ  defaults to 1 (the C-only floor). A later ARL₀→β would dial the epistemic/empowerment weight; this
 *      module leaves that seam untouched.
 *   τ  defaults to 1 — a SELECTION-margin seam (a close call between the top two verbs flags for review). It
 *      does NOT gate the py `VERB_SEATS` HITL surface, which stays the house's kept HITL question, distinct
 *      from selection.
 *
 * PORT-STATUS — this organ stands the CONCEPT-WITNESS + the TS↔py parity oracle; the production EFE
 * compute ports to py (the RUN arc). py counterparts EXIST: `predictive_coding.py` (the F primitive) +
 * `bands_sidecar.py`. OWED in py: the H¹ gate · THIS EFE keystone · the bench strands.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/li-ki-integrities#crucible-tested
 */

import { ar1FitPredict, gaussianKL, optimalPrecision } from "./sensorium-pc.js";
import {
  cohomologyObstruction, reconciliationCost,
  type SheafAssignment, type CohomologyObstruction, type CohomologyOptions,
} from "./sensorium-fusion.js";

// ── precision clamps (finite, so a σ²→0 collapse stays finite yet DOMINATES the score) ──────────────

/** Floor on the precision gain — an expanding verb (σ²→∞) rests here, never at −∞ ln-precision. */
const PREC_FLOOR = 1e-6;
/** Ceiling on the precision gain — a collapsing verb (σ²→0) caps here, so its EFE stays finite yet huge. */
const PREC_CEIL = 1e6;

function clampPrecision(p: number): number {
  if (!Number.isFinite(p)) return PREC_CEIL;
  return Math.min(PREC_CEIL, Math.max(PREC_FLOOR, p));
}

/** The log-precision the option-loss and ambiguity terms both read — the shared −ln π arithmetic. */
function lnPrecision(p: number): number {
  return Math.log(clampPrecision(p));
}

// ── B-1: the verb-conditioned forward model ─────────────────────────────────────────────────────────

/**
 * One verb's affine Δ — the servo ACTION, per-island (no global transition matrix B). A verb BENDS the
 * autonomous forecast: it SCALES + SHIFTS the predicted mean and GAINS the predicted precision. A gain > 1
 * COLLAPSES a plane's reachable-future-entropy (σ² shrinks); a gain < 1 OPENS it. `perPlane` overrides let a
 * verb act unevenly across the planes (the servo reads each island's own action).
 */
export interface VerbDelta {
  /** the verb's name — the handle the selector reports back. */
  readonly verb: string;
  /** the affine SCALE `a` on the predicted mean (default 1 — the mean passes through untouched). */
  readonly scale?: number;
  /** the affine SHIFT `s` added to the scaled mean (default 0). */
  readonly shift?: number;
  /** the precision GAIN `g` multiplying the baseline precision (default 1; > 1 collapses σ², < 1 opens it). */
  readonly precisionGain?: number;
  /** per-plane overrides — a verb that steers each island's action on its own. */
  readonly perPlane?: Readonly<Record<string, { scale?: number; shift?: number; precisionGain?: number }>>;
}

/** The forward model's read — per-plane predicted mean + precision, both AFTER the verb and at BASELINE. */
export interface ForwardPrediction {
  /** the plane names, in the input's key order (the index the mu/precision vectors ride). */
  readonly planes: readonly string[];
  /** the predicted next mean per plane, AFTER the verb's affine Δ. */
  readonly mu: readonly number[];
  /** the predicted precision per plane, AFTER the verb's gain (clamped). */
  readonly precision: readonly number[];
  /** the autonomous predicted mean per plane, BEFORE the verb (the ar1 forecast). */
  readonly muBaseline: readonly number[];
  /** the autonomous precision per plane, BEFORE the verb. */
  readonly precisionBaseline: readonly number[];
}

/**
 * The autonomous one-step forecast of a plane's NEXT (unobserved) frame + a bottom-up precision, both read
 * off the BUILT `ar1FitPredict`. The mean INVERTS the affine map ar1 already fit: its in-sample predictions
 * obey `pred[t] = a·x[t−1] + b`, so two (lag, prediction) pairs recover `a,b` and the next mean `a·x[n−1]+b`
 * — no re-fit, no fresh numerics. The precision reads the residual scale through the BUILT `optimalPrecision`
 * (the −ln π interior optimum `π* = 1/ε̄²`), standardized so it stays cross-plane comparable.
 */
function autonomousForecast(series: readonly number[]): { mu: number; precision: number } {
  const n = series.length;
  if (n === 0) return { mu: 0, precision: 1 };
  if (n === 1) return { mu: series[0]!, precision: 1 };

  const { pred } = ar1FitPredict(series);

  // standardize the residuals by the series' own scale so ε̄² stays dimensionless (as planePc does).
  const mean = series.reduce((s, v) => s + v, 0) / n;
  const varc = series.reduce((s, v) => s + (v - mean) * (v - mean), 0) / n;
  const sigma = Math.sqrt(varc) < 1e-9 ? 1 : Math.sqrt(varc);
  let sumSq = 0;
  let count = 0;
  for (let t = 1; t < n; t++) {
    const z = (series[t]! - pred[t]!) / sigma;
    sumSq += z * z;
    count++;
  }
  const meanSqZ = count > 0 ? sumSq / count : 0;
  const precision = optimalPrecision(meanSqZ);

  // INVERT the affine forecast map: pred[t] = a·x[t−1] + b, so ANY two DISTINCT lag-points recover (a,b) and
  // the next mean a·x[n−1]+b — no re-fit. Scan the widest-spread lag pair (min↔max over the lags x[0..n−2]),
  // so a repeated endpoint never forces the stale one-step fallback; only a constant series leaves no spread.
  let loI = 0, hiI = 0;
  for (let t = 0; t < n - 1; t++) {
    if (series[t]! < series[loI]!) loI = t;
    if (series[t]! > series[hiI]!) hiI = t;
  }
  const lagLo = series[loI]!, predLo = pred[loI + 1]!; // pred[loI+1] = a·x[loI] + b
  const lagHi = series[hiI]!, predHi = pred[hiI + 1]!; // pred[hiI+1] = a·x[hiI] + b
  let mu: number;
  if (Math.abs(lagHi - lagLo) > 1e-9) {
    const a = (predHi - predLo) / (lagHi - lagLo);
    const b = predLo - a * lagLo;
    mu = a * series[n - 1]! + b;
  } else {
    mu = pred[n - 1]!; // a constant series carries no lag spread ⇒ the model's latest one-step prediction stands
  }
  return { mu, precision };
}

/** Read a verb's effective (scale, shift, gain) on a NAMED plane — the per-plane override or the verb default. */
function verbActionOn(verb: VerbDelta, plane: string): { scale: number; shift: number; gain: number } {
  const o = verb.perPlane?.[plane];
  return {
    scale: o?.scale ?? verb.scale ?? 1,
    shift: o?.shift ?? verb.shift ?? 0,
    gain: o?.precisionGain ?? verb.precisionGain ?? 1,
  };
}

/**
 * B-1 — the verb-conditioned forward model. Run the autonomous ar1 forecast per plane, then BEND it by the
 * verb's affine Δ: `mu_after = a·mu_baseline + s`, `π_after = clamp(g·π_baseline)`. Returns the after- and
 * baseline- means + precisions per plane, so the scorer reads BOTH (the option-loss needs the pair).
 */
export function predictNext(
  planeReads: Readonly<Record<string, readonly number[]>>,
  verb: VerbDelta,
): ForwardPrediction {
  const planes = Object.keys(planeReads);
  const mu: number[] = [];
  const precision: number[] = [];
  const muBaseline: number[] = [];
  const precisionBaseline: number[] = [];
  for (const plane of planes) {
    const base = autonomousForecast(planeReads[plane]!);
    const { scale, shift, gain } = verbActionOn(verb, plane);
    muBaseline.push(base.mu);
    precisionBaseline.push(clampPrecision(base.precision));
    mu.push(scale * base.mu + shift);
    precision.push(clampPrecision(gain * base.precision));
  }
  return { planes, mu, precision, muBaseline, precisionBaseline };
}

// ── B-2: the EFE scorer ─────────────────────────────────────────────────────────────────────────────

/** The preferred outcome — the C-vector: a per-plane set-point mean + an optional per-plane variance. */
export interface CVector {
  /** the preferred mean per plane (absent ⇒ 0, the quiescent set-point). */
  readonly mu: Readonly<Record<string, number>>;
  /** the preference's variance per plane — how sharply the preference peaks (absent ⇒ {@link EfeOptions.preferenceVariance}). */
  readonly variance?: Readonly<Record<string, number>>;
}

export interface EfeOptions {
  /** the epistemic/empowerment weight (default 1 — the C-only floor; a later ARL₀→β dials it, NOT wired here). */
  readonly gamma?: number;
  /** the selection-margin review threshold (default 1 — a close top-two call flags review; NOT the py VERB_SEATS gate). */
  readonly tau?: number;
  /** the default preference variance when the C-vector names none (default 1). */
  readonly preferenceVariance?: number;
  /** the agreement tolerance the gate hands `cohomologyObstruction` (passes through {@link CohomologyOptions}). */
  readonly agreementTolerance?: number;
  /** the pair-overlap pseudometric the gate reads (passes through {@link CohomologyOptions}). */
  readonly stalkMetric?: CohomologyOptions["stalkMetric"];
}

/** One verb's EFE breakdown — the total, its three terms, and the DERIVED reversibility read. */
export interface EfeScore {
  readonly verb: string;
  /** the total expected free energy — the quantity `efeSelect` minimizes. */
  readonly efe: number;
  /** the pragmatic RISK — Σ_planes KL[predicted ‖ C set-point] (the BUILT Gaussian KL). */
  readonly pragmatic: number;
  /** the epistemic AMBIGUITY — Σ_planes (−½ ln π_after), the expected outcome-uncertainty (the −ln π term). */
  readonly epistemic: number;
  /** the OPTION-LOSS — Σ_planes (ln π_after − ln π_baseline), the reachable-future-entropy the verb spends. */
  readonly optionLoss: number;
  /** the reversibility axis, DERIVED as `sign(optionLoss) ≤ 0` — a verb that preserves/opens options reads reversible. */
  readonly reversible: boolean;
}

/**
 * B-2 — score ONE verb's expected free energy. Run the forward model, then sum three terms across the planes:
 *   • pragmatic RISK — `Σ KL[N(mu_after, 1/π_after) ‖ N(C_mu, C_var)]` through the BUILT {@link gaussianKL}:
 *     how far the predicted outcome sits from the preferred set-point (a collapse to σ²→0 AWAY from C, or an
 *     over-open σ²→∞, both cost here).
 *   • epistemic AMBIGUITY — `Σ (−½ ln π_after)`: the expected outcome-entropy (const `½ ln 2πe` dropped, since
 *     it rides every verb equally and cancels in the argmin). The BUILT −ln π arithmetic, reused.
 *   • OPTION-LOSS — `Σ (ln π_after − ln π_baseline)`: the reachable-future-entropy the verb SPENDS (the
 *     empowerment term). Positive ⇒ options collapse (irreversible); negative ⇒ options open (reversible).
 * The total reads `pragmatic + γ·epistemic + γ·optionLoss`. Reversibility FALLS OUT of `sign(optionLoss)`.
 */
export function scoreEfe(
  planeReads: Readonly<Record<string, readonly number[]>>,
  verb: VerbDelta,
  c: CVector,
  opts: EfeOptions = {},
): EfeScore {
  const gamma = opts.gamma ?? 1;
  const prefVar = opts.preferenceVariance ?? 1;
  const fwd = predictNext(planeReads, verb);

  let pragmatic = 0;
  let epistemic = 0;
  let optionLoss = 0;
  fwd.planes.forEach((plane, i) => {
    const piAfter = fwd.precision[i]!;
    const piBase = fwd.precisionBaseline[i]!;
    const varAfter = 1 / piAfter;
    const cMu = c.mu[plane] ?? 0;
    const cVar = c.variance?.[plane] ?? prefVar;

    pragmatic += gaussianKL(fwd.mu[i]!, varAfter, cMu, cVar);
    epistemic += -0.5 * lnPrecision(piAfter);
    optionLoss += lnPrecision(piAfter) - lnPrecision(piBase);
  });

  const efe = pragmatic + gamma * epistemic + gamma * optionLoss;
  return { verb: verb.verb, efe, pragmatic, epistemic, optionLoss, reversible: optionLoss <= 1e-9 };
}

// ── B-3: selection ──────────────────────────────────────────────────────────────────────────────────

/** The selection read — the argmin verb, the full ranking, the top-two margin, and the review seam. */
export interface EfeSelection {
  /** the min-EFE verb the selector picked. */
  readonly chosen: EfeScore;
  /** every verb's score, ASCENDING by EFE (the chosen leads). */
  readonly ranked: readonly EfeScore[];
  /** the EFE gap between the chosen and the runner-up (Infinity when a single verb stood). */
  readonly margin: number;
  /** the τ review seam — `margin < τ` flags a close call for review (NOT the py VERB_SEATS HITL gate). */
  readonly needsReview: boolean;
}

/**
 * B-3 — select the min-EFE verb (argmin). Score every verb, rank ascending, and read the top-two margin. The
 * reversibility of each verb rides its own {@link EfeScore.reversible} (derived `sign(optionLoss)`), so an
 * irreversible verb (option-collapsing, high optionLoss) sinks in the ranking without a declared veto. The τ
 * margin seam flags a close call for review — it steers no selection and gates no HITL surface.
 */
export function efeSelect(
  planeReads: Readonly<Record<string, readonly number[]>>,
  verbs: readonly VerbDelta[],
  c: CVector,
  opts: EfeOptions = {},
): EfeSelection {
  if (verbs.length === 0) throw new Error("sensorium-efe: efeSelect needs at least one verb to score.");
  const ranked = verbs.map((v) => scoreEfe(planeReads, v, c, opts)).sort((a, b) => a.efe - b.efe);
  const chosen = ranked[0]!;
  const margin = ranked.length > 1 ? ranked[1]!.efe - chosen.efe : Infinity;
  const tau = opts.tau ?? 1;
  return { chosen, ranked, margin, needsReview: margin < tau };
}

// ── the keystone gate (B×C) ─────────────────────────────────────────────────────────────────────────

/** A disagreement-SURFACING move — what the gate emits when H¹ ≠ 0 (never a reconcile / average move). */
export interface DisagreementSurfacing {
  /** the obstruction dimension — the count of independent no-common-witness cocycles. */
  readonly dimH1: number;
  /** the reconciliation cost `R*_sem = log₂ dim H¹` (Thomas–Chen) — the mana/federation rating axis. */
  readonly cost: number;
  /** the H¹ representative cocycles (each a 1-cochain over the nerve edges) — the disagreement, carried whole. */
  readonly basis: readonly number[][];
  /** the surfacing note — names the move as SURFACE-not-reconcile, routed to Talk-Story. */
  readonly message: string;
}

/**
 * SURFACE an ontological obstruction — the H¹ ≠ 0 move. It carries the cocycle whole + its reconciliation cost
 * `R*_sem = log₂ dim H¹`, and names itself a SURFACING (route to Talk-Story), never a reconcile: no global
 * section stands, so nothing may be averaged toward.
 */
export function surfaceDisagreement(obs: CohomologyObstruction): DisagreementSurfacing {
  return {
    dimH1: obs.dimH1,
    cost: reconciliationCost(obs.dimH1),
    basis: obs.basis,
    message:
      `ontological no-global-now: ${String(obs.dimH1)} obstruction generator(s), R*_sem=${reconciliationCost(obs.dimH1).toFixed(3)} bits `
      + `— SURFACE the disagreement (route to Talk-Story); a global EFE argmin would average away a real cocycle.`,
  };
}

/** The gate verdict — SELECT a verb (H¹=0, a well-posed global EFE) or SURFACE the disagreement (H¹≠0). */
export type EfeGateResult =
  | { readonly verdict: "select"; readonly selection: EfeSelection; readonly disagreement: null }
  | { readonly verdict: "surface-disagreement"; readonly selection: null; readonly disagreement: DisagreementSurfacing };

/**
 * THE KEYSTONE GATE (B×C). Read H¹ FIRST over the li-assignment, then fork:
 *   • H¹ = 0 → a global section stands reachable, so a GLOBAL EFE is well-posed → {@link efeSelect} picks the
 *     min-EFE verb over the plane reads.
 *   • H¹ ≠ 0 → an ontological cocycle stands: no global section, so a single EFE argmin averages away a real
 *     disagreement → {@link surfaceDisagreement} emits the surfacing move carrying R*_sem, NEVER a reconcile.
 * Throws (via `cohomologyObstruction`) on a cosheaf plane — the gate admits sheaf (li) planes only.
 */
export function efeGate(
  assignment: SheafAssignment,
  planeReads: Readonly<Record<string, readonly number[]>>,
  verbs: readonly VerbDelta[],
  c: CVector,
  opts: EfeOptions = {},
): EfeGateResult {
  const cohomOpts: CohomologyOptions = {
    ...(opts.agreementTolerance !== undefined ? { agreementTolerance: opts.agreementTolerance } : {}),
    ...(opts.stalkMetric !== undefined ? { stalkMetric: opts.stalkMetric } : {}),
  };
  const obs = cohomologyObstruction(assignment, cohomOpts);
  if (obs.dimH1 > 0) {
    return { verdict: "surface-disagreement", selection: null, disagreement: surfaceDisagreement(obs) };
  }
  return { verdict: "select", selection: efeSelect(planeReads, verbs, c, opts), disagreement: null };
}
