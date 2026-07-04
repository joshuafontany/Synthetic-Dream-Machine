/**
 * synthetic-drift — a deterministic, seeded frame-stream producer with KNOWN regimes: the SENSE keel's
 * proving ground (and, later, the frame-source cap's synthetic mode). It emits n-vector frames drawn from a
 * scheduled sequence of regime CENTERS + gaussian noise, so a witness holds the ground truth — where the
 * regime shifts, where it stays stationary — and asserts Claim-B against it (the frozen anchor's residual
 * STAYS HIGH under a persistent shift while the live tracker's innovation COLLAPSES).
 *
 * No-global-now: a LOCAL mulberry32 seed (reusing null-harness.makeRng) drives it — reproducible, no
 * wall-clock, no Math.random. Frames ride plain row-major arrays (number[] per frame) matching
 * projectBoundary / track. Meme: lar:///ha.ka.ba/@lares/api/pono/mesh/flow
 */
import { makeRng } from "./null-harness.js";

/** A regime: the mode-center active FROM frame index `from` (inclusive) until a later regime supersedes it. */
export interface DriftRegime {
  readonly from: number;
  readonly center: readonly number[];
}

export interface DriftOpts {
  /** Total frames to emit. */
  readonly length: number;
  /** Regimes, each a center active from its `from` index; the earliest-active regime seeds frame 0. */
  readonly regimes: readonly DriftRegime[];
  /** Gaussian noise scale per component (default 0.04 — exercises the tracker, small vs the unit mode). */
  readonly noise?: number;
  /** Local mulberry32 seed — no-global-now determinism. Default 1. */
  readonly seed?: number;
}

/** Box-Muller standard normal drawn from a uniform PRNG. */
function gaussianOf(u: () => number): () => number {
  return () => Math.sqrt(-2 * Math.log(Math.max(u(), 1e-12))) * Math.cos(2 * Math.PI * u());
}

/** The regime center active at frame t = the latest regime whose `from` ≤ t (regimes need not arrive sorted). */
function centerAt(regimes: readonly DriftRegime[], t: number): readonly number[] {
  let best: DriftRegime | undefined;
  for (const r of regimes) {
    if (r.from <= t && (best === undefined || r.from > best.from)) best = r;
  }
  return best?.center ?? regimes[0]?.center ?? [];
}

/**
 * Emit a deterministic seeded frame stream: each frame = the regime center active at its index + gaussian
 * noise. The KNOWN schedule (which regime where) IS the ground truth a witness asserts against.
 */
export function driftStream(opts: DriftOpts): number[][] {
  const noise = opts.noise ?? 0.04;
  const g = gaussianOf(makeRng(opts.seed ?? 1));
  const frames: number[][] = [];
  for (let t = 0; t < opts.length; t++) {
    const center = centerAt(opts.regimes, t);
    frames.push(center.map((v) => v + noise * g()));
  }
  return frames;
}

/**
 * The canonical Claim-B schedule: a stationary REFERENCE regime (centerA) over [0, shiftAt), then a PERSISTENT
 * shift to centerB over [shiftAt, length). A frozen anchor built on centerA's regime cannot span centerB, so
 * its residual stays high past the shift — while a live tracker entrains onto centerB.
 */
export function regimeShiftStream(
  centerA: readonly number[],
  centerB: readonly number[],
  shiftAt: number,
  length: number,
  opts: { noise?: number; seed?: number } = {},
): number[][] {
  return driftStream({
    length,
    regimes: [{ from: 0, center: centerA }, { from: shiftAt, center: centerB }],
    ...(opts.noise !== undefined ? { noise: opts.noise } : {}),
    ...(opts.seed !== undefined ? { seed: opts.seed } : {}),
  });
}
