/**
 * sink — the feed-it-emerges Sink accumulator: one event-log per candidate that COMPOSES the three sink
 * order-parameters (birth ⊕ standing ⊕ clock) into one living organ. "Just feed it" — ingest (plane,
 * agreement, value?) events (ordered by island ordinal, NEVER a wall-clock timestamp) and the Sink derives:
 *   · support        — accreted event count (the nucleus "size");
 *   · planeSignals   — per-plane mean agreement (the cross-plane drive);
 *   · rhythm         — the agreement FIRST-DIFFERENCE v_i = a_i − a_(i-1) (v_0 = 0) by default, an explicit
 *                      `value` overriding it; the marquee signal that feeds the clock + rigidity;
 *   · supersaturation — recent-window agreement ÷ a BASELINE (EMA), the ratio self-calibrated against a
 *                       BEAT-DERIVED window; a default window applies only in holdover. A burst reads > 1
 *                       (lowers r*), a lull reads < 1.
 *
 * The clock drives the rest (C1): recoverClock({rhythm}) recovers the beat ONCE; that beat sizes the
 * supersaturation window, and rides into temporalRigidity as knownPeriod so the base period gets detected a
 * single time — clock + rigidity read ONE beat. nucleate({support, planeSignals, arrivalRate, planeCorrelation})
 * decides birth; temporalRigidity decides standing. The seam the QA named — a shared candidate noun bridging
 * the scalar gate and the array-signal rigidity — closes here: every organ reads projections of ONE event-log.
 *
 * A constant (plane, agreement)-only feed carries NO first-difference rhythm → holdover → it never STANDS as
 * a sink (born may still fire on cross-plane support, but standing stays provisional).
 *
 * STILL feed-it-emerges TODO (honest): the birth threshold rides γ (defaulted, not yet population-calibrated),
 * the rigidity threshold stays fixed (not yet a shuffle-null), and `born` reduces to "≥2 independent planes +
 * agreement" until γ calibration + support-decay land. Now RESOLVED here: supersaturation self-adapts against
 * the beat-derived window, and the recent-window / baseline-alpha knobs emerge from the recovered beat rather
 * than a chosen constant. The next pass carries γ + the null-thresholds + windowed support.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/mesh/flow
 */

import { nucleate, type NucleationVerdict, type PlaneSignal } from "./nucleation-gate.js";
import { temporalRigidity, normalizeSignal, type RigidityVerdict } from "./temporal-rigidity.js";
import { recoverClock, type ClockRecovery } from "./clock-recovery.js";

/** Recent-window length used ONLY in holdover, when no beat has been recovered to size it. */
export const DEFAULT_HOLDOVER_WINDOW = 8;
/** Stability GUARD (not a rhythm knob): clamps supersaturation to [1/CAP, CAP] so a cold spike can't blow it. */
export const SUPERSATURATION_CAP = 8;

/** One fed event — a plane attesting this candidate, with a per-event agreement (0..1) and an optional
 *  rhythm value OVERRIDE (defaults to the agreement first-difference); ordered by ingest order (island
 *  ordinal), no wall-clock. */
export interface SinkEvent {
  readonly plane: string;
  readonly agreement: number;
  readonly value?: number;
}

export interface SinkVerdict {
  readonly support: number;
  readonly supersaturation: number;
  /** The beat-derived recent window sizing supersaturation (holdover falls to DEFAULT_HOLDOVER_WINDOW). */
  readonly recentWindow: number;
  readonly planeSignals: readonly PlaneSignal[];
  readonly birth: NucleationVerdict;
  readonly standing: RigidityVerdict;
  readonly clock: ClockRecovery;
  /** The clock free-runs on this last-locked beat when lock drops — PROVISIONAL (0 until a beat ever locks). */
  readonly freeRunBeat: number;
  /** Provisional when the clock holds over (no recoverable beat) — the standing verdict reads soft. */
  readonly provisional: boolean;
  /** A candidate STANDS as a sink when it is BORN (nucleated) AND RIGID (its rhythm re-locks); an atemporal
   *  Sink never stands (no beat to lock). */
  readonly standsAsSink: boolean;
  /** True when the Sink reads a corpus (atemporal) feed — carries the feed's own truth so a downstream
   *  mint waives standing (a corpus never re-locks) rather than trusting each caller to remember. */
  readonly atemporal: boolean;
}

