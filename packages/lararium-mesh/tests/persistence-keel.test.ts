/**
 * persistence-keel — the collapsed lifecycle: born silent · one signed `witness` verb (Cut A) ·
 * standing/voice DERIVE at read · maturation mode = the half-life (witness ⊥ affinity) · the
 * merged `admit` gate (Cut B).
 */
import { describe, test, expect } from "vitest";
import {
  recordTestimony, witness, reentryPrior, admit, maturationMode, WITNESS_POLICY,
  STANDING_FLOOR, STANDING_CEILING, type PersistencePolicy,
} from "../src/index.js";

const prov = { signer: "vessel-A", frontier: "f0" };
const born = () => recordTestimony("innovation", [1, 2, 3], prov);
const vouch = (signer: string, frontier: string, tick?: number) => ({ signer, frontier, polarity: 1 as const, ...(tick !== undefined ? { tick } : {}) });
const beat = (signer: string, frontier: string) => ({ signer, frontier, polarity: -1 as const });

describe("persistence-keel — the standing law (witness mode)", () => {
  test("born silent at the floor", () => {
    const p = reentryPrior(born());
    expect(p.voice).toBe("silent");
    expect(p.standing).toBe(STANDING_FLOOR);
    expect(p.value).toEqual([1, 2, 3]);
  });

  test("frequency-capture defense: the SAME signer 100× never speaks it", () => {
    let t = born();
    for (let i = 0; i < 100; i++) t = witness(t, vouch("vessel-A", `f${i}`));  // self-signer, weighs zero
    expect(reentryPrior(t).voice).toBe("silent");
    expect(t.witnesses).toHaveLength(100);
  });

  test("one distinct signer speaks it; repeats of that witness add nothing", () => {
    let t = witness(born(), vouch("vessel-B", "f1"));
    const s1 = reentryPrior(t).standing;
    expect(reentryPrior(t).voice).toBe("spoken");
    expect(s1).toBeGreaterThan(STANDING_FLOOR);
    for (let i = 0; i < 10; i++) t = witness(t, vouch("vessel-B", `f${i + 2}`));
    expect(reentryPrior(t).standing).toBe(s1);            // count buys nothing
  });

  test("many distinct signers grow standing but never past the ceiling (kapu is talk-story's)", () => {
    let t = born();
    for (let i = 0; i < 50; i++) t = witness(t, vouch(`vessel-W${i}`, `f${i}`));
    expect(reentryPrior(t).standing).toBe(STANDING_CEILING);
  });

  test("a defeat (−1) re-silences to the floor and deletes NOTHING", () => {
    let t = witness(born(), vouch("vessel-B", "f1"));
    t = witness(t, beat("vessel-C", "f2"));
    expect(reentryPrior(t).voice).toBe("silent");
    expect(reentryPrior(t).standing).toBe(STANDING_FLOOR);
    expect(t.witnesses).toHaveLength(2);                  // move-not-delete
  });

  test("re-speaking needs a witness FRESHER than the defeat", () => {
    let t = witness(born(), vouch("vessel-B", "f1"));
    t = witness(t, beat("vessel-C", "f2"));
    t = witness(t, vouch("vessel-B", "f3"));              // fresh, past the defeat
    expect(reentryPrior(t).voice).toBe("spoken");
  });

  test("witness is immutable — the prior record never mutates", () => {
    const t = born();
    witness(t, vouch("vessel-B", "f1"));
    expect(t.witnesses).toHaveLength(0);
  });

  test("the record is content + witness-log only — no stored standing/voice", () => {
    const t = witness(born(), vouch("vessel-B", "f1"));
    expect(Object.keys(t).sort()).toEqual(["assertion", "kind", "provenance", "pubinfo", "witnesses"]);
  });
});

describe("persistence-keel — maturation mode = the half-life", () => {
  test("mode derives from halfLife", () => {
    expect(maturationMode(WITNESS_POLICY)).toBe("witness");
    expect(maturationMode({ admitThreshold: 0.5, halfLife: 1000 })).toBe("affinity");
  });

  const affinity: PersistencePolicy = { admitThreshold: 0.5, halfLife: 100 };

  test("witness mode never cools; affinity mode cools an aged witness toward the floor", () => {
    const t = witness(born(), vouch("vessel-B", "f1", 0));   // vouched at tick 0
    // witness mode (or now===recording): full standing
    const fresh = reentryPrior(t, affinity, 0).standing;
    expect(fresh).toBeGreaterThan(STANDING_FLOOR);
    // affinity mode, long after the half-life: standing decays toward the floor
    const aged = reentryPrior(t, affinity, 1000).standing;   // 10 half-lives
    expect(aged).toBeLessThan(fresh);
    expect(aged).toBeCloseTo(STANDING_FLOOR, 1);
    // the SAME testimony under witness mode ignores age — never cools
    expect(reentryPrior(t, WITNESS_POLICY, 1000).standing).toBe(fresh);
  });

  test("re-vouching in affinity mode refreshes the decayed standing", () => {
    let t = witness(born(), vouch("vessel-B", "f1", 0));
    const aged = reentryPrior(t, affinity, 1000).standing;
    t = witness(t, vouch("vessel-B", "f2", 1000));           // same signer, re-vouched fresh
    const revived = reentryPrior(t, affinity, 1000).standing;
    expect(revived).toBeGreaterThan(aged);
  });
});

describe("persistence-keel — the admit gate (score+gate merged)", () => {
  const population = Array.from({ length: 40 }, (_, i) => [10 + (i % 5) * 0.1, -3 + (i % 7) * 0.05]);

  test("a near-duplicate is refused; an outlier admits", () => {
    expect(admit([10.2, -2.85], population).admit).toBe(false);
    expect(admit([40, 12], population).admit).toBe(true);
  });

  test("the first light is always novel (empty population admits)", () => {
    expect(admit([1, 2], []).admit).toBe(true);
    expect(admit([1, 2], []).score).toBe(Infinity);
  });

  test("the threshold is a policy dial — a stricter policy refuses more", () => {
    const strict: PersistencePolicy = { admitThreshold: 100, halfLife: null };
    expect(admit([10.5, -2.7], population, strict).admit).toBe(false);
  });
});
