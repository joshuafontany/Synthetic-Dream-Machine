/**
 * The per-handle persona plane's NAME.
 *
 * What these guard is the vault property canon states: a human's handles stay unlinkable compartments, and
 * NOTHING above them enumerates them. So the tests assert the two halves of that — a name a holder can
 * always re-derive (rejoin-stable, device-blind), and a name that carries no material of the vessel or of
 * any sibling handle.
 *
 * The one a reader should look for first: `two handles on ONE laptop share nothing in their names`. Delete
 * the derivation, hand back `persona-<groupId>` verbatim, and every other test here still passes while the
 * bag id becomes a re-usable group handle sitting in a log.
 */
import { describe, expect, test } from "vitest";

import { isPersonaPlaneSlug, personaBagIdFor, personaScopeTag, PERSONA_SCOPE_TAG_HEX } from "../src/persona-scope.js";
import { isSovereignBag, hermCanRead } from "../src/mesh-palace.js";

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
    expect(personaBagIdFor(WORK)).toMatch(/^lar:\/\/\/.*bags\/persona-[0-9a-f]{16}$/);
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

describe("★ the guards cover the FAMILY, not a list of names ★", () => {
  test("★ a derived plane reads as sovereign to the Herm fence ★", () => {
    // The weld test found this: a fence naming "persona" by exact slug covers a person's planes only by
    // accident of how many they happen to hold. The Herm's final verdict is an allowlist, so an unmatched
    // slug already denies — but a sovereign fence must say what it means rather than lean on that.
    expect(isSovereignBag("persona")).toBe(true);
    expect(isSovereignBag(personaBagIdFor(WORK).split("/").pop()!)).toBe(true);
    expect(isSovereignBag("lares")).toBe(false);
  });

  test("a Herm reads no plane of any PersonaGroup, named or derived", () => {
    expect(hermCanRead(`lar:///ha.ka.ba/bags/${personaBagIdFor(WORK).split("/").pop()}/selves/h1`)).toBe(false);
    expect(hermCanRead("lar:///ha.ka.ba/bags/persona/selves/h1")).toBe(false);
    expect(hermCanRead("lar:///ha.ka.ba/bags/lares/anything")).toBe(true);   // the waymarks still cross
  });
});

describe("★ the family rule matches a SHAPE, not a prefix ★", () => {
  test("★ the stem plus arbitrary text names NO plane — only what the derivation can produce ★", () => {
    // A prefix test accepts strings the derivation can never emit, which invites a caller to construct a
    // plane name by hand. The tag has a fixed width, so the shape admits exactly the derived family.
    expect(isPersonaPlaneSlug("persona-anything")).toBe(false);
    expect(isPersonaPlaneSlug("persona-kel")).toBe(false);
    expect(isPersonaPlaneSlug(personaBagIdFor(WORK).split("/").pop()!)).toBe(true);
  });

  test("the bare namespace names no plane — nothing answers to the stem", () => {
    expect(isPersonaPlaneSlug("persona")).toBe(false);
  });

  test("a truncated or over-long tag reads as no plane", () => {
    expect(isPersonaPlaneSlug("persona-b7f1c2a9d4e603")).toBe(false);     // short
    expect(isPersonaPlaneSlug("persona-b7f1c2a9d4e60381ab")).toBe(false); // long
    expect(isPersonaPlaneSlug("persona-B7F1C2A9D4E60381")).toBe(false);   // the tag lowercases
  });
});
