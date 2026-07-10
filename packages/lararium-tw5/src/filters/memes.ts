/*\
title: lar:///ha.ka.ba/lararium/tw5/filters/memes
type: application/javascript
module-type: filteroperator
\*/
import type { TW5FilterSource, TW5FilterOperator, TW5Wiki } from "../types/tiddlywiki.js";
import { allLarTitles } from "./lar-title.js";

/** [memes[]] — all tiddlers with lar: URI titles.
 *  Acts as a collection source; ignores the input pipeline. */
export function memes(
  _source:   TW5FilterSource,
  _operator: TW5FilterOperator,
  options:   { wiki: TW5Wiki },
): string[] {
  return allLarTitles(options.wiki);
}
