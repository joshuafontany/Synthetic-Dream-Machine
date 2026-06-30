/**
 * ffz-measure-parity — THE PARITY GUARD for the C-0 collapse (measureStep ⊂ quorumStep).
 *
 * The collapse routes the one-plane Measure path through {@link quorumStep} at N=1 (content as
 * plane-0). This guard PINS that the collapse did NOT move 1-plane output: it embeds the EXACT
 * pre-collapse measureStep (`legacyMeasureStep` below, verbatim) and asserts the NEW measureStep
 * yields BYTE-IDENTICAL segment labels + gong flags on the fixtures the orchestrator + servo
 * tests exercise (the one-hot sessionA/sessionB topic-shift, the jitter-coherent run, the
 * orthogonal turn, the FLOOR churn-guard, the CEIL staleness force). If this fails, the collapse
 * is wrong — fix until identical.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/ffz-clock
 */

import { describe, test, expect } from "vitest";
import { measureServoInit, measureStep, ffzCosine } from "../src/index.js";

// ── The PRE-COLLAPSE measureStep, embedded verbatim (the golden reference) ──────────────────
const LEGACY_DEFAULTS = {
  zThreshold: 3.0, zFloor: 1.0, ewmaAlpha: 0.3, hazardLambda: 12,
  ageRelax: 0.05, mdlBits: 4.0, minSegment: 3, maxSegment: 48, reArmZ: 0.5,
};
const EPS = 1e-9;
const VAR_SEED = 0.01;

interface LegacyState {
  centroid: readonly number[] | null;
  count: number;
  cohMean: number;
  cohVar: number;
  lambdaEff: number;
  segmentOrdinal: number;
  armed: boolean;
}

function legacyInit(): LegacyState {
  return { centroid: null, count: 0, cohMean: 1, cohVar: 0.01, lambdaEff: NaN, segmentOrdinal: 0, armed: true };
}

function legacyStep(
  state: LegacyState,
  vector: readonly number[],
  config: Partial<typeof LEGACY_DEFAULTS> = {},
): { state: LegacyState; label: string; gonged: boolean } {
  const cfg = { ...LEGACY_DEFAULTS, ...config };
  const lambda = Number.isNaN(state.lambdaEff) ? cfg.hazardLambda : state.lambdaEff;

  if (state.centroid == null || state.count === 0) {
    const next: LegacyState = {
      centroid: [...vector], count: 1, cohMean: 1, cohVar: VAR_SEED,
      lambdaEff: lambda, segmentOrdinal: state.segmentOrdinal, armed: true,
    };
    return { state: next, label: String(state.segmentOrdinal), gonged: false };
  }

  const coh = ffzCosine(vector, state.centroid);
  const sd = Math.sqrt(state.cohVar + EPS);
  const z = (state.cohMean - coh) / sd;
  const surpriseBits = (z * z) / (2 * Math.LN2);
  const effZ = Math.max(cfg.zFloor, cfg.zThreshold - cfg.ageRelax * Math.max(0, state.count - lambda));
  const ceil = state.count >= cfg.maxSegment;
  const floored = state.count < cfg.minSegment;
  const fastFire = state.armed && !floored && z > effZ && surpriseBits > cfg.mdlBits;
  const gong = ceil || fastFire;

  if (gong) {
    const lambdaEff = (1 - cfg.ewmaAlpha) * lambda + cfg.ewmaAlpha * state.count;
    const ordinal = state.segmentOrdinal + 1;
    const next: LegacyState = {
      centroid: [...vector], count: 1, cohMean: 1, cohVar: VAR_SEED,
      lambdaEff, segmentOrdinal: ordinal, armed: false,
    };
    return { state: next, label: String(ordinal), gonged: true };
  }

  const k = state.count;
  const centroid = state.centroid.map((c, i) => (c * k + (vector[i] ?? 0)) / (k + 1));
  const dev = coh - state.cohMean;
  const cohMean = (1 - cfg.ewmaAlpha) * state.cohMean + cfg.ewmaAlpha * coh;
  const cohVar = (1 - cfg.ewmaAlpha) * state.cohVar + cfg.ewmaAlpha * dev * dev;
  const armed = state.armed || z <= cfg.reArmZ;
  const next: LegacyState = {
    centroid, count: k + 1, cohMean, cohVar, lambdaEff: lambda,
    segmentOrdinal: state.segmentOrdinal, armed,
  };
  return { state: next, label: String(state.segmentOrdinal), gonged: false };
}

// ── runners ─────────────────────────────────────────────────────────────────────────────────
type Trace = { label: string; gonged: boolean }[];

function runLegacy(vectors: number[][], config = {}): Trace {
  let st = legacyInit();
  const out: Trace = [];
  for (const v of vectors) {
    const r = legacyStep(st, v, config);
    st = r.state;
    out.push({ label: r.label, gonged: r.gonged });
  }
  return out;
}

function runNew(vectors: number[][], config = {}): Trace {
  let st = measureServoInit();
  const out: Trace = [];
  for (const v of vectors) {
    const r = measureStep(st, v, config);
    st = r.state;
    out.push({ label: r.label, gonged: r.gonged });
  }
  return out;
}

// ── fixtures (the one-hot + jitter patterns the servo + orchestrator tests ride) ─────────────
const vec = (axis: number): number[] => {
  const v = new Array(8).fill(0);
  v[axis] = 1;
  return v;
};
const jitter = (base: number[], n: number, eps = 0.01): number[][] =>
  Array.from({ length: n }, (_, i) => base.map((x) => x + ((i % 2 ? 1 : -1) * eps)));

const FIXTURES: { name: string; vectors: number[][]; config?: Record<string, number> }[] = [
  { name: "sessionA — a one-hot topic shift (axis0×3 → axis1×3)", vectors: [...[0, 0, 0].map(() => vec(0)), ...[1, 1, 1].map(() => vec(1))] },
  { name: "sessionB — coherent throughout (axis0×2)", vectors: [vec(0), vec(0)] },
  { name: "coherent jitter run (no gong)", vectors: jitter([1, 0], 20) },
  { name: "8 coherent then an orthogonal turn", vectors: [...jitter([1, 0], 8), [0, 1]] },
  { name: "FLOOR — alternating divergence below minSegment", vectors: [vec(1), vec(0), vec(1)] },
  { name: "CEIL — a long perfectly-coherent run forces a staleness gong", vectors: Array.from({ length: 50 }, () => [1, 0]) },
  { name: "CEIL — a tighter maxSegment forces the gong sooner", vectors: Array.from({ length: 10 }, () => [1, 0]), config: { maxSegment: 5 } },
];

describe("PARITY GUARD — collapsed N=1 measureStep is byte-identical to the pre-collapse servo", () => {
  for (const fx of FIXTURES) {
    test(fx.name, () => {
      const legacy = runLegacy(fx.vectors, fx.config ?? {});
      const collapsed = runNew(fx.vectors, fx.config ?? {});
      expect(collapsed).toEqual(legacy);
    });
  }
});
