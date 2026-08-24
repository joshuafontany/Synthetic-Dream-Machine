/**
 * resolver-equality — the resolver refuses what comparison-time normalization would rewrite.
 *
 * Equality rides the spelling (lar-uri #equality): two addresses name one thing exactly when their
 * spellings match, codepoint for codepoint. WHATWG `new URL` removes dot-segments silently and a
 * segment filter would swallow empties — each manufactures an equality the author never wrote, which
 * is the address-spoofing surface the law closes. The resolver's job here runs one way: reject the
 * raw spelling, never resolve it into a different name.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/lar-uri
 */

import { describe, expect, test } from "vitest";
import { resolveLarUri } from "../src/resolver.js";

describe("lar URI equality — reject, never resolve", () => {
  test("a dot-segment is rejected rather than silently removed", () => {
    expect(() => resolveLarUri("lar:///ha.ka.ba/lares/../evil")).toThrow(/dot-segment/);
    expect(() => resolveLarUri("lar:///ha.ka.ba/./lares/api")).toThrow(/dot-segment/);
  });

  test("an empty segment is rejected rather than silently swallowed", () => {
    expect(() => resolveLarUri("lar:///ha.ka.ba//lares/api")).toThrow(/empty segment/);
    expect(() => resolveLarUri("lar:///ha.ka.ba/lares/api/")).toThrow(/empty segment/);
  });

  test("the canonical spelling still resolves", () => {
    expect(() => resolveLarUri("lar:///ha.ka.ba/lares/api/pono/lar-uri")).not.toThrow();
  });
});
