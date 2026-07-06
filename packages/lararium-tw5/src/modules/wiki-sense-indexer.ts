/*\
title: lar:///ha.ka.ba/@lararium/tw5/modules/wiki-sense-indexer
type: application/javascript
module-type: indexer
\*/
/**
 * wiki-sense-indexer — the VM-NATIVE wiki-sense beat: a TW5 `module-type: indexer` that holds the
 * sensorium's corpus fold over the wiki's OWN tiddler universe, maintained incrementally from the
 * wiki's synchronous update() pulses.
 *
 * LAZY LAW (the tag-indexer license): update() INVALIDATES cheap (nulls the corpus memo — it fires
 * synchronously inside addTiddler/deleteTiddler, so it must cost nothing); the fold REBUILDS on
 * lookup. Per-title parse/shingle work rides `wiki.getCacheForTiddler`, so TW5's own per-title
 * invalidation law carries it — a rebuild after one write re-derives ONLY the written title; every
 * unchanged title answers from its tiddler cache.
 *
 * THE UNIVERSE (operator law — whole-by-default, narrow-by-designation): the "whole" fold senses
 * ordinary + shadow/plugin-bundled tiddlers INCLUDING `$:/` system titles; "ordinary" designates
 * the non-shadow non-system narrowing. Each tiddler crosses as its WHOLE open field record.
 *
 * Registration: the export name (`WikiSenseIndexer`) becomes the indexer name —
 * `wiki.getIndexer("WikiSenseIndexer")` reaches it; the `wikisense` filter operator fast-paths
 * through that handle and falls back to a direct fold when indexers stay disabled (safe mode).
 */

import type { TW5Wiki } from "../types/tiddlywiki.js";
import {
  deriveDocStalk,
  foldCorpus,
  readTw5Universe,
  senseBodyOf,
  universeOptions,
  type CorpusFold,
  type DocStalk,
  type WikiSenseUniverse,
} from "../wiki-sense-fold.js";

/** The per-title cache key the stalk derivation rides (cleared by TW5 on that title's change). */
const STALK_CACHE = "lararium-wiki-sense-stalk";

/**
 * The indexer — TW5 constructs one per wiki (`new WikiSenseIndexer(wiki)`), then drives
 * init/rebuild/update; lookups reach it through `wiki.getIndexer("WikiSenseIndexer").fold(...)`.
 */
export class WikiSenseIndexer {
  private readonly wiki: TW5Wiki;
  /** the volatile corpus memo, one fold per named universe — dies on ANY update, rebuilds on lookup. */
  private folds: Partial<Record<WikiSenseUniverse, CorpusFold>> = {};

  constructor(wiki: TW5Wiki) {
    this.wiki = wiki;
  }

  init(): void {
    this.folds = {};
  }

  rebuild(): void {
    this.folds = {};
  }

  /** Fires SYNCHRONOUSLY inside addTiddler/deleteTiddler — invalidate cheap, rebuild on lookup. */
  update(_updateDescriptor: unknown): void {
    this.folds = {};
  }

  /** The lookup — the memoized corpus fold over the designated universe (default: the WHOLE wiki). */
  fold(universe: WikiSenseUniverse = "whole"): CorpusFold {
    return (this.folds[universe] ??= this.buildFold(universe));
  }

  private buildFold(universe: WikiSenseUniverse): CorpusFold {
    const docs = readTw5Universe(this.wiki, universeOptions(universe));
    // per-title stalks ride the tiddler cache: TW5 clears a title's cache exactly when that title
    // changes, so a corpus rebuild re-derives only the moved titles.
    return foldCorpus(docs, (d) =>
      this.wiki.getCacheForTiddler(d.title, STALK_CACHE, () => deriveDocStalk(senseBodyOf(d.fields))) as DocStalk,
    );
  }
}
