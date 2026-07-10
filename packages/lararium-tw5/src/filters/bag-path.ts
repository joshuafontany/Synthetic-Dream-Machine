/*\
title: lar:///ha.ka.ba/lararium/tw5/filters/bag-path
type: application/javascript
module-type: filteroperator
\*/
import { mirrorRelPath, type MirrorPathStrategy } from "@lararium/mesh/mirror-paths";
import type { TW5FilterOperator, TW5FilterSource } from "../types/tiddlywiki.js";

function isMirrorPathStrategy(value: string): value is MirrorPathStrategy {
  return value === "lares" || value === "engine" || value === "wiki-shadow";
}

export function bagPath(source: TW5FilterSource, operator: TW5FilterOperator): string[] {
  const requested = (operator.operand ?? "lares").trim();
  const strategy: MirrorPathStrategy = isMirrorPathStrategy(requested) ? requested : "lares";
  const results: string[] = [];

  source(function (_tiddler, title: string) {
    const relPath = mirrorRelPath(title, strategy);
    if (relPath) results.push(relPath);
  });

  return results;
}
