/**
 * cooling-cause — a cache decision must never be reported as a polity's death.
 *
 * ── THE CONFLATION, MEASURED ────────────────────────────────────────────────────────────────────
 * `deriveCabalRealmLiveness` reads a realm's liveness off its substrate's residency temperature.
 * The file already guards ABSENCE: a substrate this replica never synced reads `unread`, because
 * "temperature is a fact about a PLACE; liveness is a fact about a PRINCIPAL".
 *
 * The guard stops one state short. `anu` arrives from TWO causes that the temperature alone cannot
 * tell apart:
 *   · UNFED  — nobody touched it past `idleMs`. Canon-relevant: `carry-contract` has a cabal
 *              "dissolving to `anu` when unfed", scoped bilaterally ("you are out, BETWEEN US").
 *   · RECLAIMED — this vessel took the memory back: `enforceCap` LRU-trimmed it past `hotCap`, or
 *              the daemon sent an evict request. The sweeper's own note concedes the trim is "pure-age
 *              LRU and so is not scan-resistant — a one-shot sweep over many bags can evict the
 *              genuine working set." Neither mechanism can see how well the realm is fed.
 *
 * So a realm a dozen faces are actively feeding reads `dissolved` because THIS vessel's cache filled.
 * No canon supports "a realm dissolves because its holder held too many realms" — that is a memory
 * budget wearing a governance verdict's clothes.
 *
 * ── THE RULE ────────────────────────────────────────────────────────────────────────────────────
 * `one-name-one-relation`: defaulting an absence is correct WITHIN an axis, a fabricated verdict
 * ACROSS one. Resources → polity is across. A reclaim therefore reports `unread` — this vessel
 * stopped holding it, and that says nothing about who feeds it — and only UNFED cooling carries the
 * reading canon scopes bilaterally. The two causes are named for WHAT THE FACT IS ABOUT, so a new
 * mechanism that frees memory joins `reclaimed` rather than arriving as a third spelling.
 */
import { describe, it, expect } from "vitest";
import { BagStowage } from "../src/bag-residency.js";
import { deriveCabalRealmLiveness, livenessIsAboutTheRealm } from "../src/cabal-realm.js";

const URL_A = "automerge:realmA";

describe("cooling-cause — why a bag went cold decides what may be said about the realm", () => {
  it("★ a RECLAIMED realm reads `unread`, never `dissolved` — that was my budget, not their silence ★", () => {
    expect(deriveCabalRealmLiveness("anu", "reclaimed")).toBe("unread");
  });

  it("★ an UNFED realm still reads `dissolved` — canon's dissolve-by-cooling survives ★", () => {
    expect(deriveCabalRealmLiveness("anu", "unfed")).toBe("dissolved");
  });

  it("★ warm is alive whatever the cause field says ★", () => {
    expect(deriveCabalRealmLiveness("wela", "reclaimed")).toBe("alive");
    expect(deriveCabalRealmLiveness("wela", null)).toBe("alive");
  });

  it("★ absence still outranks cause — never synced stays `unread` ★", () => {
    expect(deriveCabalRealmLiveness(null, "unfed")).toBe("unread");
    expect(deriveCabalRealmLiveness(undefined, "unfed")).toBe("unread");
  });

  it("★ cold with NO recorded cause refuses to convict — the safe default is `unread` ★", () => {
    // A reading that cannot tell a budget from a silence must not pick the harsher one.
    expect(deriveCabalRealmLiveness("anu", null)).toBe("unread");
    expect(deriveCabalRealmLiveness("anu")).toBe("unread");
  });

  it("★ the engine RECORDS the cause — an LRU trim is marked `reclaimed` ★", async () => {
    const mgr = new BagStowage({ hotCap: 1 });
    mgr.touch(URL_A);
    mgr.touch("automerge:realmB");   // pushes past hotCap; oldest (A) is LRU-trimmed
    await mgr.sweepOnce();
    expect(mgr.tier(URL_A)).toBe("anu");
    expect(mgr.cooledBy(URL_A)).toBe("reclaimed");
  });

  it("★ `evict` records a RECLAIM — the name means freeing memory, and the cause follows it ★", async () => {
    // The daemon's evict-request path runs through here. An administrative evict is a resource act.
    const mgr = new BagStowage({ hotCap: 8 });
    await mgr.touch(URL_A);
    await mgr.evict(URL_A);
    expect(mgr.cooledBy(URL_A)).toBe("reclaimed");
  });

  it("★ an explicit cool is UNFED — the ordinary starve path keeps its meaning ★", async () => {
    const mgr = new BagStowage({ hotCap: 8 });
    mgr.touch(URL_A);
    await mgr.cool(URL_A);
    expect(mgr.cooledBy(URL_A)).toBe("unfed");
  });

  it("★ re-warming CLEARS the cause — a fed bag carries no stale verdict ★", async () => {
    const mgr = new BagStowage({ hotCap: 8 });
    mgr.touch(URL_A);
    await mgr.cool(URL_A);
    mgr.touch(URL_A);
    expect(mgr.cooledBy(URL_A)).toBe(null);
  });

  it("★ a bag never registered reports no cause, not a fabricated one ★", () => {
    expect(new BagStowage({}).cooledBy("automerge:nothing")).toBe(null);
  });

  // ── THE SECOND CONFLATION, ONE LEVEL UP ───────────────────────────────────────────────────────
  // A realm is a COLLECTIVE BOUND BY INTERACTION, and residency temperature cannot see a collective:
  // every warming act is local and replication is not wired to residency (`setSyncActive` has no
  // production caller). So a cold substrate means "I stopped feeding it", never "it ended".

  it("★ `dissolved` is NOT a fact about the realm — it reports a DEPARTURE ★", () => {
    // carry-contract scopes this bilaterally: "you are out, BETWEEN US". The collective may be
    // humming without this replica, and other meshes stand out of view entirely.
    expect(livenessIsAboutTheRealm("dissolved")).toBe(false);
  });

  it("★ `alive` IS about the realm — warmth is evidence, cold is only absence of it ★", () => {
    // The asymmetry is the point. A synced substrate this vessel actively works is weak evidence
    // that something stands here; ceasing to look is evidence of nothing.
    expect(livenessIsAboutTheRealm("alive")).toBe(true);
  });

  it("★ `unread` stays outside — this vessel never looked ★", () => {
    expect(livenessIsAboutTheRealm("unread")).toBe(false);
  });
});
