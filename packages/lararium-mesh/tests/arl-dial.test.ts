/**
 * arl-dial — witness Sprint 0's dial-spine: ONE scalar (ARL₀) → every threshold. (T1) the dial derives α
 * monotonically (α=1/ARL₀; the cross-plane refraction α_node=ARL₀^(−1/k); the reference reproduces the prior
 * 0.05). (T2) the dial GOVERNS the gate — a stricter ARL₀ raises the Qα control limit above a looser one's,
 * read from the SAME reference through the live runBoundaryResidualFlow path. (T3) the dial's α IS the
 * per-node exceedance RATE on HELD-OUT null frames — the actual conformal claim shown by measurement, not
 * a monotonicity proxy: calibrate Qα on a reference null, then the fraction of a DISJOINT null stream's
 * per-node residuals above Qα tracks α across an ARL₀ sweep (split-conformal coverage; self-emergence =
 * pivotality = conformal validity). READ-side, single-island, offline — the birth-level rate (cross-plane
 * AND → α_node) rides the deferred shuffle-null that measures plane correlation.
 */
import { describe, expect, test } from "vitest";

import { makeArlDial, ARL0_REFERENCE } from "../src/arl-dial.js";
import { runBoundaryResidualFlow } from "../src/sink-flow.js";
import { makeMintRegistry } from "../src/purple-minter.js";
import { couplingBoundary, projectBoundary, controlLimit } from "../src/spectral-keel.js";
import type { MeshCoupling } from "../src/mesh-coupling.js";

const counter = () => {
  let n = 0;
  return () => `sink-${n++}`;
};
const jitter = (s: number): number => {
  const x = Math.sin(s * 12.9898 + 4.1414) * 43758.5453;
  return (x - Math.floor(x) - 0.5);
};

describe("arl-dial (T1) — one scalar derives every threshold monotonically", () => {
  test("α = 1/ARL₀, strict < loose, and the reference reproduces the prior 0.05", () => {
    const loose = makeArlDial(4);
    const strict = makeArlDial(400);
    expect(loose.alpha).toBeCloseTo(0.25, 12);
    expect(strict.alpha).toBeCloseTo(0.0025, 12);
    expect(strict.alpha).toBeLessThan(loose.alpha);
    expect(makeArlDial(ARL0_REFERENCE).alpha).toBeCloseTo(0.05, 12); // ARL₀=20 → the old default
    expect(makeArlDial(400, { k: 2 }).alphaNode).toBeCloseTo(0.05, 6); // 400^(−1/2)=0.05 (cross-plane refraction)
    expect(makeArlDial(1).alpha).toBe(1); // clamp guard
  });
});

describe("arl-dial (T2) — the dial GOVERNS the Qα gate through the live flow (conformal, by measurement)", () => {
  const coupling: MeshCoupling = {
    children: ["a", "b", "c", "d"],
    te: [
      [0, 0.6, 0.1, 0.1],
      [0.5, 0, 0.1, 0.1],
      [0.1, 0.1, 0, 0.6],
      [0.1, 0.1, 0.5, 0],
    ],
    strongestEdge: { from: "a", to: "b", coupling: 0.6 },
    sovereign: false,
  };
  // Noisy frames off the k=1 boundary → the residuals carry SPREAD, so the (1−α) quantile varies with α.
  const frames = Array.from({ length: 60 }, (_, t) => [jitter(t + 1), jitter(t + 200), jitter(t + 400), jitter(t + 600)]);

  test("a stricter ARL₀ raises the Qα control limit above a looser one's — one dial, monotone calibration", () => {
    const loose = runBoundaryResidualFlow(coupling, frames, frames, makeMintRegistry(), counter(), {
      boundary: { k: 1 },
      dial: makeArlDial(2), // α=0.5 → the ~50th percentile (a low limit)
    });
    const strict = runBoundaryResidualFlow(coupling, frames, frames, makeMintRegistry(), counter(), {
      boundary: { k: 1 },
      dial: makeArlDial(1000), // α=0.001 → the ~99.9th percentile (a high limit)
    });
    expect(loose.qAlpha.length).toBe(strict.qAlpha.length);
    let strictHigherSomewhere = false;
    for (let p = 0; p < loose.qAlpha.length; p++) {
      expect(strict.qAlpha[p]).toBeGreaterThanOrEqual(loose.qAlpha[p]! - 1e-12); // strict never below loose
      if (strict.qAlpha[p]! > loose.qAlpha[p]! + 1e-9) strictHigherSomewhere = true;
    }
    expect(strictHigherSomewhere).toBe(true); // the dial genuinely moves the threshold
  });
});

