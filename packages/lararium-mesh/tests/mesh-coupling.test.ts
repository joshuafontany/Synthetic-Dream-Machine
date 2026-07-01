/**
 * mesh-coupling — wiring the mesh's three child sensoria (who · authority · flow). The coupling
 * matrix is directed; with three children each pair conditions on the third, so a common driver
 * (flow driving who + authority) does NOT hallucinate a who↔authority edge.
 */
import { describe, test, expect } from "vitest";
import { coupleMeshChildren, type ChildSignal } from "../src/index.js";

function randSeq(n: number, seed: number, k = 2): number[] {
  let s = seed >>> 0; const a: number[] = [];
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; a.push(Math.floor((s / 4294967296) * k)); }
  return a;
}
const delay1 = (x: number[]): number[] => [0, ...x.slice(0, -1)];   // y[t]=x[t-1] → y[t+1]=x[t]
const child = (name: string, signal: number[]): ChildSignal => ({ name, signal });

describe("mesh-coupling — wire the child sensoria, phantom-guarded", () => {
  test("three independent children → coupling ≈ 0, SOVEREIGN, phantom-guarded", () => {
    const c = coupleMeshChildren([
      child("who", randSeq(600, 1)), child("authority", randSeq(600, 2)), child("flow", randSeq(600, 3)),
    ], 0.5);
    expect(c.phantomGuarded).toBe(true);
    expect(c.sovereign).toBe(true);
    expect(c.strongestEdge!.coupling).toBeLessThan(0.15);
  });

  test("a real drive (who → authority) surfaces as the strongest edge; NOT sovereign", () => {
    const who = randSeq(600, 5);
    const c = coupleMeshChildren([
      child("who", who), child("authority", delay1(who)), child("flow", randSeq(600, 9)),
    ], 0.5);
    expect(c.strongestEdge!.from).toBe("who");
    expect(c.strongestEdge!.to).toBe("authority");
    expect(c.strongestEdge!.coupling).toBeGreaterThan(0.5);
    expect(c.sovereign).toBe(false);
  });

  test("COMMON DRIVER: flow drives who AND authority → the who↔authority PHANTOM is removed", () => {
    const flow = randSeq(600, 7);
    const c = coupleMeshChildren([
      child("who", delay1(flow)), child("authority", delay1(flow)), child("flow", flow),
    ], 0.5);
    // who↔authority would look strongly coupled pairwise — but conditioning on flow dissolves it
    const iWho = 0, iAuth = 1;
    expect(c.te[iWho]![iAuth]).toBeLessThan(0.15);          // phantom removed
    // the GENUINE driver edges (flow → who, flow → authority) survive and dominate
    expect(c.strongestEdge!.from).toBe("flow");             // the real driver, not the phantom pair
    expect(c.strongestEdge!.coupling).toBeGreaterThan(c.te[iWho]![iAuth]);
  });

  test("non-three-child mesh falls back to pairwise (phantomGuarded=false), never silently pretends", () => {
    const c = coupleMeshChildren([child("a", randSeq(300, 1)), child("b", randSeq(300, 2))], 0.5);
    expect(c.phantomGuarded).toBe(false);
    expect(c.children).toEqual(["a", "b"]);
  });
});
