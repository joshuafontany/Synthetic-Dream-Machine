/**
 * lar-uri — the address's anatomy, read through the host's own filter parser.
 *
 * ── WHY IN A WIKI ───────────────────────────────────────────────────────────────────────────────
 * A test that calls the exported function directly proves the arithmetic and nothing else: it passes
 * whether or not the operator ever registers, whether or not the suffix parses, whether or not the
 * plugin carries the module. These cases run `filterTiddlers` on a booted wiki, so what they exercise
 * is what a template will meet.
 *
 * ── THE VOCABULARY IS THE LAW'S ─────────────────────────────────────────────────────────────────
 * The `lar:` URI law names five chunks — scheme · authority · root · path · fragment — and the suffix
 * words are exactly those, so a reader of either learns the other. One correction rides in it: `root`
 * belongs to the LAW's sense, the three-term `w1.w2.w3` heading.angle.dynamic. An address stripped of
 * its fragment answers to `bare`, because two meanings under one word in a vocabulary claiming to
 * mirror the law would be the collision this grammar keeps finding.
 *
 * The mode rides the SUFFIX and the operand stays free for a parameter, matching `toml-field` and
 * `wikisense` — the house's own two precedents for a filter that reads more than one way.
 */
import { describe, test, expect, beforeAll } from "vitest";
import { TW5Engine } from "../src/tw5-vm.js";
import { bootTestWiki, wikiSkip, skipNote } from "./test-wiki.js";

const NESTED = "lar:///ha.ka.ba/lares/api/pono/meme#edges/inbound";
const SHALLOW = "lar:///ha.ka.ba/lares/api/pono/meme#edges";
const BARE = "lar:///ha.ka.ba/lares/api/pono/meme";
const SESSION = "lar://mara:operator@crossroads/operator.weighs.deps/intent";

describe.skipIf(wikiSkip)(`lar-uri — the address read through the wiki's filter parser${skipNote}`, () => {
  let engine: TW5Engine;
  beforeAll(async () => { engine = await bootTestWiki(); }, 60_000);

  /** Drive one title through one filter, the way a template would. */
  const via = (title: string, expr: string): string[] =>
    engine.$tw.wiki.filterTiddlers(`[[${title}]] +[${expr}]`) as string[];

  test("fragment — the part after the first hash", () => {
    expect(via(NESTED, "lar-uri:fragment[]")).toEqual(["edges/inbound"]);
    expect(via(BARE, "lar-uri:fragment[]")).toEqual([""]);
  });

  test("parent — one level out, and a bare address reports itself so a climb terminates", () => {
    expect(via(NESTED, "lar-uri:parent[]")).toEqual([SHALLOW]);
    expect(via(SHALLOW, "lar-uri:parent[]")).toEqual([BARE]);
    expect(via(BARE, "lar-uri:parent[]")).toEqual([BARE]);
  });

  test("bare — every fragment dropped, in one step", () => {
    expect(via(NESTED, "lar-uri:bare[]")).toEqual([BARE]);
  });

  test("depth — how many segments the fragment carries", () => {
    expect(via(NESTED, "lar-uri:depth[]")).toEqual(["2"]);
    expect(via(BARE, "lar-uri:depth[]")).toEqual(["0"]);
  });

  /** The LAW's root: the three-term `w1.w2.w3` that opens a path. */
  test("root — the three-term heading.angle.dynamic, per the URI law", () => {
    expect(via(BARE, "lar-uri:root[]")).toEqual(["ha.ka.ba"]);
    expect(via(SESSION, "lar-uri:root[]")).toEqual(["operator.weighs.deps"]);
  });

  test("path — the ordered segments after the root, fragment excluded", () => {
    expect(via(BARE, "lar-uri:path[]")).toEqual(["lares/api/pono/meme"]);
    expect(via(NESTED, "lar-uri:path[]")).toEqual(["lares/api/pono/meme"]);
  });

  /** Session form carries a speaker; local form carries none, and MUST NOT in storage. */
  test("authority — present on a session form, empty on a local one", () => {
    expect(via(SESSION, "lar-uri:authority[]")).toEqual(["mara:operator@crossroads"]);
    expect(via(BARE, "lar-uri:authority[]")).toEqual([""]);
  });

  /** A reader meeting something outside this grammar reports rather than throws. */
  test("a foreign title passes through under parent, and reads empty under a part", () => {
    expect(via("HelloThere", "lar-uri:parent[]")).toEqual(["HelloThere"]);
    expect(via("HelloThere", "lar-uri:fragment[]")).toEqual([""]);
    expect(via("HelloThere", "lar-uri:root[]")).toEqual([""]);
  });

  /** An unknown suffix must not read as "no results" — the quietest failure this grammar has. */
  test("an unknown part refuses rather than returning nothing", () => {
    expect(() => via(BARE, "lar-uri:nosuchpart[]")).toThrow();
  });
});
