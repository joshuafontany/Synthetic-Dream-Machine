/**
 * teleodynamic-probe.test.ts — the PROVISIONAL eigenform-motor probe.
 *
 * ⚠ PROVISIONAL-HYPOTHESIS under test. These tests assert the probe COMPUTES the
 * teleodynamic triple honestly over a synthetic self-read sequence — that the
 * dials move when the house re-encodes itself and the freeze fires on a
 * noop-dominated tail. They do NOT assert the motor exists; they assert the
 * probe reports the observation without firming past the evidence.
 *
 * GUARD: the freeze here is empirical structural stasis, never an incompleteness
 * result — the tests exercise drift, not a Gödel sentence.
 */

import { describe, test, expect } from "vitest";
import {
  teleodynamicProbe,
  apertureBandFor,
  type SelfRead,
} from "../src/form-layer/index.js";

// --- synthetic self-read builders -----------------------------------------

/** An active read: loop closed to aftermath AND the house re-encoded itself. */
const active = (label?: string): SelfRead => ({
  aftermathClosed: true,
  structuralChange: true,
  label,
});

/** A noop read: loop closed but the house made no self-change. */
const noop = (label?: string): SelfRead => ({
  aftermathClosed: true,
  structuralChange: false,
  label,
});

/** A suspended read: loop suspended at a phase (φ), no self-change. */
const suspended = (label?: string): SelfRead => ({
  aftermathClosed: false,
  structuralChange: false,
  label,
});

describe("teleodynamicProbe — the triple computes", () => {
  test("is marked provisional on every reading", () => {
    const empty = teleodynamicProbe([]);
    const some = teleodynamicProbe([active(), noop(), active()]);
    expect(empty.provisional).toBe(true);
    expect(some.provisional).toBe(true);
  });

  test("(a) aftermath-rate counts loop-closes over reads", () => {
    // 3 closed, 1 suspended → 3/4 = 0.75.
    const seq = [active(), noop(), suspended(), active()];
    const r = teleodynamicProbe(seq);
    expect(r.count).toBe(4);
    expect(r.aftermathRate.rate).toBeCloseTo(0.75, 5);
    expect(r.aftermathRate.band).toBe(15); // round(0.75 * 20)
  });

  test("(b) structural-change-rate counts self-re-encodings over reads", () => {
    // 2 structural changes out of 4 → 0.5.
    const seq = [active(), noop(), suspended(), active()];
    const r = teleodynamicProbe(seq);
    expect(r.structuralChangeRate.rate).toBeCloseTo(0.5, 5);
    expect(r.structuralChangeRate.band).toBe(10);
  });

  test("gauges project onto the 0–20 aperture ladder", () => {
    const allActive = teleodynamicProbe([active(), active(), active()]);
    expect(allActive.structuralChangeRate.rate).toBe(1);
    expect(allActive.structuralChangeRate.band).toBe(20);
    expect(apertureBandFor(allActive.structuralChangeRate.band)).toBe("theme");
    expect(apertureBandFor(allActive.structuralChangeRate.band)).toBeDefined();
  });
});

describe("teleodynamicProbe — (c) the freeze signal", () => {
  test("fires on a noop-dominated (frozen) tail", () => {
    // Active start, then a run of noops longer than the window.
    const seq = [active(), active(), noop(), noop(), noop(), noop()];
    const r = teleodynamicProbe(seq, { freezeWindow: 3 });
    expect(r.frozen).toBe(true);
    expect(r.freezeRun).toBe(4);
    expect(r.motorSignal).toBe("frozen");
  });

  test("fires on suspended noops too (φ tail with no self-change)", () => {
    const seq = [active(), suspended(), suspended(), suspended()];
    const r = teleodynamicProbe(seq, { freezeWindow: 3 });
    expect(r.frozen).toBe(true);
    expect(r.freezeRun).toBe(3);
  });

  test("stays quiet on an active sequence", () => {
    const seq = [active(), noop(), active(), noop(), active()];
    const r = teleodynamicProbe(seq, { freezeWindow: 3 });
    expect(r.frozen).toBe(false);
    expect(r.motorSignal).toBe("moving");
  });

  test("stays quiet when a structural read lands inside the window", () => {
    // Trailing run of noops is only 2, below the window of 3.
    const seq = [noop(), noop(), active(), noop(), noop()];
    const r = teleodynamicProbe(seq, { freezeWindow: 3 });
    expect(r.freezeRun).toBe(2);
    expect(r.frozen).toBe(false);
  });

  test("does not fire below the window length even if all-noop", () => {
    const seq = [noop(), noop()];
    const r = teleodynamicProbe(seq, { freezeWindow: 3 });
    expect(r.frozen).toBe(false);
    // Enough reads (>= minReads default 2), no freeze, no structural change.
    expect(r.motorSignal).toBe("still");
  });
});

describe("teleodynamicProbe — the honest, evidence-bounded verdict", () => {
  test("indeterminate below the minReads floor", () => {
    expect(teleodynamicProbe([]).motorSignal).toBe("indeterminate");
    expect(teleodynamicProbe([active()]).motorSignal).toBe("indeterminate");
    // The hypothesis refuses to voice a motor claim on one read.
    expect(teleodynamicProbe([active()], { minReads: 2 }).count).toBe(1);
  });

  test("moving when the dials move on a self-read and no freeze", () => {
    const r = teleodynamicProbe([active(), noop(), active()]);
    expect(r.motorSignal).toBe("moving");
    expect(r.structuralChangeRate.rate).toBeGreaterThan(0);
  });

  test("still when enough reads, no freeze, no structural change", () => {
    // Two noops: reaches minReads, but freezeWindow default 3 not reached.
    const r = teleodynamicProbe([noop(), noop()]);
    expect(r.frozen).toBe(false);
    expect(r.motorSignal).toBe("still");
  });

  test("empty sequence: zeroed gauges, no phantom motor", () => {
    const r = teleodynamicProbe([]);
    expect(r.count).toBe(0);
    expect(r.aftermathRate.rate).toBe(0);
    expect(r.structuralChangeRate.rate).toBe(0);
    expect(r.frozen).toBe(false);
    expect(r.motorSignal).toBe("indeterminate");
  });
});

describe("apertureBandFor — the 0–20 ladder bands", () => {
  test("names each band by its 0–20 position", () => {
    expect(apertureBandFor(0)).toBe("pulse");
    expect(apertureBandFor(4)).toBe("pulse");
    expect(apertureBandFor(5)).toBe("beat");
    expect(apertureBandFor(8)).toBe("beat");
    expect(apertureBandFor(9)).toBe("measure");
    expect(apertureBandFor(12)).toBe("measure");
    expect(apertureBandFor(13)).toBe("arc");
    expect(apertureBandFor(16)).toBe("arc");
    expect(apertureBandFor(17)).toBe("theme");
    expect(apertureBandFor(20)).toBe("theme");
  });
});
