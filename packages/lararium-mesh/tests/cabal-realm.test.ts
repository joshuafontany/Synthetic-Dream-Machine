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
  feedCabalRealm,
  cabalRealmJoinGate,
  type CabalRealm,
} from "../src/cabal-realm.js";
import { leaseEpochSlotUri } from "../src/epoch-lease.js";
import { BagResidencyManager } from "../src/bag-residency.js";

const PLACE: CabalRealm = {
  placeDocIdHex:   "0xdoc_aaa",
  placeAgentIdHex: "0xagent_aaa",
  substrateUrl:    "automerge:cabal-substrate-aaa",
  genesisUri:      "lar:///crossroads.fed.holds/cabal/aaa",
};

describe("cabalRealmLeaseSlot — the place's liveness lease, DocId-keyed", () => {
  test("deterministic + = the epoch-lease slot keyed by the sentinel DocId", () => {
    expect(cabalRealmLeaseSlot(PLACE.placeDocIdHex, "writer-1"))
      .toBe(cabalRealmLeaseSlot(PLACE.placeDocIdHex, "writer-1"));
    expect(cabalRealmLeaseSlot(PLACE.placeDocIdHex, "writer-1"))
      .toBe(leaseEpochSlotUri(PLACE.placeDocIdHex, "writer-1"));
  });

  test("keyed by docId — different places → different slots", () => {
    const a = cabalRealmLeaseSlot("0xdoc_aaa", "w");
    const b = cabalRealmLeaseSlot("0xdoc_bbb", "w");
    expect(a).not.toBe(b);
  });

  test("keyed by writer — different writers → distinct slots under one place", () => {
    expect(cabalRealmLeaseSlot(PLACE.placeDocIdHex, "w1"))
      .not.toBe(cabalRealmLeaseSlot(PLACE.placeDocIdHex, "w2"));
  });
});

describe("deriveCabalRealmLiveness — pure read off the residency temperature", () => {
  test("wela → alive (fed, humming)", () => {
    expect(deriveCabalRealmLiveness("wela")).toBe("alive");
  });
  test("anu → dissolved (cooled, unfed — re-warmable, never deleted)", () => {
    expect(deriveCabalRealmLiveness("anu")).toBe("dissolved");
  });
});

describe("feedCabalRealm — member maintenance warms the substrate (commoning)", () => {
  test("touch heats the substrate to wela → the place reads alive", async () => {
    const mgr = new BagResidencyManager();
    mgr.registerCold(PLACE.substrateUrl);
    expect(mgr.tier(PLACE.substrateUrl)).toBe("anu");           // unfed → cold
    expect(deriveCabalRealmLiveness(mgr.tier(PLACE.substrateUrl)!)).toBe("dissolved");

    await feedCabalRealm(mgr, PLACE);                            // hoʻowela

    expect(mgr.tier(PLACE.substrateUrl)).toBe("wela");          // fed → hot
    expect(deriveCabalRealmLiveness(mgr.tier(PLACE.substrateUrl)!)).toBe("alive");
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
