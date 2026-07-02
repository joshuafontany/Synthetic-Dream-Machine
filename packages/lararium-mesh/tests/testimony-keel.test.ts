/**
 * testimony-keel — the keystone lifecycle: born silent · corroboration-not-count · defeat
 * re-silences without deleting · the FEP re-entry prior · the surprise gate at admission.
 */
import { describe, test, expect } from "vitest";
import {
  recordTestimony, corroborate, defeat, reentryPrior, surpriseGate, surpriseScore,
  PRECISION_FLOOR, PRECISION_CEILING,
} from "../src/index.js";

const prov = { signer: "vessel-A", frontier: "f0" };
const born = () => recordTestimony("innovation", [1, 2, 3], prov);

describe("testimony-keel — born silent, matured by independence alone", () => {
  test("a fresh testimony sits silent at the floor precision", () => {
    const t = born();
    expect(t.voice).toBe("silent");
    expect(t.precision).toBe(PRECISION_FLOOR);
    expect(t.assertion).toEqual([1, 2, 3]);
  });

  test("frequency-capture defense: the SAME signer corroborating 100× never speaks it", () => {
    let t = born();
    for (let i = 0; i < 100; i++) t = corroborate(t, { signer: "vessel-A", frontier: `f${i}` });
    expect(t.voice).toBe("silent");
    expect(t.precision).toBe(PRECISION_FLOOR);
    expect(t.corroborations).toHaveLength(100);            // recorded honestly…
    expect(t.corroborations.every((c) => !c.independent)).toBe(true); // …at zero weight
  });

  test("one DISTINCT signer speaks it; repeats of that same witness add nothing more", () => {
    let t = corroborate(born(), { signer: "vessel-B", frontier: "f1" });
    expect(t.voice).toBe("spoken");
    const p1 = t.precision;
    expect(p1).toBeGreaterThan(PRECISION_FLOOR);
    for (let i = 0; i < 10; i++) t = corroborate(t, { signer: "vessel-B", frontier: `f${i + 2}` });
    expect(t.precision).toBe(p1);                          // count buys nothing
  });

  test("many distinct signers grow precision but NEVER into the Canon band (ceiling 16)", () => {
    let t = born();
    for (let i = 0; i < 50; i++) t = corroborate(t, { signer: `vessel-W${i}`, frontier: `f${i}` });
    expect(t.precision).toBe(PRECISION_CEILING);
    expect(t.precision).toBeLessThan(17);                  // Canon settles by talk-story only
  });

  test("defeat re-silences to the floor and deletes NOTHING", () => {
    const spoken = corroborate(born(), { signer: "vessel-B", frontier: "f1" });
    const beaten = defeat(spoken, { signer: "vessel-C", frontier: "f2" });
    expect(beaten.voice).toBe("silent");
    expect(beaten.precision).toBe(PRECISION_FLOOR);
    expect(beaten.corroborations).toHaveLength(1);         // history intact (move-not-delete)
    expect(beaten.defeats).toHaveLength(1);
  });

  test("re-speaking needs corroboration FRESHER than the defeat — old fluency doesn't re-earn", () => {
    const beaten = defeat(corroborate(born(), { signer: "vessel-B", frontier: "f1" }), { signer: "vessel-C", frontier: "f2" });
    // the pre-defeat witness vouching again (a NEW edge, past the defeat) re-earns the voice
    const respoken = corroborate(beaten, { signer: "vessel-B", frontier: "f3" });
    expect(respoken.voice).toBe("spoken");
    expect(respoken.precision).toBeGreaterThan(PRECISION_FLOOR);
  });

  test("transitions are immutable — the prior record never mutates", () => {
    const t = born();
    corroborate(t, { signer: "vessel-B", frontier: "f1" });
    defeat(t, { signer: "vessel-C", frontier: "f2" });
    expect(t.voice).toBe("silent");
    expect(t.corroborations).toHaveLength(0);
    expect(t.defeats).toHaveLength(0);
  });
});

describe("testimony-keel — the FEP re-entry prior (weighed, never obeyed)", () => {
  test("silent returns at the floor; spoken returns the earned precision", () => {
    const t = born();
    expect(reentryPrior(t)).toEqual({ value: [1, 2, 3], precision: PRECISION_FLOOR, voice: "silent" });
    const s = corroborate(t, { signer: "vessel-B", frontier: "f1" });
    const p = reentryPrior(s);
    expect(p.voice).toBe("spoken");
    expect(p.precision).toBeGreaterThan(PRECISION_FLOOR);
    expect(p.precision).toBeLessThanOrEqual(PRECISION_CEILING);
  });
});

describe("testimony-keel — the surprise gate (admission by novel information)", () => {
  const population = Array.from({ length: 40 }, (_, i) => [10 + (i % 5) * 0.1, -3 + (i % 7) * 0.05]);

  test("a near-duplicate of the population scores ≈0 and is refused", () => {
    const dupe = [10.2, -2.85];                            // sits inside the population cloud
    const g = surpriseGate(dupe, population);
    expect(g.score).toBeLessThan(0.5);
    expect(g.admit).toBe(false);
  });

  test("a genuine outlier scores high and admits", () => {
    const novel = [40, 12];
    const g = surpriseGate(novel, population);
    expect(g.score).toBeGreaterThan(0.5);
    expect(g.admit).toBe(true);
  });

  test("the first light is always novel (empty population admits)", () => {
    expect(surpriseScore([1, 2], [])).toBe(Infinity);
    expect(surpriseGate([1, 2], []).admit).toBe(true);
  });

  test("the refusal is honest — the score travels with the verdict", () => {
    const g = surpriseGate([10.2, -2.85], population);
    expect(typeof g.score).toBe("number");
    expect(g.score).toBeGreaterThanOrEqual(0);
  });
});
