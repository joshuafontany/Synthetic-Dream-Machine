/*\
title: lar:///ha.ka.ba/@lararium/v0.1/tw5/filters/implementors
type: application/javascript
module-type: filteroperator
\*/
import type { TW5FilterSource, TW5FilterOperator } from "../types/tiddlywiki.js";

/** Exact-token match on space-separated `implements` field.
 *  TW5's built-in field: operator does substring matching, which breaks when one
 *  URI is a prefix of another. This uses space-split for exact token matching. */
export function implementors(source: TW5FilterSource, operator: TW5FilterOperator): string[] {
  const target  = operator.operand ?? "";
  const results: string[] = [];
  source(function (tiddler, title: string) {
    if (!tiddler) return;
    const raw    = String(tiddler.fields?.["implements"] ?? "");
    const tokens = raw.split(/\s+/).filter(Boolean);
    if (tokens.includes(target)) results.push(title);
  });
  return results;
}
