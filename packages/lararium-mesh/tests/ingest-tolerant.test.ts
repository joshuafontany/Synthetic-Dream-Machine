/**
 * CIV-1 — the torn-tolerant cap-event hydrate. A clean store ingests in ONE batch (fast path).
 * A torn cap-event, which downs the whole boot today, must instead degrade to a SKIPPED slice:
 * the fallback ingests every good record per-record and skips only the corrupt one.
 */
import { describe, test, expect, vi } from "vitest";

import { ingestTolerant } from "../src/ingest-tolerant.js";

const b = (n: number): Uint8Array => Uint8Array.from([n]);

describe("ingestTolerant", () => {
  test("clean store → ONE batch call, nothing skipped (fast path unchanged)", async () => {
    const ingest = vi.fn(async () => {});
    const r = await ingestTolerant([b(1), b(2), b(3)], ingest);
    expect(r).toEqual({ ingested: 3, skipped: 0 });
    expect(ingest).toHaveBeenCalledTimes(1);            // batched, not per-record
    expect(ingest.mock.calls[0]![0]).toHaveLength(3);
  });

  test("a torn record → batch throws → per-record fallback skips ONLY the torn one", async () => {
    // Batch throws (a torn record aborts keyhive's decode pre-pass); per-record, record #2 is torn.
    const ingest = vi.fn(async (batch: readonly Uint8Array[]) => {
      if (batch.length > 1) throw new Error("torn record in batch");
      if (batch[0]![0] === 2) throw new Error("corrupt deflate stream");
    });
    const r = await ingestTolerant([b(1), b(2), b(3)], ingest);
    expect(r).toEqual({ ingested: 2, skipped: 1 });     // #1 and #3 in, #2 skipped — boot survives
    expect(ingest).toHaveBeenCalledTimes(1 + 3);        // one failed batch, then three per-record
  });

  test("empty store → no ingest call", async () => {
    const ingest = vi.fn(async () => {});
    const r = await ingestTolerant([], ingest);
    expect(r).toEqual({ ingested: 0, skipped: 0 });
    expect(ingest).not.toHaveBeenCalled();
  });

  test("all records torn → all skipped, still never throws (boot survives)", async () => {
    const ingest = vi.fn(async () => { throw new Error("torn"); });
    const r = await ingestTolerant([b(1), b(2)], ingest);
    expect(r).toEqual({ ingested: 0, skipped: 2 });
  });
});
