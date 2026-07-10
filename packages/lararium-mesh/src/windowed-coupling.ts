/**
 * windowed-coupling — the streaming coupling RUNTIME, built to the full windowing policy
 * (no easy fixed-window shortcut, because the shortcut becomes what the system does):
 *
 *   · L = window length ≈ 15-20 · d_joint (windowLengthFor) — the estimator floor; below it the
 *     Gaussian-CMI biases TOWARD ZERO (a silent false-sovereign), so we never emit under it.
 *   · a per-child RING (bounded to L), ordered by append — the coupler OWNS its window (the
 *     Substrate verdict), never round-tripping a similarity store for the hot read. The caller
 *     pushes ALIGNED ticks (one vector per child at a shared grain — the worldline aligns upstream).
 *   · WARMING below `floor` — emit no coupling while the window is under-powered (a "warming" flag,
 *     not a biased number).
 *   · CHANGE-POINT RESET — on a detected regime shift (detectShift), flush and re-accumulate so
 *     each estimate lives inside ONE regime (local stationarity made true), warming until refilled.
 *   · HOP — recompute every `hop` ticks (decouple update cadence from the long window).
 *
 * State is explicit + immutable (the caller owns persistence); each push returns the next state
 * and a CoupleTick. Platform-blind: composes ./mesh-couple + ./change-point. Meme: lar:///ha.ka.ba/@lararium/mesh/flow
 */

import { coupleMesh } from "./mesh-couple.js";
import { type ChildSignalMV } from "./mesh-coupling-mv.js";
import { detectShift } from "./change-point.js";
import { type MeshCoupling } from "./mesh-coupling.js";

/** L = k · d_joint (k ∈ [15,20]; 15 default). The estimator floor for Gaussian conditional-TE. */
export function windowLengthFor(dJoint: number, k = 15): number {
  return Math.max(2, Math.ceil(k * dJoint));
}

export interface WindowConfig {
  /** Ring cap = the estimation window length (≈ windowLengthFor(d_joint)). */
  readonly L: number;
  /** Minimum filled samples before ANY coupling is emitted (default L — the conservative floor). */
  readonly floor?: number;
  /** Emit cadence in ticks (default 1). */
  readonly hop?: number;
  /** Minimum filled before change-point detection runs (default 20). */
  readonly detectMin?: number;
  /** Change-point sensitivity (default 3). */
  readonly changeThreshold?: number;
  readonly mergeThreshold?: number;
  readonly lag?: number;
  readonly alpha?: number;
}

export interface WindowState {
  readonly children: readonly string[];
  readonly bufs: readonly (readonly (readonly number[])[])[];   // per-child ring of frame-vectors
  readonly sinceEmit: number;
}

export interface CoupleTick {
  /** window under-filled (or just reset) → the coupling is not trustworthy; none emitted. */
  readonly warming: boolean;
  readonly filled: number;
  /** a change-point fired this tick and the window was flushed. */
  readonly reset: boolean;
  /** the significance-clean coupling over the current window, or null while warming/between hops. */
  readonly coupling: MeshCoupling | null;
}

/** A fresh window state for the named children. */
export function windowInit(children: readonly string[]): WindowState {
  return { children: [...children], bufs: children.map(() => []), sinceEmit: 0 };
}

/**
 * Push one ALIGNED tick — `tick[i]` is child i's vector at this shared-grain instant. Returns the
 * next state and a CoupleTick (warming / reset / coupling). The caller aligns cross-child upstream
 * (the worldline's FFZ rhythmic address); this runtime owns order, window, reset and cadence.
 */
export function windowPush(
  state: WindowState, tick: readonly (readonly number[])[], config: WindowConfig,
): { state: WindowState; out: CoupleTick } {
  const L = config.L;
  const floor = config.floor ?? L;
  const hop = config.hop ?? 1;
  const detectMin = config.detectMin ?? 20;
  const changeThreshold = config.changeThreshold ?? 3;

  let bufs: number[][][] = state.bufs.map((b, i) => {
    const nb = [...b.map((r) => [...r]), [...(tick[i] ?? [])]];
    return nb.length > L ? nb.slice(nb.length - L) : nb;
  });
  let filled = bufs[0]?.length ?? 0;
  let reset = false;

  if (filled >= detectMin) {
    const half = Math.floor(filled / 2);
    for (let i = 0; i < bufs.length; i++) {
      if (detectShift(bufs[i]!.slice(0, half), bufs[i]!.slice(half), changeThreshold).shifted) { reset = true; break; }
    }
    if (reset) {
      bufs = bufs.map((_, i) => [[...(tick[i] ?? [])]]);   // flush, keep only the newest tick
      filled = 1;
    }
  }

  let sinceEmit = state.sinceEmit + 1;
  const warming = filled < floor;
  let coupling: MeshCoupling | null = null;
  if (!warming && sinceEmit >= hop) {
    const children: ChildSignalMV[] = state.children.map((name, i) => ({ name, signal: bufs[i]! }));
    coupling = coupleMesh(children, {
      ...(config.mergeThreshold !== undefined ? { mergeThreshold: config.mergeThreshold } : {}),
      ...(config.lag !== undefined ? { lag: config.lag } : {}),
      ...(config.alpha !== undefined ? { alpha: config.alpha } : {}),
    });
    sinceEmit = 0;
  }

  return { state: { children: state.children, bufs, sinceEmit }, out: { warming, filled, reset, coupling } };
}
