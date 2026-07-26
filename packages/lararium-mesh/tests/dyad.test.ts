/**
 * dyad — the relationship stands on its own, the fleet stays a query, and neither trusts a label over a signature.
 *
 * The arms that carry weight: N dyads live on ONE vessel without overwriting (the whole point of making the
 * relationship first-class), a stored id that disagrees with its own edge DROPS (the signature outranks the
 * label), and the fleet computes from the human's private labels rather than from any key — so nothing
 * stores a fleet anyone could seize.
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/persona-circle · lar:///ha.ka.ba/lares/api/pono/group-as-closure
 */
import { describe, test, expect } from "vitest";
import {
  dyadId, dyadSlotKey, dyadFromEdge, writeDyad, dyadsFromDoc,
  dyadsOfVeil, dyadsOnVessel, fleetUnderPetname, fleetsOf, fleetSpan,
  emptyLarDoc, type DyadRecord, type LarDoc,
} from "../src/index.js";
import type { DeviceDelegationTiddler } from "../src/device-delegation.js";

const VESSEL_A = "0xaa".padEnd(66, "1");
const VESSEL_B = "0xbb".padEnd(66, "2");
const VEIL_WORK = "0xcc".padEnd(66, "3");
const VEIL_PLAY = "0xdd".padEnd(66, "4");

/** An edge shaped as the delegation builder produces one — only the fields a dyad reads matter here. */
function edge(vesselDid: string, veilDid: string): DeviceDelegationTiddler {
  return {
    kind: "device-delegation",
    operatorDid: veilDid, deviceDid: vesselDid,
    deviceVerifyingKey: vesselDid.slice(2), hearthTrueName: "bafyHearth",
    issuedAt: "2026-07-20T00:00:00Z", expiresAt: "2027-07-20T00:00:00Z",
    boundEpoch: 0, sig: "00".repeat(64),
  } as unknown as DeviceDelegationTiddler;
}

function docOf(records: readonly DyadRecord[]): LarDoc {
  const doc = emptyLarDoc();
  for (const r of records) writeDyad(doc, r);
  return doc;
}

describe("the dyad names a relationship, derived from the edge that makes it", () => {
  test("the id derives deterministically, and case never forks it", () => {
    const a = dyadId({ vesselDid: VESSEL_A, veilDid: VEIL_WORK });
    expect(dyadId({ vesselDid: VESSEL_A.toUpperCase(), veilDid: VEIL_WORK.toUpperCase() })).toBe(a);
    // ORDER carries meaning — place-then-face. Swapping the ends names a different relationship.
    expect(dyadId({ vesselDid: VEIL_WORK, veilDid: VESSEL_A })).not.toBe(a);
  });

  test("distinct pairs derive distinct ids across BOTH axes", () => {
    const ids = new Set([
      dyadId({ vesselDid: VESSEL_A, veilDid: VEIL_WORK }),
      dyadId({ vesselDid: VESSEL_A, veilDid: VEIL_PLAY }),
      dyadId({ vesselDid: VESSEL_B, veilDid: VEIL_WORK }),
      dyadId({ vesselDid: VESSEL_B, veilDid: VEIL_PLAY }),
    ]);
    expect(ids.size).toBe(4);
  });

  test("the record derives its ref from the EDGE, never from an argument beside it", () => {
    const d = dyadFromEdge(edge(VESSEL_A, VEIL_WORK));
    expect(d.ref.vesselDid).toBe(VESSEL_A);
    expect(d.ref.veilDid).toBe(VEIL_WORK);
    expect(d.dyadId).toBe(dyadId({ vesselDid: VESSEL_A, veilDid: VEIL_WORK }));
  });
});

describe("N dyads live on ONE vessel", () => {
  test("★ three faces on one vessel occupy three slots — none overwrites another ★", () => {
    const work = dyadFromEdge(edge(VESSEL_A, VEIL_WORK));
    const play = dyadFromEdge(edge(VESSEL_A, VEIL_PLAY));
    const doc  = docOf([work, play]);

    expect(Object.keys(doc.tiddlers)).toHaveLength(2);
    expect(dyadsFromDoc(doc)).toHaveLength(2);
    expect(dyadSlotKey(work.dyadId)).not.toBe(dyadSlotKey(play.dyadId));
    // and the slot key carries the ID, so a key listing never enumerates the human's faces
    expect(dyadSlotKey(work.dyadId)).not.toContain(VEIL_WORK);
  });

  test("re-writing the SAME relationship stays one slot — a dyad never duplicates itself", () => {
    const d = dyadFromEdge(edge(VESSEL_A, VEIL_WORK));
    expect(dyadsFromDoc(docOf([d, d]))).toHaveLength(1);
  });

  test("the two projections read the two axes", () => {
    const all = [
      dyadFromEdge(edge(VESSEL_A, VEIL_WORK)),
      dyadFromEdge(edge(VESSEL_A, VEIL_PLAY)),
      dyadFromEdge(edge(VESSEL_B, VEIL_WORK)),
    ];
    expect(dyadsOfVeil(all, VEIL_WORK)).toHaveLength(2);      // one face, two places
    expect(dyadsOnVessel(all, VESSEL_A)).toHaveLength(2);     // one place, two faces
  });
});

