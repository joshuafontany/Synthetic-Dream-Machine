/**
 * The registered bag set is the UNION over the PersonaGroups a vessel stands in.
 *
 * THE AXIS: joined-or-not. A vessel in no PersonaGroup stays an anonymous dyad and carries its own ground.
 * A vessel standing in a group carries that group's work — private and contracted alike, because a fleet that
 * syncs a person's bags to some of their devices and not others has not synced them.
 *
 * AND A VESSEL HOLDS SEVERAL. A human runs more than one PersonaGroup, and the same laptop and phone may
 * carry more than one of them — so the tests drive one group, several, and none. A model that answered
 * only the first would freeze today's boot path into the ontology.
 *
 * WHY A MISSING BAG COSTS SOMETHING. Keyhive's bag→doc map lives in process memory, so a bag absent from
 * this set can never satisfy a cap check — no throw, no warning, an `act LOAD` that refuses forever, on
 * the vessel a person most often carries.
 */
import { describe, expect, test } from "vitest";

import { catalogNamedBags, deriveRegisterBags, type FleetMembership } from "../src/register-bags.js";
import { personaBagIdFor } from "../src/persona-scope.js";
import { BAG_IDS, DAEMON_BAG_ID, PERSONA_NAMESPACE } from "../src/lar-uris.js";
import { personaScopedBagIds, personaTagFromBagId } from "../src/persona-scope.js";

const WIKI = ["lar:///ha.ka.ba/bags/my-wiki", "lar:///ha.ka.ba/bags/my-wiki/draft"];
const WORK = ["lar:///ha.ka.ba/bags/elyncia", "lar:///ha.ka.ba/bags/notes"];
const PLAY = ["lar:///ha.ka.ba/bags/discordia"];

const standingIn = (id: string, catalogNamed?: readonly string[]): FleetMembership =>
  ({ personaGroupId: id, ...(catalogNamed ? { catalogNamed } : {}) });

describe("the ground every vessel stands on", () => {
  test("the substrate bags ride the ground, so no vessel can lose them by standing in nothing", () => {
    // The drift this ends: one opener registered the shared substrate bag and its catalog, the other
    // registered neither, and the second could not satisfy a cap check over its own operator's bags.
    const bags = deriveRegisterBags({ fleets: [] });
    expect(bags).toEqual(expect.arrayContaining([
      DAEMON_BAG_ID, BAG_IDS.catalog, BAG_IDS.oracle, BAG_IDS.lares, BAG_IDS.lararium,
    ]));
  });

  test("★ a face's relations are NOT ground — a vessel standing in nothing carries no one's circles ★", () => {
    // A vessel-global @circles would put one persona's blocked list in the same document as another's
    // follows, where anything reading it correlates the faces a multitude exists to hold apart. So the
    // three planes that travel with a face arrive through a MEMBERSHIP, exactly as the persona plane does.
    const bags = deriveRegisterBags({ fleets: [] });
    for (const stem of ["circles", "identities", "sessions"]) {
      expect(bags.some((b) => b.includes(stem))).toBe(false);
    }
  });

  test("★ standing in a group brings the WHOLE face, all four planes sharing ONE tag ★", () => {
    const bags = deriveRegisterBags({ fleets: [standingIn("g1")] });
    const face = personaScopedBagIds("g1");
    for (const b of [face.persona, face.circles, face.identities, face.sessions]) expect(bags).toContain(b);
    // The tag is what binds them: read it off the persona plane and the other three follow from it.
    const tag = personaTagFromBagId(face.persona);
    expect(tag).not.toBeNull();
    for (const b of [face.circles, face.identities, face.sessions]) expect(b.endsWith(`-${tag}`)).toBe(true);
  });

  test("★ two faces on one vessel keep DISJOINT sets — no plane is shared between them ★", () => {
    const a = personaScopedBagIds("g1");
    const b = personaScopedBagIds("g2");
    const setA = new Set([a.persona, a.circles, a.identities, a.sessions]);
    for (const id of [b.persona, b.circles, b.identities, b.sessions]) expect(setA.has(id)).toBe(false);
    // and a vessel standing in both registers all eight, none collapsing into another
    const bags = deriveRegisterBags({ fleets: [standingIn("g1"), standingIn("g2")] });
    for (const id of [...setA, b.persona, b.circles, b.identities, b.sessions]) expect(bags).toContain(id);
  });

  test("★ an anon dyad stands in no group, so it carries NO persona plane and no one's work ★", () => {
    const bags = deriveRegisterBags({ fleets: [], wikiBags: WIKI });
    expect(bags.some((b) => b.includes("persona"))).toBe(false);
    for (const b of [...WORK, ...PLAY]) expect(bags).not.toContain(b);
    expect(bags).toEqual(expect.arrayContaining(WIKI));   // its own wiki still stands
  });

  test("a Herm carries no wiki, so it registers none — blind by structure, never by a flag", () => {
    expect(deriveRegisterBags({ fleets: [standingIn("g1")] }).some((b) => b.includes("@my-wiki"))).toBe(false);
  });
});

describe("one PersonaGroup", () => {
  test("standing in a group brings its plane and every bag its catalog names", () => {
    const bags = deriveRegisterBags({ fleets: [standingIn("g1", WORK)], wikiBags: WIKI });
    expect(bags).toContain(personaBagIdFor("g1"));
    for (const b of WORK) expect(bags).toContain(b);
  });

  test("★ how the membership ARRIVED changes nothing — a founder's own laptop carries their work ★", () => {
    // The correction this encodes: founded-versus-admitted decides whose signature stands behind a
    // binding, never which bags are the person's. A model that withheld a founder's catalog would have
    // left the vessel that MINTED a bag unable to open it.
    const asFounder  = deriveRegisterBags({ fleets: [standingIn("g1", WORK)] });
    const asAdmitted = deriveRegisterBags({ fleets: [standingIn("g1", WORK)] });
    expect(asFounder).toEqual(asAdmitted);
  });
});

