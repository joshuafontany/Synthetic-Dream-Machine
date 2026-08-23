/**
 * lar-uri — the arithmetic, proven without a wiki.
 *
 * ── WHY TWO WITNESSES AND NOT ONE ───────────────────────────────────────────────────────────────
 * `lar-uri-filter.test.ts` drives this operator through `filterTiddlers` on a booted wiki, and what
 * that proves is the ROAD: the module registered, the suffix parsed, the plugin carried it. What it
 * cannot do is run while the road is out — and a road can be out for reasons that have nothing to do
 * with the operator.
 *
 * That happened. The in-wiki witness carried both jobs, the bundle stopped building, and nine cases of
 * ARITHMETIC went dark with it — the operator's correctness resting on a build that had never once
 * executed it.
 *
 * So the layers split by what each proves. This file asks whether the address divides correctly and
 * needs nothing but the function. The other asks whether a template can reach it at all. When one
 * reds, the other says which half broke.
 */
import { describe, test, expect } from "vitest";
import { larUri } from "../src/filters/lar-uri.js";
import type { TW5FilterSource } from "../src/types/tiddlywiki.js";

const over = (titles: string[]): TW5FilterSource =>
  ((cb: (t: unknown, title: string) => void) => { for (const t of titles) cb(undefined, t); }) as never;
const part = (title: string, suffix: string) => larUri(over([title]), { suffix } as never);

const NESTED  = "lar:///ha.ka.ba/lares/api/pono/meme#edges/inbound";
const SHALLOW = "lar:///ha.ka.ba/lares/api/pono/meme#edges";
const BARE    = "lar:///ha.ka.ba/lares/api/pono/meme";
const SESSION = "lar://mara:operator@crossroads/operator.weighs.deps/intent";

describe("lar-uri — the address divides by the law's own chunks", () => {
  test("fragment is whatever follows the FIRST hash", () => {
    expect(part(NESTED, "fragment")).toEqual(["edges/inbound"]);
    expect(part(BARE, "fragment")).toEqual([""]);
    expect(part("lar:///x#a#b", "fragment")).toEqual(["a#b"]);
  });

  test("parent climbs one level, and a bare address reports itself so a climb terminates", () => {
    expect(part(NESTED, "parent")).toEqual([SHALLOW]);
    expect(part(SHALLOW, "parent")).toEqual([BARE]);
    expect(part(BARE, "parent")).toEqual([BARE]);
  });

  test("bare drops every fragment in one step", () => {
    expect(part(NESTED, "bare")).toEqual([BARE]);
    expect(part(BARE, "bare")).toEqual([BARE]);
  });

  test("depth counts the fragment's segments", () => {
    expect(part(NESTED, "depth")).toEqual(["2"]);
    expect(part(SHALLOW, "depth")).toEqual(["1"]);
    expect(part(BARE, "depth")).toEqual(["0"]);
  });

  /** The LAW's root: the three-term heading.angle.dynamic that opens a path. */
  test("root is the three-term opener, in local form and session form alike", () => {
    expect(part(BARE, "root")).toEqual(["ha.ka.ba"]);
    expect(part(SESSION, "root")).toEqual(["operator.weighs.deps"]);
  });

  test("path is what follows the root, with the fragment excluded", () => {
    expect(part(BARE, "path")).toEqual(["lares/api/pono/meme"]);
    expect(part(NESTED, "path")).toEqual(["lares/api/pono/meme"]);
    expect(part(SESSION, "path")).toEqual(["intent"]);
  });

  /** Session form carries a speaker; local form carries none, and MUST NOT in storage. */
  test("authority stands on a session form and is empty on a local one", () => {
    expect(part(SESSION, "authority")).toEqual(["mara:operator@crossroads"]);
    expect(part(BARE, "authority")).toEqual([""]);
  });

  test("scheme names the grammar, or nothing where the title stands outside it", () => {
    expect(part(BARE, "scheme")).toEqual(["lar"]);
    expect(part("HelloThere", "scheme")).toEqual([""]);
  });

  /** Graceful parsing: a foreign title is not an error, it is simply not ours. */
  test("a title outside this grammar reports rather than refuses", () => {
    expect(part("HelloThere", "parent")).toEqual(["HelloThere"]);
    expect(part("HelloThere", "bare")).toEqual(["HelloThere"]);
    expect(part("HelloThere", "root")).toEqual([""]);
  });

  /**
   * An unregistered operator returns an EMPTY LIST in TiddlyWiki, so a misspelled part would read
   * exactly like a part that found nothing — the one failure an author reading a filter cannot see.
   */
  test("an unknown part throws, and names what it does read", () => {
    expect(() => part(BARE, "nosuchpart")).toThrow(/no such part/);
    expect(() => part(BARE, "nosuchpart")).toThrow(/fragment/);
  });

  test("no suffix reads the fragment", () => {
    expect(larUri(over([NESTED]), {} as never)).toEqual(["edges/inbound"]);
  });
});
