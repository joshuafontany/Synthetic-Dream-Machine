/**
 * sink — the feed-it-emerges Sink accumulator composes birth ⊕ standing ⊕ clock over ONE fed event-log, the
 * beat recovered ONCE and driving the rest. Witnesses: a genuinely periodic AGREEMENT stream stands (no
 * hand-fed value); a constant feed never stands (holdover, provisional); the fail-loud split (NaN throws,
 * 1.5 clamps, empty plane throws); lockstep planes collapse to ~1 effective plane; the recent window tracks
 * the recovered beat; an atemporal corpus feed holds over; and extreme finite amplitudes stay finite.
 */
import { describe, expect, test } from "vitest";

import { makeSink, SUPERSATURATION_CAP } from "../src/sink.js";

describe("makeSink (feed-it-emerges: birth ⊕ standing ⊕ clock)", () => {
  test("a genuinely periodic AGREEMENT stream STANDS (no hand-fed value; born + rigid + beat emerges)", () => {
    const s = makeSink();
    for (let i = 0; i < 200; i++) {
      s.ingest({ plane: i % 2 === 0 ? "content" : "structure", agreement: 0.5 + 0.4 * Math.sin((2 * Math.PI * i) / 8) });
    }
    const v = s.verdict();
    expect(v.support).toBe(200);
    expect(v.planeSignals.length).toBe(2);
    expect(v.birth.born).toBe(true); // 2 planes → cross-plane drive → nucleates
    expect(v.standing.rigid).toBe(true); // the first-difference rhythm re-locks
    expect(v.clock.locked).toBe(true);
    expect(Math.abs(v.clock.beat - 8)).toBeLessThanOrEqual(1); // the beat EMERGED from the agreement rhythm
    expect(v.standsAsSink).toBe(true);
    expect(v.provisional).toBe(false);
  });

  test("a single-plane stream never nucleates (the frequency trap stays blocked through the Sink)", () => {
    const s = makeSink();
    for (let i = 0; i < 160; i++) s.ingest({ plane: "only-one", agreement: 0.9, value: Math.sin((2 * Math.PI * i) / 8) });
    const v = s.verdict();
    expect(v.birth.born).toBe(false);
    expect(v.standsAsSink).toBe(false);
  });

  test("a constant-agreement 2-plane feed does NOT stand (holdover → provisional, no rhythm to lock)", () => {
    const s = makeSink();
    for (let i = 0; i < 80; i++) s.ingest({ plane: i % 2 === 0 ? "a" : "b", agreement: 0.8 });
    const v = s.verdict();
    expect(v.clock.holdover).toBe(true);
    expect(v.provisional).toBe(true);
    expect(v.standing.rigid).toBe(false);
    expect(v.standsAsSink).toBe(false);
  });

  test("supersaturation SELF-CALIBRATES: a burst reads >1, a lull reads <1 (no chosen constant)", () => {
    const burst = makeSink();
    for (let i = 0; i < 24; i++) burst.ingest({ plane: "content", agreement: 0.15 }); // dilute baseline
    for (let i = 0; i < 8; i++) burst.ingest({ plane: "content", agreement: 0.95 }); // a burst
    expect(burst.supersaturation()).toBeGreaterThan(1);

    const lull = makeSink();
    for (let i = 0; i < 24; i++) lull.ingest({ plane: "content", agreement: 0.95 }); // rich baseline
    for (let i = 0; i < 8; i++) lull.ingest({ plane: "content", agreement: 0.1 }); // a lull
    expect(lull.supersaturation()).toBeLessThan(1);
  });

  test("a cold-start spike stays within the CAP and is NOT born (warmup is birth-ineligible)", () => {
    const s = makeSink();
    s.ingest({ plane: "content", agreement: 0.05 });
    s.ingest({ plane: "structure", agreement: 0.05 });
    s.ingest({ plane: "content", agreement: 0.98 }); // a spike, still in warmup (< holdover window)
    const v = s.verdict();
    expect(v.supersaturation).toBeLessThanOrEqual(SUPERSATURATION_CAP);
    expect(s.supersaturation()).toBeLessThanOrEqual(SUPERSATURATION_CAP);
    expect(v.birth.born).toBe(false);
    expect(v.standsAsSink).toBe(false);
  });

  test("an unfed / freshly-stood Sink reads equilibrium (supersaturation 1) and does not nucleate", () => {
    const s = makeSink();
    expect(s.supersaturation()).toBe(1);
    expect(s.verdict().birth.born).toBe(false);
  });

  test("fail-loud split: NaN agreement THROWS, out-of-range agreement CLAMPS, empty plane THROWS", () => {
    const s = makeSink();
    expect(() => s.ingest({ plane: "a", agreement: NaN })).toThrow(/agreement/);
    expect(() => s.ingest({ plane: "a", agreement: 0.5, value: NaN })).toThrow(/value/);
    expect(() => s.ingest({ plane: "", agreement: 0.5 })).toThrow(/plane/);
    expect(() => s.ingest({ plane: "   ", agreement: 0.5 })).toThrow(/plane/);
    // a finite out-of-range agreement PROJECTS into [0,1] (1.5 → 1) — a defined-domain clamp, not fabrication:
    s.ingest({ plane: "a", agreement: 1.5 });
    expect(s.planeSignals()[0]!.agreement).toBe(1);
  });

  test("lockstep planes collapse to ~1 effective plane → zero drive, not born", () => {
    const s = makeSink();
    for (let i = 0; i < 80; i++) {
      const a = 0.5 + 0.4 * Math.sin((2 * Math.PI * i) / 8);
      s.ingest({ plane: "a", agreement: a });
      s.ingest({ plane: "b", agreement: a }); // identical varying series → echoed
    }
    const v = s.verdict();
    expect(v.birth.effectivePlanes).toBeCloseTo(1, 1);
    expect(v.birth.born).toBe(false);
    expect(v.standsAsSink).toBe(false);
  });

  test("the recovered recent-window TRACKS the beat (period-8 vs period-16)", () => {
    const feed = (period: number) => {
      const s = makeSink();
      for (let i = 0; i < 240; i++) {
        s.ingest({ plane: i % 2 === 0 ? "content" : "structure", agreement: 0.5 + 0.4 * Math.sin((2 * Math.PI * i) / period) });
      }
      return s.verdict();
    };
    const v8 = feed(8);
    const v16 = feed(16);
    expect(Math.abs(v8.recentWindow - 8)).toBeLessThanOrEqual(2);
    expect(Math.abs(v16.recentWindow - 16)).toBeLessThanOrEqual(2);
    expect(v16.recentWindow).toBeGreaterThan(v8.recentWindow);
  });

  test("an ATEMPORAL corpus feed holds over and never stands (read-order fabricates no beat)", () => {
    const s = makeSink({ atemporal: true });
    for (let i = 0; i < 200; i++) {
      s.ingest({ plane: i % 2 === 0 ? "content" : "structure", agreement: 0.5 + 0.4 * Math.sin((2 * Math.PI * i) / 8) });
    }
    const v = s.verdict();
    expect(v.clock.holdover).toBe(true);
    expect(v.provisional).toBe(true);
    expect(v.standsAsSink).toBe(false);
    expect(s.rhythm().length).toBe(0); // the first-difference rhythm stays suppressed
  });

  test("born is monotone-honest: a 2-plane @0.8 feed nucleates by ~event 3 (r* ≈ 2.5)", () => {
    // NOTE (honest): born reduces to "≥2 independent planes + agreement" until γ calibration + support-decay
    // land — so a modest cross-plane feed crosses the critical radius early.
    const s = makeSink();
    s.ingest({ plane: "a", agreement: 0.8 });
    s.ingest({ plane: "b", agreement: 0.8 });
    s.ingest({ plane: "a", agreement: 0.8 });
    const v = s.verdict();
    expect(v.birth.criticalRadius).toBeCloseTo(2.5, 6);
    expect(v.birth.born).toBe(true);
  });

  test("extreme finite amplitudes (±1e200) read a real rhythm — finite standing + clock (no NaN overflow)", () => {
    const s = makeSink();
    for (let i = 0; i < 200; i++) {
      s.ingest({ plane: i % 2 === 0 ? "content" : "structure", agreement: 0.8, value: 1e200 * Math.sin((2 * Math.PI * i) / 8) });
    }
    const v = s.verdict();
    expect(Number.isFinite(v.standing.standing)).toBe(true);
    expect(Number.isFinite(v.clock.lockQuality)).toBe(true);
    expect(Number.isFinite(v.clock.beat)).toBe(true);
    expect(Number.isFinite(v.supersaturation)).toBe(true);
  });
});
