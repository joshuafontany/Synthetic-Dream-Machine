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

const REALM: CabalRealm = {
  realmDocIdHex:   "0xrealm_under_watch",
  realmAgentIdHex: "0xrealm_agent",
  substrateUrl:    "automerge:realm-substrate",
  genesisUri:      "lar:///crossroads.cabal.gathers/watched",
};

/** Build a lease-slot map for a realm from {writerId: epoch} pairs (the real slot URIs). */
function slotsFor(realm: CabalRealm, standing: Record<string, number>): Map<string, string> {
  const m = new Map<string, string>();
  for (const [writerId, epoch] of Object.entries(standing)) {
    m.set(cabalRealmLeaseSlot(realm.realmDocIdHex, writerId), String(epoch));
  }
  return m;
}

describe("cabalRealmMaintenanceProvenance — the capture-clock", () => {
  test("an unfed realm reads no maintainers, effective 0, spread 0", () => {
    const p = cabalRealmMaintenanceProvenance(REALM, new Map());
    expect(p.maintainerCount).toBe(0);
    expect(p.effectiveEpoch).toBe(0);
    expect(p.trailingEpoch).toBe(0);
    expect(p.spread).toBe(0);
    expect(p.leadingCount).toBe(0);
    expect(p.maintainers).toEqual([]);
  });

  test("reports each maintainer's standing, sorted leaders-first", () => {
    const p = cabalRealmMaintenanceProvenance(REALM, slotsFor(REALM, { alice: 3, bob: 7, carol: 5 }));
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
      REALM,
      slotsFor(REALM, { captor: 40, m1: 2, m2: 2, m3: 1, m4: 3 }),
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

  test("a co-maintained realm reads a wide leading set + small spread (the healthy shape)", () => {
    const p = cabalRealmMaintenanceProvenance(REALM, slotsFor(REALM, { a: 9, b: 9, c: 9, d: 8 }));
    expect(p.effectiveEpoch).toBe(9);
    expect(p.spread).toBe(1);
    expect(p.leadingCount).toBe(3);   // three of four at the front — broadly held
  });

  test("filters foreign slots (another realm's lease) and skips malformed values", () => {
    const slots = slotsFor(REALM, { alice: 4 });
    // A different realm's slot must NOT count.
    const other: CabalRealm = { ...REALM, realmDocIdHex: "0xsome_other_realm" };
    slots.set(cabalRealmLeaseSlot(other.realmDocIdHex, "intruder"), "99");
    // A malformed value in THIS realm's namespace must be skipped, not crash.
    slots.set(cabalRealmLeaseSlot(REALM.realmDocIdHex, "broken"), "not-a-number");
    const p = cabalRealmMaintenanceProvenance(REALM, slots);
    expect(p.maintainerCount).toBe(1);
    expect(p.maintainers[0]).toEqual({ writerId: "alice", epoch: 4 });
    expect(p.effectiveEpoch).toBe(4);  // the foreign 99 did not leak in
  });
});
