/*\
title: lar:///ha.ka.ba/lararium/tw5/filters/stack
type: application/javascript
module-type: filteroperator
\*/
import type { TW5FilterSource, TW5FilterOperator } from "../types/tiddlywiki.js";
import { bagScopeOf, qualifyStackTag, stackOf } from "../has-stack.js";

/** Read a tiddler's tags defensively (TW5 holds an array; raw fields may hold a string). */
function tagsOf(fields: Record<string, unknown> | undefined): string[] {
  const t = fields?.["tags"];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
  if (typeof t === "string" && t.length) return t.split(" ").filter(Boolean);
  return [];
}

/**
 * stack[] — emit each input carrier's qualified has-stack URIs (deduped).
 * stack:has[<name>] — keep carriers whose stack holds <name>; a lar:/// operand
 * compares directly, a relative operand qualifies against EACH carrier's own
 * bag scope (TW5 speaks `has` natively; this operator speaks it qualified).
 */
export function stack(source: TW5FilterSource, operator: TW5FilterOperator): string[] {
  const suffix  = operator.suffix ?? "";
  const operand = operator.operand ?? "";
  const results: string[] = [];

  if (suffix === "has") {
    source(function (tiddler, title: string) {
      if (!tiddler) return;
      const scope  = bagScopeOf(title);
      const target = operand.startsWith("lar:///") ? operand : qualifyStackTag(operand, scope);
      if (!target) return;
      const entries = stackOf(tagsOf(tiddler.fields as Record<string, unknown>), title);
      if (entries.some((e) => e.uri === target)) results.push(title);
    });
    return results;
  }

  const seen = new Set<string>();
  source(function (tiddler, title: string) {
    if (!tiddler) return;
    for (const e of stackOf(tagsOf(tiddler.fields as Record<string, unknown>), title)) {
      if (e.uri && !seen.has(e.uri)) {
        seen.add(e.uri);
        results.push(e.uri);
      }
    }
  });
  return results;
}
