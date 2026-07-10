/**
 * worldline-clock — per-worldline rhythmic clocks + the lar_ffz address. Segment-grain L0
 * (the generation segment ticks; the block is an offset), grounding-tick resets L0, the
 * address is prefix-truncatable. Pure functions; nothing touches the mesh.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/ffz-clock#rhythmic-address
 */

import { describe, test, expect } from "vitest";
import {
  ffzZero,
  ffzCompare,
  itcCompare,
  worldlineClockFor,
  segmentTick,
  groundingTick,
  isCheckpoint,
  groundWorldlineEvent,
  ffzAddress,
  ffzAddressPrefix,
  CLAUDE_AGENT_BOUNDS,
  worldlineCausalSeed,
  worldlineSpawn,
  worldlineInject,
  worldlineHandback,
  worldlineCompare,
  worldlineStampFor,
  worldlineHandles,
  worldlineFrontiersFor,
  itcSeed,
  itcFork,
  itcEvent,
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

describe("the two reads stay SEPARATE — rhythmic LWW vs causal partial-order", () => {
  test("ffzCompare is a total order (never concurrent); it only paces the grain", () => {
    const lo: FfzClock = { levels: [0, 1, 0, 0, 0], bounds: CLAUDE_AGENT_BOUNDS, actorId: "h1" };
    const hi: FfzClock = { levels: [0, 2, 0, 0, 0], bounds: CLAUDE_AGENT_BOUNDS, actorId: "h2" };
    expect(ffzCompare(lo, hi)).toBe(-1);
    expect(ffzCompare(hi, lo)).toBe(1);
    // identical tuples, different handle → actorId tiebreak (still a TOTAL order)
    const a: FfzClock = { levels: [0, 1, 0, 0, 0], bounds: CLAUDE_AGENT_BOUNDS, actorId: "a" };
    const b: FfzClock = { levels: [0, 1, 0, 0, 0], bounds: CLAUDE_AGENT_BOUNDS, actorId: "b" };
    expect(ffzCompare(a, b)).toBe(-1);
  });

  test("itcCompare CAN say concurrent — siblings sharing no merge-ancestry", () => {
    const [x0, y0] = itcFork(itcSeed());
    const x = itcEvent(x0);
    const y = itcEvent(y0);
    expect(itcCompare(x, y)).toBe("concurrent");
    // and it still reads before/after where history orders
    expect(itcCompare(itcSeed(), itcEvent(itcSeed()))).toBe("before");
  });
});

describe("worldline causal partial-order — rides ITC, concurrent-capable", () => {
  test("spawn = fork: a spawned child reads AFTER the parent once it acts", () => {
    let c = worldlineCausalSeed("run");
    c = worldlineSpawn(c, "run", "run.child");
    c = worldlineInject(c, "run.child"); // the child does work
    expect(worldlineCompare(c, "run", "run.child")).toBe("before"); // parent → child
    expect(worldlineCompare(c, "run.child", "run")).toBe("after");
  });

  test("siblings of one spawn, no join between → CONCURRENT", () => {
    let c = worldlineCausalSeed("run");
    c = worldlineSpawn(c, "run", "run.a");
    c = worldlineSpawn(c, "run", "run.b");
    c = worldlineInject(c, "run.a");
    c = worldlineInject(c, "run.b");
    expect(worldlineCompare(c, "run.a", "run.b")).toBe("concurrent");
  });

  test("inject FULL-ticks every time (the D-cut): each injection advances the history", () => {
    let c = worldlineCausalSeed("run");
    c = worldlineSpawn(c, "run", "run.a");
    const before = worldlineStampFor(c, "run.a")!;
    c = worldlineInject(c, "run.a");
    const after1 = worldlineStampFor(c, "run.a")!;
    c = worldlineInject(c, "run.a");
    const after2 = worldlineStampFor(c, "run.a")!;
    expect(itcCompare(before, after1)).toBe("before");
    expect(itcCompare(after1, after2)).toBe("before");
  });

  test("handback = join: the parent absorbs the concurrent child, reads AFTER it; child retires", () => {
    let c = worldlineCausalSeed("run");
    c = worldlineSpawn(c, "run", "run.child");
    c = worldlineInject(c, "run.child"); // the child works
    c = worldlineInject(c, "run");       // the parent works meanwhile — concurrent
    const childAtHandback = worldlineStampFor(c, "run.child")!;
    expect(worldlineCompare(c, "run", "run.child")).toBe("concurrent");
    c = worldlineHandback(c, "run", "run.child");
    expect(worldlineStampFor(c, "run.child")).toBeUndefined(); // dissolved at handback
    // the reunited parent's history now dominates the child's pre-handback history
    expect(itcCompare(worldlineStampFor(c, "run")!, childAtHandback)).toBe("after");
  });

  test("unknown handles throw — the registry never invents a worldline", () => {
    const c = worldlineCausalSeed("run");
    expect(() => worldlineSpawn(c, "ghost", "x")).toThrow();
    expect(() => worldlineInject(c, "ghost")).toThrow();
    expect(() => worldlineCompare(c, "run", "ghost")).toThrow();
  });

  test("(handle × frontier) key: re-spawning a child across a moved parent frontier does NOT collide", () => {
    // The slice-2 bug: worldlineSpawn threw when a child handle already existed. Now the key is
    // (handle, frontier) — the parent's frontier moves on inject, so the re-forked child inherits a
    // DISTINCT frontier and rides alongside the old entry (the same-session fork).
    let c = worldlineCausalSeed("run");
    c = worldlineSpawn(c, "run", "run.child"); // first fork — child @ frontier F0
    c = worldlineInject(c, "run");             // the parent's history advances → frontier moves
    expect(() => (c = worldlineSpawn(c, "run", "run.child"))).not.toThrow(); // re-fork @ frontier F1
    // Two concurrent frontiers for ONE rigid handle — the moving antichain, keyed BY the handle.
    expect(worldlineFrontiersFor(c, "run.child").length).toBe(2);
    expect(worldlineHandles(c).sort()).toEqual(["run", "run.child"]);
  });

  test("an identical re-fork (same frontier) still collides — a genuine duplicate is rejected", () => {
    let c = worldlineCausalSeed("run");
    c = worldlineSpawn(c, "run", "run.child");
    // No intervening event → the parent frontier is unchanged → the child's key repeats → collision.
    expect(() => worldlineSpawn(c, "run", "run.child")).toThrow();
  });
});
