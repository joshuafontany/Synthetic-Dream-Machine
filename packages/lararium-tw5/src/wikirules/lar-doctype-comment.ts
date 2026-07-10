/*\
title: lar:///ha.ka.ba/lararium/tw5/wikirules/lar-doctype-comment
type: application/javascript
module-type: wikirule
\*/
/**
 * lar-doctype-comment — TW5 wikirule (block-mode) for HTML-comment-wrapped
 * DOCTYPE sigils: `<!-- <<~ !DOCTYPE = uri >> -->`.
 *
 * Pre-empts TW5's built-in `htmlcomment` rule which would otherwise strip
 * the line in text/plain output. Round-trip preservation: emits a text
 * node carrying the verbatim source slice.
 *
 * Module-type: wikirule. Classified by `types: { block: true }`.
 */

import {
  ParseTreeNode,
  WikiParser,
  RuleInstance,
} from "./lar-sigil-shared.js";

const DOCTYPE_RE = /<!--\s*<<~\s*!DOCTYPE\s*=\s*[^>]+>>\s*-->/g;

export const name  = "lar-doctype-comment";
export const types = { block: true };

export function init(this: RuleInstance, parser: WikiParser): void {
  this.parser = parser;
}

export function findNextMatch(this: RuleInstance, startPos: number): number | undefined {
  const source = this.parser!.source;
  DOCTYPE_RE.lastIndex = startPos;
  const m = DOCTYPE_RE.exec(source);
  if (!m) return undefined;
  this.matchPos = m.index;
  this.matchEnd = DOCTYPE_RE.lastIndex;
  this.attrs    = { __literal__: m[0] };
  return m.index;
}

export function parse(this: RuleInstance): ParseTreeNode[] {
  const parser = this.parser!;
  parser.pos = this.matchEnd!;
  return [{ type: "text", text: this.attrs!["__literal__"]! }];
}
