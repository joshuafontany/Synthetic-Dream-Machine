/**
 * temporal-rigidity — a sink's STANDING measured as time-crystal RIGIDITY. The time-crystal transfer:
 * a discrete time crystal re-locks to its EXACT subharmonic even under a perturbed drive (Yao et al.,
 * PRL 118, 030401). So a sink STANDS when its occurrence-rhythm reads RIGID — a real dominant period that
 * RE-LOCKS after a perturbation — and reads as thermal noise when the rhythm goes floppy.
 *
 * Two orthogonal order-parameters, both needed (lock ⟂ re-lock):
 *   · lock-quality — IS there a real dominant period? (the top autocorrelation LOCAL-maximum's strength)
 *   · recovery     — does the SAME period RE-EMERGE after a perturbation? (re-detect the period on the
 *                    perturbed signal and check it matches — the faithful "re-locks to the subharmonic" test)
 * standing = lock-quality × recovery (a continuous order-parameter); rigid = standing above threshold.
 *
 * NOTE on what this does NOT yet do (honest POSIWID): this measure reads a SINGLE SNAPSHOT — it carries no
 * decay dial, no forgetting, no Ostwald ripening. Those, plus the shuffle-null calibration of `threshold`
 * (so it emerges from the signal's own null rather than a chosen 0.5) and a period-swept kick, ride the
 * feed-it-emerges Sink accumulator (the next-phase redesign), not this pure function.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/mesh/flow
 */

export interface RigidityInput {
  /** The candidate's occurrence-rhythm / band-signal over time (evenly sampled; must be all-finite). */
  readonly signal: readonly number[];
  /** Max period (lag) to consider — default min(floor(n/3), MAX_LAG) (an autocorrelation floor of ≥3
   *  cycles, with an ABSOLUTE ceiling so a huge n never blows the lag sweep). */
  readonly maxLag?: number;
  /** Min period (lag) — skip trivial tiny lags. Default 2. */
  readonly minLag?: number;
  /** Perturbation: fraction of the signal excised as a gap before re-detecting the period. Default 0.25. */
  readonly kick?: number;
  /** standing threshold to call the rhythm RIGID. Default 0.25 (=lock 0.5 × recovery 0.5). */
  readonly threshold?: number;
  /** When supplied, REUSE this period as the base (skip re-detecting it) and read its lock-quality at that
   *  lag — the beat the clock already recovered, so the base period gets detected ONCE. The kick + tail
   *  re-lock test still runs. Ignored when it rounds below minLag (falls back to self-detection). */
  readonly knownPeriod?: number;
}

/** Absolute ceiling on the autocorrelation lag sweep — caps cost on a very long signal (n/3 still bounds
 *  short ones). */
export const MAX_LAG = 512;

export interface RigidityVerdict {
  /** Dominant period — the lag of the top autocorrelation LOCAL maximum (0 when none / flat / invalid). */
  readonly period: number;
  /** Lock-quality — the dominant period's autocorrelation strength ∈ [0,1]. */
  readonly lockQuality: number;
  /** Recovery — the fraction of lock retained when re-detection finds the SAME period after the perturbation
   *  ∈ [0,1]; 0 when the perturbed signal's dominant period no longer matches (no re-lock). */
  readonly recovery: number;
  /** standing = lockQuality × recovery ∈ [0,1] — the continuous order-parameter. */
  readonly standing: number;
  /** Rigid = standing ≥ threshold (locks AND re-locks). */
  readonly rigid: boolean;
  /** True when the input was rejected (non-finite / too short) — distinct from a valid non-rigid verdict. */
  readonly invalid: boolean;
}

const NONE: RigidityVerdict = { period: 0, lockQuality: 0, recovery: 0, standing: 0, rigid: false, invalid: false };

function meanOf(x: readonly number[]): number {
  let s = 0;
  for (const v of x) s += v;
  return x.length ? s / x.length : 0;
}

/** Mean-center then max-abs scale a signal so extreme finite amplitudes (±1e200) survive the squaring the
 *  autocorrelation runs, instead of overflowing to Infinity→NaN and reading as a flat rhythm. The transform
 *  stays affine, so it LEAVES the autocorrelation shape invariant (autocorrAt already mean-centers) — it only
 *  keeps the squares finite. A flat / degenerate signal returns mean-centered (all-zero); shared by the Sink
 *  before it hands one rhythm to both the clock and the rigidity detector. */
export function normalizeSignal(x: readonly number[]): number[] {
  if (x.length === 0) return [];
  const mean = meanOf(x);
  let maxAbs = 0;
  for (const v of x) {
    const d = Math.abs(v - mean);
    if (d > maxAbs) maxAbs = d;
  }
  if (!(maxAbs > 0) || !Number.isFinite(maxAbs)) return x.map((v) => v - mean);
  return x.map((v) => (v - mean) / maxAbs);
}

/** Normalized autocorrelation at a lag (mean-centered, full-variance denom — the robust biased estimator
 *  that suppresses spurious high-lag peaks). ∈ [-1,1]; 0 for a flat signal. */
function autocorrAt(x: readonly number[], lag: number, mean: number, denom: number): number {
  if (denom <= 0) return 0;
  let num = 0;
  for (let i = lag; i < x.length; i++) num += (x[i]! - mean) * (x[i - lag]! - mean);
  return num / denom;
}

/**
 * The dominant period + its lock-quality READ AS the strongest LOCAL MAXIMUM of the autocorrelation over
 * [minLag, maxLag] (NOT the global argmax — a global argmax sits on the monotone-decay shoulder at minLag
 * for any smooth rhythm, mis-reporting the period; standard autocorrelation pitch detection takes the
 * first strong local max). Returns period 0 when no local maximum exists (no real rhythm).
 */
