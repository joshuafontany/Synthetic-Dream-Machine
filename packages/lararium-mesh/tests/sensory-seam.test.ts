/**
 * sensory-seam — the generic child-clasp: any child turns events into frames via a signal map;
 * corroborate + the two-signal read compose unchanged. Instantiated for authority and flow.
 */
import { describe, test, expect } from "vitest";
import {
  childStreamAdapter, childImmuneRead, authorityStreamAdapter, flowStreamAdapter,
  type SensedEvent, type AuthorityEvent, type FlowEvent, type MeshCoupling, type ImmuneDials, type SignalPattern,
} from "../src/index.js";

const DIALS: ImmuneDials = { flagFloor: 3, rateCeiling: 100 };
const pattern = (flags: number): SignalPattern => ({ rep: 50, recentActionRate: 5, flags, rung: "handle" });

// A coupling with a strong edge INTO authority (index 1): who→authority = 0.7.
const CORROBORATES_AUTH: MeshCoupling = {
  children: ["who", "authority", "flow"],
  te: [[0, 0.7, 0.04], [0.05, 0, 0.03], [0.05, 0.05, 0]],
  strongestEdge: { from: "who", to: "authority", coupling: 0.7 },
  sovereign: false, phantomGuarded: true,
};

describe("sensory-seam — one clasp, three children", () => {
  test("the GENERIC adapter maps any event to a frame (signal + optional content)", () => {
    interface E extends SensedEvent { readonly v: number; readonly name?: string }
    const a = childStreamAdapter<E>("test", (e) => [e.v], (e) => e.name);
    expect(a.modality).toBe("test");
    const frames = a.ingest([{ kind: "k", subject: "s", seq: 0, v: 9, name: "nine" }, { kind: "k", subject: "s", seq: 1, v: 3 }]);
    expect(frames[0].signal).toEqual([9]);
    expect(frames[0].content).toBe("nine");
    expect(frames[1].content).toBeUndefined();
  });

  test("AUTHORITY adapter: signal = [capCount, delegationDepth]; content = the holder", () => {
    const events: AuthorityEvent[] = [{ kind: "grant", subject: "0xcap", seq: 0, capCount: 4, delegationDepth: 2, holder: "guild" }];
    const frames = authorityStreamAdapter().ingest(events);
    expect(authorityStreamAdapter().modality).toBe("authority");
    expect(frames[0].signal).toEqual([4, 2]);
    expect(frames[0].content).toBe("guild");
  });

  test("FLOW adapter: signal = [leaseEpoch, inFlight, rate]; no content", () => {
    const events: FlowEvent[] = [{ kind: "lease", subject: "res", seq: 0, leaseEpoch: 7, inFlight: 3, rate: 42 }];
    const frames = flowStreamAdapter().ingest(events);
    expect(flowStreamAdapter().modality).toBe("flow");
    expect(frames[0].signal).toEqual([7, 3, 42]);
    expect(frames[0].content).toBeUndefined();
  });

  test("childImmuneRead targets any child — authority threat + a neighbor R-edge into it → ANERGIZE", () => {
    expect(childImmuneRead(pattern(4), CORROBORATES_AUTH, DIALS, 0.3, "authority")).toBe("anergize");
    // no self-threat → tolerate even with the corroborating edge
    expect(childImmuneRead(pattern(0), CORROBORATES_AUTH, DIALS, 0.3, "authority")).toBe("tolerate");
    // the edge is into authority, not flow → flow has no corroboration → tolerate
    expect(childImmuneRead(pattern(4), CORROBORATES_AUTH, DIALS, 0.3, "flow")).toBe("tolerate");
  });
});
