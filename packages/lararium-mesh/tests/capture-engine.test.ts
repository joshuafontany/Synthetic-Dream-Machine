/**
 * capture-engine — the isomorphic telemetry-VM worker over injected seams: enqueue
 * annotates a raw turn forward + write-ahead-logs it; tick flushes via the injected flush;
 * recover replays the reserve on boot (open sessions survive a restart). Pure — stub seams.
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

describe("makeCaptureEngine — isomorphic worker over injected seams", () => {
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
    const seams = { reserve: r.reserve, flush: async () => 0, annotate: () => ({}), gate: GATE };
    const a = makeCaptureEngine(seams);
    await a.enqueue("a", "x/1");
    await a.enqueue("b", "x/2");

    const rebooted = makeCaptureEngine(seams); // fresh engine, same reserve = a reboot
    expect(await rebooted.recover()).toBe(2);
    expect(rebooted.stats().depth).toBe(2);
  });
});