describe("arl-dial (T3) — the dial's α IS the held-out exceedance rate (conformal coverage, by measurement)", () => {
  const coupling: MeshCoupling = {
    children: ["a", "b", "c", "d"],
    te: [
      [0, 0.6, 0.1, 0.1],
      [0.5, 0, 0.1, 0.1],
      [0.1, 0.1, 0, 0.6],
      [0.1, 0.1, 0.5, 0],
    ],
    strongestEdge: { from: "a", to: "b", coupling: 0.6 },
    sovereign: false,
  };
  const boundary = couplingBoundary(coupling, { k: 1 });
  // A null stream: iid noise off the k=1 boundary, NO embedded sink. Disjoint seed offsets → ref and test
  // draw from the SAME distribution but never share a frame (exchangeable held-out — the split-conformal cut).
  const nullStream = (seedBase: number, count: number): number[][] =>
    Array.from({ length: count }, (_, t) =>
      coupling.children.map((_c, p) => jitter((t + 1) * 13 + seedBase + p * 7919)),
    );
  const refFrames = nullStream(0, 400);
  const testFrames = nullStream(1_000_003, 400); // a disjoint held-out null of the same law

  const refResiduals = refFrames.map((f) => projectBoundary(f, boundary.Wstar, boundary.trivialColumns).residualVec);
  const testResiduals = testFrames.map((f) => projectBoundary(f, boundary.Wstar, boundary.trivialColumns).residualVec);

  // The observable: the fraction of held-out per-node residual energies that EXCEED the α-calibrated Qα.
  // Split-conformal coverage says E[this] ≈ α on an exchangeable null. This measures the ACTUAL rate — the
  // thesis (self-emergence = pivotality = conformal validity) — where T2 only proved the threshold moves.
  const observedExceedance = (alpha: number): number => {
    const qa = controlLimit(refResiduals, alpha, 1e-300);
    let exceed = 0;
    let total = 0;
    for (const r of testResiduals) {
      for (let p = 0; p < r.length; p++) {
        total += 1;
        if (r[p]! * r[p]! > qa[p]!) exceed += 1;
      }
    }
    return exceed / total;
  };

  test("held-out per-node exceedance tracks α across an ARL₀ sweep — the dial IS the false-surprise rate", () => {
    const rows = [5, 10, 20].map((arl0) => {
      const alpha = makeArlDial(arl0).alpha;
      return { arl0, alpha, observed: observedExceedance(alpha) };
    });
    // (a) each held-out rate lands in a finite-sample band around its α (400 frames × 4 nodes = 1600 draws;
    //     the empirical (1−α)-quantile reads slightly CONSERVATIVE, so the observed sits at-or-below α with
    //     a sampling skirt). The band proves MAGNITUDE, not just direction.
    for (const { alpha, observed } of rows) {
      expect(observed).toBeGreaterThan(alpha * 0.4);
      expect(observed).toBeLessThan(alpha * 1.75 + 0.01);
    }
    // (b) the rate MOVES WITH the dial — a looser ARL₀ (bigger α) exceeds more often than a stricter one.
    expect(rows[0]!.observed).toBeGreaterThan(rows[2]!.observed);
  });
});
