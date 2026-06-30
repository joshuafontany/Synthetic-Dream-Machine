/**
 * ffz-measure-servo — the ONE servo (the continuous→discrete Schmitt-trigger gong) and the
 * stage-two fluid-band threading.
 *
 * Proves: the Measure servo trips a gong on a synthetic cohesion-drop; the FLOOR stops churn
 * (no gong before minSegment); the CEIL stops staleness (a gong fires on a long coherent run);
 * a coherent run alone fires nothing; the Theme Arc-close + MDL guard scaffold reads true/false
 * as designed; buildPatch threads the committed Measure/Theme/Beat cells when supplied and stays
 * porous when not; ffzCoDepth still reads the ultrametric on the fuller address; and no
 * causal/edge/itc key rides the patch.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/ffz-clock
 */

import { describe, test, expect } from "vitest";
import {
  measureServoInit,
  measureStep,
  ffzCosine,
  ffzArcClosed,
  ffzAcceptRecluster,
  MEASURE_SERVO_DEFAULTS,
  ffzMembershipAddress,
  ffzCoDepth,
  FFZ_ABSENT,
  buildPatch,
  harvestTurnGradient,
} from "../src/index.js";

const h = () => harvestTurnGradient("Lares (Council): the verb leads");

/** Run a sequence of vectors through one servo, collecting (label, gonged) per step. */
function run(vectors: number[][], config = {}) {
  let state = measureServoInit();
  const steps: { label: string; gonged: boolean }[] = [];
  for (const v of vectors) {
    const r = measureStep(state, v, config);
    state = r.state;
    steps.push({ label: r.label, gonged: r.gonged });
  }
  return { state, steps, gongs: steps.filter((s) => s.gonged).length };
}

const jitter = (base: number[], n: number, eps = 0.01): number[][] =>
  Array.from({ length: n }, (_, i) => base.map((x) => x + ((i % 2 ? 1 : -1) * eps)));

describe("ffzCosine — zero-graceful cosine", () => {
  test("identical → 1, orthogonal → 0, a zero vector → 0 (not NaN)", () => {
    expect(ffzCosine([1, 0], [1, 0])).toBeCloseTo(1, 6);
    expect(ffzCosine([1, 0], [0, 1])).toBeCloseTo(0, 6);
    expect(ffzCosine([0, 0], [1, 0])).toBe(0);
  });
});

describe("measureStep — the one servo trips its gong on a cohesion-drop", () => {
  test("a coherent run then a sharp orthogonal turn → exactly one gong, ordinal increments", () => {
    // 8 members near [1,0] (a settled topic), then an orthogonal [0,1] (the topic shift).
    const { steps, gongs } = run([...jitter([1, 0], 8), [0, 1]]);
    expect(gongs).toBe(1);
    // the gong lands on the LAST (orthogonal) member, opening segment "1".
    expect(steps[steps.length - 1]).toEqual({ label: "1", gonged: true });
    // every prior member sat in segment "0".
    expect(steps.slice(0, 8).every((s) => s.label === "0" && !s.gonged)).toBe(true);
  });

  test("a coherent run alone fires NOTHING (the φ-band free-runs, no wavefront)", () => {
    const { gongs, steps } = run(jitter([1, 0], 20));
    expect(gongs).toBe(0);
    expect(steps.every((s) => s.label === "0")).toBe(true);
  });
});

describe("measureStep — FLOOR stops churn, CEIL stops staleness", () => {
  test("FLOOR: no gong before minSegment even on wild divergence", () => {
    // Alternating orthogonal members from the very first step — but the floor blocks a gong
    // until the current segment holds minSegment members.
    const min = MEASURE_SERVO_DEFAULTS.minSegment;
    const wild: number[][] = [];
    for (let i = 0; i < min; i++) wild.push(i % 2 ? [0, 1] : [1, 0]);
    const { steps } = run(wild);
    // none of the first `min` steps may gong (count never reaches the floor while armed).
    expect(steps.slice(0, min).every((s) => !s.gonged)).toBe(true);
  });

  test("CEIL: a long perfectly-coherent run forces a staleness gong at maxSegment", () => {
    const max = MEASURE_SERVO_DEFAULTS.maxSegment;
    const ident: number[][] = Array.from({ length: max + 2 }, () => [1, 0]); // identical → never a FAST drop
    const { steps, gongs } = run(ident);
    expect(gongs).toBeGreaterThanOrEqual(1); // the ceiling broke the stale segment
    // the forced gong lands at the (1-based) maxSegment-th member.
    const firstGong = steps.findIndex((s) => s.gonged);
    expect(firstGong).toBe(max); // 0-based index of the (max+1)th member = the count hit max
  });

  test("a tighter maxSegment forces the gong sooner (the ceiling is a real knob)", () => {
    const ident: number[][] = Array.from({ length: 10 }, () => [1, 0]);
    const { steps } = run(ident, { maxSegment: 5 });
    expect(steps.findIndex((s) => s.gonged)).toBe(5); // count hits 5 on the 6th (index 5) member
  });
});

