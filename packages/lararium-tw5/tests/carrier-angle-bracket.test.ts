/**
 * A `>` INSIDE A CONTROL SIGIL READS AS CONTENT.
 *
 * ── THE HOST'S OWN LAW ───────────────────────────────────────────────────────────────────────────────────
 * TiddlyWiki's unquoted attribute value admits any angle bracket that does not close the call:
 *
 *     reUnquotedAttribute = /(?!<<)((?:(?:>(?!>))|[^\s>"'])+)/y     (core/modules/parsers/parseutils.js)
 *
 * Measured against `parseMacroInvocationAsTransclusion`: `<<~ t a=b>c d=e >>` yields `a="b>c"`, `d="e"`.
 * The host never special-cases a particular glyph — it asks whether the bracket terminates the call.
 *
 * ── WHAT THIS FILE HOLDS THE SCANS TO ────────────────────────────────────────────────────────────────────
 * A scan naming ONE spelling — the bearing arrow — reads `->` and refuses `a>b`, so a carrier TiddlyWiki
 * parses reads as unframed here. The two readings must agree, and the host holds the authority.
 */

import { describe, test, expect } from "vitest";
import { readCarrierShape } from "../src/carrier-shape.js";

const carrier = (head: string, stx: string) =>
  `<<!DOCTYPE memetic-wikitext+tiddlywiki lar:///g >>\n\n${head}\n` +
  "```toml meta\ncacheable = true\n```\n\n" +
  `${stx}\n\nbody\n\n<<^ code="&#x0003;" >>\n`;

const SOH = '<<^ code="&#x0001;" from=? -> to=lar:///a.b.c/x >>';
const STX = '<<^ code="&#x0002;" >>';

describe("a control sigil closes at >> and nowhere else", () => {
  test("the bearing arrow closes nothing", () => {
    const s = readCarrierShape(carrier(SOH, STX));
    expect(s.marks.head).toBe(true);
    expect(s.marks.stx).toBe(true);
  });

  test("★ an ordinary angle bracket in a value closes nothing either ★", () => {
    const s = readCarrierShape(carrier(SOH, '<<^ code="&#x0002;" note=a>b >>'));
    expect(s.marks.stx).toBe(true);
  });

  test("★ and one in the opener's own value leaves the head readable ★", () => {
    const s = readCarrierShape(carrier('<<^ code="&#x0001;" span=1>2 from=? -> to=lar:///a.b.c/x >>', STX));
    expect(s.marks.head).toBe(true);
  });

  test("a doubled bracket still terminates", () => {
    const s = readCarrierShape(carrier(SOH, '<<^ code="&#x0002;" note=a>>'));
    expect(s.marks.stx).toBe(true);
  });
});
