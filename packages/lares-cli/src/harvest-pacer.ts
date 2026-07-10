/**
 * harvest-pacer — FLOW CONTROL for the bulk feeder (`lares harvest --all`): the sink's own
 * lived cost paces the source. Composes THREE existing laws, invents no clock:
 *
 *   1. the WINDOW SERVO (@lararium/mesh gate-tuning `adaptWindow`, the disk-reconcile gate
 *      precedent): each batch's observed completion cost servos the inter-batch delay window
 *      toward a latency set-point — cost above target → the window GROWS multiplicatively
 *      (AIMD back-off), headroom → shrinks additively. No wall-clock config; self-clocking.
 *   2. the FFZ INCOMMENSURABLE FLOOR (@lararium/mesh `incommensurablePullMs`, the carriage
 *      cadence precedent): the window's floor renewal-randomizes EACH draw — a per-run seed
 *      golden-rotates the deterministic factor, jitter randomizes the realization — so bulk
 *      never phase-locks with the live turn-Stop capture cadence (no fixed period, ever).
 *   3. the WAL-DEPTH PRESSURE (cut 4): the capture WAL's depth (records the sink still holds)
 *      INFLATES the observed cost before the servo reads it, so sink pressure propagates
 *      upstream — a backed-up sink widens the feeder's window even when the batch itself
 *      returned fast (the verb acks before the flush drains).
 *
 * Pure math + injected seams (readDepth · rand) — the feeder wires the real WAL reader.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/capture-annotation-model#nalu-flush-hardening
 */

import { adaptWindow, incommensurablePullMs, type WindowServo } from "@lararium/mesh";

/** The bulk feeder's servo set-point — targets the capture leg's recall-latency SLO band
 *  (gate-tuning's Little's-Law default 2000 ms); floor/ceiling bound responsiveness vs stall. */
export const PONO_HARVEST_SERVO: WindowServo = {
  targetMs: 2000,
  minMs: 250,
  maxMs: 60_000,
};

/** Depth normalizer: this many WAL records ≈ one full target-cost of extra pressure. Matches
 *  the pono flush gate's batch depth (capture-nalu PONO_FLUSH_GATE.depth = 32). */
export const PONO_DEPTH_SCALE = 32;

/** Base of the renewal-randomized floor. Sits CLEAR of incommensurablePullMs's 250 ms hard
 *  clamp (factor·jitter ∈ [0.525, 1.625]; 500·0.525 = 262 > 250) — a base at the clamp would
 *  flatten low draws into a fixed 250 ms period, the exact phase-lock the floor forbids. */
export const PONO_BASE_FLOOR_MS = 500;

export interface HarvestPacerOptions {
  /** per-run seed for the incommensurable floor (the secret phase — never a shared constant). */
  readonly seedHex: string;
  /** servo overrides (target/floor/ceiling/hysteresis). */
  readonly servo?: Partial<WindowServo>;
  /** base of the renewal-randomized floor (ms). Default {@link PONO_BASE_FLOOR_MS}. */
  readonly baseFloorMs?: number;
  /** WAL records per unit of target-cost pressure. Default {@link PONO_DEPTH_SCALE}. */
  readonly depthScale?: number;
  /** the sink-pressure seam — capture-WAL depth (records). Default: no pressure (0). */
  readonly readDepth?: () => number;
  /** entropy seam for the floor's renewal jitter. Default Math.random. */
  readonly rand?: () => number;
}

/** One pacing step — the trajectory record the live-light witness logs. */
export interface PacerStep {
  /** the batch's raw completion cost (ms). */
  readonly observedMs: number;
  /** the sink's WAL depth read this step (records). */
  readonly depth: number;
  /** the depth-inflated effective cost the servo read (ms). */
  readonly costMs: number;
  /** the servo window after this step (ms). */
  readonly windowMs: number;
  /** this draw's renewal-randomized incommensurable floor (ms). */
  readonly floorMs: number;
  /** the delay to hold before the next batch — max(floor, window) (ms). */
  readonly delayMs: number;
}

export interface HarvestPacer {
  /** Feed one batch's completion cost; returns the step (delayMs = the inter-batch hold). */
  next(observedMs: number): PacerStep;
  /** The full window trajectory so far (the witness log). */
  trajectory(): readonly PacerStep[];
}

/** Compose the bulk feeder's pacer from the three laws (servo · FFZ floor · depth pressure). */
export function makeHarvestPacer(opts: HarvestPacerOptions): HarvestPacer {
  const servo: WindowServo = { ...PONO_HARVEST_SERVO, ...(opts.servo ?? {}) };
  const baseFloorMs = opts.baseFloorMs ?? PONO_BASE_FLOOR_MS;
  const depthScale = Math.max(1, opts.depthScale ?? PONO_DEPTH_SCALE);
  const readDepth = opts.readDepth ?? (() => 0);
  const rand = opts.rand ?? Math.random;

  let windowMs = servo.minMs;
  const steps: PacerStep[] = [];

  return {
    next(observedMs: number): PacerStep {
      let depth = 0;
      try {
        depth = Math.max(0, readDepth());
      } catch {
        /* a failed depth read = no pressure signal, never a failed batch */
      }
      // Sink pressure inflates the cost the servo reads: depth/scale in units of the raw cost.
      // depth 0 ⇒ costMs === observedMs (byte-identical servo behavior without cut 4).
      const costMs = observedMs * (1 + depth / depthScale);
      windowMs = adaptWindow(windowMs, costMs, servo);
      // The FFZ floor: renewal-randomized each draw (deterministic incommensurable factor from
      // the seed × fresh jitter) — the delay sequence never settles on a fixed period.
      const floorMs = incommensurablePullMs(opts.seedHex, baseFloorMs, rand);
      const step: PacerStep = {
        observedMs,
        depth,
        costMs: Math.round(costMs),
        windowMs,
        floorMs,
        delayMs: Math.max(floorMs, windowMs),
      };
      steps.push(step);
      return step;
    },
    trajectory: () => steps,
  };
}
