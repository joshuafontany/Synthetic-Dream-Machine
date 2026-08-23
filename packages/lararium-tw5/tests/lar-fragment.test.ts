/**
 * lar-fragment — belonging read from the address, never from a stored field.
 *
 * The filter exists because TiddlyWiki's core here ships no `split`, so a template that wanted a
 * carrier's enclosing address had nothing to compute one with — and that gap is the only reason the
 * relation ever got stored on a record. These cases hold the arithmetic the templates will lean on.
 */
import { describe, test, expect } from "vitest";
import { larFragment } from "../src/filters/lar-fragment.js";
import type { TW5FilterSource } from "../src/types/tiddlywiki.js";

/** A source over bare titles, the shape TiddlyWiki hands a filter operator. */
const over = (titles: string[]): TW5FilterSource =>
  ((cb: (t: unknown, title: string) => void) => { for (const t of titles) cb(undefined, t); }) as never;

const run = (titles: string[], operand?: string) =>
  larFragment(over(titles), { operand } as never);

describe("lar-fragment — the address carries the belonging", () => {
  const NESTED = "lar:///ha.ka.ba/lares/api/pono/meme#edges/inbound";
  const SHALLOW = "lar:///ha.ka.ba/lares/api/pono/meme#edges";
  const BARE = "lar:///ha.ka.ba/lares/api/pono/meme";

  test("the fragment alone", () => {
    expect(run([NESTED, SHALLOW, BARE])).toEqual(["edges/inbound", "edges", ""]);
  });

  test("parent climbs exactly one level", () => {
    expect(run([NESTED], "parent")).toEqual([SHALLOW]);
    expect(run([SHALLOW], "parent")).toEqual([BARE]);
  });

  /** A template may climb without testing first, because a root reports itself and simply stops. */
  test("parent of a bare address is that address — the climb terminates rather than emptying", () => {
    expect(run([BARE], "parent")).toEqual([BARE]);
  });

  test("root drops every fragment in one step", () => {
    expect(run([NESTED, SHALLOW, BARE], "root")).toEqual([BARE, BARE, BARE]);
  });

  test("depth counts segments", () => {
    expect(run([NESTED, SHALLOW, BARE], "depth")).toEqual(["2", "1", "0"]);
  });

  /** A filter meeting a foreign title reports rather than throws — the graceful-parse law. */
  test("a title outside this grammar passes through rather than failing", () => {
    expect(run(["HelloThere"], "parent")).toEqual(["HelloThere"]);
    expect(run(["HelloThere"])).toEqual([""]);
  });

  /** A fragment is whatever follows the FIRST `#`; a later one belongs to the fragment. */
  test("only the first hash divides", () => {
    expect(run(["lar:///x#a#b"])).toEqual(["a#b"]);
  });
});