export interface SinkOptions {
  /** γ passed to the birth gate (defaulted until population-calibrated). */
  readonly surfaceCost?: number;
  /** Mark the whole Sink as ATEMPORAL — a corpus read-as-feed, whose read-order carries no real beat. Forces
   *  holdover, SUPPRESSES the first-difference rhythm (transitions would fabricate a beat), and drives ONLY
   *  birth + support; `born` stays meaningful, `standsAsSink` stays false. */
  readonly atemporal?: boolean;
}

export interface Sink {
  /** Feed one event — the ONLY input. Accretes support, the plane series, agreement, and any value override. */
  ingest(event: SinkEvent): void;
  /** Accreted support (event count). */
  support(): number;
  /** Per-plane mean agreement — the cross-plane drive. */
  planeSignals(): PlaneSignal[];
  /** The event-indexed rhythm (agreement first-difference, or the explicit value override; empty when atemporal). */
  rhythm(): number[];
  /** Per-plane rhythm — each plane's OWN agreement first-difference (empty when atemporal). Feeds the
   *  sink-class ablation: a plane that stands rigid ALONE carries a signal-boundary (cymatic) shape. */
  rhythmByPlane(): Map<string, number[]>;
  /** Recent-window mean agreement ÷ the baseline EMA, self-calibrated against the beat-derived window. */
  supersaturation(): number;
  /** Compose birth ⊕ standing ⊕ clock into the Sink's current verdict. */
  verdict(): SinkVerdict;
}

