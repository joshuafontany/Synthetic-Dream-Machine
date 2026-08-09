/**
 * The registered bag set follows the PERSONA BINDING, and two vessels under one binding register alike.
 *
 * THE RULE: a vessel that FOUNDED its own PersonaGroup stays private and holds its own; a vessel ADMITTED
 * into a fleet carries all of that user's bags, private and contracted alike. A fleet that syncs a
 * person's work to some of their devices and not others has not synced it.
 *
 * WHY A MISSING BAG COSTS SOMETHING. Keyhive's bag→doc map lives in process memory, so a bag absent from
 * this set can never satisfy a cap check — no throw, no warning, an `act LOAD` that refuses forever, on
 * the vessel a person most often carries.
 *
 * WHY IT DERIVES. Two hand-written lists of one fact drift, and the one carrying authority drifts
 * silently. One derivation answers for both vessels, so neither enumerates.
 */
import { describe, expect, test } from "vitest";

import { deriveRegisterBags } from "../src/register-bags.js";
import { BAG_IDS, DAEMON_BAG_ID } from "../src/lar-uris.js";

const WIKI = ["lar:///ha.ka.ba/bags/@my-wiki", "lar:///ha.ka.ba/bags/@my-wiki/draft"];
const OPERATOR = ["lar:///ha.ka.ba/bags/@elyncia", "lar:///ha.ka.ba/bags/@notes"];

describe("a vessel that FOUNDED its own fleet stays private", () => {
  test("it holds its own ground and nothing of an operator's", () => {
    const bags = deriveRegisterBags({ binding: "founded", wikiBags: WIKI, catalogNamed: OPERATOR });
    expect(bags).toContain(DAEMON_BAG_ID);
    expect(bags).toContain(BAG_IDS.identities);
    expect(bags).toEqual(expect.arrayContaining(WIKI));
    // The catalog may NAME operator bags; a founded vessel belongs to no fleet that would carry them.
    for (const b of OPERATOR) expect(bags).not.toContain(b);
    expect(bags).not.toContain(BAG_IDS.lararium);
  });

  test("a Herm carries no wiki, so it registers none — blind by structure, never by a flag", () => {
    const bags = deriveRegisterBags({ binding: "founded" });
    expect(bags).toEqual(expect.arrayContaining([DAEMON_BAG_ID, BAG_IDS.identities, BAG_IDS.sessions]));
    expect(bags.some((b) => b.includes("@my-wiki"))).toBe(false);
  });
});

describe("a vessel ADMITTED into a fleet carries that user's bags", () => {
  test("the shared substrate and every bag its own catalog names", () => {
    const bags = deriveRegisterBags({ binding: "admitted", wikiBags: WIKI, catalogNamed: OPERATOR });
    expect(bags).toContain(BAG_IDS.lararium);
    for (const b of OPERATOR) expect(bags).toContain(b);
  });

  test("★ THE WIDENING IS THE ADMISSION — founded ⊂ admitted, always ★", () => {
    const founded = new Set(deriveRegisterBags({ binding: "founded", wikiBags: WIKI, catalogNamed: OPERATOR }));
    const admitted = deriveRegisterBags({ binding: "admitted", wikiBags: WIKI, catalogNamed: OPERATOR });
    for (const b of founded) expect(admitted).toContain(b);      // admission never DROPS a bag
    expect(admitted.length).toBeGreaterThan(founded.size);       // and it adds the fleet's
  });

  test("one binding yields one set whichever vessel asks — no platform in the answer", () => {
    const asNode = deriveRegisterBags({ binding: "admitted", wikiBags: WIKI, catalogNamed: OPERATOR });
    const asBrowser = deriveRegisterBags({ binding: "admitted", wikiBags: WIKI, catalogNamed: OPERATOR });
    expect(asBrowser).toEqual(asNode);
  });

  test("duplicates collapse, so two sets stay comparable", () => {
    const bags = deriveRegisterBags({ binding: "admitted", wikiBags: [BAG_IDS.catalog], catalogNamed: [BAG_IDS.catalog] });
    expect(bags.filter((b) => b === BAG_IDS.catalog)).toHaveLength(1);
  });
});
