/**
 * sink — the feed-it-emerges Sink accumulator: one event-log per candidate that COMPOSES the three sink
 * order-parameters (birth ⊕ standing ⊕ clock) into one living organ. "Just feed it" — ingest (plane,
 * agreement) events (ordered by island ordinal, NEVER a wall-clock timestamp) and the Sink derives:
 *   · support        — accreted event count (the nucleus "size");
 *   · planeSignals   — per-plane mean agreement (the cross-plane drive);
 *   · rhythm         — the event-indexed agreement signal (feeds the clock + rigidity);
 *   · supersaturation — recent-window agreement / a learned BASELINE (EMA) — SELF-CALIBRATED, no chosen
 *                       constant: a burst reads > 1 (lowers r*), a lull reads < 1, automatically.
 *
 * The verdict composes: recoverClock(rhythm) → the emergent bands; nucleate({support, planeSignals,
 * arrivalRate: supersaturation}) → birth; temporalRigidity(rhythm) → standing. The seam the QA named — a
 * shared candidate noun bridging the scalar gate and the array-signal rigidity — closes here: both read
 * projections of ONE event-log.
 *
 * STILL feed-it-emerges TODO (honest): the birth threshold rides γ (defaulted, not yet population-
 * calibrated) and the rigidity threshold stays fixed (not yet a shuffle-null). supersaturation is the
 * FIRST magic-number turned self-adaptive here; γ + the null-thresholds ride the next pass.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/mesh/flow
 */

import { nucleate, type NucleationVerdict, type PlaneSignal } from "./nucleation-gate.js";
import { temporalRigidity, type RigidityVerdict } from "./temporal-rigidity.js";
import { recoverClock, type ClockRecovery } from "./clock-recovery.js";

/** One fed event — a plane attesting this candidate, with a per-event agreement (0..1) and an optional
 *  rhythm value (defaults to the agreement); ordered by ingest order (island ordinal), no wall-clock. */
export interface SinkEvent {
  readonly plane: string;
  readonly agreement: number;
  readonly value?: number;
}

export interface SinkVerdict {
  readonly support: number;
  readonly supersaturation: number;
  readonly planeSignals: readonly PlaneSignal[];
  readonly birth: NucleationVerdict;
  readonly standing: RigidityVerdict;
  readonly clock: ClockRecovery;
  /** A candidate STANDS as a sink when it is BORN (nucleated) AND RIGID (its rhythm re-locks). */
  readonly standsAsSink: boolean;
}

export interface SinkOptions {
  /** Baseline EMA smoothing ∈ (0,1] — how fast the learned baseline tracks (default 0.1, slow). */
  readonly baselineAlpha?: number;
  /** Recent-window length (events) for the supersaturation numerator (default 8). */
  readonly recentWindow?: number;
  /** γ passed to the birth gate (defaulted until population-calibrated). */
  readonly surfaceCost?: number;
}

export interface Sink {
  /** Feed one event — the ONLY input. Updates support, plane signals, rhythm, and the learned baseline. */
  ingest(event: SinkEvent): void;
  /** Accreted support (event count). */
  support(): number;
  /** Per-plane mean agreement — the cross-plane drive. */
  planeSignals(): PlaneSignal[];
  /** The event-indexed agreement/rhythm signal (feeds clock + rigidity). */
  rhythm(): number[];
  /** Recent-window mean agreement ÷ the learned baseline EMA (self-calibrated; 1 at equilibrium). */
  supersaturation(): number;
  /** Compose birth ⊕ standing ⊕ clock into the Sink's current verdict. */
  verdict(): SinkVerdict;
}

/** Stand a fresh Sink accumulator. */
export function makeSink(opts: SinkOptions = {}): Sink {
  const alpha = opts.baselineAlpha ?? 0.1;
  const recentWindow = Math.max(1, opts.recentWindow ?? 8);
  const surfaceCost = opts.surfaceCost;

  const signal: number[] = [];              // the rhythm (per-event value)
  const agreeTrail: number[] = [];          // per-event agreement, for the recent window + baseline
  const agreeSum = new Map<string, number>();
  const agreeCount = new Map<string, number>();
  let baseline = 0;                         // learned EMA of per-event agreement
  let seen = 0;

  const supersaturation = (): number => {
    if (seen === 0 || baseline <= 0) return 1;
    // recent-window mean AGREEMENT (the `signal`/value may differ from agreement) ÷ the learned baseline.
    const w = Math.min(agreeTrail.length, recentWindow);
    let s = 0;
    for (let i = agreeTrail.length - w; i < agreeTrail.length; i++) s += agreeTrail[i]!;
    const recent = w > 0 ? s / w : 0;
    return recent / baseline;
  };

  const planeSignals = (): PlaneSignal[] =>
    [...agreeSum.keys()].map((plane) => ({
      plane,
      agreement: agreeSum.get(plane)! / (agreeCount.get(plane) || 1),
    }));

  const verdict = (): SinkVerdict => {
    const planes = planeSignals();
    const sat = supersaturation();
    const clock = recoverClock({ signal });
    const birth = nucleate({
      support: signal.length,
      planes,
      arrivalRate: sat,
      ...(surfaceCost !== undefined ? { surfaceCost } : {}),
    });
    const standing = temporalRigidity({ signal });
    return {
      support: signal.length,
      supersaturation: sat,
      planeSignals: planes,
      birth,
      standing,
      clock,
      standsAsSink: birth.born && standing.rigid,
    };
  };

  return {
    ingest(event: SinkEvent): void {
      const a = Number.isFinite(event.agreement) ? Math.max(0, Math.min(1, event.agreement)) : 0;
      const v = Number.isFinite(event.value ?? a) ? (event.value ?? a) : a;
      signal.push(v);
      agreeTrail.push(a);
      agreeSum.set(event.plane, (agreeSum.get(event.plane) ?? 0) + a);
      agreeCount.set(event.plane, (agreeCount.get(event.plane) ?? 0) + 1);
      baseline = seen === 0 ? a : baseline + alpha * (a - baseline); // EMA, learned from the feed
      seen += 1;
    },
    support: () => signal.length,
    planeSignals,
    rhythm: () => [...signal],
    supersaturation,
    verdict,
  };
}
