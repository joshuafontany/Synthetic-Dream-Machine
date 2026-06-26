/**
 * capture-engine — the assembled telemetry-VM core: enqueue annotates a raw turn forward
 * (harvestTurnGradient + buildPatch), write-ahead-logs it durably, and the tick flushes it
 * via the runner; recover replays the WAL on boot (open sessions survive a restart).
 */

import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { FlushGate } from "@lararium/mesh";
import { describe, expect, test } from "vitest";

import { makeCaptureEngine, type CaptureEngineOptions } from "../src/capture-engine.js";

const GATE: FlushGate = {
  depth: 1,
  maxWaitMs: 2000,
  maxDepth: 16,
  maxRetries: 5,
  backoffBaseMs: 100,
  backoffMaxMs: 5000,
};

async function opts(extra: Partial<CaptureEngineOptions> = {}): Promise<CaptureEngineOptions> {
  const dir = await mkdtemp(join(tmpdir(), "capeng-"));
  return {
    palacePath: join(dir, "palace"),
    spoolDir: join(dir, "spool"),
    walPath: join(dir, "nalu.wal"),
    quarantinePath: join(dir, "quarantine.ndjson"),
    annotate: (_turn, sourceFile) => ({ lar_test: "1", lar_source: sourceFile }),
    gate: GATE,
    ...extra,
  };
}

describe("capture-engine — annotate → write-ahead → flush", () => {
  test("enqueue annotates + durably logs; tick flushes the annotated record", async () => {
    let captured: Array<{ content: string; source_file: string; metadata: unknown }> = [];
    const o = await opts({
      spawn: async (_bin, args) => {
        const path = args[args.length - 1];
        const body = await readFile(path, "utf-8");
        captured = body
          .trim()
          .split("\n")
          .map((l) => JSON.parse(l));
        return { stdout: "Drawers filed: 1" };
      },
    });
    const engine = makeCaptureEngine(o);
    const turn = "Lares (Council): the verb leads. <<~ confidence Synthesis 12/20 >>";
    await engine.enqueue(turn, "nalu://run/seg-1");

    expect(await engine.tick(50)).toBe(1);
    expect(captured).toHaveLength(1);
    expect(captured[0].content).toBe(turn); // verbatim
    expect(captured[0].source_file).toBe("nalu://run/seg-1");
    expect((captured[0].metadata as Record<string, string>).lar_test).toBe("1"); // annotate ran
  });

  test("recover replays the WAL on boot (open sessions survive a restart)", async () => {
    const o = await opts({ spawn: async () => ({ stdout: "Drawers filed: 0" }) });
    const a = makeCaptureEngine(o);
    await a.enqueue("turn one", "nalu://run/1");
    await a.enqueue("turn two", "nalu://run/2");

    const b = makeCaptureEngine(o); // a fresh engine over the same WAL = a reboot
    expect(await b.recover()).toBe(2);
    expect(b.stats().depth).toBe(2);
  });
});
