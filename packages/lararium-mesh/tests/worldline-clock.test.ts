/**
 * worldline-clock — per-worldline rhythmic clocks + the lar_ffz address. Segment-grain L0
 * (the generation segment ticks; the block is an offset), grounding-tick resets L0, the
 * address is prefix-truncatable. Pure functions; nothing touches the mesh.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/ffz-clock#rhythmic-address
 */

import { describe, test, expect } from "vitest";
import {
  ffzZero,
  worldlineClockFor,
  segmentTick,
  groundingTick,
  isCheckpoint,
  groundWorldlineEvent,
  ffzAddress,
  ffzAddressPrefix,
  CLAUDE_AGENT_BOUNDS,
} from "../src/index.js";
import type { FfzClock, LarTickCounter, WorldlineEvent, WorldlineLog } from "../src/index.js";

const tc = (n: number): LarTickCounter => n as unknown as LarTickCounter;
const ev = (clock: FfzClock, tickCounter: number): WorldlineEvent => ({ clock, tickCounter: tc(tickCounter) });
const logOf = (...events: WorldlineEvent[]): WorldlineLog =>
  ({ events: Object.fromEntries(events.map((e, i) => [`e${i}`, e])) });

const grounds = (clock: FfzClock, n: number): FfzClock => {
  let c = clock;
  for (let i = 0; i < n; i++) c = groundingTick(c);
  return c;
};

describe("worldlineClockFor — construct-on-first-event, keyed on handle", () => {
  test("empty log → a fresh zero clock KEYED ON THE HANDLE (Claude-agent bounds)", () => {
    const c = worldlineClockFor(logOf(), "run.alice");
    expect(c.levels).toEqual([0, 0, 0, 0, 0]);
    expect(c.actorId).toBe("run.alice");
    expect(c.bounds).toEqual(CLAUDE_AGENT_BOUNDS);
  });

  test("two worldlines in one log stay DISTINCT (no replica-actor collapse)", () => {
    const log = logOf(ev(grounds(ffzZero("run.alice"), 3), 10), ev(grounds(ffzZero("run.bob"), 1), 11));
    expect(worldlineClockFor(log, "run.alice").levels[1]).toBe(3);
    expect(worldlineClockFor(log, "run.bob").levels[1]).toBe(1);
  });
});

describe("segmentTick / groundingTick — segment is the tick, grounding resets it", () => {
  test("segmentTick advances L0 (the generation segment), not L1", () => {
    const after3 = segmentTick(segmentTick(segmentTick(ffzZero("h"))));
    expect(after3.levels).toEqual([3, 0, 0, 0, 0]);
  });

  test("groundingTick advances L1 (Beat) and RESETS L0 (new turn → segment 0)", () => {
    const midTurn = segmentTick(segmentTick(ffzZero("h"))); // [2,0,0,0,0]
    expect(groundingTick(midTurn).levels).toEqual([0, 1, 0, 0, 0]); // L0 reset, L1++
  });
});

describe("isCheckpoint — Measure+ rollover is the durable-persist signal", () => {
  test("an L1 tick that rolls into L2 IS a checkpoint", () => {
    const nearRoll: FfzClock = { levels: [5, 511, 0, 0, 0], bounds: CLAUDE_AGENT_BOUNDS, actorId: "h" };
    const rolled = groundingTick(nearRoll); // L1 511+1=512=bound → L1=0,L2++; L0 reset
    expect(rolled.levels).toEqual([0, 0, 1, 0, 0]);
    expect(isCheckpoint(nearRoll, rolled)).toBe(true);
  });

  test("a within-Measure grounding is NOT a checkpoint", () => {
    const prev = ffzZero("h");
    expect(isCheckpoint(prev, groundingTick(prev))).toBe(false);
  });
});

describe("ffzAddress — prefix-truncatable Theme.Arc.Measure.Beat.Segment[.block]", () => {
  test("serializes coarse→fine; block is an optional sub-offset", () => {
    const clock: FfzClock = { levels: [3, 47, 2, 1, 0], bounds: CLAUDE_AGENT_BOUNDS, actorId: "h" };
    expect(ffzAddress(clock)).toBe("0.1.2.47.3"); // Theme.Arc.Measure.Beat.Segment
    expect(ffzAddress(clock, 5)).toBe("0.1.2.47.3.5"); // + .block
  });

  test("prefix-truncation = zoom out (drop the finest terms)", () => {
    const a = "0.1.2.47.3.5";
    expect(ffzAddressPrefix(a, 1)).toBe("0.1.2.47.3"); // drop block → the segment
    expect(ffzAddressPrefix(a, 2)).toBe("0.1.2.47"); // → the Beat
    expect(ffzAddressPrefix(a, 99)).toBe("0"); // never below Theme
  });
});

describe("groundWorldlineEvent — the minimal LOCAL slice end to end", () => {
  test("first event for a handle: zero → grounded L1 tick, keyed on handle, no checkpoint", () => {
    const { event, checkpoint } = groundWorldlineEvent(logOf(), "run.alice", tc(1));
    expect(event.clock.actorId).toBe("run.alice");
    expect(event.clock.levels).toEqual([0, 1, 0, 0, 0]);
    expect(checkpoint).toBe(false);
  });

  test("a subsequent grounded event ticks from the worldline's latest, not from zero", () => {
    const first = groundWorldlineEvent(logOf(), "run.alice", tc(1));
    const second = groundWorldlineEvent(logOf(first.event), "run.alice", tc(2));
    expect(second.event.clock.levels[1]).toBe(2);
  });
});
