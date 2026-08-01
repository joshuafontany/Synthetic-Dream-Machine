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
  joinPolicyFromDoc, federationPostureFromDoc, admissionDialsFromDoc,
  NEXUS_DOC_KIND, type NexusDoc,
} from "../src/nexus-seal-seed.js";

/** A minimal seated charter — the fields under test ride on top per-case. */
function joinCharter(extra: Partial<NexusDoc> = {}): NexusDoc {
  return {
    kind: NEXUS_DOC_KIND, threshold: 2, sealEpochCid: null, kahu: [], ...extra,
  } as NexusDoc;
}

describe("joinPolicyFromDoc — the stranger dial, fail-closed", () => {
  test("the operator's OPEN turn reads open — the one way the invite requirement drops", () => {
    expect(joinPolicyFromDoc(joinCharter({ joinPolicy: { kind: "open" } }))).toEqual({ kind: "open" });
  });

  test("an explicit invite-only turn reads invite-only", () => {
    expect(joinPolicyFromDoc(joinCharter({ joinPolicy: { kind: "invite-only" } }))).toEqual({ kind: "invite-only" });
  });

  // The arms that carry the cost: absence, tearing, and garbage must ALL land closed. A dial that opened on
  // any of these would open the DreamNet by accident — the exact failure fail-closed reads exist to refuse.
  test("an absent doc, an absent field, and a TORN value all read INVITE-ONLY", () => {
    expect(joinPolicyFromDoc(null)).toEqual({ kind: "invite-only" });
    expect(joinPolicyFromDoc(joinCharter())).toEqual({ kind: "invite-only" });

    for (const torn of ["OPEN", "open ", "", "public", "invite", null, undefined, 1, {}, ["open"]]) {
      const doc = joinCharter({ joinPolicy: { kind: torn } as unknown as NexusDoc["joinPolicy"] });
      expect(joinPolicyFromDoc(doc)).toEqual({ kind: "invite-only" });
    }
    // a doc whose joinPolicy is itself junk (not an object) still closes
    expect(joinPolicyFromDoc({ ...joinCharter(), joinPolicy: "open" } as unknown as NexusDoc))
      .toEqual({ kind: "invite-only" });
  });

  test("the two dials stay ORTHOGONAL — opening strangers never opens foreign-operator carry", () => {
    const strangersOpen = joinCharter({ joinPolicy: { kind: "open" } });
    expect(joinPolicyFromDoc(strangersOpen)).toEqual({ kind: "open" });
    expect(federationPostureFromDoc(strangersOpen)).toBe("private");   // untouched, still closed

    const carryOpen = joinCharter({ federationPosture: "open" });
    expect(federationPostureFromDoc(carryOpen)).toBe("open");
    expect(joinPolicyFromDoc(carryOpen)).toEqual({ kind: "invite-only" });   // untouched, still closed
  });
});

describe("admissionDialsFromDoc — the one dial with NO safe default", () => {
  const GOOD = { epsilon: 0.15, beta: 0.9, rho: 1, supply: 1, alpha: 0.5 };

  test("a fully seated set reads back exactly, floor fields only", () => {
    const d = joinCharter({ admissionDials: { ...GOOD, sneaked: 7 } as never });
    expect(admissionDialsFromDoc(d)).toEqual(GOOD);   // the smuggled field never reaches pricing
  });

  // The load-bearing arm. A posture and a join-policy each have a SAFE closed value; a fairness dial has
  // none, so absence must read as the operator's UNMADE CHOICE — never as somebody's guess quietly enforced.
  test("absent, empty, or HALF-seated dials read NULL — a partial fairness setting is a different policy", () => {
    expect(admissionDialsFromDoc(null)).toBeNull();
    expect(admissionDialsFromDoc(joinCharter())).toBeNull();
    for (const partial of [
      { ...GOOD, epsilon: undefined }, { ...GOOD, beta: undefined }, { ...GOOD, rho: undefined },
      { ...GOOD, supply: undefined },  { ...GOOD, alpha: undefined },
    ]) {
      expect(admissionDialsFromDoc(joinCharter({ admissionDials: partial as never }))).toBeNull();
    }
  });

  test("an out-of-range dial reads NULL — ε and β must sit strictly inside (0,1)", () => {
    for (const bad of [
      { ...GOOD, epsilon: 0 }, { ...GOOD, epsilon: 1 }, { ...GOOD, epsilon: -0.1 },
      { ...GOOD, beta: 0 },    { ...GOOD, beta: 1 },    { ...GOOD, beta: 1.5 },
      { ...GOOD, rho: 0 },     { ...GOOD, supply: -1 },
      { ...GOOD, alpha: 0 },   { ...GOOD, alpha: 1.5 },
      { ...GOOD, epsilon: Number.NaN }, { ...GOOD, beta: Number.POSITIVE_INFINITY },
      { ...GOOD, rho: "1" },
    ]) {
      expect(admissionDialsFromDoc(joinCharter({ admissionDials: bad as never }))).toBeNull();
    }
  });

  test("α accepts exactly 1 (a half-life of zero decay) but never above it", () => {
    expect(admissionDialsFromDoc(joinCharter({ admissionDials: { ...GOOD, alpha: 1 } })))
      .toEqual({ ...GOOD, alpha: 1 });
  });
});
