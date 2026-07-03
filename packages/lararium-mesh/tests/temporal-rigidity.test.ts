/**
 * temporal-rigidity — standing = does a sink's rhythm RE-LOCK after a perturbation (the time-crystal
 * transfer). A periodic rhythm is RIGID (locks + re-locks past a gap); white noise is not (no lock);
 * a drifting/chirp rhythm locks locally but fails to re-lock (not rigid).
 */
import { describe, expect, test } from "vitest";

import { temporalRigidity } from "../src/temporal-rigidity.js";

/** A clean periodic rhythm (period p) over n samples. */
const periodic = (n: number, p: number): number[] =>
  Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * i) / p));

/** Deterministic pseudo-noise (no periodicity) — fractional chaos, no Math.random. */
const noise = (n: number): number[] =>
  Array.from({ length: n }, (_, i) => {
    const x = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  });

/** A chirp: the period DRIFTS across the signal (locks locally, never globally). */
const chirp = (n: number): number[] =>
  Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * i * (1 + i / n)) / 8));

describe("temporal-rigidity (standing = re-locks after perturbation)", () => {
  test("a clean periodic rhythm is RIGID (locks + re-locks past a gap)", () => {
    const v = temporalRigidity({ signal: periodic(128, 8) });
    expect(v.period).toBeGreaterThan(0);
    expect(v.lockQuality).toBeGreaterThan(0.5);
    expect(v.recovery).toBeGreaterThan(0.5);
    expect(v.rigid).toBe(true);
    expect(Math.abs(v.period - 8)).toBeLessThanOrEqual(1); // finds ~the true period
  });

  test("white noise is NOT rigid (no lock)", () => {
    const v = temporalRigidity({ signal: noise(128) });
    expect(v.lockQuality).toBeLessThan(0.5);
    expect(v.rigid).toBe(false);
  });

  test("a drifting chirp locks but does NOT stay rigid (period unstable under the kick)", () => {
    const v = temporalRigidity({ signal: chirp(128) });
    // it may show a local lock, but rigidity (lock AND recovery) must not hold as for a clean rhythm
    expect(v.rigid).toBe(false);
  });

  test("a flat / too-short signal is not rigid (no rhythm)", () => {
    expect(temporalRigidity({ signal: [1, 1, 1, 1, 1, 1, 1, 1] }).rigid).toBe(false);
    expect(temporalRigidity({ signal: [1, 2] }).rigid).toBe(false);
  });
});
