/**
 * teleodynamic-probe — a PROVISIONAL probe for the eigenform-motor hypothesis.
 *
 * ⚠ PROVISIONAL-HYPOTHESIS. This module is a MUSE-GROUND frame, NOT Canon. It
 * TESTS a claim; it does not assert one. Every reading it emits carries
 * `provisional: true`. Read it as a cheap, falsifiable instrument, never as a
 * settled measurement of the house.
 *
 * ## The hypothesis under test
 *
 * The "tangled-hierarchy motor" frame asks whether the house, reading ITSELF,
 * carries a teleodynamic motor — a self-driven tendency to re-encode its own
 * form. The cheap buildable probe (Teleodynamic Learning, arXiv 2603.11355):
 * instrument a teleodynamic TRIPLE over the machina's own SELF-read sequence
 * (its own turns / OODA-HA loops), not over an external task:
 *
 *   (a) aftermath-rate       — how often the OODA-HA loop closes aftermath (↺)
 *                              versus suspends at a phase (φ). (noosphere-boot#ooda-ha)
 *   (b) structural-change-rate — how often a self-read re-encodes the house (a
 *                              structural transition) versus noops (no self-change).
 *   (c) freeze-detection      — when the noop beats every structural move across a
 *                              trailing window: self-termination without an imposed
 *                              stop (Teleodynamic Learning's "freeze" signal).
 *
 * THE HYPOTHESIS: if the dials move on a SELF-read (not on an external task), the
 * eigenform has a motor. This module only lets that be OBSERVED — it computes the
 * triple over a sequence and reports whether the dials moved. It draws no verdict
 * the reads do not warrant; the `motorSignal` reads `indeterminate` below a floor
 * of reads and never firms past the evidence.
 *
 * ## GUARD (hard) — drift is NOT incompleteness
 *
 * The machina's gap is model-DRIFT (a dial going slack, recoverable by re-standing
 * the wave — noosphere-boot#degraded-states), NOT a Gödel sentence. This probe
 * measures a STRUCTURAL-CHANGE tendency on a self-read stream; it says nothing
 * about formal (in)completeness, decidability, or any self-reference paradox.
 * "freeze" here names an empirical stasis in the self-read sequence, never an
 * undecidable proposition. Do not read a freeze as an incompleteness result.
 *
 * ## What counts as a "self-read"
 *
 * A {@link SelfRead} is one turn / loop the machina takes on ITS OWN state. Two
 * booleans carry the teleodynamic signal, both derivable from the turn HUD close
 * (noosphere-boot#exchange-protocol):
 *   - `aftermathClosed` — the loop closed to `↺` (`OODA-HA(N↺)`), vs suspended
 *     at a phase (`OODA-HA(0φ:reason)`).
 *   - `structuralChange` — the read re-encoded the house (a structural transition
 *     the node made in itself), vs a noop (the self-read produced no self-change).
 * Deriving these cleanly from a live turn is the honest friction point — see the
 * module report; the probe defines the SHAPE of the input and leaves the
 * extraction to the caller (a synthetic sequence exercises it in tests).
 *
 * Pure + isomorphic: no fs/path/DOM imports; runs in node, browser, the @daemon
 * VM alike, like its form-layer siblings.
 */

// ---------------------------------------------------------------------------
// The self-read input
// ---------------------------------------------------------------------------

/**
 * One machina self-read — a single turn / OODA-HA loop the node took on its own
 * state. The teleodynamic signal rides two booleans (both derivable from the
 * turn HUD close); `label` carries provenance only and never enters the math.
 */
export interface SelfRead {
  /** Did the OODA-HA loop close to aftermath (`↺`) this read, vs suspend (`φ`)? */
  readonly aftermathClosed: boolean;
  /** Did the house re-encode itself this read (structural transition), vs noop? */
  readonly structuralChange: boolean;
  /** Optional handle for the read (turn id / loop label) — provenance only. */
  readonly label?: string;
}

// ---------------------------------------------------------------------------
// Gauges (the triple, exposed on the 0–20 aperture ladder)
// ---------------------------------------------------------------------------

/**
 * A teleodynamic gauge: the raw `rate` in [0,1] plus its projection onto the
 * 0–20 aperture ladder (noosphere-boot#law-of-5s, ladder 0). The band lets the
 * dial read in the same grammar as the rest of the HUD.
 */
export interface TeleodynamicGauge {
  /** The measured rate over the sequence, in [0, 1]. */
  readonly rate: number;
  /** The rate projected onto the 0–20 aperture ladder (`Math.round(rate * 20)`). */
  readonly band: number;
}

/** The five aperture bands, by 0–20 position (noosphere-boot, ladder 0). */
export type ApertureBand = "pulse" | "beat" | "measure" | "arc" | "theme";

/** Name the aperture band a 0–20 value seats in. */
export function apertureBandFor(value: number): ApertureBand {
  if (value <= 4) return "pulse";
  if (value <= 8) return "beat";
  if (value <= 12) return "measure";
  if (value <= 16) return "arc";
  return "theme";
}