/** Stand a fresh Sink accumulator. */
export function makeSink(opts: SinkOptions = {}): Sink {
  const surfaceCost = opts.surfaceCost;
  const atemporal = opts.atemporal ?? false;

  const perPlane = new Map<string, number[]>();   // per-plane ORDERED agreement series (feeds correlation)
  const agreeTrail: number[] = [];                 // per-event agreement (feeds the baseline + recent window)
  const valueTrail: (number | null)[] = [];        // per-event explicit rhythm override (null ⇒ derive)
  let lastLockedBeat = 0;                           // retained across verdicts → provisional free-run on holdover

  const mean = (xs: readonly number[]): number =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

  // The rhythm: an explicit value overrides; otherwise the agreement first-difference (marquee honesty —
  // a flat feed carries no rhythm), with v_0 = 0.
  const deriveRhythm = (): number[] => {
    if (atemporal) return [];
    const out: number[] = [];
    for (let i = 0; i < agreeTrail.length; i++) {
      const override = valueTrail[i];
      out.push(typeof override === "number" ? override : i === 0 ? 0 : agreeTrail[i]! - agreeTrail[i - 1]!);
    }
    return out;
  };

  // Per-plane rhythm: each plane's OWN agreement first-difference (v_0 = 0). A plane whose solo rhythm
  // re-locks (temporalRigidity) carries the shape in its own data-boundary — a cymatic (signal-boundary)
  // sink; a corpus (atemporal) feed fabricates no rhythm, so it hands back an empty map.
  const deriveRhythmByPlane = (): Map<string, number[]> => {
    const out = new Map<string, number[]>();
    if (atemporal) return out;
    for (const [plane, series] of perPlane) {
      const r: number[] = [];
      for (let i = 0; i < series.length; i++) r.push(i === 0 ? 0 : series[i]! - series[i - 1]!);
      out.set(plane, r);
    }
    return out;
  };

  // Signed Pearson correlation over the overlapping prefix of two plane series — lockstep series read ~1
  // (they collapse to one effective plane); a constant series carries no signed correlation → independent.
  const pearson = (x: readonly number[], y: readonly number[]): number => {
    const m = Math.min(x.length, y.length);
    if (m < 2) return 0;
    let mx = 0;
    let my = 0;
    for (let i = 0; i < m; i++) {
      mx += x[i]!;
      my += y[i]!;
    }
    mx /= m;
    my /= m;
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    for (let i = 0; i < m; i++) {
      const dx = x[i]! - mx;
      const dy = y[i]! - my;
      sxy += dx * dy;
      sxx += dx * dx;
      syy += dy * dy;
    }
    if (!(sxx > 0) || !(syy > 0)) return 0;
    const r = sxy / Math.sqrt(sxx * syy);
    return Number.isFinite(r) ? Math.max(-1, Math.min(1, r)) : 0;
  };

  // The signed pairwise correlation matrix across co-occurring plane series (C7) — feeds the effective-plane
  // count so lockstep/echoed planes collapse to ~1 plane. Undefined for < 2 planes (all independent).
  const planeCorrelation = (keys: readonly string[]): number[][] | undefined => {
    if (keys.length < 2) return undefined;
    return keys.map((ki, i) => keys.map((kj, j) => (i === j ? 1 : pearson(perPlane.get(ki)!, perPlane.get(kj)!))));
  };

  const planeSignals = (): PlaneSignal[] =>
    [...perPlane.entries()].map(([plane, series]) => ({ plane, agreement: mean(series) }));

  // Recover the clock ONCE, size the beat-derived window, and self-calibrate supersaturation. The beat drives
  // the rest; on holdover the clock free-runs on the last-locked beat (provisional).
  // BATCH cost: snapshot re-derives the beat + baseline over the WHOLE trail per verdict (O(n·maxLag)); the
  // deferred streaming cure (online-autocorr + streaming-subspace incremental accumulators) rides later.
  const snapshot = () => {
    const seen = agreeTrail.length;
    const rhythm = deriveRhythm();
    const normRhythm = normalizeSignal(rhythm); // C10: keep extreme finite amplitudes off the NaN overflow
    const clock = recoverClock({ signal: normRhythm });
    if (clock.locked) lastLockedBeat = clock.beat;
    const freeRunBeat = clock.locked ? clock.beat : lastLockedBeat;
    const recentWindow = freeRunBeat > 0 ? Math.max(2, Math.round(freeRunBeat)) : DEFAULT_HOLDOVER_WINDOW;

    const warming = seen < recentWindow; // warmup pins supersaturation to equilibrium (no cold-spike boost)
    let supersaturation = 1;
    if (!warming) {
      const alpha = 1 / recentWindow;
      let baseline = 0;
      for (let i = 0; i < agreeTrail.length; i++) {
        baseline = i === 0 ? agreeTrail[0]! : baseline + alpha * (agreeTrail[i]! - baseline);
      }
      if (baseline > 0) {
        const w = Math.min(agreeTrail.length, recentWindow);
        let s = 0;
        for (let i = agreeTrail.length - w; i < agreeTrail.length; i++) s += agreeTrail[i]!;
        const recent = w > 0 ? s / w : 0;
        const raw = recent / baseline;
        supersaturation = Math.min(SUPERSATURATION_CAP, Math.max(1 / SUPERSATURATION_CAP, raw));
      }
    }
    return { seen, normRhythm, clock, freeRunBeat, recentWindow, warming, supersaturation };
  };

  const verdict = (): SinkVerdict => {
    const st = snapshot();
    const keys = [...perPlane.keys()];
    const planes = planeSignals();
    const corr = planeCorrelation(keys);
    const birth = nucleate({
      support: st.seen,
      planes,
      arrivalRate: st.supersaturation, // pinned to equilibrium during warmup → no cold-spike burst boost
      ...(surfaceCost !== undefined ? { surfaceCost } : {}),
      ...(corr !== undefined ? { planeCorrelation: corr } : {}),
    });
    const standing = atemporal
      ? temporalRigidity({ signal: [] })                                  // no rhythm to stand on
      : temporalRigidity({ signal: st.normRhythm, knownPeriod: st.clock.beat });
    return {
      support: st.seen,
      supersaturation: st.supersaturation,
      recentWindow: st.recentWindow,
      planeSignals: planes,
      birth,
      standing,
      clock: st.clock,
      freeRunBeat: st.freeRunBeat,
      provisional: st.clock.holdover,
      standsAsSink: !atemporal && birth.born && standing.rigid,
      atemporal,
    };
  };

  return {
    ingest(event: SinkEvent): void {
      // Fail-loud split (the QA ruling): THROW on non-finite agreement / value and empty-plane — coercing
      // NaN→0 would fabricate a false "maximal-disagreement" testimony into the baseline. KEEP the finite
      // [0,1] clamp for a defined-domain out-of-range agreement: 1.5 → 1 PROJECTS, it does not fabricate.
      if (!Number.isFinite(event.agreement)) throw new Error("sink: agreement must be finite");
      if (event.value !== undefined && !Number.isFinite(event.value)) {
        throw new Error("sink: value must be finite when provided");
      }
      if (typeof event.plane !== "string" || event.plane.trim() === "") {
        throw new Error("sink: plane must be a non-empty string");
      }
      const a = Math.max(0, Math.min(1, event.agreement));
      agreeTrail.push(a);
      valueTrail.push(event.value ?? null);
      const series = perPlane.get(event.plane);
      if (series) series.push(a);
      else perPlane.set(event.plane, [a]);
    },
    support: () => agreeTrail.length,
    planeSignals,
    rhythm: () => deriveRhythm(),
    rhythmByPlane: () => deriveRhythmByPlane(),
    supersaturation: () => snapshot().supersaturation,
    verdict,
  };
}