describe("the signature outranks the label", () => {
  test("★ a slot claiming an id its own edge does not produce DROPS ★", () => {
    const good = dyadFromEdge(edge(VESSEL_A, VEIL_WORK));
    const doc  = docOf([good]);
    // forge a slot whose stored id disagrees with the edge inside it
    const key = dyadSlotKey("f".repeat(64));
    doc.tiddlers[key] = {
      id: key, tiddler: { text: JSON.stringify({ ...good, dyadId: "f".repeat(64) }) },
    } as never;

    const read = dyadsFromDoc(doc);
    expect(read).toHaveLength(1);
    expect(read[0]!.dyadId).toBe(good.dyadId);
  });

  test("a torn, foreign, or edgeless tiddler drops in silence", () => {
    const doc = docOf([dyadFromEdge(edge(VESSEL_A, VEIL_WORK))]);
    doc.tiddlers["lar:///unrelated"] = { id: "lar:///unrelated", tiddler: { text: "not json" } } as never;
    doc.tiddlers["lar:///no-edge"]   = {
      id: "lar:///no-edge", tiddler: { text: JSON.stringify({ kind: "lar-dyad/v1" }) },
    } as never;
    expect(dyadsFromDoc(doc)).toHaveLength(1);
    expect(dyadsFromDoc(null)).toEqual([]);
  });
});

describe("the fleet evaluates as a closure and stores nothing", () => {
  const work = dyadFromEdge(edge(VESSEL_A, VEIL_WORK));
  const play = dyadFromEdge(edge(VESSEL_A, VEIL_PLAY));
  const away = dyadFromEdge(edge(VESSEL_B, VEIL_WORK));
  const all  = [work, play, away];

  // The human's OWN private labels do the gathering — never a key. So a fleet may span faces, and the
  // gathering belongs to the reader alone; nothing on any doc names it.
  const labels = new Map([[work.dyadId, "me"], [away.dyadId, "me"], [play.dyadId, "masked"]]);
  const petnameOf = (id: string) => labels.get(id);

  test("gathers by the CHOSEN label, across faces and across vessels", () => {
    const me = fleetUnderPetname(all, "me", petnameOf);
    expect(me).toHaveLength(2);
    expect(new Set(me.map((d) => d.ref.vesselDid))).toEqual(new Set([VESSEL_A, VESSEL_B]));

    const masked = fleetUnderPetname(all, "masked", petnameOf);
    expect(masked).toHaveLength(1);
    expect(masked[0]!.ref.veilDid).toBe(VEIL_PLAY);   // a different face, deliberately a different fleet
  });

  test("an UNLABELLED dyad joins no fleet — absence never reads as a default membership", () => {
    const lonely = dyadFromEdge(edge(VESSEL_B, VEIL_PLAY));
    expect(fleetUnderPetname([...all, lonely], "me", petnameOf)).toHaveLength(2);
    expect(fleetsOf([...all, lonely], petnameOf).size).toBe(2);
    expect([...fleetsOf([...all, lonely], petnameOf).keys()].sort()).toEqual(["masked", "me"]);
  });

  test("an empty or blank label gathers nothing rather than everything", () => {
    expect(fleetUnderPetname(all, "", petnameOf)).toEqual([]);
    expect(fleetUnderPetname(all, "   ", petnameOf)).toEqual([]);
  });

  // The number that decides whether exit means anything: a fleet on one vessel dies with that vessel.
  test("fleetSpan counts DISTINCT vessels — the reach that makes leaving cheap", () => {
    expect(fleetSpan(fleetUnderPetname(all, "me", petnameOf))).toBe(2);
    expect(fleetSpan(fleetUnderPetname(all, "masked", petnameOf))).toBe(1);
    expect(fleetSpan([])).toBe(0);
  });
});
