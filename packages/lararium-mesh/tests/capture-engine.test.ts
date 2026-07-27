/**
 * capture-engine — the isomorphic telemetry-VM worker over injected shores: enqueue
 * annotates a raw turn forward + write-ahead-logs it; tick flushes via the injected flush;
 * recover replays the reserve on boot (open sessions survive a restart). Pure — stub shores.
 */

import { describe, expect, test } from "vitest";

import { makeCaptureEngine } from "../src/index.js";
import type { CaptureRecord, CaptureReserve, FlushGate } from "../src/index.js";

const GATE: FlushGate = {
  depth: 1,
  maxWaitMs: 2000,
  maxDepth: 16,
  maxRetries: 5,
  backoffBaseMs: 100,
  backoffMaxMs: 5000,
};

function stubReserve() {
  const wal: CaptureRecord[] = [];
  const tail: CaptureRecord[] = [];
  const dead: CaptureRecord[] = [];
  const reserve: CaptureReserve = {
    async append(r) {
      wal.push(r);
    },
    onOverflow(rs) {
      tail.push(...rs);
    },
    refill(room) {
      return tail.splice(0, room);
    },
    onDeadLetter(rs) {
      dead.push(...rs);
    },
    async replay() {
      return [...wal];
    },
    async compact() {
      wal.length = 0;
    },
  };
  return {
    reserve,
    dead,
    get wal() {
      return wal;
    },
  };
}

