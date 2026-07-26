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
import { describe, test, expect, beforeAll } from "vitest";
import * as ed from "@noble/ed25519";
import { hex, hexToBytes } from "../src/crypto.js";
import {
  dyadId, dyadSlotKey, dyadFromEdge, writeDyad, dyadsFromDoc,
  dyadsOnVessel, fleetOfGroup, fleetsOf, fleetSpan,
  nameFleet, unnameFleet, fleetPetnameResolver,
  dyadAgentDid, verifiedFleetOfGroup, signDyadBinding, dyadBindingBytes,
  emptyLarDoc, type DyadRecord, type LarDoc,
} from "../src/index.js";
import type { DeviceDelegationTiddler } from "../src/device-delegation.js";

const VESSEL_A = "0xaa".padEnd(66, "1");
const VESSEL_B = "0xbb".padEnd(66, "2");
const VEIL_WORK = "0xcc".padEnd(66, "3");
const VEIL_PLAY = "0xdd".padEnd(66, "4");
const VEIL_AWAY = "0xee".padEnd(66, "5");   // a DIFFERENT veil key — a veil never spans vessels
const ROOT_ME_SEED     = new Uint8Array(32).fill(7);    // the group ROOT that signs bindings
const ROOT_MASKED_SEED = new Uint8Array(32).fill(8);
let GROUP_ME = "", GROUP_MASKED = "";

const bsigner = (seed: Uint8Array) => (b: Uint8Array) => ed.signAsync(b, seed).then(hex);
const bverify = (b: Uint8Array, sig: string, did: string) =>
  ed.verifyAsync(hexToBytes(sig), b, hexToBytes(did)).catch(() => false);

/** A dyad carrying a REAL edge signed by the named root. */
async function bound(vessel: string, veil: string, rootSeed: Uint8Array, epoch = "epoch0-aaa") {
  const root = await ed.getPublicKeyAsync(rootSeed).then(hex);
  const ref  = { vesselDid: vessel, veilDid: veil };
  return dyadFromEdge(edge(vessel, veil), await signDyadBinding(ref, root, epoch, bsigner(rootSeed)));
}

beforeAll(async () => {
  GROUP_ME     = await ed.getPublicKeyAsync(ROOT_ME_SEED).then(hex);
  GROUP_MASKED = await ed.getPublicKeyAsync(ROOT_MASKED_SEED).then(hex);
});

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

