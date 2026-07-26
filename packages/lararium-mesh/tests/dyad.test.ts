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
  dyadsOnVessel, fleetOfGroup, fleetsOf, fleetSpan,
  nameFleet, unnameFleet, fleetPetnameResolver,
  emptyLarDoc, type DyadRecord, type LarDoc,
} from "../src/index.js";
import type { DeviceDelegationTiddler } from "../src/device-delegation.js";

const VESSEL_A = "0xaa".padEnd(66, "1");
const VESSEL_B = "0xbb".padEnd(66, "2");
const VEIL_WORK = "0xcc".padEnd(66, "3");
const VEIL_PLAY = "0xdd".padEnd(66, "4");
const VEIL_AWAY = "0xee".padEnd(66, "5");   // a DIFFERENT veil key — a veil never spans vessels
const GROUP_ME     = "persona-group-me";
const GROUP_MASKED = "persona-group-masked";

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

  // Only ONE projection reads at this layer. A veil key never spans vessels, so "this face's other places"
  // asks a question the infra layer refuses to answer — which is the unlinkability the layer exists for.
  // Gathering across places belongs one layer up, to the PersonaGroup binding.
  test("a vessel's faces read off the infra layer; a face's other places do NOT", () => {
    const all = [
      dyadFromEdge(edge(VESSEL_A, VEIL_WORK)),
      dyadFromEdge(edge(VESSEL_A, VEIL_PLAY)),
      dyadFromEdge(edge(VESSEL_B, VEIL_AWAY)),
    ];
    expect(dyadsOnVessel(all, VESSEL_A)).toHaveLength(2);     // one place, two faces
    expect(dyadsOnVessel(all, VESSEL_B)).toHaveLength(1);
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

describe("the fleet closes over the BINDING, never over a label", () => {
  const work = dyadFromEdge(edge(VESSEL_A, VEIL_WORK), GROUP_ME);
  const away = dyadFromEdge(edge(VESSEL_B, VEIL_AWAY), GROUP_ME);
  const play = dyadFromEdge(edge(VESSEL_A, VEIL_PLAY), GROUP_MASKED);
  const loose = dyadFromEdge(edge(VESSEL_B, VEIL_PLAY));            // bound to nothing
  const all = [work, away, play, loose];

  test("★ the group gathers locally-unique dyads across vessels — the bridge the infra layer refuses ★", () => {
    const me = fleetOfGroup(all, GROUP_ME);
    expect(me).toHaveLength(2);
    // two DIFFERENT veil keys on two different vessels, gathered by the group's keys alone
    expect(new Set(me.map((d) => d.ref.veilDid))).toEqual(new Set([VEIL_WORK, VEIL_AWAY]));
    expect(new Set(me.map((d) => d.ref.vesselDid))).toEqual(new Set([VESSEL_A, VESSEL_B]));
  });

  test("a second group on the SAME vessel stays a separate fleet", () => {
    expect(fleetOfGroup(all, GROUP_MASKED)).toHaveLength(1);
    expect(fleetOfGroup(all, GROUP_MASKED)[0]!.ref.veilDid).toBe(VEIL_PLAY);
  });

  test("an UNBOUND dyad joins no fleet — absence never reads as default membership", () => {
    expect(fleetsOf(all).size).toBe(2);
    expect([...fleetsOf(all).values()].flat()).not.toContain(loose);
  });

  test("a blank group gathers nothing rather than everything", () => {
    expect(fleetOfGroup(all, "")).toEqual([]);
    expect(fleetOfGroup(all, "   ")).toEqual([]);
  });

  test("fleetSpan counts DISTINCT vessels — the reach that makes leaving cheap", () => {
    expect(fleetSpan(fleetOfGroup(all, GROUP_ME))).toBe(2);
    expect(fleetSpan(fleetOfGroup(all, GROUP_MASKED))).toBe(1);
    expect(fleetSpan([])).toBe(0);
  });

  test("a forged record naming a group it never joined stays a CLAIM — the pointer carries no authority", () => {
    // Nothing here can stop a record naming a group; the binding's authority sits in the group's own
    // sentinel membership. This test pins the honest limit rather than pretending the pointer verifies.
    const forged = dyadFromEdge(edge(VESSEL_B, VEIL_PLAY), GROUP_ME);
    expect(fleetOfGroup([...all, forged], GROUP_ME)).toHaveLength(3);
  });
});

describe("the fleet NAME store — usable, and never a membership", () => {
  /** A store standing in for the platform seam (node fs / browser IDB). */
  function memStore() {
    const m = new Map<string, string>();
    return {
      map: m,
      get: async (id: string) => m.get(id),
      set: async (id: string, p: string) => void m.set(id, p),
      clear: async (id: string) => void m.delete(id),
      entries: async () => [...m.entries()] as ReadonlyArray<readonly [string, string]>,
    };
  }

  const work = dyadFromEdge(edge(VESSEL_A, VEIL_WORK), GROUP_ME);
  const away = dyadFromEdge(edge(VESSEL_B, VEIL_AWAY), GROUP_ME);

  test("a fleet reads back under the human's own name", async () => {
    const store = memStore();
    await nameFleet(store, GROUP_ME, "  my crew  ");                // trimmed on the way in
    const resolve = await fleetPetnameResolver(store);
    expect(resolve(GROUP_ME)).toBe("my crew");
    expect(fleetSpan(fleetOfGroup([work, away], GROUP_ME))).toBe(2);
  });

  test("★ RENAMING moves a label and never a membership ★", async () => {
    const store = memStore();
    await nameFleet(store, GROUP_ME, "my crew");
    await nameFleet(store, GROUP_ME, "the other one");
    expect(fleetOfGroup([work, away], GROUP_ME)).toHaveLength(2);   // untouched by the rename
  });

  test("a BLANK name refuses rather than silently erasing one", async () => {
    const store = memStore();
    await nameFleet(store, GROUP_ME, "my crew");
    await expect(nameFleet(store, GROUP_ME, "   ")).rejects.toThrow(/blank label/);
    expect(await store.get(GROUP_ME)).toBe("my crew");
  });

  test("UNNAMING drops the label and the fleet SURVIVES — the binding decides, not the name", async () => {
    const store = memStore();
    await nameFleet(store, GROUP_ME, "my crew");
    await unnameFleet(store, GROUP_ME);

    const resolve = await fleetPetnameResolver(store);
    expect(resolve(GROUP_ME)).toBeUndefined();                      // nameless …
    expect(fleetOfGroup([work, away], GROUP_ME)).toHaveLength(2);   // … and still a fleet
  });
});
