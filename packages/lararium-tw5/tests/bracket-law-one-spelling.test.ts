/**
 * THE BRACKET LAW HAS ONE SPELLING PER WIDTH.
 *
 * ── THE LAW ──────────────────────────────────────────────────────────────────────────────────────────────
 * A `>` closes a call only where a second follows. TiddlyWiki states it once, in `reUnquotedAttribute`
 * (core/modules/parsers/parseutils.js), and every scan here that walks a sigil's interior states it again:
 *
 *   `(?:[^>\n]|>(?!>))`   line-bounded — a sigil closes on the line it opens
 *   `(?:[^>]|>(?!>))`     wider — the bootstrap scan, deliberately, before a grammar stands
 *
 * `frame-marks.ts` rules that the CODES collapse and the PATTERN WIDTHS do not: a line-bounded scan and a
 * wider one answer different questions. That scar stays. What must not drift is the LAW inside each width.
 *
 * ── WHY A GUARD ──────────────────────────────────────────────────────────────────────────────────────────
 * MEASURED: the law once read `(?:[^>\n]|->)*` — one glyph named where a class belongs — and refused
 * `a>b` where TiddlyWiki accepts it. Correcting it touched 78 occurrences across eight modules, in TWO
 * variants, and a sweep naming one variant left the other standing. A guard reads the tree rather than a
 * list, so the next spelling to arrive gets caught without anyone remembering to look.
 */

import { describe, test, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = new URL("../src", import.meta.url).pathname;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) return walk(p);
    return p.endsWith(".ts") && !p.endsWith(".generated.ts") ? [p] : [];
  });
}

describe("the bracket law keeps one spelling per width", () => {
  test("★ no scan names a glyph where the class belongs ★", () => {
    const offenders: string[] = [];
    for (const f of walk(SRC)) {
      const src = readFileSync(f, "utf8");
      // A tail alternation admitting one literal sequence rather than "any > that closes nothing".
      for (const m of src.matchAll(/\(\?:\[\^>\\?n?\]\|(?!>\(\?!>\))([^)]{1,6})\)/g)) {
        offenders.push(`${f.slice(SRC.length + 1)}: (?:[^>…]|${m[1]})`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("both sanctioned widths still stand — the guard reads something", () => {
    // VACUITY GATE. A guard that matches nothing would pass over an empty tree just as happily.
    const all = walk(SRC).map((f) => readFileSync(f, "utf8")).join("\n");
    expect(all).toContain("(?:[^>\\n]|>(?!>))");
    expect(all).toContain("(?:[^>]|>(?!>))");
  });
});
