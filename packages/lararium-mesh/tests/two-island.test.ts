/**
 * two-island — witness NO GLOBAL NOW (Sprint 1): each stream-island calibrates its OWN Qα from its OWN
 * reference under its OWN dial (per-island Mondrian, never a shared global threshold), and one island's
 * activity NEVER perturbs another's calibration. The isolation already stands STRUCTURAL — each
 * runBoundaryResidualFlow holds its own registry + reference + dial, sharing no module-level state — so
 * this is the minimal STUB (two in-process islands, NO broker/pool/ring/ITC-fork) that both DEMONSTRATES
 * per-island calibration and GUARDS the invariant against a future shared-global regression (a cached qAlpha,
 * a shared default registry). The fleet (Sprint 3) hosts these islands; the isolation it relies on lives here.
 */
import { describe, expect, test } from "vitest";

import { runBoundaryResidualFlow } from "../src/sink-flow.js";
import { makeMintRegistry } from "../src/purple-minter.js";
import { makeArlDial } from "../src/arl-dial.js";
import type { MeshCoupling } from "../src/mesh-coupling.js";

const counter = () => {
  let n = 0;
  return () => `sink-${n++}`;
};
const jitter = (s: number): number => {
  const x = Math.sin(s * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x) - 0.5;
};
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
const nullStream = (seed: number, count: number): number[][] =>
  Array.from({ length: count }, (_, t) => coupling.children.map((_c, p) => jitter((t + 1) * 13 + seed + p * 7919)));

describe("two-island — no global now (per-island Mondrian calibration + isolation)", () => {
  test("each island sets its OWN threshold from its OWN dial — no single global Qα", () => {
    const ref = nullStream(0, 400);
    const stream = nullStream(555, 60);
    // Two islands, SAME data, DIFFERENT dials — a loose island and a strict one.
    const loose = runBoundaryResidualFlow(coupling, stream, ref, makeMintRegistry(), counter(), { boundary: { k: 1 }, dial: makeArlDial(5) });
    const strict = runBoundaryResidualFlow(coupling, stream, ref, makeMintRegistry(), counter(), { boundary: { k: 1 }, dial: makeArlDial(1000) });
    // The two thresholds differ — each island's Qα rides ITS dial, never a shared global constant.
    let differ = false;
    for (let p = 0; p < loose.qAlpha.length; p++) {
      if (Math.abs(loose.qAlpha[p]! - strict.qAlpha[p]!) > 1e-9) differ = true;
    }
    expect(differ).toBe(true);
  });

  test("island A's activity NEVER moves island B's calibration — separate logs, no shared now", () => {
    const refB = nullStream(77, 300);
    const streamB = nullStream(999, 60);
    const dialB = makeArlDial(20);

    // B calibrates + observes a null, ALONE.
    const b1 = runBoundaryResidualFlow(coupling, streamB, refB, makeMintRegistry(), counter(), { boundary: { k: 1 }, dial: dialB });

    // A runs a PERTURBED stream in between (a strong 2-node shift late in the window — A may well birth).
    const refA = nullStream(0, 300);
    const perturbedA = nullStream(999, 60).map((f, t) => (t > 30 ? f.map((v, i) => (i < 2 ? v + 5 : v)) : f));
    const a = runBoundaryResidualFlow(coupling, perturbedA, refA, makeMintRegistry(), counter(), { boundary: { k: 1 }, dial: makeArlDial(20) });

    // B again — identical inputs → identical result. A's run touched no shared state.
    const b2 = runBoundaryResidualFlow(coupling, streamB, refB, makeMintRegistry(), counter(), { boundary: { k: 1 }, dial: dialB });

    expect(b2.qAlpha).toEqual(b1.qAlpha); // B's threshold unmoved by A's activity
    expect(b2.minted?.petName ?? null).toBe(b1.minted?.petName ?? null); // B's mint outcome identical
    // (sanity — A really did run its own perturbed stream, not a no-op: it computed its own boundary)
    expect(a.qAlpha.length).toBe(coupling.children.length);
  });
});