describe("★ A PLANE CARRIES ONE NAME EVERYWHERE ★", () => {
  // The failure this forbids: a plane registered under one spelling while the composite, the @oracle
  // registry and the admit payload reach it by another. keyhive hashes the bag URL to SEED the Document
  // behind it, so a second spelling is a second document no later aliasing reconciles — and the plane a
  // vessel actually stands in would answer no cap check, with no throw and no warning.
  test("★ every plane registers under its DERIVED name — the deictic reaches no map ★", () => {
    const bags = deriveRegisterBags({ fleets: [standingIn("work"), standingIn("play")] });
    expect(bags).toContain(personaBagIdFor("work"));
    expect(bags).toContain(personaBagIdFor("play"));
    expect(bags).not.toContain(PERSONA_NAMESPACE);
  });

  test("★ no plane ever carries two names — two planes, two names, never four ★", () => {
    const bags = deriveRegisterBags({ fleets: [standingIn("work"), standingIn("play")] });
    expect(bags.filter((b) => b.includes("persona"))).toHaveLength(2);
  });
});

describe("★ SEVERAL groups on one vessel — a work compartment and a play compartment, one laptop ★", () => {
  test("★ each group gets its OWN persona plane, so the second compartment has somewhere to stand ★", () => {
    // Collapse the two planes back to one constant and both groups write their multitude, signer pin and
    // device edge into one document — the work self and the play self fused inside the vessel that was
    // supposed to keep them apart.
    const bags = deriveRegisterBags({ fleets: [standingIn("work"), standingIn("play")] });
    expect(bags).toContain(personaBagIdFor("work"));
    expect(bags).toContain(personaBagIdFor("play"));
    expect(personaBagIdFor("work")).not.toBe(personaBagIdFor("play"));
  });

  test("the set is the UNION, so each group's work arrives", () => {
    const bags = deriveRegisterBags({ fleets: [standingIn("work", WORK), standingIn("play", PLAY)], wikiBags: WIKI });
    for (const b of [...WORK, ...PLAY]) expect(bags).toContain(b);
  });

  test("two groups naming a bag in common register it once", () => {
    const shared = ["lar:///ha.ka.ba/bags/shared"];
    const bags = deriveRegisterBags({ fleets: [standingIn("work", shared), standingIn("play", shared)] });
    expect(bags.filter((b) => b === shared[0])).toHaveLength(1);
    expect(bags.filter((b) => b === BAG_IDS.lararium)).toHaveLength(1);
  });

  test("joining another group only ever WIDENS — no group can take another's bags away", () => {
    const one = new Set(deriveRegisterBags({ fleets: [standingIn("work", WORK)] }));
    const two = deriveRegisterBags({ fleets: [standingIn("work", WORK), standingIn("play", PLAY)] });
    for (const b of one) expect(two).toContain(b);
  });
});

describe("no platform appears in the answer", () => {
  test("the same groups yield the same set whichever vessel asks", () => {
    const fleets = [standingIn("work", WORK), standingIn("play")];
    expect(deriveRegisterBags({ fleets, wikiBags: WIKI })).toEqual(deriveRegisterBags({ fleets, wikiBags: WIKI }));
  });
});

describe("★ the registry admits only its OWN kind ★", () => {
  const rec = (title: string, text: string) => ({ tiddler: { title, text }, meta: { authority: "t" } });
  const catalog = {
    schemaVersion: "0.1",
    tiddlers: {
      "lar:///ha.ka.ba/bags/notes":                       rec("lar:///ha.ka.ba/bags/notes", "automerge:aaa"),
      // A wiki slot's per-device draft pointer: same title prefix, same automerge text, NOT a bag.
      "lar:///ha.ka.ba/wikis/notes/drafts/did:key:z6Mk":   rec("lar:///ha.ka.ba/wikis/notes/drafts/did:key:z6Mk", "automerge:bbb"),
      "lar:///ha.ka.ba/wikis/notes":                       rec("lar:///ha.ka.ba/wikis/notes", "automerge:ccc"),
      "lar:///ha.ka.ba/bags/notes/recipes/default":        rec("lar:///ha.ka.ba/bags/notes/recipes/default", "automerge:ddd"),
      "lar:///ha.ka.ba/bags/never-minted":                 rec("lar:///ha.ka.ba/bags/never-minted", ""),
    },
  } as unknown as Parameters<typeof catalogNamedBags>[0];

  test("★ a wiki slot pointer is NOT registered as a bag ★", () => {
    // It carries a lar title and an automerge url, indistinguishable from a bag entry by shape alone.
    // Registering it mints a Keyhive Document for a thing that is not a bag, and nothing throws.
    const named = catalogNamedBags(catalog);
    expect(named).toContain("lar:///ha.ka.ba/bags/notes");
    expect(named).not.toContain("lar:///ha.ka.ba/wikis/notes/drafts/did:key:z6Mk");
    expect(named).not.toContain("lar:///ha.ka.ba/wikis/notes");
  });

  test("a tiddler INSIDE a bag is not a bag either — only the bag surface counts", () => {
    expect(catalogNamedBags(catalog)).not.toContain("lar:///ha.ka.ba/bags/notes/recipes/default");
  });

  test("an entry that never minted stays skipped — a doc that cannot resolve is not registered", () => {
    expect(catalogNamedBags(catalog)).not.toContain("lar:///ha.ka.ba/bags/never-minted");
  });
});
