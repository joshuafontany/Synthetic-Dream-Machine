/**
 * worldline-clock — per-worldline rhythmic clocks keyed on the lineage HANDLE.
 * Construct-on-first-event · grounding-tick · rollover-checkpoint. Pure functions;
 * the caller owns persistence.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/api/agent-worldline#time
 */

import { describe, test, expect } from "vitest";
import {
  ffzZero,
  worldlineClockFor,
  groundingTick,
  isCheckpoint,
  groundWorldlineEvent,
} from "../src/index.js";
import type { FfzClock, LarTickCounter, SessionEvent, SessionEventLog } from "../src/index.js";

const tc = (n: number): LarTickCounter => n as unknown as LarTickCounter;
const ev = (id: string, clock: FfzClock, tickCounter: number): SessionEvent =>
  ({ id, clock, tickCounter: tc(tickCounter), kind: "turn", payload: null });
const logOf = (...events: SessionEvent[]): SessionEventLog =>
  ({ events: Object.fromEntries(events.map((e) => [e.id, e])) }) as unknown as SessionEventLog;

describe("worldlineClockFor — construct-on-first-event, keyed on handle", () => {
  test("empty log → a fresh zero clock KEYED ON THE HANDLE", () => {
    const c = worldlineClockFor(logOf(), "run.alice");
    expect(c.levels).toEqual([0, 0, 0, 0, 0]);
    expect(c.actorId).toBe("run.alice"); // the handle, never an Automerge actor
  });

  test("two worldlines in one log stay DISTINCT (no replica-actor collapse)", () => {
    const log = logOf(
      ev("e1", ffzTickN(ffzZero("run.alice"), 3), 10),
      ev("e2", ffzTickN(ffzZero("run.bob"), 1), 11),
    );
    expect(worldlineClockFor(log, "run.alice").levels[1]).toBe(3);
    expect(worldlineClockFor(log, "run.bob").levels[1]).toBe(1);
  });

  test("returns the LATEST event for the handle (by node-monotonic tickCounter)", () => {
    const log = logOf(
      ev("old", ffzTickN(ffzZero("run.alice"), 1), 5),
      ev("new", ffzTickN(ffzZero("run.alice"), 4), 9),
    );
    expect(worldlineClockFor(log, "run.alice").levels[1]).toBe(4);
  });
});

describe("groundingTick — advance one grounded turn (L1 Beat)", () => {
  test("default tick advances L1, not L0", () => {
    const next = groundingTick(ffzZero("run.alice"));
    expect(next.levels).toEqual([0, 1, 0, 0, 0]);
  });
});

describe("isCheckpoint — Measure+ rollover is the durable-persist signal", () => {
  test("L1-only advance is NOT a checkpoint", () => {
    const prev = ffzZero("h");
    expect(isCheckpoint(prev, groundingTick(prev))).toBe(false);
  });

  test("an L1 tick that rolls into L2 IS a checkpoint", () => {
    const nearRoll: FfzClock = { levels: [0, 255, 0, 0, 0], bounds: [64, 256, 1024, 365, Infinity], actorId: "h" };
    const rolled = groundingTick(nearRoll); // 255+1 = 256 = bound → L1=0, L2++
    expect(rolled.levels).toEqual([0, 0, 1, 0, 0]);
    expect(isCheckpoint(nearRoll, rolled)).toBe(true);
  });
});

describe("groundWorldlineEvent — the minimal slice end to end", () => {
  test("first event for a handle: zero → grounded L1 tick, keyed on handle, no checkpoint", () => {
    const { event, checkpoint } = groundWorldlineEvent(logOf(), "run.alice", "e1", tc(1), "turn", { ok: true });
    expect(event.clock.actorId).toBe("run.alice");
    expect(event.clock.levels).toEqual([0, 1, 0, 0, 0]);
    expect(event.tickCounter).toBe(1);
    expect(checkpoint).toBe(false);
  });

  test("a subsequent grounded event ticks from the worldline's latest, not from zero", () => {
    const first = groundWorldlineEvent(logOf(), "run.alice", "e1", tc(1), "turn", null);
    const log = logOf(first.event);
    const second = groundWorldlineEvent(log, "run.alice", "e2", tc(2), "turn", null);
    expect(second.event.clock.levels[1]).toBe(2); // 1 → 2, continuity preserved
  });
});

// local helper: tick L1 n times
function ffzTickN(clock: FfzClock, n: number): FfzClock {
  let c = clock;
  for (let i = 0; i < n; i++) c = groundingTick(c);
  return c;
}
