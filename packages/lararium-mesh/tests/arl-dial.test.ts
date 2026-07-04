/**
 * arl-dial — witness Sprint 0's dial-spine: ONE scalar (ARL₀) → every threshold. (T1) the dial derives α
 * monotonically (α=1/ARL₀; the cross-plane refraction α_node=ARL₀^(−1/k); the reference reproduces the prior
 * 0.05). (T2) the dial GOVERNS the gate — a stricter ARL₀ raises the Qα control limit above a looser one's,
 * read from the SAME reference through the live runBoundaryResidualFlow path. This is the conformal thesis
 * shown by measurement: one dial sets the calibration, monotonically, no structural change beneath it.
 */
import { describe, expect, test } from "vitest";

import { makeArlDial, ARL0_REFERENCE } from "../src/arl-dial.js";
import { runBoundaryResidualFlow } from "../src/sink-flow.js";
import { makeMintRegistry } from "../src/purple-minter.js";
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
