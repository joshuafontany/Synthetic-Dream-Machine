/**
 * capture-reading — the clock↔dial shore: a place's maintenance concentration read onto the
 * convex capture curve toward β. Verdict-FREE: it surfaces where the place sits, never rules.
 */
import { describe, test, expect } from "vitest";
import {
  captureReading, concentration,
  cabalRealmMaintenanceProvenance, cabalRealmLeaseSlot, alphaFromHalfLife,
  type CabalRealm, type CaptureDials,
} from "../src/index.js";

const PLACE: CabalRealm = {
  placeDocIdHex: "0xplace", placeAgentIdHex: "0xagent",
  substrateUrl: "automerge:s", genesisUri: "lar:///crossroads.cabal.gathers",
};
function clockOf(standing: Record<string, number>) {
  const m = new Map<string, string>();
  for (const [w, e] of Object.entries(standing)) m.set(cabalRealmLeaseSlot(PLACE.placeDocIdHex, w), String(e));
  return cabalRealmMaintenanceProvenance(PLACE, m);
}
const DIALS: CaptureDials = { beta: 0.6, rho: 0.001, supply: 1000, alpha: alphaFromHalfLife(10) };

describe("capture-reading — the clock meets the convex curve", () => {
  test("concentration: unfed → 0; one hand holds all → near 1; broadly held → low", () => {
    expect(concentration(clockOf({}))).toBe(0);
    expect(concentration(clockOf({ captor: 40, m1: 2, m2: 1 }))).toBeCloseTo(40 / 43, 6);   // ~0.93
    expect(concentration(clockOf({ a: 9, b: 9, c: 9 }))).toBeCloseTo(1 / 3, 6);              // dispersed
  });

  test("a DISPERSED place: positive headroom, below the ceiling, a FINITE resistance bar", () => {
    const r = captureReading(clockOf({ a: 9, b: 9, c: 9 }), DIALS);
    expect(r.atCeiling).toBe(false);
    expect(r.headroom).toBeGreaterThan(0);              // β − r > 0
    expect(Number.isFinite(r.curveBar)).toBe(true);
    expect(r.ceiling).toBe(0.6);
  });

  test("a CAPTURE-SHAPED place: concentration over β → at the ceiling, negative headroom", () => {
    const r = captureReading(clockOf({ captor: 40, m1: 2, m2: 1 }), DIALS);
    expect(r.concentration).toBeGreaterThan(0.6);
    expect(r.atCeiling).toBe(true);                     // r ≥ β — a READING, not a verdict
    expect(r.headroom).toBeLessThan(0);
    expect(r.curveBar).toBe(Infinity);                  // the wall — unreachable at/over β
  });

  test("the bar rises convexly as concentration climbs toward β (cheap dispersed, dear near capture)", () => {
    const low = captureReading(clockOf({ a: 10, b: 10, c: 10, d: 10, e: 10 }), DIALS);   // r=0.2
    const near = captureReading(clockOf({ lead: 11, x: 3, y: 3, z: 3 }), DIALS);          // r≈0.55
    expect(near.concentration).toBeGreaterThan(low.concentration);
    expect(near.curveBar).toBeGreaterThan(low.curveBar);   // convex — the bar climbs
  });

  test("VERDICT-FREE — the reading carries numbers + a ceiling flag, never a 'captured' ruling", () => {
    const r = captureReading(clockOf({ captor: 99, m1: 1 }), DIALS);
    expect(r).not.toHaveProperty("captured");
    expect(r).not.toHaveProperty("verdict");
    // 'atCeiling' names WHERE it sits vs the operator's dial — the operator/members rule capture
    expect(typeof r.atCeiling).toBe("boolean");
  });
});
