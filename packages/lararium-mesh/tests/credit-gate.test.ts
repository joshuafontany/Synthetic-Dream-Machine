/**
 * credit-gate — two-sided backpressure: credits = maxInFlight − uncommitted; admit while > 0;
 * at 0 the shed engages (hard block, the Frank-Starling ceiling); reading surfaces the shed.
 */
import { describe, test, expect } from "vitest";
import { availableCredits, canAdmit, creditReading } from "../src/index.js";

describe("credit-gate — the two-sided law (downstream signal paces the producer)", () => {
  test("credits = maxInFlight − uncommitted, clamped at 0", () => {
    expect(availableCredits(8, 3)).toBe(5);
    expect(availableCredits(8, 8)).toBe(0);
    expect(availableCredits(8, 12)).toBe(0);   // overrun clamps, never negative
  });

  test("admit while credits > 0; shed (hard no) at zero", () => {
    expect(canAdmit(8, 7)).toBe(true);
    expect(canAdmit(8, 8)).toBe(false);         // the shed — reject, not slow
    expect(canAdmit(8, 20)).toBe(false);
  });

  test("the reading surfaces the shed + decompensation honestly", () => {
    const ok = creditReading(8, 2);
    expect(ok).toEqual({ maxInFlight: 8, uncommitted: 2, credits: 6, shedding: false, utilization: 0.25 });
    const shed = creditReading(8, 8);
    expect(shed.shedding).toBe(true);
    expect(shed.credits).toBe(0);
    const overrun = creditReading(8, 10);
    expect(overrun.shedding).toBe(true);
    expect(overrun.utilization).toBeGreaterThan(1); // backlog overran the ceiling — the warning
  });

  test("a shrinking backlog RETURNS credits (the committer draining = the upstream signal)", () => {
    // simulate the drain committing: uncommitted falls, credits rise — the receiver pacing the sender
    expect(availableCredits(8, 8)).toBe(0);     // full → shed
    expect(availableCredits(8, 5)).toBe(3);     // 3 committed → 3 credits returned
    expect(availableCredits(8, 0)).toBe(8);     // fully drained → full credits
  });
});
