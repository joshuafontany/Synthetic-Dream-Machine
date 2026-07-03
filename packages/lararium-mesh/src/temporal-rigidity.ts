/**
 * temporal-rigidity — a sink's STANDING measured as time-crystal RIGIDITY. The time-crystal transfer:
 * a discrete time crystal's defining property is that its sub-rhythm RE-LOCKS to the exact subharmonic
 * even when the drive is perturbed (Yao et al., PRL 118, 030401). So a sink STANDS when its
 * occurrence-rhythm is RIGID — a strong, sharp dominant period that SURVIVES a phase-kick — and it is
 * thermal noise when the rhythm is floppy (no lock, or a lock that collapses under perturbation).
 *
 * This is the strongest transfer of the weird-domain swarm: it unifies persistence + canalization +
 * decay into ONE measurable order-parameter — standing = lock-quality × recovery-after-perturbation,
 * NOT accrual count. (Birth rides the nucleation-gate; STANDING rides here — the sink's two order-parameters.)
 *
 * The measure: the dominant period is the lag of the top autocorrelation peak; lock-quality is that peak's
 * strength; recovery is the fraction of lock-quality retained after a deliberate phase-kick. Rigid = locked
 * AND recovers. A rigid rhythm's period survives the kick (re-locks); a spurious peak collapses.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/mesh/flow
 */

export interface RigidityInput {
  /** The candidate's occurrence-rhythm / band-signal over time (evenly sampled). */
  readonly signal: readonly number[];
  /** Max period (lag) to consider — default floor(n/2). */
  readonly maxLag?: number;
  /** Min period (lag) — skip trivial tiny lags. Default 2. */
  readonly minLag?: number;
  /** Phase-kick strength ∈ [0,1]: the fraction of the signal circularly displaced to perturb the phase.
   *  Default 0.25. */
  readonly kick?: number;
  /** Lock/recovery threshold to call the rhythm RIGID. Default 0.5. */
  readonly threshold?: number;
}

export interface RigidityVerdict {
  /** Dominant period — the lag of the top autocorrelation peak (0 when none / flat signal). */
  readonly period: number;
  /** Lock-quality — the dominant period's autocorrelation strength, ∈ [0,1]. */
  readonly lockQuality: number;
  /** Recovery — lock-quality at the SAME period after a phase-kick, as a fraction of the original ∈ [0,1]. */
  readonly recovery: number;
  /** Rigid = the rhythm locks (lockQuality ≥ threshold) AND re-locks after the kick (recovery ≥ threshold). */
  readonly rigid: boolean;
}

/** Normalized autocorrelation at a given lag (mean-centered; ∈ [-1,1]). 0 for a flat signal. */
function autocorrAt(x: readonly number[], lag: number, mean: number, denom: number): number {
  if (denom <= 0) return 0;
  let num = 0;
  for (let i = lag; i < x.length; i++) num += (x[i]! - mean) * (x[i - lag]! - mean);
  return num / denom;
}

function meanOf(x: readonly number[]): number {
  let s = 0;
  for (const v of x) s += v;
  return x.length ? s / x.length : 0;
}

/** The dominant period + its lock-quality over [minLag, maxLag] (autocorrelation peak). */
function dominantLock(x: readonly number[], minLag: number, maxLag: number): { period: number; lockQuality: number } {
  const mean = meanOf(x);
  let denom = 0;
  for (const v of x) denom += (v - mean) * (v - mean);
  let bestLag = 0;
  let bestAc = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const ac = autocorrAt(x, lag, mean, denom);
    if (ac > bestAc) {
      bestAc = ac;
      bestLag = lag;
    }
  }
  return { period: bestLag, lockQuality: Math.max(0, Math.min(1, bestAc)) };
}

/** A REAL phase-kick: excise a contiguous fraction (a gap), splicing the remainder — NOT
 *  autocorrelation-invariant (a circular shift would be). A rigid rhythm re-locks at the same period
 *  across the splice; a spurious peak collapses. */
function phaseKick(x: readonly number[], kick: number): number[] {
  const n = x.length;
  const cut = Math.max(1, Math.min(n - 2, Math.round(kick * n)));
  const start = Math.floor((n - cut) / 2); // excise a middle chunk → a mid-signal phase break
  return x.slice(0, start).concat(x.slice(start + cut));
}

/** Measure a signal's temporal rigidity (lock + recovery after a phase-kick). */
export function temporalRigidity(input: RigidityInput): RigidityVerdict {
  const x = input.signal;
  const n = x.length;
  const minLag = Math.max(1, input.minLag ?? 2);
  const maxLag = Math.min(input.maxLag ?? Math.floor(n / 2), Math.floor(n / 2));
  const threshold = input.threshold ?? 0.5;
  const kick = Math.max(0, Math.min(1, input.kick ?? 0.25));

  if (n < 4 || maxLag < minLag) {
    return { period: 0, lockQuality: 0, recovery: 0, rigid: false };
  }

  const base = dominantLock(x, minLag, maxLag);
  if (base.period === 0 || base.lockQuality <= 0) {
    return { period: 0, lockQuality: 0, recovery: 0, rigid: false };
  }

  // Phase-kick, then measure lock-quality AT THE SAME dominant period — does the rhythm re-lock?
  const kicked = phaseKick(x, kick);
  const kmean = meanOf(kicked);
  let kdenom = 0;
  for (const v of kicked) kdenom += (v - kmean) * (v - kmean);
  const kickedLock = Math.max(0, Math.min(1, autocorrAt(kicked, base.period, kmean, kdenom)));
  const recovery = base.lockQuality > 0 ? Math.min(1, kickedLock / base.lockQuality) : 0;

  const rigid = base.lockQuality >= threshold && recovery >= threshold;
  return { period: base.period, lockQuality: base.lockQuality, recovery, rigid };
}
