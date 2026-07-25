/**
 * cabal-realm-clock — the capture-CLOCK reads a realm's maintenance provenance from its
 * lease slots: who feeds it, how deep each has rolled, and the SPREAD (a minority far
 * ahead = the visible capture signal). Verdict-free: it surfaces numbers, never a
 * "captured" judgement (the threshold is the operator's calibration seat).
 */
import { describe, test, expect } from "vitest";
import {
  cabalRealmMaintenanceProvenance,
  cabalRealmLeaseSlot,
  type CabalRealm,
} from "../src/index.js";

const PLACE: CabalRealm = {
  placeDocIdHex:   "0xplace_under_watch",
  placeAgentIdHex: "0xplace_agent",
  substrateUrl:    "automerge:place-substrate",
  genesisUri:      "lar:///crossroads.cabal.gathers/watched",
};

/** Build a lease-slot map for a realm from {writerId: epoch} pairs (the real slot URIs). */
function slotsFor(place: CabalRealm, standing: Record<string, number>): Map<string, string> {
  const m = new Map<string, string>();
  for (const [writerId, epoch] of Object.entries(standing)) {
    m.set(cabalRealmLeaseSlot(place.placeDocIdHex, writerId), String(epoch));
  }
  return m;
}

describe("cabalRealmMaintenanceProvenance — the capture-clock", () => {
  test("an unfed place reads no maintainers, effective 0, spread 0", () => {
    const p = cabalRealmMaintenanceProvenance(PLACE, new Map());
    expect(p.maintainerCount).toBe(0);
    expect(p.effectiveEpoch).toBe(0);
    expect(p.trailingEpoch).toBe(0);
    expect(p.spread).toBe(0);
    expect(p.leadingCount).toBe(0);
    expect(p.maintainers).toEqual([]);
  });

  test("reports each maintainer's standing, sorted leaders-first", () => {
    const p = cabalRealmMaintenanceProvenance(PLACE, slotsFor(PLACE, { alice: 3, bob: 7, carol: 5 }));
    expect(p.maintainerCount).toBe(3);
    expect(p.maintainers.map((m) => m.writerId)).toEqual(["bob", "carol", "alice"]);
    expect(p.effectiveEpoch).toBe(7);
    expect(p.trailingEpoch).toBe(3);
    expect(p.spread).toBe(4);
    expect(p.leadingCount).toBe(1);   // only bob sits at the effective epoch
  });

  test("THE CAPTURE SIGNAL is VISIBLE — a minority far ahead reads as a large spread + small leading set", () => {
    // One writer out-feeds an apathetic majority: it rolls deep while the rest stall.
    const p = cabalRealmMaintenanceProvenance(
      PLACE,
      slotsFor(PLACE, { captor: 40, m1: 2, m2: 2, m3: 1, m4: 3 }),
    );
    expect(p.effectiveEpoch).toBe(40);
    expect(p.trailingEpoch).toBe(1);
    expect(p.spread).toBe(39);        // a glaring gap — the majority can SEE it
    expect(p.leadingCount).toBe(1);   // one principal alone at the top
    expect(p.maintainers[0].writerId).toBe("captor");
    // ...but the clock draws NO conclusion — it returns no "captured" field. The
    // operator reads the spread + concentration and calibrates. Verdict-free by design.
    expect(p).not.toHaveProperty("captured");
    expect(p).not.toHaveProperty("verdict");
  });

  test("a co-maintained place reads a wide leading set + small spread (the healthy shape)", () => {
    const p = cabalRealmMaintenanceProvenance(PLACE, slotsFor(PLACE, { a: 9, b: 9, c: 9, d: 8 }));
    expect(p.effectiveEpoch).toBe(9);
    expect(p.spread).toBe(1);
    expect(p.leadingCount).toBe(3);   // three of four at the front — broadly held
  });

  test("filters foreign slots (another place's lease) and skips malformed values", () => {
    const slots = slotsFor(PLACE, { alice: 4 });
    // A different realm's slot must NOT count.
    const other: CabalRealm = { ...PLACE, placeDocIdHex: "0xsome_other_place" };
    slots.set(cabalRealmLeaseSlot(other.placeDocIdHex, "intruder"), "99");
    // A malformed value in THIS realm's namespace must be skipped, not crash.
    slots.set(cabalRealmLeaseSlot(PLACE.placeDocIdHex, "broken"), "not-a-number");
    const p = cabalRealmMaintenanceProvenance(PLACE, slots);
    expect(p.maintainerCount).toBe(1);
    expect(p.maintainers[0]).toEqual({ writerId: "alice", epoch: 4 });
    expect(p.effectiveEpoch).toBe(4);  // the foreign 99 did not leak in
  });
});
