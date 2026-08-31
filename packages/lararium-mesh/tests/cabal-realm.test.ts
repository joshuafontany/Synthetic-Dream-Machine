/**
 * cabal-realm — the platform-blind mesh FLOOR for a CabalGroup-as-REALM.
 *
 * Proves the cut-1 composition shore: the realm's liveness lease keys by its
 * sentinel DocId (deterministic, DocId-keyed), liveness derives purely from the
 * substrate's residency temperature, feeding warms the substrate (alive), and
 * the join gate stays INERT (identity passes through unchanged — the
 * capture-gap left open, canon #the-unswept-corner).
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-realm
 */

import { describe, test, expect } from "vitest";
import {
  cabalRealmLeaseSlot,
  deriveCabalRealmLiveness,
  livenessIsAboutTheRealm,
  feedCabalRealm,
  cabalRealmJoinGate,
  type CabalRealm,
} from "../src/cabal-realm.js";
import { leaseEpochSlotUri } from "../src/epoch-lease.js";
import { BagStowage } from "../src/bag-residency.js";

const REALM: CabalRealm = {
  realmDocIdHex:   "0xdoc_aaa",
  realmAgentIdHex: "0xagent_aaa",
  substrateUrl:    "automerge:cabal-substrate-aaa",
  genesisUri:      "lar:///crossroads.fed.holds/cabal/aaa",
};

describe("cabalRealmLeaseSlot — the realm's liveness lease, DocId-keyed", () => {
  test("deterministic + = the epoch-lease slot keyed by the sentinel DocId", () => {
    expect(cabalRealmLeaseSlot(REALM.realmDocIdHex, "writer-1"))
      .toBe(cabalRealmLeaseSlot(REALM.realmDocIdHex, "writer-1"));
    expect(cabalRealmLeaseSlot(REALM.realmDocIdHex, "writer-1"))
      .toBe(leaseEpochSlotUri(REALM.realmDocIdHex, "writer-1"));
  });

  test("keyed by docId — different realms → different slots", () => {
    const a = cabalRealmLeaseSlot("0xdoc_aaa", "w");
    const b = cabalRealmLeaseSlot("0xdoc_bbb", "w");
    expect(a).not.toBe(b);
  });

  test("keyed by writer — different writers → distinct slots under one realm", () => {
    expect(cabalRealmLeaseSlot(REALM.realmDocIdHex, "w1"))
      .not.toBe(cabalRealmLeaseSlot(REALM.realmDocIdHex, "w2"));
  });
});

describe("deriveCabalRealmLiveness — pure read off the residency temperature", () => {
  test("wela → alive (fed, humming)", () => {
    expect(deriveCabalRealmLiveness("wela")).toBe("alive");
  });
  test("anu + UNFED → dissolved (re-warmable, never deleted)", () => {
    expect(deriveCabalRealmLiveness("anu", "unfed")).toBe("dissolved");
  });
  test("anu with no recorded cause → unread — cold alone cannot convict", () => {
    // A cap trim and a starve both land on `anu`; only one is about the realm.
    expect(deriveCabalRealmLiveness("anu")).toBe("unread");
  });
});

describe("feedCabalRealm — member maintenance warms the substrate (commoning)", () => {
  test("touch heats the substrate to wela → the realm reads alive", async () => {
    const mgr = new BagStowage();
    mgr.registerCold(REALM.substrateUrl);
    expect(mgr.tier(REALM.substrateUrl)).toBe("anu");           // known, never loaded
    // `registerCold` with NO cause is the never-synced case: this vessel holds a URL and no reading
    // behind it, so it reads `unread`. A founding rite passes `"unfed"` here and gets the verdict
    // that belongs to a realm nobody has fed. Cold alone never carried it; the CAUSE does.
    expect(deriveCabalRealmLiveness(
      mgr.tier(REALM.substrateUrl)!, mgr.cooledBy(REALM.substrateUrl))).toBe("unread");

    await feedCabalRealm(mgr, REALM);                            // hoʻowela

    expect(mgr.tier(REALM.substrateUrl)).toBe("wela");          // fed → hot
    expect(deriveCabalRealmLiveness(mgr.tier(REALM.substrateUrl)!)).toBe("alive");
  });
});

describe("cabalRealmJoinGate — INERT (the capture-gap stays OPEN)", () => {
  test("passes the joiner identity through UNCHANGED — no legitimacy signal baked", () => {
    const id = "0xjoiner_zzz";
    expect(cabalRealmJoinGate(id)).toBe(id);
    // identity-only, inert: no transform, no admit/deny verdict, no scoring.
    expect(cabalRealmJoinGate("")).toBe("");
  });
});

describe("★ absence of a load is NOT absence of a polity ★", () => {
  test("★ a substrate this vessel never synced reads `unread`, never `dissolved` ★", () => {
    // Temperature is a fact about a PLACE; liveness is a fact about a PRINCIPAL. Under no-global-now
    // "I never fetched it" and "it ended" generate identically, so defaulting the gap to cold answers a
    // question about a polity with a fact about a cache.
    expect(deriveCabalRealmLiveness(undefined)).toBe("unread");
    expect(deriveCabalRealmLiveness(undefined)).not.toBe("dissolved");
  });

  test("a reading this vessel DOES hold still speaks about the realm", () => {
    expect(deriveCabalRealmLiveness("wela")).toBe("alive");
    expect(deriveCabalRealmLiveness("anu", "unfed")).toBe("dissolved");
  });

  test("★ a caller can tell a verdict from a blind spot ★", () => {
    // Without this, every gate on liveness silently treats its own blindness as the realm's death.
    expect(livenessIsAboutTheRealm("unread")).toBe(false);
    expect(livenessIsAboutTheRealm("dissolved")).toBe(true);
    expect(livenessIsAboutTheRealm("alive")).toBe(true);
  });
});
