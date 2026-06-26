/**
 * capture-flush-runner — serialize a batch → spawn `mine --source lares` → parse the
 * count → clean up. Plus the wired path through CaptureNalu (enqueue → tick → flush).
 */

import { access, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CaptureNalu } from "@lararium/mesh";
import { describe, expect, test } from "vitest";

import { makeCaptureFlushRunner } from "../src/capture-flush-runner.js";

describe("capture-flush-runner", () => {
  test("writeNdjson serializes a batch; run spawns the adapter flush, parses, cleans up", async () => {
    const spool = await mkdtemp(join(tmpdir(), "capnalu-"));
    const calls: string[][] = [];
    const { writeNdjson, run } = makeCaptureFlushRunner({
      spoolDir: spool,
      palacePath: "/tmp/palace",
      spawn: async (_bin, args) => {
        calls.push([...args]);
        return { stdout: "  source=lares  Drawers filed: 2  (skipped 0)" };
      },
    });

    const path = await writeNdjson([
      { content: "a", source_file: "nalu://x/1" },
      { content: "b", source_file: "nalu://x/2", metadata: { wing: "w" } },
    ]);
    const body = await readFile(path, "utf-8");
    expect(body.trim().split("\n")).toHaveLength(2);
    expect(JSON.parse(body.split("\n")[1]).metadata.wing).toBe("w");

    const filed = await run(path);
    expect(filed).toBe(2);
    expect(calls[0]).toEqual(["mine", "--source", "lares", "--palace", "/tmp/palace", path]);
    await expect(access(path)).rejects.toThrow(); // transient file cleaned up
  });

  test("a failing spawn throws (so CaptureNalu re-queues) and still cleans up", async () => {
    const spool = await mkdtemp(join(tmpdir(), "capnalu-"));
    const { writeNdjson, run } = makeCaptureFlushRunner({
      spoolDir: spool,
      palacePath: "/tmp/palace",
      spawn: async () => {
        throw new Error("mine failed");
      },
    });
    const path = await writeNdjson([{ content: "a", source_file: "nalu://x/1" }]);
    await expect(run(path)).rejects.toThrow("mine failed");
    await expect(access(path)).rejects.toThrow(); // cleaned up despite the failure
  });

  test("wired through CaptureNalu: enqueue → tick flushes the batch via the runner", async () => {
    const spool = await mkdtemp(join(tmpdir(), "capnalu-"));
    const { writeNdjson, run } = makeCaptureFlushRunner({
      spoolDir: spool,
      palacePath: "/tmp/palace",
      spawn: async () => ({ stdout: "Drawers filed: 3" }),
    });
    const gate = {
      depth: 3,
      maxWaitMs: 2000,
      maxDepth: 16,
      maxRetries: 5,
      backoffBaseMs: 100,
      backoffMaxMs: 5000,
    };
    const nalu = new CaptureNalu({ writeNdjson, run }, gate, 0);
    for (let i = 0; i < 3; i++) nalu.enqueue({ content: `r${i}`, source_file: `nalu://x/${i}` });

    expect(await nalu.tick(10)).toBe(3);
    expect(nalu.depth()).toBe(0);
  });
});
