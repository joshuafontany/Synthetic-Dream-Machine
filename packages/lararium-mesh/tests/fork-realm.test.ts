/**
 * fork-realm — fork-as-exit, the capture-answer's escape half. Tests the model floor:
 * survivor computation (exclude-by-omission), the fork bearing, and the Zooko re-point.
 * The real-Keyhive fork (the captors structurally locked out) rides the lifecycle probe.
 */
import { describe, test, expect } from "vitest";
import {
  forkSurvivors, forkGenesisUri, repointToFork,
  type CabalRealm, type RealmFork,
} from "../src/index.js";

const OLD_ROSTER = ["0xsurvivor_a", "0xsurvivor_b", "0xcaptor"];

const FORK_REALM: CabalRealm = {
  realmDocIdHex:   "0xfork_realm",
  realmAgentIdHex: "0xfork_agent",
  substrateUrl:    "automerge:realm-substrate-fork",
  genesisUri:      "lar:///crossroads.cabal.gathers/realm/fork",
};
const fork: RealmFork = {
  forkedFromDocIdHex: "0xcaptured_realm",
  newRealm: FORK_REALM,
  survivors: ["0xsurvivor_a", "0xsurvivor_b"],
  excluded: ["0xcaptor"],
};

describe("fork-realm — fork-as-exit", () => {
  test("survivors = the old roster minus the captors (exclude by omission)", () => {
    const s = forkSurvivors(OLD_ROSTER, ["0xcaptor"]);
    expect(s).toEqual(["0xsurvivor_a", "0xsurvivor_b"]);
    expect(s).not.toContain("0xcaptor");
  });

  test("excluding no one carries the whole roster; excluding all carries none", () => {
    expect(forkSurvivors(OLD_ROSTER, [])).toEqual(OLD_ROSTER);
    expect(forkSurvivors(OLD_ROSTER, OLD_ROSTER)).toEqual([]);
  });

  test("the fork bearing rides a /fork path segment — the three-term ROOT stays intact", () => {
    expect(forkGenesisUri("lar:///crossroads.cabal.gathers/realm")).toBe("lar:///crossroads.cabal.gathers/realm/fork");
    // trailing slash tolerated
    expect(forkGenesisUri("lar:///crossroads.cabal.gathers/realm/")).toBe("lar:///crossroads.cabal.gathers/realm/fork");
  });

  test("a vessel re-points ONLY its pointer at the captured realm; other pointers untouched", () => {
    // a survivor sitting on the captured realm moves to the fork
    expect(repointToFork("0xcaptured_realm", fork)).toBe("0xfork_realm");
    // a pointer elsewhere is left alone (idempotent for non-matching)
    expect(repointToFork("0xsome_other_realm", fork)).toBe("0xsome_other_realm");
    // the fork's own id re-points to itself (already there → unchanged, not the old id)
    expect(repointToFork("0xfork_realm", fork)).toBe("0xfork_realm");
  });

  test("continuity link — the fork records the realm it forked FROM (legitimacy re-anchor)", () => {
    expect(fork.forkedFromDocIdHex).toBe("0xcaptured_realm");
    expect(fork.newRealm.realmDocIdHex).not.toBe(fork.forkedFromDocIdHex);   // a FRESH identity
  });
});
