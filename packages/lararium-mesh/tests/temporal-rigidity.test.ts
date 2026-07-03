/**
 * temporal-rigidity — standing = re-lock after perturbation, hardened per the QA swap-dialectic.
 * Witnesses: the local-maximum period detector (smooth rhythms find the TRUE period, not spurious lag-2),
 * period-INDEPENDENT rigidity (periods that don't divide the kick still pass — no divisor accident), the
 * continuous `standing` scalar, re-lock via tail re-detection (chirp fails), and fail-loud on garbage.
 */
import { describe, expect, test } from "vitest";

import { temporalRigidity } from "../src/temporal-rigidity.js";

const periodic = (n: number, p: number): number[] =>
  Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * i) / p));

const noise = (n: number): number[] =>
  Array.from({ length: n }, (_, i) => {
    const x = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  });

const chirp = (n: number): number[] =>
  Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * i * (1 + i / n)) / 8));

describe("temporal-rigidity (standing = re-locks after perturbation, hardened)", () => {
  test("clean periodic rhythms are RIGID — and NOT only when the period divides the kick", () => {
    for (const p of [8, 7, 13]) {
      const v = temporalRigidity({ signal: periodic(160, p) });
      expect(v.rigid).toBe(true);
      expect(Math.abs(v.period - p)).toBeLessThanOrEqual(1); // finds the true period
      expect(v.standing).toBeGreaterThan(0.25);
    }
  });

  test("the local-max detector finds the TRUE period of a smooth rhythm (not spurious lag-2)", () => {
    // period 40 over 400 samples (~10 cycles) — the D2 bug returned lag 2; the local-max detector must
    // find ~40, and with enough cycles it re-locks (a few-cycle signal would be legitimately borderline).
    const v = temporalRigidity({ signal: periodic(400, 40) });
    expect(v.period).toBeGreaterThan(30);   // ~40, NOT the global-argmax shoulder at lag 2
    expect(v.rigid).toBe(true);
  });

  test("white noise is NOT rigid (no lock → standing ~0)", () => {
    const v = temporalRigidity({ signal: noise(160) });
    expect(v.rigid).toBe(false);
    expect(v.standing).toBeLessThan(0.25);
  });

  test("a drifting chirp does NOT re-lock (tail period ≠ base period → recovery 0)", () => {
    const v = temporalRigidity({ signal: chirp(160) });
    expect(v.rigid).toBe(false);
  });

  test("standing = lockQuality × recovery (continuous order-parameter)", () => {
    const v = temporalRigidity({ signal: periodic(160, 8) });
    expect(v.standing).toBeCloseTo(v.lockQuality * v.recovery, 6);
  });

  test("fail loud on garbage; a short signal is not-rigid (not invalid)", () => {
    expect(temporalRigidity({ signal: [1, 2, NaN, 4, 5, 6, 7, 8] }).invalid).toBe(true);
    expect(temporalRigidity({ signal: [1, 2] }).invalid).toBe(false);
    expect(temporalRigidity({ signal: [1, 2] }).rigid).toBe(false);
    expect(temporalRigidity({ signal: [1, 1, 1, 1, 1, 1, 1, 1] }).rigid).toBe(false); // flat → no lock
  });
});
