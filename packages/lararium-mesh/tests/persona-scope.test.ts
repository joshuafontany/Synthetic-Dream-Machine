/**
 * The per-handle persona plane's NAME.
 *
 * What these guard is the vault property canon states: a human's handles stay unlinkable compartments, and
 * NOTHING above them enumerates them. So the tests assert the two halves of that — a name a holder can
 * always re-derive (rejoin-stable, device-blind), and a name that carries no material of the vessel or of
 * any sibling handle.
 *
 * The one a reader should look for first: `two handles on ONE laptop share nothing in their names`. Delete
 * the derivation, hand back `@persona-<groupId>` verbatim, and every other test here still passes while the
 * bag id becomes a re-usable group handle sitting in a log.
 */
import { describe, expect, test } from "vitest";

import { isPersonaBagId, personaBagIdFor, personaScopeTag, PERSONA_SCOPE_TAG_HEX } from "../src/persona-scope.js";
import { PERSONA_BAG_ID } from "../src/lar-uris.js";

const WORK = "b7f1c2a9d4e60381";
const PLAY = "3e5a90cc17bd4f22";

describe("a holder can always find its own plane", () => {
  test("the same group names the same plane, every call — a rejoin finds what it left", () => {
    expect(personaBagIdFor(WORK)).toBe(personaBagIdFor(WORK));
  });

  test("no vessel appears in the answer, so a laptop and a phone name one plane alike", () => {
    // The derivation takes the GROUP's material and nothing else. A device that mixed itself in would give
    // each device a different name for one handle's plane, and the fleet would sync to nowhere.
    expect(personaBagIdFor(WORK)).toBe(personaBagIdFor(WORK));
    expect(personaBagIdFor(WORK)).toMatch(/^lar:\/\/\/.*bags\/@persona-[0-9a-f]{16}$/);
  });
});

describe("★ the vault property — the compartments stay unlinked ★", () => {
  test("★ two handles on ONE laptop share nothing in their names ★", () => {
    const work = personaBagIdFor(WORK);
    const play = personaBagIdFor(PLAY);
    expect(work).not.toBe(play);
    // And the name must not simply CARRY the group id: a bag id travels through catalogs, logs and probes,
    // and a name that quotes its group hands an observer a re-usable handle for that group.
    expect(work).not.toContain(WORK);
    expect(play).not.toContain(PLAY);
  });

  test("a one-character difference between groups gives unrelated names — no prefix betrays a neighbour", () => {
    const a = personaScopeTag("aaaaaaaaaaaaaaa0");
    const b = personaScopeTag("aaaaaaaaaaaaaaa1");
    expect(a).not.toBe(b);
    expect(a.slice(0, 4)).not.toBe(b.slice(0, 4));
  });

  test("the tag stays fixed-width, so a name leaks nothing of its input's length", () => {
    for (const id of ["a", WORK, "f".repeat(200)]) {
      expect(personaScopeTag(id)).toHaveLength(PERSONA_SCOPE_TAG_HEX);
    }
  });
});

describe("a router recognises a persona plane by SHAPE", () => {
  test("both the founding id and any derived plane read as persona bags", () => {
    expect(isPersonaBagId(PERSONA_BAG_ID)).toBe(true);
    expect(isPersonaBagId(personaBagIdFor(WORK))).toBe(true);
  });

  test("a bag that merely starts with the same letters does not", () => {
    expect(isPersonaBagId("lar:///ha.ka.ba/bags/@personal-notes")).toBe(false);
    expect(isPersonaBagId("lar:///ha.ka.ba/bags/@daemon")).toBe(false);
  });
});
