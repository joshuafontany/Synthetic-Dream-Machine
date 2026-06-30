/**
 * cabal-place — the platform-blind mesh FLOOR for a CabalGroup-as-PLACE.
 *
 * Proves the cut-1 composition seam: the place's liveness lease keys by its
 * sentinel DocId (deterministic, DocId-keyed), liveness derives purely from the
 * substrate's residency temperature, feeding warms the substrate (alive), and
 * the join gate stays INERT (identity passes through unchanged — the
 * capture-gap left open, canon #the-unswept-corner).
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/cabal-place
 */

import { describe, test, expect } from "vitest";
import {
  cabalPlaceLeaseSlot,
  deriveCabalPlaceLiveness,
  feedCabalPlace,
  cabalPlaceJoinGate,
  type CabalPlace,
} from "../src/cabal-place.js";
import { leaseEpochSlotUri } from "../src/epoch-lease.js";
import { BagResidencyManager } from "../src/bag-residency.js";

const PLACE: CabalPlace = {
  placeDocIdHex:   "0xdoc_aaa",
  placeAgentIdHex: "0xagent_aaa",
  substrateUrl:    "automerge:cabal-substrate-aaa",
  genesisUri:      "lar:///crossroads.fed.holds/cabal/aaa",
};

describe("cabalPlaceLeaseSlot — the place's liveness lease, DocId-keyed", () => {
  test("deterministic + = the epoch-lease slot keyed by the sentinel DocId", () => {
    expect(cabalPlaceLeaseSlot(PLACE.placeDocIdHex, "writer-1"))
      .toBe(cabalPlaceLeaseSlot(PLACE.placeDocIdHex, "writer-1"));
    expect(cabalPlaceLeaseSlot(PLACE.placeDocIdHex, "writer-1"))
      .toBe(leaseEpochSlotUri(PLACE.placeDocIdHex, "writer-1"));
  });

  test("keyed by docId — different places → different slots", () => {
    const a = cabalPlaceLeaseSlot("0xdoc_aaa", "w");
    const b = cabalPlaceLeaseSlot("0xdoc_bbb", "w");
    expect(a).not.toBe(b);
  });

  test("keyed by writer — different writers → distinct slots under one place", () => {
    expect(cabalPlaceLeaseSlot(PLACE.placeDocIdHex, "w1"))
      .not.toBe(cabalPlaceLeaseSlot(PLACE.placeDocIdHex, "w2"));
  });
});

describe("deriveCabalPlaceLiveness — pure read off the residency temperature", () => {
  test("wela → alive (fed, humming)", () => {
    expect(deriveCabalPlaceLiveness("wela")).toBe("alive");
  });
  test("anu → dissolved (cooled, unfed — re-warmable, never deleted)", () => {
    expect(deriveCabalPlaceLiveness("anu")).toBe("dissolved");
  });
});

describe("feedCabalPlace — member maintenance warms the substrate (commoning)", () => {
  test("touch heats the substrate to wela → the place reads alive", async () => {
    const mgr = new BagResidencyManager();
    mgr.registerCold(PLACE.substrateUrl);
    expect(mgr.tier(PLACE.substrateUrl)).toBe("anu");           // unfed → cold
    expect(deriveCabalPlaceLiveness(mgr.tier(PLACE.substrateUrl)!)).toBe("dissolved");

    await feedCabalPlace(mgr, PLACE);                            // hoʻowela

    expect(mgr.tier(PLACE.substrateUrl)).toBe("wela");          // fed → hot
    expect(deriveCabalPlaceLiveness(mgr.tier(PLACE.substrateUrl)!)).toBe("alive");
  });
});

describe("cabalPlaceJoinGate — INERT (the capture-gap stays OPEN)", () => {
  test("passes the joiner identity through UNCHANGED — no legitimacy signal baked", () => {
    const id = "0xjoiner_zzz";
    expect(cabalPlaceJoinGate(id)).toBe(id);
    // identity-only, inert: no transform, no admit/deny verdict, no scoring.
    expect(cabalPlaceJoinGate("")).toBe("");
  });
});
