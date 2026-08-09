/**
 * The registered bag set is the UNION over a vessel's fleet memberships.
 *
 * THE RULE: a vessel that FOUNDED a PersonaGroup raised a fleet of one, so that membership contributes
 * nothing beyond its own ground. A vessel ADMITTED into a fleet carries all of that fleet's bags, private
 * and contracted alike — a fleet that syncs a person's work to some of their devices and not others has
 * not synced it.
 *
 * AND A VESSEL HOLDS SEVERAL. A human runs more than one PersonaGroup, and the same laptop and phone may
 * carry more than one of them. So the tests drive one membership, several, and none — a shape that
 * answered only the first would freeze today's boot path into the model.
 *
 * WHY A MISSING BAG COSTS SOMETHING. Keyhive's bag→doc map lives in process memory, so a bag absent from
 * this set can never satisfy a cap check — no throw, no warning, an `act LOAD` that refuses forever, on
 * the vessel a person most often carries.
 */
import { describe, expect, test } from "vitest";

import { deriveRegisterBags, type FleetMembership } from "../src/register-bags.js";
import { BAG_IDS, DAEMON_BAG_ID, PERSONA_BAG_ID } from "../src/lar-uris.js";

const WIKI = ["lar:///ha.ka.ba/bags/@my-wiki", "lar:///ha.ka.ba/bags/@my-wiki/draft"];
const WORK = ["lar:///ha.ka.ba/bags/@elyncia", "lar:///ha.ka.ba/bags/@notes"];
const PLAY = ["lar:///ha.ka.ba/bags/@discordia"];

const founded = (id: string, catalogNamed?: readonly string[]): FleetMembership =>
  ({ personaGroupId: id, binding: "founded", ...(catalogNamed ? { catalogNamed } : {}) });
const admitted = (id: string, catalogNamed?: readonly string[]): FleetMembership =>
  ({ personaGroupId: id, binding: "admitted", ...(catalogNamed ? { catalogNamed } : {}) });

describe("the ground every vessel stands on", () => {
  test("@persona rides the ground, because the keel mounts it on EVERY boot", () => {
    // A binding decides WHOSE doc stands behind the id, never whether a vessel has one. A founded
    // vessel's signer pin, KEL prefix and device edge all read through this bag exactly as an admitted
    // vessel's do — so leaving it to a membership would deny a vessel its own identity substrate.
    expect(deriveRegisterBags({ fleets: [founded("g1")] })).toContain(PERSONA_BAG_ID);
    expect(deriveRegisterBags({ fleets: [] })).toContain(PERSONA_BAG_ID);
  });

  test("a vessel in NO fleet still stands on its own ground", () => {
    const bags = deriveRegisterBags({ fleets: [] });
    expect(bags).toEqual(expect.arrayContaining([DAEMON_BAG_ID, BAG_IDS.identities, BAG_IDS.sessions]));
    expect(bags).not.toContain(BAG_IDS.lararium);
  });

  test("a Herm carries no wiki, so it registers none — blind by structure, never by a flag", () => {
    expect(deriveRegisterBags({ fleets: [founded("g1")] }).some((b) => b.includes("@my-wiki"))).toBe(false);
  });
});

describe("one membership", () => {
  test("FOUNDED contributes nothing beyond the ground — a fleet of one has no other device", () => {
    const bags = deriveRegisterBags({ fleets: [founded("g1", WORK)], wikiBags: WIKI });
    expect(bags).toEqual(expect.arrayContaining(WIKI));
    for (const b of WORK) expect(bags).not.toContain(b);
    expect(bags).not.toContain(BAG_IDS.lararium);
  });

  test("ADMITTED contributes the substrate bag and every bag that fleet's catalog names", () => {
    const bags = deriveRegisterBags({ fleets: [admitted("g1", WORK)], wikiBags: WIKI });
    expect(bags).toContain(BAG_IDS.lararium);
    for (const b of WORK) expect(bags).toContain(b);
  });

  test("★ THE WIDENING IS THE ADMISSION — founded ⊂ admitted, always ★", () => {
    const asFounded = new Set(deriveRegisterBags({ fleets: [founded("g1", WORK)], wikiBags: WIKI }));
    const asAdmitted = deriveRegisterBags({ fleets: [admitted("g1", WORK)], wikiBags: WIKI });
    for (const b of asFounded) expect(asAdmitted).toContain(b);   // admission never DROPS a bag
    expect(asAdmitted.length).toBeGreaterThan(asFounded.size);    // and it adds the fleet's
  });
});

describe("★ SEVERAL memberships on one vessel — a work fleet and a play fleet on one laptop ★", () => {
  test("the set is the UNION, so each admitted fleet's bags arrive", () => {
    const bags = deriveRegisterBags({ fleets: [admitted("work", WORK), admitted("play", PLAY)], wikiBags: WIKI });
    for (const b of [...WORK, ...PLAY]) expect(bags).toContain(b);
  });

  test("a founded fleet beside an admitted one contributes nothing of its own", () => {
    const bags = deriveRegisterBags({ fleets: [admitted("work", WORK), founded("solo", PLAY)] });
    for (const b of WORK) expect(bags).toContain(b);
    for (const b of PLAY) expect(bags).not.toContain(b);   // founded means no other device to carry from
  });

  test("two fleets naming a bag in common register it once", () => {
    const shared = ["lar:///ha.ka.ba/bags/@shared"];
    const bags = deriveRegisterBags({ fleets: [admitted("work", shared), admitted("play", shared)] });
    expect(bags.filter((b) => b === shared[0])).toHaveLength(1);
    expect(bags.filter((b) => b === BAG_IDS.lararium)).toHaveLength(1);
  });

  test("adding a membership only ever WIDENS — no fleet can take another's bags away", () => {
    const one = new Set(deriveRegisterBags({ fleets: [admitted("work", WORK)] }));
    const two = deriveRegisterBags({ fleets: [admitted("work", WORK), founded("play")] });
    for (const b of one) expect(two).toContain(b);
  });
});

describe("no platform appears in the answer", () => {
  test("the same memberships yield the same set whichever vessel asks", () => {
    const fleets = [admitted("work", WORK), founded("play")];
    expect(deriveRegisterBags({ fleets, wikiBags: WIKI })).toEqual(deriveRegisterBags({ fleets, wikiBags: WIKI }));
  });
});
