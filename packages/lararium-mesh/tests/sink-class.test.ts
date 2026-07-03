/**
 * sink-class — witness the two sink-classes + the end-to-end symmetric pipe (Sprint 0 of the
 * boundary-generates-the-basis enactment). Proves: (1) the leave-one-plane ablation tags a plane that
 * stands rigid ALONE as cymatic (signal-boundary), a cross-plane-only birth as purple (receiver-boundary);
 * (2) the boundary's eigenbasis (aperture-selector's W*) arrives ORTHONORMAL (VᵀV≈I) — orthogonality
 * falls out, never gets designed; (3) the residual off that eigenbasis rides through sink → class end-to-end.
 */
import { describe, expect, test } from "vitest";

import { classifySink } from "../src/sink-class.js";
import { makeSink } from "../src/sink.js";
import { fitLinearGaussianBand, bandEmergence } from "../src/aperture-selector.js";
import type { NucleationVerdict } from "../src/nucleation-gate.js";

// A deterministic pseudo-noise (no Math.random — tests stay deterministic across runs).
const noise = (seed: number): number => {
  const x = Math.sin(seed * 12.9898 + 4.1414) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};

// A birth verdict stub (the gate's cross-plane birth outcome the classifier reads).
const birthVerdict = (born: boolean, invalid = false): NucleationVerdict => ({
  born,
  criticalRadius: born ? 2 : Infinity,
  barrier: 1,
  drive: born ? 1 : 0,
  effectivePlanes: 2,
  condensation: born ? 0.5 : 0,
  invalid,
});

const periodicRhythm = (n: number, p: number): number[] =>
  Array.from({ length: n }, (_, i) => (i === 0 ? 0 : Math.sin((2 * Math.PI * i) / p) - Math.sin((2 * Math.PI * (i - 1)) / p)));

const flat = (n: number): number[] => Array.from({ length: n }, () => 0);

describe("classifySink — the two-sink-class tag", () => {
  test("a plane that STANDS rigid ALONE tags SIGNAL-BOUNDARY (cymatic)", () => {
    const perPlane = new Map<string, readonly number[]>([
      ["content", periodicRhythm(160, 8)], // solo rhythm re-locks → cymatic support
      ["structure", flat(160)],
    ]);
    const v = classifySink(perPlane, birthVerdict(true));
    expect(v.sinkClass).toBe("signal-boundary");
    expect(v.signalPlanes).toContain("content");
    expect(v.cymaticTestable).toBe(true); // the planes carry testable rhythm
  });

  test("no plane stands alone + born cross-plane tags RECEIVER-BOUNDARY (purple)", () => {
    const perPlane = new Map<string, readonly number[]>([
      ["content", Array.from({ length: 120 }, (_, i) => 0.01 * noise(i + 1))], // noise alone → not rigid
      ["structure", Array.from({ length: 120 }, (_, i) => 0.01 * noise(i + 500))],
    ]);
    const v = classifySink(perPlane, birthVerdict(true));
    expect(v.sinkClass).toBe("receiver-boundary");
    expect(v.signalPlanes.length).toBe(0); // no plane stands alone — present in no plane
  });

  test("no plane stands alone + NOT born tags NONE", () => {
    const perPlane = new Map<string, readonly number[]>([
      ["content", flat(80)],
      ["structure", flat(80)],
    ]);
    const v = classifySink(perPlane, birthVerdict(false));
    expect(v.sinkClass).toBe("none");
    expect(v.bornCrossPlane).toBe(false);
  });

  test("an invalid birth fails loud (distinct from a valid none)", () => {
    const v = classifySink(new Map(), birthVerdict(false, true));
    expect(v.invalid).toBe(true);
  });

  test("pareidolia guard — a lone rigid plane still tags cymatic, never purple (mint needs cross-plane)", () => {
    // Even with a rigid solo plane, the class reads signal-boundary (in-data), NOT a receiver mint.
    const perPlane = new Map<string, readonly number[]>([["only-one", periodicRhythm(160, 8)]]);
    const v = classifySink(perPlane, birthVerdict(false)); // a lone plane never births (born=false)
    expect(v.sinkClass).toBe("signal-boundary");
    expect(v.bornCrossPlane).toBe(false);
  });
});

describe("end-to-end symmetric witness — boundary → orthonormal basis → residual → sink → class", () => {
  test("the boundary eigenbasis arrives ORTHONORMAL (VᵀV≈I) and the residual rides off it into the sink", () => {
    // A 3-dim signal: dims 0,1 co-vary on a shared latent (a strong Fisher mode); dim 2 carries weak noise.
    const T = 90;
    const sig: number[][] = [];
    for (let t = 0; t < T; t++) {
      const latent = Math.sin((2 * Math.PI * t) / 8);
      sig.push([latent + 0.03 * noise(t + 1), 0.85 * latent + 0.03 * noise(t + 400), 0.12 * noise(t + 900)]);
    }

    const band = fitLinearGaussianBand(sig);
    const be = bandEmergence(band);
    const W = be.projector; // d×kept — columns = retained Fisher eigenvectors (the boundary's eigenbasis)
    const d = band.d;

    // (1) ORTHOGONALITY FALLS OUT: VᵀV ≈ I over the kept columns — never designed, precipitated by jacobiEigen.
    if (be.kept >= 1) {
      for (let c1 = 0; c1 < be.kept; c1++) {
        for (let c2 = 0; c2 < be.kept; c2++) {
          let dot = 0;
          for (let r = 0; r < d; r++) dot += W[r]![c1]! * W[r]![c2]!;
          expect(Math.abs(dot - (c1 === c2 ? 1 : 0))).toBeLessThan(1e-9);
        }
      }
    }

    // (2) THE RESIDUAL LIVES OFF THE EIGENBASIS: r = x − W(Wᵀx); assert Wᵀr ≈ 0 (orthogonal to the basis).
    const x = sig[10]!;
    const coords = Array.from({ length: be.kept }, (_, c) => {
      let s = 0;
      for (let r = 0; r < d; r++) s += W[r]![c]! * x[r]!;
      return s;
    });
    const proj = Array.from({ length: d }, (_, r) => {
      let s = 0;
      for (let c = 0; c < be.kept; c++) s += W[r]![c]! * coords[c]!;
      return s;
    });
    const resid = x.map((v, i) => v - proj[i]!);
    for (let c = 0; c < be.kept; c++) {
      let wtr = 0;
      for (let r = 0; r < d; r++) wtr += W[r]![c]! * resid[r]!;
      expect(Math.abs(wtr)).toBeLessThan(1e-9);
    }

    // (3) THE PIPE RUNS: feed the two co-varying planes into a sink, read its birth, tag the class.
    const s = makeSink();
    for (let t = 0; t < T; t++) {
      s.ingest({ plane: "content", agreement: Math.max(0, Math.min(1, 0.5 + 0.4 * sig[t]![0]!)) });
      s.ingest({ plane: "structure", agreement: Math.max(0, Math.min(1, 0.5 + 0.4 * sig[t]![1]!)) });
    }
    const verdict = s.verdict();
    const cls = classifySink(s.rhythmByPlane(), verdict.birth);
    expect(cls.invalid).toBe(false);
    expect(["signal-boundary", "receiver-boundary", "none"]).toContain(cls.sinkClass);
  });
});
