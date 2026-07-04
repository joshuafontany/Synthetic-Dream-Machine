/**
 * spectral-keel-cap — witness the READ/WRITE capability line (Sprint-2 R3): blind by COMPOSITION, not a
 * call-time check. A capless island composes a facet with no `.track` (the poisoning surface closed by
 * structure); an island bearing the capture-island cap composes a WRITE facet whose `track` entrains under
 * drift while `project` still reads the frozen anchor. Same Claim-B contrast, now through the composed facets.
 */
import { describe, expect, test } from "vitest";

import { composeVessel } from "../src/cap-compose.js";
import { spectralKeelCap, captureIslandCap, reAnchorCap, SPECTRAL_KEEL_CAP, type ReadFacet, type WriteFacet, type KeelFacet } from "../src/spectral-keel-cap.js";
import type { MeshCoupling } from "../src/mesh-coupling.js";

const jitter = (s: number): number => {
  const x = Math.sin(s * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x) - 0.5;
};
const S0: MeshCoupling = {
  children: ["a", "b", "c", "d"],
  te: [[0, 0.7, 0.05, 0.05], [0.7, 0, 0.05, 0.05], [0.05, 0.05, 0, 0.7], [0.05, 0.05, 0.7, 0]],
  strongestEdge: { from: "a", to: "b", coupling: 0.7 },
  sovereign: false,
};
const S1: MeshCoupling = {
  children: ["a", "b", "c", "d"],
  te: [[0, 0.05, 0.7, 0.05], [0.05, 0, 0.05, 0.7], [0.7, 0.05, 0, 0.05], [0.05, 0.7, 0.05, 0]],
  strongestEdge: { from: "a", to: "c", coupling: 0.7 },
  sovereign: false,
};

describe("spectral-keel-cap — the READ/WRITE capability line (blind by composition)", () => {
  test("a capless island composes a READ facet with NO .track (structural blindness)", async () => {
    const v = await composeVessel([spectralKeelCap(S0, { k: 1 })]);
    const facet = v.get<ReadFacet>(SPECTRAL_KEEL_CAP)!;
    expect(typeof facet.project).toBe("function");
    // Blind by structure — the reference simply carries no track method (not a thrown guard).
    expect((facet as unknown as { track?: unknown }).track).toBeUndefined();
    expect(facet.project([0.5, -0.3, 0.1, 0.2]).spe).toBeGreaterThanOrEqual(0); // project still reads
  });

  test("with capture-island, the island composes a WRITE facet whose track entrains under drift", async () => {
    const v = await composeVessel([spectralKeelCap(S0, { k: 1 }), captureIslandCap()]);
    const facet = v.get<WriteFacet>(SPECTRAL_KEEL_CAP)!;
    expect(typeof facet.track).toBe("function"); // the cap granted the WRITE verb

    // Claim-B through the composed facets: on a stream shifting S₀→S₁, the frozen project residual stays
    // HIGH while the tracked residual COLLAPSES — the WRITE face entrains where the READ face cannot.
    const w1 = [-0.5, 0.5, -0.5, 0.5]; // an S₁-flavoured rough direction off S₀'s smooth mode
    const frame = (t: number): number[] => w1.map((v, i) => v + 0.04 * jitter(t * 7 + i * 13));
    let frozenTail = 0;
    let trackedTail = 0;
    let tail = 0;
    for (let t = 0; t < 120; t++) {
      const f = frame(t);
      const frozen = facet.project(f).spe;
      const tracked = facet.track(f).null;
      if (t >= 90) { frozenTail += frozen; trackedTail += tracked; tail++; }
    }
    expect(trackedTail / tail).toBeLessThan(frozenTail / tail); // the write-face entrained; the read-face did not
  });

  test("re-anchor grants freeze; freeze re-mints a successor anchored at the tracked subspace", async () => {
    const v = await composeVessel([spectralKeelCap(S0, { k: 1 }), captureIslandCap(), reAnchorCap()]);
    const facet = v.get<KeelFacet>(SPECTRAL_KEEL_CAP)!;
    expect(typeof facet.track).toBe("function");
    expect(typeof facet.freeze).toBe("function"); // re-anchor granted the freeze verb

    const w1 = [-0.5, 0.5, -0.5, 0.5]; // an S₁-flavoured direction; drift the tracker toward it
    const frame = (t: number): number[] => w1.map((v, i) => v + 0.04 * jitter(t * 7 + i * 13));
    for (let t = 0; t < 120; t++) facet.track!(frame(t));

    const successor = facet.freeze!(); // re-anchor at the tracked subspace (the new "normal")
    const probe = frame(999);
    // The successor reads the new regime at LOW residual; the ORIGINAL anchor still reads it HIGH (Π₀ immutable).
    expect(successor.project(probe).spe).toBeLessThan(facet.project(probe).spe);
  });

  test("orthogonal grants: capture-island → track without freeze; no cap → neither (tier separation)", async () => {
    const readOnly = await composeVessel([spectralKeelCap(S0, { k: 1 })]);
    const rf = readOnly.get<KeelFacet>(SPECTRAL_KEEL_CAP)!;
    expect(rf.track).toBeUndefined();
    expect(rf.freeze).toBeUndefined();
    const writeOnly = await composeVessel([spectralKeelCap(S0, { k: 1 }), captureIslandCap()]);
    const wf = writeOnly.get<KeelFacet>(SPECTRAL_KEEL_CAP)!;
    expect(typeof wf.track).toBe("function");
    expect(wf.freeze).toBeUndefined(); // write does NOT grant re-anchor — the tiers separate
  });
});
