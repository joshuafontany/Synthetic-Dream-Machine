/**
 * who-sensory-seam — the clasp of WHO-plane ⊥ WHO sensorium. Emit (events→frames), consume
 * (→ SignalPattern), corroborate (Signal-2 = a mesh-coupling R-edge into who). The immune-read's
 * two-signal danger-model, now sourced from real perception.
 */
import { describe, test, expect } from "vitest";
import {
  whoStreamAdapter, signalPatternFrom, neighborCorroborates, whoImmuneRead,
  type WhoEvent, type MeshCoupling, type ImmuneDials,
} from "../src/index.js";

const DIALS: ImmuneDials = { flagFloor: 3, rateCeiling: 100 };

// who = index 0; a strong authority→who edge (te[1][0]) = a neighbor's corroboration.
const CORROBORATING: MeshCoupling = {
  children: ["who", "authority", "flow"],
  te: [[0, 0.05, 0.04], [0.7, 0, 0.03], [0.05, 0.05, 0]],
  strongestEdge: { from: "authority", to: "who", coupling: 0.7 },
  sovereign: false, phantomGuarded: true,
};
const QUIET: MeshCoupling = {
  children: ["who", "authority", "flow"],
  te: [[0, 0.05, 0.04], [0.06, 0, 0.03], [0.05, 0.05, 0]],
  strongestEdge: { from: "authority", to: "who", coupling: 0.06 },
  sovereign: true, phantomGuarded: true,
};

describe("who-sensory-seam — the two halves clasp", () => {
  test("EMIT: WHO events → frames (signal = [rep, rung, linkAge]; content = petname)", () => {
    const events: WhoEvent[] = [
      { kind: "rep", subject: "0xa", seq: 0, rep: 12, rungLevel: 1, linkAge: 3, petname: "wanderer" },
      { kind: "flag", subject: "0xa", seq: 1, rep: 12, rungLevel: 1, linkAge: 4 },
    ];
    const frames = whoStreamAdapter().ingest(events);
    expect(whoStreamAdapter().modality).toBe("who");
    expect(frames[0].signal).toEqual([12, 1, 3]);
    expect(frames[0].content).toBe("wanderer");
    expect(frames[1].content).toBeUndefined();          // no petname → no content slot
    expect(frames[1].seq).toBe(1);
  });

  test("CORROBORATE: a strong R-edge INTO who = a neighbor's flag; a quiet edge = none", () => {
    expect(neighborCorroborates(CORROBORATING, 0.3)).toBe(true);    // authority→who = 0.7 ≥ 0.3
    expect(neighborCorroborates(QUIET, 0.3)).toBe(false);           // 0.06 < 0.3
    expect(neighborCorroborates(CORROBORATING, 0.9)).toBe(false);   // dial above the edge
  });

  test("the full WHO immune read: threat + corroboration → ANERGIZE; threat alone → TOLERATE", () => {
    const threat = signalPatternFrom(50, "handle", 5, /*flags*/ 4);   // Signal-1 present (flags ≥ floor)
    const clean = signalPatternFrom(50, "handle", 5, 0);
    // threat AND a corroborating neighbor R-edge → anergize
    expect(whoImmuneRead(threat, CORROBORATING, DIALS, 0.3)).toBe("anergize");
    // threat but NO corroboration → tolerate (the autoimmunity guard)
    expect(whoImmuneRead(threat, QUIET, DIALS, 0.3)).toBe("tolerate");
    // clean pattern even WITH a corroborating neighbor → tolerate (no self-signal)
    expect(whoImmuneRead(clean, CORROBORATING, DIALS, 0.3)).toBe("tolerate");
  });
});