describe("Theme — Arc-close trigger + MDL/modularity accept guard (scaffold)", () => {
  test("ffzArcClosed: rests only once idle clears the rest threshold", () => {
    expect(ffzArcClosed(5000, 3000)).toBe(true);
    expect(ffzArcClosed(1000, 3000)).toBe(false);
    expect(ffzArcClosed(5000, 0)).toBe(false); // a zero threshold never rests
  });

  test("ffzAcceptRecluster: a paying modularity gain accepts; a non-paying / negative one rejects", () => {
    expect(ffzAcceptRecluster({ prevModularity: 0.4, newModularity: 0.6, evidenceBits: 100, mdlBits: 4 })).toBe(true);
    expect(ffzAcceptRecluster({ prevModularity: 0.4, newModularity: 0.41, evidenceBits: 10, mdlBits: 4 })).toBe(false);
    expect(ffzAcceptRecluster({ prevModularity: 0.6, newModularity: 0.5, evidenceBits: 100, mdlBits: 4 })).toBe(false);
  });
});

describe("buildPatch wire — the fluid bands thread when committed, stay porous when not", () => {
  test("Measure + Beat + Theme thread into the full coarse→fine address", () => {
    const p = buildPatch(h(), "claude__sess1.jsonl", undefined, {
      theme: "c7",
      measure: "3",
      beat: "t9",
      pulse: "drwX",
    });
    expect(p["lar_ffz"]).toBe("session/c7.claude__sess1.3.t9.drwX");
  });

  test("Measure alone threads; Theme/Beat stay porous (the φ-bands free-run)", () => {
    const p = buildPatch(h(), "claude__sess1.jsonl", undefined, { measure: "3", pulse: "drwX" });
    expect(p["lar_ffz"]).toBe(`session/${FFZ_ABSENT}.claude__sess1.3.${FFZ_ABSENT}.drwX`);
  });

  test("ffzCoDepth still reads the ultrametric on the fuller address (same Theme.Arc.Measure)", () => {
    const a = buildPatch(h(), "claude__sess1.jsonl", undefined, { theme: "c7", measure: "3", pulse: "d1" });
    const b = buildPatch(h(), "claude__sess1.jsonl", undefined, { theme: "c7", measure: "3", pulse: "d2" });
    // share Theme + Arc + Measure (co-depth 3); Beat porous on both, Pulse diverges.
    expect(ffzCoDepth(String(a["lar_ffz"]), String(b["lar_ffz"]))).toBe(3);
  });

  test("a Measure gong divides co-depth: two members across the gong share only Theme.Arc", () => {
    const before = buildPatch(h(), "claude__sess1.jsonl", undefined, { theme: "c7", measure: "3", pulse: "d1" });
    const after = buildPatch(h(), "claude__sess1.jsonl", undefined, { theme: "c7", measure: "4", pulse: "d2" });
    expect(ffzCoDepth(String(before["lar_ffz"]), String(after["lar_ffz"]))).toBe(2); // Theme + Arc; Measure diverges
  });

  test("no causal/edge/itc key rides the fuller patch", () => {
    const p = buildPatch(h(), "claude__sess1.jsonl", undefined, { theme: "c7", measure: "3", beat: "t9", pulse: "drwX" });
    expect(Object.keys(p).some((k) => /causal|edge|happens|itc/i.test(k))).toBe(false);
  });
});
