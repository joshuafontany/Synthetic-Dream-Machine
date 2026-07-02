/**
 * concurrency-dial — the self-tuning parallelism limit for the parallel-ingest pool. The AIMD
 * dial the capture research swarm (Loom-Diver) named: let MEASURED LATENCY drive the pool size,
 * never a hardcoded worker count that's wrong on every machine and corpus (Netflix
 * concurrency-limits, TCP congestion control, Little's law).
 *
 * SIBLING to gate-tuning's `adaptGate` (both AIMD around a latency set-point) but the OPPOSITE
 * direction: adaptGate tunes a COALESCE INTERVAL (overload → grow the interval = flush less);
 * this tunes a CONCURRENCY LIMIT (overload → SHRINK the limit = admit less). Same AIMD safety
 * asymmetry — additive-increase probes gently, multiplicative-decrease retreats fast on the first
 * latency signal — different scalar, different sign. Kept its own module so neither dial's
 * direction leaks into the other.
 *
 * THE LAW (AIMD): the set-point is the no-load latency × a tolerance (queue forming = latency
 * risen past it). Below → additive-increase (probe for more parallelism); above → multiplicative-
 * decrease (back off before the latency-collapse cascade). The limit finds itself; no operator
 * knows the true number.
 *
 * PURE + immutable: every observe() returns a new dial. The caller feeds it (latency, inflight)
 * samples from the real pool; the dial owns only the control law.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/concurrency-dial · [[main-session-capture-gap]]
 */

/** The dial's tuning constants — the safe defaults Loom-Diver's sources name. */
export interface DialConfig {
  /** the floor — never fewer workers than this (cold-start + progress guarantee). Default 4. */
  readonly min: number;
  /** the ceiling — never more (protects the store/HNSW from a write storm). Default 64. */
  readonly max: number;
  /** overload set-point = noLoadLatency × this. Above it, queue is forming → back off. Default 2. */
  readonly tolerance: number;
  /** multiplicative back-off factor on overload (AIMD: retreat fast). Default 0.5. */
  readonly beta: number;
}

export const DEFAULT_DIAL: DialConfig = { min: 4, max: 64, tolerance: 2, beta: 0.5 };

/** The dial state — the current limit + the learned no-load latency baseline. */
export interface Dial {
  readonly limit: number;
  /** the min latency seen = the no-queue baseline (the AIMD reference). Infinity until first sample. */
  readonly noLoadLatency: number;
  readonly config: DialConfig;
}

/** A fresh dial at the floor, baseline unlearned. `start` clamps into [min,max]. */
export function makeDial(config: Partial<DialConfig> = {}, start?: number): Dial {
  const cfg = { ...DEFAULT_DIAL, ...config };
  const limit = Math.min(Math.max(start ?? cfg.min, cfg.min), cfg.max);
  return { limit, noLoadLatency: Infinity, config: cfg };
}

/**
 * Observe one completed unit of work: its `latency` (ms) at the concurrency it ran under. Learns
 * the no-load baseline (the min latency ever seen), then applies AIMD:
 *   - latency ≤ baseline × tolerance (headroom) → additive-increase (+1, capped at max)
 *   - latency >  baseline × tolerance (overload) → multiplicative-decrease (× beta, floored at min)
 * The first sample sets the baseline and holds the limit (no signal to act on yet).
 */
export function observe(d: Dial, latency: number): Dial {
  const noLoad = Math.min(d.noLoadLatency, latency);
  if (!Number.isFinite(d.noLoadLatency)) return { ...d, noLoadLatency: noLoad }; // first sample: learn, hold
  const setPoint = noLoad * d.config.tolerance;
  let limit: number;
  if (latency > setPoint) {
    limit = Math.max(Math.floor(d.limit * d.config.beta), d.config.min); // overload → back off fast
  } else {
    limit = Math.min(d.limit + 1, d.config.max); // headroom → probe up gently
  }
  return { ...d, limit, noLoadLatency: noLoad };
}
