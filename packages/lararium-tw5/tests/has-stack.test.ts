/**
 * has-stack.test.ts — the single-entity has-stack resolution core.
 *
 * The has-stack law (ratified 2026-06-12): a carrier's `tags` field carries
 * its component stack; short tags read as RELATIVE addresses, qualified
 * against the carrier's own bag scope (root/@bag/version) by derivation —
 * never by pointer tiddlers. lar:/// tags pass through qualified; system
 * and free-form tags stay outside the stack (uri null); a carrier without
 * a scoped title cannot qualify relative tags (declared-unresolved).
 *
 * Meme: lar:///ha.ka.ba/@lares/v0.1/api/pono/has-stack
 */

import { describe, test, expect } from "vitest";
import { bagScopeOf, qualifyStackTag, stackOf } from "../src/has-stack.js";

const CARRIER = "lar:///ha.ka.ba/@sdm/v0.1/modules/powers/floating-disc";

describe("has-stack — relative-name qualification", () => {
  test("bagScopeOf derives root/@bag/version from a carrier title", () => {
    expect(bagScopeOf(CARRIER)).toBe("ha.ka.ba/@sdm/v0.1");
    expect(bagScopeOf("lar:///ha.ka.ba/@lares/v0.1/api/pono/meme")).toBe("ha.ka.ba/@lares/v0.1");
  });

  test("bagScopeOf refuses unscoped titles", () => {
    expect(bagScopeOf("HelloThere")).toBeNull();
    expect(bagScopeOf("$:/temp/something")).toBeNull();
    expect(bagScopeOf("lar:///ha.ka.ba/@sdm")).toBeNull();          // no version
    expect(bagScopeOf("lar:///two.term/@x/v1/y")).toBeNull();       // bad root arity
  });

  test("a relative tag qualifies against the carrier's own scope", () => {
    expect(qualifyStackTag("components/hook/attack", "ha.ka.ba/@sdm/v0.1"))
      .toBe("lar:///ha.ka.ba/@sdm/v0.1/components/hook/attack");
  });

  test("a lar:/// tag passes through already qualified, any scope", () => {
    const uri = "lar:///ha.ka.ba/@lares/v0.1/api/pono/loci";
    expect(qualifyStackTag(uri, "ha.ka.ba/@sdm/v0.1")).toBe(uri);
    expect(qualifyStackTag(uri, null)).toBe(uri);
  });

  test("system and free-form tags stay outside the stack", () => {
    expect(qualifyStackTag("$:/tags/Alert", "ha.ka.ba/@sdm/v0.1")).toBeNull();
    expect(qualifyStackTag("just a caption tag", "ha.ka.ba/@sdm/v0.1")).toBeNull();
  });

  test("a relative tag on an unscoped carrier stays unresolved", () => {
    expect(qualifyStackTag("components/hook/attack", null)).toBeNull();
  });

  test("stackOf maps a tags field to qualified entries, non-stack tags carried with null uri", () => {
    const entries = stackOf(
      ["components/hook/attack", "lar:///ha.ka.ba/@lares/v0.1/api/pono/loci", "$:/tags/Alert"],
      CARRIER,
    );
    expect(entries).toEqual([
      { tag: "components/hook/attack", uri: "lar:///ha.ka.ba/@sdm/v0.1/components/hook/attack" },
      { tag: "lar:///ha.ka.ba/@lares/v0.1/api/pono/loci", uri: "lar:///ha.ka.ba/@lares/v0.1/api/pono/loci" },
      { tag: "$:/tags/Alert", uri: null },
    ]);
  });
});
