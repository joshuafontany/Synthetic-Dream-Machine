/**
 * partition-monitor — sovereignty is measured, not declared. Two sensoria stay sovereign while
 * between-coupling stays below within; the alarm fires (and names the pair) when they merge.
 */
import { describe, test, expect } from "vitest";
import {
  partitionReading, partitionCouplings, closestToMerge,
} from "../src/index.js";

// Two sensoria: A = streams {0,1}, B = streams {2,3}.
const LABELS = ["A", "A", "B", "B"];
// Strong WITHIN cohesion (0↔1, 2↔3), weak BETWEEN → sovereign.
const SOVEREIGN = [
  [0.0, 0.9, 0.05, 0.04],
  [0.9, 0.0, 0.03, 0.05],
  [0.04, 0.05, 0.0, 0.9],
  [0.05, 0.03, 0.9, 0.0],
];
// The same, but 0↔2 coupling has climbed high → the senses are fusing.
const MERGING = [
  [0.0, 0.9, 0.85, 0.04],
  [0.9, 0.0, 0.03, 0.05],
  [0.85, 0.05, 0.0, 0.9],
  [0.05, 0.03, 0.9, 0.0],
];

describe("partition-monitor — measure the cut, don't declare it", () => {
  test("a SOVEREIGN partition: within cohesion high, between low → the cut holds", () => {
    const { within, between } = partitionCouplings(SOVEREIGN, LABELS);
    const r = partitionReading(within, between, 0.5);
    expect(within).toBeGreaterThan(0.8);
    expect(between).toBeLessThan(0.1);
    expect(r.ratio).toBeLessThan(0.5);
    expect(r.sovereign).toBe(true);
  });

  test("a MERGING partition: between-coupling climbs → the alarm fires (NOT sovereign)", () => {
    const { within, between } = partitionCouplings(MERGING, LABELS);
    const r = partitionReading(within, between, 0.5);
    expect(r.between).toBeGreaterThan(SOVEREIGN[0][2]);   // between rose
    expect(r.sovereign).toBe(false);                      // the cut no longer holds
  });

  test("partitionReading edge cases: zero-within-with-coupling = merged (Infinity); zero-both = 0", () => {
    expect(partitionReading(0, 0.3, 0.5).ratio).toBe(Infinity);
    expect(partitionReading(0, 0.3, 0.5).sovereign).toBe(false);
    expect(partitionReading(0, 0, 0.5).ratio).toBe(0);
    expect(partitionReading(0, 0, 0.5).sovereign).toBe(true);   // nothing coupling = trivially sovereign
  });

  test("closestToMerge NAMES the fusing pair (the actionable alarm)", () => {
    const alarm = closestToMerge(MERGING, LABELS);
    expect(alarm).not.toBeNull();
    expect([alarm!.a, alarm!.b].sort()).toEqual(["A", "B"]);
    expect(alarm!.coupling).toBeGreaterThan(0.4);        // the A↔B cross-flow that raised the alarm
  });

  test("closestToMerge is null with fewer than two sensoria", () => {
    expect(closestToMerge([[0]], ["A"])).toBeNull();
  });
});
