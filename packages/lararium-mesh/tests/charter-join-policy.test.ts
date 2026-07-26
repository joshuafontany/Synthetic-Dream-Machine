/**
 * charter-join-policy — the STRANGER dial rides the charter, fail-closed to invite-only.
 *
 * cabal-invite states the law: "The operator turns this. The code never decides it." `joinPolicyFromDoc` puts
 * the turn on the per-Nexus charter the kahu quorum signs, isomorphic with `federationPostureFromDoc`. What
 * matters here is the CLOSED direction: every way the read can go wrong must land on invite-only, because the
 * failure that costs is a torn dial silently dropping signal-2 and letting the DreamNet open by accident.
 *
 * The two dials stay ORTHOGONAL — stranger-admission ⊥ foreign-operator carry. Neither opens the other.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/persona-circle · lar:///ha.ka.ba/lararium/mesh/carry-contract
 */
import { describe, test, expect } from "vitest";
import {
  joinPolicyFromDoc, federationPostureFromDoc,
  NEXUS_CHARTER_DOC_KIND, type NexusCharterDoc,
} from "../src/nexus-charter-seed.js";

/** A minimal seated charter — the fields under test ride on top per-case. */
function charter(extra: Partial<NexusCharterDoc> = {}): NexusCharterDoc {
  return {
    kind: NEXUS_CHARTER_DOC_KIND, threshold: 2, charterEpochCid: null, kahu: [], ...extra,
  } as NexusCharterDoc;
}

describe("joinPolicyFromDoc — the stranger dial, fail-closed", () => {
  test("the operator's OPEN turn reads open — the one way the invite requirement drops", () => {
    expect(joinPolicyFromDoc(charter({ joinPolicy: { kind: "open" } }))).toEqual({ kind: "open" });
  });

  test("an explicit invite-only turn reads invite-only", () => {
    expect(joinPolicyFromDoc(charter({ joinPolicy: { kind: "invite-only" } }))).toEqual({ kind: "invite-only" });
  });

  // The arms that carry the cost: absence, tearing, and garbage must ALL land closed. A dial that opened on
  // any of these would open the DreamNet by accident — the exact failure fail-closed reads exist to refuse.
  test("an absent doc, an absent field, and a TORN value all read INVITE-ONLY", () => {
    expect(joinPolicyFromDoc(null)).toEqual({ kind: "invite-only" });
    expect(joinPolicyFromDoc(charter())).toEqual({ kind: "invite-only" });

    for (const torn of ["OPEN", "open ", "", "public", "invite", null, undefined, 1, {}, ["open"]]) {
      const doc = charter({ joinPolicy: { kind: torn } as unknown as NexusCharterDoc["joinPolicy"] });
      expect(joinPolicyFromDoc(doc)).toEqual({ kind: "invite-only" });
    }
    // a doc whose joinPolicy is itself junk (not an object) still closes
    expect(joinPolicyFromDoc({ ...charter(), joinPolicy: "open" } as unknown as NexusCharterDoc))
      .toEqual({ kind: "invite-only" });
  });

  test("the two dials stay ORTHOGONAL — opening strangers never opens foreign-operator carry", () => {
    const strangersOpen = charter({ joinPolicy: { kind: "open" } });
    expect(joinPolicyFromDoc(strangersOpen)).toEqual({ kind: "open" });
    expect(federationPostureFromDoc(strangersOpen)).toBe("private");   // untouched, still closed

    const carryOpen = charter({ federationPosture: "open" });
    expect(federationPostureFromDoc(carryOpen)).toBe("open");
    expect(joinPolicyFromDoc(carryOpen)).toEqual({ kind: "invite-only" });   // untouched, still closed
  });
});
