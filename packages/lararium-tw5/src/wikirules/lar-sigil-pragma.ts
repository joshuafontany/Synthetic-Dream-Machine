/*\
title: lar:///ha.ka.ba/@lararium/tw5/wikirules/lar-sigil-pragma
type: application/javascript
module-type: wikirule
\*/
/**
 * lar-sigil-pragma — TW5 pragma-type wikirule matching `\sigil NAME(params)`
 * at the top of a tiddler. Stores `isSigilDefinition: true` in the parse tree
 * node; the grammar-cache startup module picks these up and registers them.
 *
 * Currently a stub: produces a `set` pragma node carrying the raw source so
 * that disk round-trip preserves the declaration. Full sigil body parsing
 * (parameters, pattern, close pattern) lives in a future talk-story session.
 *
 * Hook for complex behaviours: any sigil needing richer JS plumbing than
 * `\widget ~name` can be registered here with a `handler` field pointing at a
 * fully-qualified JS module title. The grammar-cache then wires it at boot.
 *
 * Schema: lar:///ha.ka.ba/@lares/api/lararium/schema/sigil-pragma
 */

export interface ParseTreeNode {
  readonly type:        string;
  readonly isSigilDefinition?: boolean;
  readonly name?:       string;
  readonly source?:     string;
  readonly attributes?: Record<string, { type: "string"; value: string }>;
  readonly children?:   ParseTreeNode[];
}

export interface WikiParser {
  source: string;
  pos:    number;
}

export interface RuleInstance {
  parser:    WikiParser | null;
  matchPos?: number;
  matchEnd?: number;
  matchName?: string;
  matchSource?: string;
}

// \sigil NAME(params) or \sigil NAME
const SIGIL_PRAGMA_RE = /^\\sigil\s+([\w-]+)(?:\([^)]*\))?\s*$/gm;

export const name  = "lar-sigil-pragma";
export const types = { pragma: true };

export function init(this: RuleInstance, parser: WikiParser): void {
  this.parser = parser;
}

export function findNextMatch(this: RuleInstance, startPos: number): number | undefined {
  const source = this.parser!.source;
  SIGIL_PRAGMA_RE.lastIndex = startPos;
  const m = SIGIL_PRAGMA_RE.exec(source);
  if (!m || m.index !== startPos) return undefined;
  this.matchPos    = m.index;
  this.matchEnd    = m.index + m[0].length;
  this.matchName   = m[1] ?? "";
  this.matchSource = m[0];
  return m.index;
}

export function parse(this: RuleInstance): ParseTreeNode[] {
  this.parser!.pos = this.matchEnd!;
  return [{
    type:              "set",
    isSigilDefinition: true,
    name:              this.matchName!,
    source:            this.matchSource!,
    attributes:        {},
    children:          [],
  }];
}
