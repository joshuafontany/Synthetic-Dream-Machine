/**
 * clock-recovery — recovers the FFZ rhythmic clock FROM the fed stream (no Date.now, no global now). The
 * nalu-gate RECOVERS the clock the way a PLL does: it locks a local rhythm to the stream's OWN cadence,
 * reading an EVENT-INDEXED signal (e.g. per-event drift/cohesion) — never a wall-clock timestamp. Three
 * deep domains converge here (astral-sea swarm): PLL clock-data-recovery locks the clock from the data's
 * transitions (no clock wire) · Page-Wootters conditioning CONSTITUTES time by correlating a clock-
 * subsystem with the rest (never fetches it) · biological phase-response entrainment locks a local
 * oscillator to the input's beat.
 *
 * THE BANDS EMERGE: the 5 FFZ bands ride as an oscillator bank at integer SUBHARMONICS of ONE recovered
 * beat (a neural-resonance meter / a PLL filter-bank) — never the hardcoded [64,256,1024,…] a coding
 * session chose. Feed the stream and the recovered beat + its nested subharmonics SURFACE as the bands.
 *
 * HOLDOVER: a sparse/flat feed carries no recoverable beat → drops lock → free-runs on the last-known
 * rhythm, marked PROVISIONAL. An unfed island holds no clock (thermal time; a damped oscillator awaiting
 * drive). Recovery NEVER fabricates a beat from read-order — a static corpus carries no temporal beat
 * (the Reference-Fusion-in-time trap); below the lock threshold the bands stay provisional, never asserted.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/mesh/flow
 */

import { dominantPeriod } from "./temporal-rigidity.js";

/** FFZ register names, fine→coarse — the 5 nested bands the recovered beat expresses at. */
export const FFZ_BANDS_FINE_TO_COARSE = ["pulse", "beat", "measure", "arc", "theme"] as const;

export interface ClockRecoveryInput {
  /** Event-indexed signal (e.g. per-event drift/cohesion) — the stream's cadence; NO wall-clock. */
  readonly signal: readonly number[];
  /** How many nested bands to emit (default 5 = pulse·beat·measure·arc·theme). */
  readonly nBands?: number;
  /** Subharmonic nesting ratio between adjacent bands (default 2 = dyadic octaves). */
  readonly nestRatio?: number;
  /** Lock threshold on the recovered beat's autocorrelation strength (below → holdover). Default 0.3. */
  readonly lockThreshold?: number;
}

/** One recovered band — an emergent subharmonic of the fundamental beat. */
export interface RecoveredBand {
  readonly name: string;
  /** The band's period (event-ordinal units), computed as beat × nestRatio^level. */
  readonly period: number;
  /** Resolves when the period fits the signal (≤ n/2, so its cycle shows); else it falls to holdover. */
  readonly resolved: boolean;
}

export interface ClockRecovery {
  /** The recovered fundamental beat (period in event-ordinal units; 0 when unlocked). */
  readonly beat: number;
  /** The beat's autocorrelation lock-quality ∈ [0,1]. */
  readonly lockQuality: number;
  /** Locks when the beat stands strong enough to trust (lockQuality ≥ threshold). */
  readonly locked: boolean;
  /** Holds over when lock drops (sparse/flat feed) → free-runs, provisional; NEVER fabricates a beat. */
  readonly holdover: boolean;
  /** The emergent bands — the beat's nested subharmonics (empty on holdover). */
  readonly bands: readonly RecoveredBand[];
}

/**
 * Recover the FFZ clock from an event-indexed signal: infer the fundamental beat (dominant autocorrelation
 * period), then emit the nested subharmonic bands. Below the lock threshold → HOLDOVER (no bands asserted).
 */
export function recoverClock(input: ClockRecoveryInput): ClockRecovery {
  const n = input.signal.length;
  const nBands = Math.max(1, input.nBands ?? 5);
  const nestRatio = input.nestRatio ?? 2;
  const lockThreshold = input.lockThreshold ?? 0.3;

  const { period: beat, lockQuality } = dominantPeriod(input.signal);
  const locked = beat > 0 && lockQuality >= lockThreshold;

  if (!locked) {
    // No recoverable beat → holdover (free-run, provisional). Never fabricate a rhythm from read-order.
    return { beat: 0, lockQuality, locked: false, holdover: true, bands: [] };
  }

  // The bands EMERGE as the beat's nested subharmonics; a band resolves only if its cycle fits the signal.
  const bands: RecoveredBand[] = [];
  for (let level = 0; level < nBands; level++) {
    const period = beat * nestRatio ** level;
    bands.push({
      name: FFZ_BANDS_FINE_TO_COARSE[level] ?? `band-${level}`,
      period,
      resolved: period <= n / 2,
    });
  }

  return { beat, lockQuality, locked: true, holdover: false, bands };
}
