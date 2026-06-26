/**
 * gate-tuning — deriveGate (EBQ + Little's Law) and adaptGate (the homeostatic servo step):
 * the nalu gate constants derived/adapted, not guessed (capture keel #nalu-flush-hardening).
 */

import { describe, expect, test } from "vitest";

import { adaptGate, deriveGate, PONO_FLUSH_GATE } from "../src/index.js";

describe("deriveGate — EBQ + Little's Law", () => {
  test("depth = √(2·λ·S/H); maxWaitMs = the SLO; maxDepth = surge headroom", () => {
    // 2·0.01·500 / 0.001 = 10000 → √ = 100
    const g = deriveGate({
      flushCostMs: 500,
      holdingCostPerMs: 0.001,
      arrivalPerMs: 0.01,
      maxLatencyMs: 2000,
      burstFactor: 8,
    });
    expect(g.depth).toBe(100);
    expect(g.maxWaitMs).toBe(2000);
    expect(g.maxDepth).toBe(800);
    expect(g.maxRetries).toBe(PONO_FLUSH_GATE.maxRetries); // rest inherits the pono default
  });

  test("a tiny corpus floors depth at 1", () => {
    expect(deriveGate({ flushCostMs: 1, holdingCostPerMs: 1, arrivalPerMs: 0.0001 }).depth).toBe(1);
  });
});

describe("adaptGate — homeostatic servo toward a latency set-point", () => {
  test("too slow lowers depth; fast raises it; on-target holds", () => {
    const base = PONO_FLUSH_GATE; // depth 32
    expect(adaptGate(base, 4000, 2000).depth).toBe(24); // error +1 → clamp -0.25 → 32·0.75
    expect(adaptGate(base, 1000, 2000).depth).toBe(40); // error -0.5 → +0.25 (clamped) → 32·1.25
    expect(adaptGate(base, 2000, 2000).depth).toBe(32); // on target → unchanged
  });

  test("depth never drops below 1; a zero/neg target is a no-op", () => {
    expect(adaptGate({ ...PONO_FLUSH_GATE, depth: 1 }, 9999, 2000).depth).toBe(1);
    expect(adaptGate(PONO_FLUSH_GATE, 9999, 0)).toEqual(PONO_FLUSH_GATE);
  });
});
