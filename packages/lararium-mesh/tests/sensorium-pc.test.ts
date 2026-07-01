/**
 * sensorium-pc — the native predictive-coding core: predict→error→precision→update, the
 * free-energy objective F = Σ π·ε² + complexity, and the critical-slowing-down forecast leg.
 * The pure TS twin of predictive_coding.py + bands_sidecar.forecast_ews (sensorium-rhymes.md
 * #the-predictive-upgrade), verified dependency-free.
 */
import { describe, test, expect } from "vitest";
import {
  CONFIDENCE_MAX,
  confidenceToPrecision,
  precisionToConfidence,
  ewmaPredict,
  ar1FitPredict,
  modelComplexity,
  planePc,
  freeEnergy,
  kendallTau,
  forecastEws,
} from "../src/index.js";

// ── the π ↔ confidence map — precision IS confidence-as-gain ────────────────────────────────

describe("precision = confidence-as-gain", () => {
  test("conf → π → conf round-trips; 10/20 is the neutral gain 1", () => {
    for (const conf of [0, 5, 10, 15, 19]) {
      expect(precisionToConfidence(confidenceToPrecision(conf))).toBeCloseTo(conf, 6);
    }
    expect(confidenceToPrecision(10)).toBeCloseTo(1, 9);
    expect(precisionToConfidence(1)).toBeCloseTo(10, 9);
    expect(CONFIDENCE_MAX).toBe(20);
  });

  test("a higher vow buys a higher gain (monotone)", () => {
    expect(confidenceToPrecision(15)).toBeGreaterThan(confidenceToPrecision(10));
  });
});

// ── the generative models ───────────────────────────────────────────────────────────────────

describe("the generative models g_i", () => {
  test("EWMA predicts causally and updates after the jump", () => {
    const pred = ewmaPredict([1, 1, 1, 5, 5], 0.5);
    expect(pred[0]).toBe(1);
    expect(pred[3]).toBeCloseTo(1, 6); // the jump to 5 was not yet seen when predicting frame 3
    expect(pred[4]).toBeGreaterThan(pred[3]); // updated toward the jump after seeing it
  });

  test("AR(1) fits 2 params and explains autoregressive variance", () => {
    const ar: number[] = [0];
    let seed = 42;
    const u = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let t = 1; t < 300; t++) ar.push(0.9 * ar[t - 1] + (u() - 0.5) * 0.6);
    const { pred, nParams } = ar1FitPredict(ar);
    expect(nParams).toBe(2);
    const resid = ar.slice(1).map((v, i) => v - pred[i + 1]);
    const rvar = resid.reduce((a, v) => a + v * v, 0) / resid.length;
    const m = ar.reduce((a, v) => a + v, 0) / ar.length;
    const svar = ar.reduce((a, v) => a + (v - m) * (v - m), 0) / ar.length;
    expect(rvar).toBeLessThan(svar);
  });

  test("modelComplexity is a positive MDL bit-cost", () => {
    expect(modelComplexity(2, 200)).toBeGreaterThan(0);
    expect(modelComplexity(0, 200)).toBe(0);
  });
});

// ── the loop emits SURPRISE, not raw features ───────────────────────────────────────────────

describe("the predict→error→precision→update loop", () => {
  const t = Array.from({ length: 200 }, (_, i) => i);
  const predictable = t.map((i) => Math.sin((2 * Math.PI * i) / 40) + i * 0.01);
  const noise: number[] = [];
  let seed = 7;
  const u = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 200; i++) noise.push((u() - 0.5) * 3.4);

  test("a forecastable stream carries less surprise than noise; output is the residual", () => {
    const rp = planePc(predictable, { model: "ar1" });
    const rn = planePc(noise, { model: "ar1" });
    expect(rp.surprise).toBeLessThan(rn.surprise);
    expect(rp.output.length).toBe(200);
    // the OUTPUT is the precision-weighted residual, not the observation
    expect(rp.output).not.toEqual(predictable);
  });

  test("bottom-up confidence tracks predictability", () => {
    const cp = planePc(predictable, { model: "ar1" }).estConfidence;
    const cn = planePc(noise, { model: "ar1" }).estConfidence;
    expect(cp).toBeGreaterThan(14);
    expect(cn).toBeGreaterThan(8);
    expect(cp).toBeGreaterThan(cn);
  });

  test("a top-down confidence VOW SETS the gain that weights ε²", () => {
    const neutral = planePc(noise, { model: "ewma" });
    const vowed = planePc(noise, { model: "ewma", confidence: 18 });
    expect(vowed.confidenceSource).toBe("vow");
    expect(vowed.precision).toBeCloseTo(confidenceToPrecision(18), 9);
    expect(vowed.surprise).toBeGreaterThan(neutral.surprise); // π = confidence WIRED
    expect(planePc(noise, { model: "ewma", confidence: 2 }).surprise).toBeLessThan(neutral.surprise);
  });

  test("graceful on empty / single-frame planes", () => {
    expect(planePc([]).surprise).toBe(0);
    expect(planePc([3]).surprise).toBe(0);
  });
});

