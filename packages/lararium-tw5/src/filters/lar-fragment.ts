/*\
title: lar:///ha.ka.ba/lararium/tw5/filters/lar-fragment
type: application/javascript
module-type: filteroperator
\*/
/**
 * lar-fragment — read a carrier title's fragment, and the address of what encloses it.
 *
 * ── WHY A FILTER AND NOT A FIELD ────────────────────────────────────────────────────────────────
 * Belonging lives in the title. A child addressed `lar:///root#a/b` is enclosed by `lar:///root#a`,
 * and that by `lar:///root` — the whole relation readable from the address, with no stored parent to
 * go stale when a title moves. A field holding the same fact would be a second copy of something the
 * name already says, and a copy is what drifts.
 *
 * The wiki still has to ASK, though, and TiddlyWiki's core here ships no `split`, so a template that
 * wanted an enclosing address had nothing to compute it with. That gap is the only reason the fact
 * ever got stored. This closes it.
 *
 * ── OPERANDS ────────────────────────────────────────────────────────────────────────────────────
 *   (none) / `fragment`  the fragment alone, `a/b` — empty for a title carrying none
 *   `parent`             the address one level out: `…#a/b` -> `…#a`, `…#a` -> the bare address
 *   `root`               the address with every fragment dropped
 *   `depth`              how many segments the fragment carries, as a string
 *
 * A title that carries no `lar:` scheme passes through untouched under `parent` and `root`, and reads
 * empty under `fragment` — a filter meeting a foreign title reports rather than throws, which is the
 * same graceful-parse law the deserializer answers to.
 */
import type { TW5FilterOperator, TW5FilterSource } from "../types/tiddlywiki.js";

/** Split a title into its address and its fragment. A title bearing no `#` carries no fragment. */
function divide(title: string): { address: string; fragment: string } {
  const hash = title.indexOf("#");
  return hash < 0
    ? { address: title, fragment: "" }
    : { address: title.slice(0, hash), fragment: title.slice(hash + 1) };
}

export function larFragment(source: TW5FilterSource, operator: TW5FilterOperator): string[] {
  const mode = (operator.operand ?? "fragment").trim() || "fragment";
  const results: string[] = [];

  source(function (_tiddler, title: string) {
    const { address, fragment } = divide(title);

    if (mode === "root") { results.push(address); return; }

    if (mode === "depth") {
      results.push(String(fragment === "" ? 0 : fragment.split("/").length));
      return;
    }

    if (mode === "parent") {
      // One level out. A fragment of a single segment encloses to the bare address; a title with no
      // fragment already stands at its root and reports itself, so a template may climb without
      // testing first and simply stop moving.
      if (fragment === "") { results.push(address); return; }
      const cut = fragment.lastIndexOf("/");
      results.push(cut < 0 ? address : `${address}#${fragment.slice(0, cut)}`);
      return;
    }

    results.push(fragment);
  });

  return results;
}