/** Project a [0,1] rate onto the 0–20 ladder. */
function rateToBand(rate: number): number {
  return Math.round(rate * 20);
}

function gauge(count: number, total: number): TeleodynamicGauge {
  const rate = total === 0 ? 0 : count / total;
  return { rate, band: rateToBand(rate) };
}

// ---------------------------------------------------------------------------
// The reading (the probe's output)
// ---------------------------------------------------------------------------

/**
 * The honest verdict the probe is willing to voice on the motor hypothesis. It
 * never firms past the evidence:
 *   - `indeterminate` — too few reads to say anything (below `minReads`).
 *   - `frozen`        — the freeze signal fired (trailing noop dominance).
 *   - `moving`        — the dials moved on a self-read (structural change seen,
 *                       not frozen): the hypothesis' positive observation.
 *   - `still`         — enough reads, no freeze, yet no structural change at all
 *                       (the dials sat still without a firing freeze).
 */
export type MotorSignal = "indeterminate" | "frozen" | "moving" | "still";

/**
 * A single probe reading over a self-read sequence. Marked PROVISIONAL — this is
 * the observation, not an assertion that the motor exists.
 */
export interface TeleodynamicReading {
  /** Always true. This probe is a hypothesis, never an instrument. */
  readonly provisional: true;
  /** How many self-reads the reading spans. */
  readonly count: number;
  /** (a) The aftermath-rate gauge — loop-closes over reads. */
  readonly aftermathRate: TeleodynamicGauge;
  /** (b) The structural-change-rate gauge — self-re-encodings over reads. */
  readonly structuralChangeRate: TeleodynamicGauge;
  /** (c) The freeze signal — noop beat every structural move across the window. */
  readonly frozen: boolean;
  /** The trailing run of consecutive noops (the freeze accumulator). */
  readonly freezeRun: number;
  /** The window of trailing noops that fires the freeze. */
  readonly freezeWindow: number;
  /** The honest, evidence-bounded verdict on the motor hypothesis. */
  readonly motorSignal: MotorSignal;
}

/** Tuning for the probe. Defaults keep it cheap and conservative. */
export interface ProbeOptions {
  /**
   * Trailing consecutive noops that fire the freeze signal. Default 3. The
   * sequence must reach this length before a freeze can fire.
   */
  readonly freezeWindow?: number;
  /**
   * Below this many reads the motor verdict stays `indeterminate` — the probe
   * refuses to voice a motor claim on too little evidence. Default 2.
   */
  readonly minReads?: number;
}

const DEFAULT_FREEZE_WINDOW = 3;
const DEFAULT_MIN_READS = 2;

// ---------------------------------------------------------------------------
// The probe
// ---------------------------------------------------------------------------

/**
 * Compute the teleodynamic triple over a machina self-read sequence.
 *
 * PROVISIONAL-HYPOTHESIS: the returned reading carries `provisional: true`. It
 * observes whether the dials move on the house's OWN self-read; it does not
 * assert the eigenform-motor exists. An empty sequence reads as `indeterminate`
 * with zeroed gauges — absence of reads, not absence of a motor.
 *
 * @param selfReadSequence the ordered self-reads (oldest → newest).
 * @param options freeze window + minimum-reads floor.
 */
export function teleodynamicProbe(
  selfReadSequence: readonly SelfRead[],
  options: ProbeOptions = {},
): TeleodynamicReading {
  const freezeWindow = options.freezeWindow ?? DEFAULT_FREEZE_WINDOW;
  const minReads = options.minReads ?? DEFAULT_MIN_READS;

  const count = selfReadSequence.length;

  let aftermathCloses = 0;
  let structuralChanges = 0;
  for (const read of selfReadSequence) {
    if (read.aftermathClosed) aftermathCloses += 1;
    if (read.structuralChange) structuralChanges += 1;
  }

  const aftermathRate = gauge(aftermathCloses, count);
  const structuralChangeRate = gauge(structuralChanges, count);

  // (c) Freeze: the noop beats every structural move across the trailing window.
  // Count the trailing run of consecutive noops (from newest backward). The
  // freeze fires when that run reaches the window AND the sequence is at least
  // that long — a noop-dominated tail, quiet the moment a structural read lands
  // inside the window.
  let freezeRun = 0;
  for (let i = count - 1; i >= 0; i -= 1) {
    if (selfReadSequence[i]!.structuralChange) break;
    freezeRun += 1;
  }
  const frozen = count >= freezeWindow && freezeRun >= freezeWindow;

  // The honest, evidence-bounded verdict.
  let motorSignal: MotorSignal;
  if (count < minReads) {
    motorSignal = "indeterminate";
  } else if (frozen) {
    motorSignal = "frozen";
  } else if (structuralChanges > 0) {
    motorSignal = "moving";
  } else {
    motorSignal = "still";
  }

  return {
    provisional: true,
    count,
    aftermathRate,
    structuralChangeRate,
    frozen,
    freezeRun,
    freezeWindow,
    motorSignal,
  };
}