function dominantLock(x: readonly number[], minLag: number, maxLag: number): { period: number; lockQuality: number } {
  const n = x.length;
  if (maxLag < minLag || n < 4) return { period: 0, lockQuality: 0 };
  const mean = meanOf(x);
  let denom = 0;
  for (const v of x) denom += (v - mean) * (v - mean);
  if (denom <= 0) return { period: 0, lockQuality: 0 };
  // autocorrelation over [minLag-1 .. maxLag+1] so the endpoints can be local-max tested.
  const lo = Math.max(1, minLag - 1);
  const hi = Math.min(Math.floor(n / 2), maxLag + 1);
  const ac = new Map<number, number>();
  for (let lag = lo; lag <= hi; lag++) ac.set(lag, autocorrAt(x, lag, mean, denom));
  let bestLag = 0;
  let bestAc = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const a = ac.get(lag) ?? 0;
    if (a <= 0) continue;
    const prev = ac.get(lag - 1) ?? -Infinity;
    const next = ac.get(lag + 1) ?? -Infinity;
    if (a > prev && a >= next && a > bestAc) {
      bestAc = a;
      bestLag = lag;
    }
  }
  return { period: bestLag, lockQuality: Math.max(0, Math.min(1, bestAc)) };
}

/** Public: the dominant period + lock-quality of an event-indexed signal (first strong autocorrelation
 *  LOCAL maximum). Shared by clock-recovery (beat inference) and rigidity (base period). Finite-guarded;
 *  period 0 when no rhythm / garbage / too short. NO wall-clock — event ordinal indexes the signal. */
export function dominantPeriod(
  signal: readonly number[],
  opts: { minLag?: number; maxLag?: number } = {},
): { period: number; lockQuality: number } {
  const n = signal.length;
  if (n < 4 || !signal.every((v) => Number.isFinite(v))) return { period: 0, lockQuality: 0 };
  const minLag = Math.max(1, opts.minLag ?? 2);
  const maxLag = Math.min(opts.maxLag ?? Math.floor(n / 3), Math.floor(n / 2), MAX_LAG);
  return dominantLock(signal, minLag, maxLag);
}

/** A REAL perturbation: excise a contiguous middle chunk (a gap), splicing the remainder — NOT
 *  autocorrelation-invariant (a circular shift would be). */
function phaseKick(x: readonly number[], kick: number): number[] {
  const n = x.length;
  const cut = Math.max(1, Math.min(n - 2, Math.round(kick * n)));
  const start = Math.floor((n - cut) / 2);
  return x.slice(0, start).concat(x.slice(start + cut));
}

/** Measure a signal's temporal rigidity: lock (is there a period?) AND re-lock (does it survive a kick?). */
export function temporalRigidity(input: RigidityInput): RigidityVerdict {
  const x = input.signal;
  const n = x.length;
  // Fail loud on GARBAGE (non-finite) — never conflate it with a valid verdict; a merely-short signal
  // stays legitimate (a young sink with few events) → not-rigid, not invalid.
  if (!x.every((v) => Number.isFinite(v))) return { ...NONE, invalid: true };
  if (n < 4) return { ...NONE, invalid: false };
  const minLag = Math.max(1, input.minLag ?? 2);
  const maxLag = Math.min(input.maxLag ?? Math.floor(n / 3), Math.floor(n / 2), MAX_LAG);
  const threshold = input.threshold ?? 0.25;
  const kick = Math.max(0, Math.min(1, input.kick ?? 0.25));
  if (maxLag < minLag) return { ...NONE, invalid: false };

  // The base period: REUSE a supplied knownPeriod (the clock's already-recovered beat) rather than re-detect
  // it — read its lock-quality at that lag. Fall back to self-detection when none / below minLag.
  const known = input.knownPeriod;
  let base: { period: number; lockQuality: number };
  if (known !== undefined && Number.isFinite(known) && Math.round(known) >= minLag) {
    const p = Math.round(known);
    const mean = meanOf(x);
    let denom = 0;
    for (const v of x) denom += (v - mean) * (v - mean);
    const lq = denom > 0 ? Math.max(0, Math.min(1, autocorrAt(x, p, mean, denom))) : 0;
    base = { period: p, lockQuality: lq };
  } else {
    base = dominantLock(x, minLag, maxLag);
  }
  if (base.period === 0 || base.lockQuality <= 0) {
    return { period: 0, lockQuality: 0, recovery: 0, standing: 0, rigid: false, invalid: false };
  }

  // RE-LOCK (the faithful test): perturb, then RE-DETECT the dominant period on the perturbed signal.
  // Recovery counts only if the SAME period re-emerges (within ±1 lag) — a rigid rhythm re-locks; a
  // drifting/chirp rhythm's period shifts (no match → recovery 0).
  const kicked = phaseKick(x, kick);
  const kMax = Math.min(maxLag, Math.floor(kicked.length / 2));
  const relock = dominantLock(kicked, minLag, kMax);
  const periodMatches = relock.period > 0 && Math.abs(relock.period - base.period) <= 1;
  const recovery = periodMatches ? Math.max(0, Math.min(1, relock.lockQuality / base.lockQuality)) : 0;

  const standing = base.lockQuality * recovery;
  return {
    period: base.period,
    lockQuality: base.lockQuality,
    recovery,
    standing,
    rigid: standing >= threshold,
    invalid: false,
  };
}
