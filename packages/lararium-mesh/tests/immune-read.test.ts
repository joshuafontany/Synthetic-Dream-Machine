/**
 * immune-read — the danger-model: context licenses (not identity), two-signal corroboration
 * (the autoimmunity guard), anergy-not-ban, no rung immune. Dials are the operator's params.
 */
import { describe, test, expect } from "vitest";
import {
  immuneRead, immuneReadPattern, readsAsThreat, rePresents,
  type SignalPattern, type ImmuneDials,
} from "../src/index.js";

const DIALS: ImmuneDials = { flagFloor: 3, rateCeiling: 100 };

const clean = (rung: SignalPattern["rung"], rep = 50): SignalPattern =>
  ({ rep, recentActionRate: 5, flags: 0, rung });
const threatening = (rung: SignalPattern["rung"], rep = 50): SignalPattern =>
  ({ rep, recentActionRate: 5, flags: 4, rung });   // flags over the floor

describe("immune-read — the danger-model", () => {
  test("TWO-SIGNAL: anergy fires ONLY on self-threat AND a neighbor's corroboration", () => {
    expect(immuneRead({ selfSignal: true, neighborSignal: true })).toBe("anergize");
    // one signal alone → tolerate (the autoimmunity guard)
    expect(immuneRead({ selfSignal: true, neighborSignal: false })).toBe("tolerate");
    expect(immuneRead({ selfSignal: false, neighborSignal: true })).toBe("tolerate");
    expect(immuneRead({ selfSignal: false, neighborSignal: false })).toBe("tolerate");
  });

  test("the default is TOLERANCE — a clean actor with a corroborating neighbor is still tolerated", () => {
    // no self-threat → tolerate even if a neighbor flags (a lone false accusation can't disarm)
    expect(immuneReadPattern(clean("lived"), true, DIALS)).toBe("tolerate");
  });

  test("readsAsThreat is CONTEXT (rate/flags), never identity — flags OR rate spike trips it", () => {
    expect(readsAsThreat(clean("lived"), DIALS)).toBe(false);
    expect(readsAsThreat(threatening("lived"), DIALS)).toBe(true);                 // flags ≥ floor
    expect(readsAsThreat({ rep: 999, recentActionRate: 500, flags: 0, rung: "handle" }, DIALS)).toBe(true); // rate spike
  });

  test("NO RUNG IS IMMUNE — a pledged Handle with a threat-pattern + neighbor anergizes like anyone", () => {
    // persistence≠legitimacy in the immune layer: high rep + Handle rung does NOT license
    expect(immuneReadPattern(threatening("handle", 10_000), true, DIALS)).toBe("anergize");
    // and a clean Handle stays tolerated (not presumed guilty either)
    expect(immuneReadPattern(clean("handle"), true, DIALS)).toBe("tolerate");
  });

  test("a throwaway isn't presumed guilty — clean pattern → tolerate; bad pattern + neighbor → anergize", () => {
    expect(immuneReadPattern(clean("throwaway"), true, DIALS)).toBe("tolerate");
    expect(immuneReadPattern(threatening("throwaway"), true, DIALS)).toBe("anergize");
  });

  test("ANERGY IS NOT A BAN — an anergized veil re-presents once its lease decays (anergy always returns)", () => {
    expect(rePresents(2, 10)).toBe(false);   // still held — the danger hasn't passed
    expect(rePresents(10, 10)).toBe(true);   // lease decayed → re-presents clean at the anon floor
    expect(rePresents(15, 10)).toBe(true);
  });
});