describe("makeCaptureEngine — isomorphic worker over injected shores", () => {
  test("enqueue annotates + write-ahead-logs; tick flushes the annotated record", async () => {
    const r = stubReserve();
    const flushed: CaptureRecord[][] = [];
    const engine = makeCaptureEngine({
      reserve: r.reserve,
      flush: async (batch) => {
        flushed.push([...batch]);
        return batch.length;
      },
      annotate: (_turn, sourceFile) => ({ lar_test: "1", lar_source: sourceFile }),
      gate: GATE,
    });

    await engine.enqueue("the verb leads", "nalu://run/1");
    expect(r.wal).toHaveLength(1); // write-ahead durable BEFORE the flush
    expect(await engine.tick(50)).toBe(1);
    expect(flushed[0][0].content).toBe("the verb leads");
    expect(flushed[0][0].metadata).toEqual({ lar_test: "1", lar_source: "nalu://run/1" });
  });

  test("recover replays the reserve on boot (open sessions survive a restart)", async () => {
    const r = stubReserve();
    const shores = { reserve: r.reserve, flush: async () => 0, annotate: () => ({}), gate: GATE };
    const a = makeCaptureEngine(shores);
    await a.enqueue("a", "x/1");
    await a.enqueue("b", "x/2");

    const rebooted = makeCaptureEngine(shores); // fresh engine, same reserve = a reboot
    expect(await rebooted.recover()).toBe(2);
    expect(rebooted.stats().depth).toBe(2);
  });

  test("OUT family: a burst of source-moves coalesces to ONE stats frame (post = the sink)", async () => {
    const r = stubReserve();
    let scheduled: (() => void) | null = null;
    const outTimer = {
      setTimer: (fn: () => void) => {
        scheduled = fn;
        return 1 as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimer: () => {
        scheduled = null;
      },
    };
    const frames: { stats: { depth: number }; rev: number }[] = [];
    const engine = makeCaptureEngine({
      reserve: r.reserve,
      flush: async (b) => b.length,
      annotate: () => ({}),
      gate: { ...GATE, depth: 8 },
      post: (f) => frames.push(f),
      outTimer,
    });

    await engine.enqueue("a", "x/1");
    await engine.enqueue("b", "x/2"); // a burst — both marks coalesce onto one armed timer
    expect(frames).toHaveLength(0); // nothing posted until the crest
    scheduled?.(); // the coalesce window fires
    expect(frames).toHaveLength(1); // ONE frame for the burst — intermediates faded
    expect(frames[0].stats.depth).toBe(2); // newest snapshot wins
    expect(frames[0].rev).toBe(1);
  });

  test("SELF-REGULATION: a slow flush servos the gate's depth down (the breathing threshold)", async () => {
    const r = stubReserve();
    let t = 0;
    const now = () => t;
    let scheduled: (() => void) | null = null;
    const outTimer = {
      setTimer: (fn: () => void) => {
        scheduled = fn;
        return 1 as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimer: () => {
        scheduled = null;
      },
    };
    const frames: { gate: { depth: number } }[] = [];
    const engine = makeCaptureEngine({
      reserve: r.reserve,
      flush: async (b) => {
        t += 4000; // a 4 s flush — twice the 2 s set-point
        return b.length;
      },
      annotate: () => ({}),
      gate: { ...GATE, depth: 8, maxDepth: 64 },
      now,
      servo: { targetLatencyMs: 2000 },
      post: (f) => frames.push(f),
      outTimer,
    });

    for (let i = 0; i < 8; i++) await engine.enqueue("x", `x/${i}`); // fill to depth → flush fires
    expect(await engine.tick(0)).toBe(8);
    scheduled?.();
    // adaptGate(depth 8, observed 4000, target 2000): error +1 → clamp -0.25 → 8·0.75 = 6
    expect(frames.at(-1)?.gate.depth).toBe(6);
  });

  test("no post shore = no OUT projection (Null-Object); the IN family runs unchanged", async () => {
    const r = stubReserve();
    const flushed: number[] = [];
    const engine = makeCaptureEngine({
      reserve: r.reserve,
      flush: async (b) => {
        flushed.push(b.length);
        return b.length;
      },
      annotate: () => ({}),
      gate: GATE,
    });
    await engine.enqueue("a", "x/1");
    expect(await engine.tick(50)).toBe(1);
    expect(flushed).toEqual([1]);
    engine.dispose(); // safe even with no OUT gate
  });

  test("the derivation loop (slow) re-anchors the gate from EBQ + Little's Law", async () => {
    const r = stubReserve();
    let clock = 0;
    const engine = makeCaptureEngine({
      reserve: r.reserve,
      flush: async (b) => {
        clock += 500; // each flush costs 500ms (the S signal)
        return b.length;
      },
      annotate: () => ({}),
      gate: { ...GATE, depth: 1 },
      now: () => clock,
      derive: { holdingCostPerMs: 0.001, everyFlushes: 2, minSamples: 1 },
    });

    await engine.enqueue("a", "x/1"); // arrival 1
    expect(await engine.tick(clock)).toBe(1); // flush 1 — cost sampled, cadence not yet hit
    expect(engine.gate().depth).toBe(1); // unchanged before the slow-loop cadence
    await engine.enqueue("b", "x/2"); // arrival 2
    expect(await engine.tick(clock)).toBe(1); // flush 2 — cadence hit → derive re-anchors
    // S(ewma)=500, λ = 2 arrivals / 1000ms = 0.002; depth = √(2·0.002·500 / 0.001) = √2000 ≈ 45
    expect(engine.gate().depth).toBe(45);
    expect(engine.gate().maxDepth).toBe(360); // depth · burst(8)
  });

  test("onLand fires the batch's landed turns ONLY on flush-success (accept≠land, the keel's land-signal)", async () => {
    const r = stubReserve();
    const lands: string[] = [];
    const engine = makeCaptureEngine({
      reserve: r.reserve,
      flush: async (b) => b.length,           // a landing flush
      annotate: () => ({}),
      gate: GATE,
      onLand: (landed) => { for (const l of landed) lands.push(l.turnKey ?? `#${l.contentHash.slice(0, 4)}`); },
    });
    await engine.enqueue("turn one", "src/1", undefined, "uuid-1");
    await engine.enqueue("turn two", "src/2", undefined, "uuid-2");
    expect(lands).toEqual([]);                 // enqueued (accepted) but NOT landed — no land fired
    await engine.tick(50);                     // flush confirms durable → land fires
    expect(lands).toEqual(["uuid-1", "uuid-2"]);
  });

  test("a THROWING flush fires NO land — the turn stays staged, the watermark holds (the leak cannot recur)", async () => {
    const r = stubReserve();
    const lands: string[] = [];
    let fail = true;
    const engine = makeCaptureEngine({
      reserve: r.reserve,
      flush: async (b) => { if (fail) throw new Error("store down"); return b.length; },
      annotate: () => ({}),
      gate: GATE,
      onLand: (landed) => { for (const l of landed) lands.push(l.turnKey!); },
    });
    await engine.enqueue("t", "src/1", undefined, "uuid-1");
    await engine.tick(50).catch(() => { /* flush threw → nalu backoff */ });
    expect(lands).toEqual([]);                 // NO land on a failed flush — accept≠land held
    fail = false;
    await engine.tick(10_000);                 // retry succeeds → NOW the land fires
    expect(lands).toEqual(["uuid-1"]);
  });
});

test("a producer-given index stamps lar_turn_ordinal; the hash pseudo-chunk never does", async () => {
  // The drawer learns WHERE in its worldline it sits — recall's self-discount grades
  // same-root hits by this distance. A hash worn as an ordinal would poison that axis,
  // so only a real chunkIndex stamps; absence stays honestly porous.
  const flushed: CaptureRecord[][] = [];
  const engine = makeCaptureEngine({
    reserve: stubReserve().reserve,
    flush: async (batch) => { flushed.push([...batch]); return batch.length; },
    annotate: () => ({}),
    gate: { depth: 1, intervalMs: 60_000, ceiling: 8, backoffMs: 1 },
  });
  await engine.enqueue("turn with a position", "wing_t/s.jsonl", undefined, undefined, 7);
  await engine.enqueue("turn without a position", "wing_t/s.jsonl");
  await engine.tick(0);
  engine.dispose();
  const all = flushed.flat();
  const withPos = all.find((r) => r.content.includes("with a position"));
  const withoutPos = all.find((r) => r.content.includes("without a position"));
  expect(withPos?.metadata?.["lar_turn_ordinal"]).toBe(7);
  expect(withoutPos?.metadata?.["lar_turn_ordinal"]).toBeUndefined();
});
