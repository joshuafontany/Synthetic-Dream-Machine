/**
 * capture-nalu — the hardened collect-then-flush mechanism: the gate (depth OR max-wait),
 * the ceiling + spill-to-reserve, exponential backoff, retry-cap → dead-letter, and the
 * RRP<-reserve refill. Grounded by the four-domain survey (capture keel #nalu-flush-hardening).
 */

import { describe, expect, test } from "vitest";

import { CaptureNalu } from "../src/index.js";
import type { CaptureRecord, CaptureSinks, FlushGate } from "../src/index.js";

const GATE: FlushGate = {
  depth: 3,
  maxWaitMs: 2000,
  maxDepth: 5,
  maxRetries: 2,
  backoffBaseMs: 100,
  backoffMaxMs: 1000,
};

const rec = (i: number): CaptureRecord => ({ content: `r${i}`, source_file: `nalu://x/${i}` });

function harness(opts: { failTimes?: number; gate?: FlushGate; now?: number } = {}) {
  let runCalls = 0;
  const drained: CaptureRecord[][] = [];
  const overflow: CaptureRecord[] = [];
  const deadLettered: CaptureRecord[] = [];
  const reserve: CaptureRecord[] = [];
  const sinks: CaptureSinks = {
    flush: async (batch) => {
      runCalls++;
      if (opts.failTimes && runCalls <= opts.failTimes) throw new Error("flush failed");
      drained.push([...batch]);
      return batch.length;
    },
    onOverflow: (recs) => {
      overflow.push(...recs);
      reserve.push(...recs);
    },
    onDeadLetter: (recs) => deadLettered.push(...recs),
    refill: (room) => reserve.splice(0, room), // mutate in place — keep the array ref live
    rng: () => 1, // deterministic full backoff
  };
  const nalu = new CaptureNalu(sinks, opts.gate ?? GATE, opts.now ?? 0);
  return {
    nalu,
    drained,
    overflow,
    deadLettered,
    get reserve() {
      return reserve;
    },
  };
}

describe("the gate — flush when depth OR max-wait crests", () => {
  test("below depth and within max-wait → no flush", async () => {
    const { nalu, drained } = harness();
    nalu.enqueue(rec(1));
    nalu.enqueue(rec(2));
    expect(await nalu.tick(1000)).toBe(0);
    expect(drained).toEqual([]);
  });

  test("depth crest flushes; a shallow queue crests on max-wait; empty never crests", async () => {
    const a = harness();
    for (let i = 0; i < 3; i++) a.nalu.enqueue(rec(i));
    expect(await a.nalu.tick(50)).toBe(3);
    expect(a.nalu.depth()).toBe(0);

    const b = harness();
    b.nalu.enqueue(rec(1));
    expect(await b.nalu.tick(1999)).toBe(0);
    expect(await b.nalu.tick(2000)).toBe(1);

    const c = harness();
    expect(await c.nalu.tick(9999)).toBe(0);
  });
});

describe("the ceiling — bounded hot pool + spill-to-reserve (4-domain)", () => {
  test("enqueue past maxDepth spills the overflow, never grows the pool", () => {
    const { nalu, overflow } = harness();
    for (let i = 0; i < 7; i++) nalu.enqueue(rec(i)); // maxDepth 5
    expect(nalu.depth()).toBe(5);
    expect(overflow).toHaveLength(2);
    expect(nalu.stats().spilled).toBe(0); // routed to onOverflow, not dropped
  });
});

describe("failure — backoff, FIFO re-queue, retry-cap → dead-letter", () => {
  test("a transient failure re-queues with backoff, then recovers", async () => {
    const { nalu, drained } = harness({ failTimes: 1 });
    for (let i = 0; i < 3; i++) nalu.enqueue(rec(i));
    await expect(nalu.tick(0)).rejects.toThrow("flush failed");
    expect(nalu.depth()).toBe(3); // re-queued, nothing lost
    expect(await nalu.tick(50)).toBe(0); // in backoff (until 100)
    expect(await nalu.tick(100)).toBe(3); // backoff elapsed → recovers
    expect(drained).toHaveLength(1);
  });

  test("a batch failing past maxRetries is dead-lettered (durable), unblocking the writer", async () => {
    const { nalu, deadLettered } = harness({ failTimes: 99 });
    for (let i = 0; i < 3; i++) nalu.enqueue(rec(i));
    await expect(nalu.tick(0)).rejects.toThrow(); // failures 1
    await expect(nalu.tick(100)).rejects.toThrow(); // failures 2
    await expect(nalu.tick(300)).rejects.toThrow(); // failures 3 > maxRetries 2 → dead-letter
    expect(deadLettered).toHaveLength(3);
    expect(nalu.depth()).toBe(0); // poison batch out of the hot path
  });
});

describe("two-tier RRP <- reserve refill", () => {
  test("after a drain, the hot pool refills from the reserve", async () => {
    const { nalu, reserve } = harness();
    for (let i = 0; i < 6; i++) nalu.enqueue(rec(i)); // 5 in pool, 1 spilled to reserve
    expect(reserve).toHaveLength(1);
    expect(await nalu.tick(50)).toBe(5); // drain the 5
    expect(nalu.depth()).toBe(1); // the reserved record refilled the pool
    expect(reserve).toHaveLength(0);
  });
});

describe("setGate — the servo's efferent step (the breathing threshold)", () => {
  test("a lowered depth makes a sub-threshold pool crest on the next tick", async () => {
    const { nalu, drained } = harness(); // GATE.depth = 3
    nalu.enqueue(rec(1));
    nalu.enqueue(rec(2));
    expect(await nalu.tick(50)).toBe(0); // 2 < depth 3, within max-wait → no flush
    nalu.setGate({ ...GATE, depth: 2 }); // the servo lowers the threshold
    expect(await nalu.tick(60)).toBe(2); // 2 >= depth 2 → crests now
    expect(drained[0]).toHaveLength(2);
  });
});
