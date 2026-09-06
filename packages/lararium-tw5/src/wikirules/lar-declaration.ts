/*\
title: lar:///ha.ka.ba/lararium/tw5/wikirules/lar-declaration
type: application/javascript
module-type: wikirule
\*/
/**
 * lar-declaration — TW5 wikirule (block-mode) for the `!WORD` declaration class:
 * `<<!DOCTYPE uri>>` and its siblings.
 *
 * The class carries SGML's markup-declaration sense — a statement ABOUT the carrier,
 * consumed before content, never a procedure the renderer runs. That is what separates
 * `<<!WORD …>>` from the sharktooth `<<~ WORD …>>` (a move the stream performs) and from
 * `<<^ …>>` (a control-code frame position).
 *
 * The rule emits the verbatim source slice, so a declaration survives a render→parse
 * round-trip byte-identical. Nothing else in TW5 claims the shape, and this rule holding
 * it explicitly keeps that true when something later does.
 *
 * Module-type: wikirule. Classified by `types: { block: true }`.
 */

import {
  ParseTreeNode,
  WikiParser,
  RuleInstance,
} from "./lar-sigil-shared.js";

/** `<<!WORD …>>` at line start — the whole declaration class, one rule. */
const DECLARATION_RE = /<<![A-Z][A-Z0-9-]*\s[^>]*>>/g;

export const name  = "lar-declaration";
export const types = { block: true };

export function init(this: RuleInstance, parser: WikiParser): void {
  this.parser = parser;
}

export function findNextMatch(this: RuleInstance, startPos: number): number | undefined {
  const source = this.parser!.source;
  DECLARATION_RE.lastIndex = startPos;
  const m = DECLARATION_RE.exec(source);
  if (!m) return undefined;
  this.matchPos = m.index;
  this.matchEnd = DECLARATION_RE.lastIndex;
  this.attrs    = { __literal__: m[0] };
  return m.index;
}

export function parse(this: RuleInstance): ParseTreeNode[] {
  const parser = this.parser!;
  parser.pos = this.matchEnd!;
  return [{ type: "text", text: this.attrs!["__literal__"]! }];
}
