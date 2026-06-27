/**
 * gate-tuning — derive and adapt the nalu flush gate, instead of guessing it. From the
 * four-domain survey (capture keel #nalu-flush-hardening): lean/queueing says 32/2000 are
 * an EBQ batch-size and a Little's-Law wait-bound in disguise; neurophysiology says every
 * collect-then-fire system SERVOS its threshold to a set-point. These pure helpers enact
 * both — the daemon measures S/H/λ and the observed latency and calls them; the gate stops
 * being a guess. (Tick-jitter — the third upgrade — rides the daemon's tick subscription.)
 */

import { PONO_FLUSH_GATE } from "./capture-nalu.js";
import type { FlushGate } from "./capture-nalu.js";

/** Measured inputs for the Economic-Batch-Quantity derivation. */
export interface GateInputs {
  /** flush fixed cost S (ms) — the lock + spawn + write a single flush pays regardless of size */
  readonly flushCostMs: number;
  /** holding cost H — the recall-latency penalty weight, per record per ms it waits */
  readonly holdingCostPerMs: number;
  /** arrival rate λ — records per ms across all producers */
  readonly arrivalPerMs: number;
  /** the recall-latency SLO (ms) — the Little's-Law wait bound that guards low-λ. Default 2000. */
  readonly maxLatencyMs?: number;
  /** surge-headroom multiple over depth (hydrology surge-tank — size for the burst). Default 8. */
  readonly burstFactor?: number;
}

/**
 * Derive the gate from measured cost/rate (EBQ + Little's Law):
 *   depth     = √(2·λ·S / H)  — the high-λ amortizer (balances per-flush S against holding H)
 *   maxWaitMs = the SLO        — the low-λ Little's-Law wait bound (flush even when depth never crests)
 *   maxDepth  = depth·burst    — surge-tank headroom
 * Everything else (retries, backoff) inherits the pono default.
 */
export function deriveGate(m: GateInputs): FlushGate {
  const depth = Math.max(
    1,
    Math.round(Math.sqrt((2 * m.arrivalPerMs * m.flushCostMs) / m.holdingCostPerMs)),
  );
  return {
    ...PONO_FLUSH_GATE,
    depth,
    maxWaitMs: m.maxLatencyMs ?? PONO_FLUSH_GATE.maxWaitMs,
    maxDepth: depth * (m.burstFactor ?? 8),
  };
}

/**
 * One homeostatic servo step (neuro): nudge `depth` toward a latency set-point by negative
 * feedback, clamped to `maxStep`. Too slow (observed > target) → smaller batches, flush
 * sooner; fast → larger batches, amortize more. The daemon calls this periodically with the
 * recently-observed flush latency; the gate tracks the load instead of holding fixed.
 */
export function adaptGate(
  current: FlushGate,
  observedLatencyMs: number,
  targetLatencyMs: number,
  maxStep = 0.25,
): FlushGate {
  if (targetLatencyMs <= 0) return current;
  const error = (observedLatencyMs - targetLatencyMs) / targetLatencyMs; // >0 = too slow
  const factor = 1 - Math.max(-maxStep, Math.min(maxStep, error));
  const depth = Math.max(1, Math.round(current.depth * factor));
  return { ...current, depth, maxDepth: Math.max(current.maxDepth, depth * 2) };
}

/** Self-regulation config for the COALESCE family — the window servo (see {@link adaptWindow}). */
export interface WindowServo {
  /** the flush/reconcile-latency set-point (ms) the window servos toward. */
  readonly targetMs: number;
  /** floor — the min coalesce window (responsiveness bound). */
  readonly minMs: number;
  /** ceiling — the max staleness budget (beyond it, window buys latency with no throughput). */
  readonly maxMs: number;
  /** deadband half-width (fraction of target): |error| within this HOLDS the window. Default 0.25. */
  readonly hysteresis?: number;
  /** multiplicative GROW factor applied on overload (AIMD: back off fast). Default 1.5. */
  readonly growFactor?: number;
  /** additive shrink step (ms) applied on headroom (AIMD: recover slow). Default = minMs. */
  readonly shrinkStepMs?: number;
}

/**
 * One homeostatic servo step for a COALESCE window — the DUAL of {@link adaptGate}. adaptGate
 * SHRINKS a lossless batch's depth when flush latency runs high (bound per-flush cost); this GROWS
 * a lossy/newest-wins window when flush/reconcile latency runs high — rendering while the prior
 * flush still drains is pure waste, so spacing flushes wider makes each carry a fresher state for
 * less work. Direction confirmed by Linux Net DIM (flood → longer coalesce interval) and AIMD
 * (multiplicative back-off / additive recovery is what converges where MIMD/AIAD oscillate). The
 * caller feeds the recently-observed (ideally EWMA-smoothed) flush cost; a deadband holds the window
 * inside the band so noise isn't chased; the result clamps to [minMs, maxMs].
 *
 * Verdict from the prior-art survey (2026-06-26): apply ONLY to the variable-cost reconcile gate
 * (disk). A DISPLAY-BOUND newest-wins gate stays FIXED, pinned to the frame clock — tuning its
 * window adds instability for no gain (the optimal upper bound is structurally the refresh interval).
 */
export function adaptWindow(currentMs: number, observedLatencyMs: number, servo: WindowServo): number {
  if (servo.targetMs <= 0) return currentMs;
  const h = servo.hysteresis ?? 0.25;
  const grow = servo.growFactor ?? 1.5;
  const shrink = servo.shrinkStepMs ?? servo.minMs;
  const error = (observedLatencyMs - servo.targetMs) / servo.targetMs; // >0 = too slow
  let next = currentMs;
  if (error > h) next = currentMs * grow; // overload → multiplicative GROW (coalesce more)
  else if (error < -h) next = currentMs - shrink; // headroom → additive shrink (probe responsiveness)
  return Math.max(servo.minMs, Math.min(servo.maxMs, Math.round(next)));
}
