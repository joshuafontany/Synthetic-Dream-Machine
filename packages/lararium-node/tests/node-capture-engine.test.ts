/**
 * node-capture-engine — node's composition of the isomorphic engine (subprocess flush +
 * fs-WAL reserve): enqueue annotates + write-aheads; tick spawns the flush; recover replays.
 */

import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { FlushGate } from "@lararium/mesh";
import { describe, expect, test } from "vitest";

import { makeNodeCaptureEngine, type NodeCaptureEngineOptions } from "../src/node-capture-engine.js";

const GATE: FlushGate = {
  depth: 1,
  maxWaitMs: 2000,
  maxDepth: 16,
  maxRetries: 5,
  backoffBaseMs: 100,
  backoffMaxMs: 5000,
};

async function opts(extra: Partial<NodeCaptureEngineOptions> = {}): Promise<NodeCaptureEngineOptions> {
  const dir = await mkdtemp(join(tmpdir(), "nodeeng-"));
  return {
    palacePath: join(dir, "palace"),
    spoolDir: join(dir, "spool"),
    walPath: join(dir, "nalu.wal"),
    quarantinePath: join(dir, "q.ndjson"),
    annotate: (_turn, sourceFile) => ({ lar_test: "1", lar_source: sourceFile }),
    gate: GATE,
    ...extra,
  };
}

describe("makeNodeCaptureEngine", () => {
  test("enqueue annotates + write-aheads; tick spawns the flush with the annotated record", async () => {
    let captured: Array<{ content: string; metadata: Record<string, string> }> = [];
    const o = await opts({
      spawn: async (_bin, args) => {
        captured = (await readFile(args[args.length - 1], "utf-8"))
          .trim()
          .split("\n")
          .map((l) => JSON.parse(l));
        return { stdout: "Drawers filed: 1" };
      },
    });
    const engine = makeNodeCaptureEngine(o);
    await engine.enqueue("the verb leads", "nalu://run/1");
    expect(await engine.tick(50)).toBe(1);
    expect(captured[0].content).toBe("the verb leads");
    expect(captured[0].metadata.lar_test).toBe("1");
  });

  test("recover replays the WAL on boot (open sessions survive a restart)", async () => {
    const o = await opts({ spawn: async () => ({ stdout: "Drawers filed: 0" }) });
    const a = makeNodeCaptureEngine(o);
    await a.enqueue("a", "x/1");
    await a.enqueue("b", "x/2");

    const rebooted = makeNodeCaptureEngine(o); // same WAL = a reboot
    expect(await rebooted.recover()).toBe(2);
    expect(rebooted.stats().depth).toBe(2);
  });
});
