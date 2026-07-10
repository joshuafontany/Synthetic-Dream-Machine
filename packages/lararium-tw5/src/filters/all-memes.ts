/*\
title: lar:///ha.ka.ba/lararium/tw5/filters/all-memes
type: application/javascript
module-type: allfilteroperator
\*/
import type { TW5Wiki } from "../types/tiddlywiki.js";
import { allLarTitles } from "./lar-title.js";

/**
 * [all[memes]] — all tiddlers whose title carries a lar: URI.
 *
 * A meme means any tiddler or tiddler-group with a lar: URI title,
 * including slot-children (whose titles share the parent's lar: prefix).
 *
 * Mirrors the shape of TW5's built-in tiddlers.js allfilteroperator:
 * returns a string[] so LinkedList.pushTop() can compose it with other
 * all[] suboperators (e.g. [all[memes+shadows]]).
 */
export function memes(
  _source:  unknown,
  _prefix:  string,
  options:  { wiki: TW5Wiki },
): string[] {
  return allLarTitles(options.wiki);
}
