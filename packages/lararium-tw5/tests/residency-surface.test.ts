/**
 * residency-surface — getOriginBag tests.
 *
 * Sprint:  Residency Model Epic — S3.3 / S3.4
 * Meme:    lar:///ha.ka.ba/lararium/api/residency-model
 */

import { describe, test, expect } from "vitest";
import { getOriginBag } from "../src/residency-surface.js";

// Minimal wiki shape satisfying the structural type the helper consumes.
function makeWiki(tiddlers: Record<string, Record<string, unknown>>) {
  return {
    getTiddler(title: string): { fields?: Record<string, unknown> } | undefined {
      const fields = tiddlers[title];
      return fields ? { fields } : undefined;
    },
  };
}

describe("getOriginBag", () => {
  test("returns null when the tiddler does not exist", () => {
    const wiki = makeWiki({});
    expect(getOriginBag(wiki, "missing")).toBeNull();
  });

  test("returns null when the tiddler exists but carries no origin-bag field", () => {
    const wiki = makeWiki({ "Drafty": { title: "Drafty", text: "in-memory only" } });
    expect(getOriginBag(wiki, "Drafty")).toBeNull();
  });

  test("returns the origin-bag URI when the tiddler carries it", () => {
    const wiki = makeWiki({
      "MyTiddler": {
        title:        "MyTiddler",
        text:         "from elyncia",
        "origin-bag": "lar:///ha.ka.ba/bags/elyncia",
      },
    });
    expect(getOriginBag(wiki, "MyTiddler")).toBe("lar:///ha.ka.ba/bags/elyncia");
  });

  test("returns null for empty-string origin-bag (treated as absent)", () => {
    const wiki = makeWiki({ "T": { title: "T", "origin-bag": "" } });
    expect(getOriginBag(wiki, "T")).toBeNull();
  });

  test("returns null for non-string origin-bag (treated as absent)", () => {
    const wiki = makeWiki({ "T": { title: "T", "origin-bag": 42 } });
    expect(getOriginBag(wiki, "T")).toBeNull();
  });

  test("survives the dual-field convention (bag + origin-bag both present)", () => {
    // The nalu engine writes both for backward compat with explicit-write routing.
    const wiki = makeWiki({
      "T": {
        title:        "T",
        bag:          "lar:///ha.ka.ba/bags/personal",
        "origin-bag": "lar:///ha.ka.ba/bags/personal",
      },
    });
    expect(getOriginBag(wiki, "T")).toBe("lar:///ha.ka.ba/bags/personal");
  });
});
