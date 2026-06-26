/**
 * capture-reserve — the durable WAL backing: write-ahead append + replay-on-boot (the
 * downtime-resilience: open sessions survive component restarts), the in-memory overflow
 * tail (onOverflow/refill), durable dead-letter quarantine, and compaction.
 */

import { appendFile, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { makeCaptureReserve } from "../src/capture-reserve.js";

const rec = (i: number) => ({ content: `r${i}`, source_file: `nalu://x/${i}` });

async function paths() {
  const dir = await mkdtemp(join(tmpdir(), "capres-"));
  return { walPath: join(dir, "nalu.wal"), quarantinePath: join(dir, "quarantine.ndjson") };
}

describe("capture-reserve — write-ahead durability", () => {
  test("append then replay round-trips the records (the restart-recovery path)", async () => {
    const p = await paths();
    const r = makeCaptureReserve(p);
    await r.append(rec(0));
    await r.append(rec(1));
    await r.append(rec(2));

    // a fresh reserve over the same WAL = a reboot; replay recovers everything
    const rebooted = makeCaptureReserve(p);
    const recovered = await rebooted.replay();
    expect(recovered.map((x) => x.content)).toEqual(["r0", "r1", "r2"]);
  });

  test("replay skips a torn tail line (a crash mid-append) and recovers the rest", async () => {
    const p = await paths();
    const r = makeCaptureReserve(p);
    await r.append(rec(0));
    await appendFile(p.walPath, '{"content":"r1","source', "utf-8"); // torn write
    expect((await r.replay()).map((x) => x.content)).toEqual(["r0"]);
  });

  test("replay of a missing WAL is a clean boot (empty)", async () => {
    const p = await paths();
    expect(await makeCaptureReserve(p).replay()).toEqual([]);
  });

  test("onOverflow → refill drains the reserve tail FIFO", () => {
    const r = makeCaptureReserve({ walPath: "/tmp/x.wal", quarantinePath: "/tmp/x.q" });
    r.onOverflow([rec(0), rec(1), rec(2)]);
    expect(r.refill(2).map((x) => x.content)).toEqual(["r0", "r1"]);
    expect(r.refill(9).map((x) => x.content)).toEqual(["r2"]);
    expect(r.refill(0)).toEqual([]);
  });

  test("onDeadLetter quarantines durably", async () => {
    const p = await paths();
    makeCaptureReserve(p).onDeadLetter([rec(7), rec(8)]);
    const body = await readFile(p.quarantinePath, "utf-8");
    expect(body.trim().split("\n").map((l) => JSON.parse(l).content)).toEqual(["r7", "r8"]);
  });

  test("compact truncates the WAL once everything's filed", async () => {
    const p = await paths();
    const r = makeCaptureReserve(p);
    await r.append(rec(0));
    await r.compact();
    expect(await r.replay()).toEqual([]);
  });
});
