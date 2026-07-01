/**
 * windowed-coupling — the streaming runtime: warming under the floor, emit over the window,
 * reset at a regime shift. The full Window policy, not a fixed window.
 */
import { describe, test, expect } from "vitest";
import { windowInit, windowPush, windowLengthFor, type WindowConfig } from "../src/index.js";

function gaussGen(seed: number): () => number {
  let s = seed >>> 0;
  const u = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s >>> 0) / 4294967296; };
  return () => Math.sqrt(-2 * Math.log(Math.max(u(), 1e-12))) * Math.cos(2 * Math.PI * u());
}

describe("windowed-coupling — the streaming coupling runtime", () => {
  test("windowLengthFor = k·d_joint (the estimator floor)", () => {
    expect(windowLengthFor(4, 15)).toBe(60);
    expect(windowLengthFor(10)).toBe(150);
  });

  test("WARMING under the floor, then EMITS a coupling that finds who → authority", () => {
    const g = gaussGen(3);
    const config: WindowConfig = { L: 120, floor: 100, lag: 1 };
    let st = windowInit(["who", "authority", "flow"]);
    let warmingTicks = 0, lastCoupling = null as null | ReturnType<typeof windowPush>["out"]["coupling"];
    let prevWho = [g()];
    for (let t = 0; t < 135; t++) {
      const who = [g()];
      const authority = [prevWho[0]! + 0.3 * g()];   // authority[t] = who[t-1] + noise
      const flow = [g()];
      prevWho = who;
      const { state, out } = windowPush(st, [who, authority, flow], config);
      st = state;
      if (out.warming) warmingTicks++;
      if (out.coupling) lastCoupling = out.coupling;
    }
    expect(warmingTicks).toBeGreaterThanOrEqual(99);      // warming while filling to the floor
    expect(lastCoupling).not.toBeNull();
    expect(lastCoupling!.strongestEdge!.from).toBe("who");
    expect(lastCoupling!.strongestEdge!.to).toBe("authority");
  });

  test("a change-point RESET fires at a regime shift and re-warms", () => {
    const g = gaussGen(5);
    const config: WindowConfig = { L: 200, floor: 40, detectMin: 20, changeThreshold: 3, lag: 1 };
    let st = windowInit(["a", "b", "c"]);
    let resetFired = false;
    // 60 ticks of regime A ~ N(0,1)
    for (let t = 0; t < 60; t++) ({ state: st } = windowPush(st, [[g()], [g()], [g()]], config));
    // then regime B ~ N(9,1) — the shift should trip a reset
    for (let t = 0; t < 60; t++) {
      const { state, out } = windowPush(st, [[9 + g()], [9 + g()], [9 + g()]], config);
      st = state;
      if (out.reset) resetFired = true;
    }
    expect(resetFired).toBe(true);
  });

  test("HOP controls emit cadence — coupling emitted only every `hop` ticks past the floor", () => {
    const g = gaussGen(7);
    const config: WindowConfig = { L: 60, floor: 50, hop: 5, lag: 1 };
    let st = windowInit(["a", "b", "c"]);
    let emits = 0;
    for (let t = 0; t < 70; t++) {
      const { state, out } = windowPush(st, [[g()], [g()], [g()]], config);
      st = state;
      if (out.coupling) emits++;
    }
    // past the floor (~ticks 50-70 = 20 ticks), emit every 5 → ~4 emits, far fewer than 20
    expect(emits).toBeGreaterThan(0);
    expect(emits).toBeLessThan(8);
  });
});
