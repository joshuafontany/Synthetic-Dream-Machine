/**
 * A NAMED PARAMETER CARRIES AN EQUALS SIGN.
 *
 * ── THE STANDARD ─────────────────────────────────────────────────────────────────────────────────────────
 * TiddlyWiki accepts two separators in a macro parameter (`parseMacroParameterAsAttribute`): `=` and `:`.
 * Only `=` admits a filtered, indirect or macro value, so the memetic standard writes `key=value` and the
 * colon spelling stays legal beside it. A stock TiddlyWiki reads either, which keeps the superset law intact
 * whichever one a carrier holds.
 *
 * ── WHAT MUST NOT MOVE ───────────────────────────────────────────────────────────────────────────────────
 * A DEFINITION still requires the colon. `\procedure greet(name:"world")` spells TiddlyWiki's own parameter
 * list, which refuses `=`, so rewriting a definition breaks the carrier it meant to canonicalize. The
 * definition registers cover the TW5 pragmas and their sigil spellings — wehe, kumu, helu.
 *
 * A SCHEME COLON separates no parameter either. `lar:`, `ni:`, `https:` all pass the strict-identifier test that
 * guards TiddlyWiki's colon, so a rewrite keyed on the identifier alone would eat every address in the graph.
 * The colon separates a parameter only where a QUOTED value follows it — the one shape this moves.
 */

import { describe, test, expect } from "vitest";
import { normalizeMemeSource } from "../src/meme-normalize.js";

const norm = (s: string) => normalizeMemeSource(s).text;

describe("a named parameter is written key=value", () => {
  test("a call's colon parameter takes the equals sign", () => {
    expect(norm('<<~ kau greet(name:"world")>>')).toBe('<<~ kau greet(name="world")>>');
  });

  test("an invoke's parameter moves too", () => {
    expect(norm('<<~ kahea greeting(name:"Operator")>>')).toBe('<<~ kahea greeting(name="Operator")>>');
  });

  test("a plain macro call moves", () => {
    expect(norm('<<greet name:"world">>')).toBe('<<greet name="world">>');
  });

  test("every quoting form moves", () => {
    expect(norm(`<<~ kau t(a:"x" b:'y' c:[[z]])>>`)).toBe(`<<~ kau t(a="x" b='y' c=[[z]])>>`);
  });

  test("a value carrying its own colon survives intact", () => {
    expect(norm('<<~ kau t(confidence:"P:14")>>')).toBe('<<~ kau t(confidence="P:14")>>');
  });

  test("★ a procedure DEFINITION keeps its colon — equals is not valid there ★", () => {
    for (const src of [
      '<<~ \\procedure greet(name:"world")>>',
      '<<~ \\function myFilter(param:"")>>',
      '<<~ \\widget ~mysigil(uri:"" p1:"")>>',
      '<<~ wehe name(param1:"default" param2:"")>>',
      '<<~ helu functionName(param:"default")>>',
      '<<~ kumu thing(param:"default")>>',
    ]) {
      expect(norm(src)).toBe(src);
    }
  });

  test("★ a scheme colon is never a separator ★", () => {
    for (const src of [
      '<<~ loulou lar:///ha.ka.ba/lares/api/pono/meme>>',
      '<<~ aka lar:///ha.ka.ba/turn?confidence=P:14#/normative-language>>',
      '<<~ kau t(u:"ni:///sha-256;abc")>>'.replace('u:', 'u='),
      'A line naming ni:///sha-256;abc and https://example.com in prose.',
    ]) {
      expect(norm(src)).toBe(src);
    }
  });

  test("★ a colon with no quoted value after it stays put ★", () => {
    // `$:/core` and a bare `key:value` both fail the quoted-value test, and TiddlyWiki reads neither as a
    // parameter the memetic standard owns. Moving them would rewrite content, not spelling.
    expect(norm('<<~ kau t(f:[tag[Done]])>>')).toBe('<<~ kau t(f:[tag[Done]])>>');
    expect(norm('<<~ kau t($:/core)>>')).toBe('<<~ kau t($:/core)>>');
  });

  test("★ a sigil never reaches across a line, so prose between two sigils is not a parameter list ★", () => {
    // MEASURED on the graph: a pattern that let `<<` … `>>` span lines matched from one sigil to a later
    // one and rewrote everything between. `''Status:''` spells BOLD WIKITEXT — the colon reads as punctuation
    // and the quotes as emphasis markers — and eight files on this graph moved that way.
    const src = [
      'A line mentioning << in prose.',
      "",
      "''Status:'' design sharpened, blocked on the graph.",
      "",
      '<<~ kapu qualifier=public>>',
    ].join("\n");
    expect(norm(src)).toBe(src);
  });

  test("two sigils on one line each keep their own bounds", () => {
    expect(norm('<<~ kau a(x:"1")>> and <<~ kau b(y:"2")>>'))
      .toBe('<<~ kau a(x="1")>> and <<~ kau b(y="2")>>');
  });

  test("the transform reports itself and runs once", () => {
    const r = normalizeMemeSource('<<~ kau greet(name:"world")>>');
    expect(r.changed).toBe(true);
    expect(r.notes.join(" ")).toMatch(/param|separator|equals/i);
    expect(normalizeMemeSource(r.text).text).toBe(r.text);
  });
});
