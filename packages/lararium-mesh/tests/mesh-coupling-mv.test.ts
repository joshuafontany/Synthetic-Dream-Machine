/**
 * mesh-coupling-mv — the default multivariate coupling: continuous vectors, native Gaussian
 * conditional-TE, full-conditioned (each edge on all others jointly). Independent → sovereign;
 * a real drive surfaces as the strongest edge; a common driver's phantom is conditioned away.
 */
import { describe, test, expect } from "vitest";
import { coupleMeshChildrenMV, type ChildSignalMV } from "../src/index.js";

function gaussGen(seed: number): () => number {
  let s = seed >>> 0;
  const u = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s >>> 0) / 4294967296; };
  return () => Math.sqrt(-2 * Math.log(Math.max(u(), 1e-12))) * Math.cos(2 * Math.PI * u());
}
const vseq = (n: number, dims: number, g: () => number): number[][] =>
  Array.from({ length: n }, () => Array.from({ length: dims }, () => g()));
const child = (name: string, signal: number[][]): ChildSignalMV => ({ name, signal });

describe("mesh-coupling-mv — the default vector coupling", () => {
  test("three independent vector children → coupling ≈ 0, SOVEREIGN, phantom-guarded", () => {
    const g = gaussGen(1);
    const c = coupleMeshChildrenMV([
      child("who", vseq(700, 2, g)), child("authority", vseq(700, 2, g)), child("flow", vseq(700, 2, g)),
    ], 0.5);
    expect(c.phantomGuarded).toBe(true);
    expect(c.sovereign).toBe(true);
    expect(c.strongestEdge!.coupling).toBeLessThan(0.2);
  });

  test("a real drive (who → authority) surfaces as the strongest edge; NOT sovereign", () => {
    const g = gaussGen(3);
    const who = vseq(700, 1, g);
    const authority: number[][] = [[g()]];
    for (let t = 1; t < 700; t++) authority.push([who[t - 1]![0]! + 0.3 * g()]);
    const c = coupleMeshChildrenMV([
      child("who", who), child("authority", authority), child("flow", vseq(700, 1, g)),
    ], 0.5);
    expect(c.strongestEdge!.from).toBe("who");
    expect(c.strongestEdge!.to).toBe("authority");
    expect(c.sovereign).toBe(false);
  });

  test("COMMON DRIVER (flow → who instant, → authority lagged) → who↔authority phantom conditioned away", () => {
    const g = gaussGen(7);
    const flow = vseq(800, 1, g);
    const who: number[][] = [];
    for (let t = 0; t < 800; t++) who.push([flow[t]![0]! + 0.3 * g()]);            // instant
    const authority: number[][] = [[g()]];
    for (let t = 1; t < 800; t++) authority.push([flow[t - 1]![0]! + 0.3 * g()]);  // lagged
    const c = coupleMeshChildrenMV([
      child("who", who), child("authority", authority), child("flow", flow),
    ], 0.5);
    // who→authority (index 0→1) conditioned on flow → the phantom is small
    expect(c.te[0]![1]!).toBeLessThan(0.2);
    // a genuine flow→ edge dominates, not the phantom pair
    expect(c.strongestEdge!.from).toBe("flow");
  });

  test("two children → phantomGuarded=false (no third to condition on)", () => {
    const g = gaussGen(9);
    const c = coupleMeshChildrenMV([child("a", vseq(400, 1, g)), child("b", vseq(400, 1, g))], 0.5);
    expect(c.phantomGuarded).toBe(false);
    expect(c.children).toEqual(["a", "b"]);
  });
});
