/**
 * parallel-ingest — the single-writer split: embeds fan out (parallel), commits funnel through ONE
 * serial writer; trailing-watermark tracks landings; bounded by the dial; fails loud with no orphans.
 */
import { describe, test, expect, vi } from "vitest";
import { runParallelIngest, makeDial, type IngestItem } from "../src/index.js";

const items = (n: number): IngestItem<number>[] =>
  Array.from({ length: n }, (_, i) => ({ seq: i + 1, key: `k${i + 1}`, payload: i + 1 }));

/** A fake clock that ticks 1 per read — deterministic latency for the dial. */
function fakeClock(): () => number { let t = 0; return () => ++t; }

describe("parallel-ingest — single-writer split", () => {
  test("all items land; watermark = N; no backlog", async () => {
    const r = await runParallelIngest(items(20), {
      embed: async (it) => it.payload * 10,
      commit: async () => {},
      clock: fakeClock(),
    });
    expect(r.watermark).toBe(20);
    expect(r.committed).toBe(20);
    expect(r.backlog).toEqual([]);
  });

  test("commits are SERIALIZED (single writer) even while embeds overlap", async () => {
    let commitInFlight = 0;
    let maxCommitOverlap = 0;
    let maxEmbedOverlap = 0;
    let embedInFlight = 0;
    const r = await runParallelIngest(items(30), {
      embed: async (it) => {
        embedInFlight++; maxEmbedOverlap = Math.max(maxEmbedOverlap, embedInFlight);
        await new Promise((res) => setTimeout(res, 1));
        embedInFlight--;
        return it.payload;
      },
      commit: async () => {
        commitInFlight++; maxCommitOverlap = Math.max(maxCommitOverlap, commitInFlight);
        await new Promise((res) => setTimeout(res, 1));
        commitInFlight--;
      },
      dial: makeDial({ min: 8, max: 8 }),   // pin concurrency to prove overlap
      clock: fakeClock(),
    });
    expect(r.committed).toBe(30);
    expect(maxCommitOverlap).toBe(1);        // the single-writer guarantee — commits never overlap
    expect(maxEmbedOverlap).toBeGreaterThan(1); // embeds genuinely ran in parallel
  });

  test("bounded: never more than dial.limit embeds in flight at once", async () => {
    let inFlight = 0, peak = 0;
    await runParallelIngest(items(40), {
      embed: async (it) => {
        inFlight++; peak = Math.max(peak, inFlight);
        await new Promise((res) => setTimeout(res, 1));
        inFlight--; return it.payload;
      },
      commit: async () => {},
      dial: makeDial({ min: 6, max: 6 }),    // pinned at 6
      clock: fakeClock(),
    });
    expect(peak).toBeLessThanOrEqual(6);      // the bound held
    expect(peak).toBeGreaterThan(1);          // and it did parallelize
  });

  test("fail-loud: an embed error rejects the run, no orphaned commits past it", async () => {
    let commits = 0;
    await expect(runParallelIngest(items(10), {
      embed: async (it) => { if (it.seq === 3) throw new Error("embed boom"); return it.payload; },
      commit: async () => { commits++; },
      dial: makeDial({ min: 2, max: 2 }),
      clock: fakeClock(),
    })).rejects.toThrow(/embed boom/);
    expect(commits).toBeLessThan(10);         // it stopped admitting, didn't commit all
  });

  test("fail-loud: a commit error rejects the run", async () => {
    await expect(runParallelIngest(items(10), {
      embed: async (it) => it.payload,
      commit: async (_e, it) => { if (it.seq === 4) throw new Error("commit boom"); },
      dial: makeDial({ min: 3, max: 3 }),
      clock: fakeClock(),
    })).rejects.toThrow(/commit boom/);
  });

  test("empty input → clean zero result", async () => {
    const r = await runParallelIngest([], { embed: async () => 0, commit: async () => {}, clock: fakeClock() });
    expect(r).toEqual({ watermark: 0, backlog: [], committed: 0, deadLettered: 0, skipped: 0, deadLetters: [], finalLimit: expect.any(Number) });
  });

  test("merge-gate: a failed proofread dead-letters (KEPT, never dropped); the rest commit", async () => {
    let commits = 0;
    const r = await runParallelIngest(items(10), {
      embed: async (it) => it.payload,
      commit: async () => { commits++; },
      validate: (m) => (m.seq % 5 === 0 ? { ok: false, reason: "bad-fold" } : { ok: true }), // seq 5,10 fail
      dial: makeDial({ min: 4, max: 4 }),
      clock: fakeClock(),
    });
    expect(r.committed).toBe(8);
    expect(commits).toBe(8);                       // the sink only saw validated items
    expect(r.deadLettered).toBe(2);
    expect(r.deadLetters.map((d) => d.seq).sort((a, b) => a - b)).toEqual([5, 10]);
    expect(r.deadLetters[0]!.reason).toBe("bad-fold");
    expect(r.watermark).toBe(10);                  // dead-lettered seqs are RESOLVED → the watermark still advances
    expect(r.backlog).toEqual([]);
  });

  test("consume-license-on-commit: a duplicate content-key commits ONCE, the rest skip", async () => {
    let commits = 0;
    // seq 2 and 4 carry the SAME content-key as seq 1 (a re-presented turn)
    const dupItems = [
      { seq: 1, key: "kX", payload: 1 },
      { seq: 2, key: "kX", payload: 1 },
      { seq: 3, key: "kY", payload: 3 },
      { seq: 4, key: "kX", payload: 1 },
    ];
    const r = await runParallelIngest(dupItems, {
      embed: async (it) => it.payload,
      commit: async () => { commits++; },
      dial: makeDial({ min: 1, max: 1 }),          // serial admission so kX commits before its dupes reach the gate
      clock: fakeClock(),
    });
    expect(commits).toBe(2);                        // kX once + kY once
    expect(r.committed).toBe(2);
    expect(r.skipped).toBe(2);                      // the two duplicate kX presentations
    expect(r.watermark).toBe(4);                    // all four RESOLVED
  });

  test("the dial tunes under latency (final limit reflects AIMD, not the start)", async () => {
    const r = await runParallelIngest(items(30), {
      embed: async (it) => it.payload,
      commit: async () => {},
      dial: makeDial({ min: 4, max: 64 }, 4),
      clock: fakeClock(),                      // steady 1-tick latency → headroom → additive-increase
    });
    expect(r.finalLimit).toBeGreaterThan(4);   // it probed up under steady low latency
  });
});
