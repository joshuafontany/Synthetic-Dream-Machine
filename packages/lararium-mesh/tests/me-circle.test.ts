/**
 * me-circle — the "me" as a single-principal realm where Personas overlap, one takes
 * the blame at a time, and the multi-principal complexity degenerates to trivial.
 * Tests that the operator's ruling carries load on the model floor (the keyhive lifecycle
 * probe exercises the real cabal-realm machinery).
 */
import { describe, test, expect } from "vitest";
import {
  foundMeCircle, contractPersona, releasePersona, activePersona, withActivePersona,
  meCircleDegeneracy,
  type CabalRealm, type MeCircle,
} from "../src/index.js";

const ME_REALM: CabalRealm = {
  realmDocIdHex:   "0xme_realm",
  realmAgentIdHex: "0xme_agent",
  substrateUrl:    "automerge:me-substrate",
  genesisUri:      "lar:///me.constellation.overlaps/josh",
};
const PRINCIPAL = "0xjosh_me_key";

// The operator's own constellation (the canon example): slices of one human.
const JOSHUA = { handleHex: "0xhandle_joshua",  petname: "Joshua Fontany" };
const ENGINEER = { handleHex: "0xhandle_engineer", petname: "Sr. Engineer Josh" };
const VEILED   = { handleHex: "0xhandle_veiled" };   // a slice that stays veiled (no petname)

function me(): MeCircle { return foundMeCircle(ME_REALM, PRINCIPAL); }

describe("me-circle — a single-principal realm where personas overlap", () => {
  test("founds empty — no personas, no one holds the blame yet", () => {
    const m = me();
    expect(m.constellation).toEqual([]);
    expect(m.activeHandleHex).toBeNull();
    expect(activePersona(m)).toBeNull();
    expect(m.principalHex).toBe(PRINCIPAL);
  });

  test("the FIRST persona contracted takes the blame; the rest overlap without seizing it", () => {
    const m = contractPersona(contractPersona(me(), JOSHUA), ENGINEER);
    expect(m.constellation.map((p) => p.handleHex)).toEqual([JOSHUA.handleHex, ENGINEER.handleHex]);
    expect(m.activeHandleHex).toBe(JOSHUA.handleHex);   // one at a time — the first
    expect(activePersona(m)?.petname).toBe("Joshua Fontany");
  });

  test("a persona may overlap VEILED (no petname) or KNOWN (petname) — the disclosure dial, per-slice", () => {
    const m = contractPersona(contractPersona(me(), JOSHUA), VEILED);
    expect(activePersona(m)?.petname).toBe("Joshua Fontany");   // known
    const veiled = m.constellation.find((p) => p.handleHex === VEILED.handleHex);
    expect(veiled?.petname).toBeUndefined();                     // veiled = name⊥
  });

  test("re-contracting a handle turns the disclosure dial (updates the petname), never duplicates", () => {
    const m1 = contractPersona(me(), { handleHex: VEILED.handleHex });        // veiled
    const m2 = contractPersona(m1, { handleHex: VEILED.handleHex, petname: "Guru Josh" }); // promote → known
    expect(m2.constellation).toHaveLength(1);
    expect(m2.constellation[0].petname).toBe("Guru Josh");
  });

  test("switching the blame is free; switching to an un-contracted slice FAILS LOUD", () => {
    const m = contractPersona(contractPersona(me(), JOSHUA), ENGINEER);
    const switched = withActivePersona(m, ENGINEER.handleHex);
    expect(switched.activeHandleHex).toBe(ENGINEER.handleHex);
    expect(activePersona(switched)?.petname).toBe("Sr. Engineer Josh");
    expect(() => withActivePersona(m, "0xhandle_stranger")).toThrow(/un-contracted persona/);
  });

  test("releasing the active persona passes the blame on; emptying it leaves no one", () => {
    let m = contractPersona(contractPersona(me(), JOSHUA), ENGINEER);
    m = releasePersona(m, JOSHUA.handleHex);                      // drop the one holding the blame
    expect(m.constellation.map((p) => p.handleHex)).toEqual([ENGINEER.handleHex]);
    expect(m.activeHandleHex).toBe(ENGINEER.handleHex);          // blame passed on
    m = releasePersona(m, ENGINEER.handleHex);
    expect(m.activeHandleHex).toBeNull();                         // no one left to blame
  });

  test("THE DEGENERACY HOLDS — single-principal collapses the multi-principal machinery", () => {
    const m = contractPersona(contractPersona(me(), JOSHUA), ENGINEER);
    const d = meCircleDegeneracy(m);
    expect(d.tieBreakEngaged).toBe(false);       // no concurrent different-principal ops
    expect(d.captureImmune).toBe(true);          // you cannot capture your own me
    expect(d.legitimacyContested).toBe(false);   // no contested authority
  });

  test("contracting is immutable — the prior me is untouched (no global self mutated in place)", () => {
    const m0 = me();
    const m1 = contractPersona(m0, JOSHUA);
    expect(m0.constellation).toEqual([]);        // the original never grew
    expect(m1.constellation).toHaveLength(1);
  });
});
