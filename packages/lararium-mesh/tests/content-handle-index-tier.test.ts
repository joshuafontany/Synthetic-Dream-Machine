/**
 * content-handle-index-tier.test.ts — the cad INDEX SITING rule (map-tier = body-tier).
 *
 * The publicity plane sets the addressing mode (content-resolution.mem #cad-storage): a PUBLIC body's index
 * rides crossroads (the public floor); a PRIVATE body's index rides catalog (the sealed / member lane). The
 * tiers NEVER cross — the load-bearing denial is that a PRIVATE index on the public crossroads floor leaks the
 * private bodies' existence + size + re-key cadence to any stranger, breaching the read-lane denial.
 */
import { describe, test, expect } from "vitest";
import { bodyIndexBagUri, assertBodyIndexTier } from "../src/content-handle.js";
import { CROSSROADS_DOC_URI, CATALOG_DOC_URI } from "../src/lar-uris.js";

describe("bodyIndexBagUri — the plane sets the tier", () => {
  test("a PUBLIC body-index rides crossroads (the public floor)", () => {
    expect(bodyIndexBagUri("public")).toBe(CROSSROADS_DOC_URI);
  });
  test("a PRIVATE body-index rides catalog (the sealed lane)", () => {
    expect(bodyIndexBagUri("private")).toBe(CATALOG_DOC_URI);
  });
});

describe("assertBodyIndexTier — fail-closed, the tiers never cross", () => {
  test("a PUBLIC index on the crossroads floor passes", () => {
    expect(() => assertBodyIndexTier(CROSSROADS_DOC_URI, "public")).not.toThrow();
  });
  test("a PRIVATE index on the catalog plane passes", () => {
    expect(() => assertBodyIndexTier(CATALOG_DOC_URI, "private")).not.toThrow();
  });
  test("THE DENIAL — a PRIVATE index on the public crossroads floor THROWS (existence+size leak)", () => {
    expect(() => assertBodyIndexTier(CROSSROADS_DOC_URI, "private")).toThrow(/private.*floor leaks/i);
  });
  test("a PUBLIC index off the public floor (on the catalog plane) THROWS", () => {
    expect(() => assertBodyIndexTier(CATALOG_DOC_URI, "public")).toThrow(/MUST ride/);
  });
  test("an UNKNOWN holding bag THROWS for either publicity (fail-closed)", () => {
    const stray = "lar:///ha.ka.ba/bags/daemon";
    expect(() => assertBodyIndexTier(stray, "public")).toThrow();
    expect(() => assertBodyIndexTier(stray, "private")).toThrow();
  });
});