// ── F = Σ π·ε² + complexity is computed and exposed ──────────────────────────────────────────

describe("the free-energy objective", () => {
  test("F = accuracy + complexity, per-plane, with a non-zero MDL term", () => {
    const t = Array.from({ length: 200 }, (_, i) => i);
    let seed = 4;
    const u = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const fe = freeEnergy(
      {
        content: t.map((i) => Math.sin((2 * Math.PI * i) / 40) + i * 0.01),
        bands: t.map(() => (u() - 0.5) * 3.4),
      },
      { model: "ar1" },
    );
    expect(fe.F).toBeCloseTo(fe.accuracy + fe.complexity, 9);
    expect(fe.complexity).toBeGreaterThan(0);
    expect(fe.perPlane.bands.surprise).toBeGreaterThan(fe.perPlane.content.surprise);
  });

  test("the FORM plane's complexity accepts the induction MDL bits directly", () => {
    const fe = freeEnergy(
      { content: [1, 2, 1, 2, 1, 2, 1, 2], form: [0, 0, 0, 0] },
      { formComplexityBits: 42.5 },
    );
    expect(fe.perPlane.form.complexity).toBe(42.5);
    expect(fe.F).toBeCloseTo(fe.accuracy + fe.complexity, 9);
  });
});

// ── the predictive bands leg — critical-slowing-down forecast ────────────────────────────────

describe("the EWS forecast leg", () => {
  test("kendallTau reads trend direction", () => {
    expect(kendallTau([0, 1, 2, 3, 4, 5])).toBeCloseTo(1, 6);
    expect(kendallTau([5, 4, 3, 2, 1, 0])).toBeCloseTo(-1, 6);
    expect(Math.abs(kendallTau([1, 1, 1, 1, 1]))).toBeLessThan(1e-9);
  });

  // an AR series whose coefficient ramps 0.2→0.95 (critical slowing down — rising lag-1-AC)
  function csdApproach(seed = 5, n = 360): number[] {
    let s = (seed >>> 0) || 1;
    const u = () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      s >>>= 0;
      return s / 0xffffffff;
    };
    const norm = () => Math.sqrt(-2 * Math.log(Math.max(u(), 1e-12))) * Math.cos(2 * Math.PI * u());
    const x = [0];
    for (let t = 1; t < n; t++) {
      const a = 0.2 + (0.95 - 0.2) * (t / n);
      x.push(a * x[t - 1] + 0.5 * norm());
    }
    return x;
  }

  test("fires on an approaching bifurcation (rising AC1 + surrogate-significant + multi-band)", () => {
    const fc = forecastEws(csdApproach(), { window: 50, nSurr: 300, alpha: 0.05, minBands: 2, seed: 1 });
    expect(fc.fired).toBe(true);
    expect(fc.ar1Tau).toBeGreaterThan(0);
    expect(fc.ar1P).toBeLessThanOrEqual(0.05); // surrogate-significant (the R keel)
    expect(fc.multiBandAgreement).toBe(true);
  });

  test("stays QUIET on a proper-stationary series (the anti-apophenia guard)", () => {
    let s = 99;
    const u = () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      s >>>= 0;
      return s / 0xffffffff;
    };
    const norm = () => Math.sqrt(-2 * Math.log(Math.max(u(), 1e-12))) * Math.cos(2 * Math.PI * u());
    const z = [0];
    for (let t = 1; t < 700; t++) z.push(0.5 * z[t - 1] + 0.5 * norm());
    const fc = forecastEws(z.slice(300), { window: 50, nSurr: 300, alpha: 0.05, seed: 1 });
    expect(fc.fired).toBe(false);
  });

  test("graceful on too-few samples", () => {
    const fc = forecastEws([1, 2, 3, 4, 5, 6]);
    expect(fc.fired).toBe(false);
    expect(fc.note).toContain("ews-skipped");
  });
});
