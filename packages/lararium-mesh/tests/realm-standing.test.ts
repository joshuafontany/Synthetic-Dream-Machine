/**
 * realm-standing — what the FEED SLOTS can honestly say, and where the claim stops.
 *
 * ── THE TWO RULINGS THIS SITS BETWEEN ───────────────────────────────────────────────────────────
 * `first-realm-arc`: "A realm mints no DID and hosts on no machine; nothing stands to create. It
 * begins when someone feeds it — THE FIRST OFFERING IS THE FOUNDING OF THE REALM, never a step after
 * it."
 *
 * `identity-enacts-relation`: `hoʻokipa` reads causative of `kipa`, one-directional by grammar — the
 * host causes a visit. "One firing = a visit. TWO OPPOSED FIRINGS = belonging. Reciprocity is not
 * stipulated by the model; the morphology requires it." And the constructor changes at the seam:
 * below the living human `compose` binds one principal's instruments and buys REACH; at and above it
 * `hoʻokipa` binds DISTINCT LOCI OF COST and deposits DEPTH.
 *
 * ── AND THE SLOTS CANNOT SEE A LOCUS ────────────────────────────────────────────────────────────
 * The constituting condition wants DISTINCT LOCI OF COST. The slots carry FACES: "the writer rides as
 * the persona-root DID — a FACE feeds a realm, not a device". And the daemon "cannot re-verify from
 * its side that the caller custodies that root", so "a human running several of their own faces at one
 * realm reads as the Sybil-of-one the plane already prices SOCIALLY, never in crypto."
 *
 * So a face count is not a locus count, and this reading MUST NOT convert one into the other. Several
 * faces feeding is a fact; whether they are several hands is a reading this side cannot make. Naming
 * it "belonging" would manufacture the reciprocity the morphology requires be earned.
 *
 * The clock stays VERDICT-FREE by construction — it reports who feeds and how deep so a human can see
 * a minority out-feeding a realm. This reading sits beside it and never inside it.
 */
import { describe, it, expect } from "vitest";
import { realmStanding } from "../src/realm-standing.js";

describe("realm-standing — one firing is a visit, two opposed firings are belonging", () => {
  it("★ nobody feeding reads UNFED — no realm stands, and that is honest ★", () => {
    const r = realmStanding([]);
    expect(r.standing).toBe("unfed");
    expect(r.faces).toBe(0);
    // Canon: this reads the same as a realm this replica has never synced.
    expect(r.reading).toMatch(/never synced|nobody|unfed/i);
  });

  it("★ ONE face feeding is a VISIT — the founding offering, and nothing constituted yet ★", () => {
    const r = realmStanding([{ writer: "aa", epoch: 4 }]);
    expect(r.standing).toBe("visit");
    expect(r.faces).toBe(1);
    expect(r.reading).toMatch(/visit|one face|nominal/i);
  });

  it("★ ONE face feeding DEEPLY is still a visit — depth is not a second hand ★", () => {
    // The load-bearing case. A fleet reads nominal BY LAW: one locus of cost cannot carry
    // non-aggregative state however many times it rolls.
    const r = realmStanding([{ writer: "aa", epoch: 900 }]);
    expect(r.standing).toBe("visit");
    expect(r.faces).toBe(1);
  });

  it("★ SEVERAL faces feeding is NOT belonging — the slots cannot see a locus ★", () => {
    // The correction that matters. Two of one human's own faces produce two writer ids, and calling
    // that a mutual hold manufactures the reciprocity the morphology requires be earned.
    const r = realmStanding([{ writer: "aa", epoch: 1 }, { writer: "bb", epoch: 1 }]);
    expect(r.standing).toBe("many-faces");
    expect(r.faces).toBe(2);
    expect(r.reading).toMatch(/sybil-of-one|socially|cannot/i);
    expect(r.reading).not.toMatch(/\bbelonging\b/i);
  });

  it("★ a face that has NOT fed does not count — a slot at zero is no offering ★", () => {
    const r = realmStanding([{ writer: "aa", epoch: 3 }, { writer: "bb", epoch: 0 }]);
    expect(r.standing).toBe("visit");
    expect(r.faces).toBe(1);
  });

  it("★ the same writer twice is ONE face, however the slots are spelled ★", () => {
    expect(realmStanding([{ writer: "AA", epoch: 2 }, { writer: "aa", epoch: 5 }]).faces).toBe(1);
  });

  it("★ NO reading ever claims a locus — the word the slots cannot support ★", () => {
    for (const s of [[], [{ writer: "a", epoch: 1 }], [{ writer: "a", epoch: 1 }, { writer: "b", epoch: 2 }]]) {
      expect(realmStanding(s).reading).not.toMatch(/distinct loci of cost feed/i);
    }
  });

  // ── THE COUNT IS THIS REPLICA'S, AND THAT IS NOW MEASURED ─────────────────────────────────────
  // Walked in docker (`mesh-scenarios.sh realm-crossing`): two CONTRACTED operators fed one realm
  // through a live relay, and A counted her own two faces and never B's third. The slots ride
  // `bags/daemon/lease-epoch/`, whose bag URL each vessel reads off its OWN bootstrap, so a peer's
  // offering never arrives. `unfed` already said "here"; the fed readings implied a complete count.
  it("★ EVERY reading scopes its count to this replica — a peer's offering never arrives ★", () => {
    for (const slots of [[], [{ writer: "a", epoch: 1 }],
                         [{ writer: "a", epoch: 1 }, { writer: "b", epoch: 2 }]]) {
      expect(realmStanding(slots).reading).toMatch(/this replica|this vessel|\bhere\b/i);
    }
  });

  it("★ a fed reading never claims a count across the Nexus ★", () => {
    const r = realmStanding([{ writer: "a", epoch: 1 }, { writer: "b", epoch: 2 }]);
    // The word that would manufacture it: a count presented as the realm's, rather than as what
    // this replica can see. A contracted peer's faces are absent from these slots by construction.
    expect(r.reading).toMatch(/peer|replica|vessel/i);
  });

  it("★ every reading says what it is, so a visit is never read as a realm ★", () => {
    for (const s of [[], [{ writer: "a", epoch: 1 }], [{ writer: "a", epoch: 1 }, { writer: "b", epoch: 2 }]]) {
      expect(realmStanding(s).reading.length).toBeGreaterThan(30);
    }
  });
});
