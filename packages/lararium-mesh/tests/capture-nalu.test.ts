/**
 * capture-nalu — the forward-facing collect-then-flush mechanism: enqueue, the
 * backpressure gate (depth OR max-wait), gated tick-flush, re-queue on failure.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/api/capture-annotation-model#forward-facing-nalu
 */

import { describe, test, expect } from "vitest";
import { CaptureNalu, PONO_FLUSH_GATE } from "../src/index.js";
import type { CaptureRecord } from "../src/index.js";

const rec = (i: number): CaptureRecord => ({ content: `r${i}`, source_file: `nalu://x/${i}` });

/** A flush harness that records the batches it drained (parsed back from the NDJSON). */
function harness(opts: { fail?: boolean; gate?: typeof PONO_FLUSH_GATE; now?: number } = {}) {
  const drained: CaptureRecord[][] = [];
  let lastBatch: readonly CaptureRecord[] = [];
  const writeNdjson = async (records: readonly CaptureRecord[]) => {
    lastBatch = records;
    return "/tmp/fake.ndjson";
  };
  const run = async (_path: string) => {
    if (opts.fail) throw new Error("flush failed");
    drained.push([...lastBatch]);
    return lastBatch.length;
  };
  const nalu = new CaptureNalu(writeNdjson, run, opts.gate ?? PONO_FLUSH_GATE, opts.now ?? 0);
  return { nalu, drained };
}

describe("the backpressure gate — flush when depth OR max-wait crests", () => {
  test("below depth and within max-wait → no flush", async () => {
    const { nalu, drained } = harness({ now: 0 });
    for (let i = 0; i < 10; i++) nalu.enqueue(rec(i)); // < 32
    expect(await nalu.tick(1000)).toBe(0); // 1s < 2000ms
    expect(drained).toEqual([]);
    expect(nalu.depth()).toBe(10);
  });

  test("depth >= threshold crests immediately", async () => {
    const { nalu, drained } = harness({ now: 0 });
    for (let i = 0; i < 32; i++) nalu.enqueue(rec(i));
    expect(await nalu.tick(50)).toBe(32); // depth crest, well within max-wait
    expect(drained).toHaveLength(1);
    expect(drained[0]).toHaveLength(32);
    expect(nalu.depth()).toBe(0);
  });

  test("a shallow queue crests on max-wait", async () => {
    const { nalu, drained } = harness({ now: 0 });
    nalu.enqueue(rec(1));
    expect(await nalu.tick(1999)).toBe(0); // not yet
    expect(await nalu.tick(2000)).toBe(1); // max-wait crest
    expect(drained[0]).toHaveLength(1);
  });

  test("an empty queue never crests, even past max-wait", async () => {
    const { nalu } = harness({ now: 0 });
    expect(await nalu.tick(9999)).toBe(0);
  });
});

describe("durability — never drop", () => {
  test("a failed flush re-queues the batch ahead of new arrivals", async () => {
    const { nalu } = harness({ fail: true, now: 0 });
    for (let i = 0; i < 32; i++) nalu.enqueue(rec(i));
    await expect(nalu.tick(50)).rejects.toThrow("flush failed");
    expect(nalu.depth()).toBe(32); // re-queued, nothing lost
  });
});
