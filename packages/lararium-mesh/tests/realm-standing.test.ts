/**
 * realm-standing — a visit, or belonging, read off who actually feeds.
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
 * ── SO THE READING IS A COUNT OF LOCI, NEVER OF FEEDS ───────────────────────────────────────────
 * One face feeding a hundred times has visited a hundred times and constituted nothing: a fleet reads
 * "nominal BY LAW rather than by measurement", because one locus of cost cannot carry non-aggregative
 * state. Two distinct loci, each having fed, are the mutual hold.
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
    expect(r.loci).toBe(0);
    // Canon: this reads the same as a realm this replica has never synced.
    expect(r.reading).toMatch(/never synced|nobody|unfed/i);
  });

  it("★ ONE locus feeding is a VISIT — the founding offering, and nothing constituted yet ★", () => {
    const r = realmStanding([{ writer: "aa", epoch: 4 }]);
    expect(r.standing).toBe("visit");
    expect(r.loci).toBe(1);
    expect(r.reading).toMatch(/visit|one locus|nominal/i);
  });

  it("★ ONE locus feeding DEEPLY is still a visit — depth is not a second hand ★", () => {
    // The load-bearing case. A fleet reads nominal BY LAW: one locus of cost cannot carry
    // non-aggregative state however many times it rolls.
    const r = realmStanding([{ writer: "aa", epoch: 900 }]);
    expect(r.standing).toBe("visit");
    expect(r.loci).toBe(1);
  });

  it("★ TWO distinct loci, each having fed, is BELONGING ★", () => {
    const r = realmStanding([{ writer: "aa", epoch: 1 }, { writer: "bb", epoch: 1 }]);
    expect(r.standing).toBe("belonging");
    expect(r.loci).toBe(2);
    expect(r.reading).toMatch(/belong|mutual|two/i);
  });

  it("★ a locus that has NOT fed does not count — a slot at zero is no offering ★", () => {
    const r = realmStanding([{ writer: "aa", epoch: 3 }, { writer: "bb", epoch: 0 }]);
    expect(r.standing).toBe("visit");
    expect(r.loci).toBe(1);
  });

  it("★ the same writer twice is ONE locus, however the slots are spelled ★", () => {
    expect(realmStanding([{ writer: "AA", epoch: 2 }, { writer: "aa", epoch: 5 }]).loci).toBe(1);
  });

  it("★ every reading says what it is, so a visit is never read as a realm ★", () => {
    for (const s of [[], [{ writer: "a", epoch: 1 }], [{ writer: "a", epoch: 1 }, { writer: "b", epoch: 2 }]]) {
      expect(realmStanding(s).reading.length).toBeGreaterThan(30);
    }
  });
});
