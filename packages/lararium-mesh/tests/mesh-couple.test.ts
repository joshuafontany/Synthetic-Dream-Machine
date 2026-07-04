/**
 * mesh-couple — the operational capstone: raw children → whiten → couple → significance-gate.
 * Independent children read fully sovereign (all edges gated away); a real coupling survives.
 */
import { describe, test, expect } from "vitest";
import { coupleMesh, makeArlDial, type ChildSignalMV } from "../src/index.js";

function gaussGen(seed: number): () => number {
  let s = seed >>> 0;
  const u = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s >>> 0) / 4294967296; };
  return () => Math.sqrt(-2 * Math.log(Math.max(u(), 1e-12))) * Math.cos(2 * Math.PI * u());
}
const vseq = (n: number, dims: number, g: () => number): number[][] =>
  Array.from({ length: n }, () => Array.from({ length: dims }, () => g()));
const child = (name: string, signal: number[][]): ChildSignalMV => ({ name, signal });

describe("mesh-couple — one call: whiten → couple → significance-gate", () => {
  test("three independent children → all edges gated away → fully SOVEREIGN", () => {
    const g = gaussGen(1);
    const c = coupleMesh([
      child("who", vseq(700, 2, g)), child("authority", vseq(700, 2, g)), child("flow", vseq(700, 2, g)),
    ]);
    expect(c.sovereign).toBe(true);
    expect(c.strongestEdge).toBeNull();                     // nothing survived significance
    expect(c.te.flat().every((v) => v === 0)).toBe(true);
  });

  test("a real coupling (who → authority) SURVIVES the gate as the strongest edge", () => {
    const g = gaussGen(3);
    const who = vseq(700, 1, g);
    const authority: number[][] = [[g()]];
    for (let t = 1; t < 700; t++) authority.push([who[t - 1]![0]! + 0.3 * g()]);
    const c = coupleMesh([
      child("who", who), child("authority", authority), child("flow", vseq(700, 1, g)),
    ]);
    expect(c.strongestEdge).not.toBeNull();
    expect(c.strongestEdge!.from).toBe("who");
    expect(c.strongestEdge!.to).toBe("authority");
    expect(c.sovereign).toBe(false);
    expect(c.phantomGuarded).toBe(true);
  });

  test("the ARL₀ dial governs the significance gate (a loose dial opens edges the reference zeroes)", () => {
    const g = gaussGen(1);
    const kids = [child("who", vseq(700, 2, g)), child("authority", vseq(700, 2, g)), child("flow", vseq(700, 2, g))];
    // reference α (no dial) → independents fully gated, every edge zeroed.
    expect(coupleMesh(kids).te.flat().every((v) => v === 0)).toBe(true);
    // a loose dial (ARL₀=1 → α=1) reaches significantCMI and opens the gate — finite-sample noise edges survive.
    expect(coupleMesh(kids, { dial: makeArlDial(1) }).te.flat().some((v) => v > 0)).toBe(true);
  });

  test("whiten:false still runs the pipeline (couple + significance on raw signals)", () => {
    const g = gaussGen(5);
    const c = coupleMesh(
      [child("a", vseq(500, 1, g)), child("b", vseq(500, 1, g)), child("d", vseq(500, 1, g))],
      { whiten: false },
    );
    expect(c.children).toEqual(["a", "b", "d"]);
    expect(c.sovereign).toBe(true);                         // independents → sovereign
  });
});
