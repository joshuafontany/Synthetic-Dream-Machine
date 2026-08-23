/**
 * has-capture — the IN=accumulate cap. onEa recovers the WAL + starts the tick + wires the OUT
 * post→ctx.post; onSignal routes a raw turn to engine.enqueue; teardown final-flushes + disposes.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { hasCapture, TELEMETRY_FRAME } from "../src/has-capture.js";
import type { CaptureEngine, CapturePost } from "@lararium/mesh";
import type { IslandContext } from "../src/island-context.js";

function fakeEngine() {
  const calls = { recover: 0, tick: 0, enqueue: [] as Array<[string, string]>, branches: [] as Array<unknown>, dispose: 0 };
  let postRef: CapturePost | null = null;
  const engine: CaptureEngine = {
    enqueue: async (t, s, b) => void (calls.enqueue.push([t, s]), calls.branches.push(b)),
    tick: async () => (calls.tick++, 0),
    recover: async () => (calls.recover++, 0),
    stats: () => ({ depth: 0, failures: 0, spilled: 0, deadLettered: 0 }),
    compactIfDrained: async () => {},
    dispose: () => void calls.dispose++,
  };
  return { engine, calls, makeEngine: (p: CapturePost) => ((postRef = p), engine), firePost: () => postRef };
}

function fakeCtx() {
  const posted: Array<{ listenable?: string; payload?: unknown }> = [];
  const ctx = { wikiUri: "lar:///ha.ka.ba/bags/telemetry/island", post: (m: unknown) => void posted.push(m as never) } as unknown as IslandContext;
  return { ctx, posted };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("hasCapture — the capture cap inside a causal island", () => {
  test("onEa recovers the WAL, starts the tick, and wires post→ctx.post", async () => {
    const f = fakeEngine();
    const { ctx, posted } = fakeCtx();
    const cap = hasCapture({ makeEngine: f.makeEngine, tickMs: 50 });

    const teardown = await cap.onEa!(ctx);
    expect(f.calls.recover).toBe(1);

    // the tick fires on the island's own interval
    vi.advanceTimersByTime(120);
    expect(f.calls.tick).toBeGreaterThanOrEqual(2);

    // the OUT post shore emits a coalesced telemetry:frame through ctx.post
    f.firePost()!({ stats: { depth: 3, failures: 0, spilled: 0, deadLettered: 0 }, gate: { depth: 8, maxWaitMs: 2000, maxDepth: 64, maxRetries: 5, backoffBaseMs: 100, backoffMaxMs: 5000 }, rev: 1 });
    expect(posted).toHaveLength(1);
    const frame = posted[0] as { listenable: string; payload: Record<string, number> };
    expect(frame.listenable).toBe(TELEMETRY_FRAME);
    expect(frame.payload.stat_depth).toBe(3);
    expect(frame.payload.gate_depth).toBe(8); // the breathing threshold is visible in the frame

    if (typeof teardown === "function") await teardown();
    expect(f.calls.dispose).toBe(1);
  });

  test("onSignal routes a raw turn to engine.enqueue; ignores other signals", async () => {
    const f = fakeEngine();
    const { ctx } = fakeCtx();
    const cap = hasCapture({ makeEngine: f.makeEngine });
    await cap.onEa!(ctx);

    expect(cap.onSignal!("wiki:place-verb", {}, ctx)).toBe(false); // not ours
    expect(cap.onSignal!("telemetry:place-verb", { turnText: "the verb leads", sourceFile: "s://1" }, ctx)).toBe(true);
    expect(cap.onSignal!("telemetry:place-verb", { args: { turnText: "nested", sourceFile: "s://2" } }, ctx)).toBe(true);
    expect(f.calls.enqueue).toEqual([
      ["the verb leads", "s://1"],
      ["nested", "s://2"],
    ]);
  });

  test("onSignal threads the fork-frontier to enqueue as a BranchContext; absent ⇒ undefined", async () => {
    const f = fakeEngine();
    const { ctx } = fakeCtx();
    const cap = hasCapture({ makeEngine: f.makeEngine });
    await cap.onEa!(ctx);

    expect(cap.onSignal!("telemetry:place-verb", { turnText: "a", sourceFile: "s://1", frontier: ["turnA"] }, ctx)).toBe(true);
    expect(cap.onSignal!("telemetry:place-verb", { args: { turnText: "b", sourceFile: "s://2", frontier: ["u1", "u2"] } }, ctx)).toBe(true);
    expect(cap.onSignal!("telemetry:place-verb", { turnText: "c", sourceFile: "s://3" }, ctx)).toBe(true); // no fork
    expect(cap.onSignal!("telemetry:place-verb", { turnText: "d", sourceFile: "s://4", frontier: [] }, ctx)).toBe(true); // empty ⇒ none

    expect(f.calls.branches).toEqual([
      { frontier: ["turnA"] },
      { frontier: ["u1", "u2"] },
      undefined,
      undefined,
    ]);
  });
});
