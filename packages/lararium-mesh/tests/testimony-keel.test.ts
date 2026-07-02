/**
 * testimony-keel — the precision law: born silent · corroboration-not-count · defeat re-silences
 * without deleting · voice/confidence DERIVE at read (never stored) · the surprise gate.
 */
import { describe, test, expect } from "vitest";
import {
  recordTestimony, corroborate, defeat, reentryPrior, surpriseGate, surpriseScore,
  CONFIDENCE_FLOOR, CONFIDENCE_CEILING,
} from "../src/index.js";

const prov = { signer: "vessel-A", frontier: "f0" };
const born = () => recordTestimony("innovation", [1, 2, 3], prov);

describe("testimony-keel — born silent, matured by independence alone", () => {
  test("a fresh testimony reads silent at the floor confidence", () => {
    const p = reentryPrior(born());
    expect(p.voice).toBe("silent");
    expect(p.confidence).toBe(CONFIDENCE_FLOOR);
    expect(p.value).toEqual([1, 2, 3]);
  });

  test("frequency-capture defense: the SAME signer corroborating 100× never speaks it", () => {
    let t = born();
    for (let i = 0; i < 100; i++) t = corroborate(t, { signer: "vessel-A", frontier: `f${i}` });
    const p = reentryPrior(t);
    expect(p.voice).toBe("silent");
    expect(p.confidence).toBe(CONFIDENCE_FLOOR);
    expect(t.corroborations).toHaveLength(100);            // recorded honestly, weighed at zero
  });

  test("one DISTINCT signer speaks it; repeats of that same witness add nothing more", () => {
    let t = corroborate(born(), { signer: "vessel-B", frontier: "f1" });
    expect(reentryPrior(t).voice).toBe("spoken");
    const c1 = reentryPrior(t).confidence;
    expect(c1).toBeGreaterThan(CONFIDENCE_FLOOR);
    for (let i = 0; i < 10; i++) t = corroborate(t, { signer: "vessel-B", frontier: `f${i + 2}` });
    expect(reentryPrior(t).confidence).toBe(c1);           // count buys nothing
  });

  test("many distinct signers grow confidence but NEVER into the Canon band (ceiling 16)", () => {
    let t = born();
    for (let i = 0; i < 50; i++) t = corroborate(t, { signer: `vessel-W${i}`, frontier: `f${i}` });
    expect(reentryPrior(t).confidence).toBe(CONFIDENCE_CEILING); // Canon (17+) is talk-story's alone
  });

  test("defeat re-silences to the floor and deletes NOTHING", () => {
    const spoken = corroborate(born(), { signer: "vessel-B", frontier: "f1" });
    const beaten = defeat(spoken, { signer: "vessel-C", frontier: "f2" });
    const p = reentryPrior(beaten);
    expect(p.voice).toBe("silent");
    expect(p.confidence).toBe(CONFIDENCE_FLOOR);
    expect(beaten.corroborations).toHaveLength(1);         // history intact (move-not-delete)
    expect(beaten.defeats).toHaveLength(1);
  });

  test("re-speaking needs corroboration FRESHER than the defeat — old fluency doesn't re-earn", () => {
    const beaten = defeat(corroborate(born(), { signer: "vessel-B", frontier: "f1" }), { signer: "vessel-C", frontier: "f2" });
    // the pre-defeat witness vouching again (a NEW edge, past the defeat) re-earns the voice
    const respoken = corroborate(beaten, { signer: "vessel-B", frontier: "f3" });
    const p = reentryPrior(respoken);
    expect(p.voice).toBe("spoken");
    expect(p.confidence).toBeGreaterThan(CONFIDENCE_FLOOR);
  });

  test("transitions are immutable — the prior record never mutates", () => {
    const t = born();
    corroborate(t, { signer: "vessel-B", frontier: "f1" });
    defeat(t, { signer: "vessel-C", frontier: "f2" });
    expect(t.corroborations).toHaveLength(0);
    expect(t.defeats).toHaveLength(0);
  });

  test("nothing persisted claims voice/confidence — the record is content + histories only", () => {
    const t = corroborate(born(), { signer: "vessel-B", frontier: "f1" });
    expect(Object.keys(t).sort()).toEqual(["assertion", "corroborations", "defeats", "kind", "provenance", "pubinfo"]);
  });
});

describe("testimony-keel — the surprise gate (admission by novel information)", () => {
  const population = Array.from({ length: 40 }, (_, i) => [10 + (i % 5) * 0.1, -3 + (i % 7) * 0.05]);

  test("a near-duplicate of the population scores ≈0 and is refused", () => {
    const g = surpriseGate([10.2, -2.85], population);     // sits inside the population cloud
    expect(g.score).toBeLessThan(0.5);
    expect(g.admit).toBe(false);
  });

  test("a genuine outlier scores high and admits", () => {
    const g = surpriseGate([40, 12], population);
    expect(g.score).toBeGreaterThan(0.5);
    expect(g.admit).toBe(true);
  });

  test("the first light is always novel (empty population admits)", () => {
    expect(surpriseScore([1, 2], [])).toBe(Infinity);
    expect(surpriseGate([1, 2], []).admit).toBe(true);
  });
});
