/**
 * sink — the feed-it-emerges Sink accumulator composes birth ⊕ standing ⊕ clock over ONE fed event-log,
 * with supersaturation self-calibrated from a learned baseline. Witnesses: a periodic 2-plane stream
 * stands as a sink (born + rigid + bands emerge); a single-plane stream never nucleates (frequency trap);
 * supersaturation rises on a burst, falls on a lull (no chosen constant — the data sets it).
 */
import { describe, expect, test } from "vitest";

import { makeSink } from "../src/sink.js";

describe("makeSink (feed-it-emerges: birth ⊕ standing ⊕ clock)", () => {
  test("a periodic 2-plane stream STANDS as a sink (born + rigid + bands emerge)", () => {
    const s = makeSink();
    for (let i = 0; i < 160; i++) {
      s.ingest({ plane: i % 2 === 0 ? "content" : "structure", agreement: 0.8, value: Math.sin((2 * Math.PI * i) / 8) });
    }
    const v = s.verdict();
    expect(v.support).toBe(160);
    expect(v.planeSignals.length).toBe(2);
    expect(v.birth.born).toBe(true);              // 2 planes → cross-plane drive → nucleates
    expect(v.standing.rigid).toBe(true);          // the periodic rhythm re-locks
    expect(v.clock.locked).toBe(true);
    expect(Math.abs(v.clock.beat - 8)).toBeLessThanOrEqual(1); // the beat EMERGED from the feed
    expect(v.standsAsSink).toBe(true);
  });

  test("a single-plane stream never nucleates (the frequency trap stays blocked through the Sink)", () => {
    const s = makeSink();
    for (let i = 0; i < 160; i++) s.ingest({ plane: "only-one", agreement: 0.9, value: Math.sin((2 * Math.PI * i) / 8) });
    const v = s.verdict();
    expect(v.birth.born).toBe(false);
    expect(v.standsAsSink).toBe(false);
  });

  test("supersaturation SELF-CALIBRATES: a burst reads >1, a lull reads <1 (no chosen constant)", () => {
    const burst = makeSink();
    for (let i = 0; i < 24; i++) burst.ingest({ plane: "content", agreement: 0.15 }); // dilute baseline
    for (let i = 0; i < 8; i++) burst.ingest({ plane: "content", agreement: 0.95 });  // a burst
    expect(burst.supersaturation()).toBeGreaterThan(1);

    const lull = makeSink();
    for (let i = 0; i < 24; i++) lull.ingest({ plane: "content", agreement: 0.95 }); // rich baseline
    for (let i = 0; i < 8; i++) lull.ingest({ plane: "content", agreement: 0.1 });   // a lull
    expect(lull.supersaturation()).toBeLessThan(1);
  });

  test("an unfed / freshly-stood Sink reads equilibrium (supersaturation 1) and does not nucleate", () => {
    const s = makeSink();
    expect(s.supersaturation()).toBe(1);
    expect(s.verdict().birth.born).toBe(false);
  });
});