describe("the fleet closes over a PRESENTED EDGE, never over a pointer", () => {
  test("★ the group gathers locally-unique dyads across vessels — the bridge the infra layer refuses ★", async () => {
    const work = await bound(VESSEL_A, VEIL_WORK, ROOT_ME_SEED);
    const away = await bound(VESSEL_B, VEIL_AWAY, ROOT_ME_SEED);
    const stood = await verifiedFleetOfGroup([work, away], GROUP_ME, bverify);
    expect(stood).toHaveLength(2);
    expect(new Set(stood.map((d) => d.ref.veilDid))).toEqual(new Set([VEIL_WORK, VEIL_AWAY]));
  });

  test("★ a CLAIMED binding the root never signed dies at the verify ★", async () => {
    const honest = await bound(VESSEL_A, VEIL_WORK, ROOT_ME_SEED);
    // a forger names the real root and signs with its OWN key — the textbook confused-deputy attempt
    const ref = { vesselDid: VESSEL_B, veilDid: VEIL_PLAY };
    const forged = dyadFromEdge(edge(VESSEL_B, VEIL_PLAY),
      await signDyadBinding(ref, GROUP_ME, "epoch0-aaa", bsigner(ROOT_MASKED_SEED)));

    expect(fleetOfGroup([honest, forged], GROUP_ME)).toHaveLength(2);                       // the CLAIM passes …
    expect(await verifiedFleetOfGroup([honest, forged], GROUP_ME, bverify)).toHaveLength(1); // … the EDGE does not
  });

  test("an edge cannot be LIFTED onto another relationship — it covers BOTH ends", async () => {
    const work = await bound(VESSEL_A, VEIL_WORK, ROOT_ME_SEED);
    const lifted = dyadFromEdge(edge(VESSEL_B, VEIL_AWAY), work.binding);   // same edge, different dyad
    expect(await verifiedFleetOfGroup([lifted], GROUP_ME, bverify)).toEqual([]);
  });

  test("a stale EPOCH still verifies as a signature — scoping stays the caller's, and stays positive", async () => {
    const old = await bound(VESSEL_A, VEIL_WORK, ROOT_ME_SEED, "epoch0-aaa");
    expect(await verifiedFleetOfGroup([old], GROUP_ME, bverify)).toHaveLength(1);
    expect(old.binding!.epoch).toBe("epoch0-aaa");   // the caller compares against its own head
  });

  test("a second root on the SAME vessel stays a separate fleet", async () => {
    const work   = await bound(VESSEL_A, VEIL_WORK, ROOT_ME_SEED);
    const masked = await bound(VESSEL_A, VEIL_PLAY, ROOT_MASKED_SEED);
    expect(await verifiedFleetOfGroup([work, masked], GROUP_MASKED, bverify)).toHaveLength(1);
  });

  test("an UNBOUND dyad joins no fleet — absence never reads as default membership", async () => {
    const loose = dyadFromEdge(edge(VESSEL_B, VEIL_PLAY));
    expect(loose.binding).toBeNull();
    expect(fleetsOf([loose]).size).toBe(0);
    expect(await verifiedFleetOfGroup([loose], GROUP_ME, bverify)).toEqual([]);
  });

  test("a verify that THROWS reads as refusal — an unreachable check never WIDENS a fleet", async () => {
    const work = await bound(VESSEL_A, VEIL_WORK, ROOT_ME_SEED);
    const boom = async () => { throw new Error("unreachable"); };
    await expect(verifiedFleetOfGroup([work], GROUP_ME, boom)).resolves.toEqual([]);
  });

  test("fleetSpan counts DISTINCT vessels — the reach that makes leaving cheap", async () => {
    const work = await bound(VESSEL_A, VEIL_WORK, ROOT_ME_SEED);
    const away = await bound(VESSEL_B, VEIL_AWAY, ROOT_ME_SEED);
    expect(fleetSpan(await verifiedFleetOfGroup([work, away], GROUP_ME, bverify))).toBe(2);
  });

  test("the binding bytes cover both ends, the root AND the epoch", () => {
    const r = { vesselDid: VESSEL_A, veilDid: VEIL_WORK };
    const a = hex(dyadBindingBytes(r, "root1", "e1"));
    expect(a).not.toBe(hex(dyadBindingBytes({ ...r, vesselDid: VESSEL_B }, "root1", "e1")));
    expect(a).not.toBe(hex(dyadBindingBytes({ ...r, veilDid: VEIL_PLAY }, "root1", "e1")));
    expect(a).not.toBe(hex(dyadBindingBytes(r, "root2", "e1")));
    expect(a).not.toBe(hex(dyadBindingBytes(r, "root1", "e2")));
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

  test("a fleet reads back under the human's own name", async () => {
    const work = await bound(VESSEL_A, VEIL_WORK, ROOT_ME_SEED);
    const away = await bound(VESSEL_B, VEIL_AWAY, ROOT_ME_SEED);
    const store = memStore();
    await nameFleet(store, GROUP_ME, "  my crew  ");                // trimmed on the way in
    const resolve = await fleetPetnameResolver(store);
    expect(resolve(GROUP_ME)).toBe("my crew");
    expect(fleetSpan(fleetOfGroup([work, away], GROUP_ME))).toBe(2);
  });

  test("★ RENAMING moves a label and never a membership ★", async () => {
    const work = await bound(VESSEL_A, VEIL_WORK, ROOT_ME_SEED);
    const away = await bound(VESSEL_B, VEIL_AWAY, ROOT_ME_SEED);
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
    const work = await bound(VESSEL_A, VEIL_WORK, ROOT_ME_SEED);
    const away = await bound(VESSEL_B, VEIL_AWAY, ROOT_ME_SEED);
    const store = memStore();
    await nameFleet(store, GROUP_ME, "my crew");
    await unnameFleet(store, GROUP_ME);

    const resolve = await fleetPetnameResolver(store);
    expect(resolve(GROUP_ME)).toBeUndefined();                      // nameless …
    expect(fleetOfGroup([work, away], GROUP_ME)).toHaveLength(2);   // … and still a fleet
  });
});

describe("membership binds at the DYAD grain", () => {
  test("the agent identifier reads the VEIL, so each relationship binds on its own", () => {
    const work = dyadFromEdge(edge(VESSEL_A, VEIL_WORK));
    const play = dyadFromEdge(edge(VESSEL_A, VEIL_PLAY));
    expect(dyadAgentDid(work)).toBe(VEIL_WORK);
    // two faces on ONE device carry DIFFERENT identifiers — which is what makes them separable
    expect(dyadAgentDid(work)).not.toBe(dyadAgentDid(play));
    expect(work.ref.vesselDid).toBe(play.ref.vesselDid);
  });

  test("★ two faces on one vessel gather INDEPENDENTLY — one may come, the other stay behind ★", async () => {
    const work = await bound(VESSEL_A, VEIL_WORK, ROOT_ME_SEED);          // the root signed this one
    const play = dyadFromEdge(edge(VESSEL_A, VEIL_PLAY));                 // and never signed this one
    const stood = await verifiedFleetOfGroup([work, play], GROUP_ME, bverify);
    expect(stood.map(dyadAgentDid)).toEqual([VEIL_WORK]);
  });
});
