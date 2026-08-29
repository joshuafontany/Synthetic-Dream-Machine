/**
 * THE CONTROL HEAD QUOTES ITS VALUES — ONE SPELLING, NOT A JUDGEMENT PER VALUE.
 *
 * ── WHAT TIDDLYWIKI REQUIRES ─────────────────────────────────────────────────────────────────────────────
 * Nothing, for a one-word value. `reUnquotedAttribute` admits `[^\s>"']`, so `code=&#x0001;` and
 * `code="&#x0001;"` reach `parseMacroInvocationAsTransclusion` as the same attribute with the same value.
 * Measured both ways.
 *
 * ── WHY THE QUOTES STAND ANYWAY ──────────────────────────────────────────────────────────────────────────
 * The other head parameter cannot go without them. 66 carriers declare `namespace="ॐ ँ"` — two glyphs and
 * a space. Unquoted, TiddlyWiki reads `namespace="ॐ"` and hands the second glyph back as a positional:
 * the namespace silently loses half of itself, and the SOH the renderer derives from it stops matching
 * what the meta declares.
 *
 * So a head that dropped quotes would carry them on one parameter and not the other, and a writer would
 * decide per value which case it faces. One spelling costs two characters and no judgement.
 */

import { describe, test, expect } from "vitest";
import { readCarrierShape } from "../src/carrier-shape.js";

const carrier = (head: string) =>
  `<<!DOCTYPE memetic-wikitext+tiddlywiki lar:///g >>\n\n${head}\n` +
  "```toml meta\ncacheable = true\n```\n\n" +
  `<<^ code="&#x0002;" >>\n\nbody\n\n<<^ code="&#x0003;" >>\n`;

describe("the control head quotes its values", () => {
  test("a quoted code reads", () => {
    expect(readCarrierShape(carrier('<<^ code="&#x0001;" from=? -> to=lar:///x >>')).marks.head).toBe(true);
  });

  test("★ a namespace carrying a space needs its quotes — the value is two glyphs ★", () => {
    // The whole reason the head keeps one spelling. This value stands in 66 carriers.
    const shape = readCarrierShape(carrier('<<^ code="&#x0001;" namespace="ॐ ँ" from=? -> to=lar:///x >>'));
    expect(shape.marks.head).toBe(true);
  });
});
