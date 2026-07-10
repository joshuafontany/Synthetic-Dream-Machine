/*\
title: lar:///ha.ka.ba/lararium/tw5/filters/wikisense
type: application/javascript
module-type: filteroperator
\*/
/**
 * wikisense — the wiki-sense perceiver spoken as a TW5 filter operator, the VM-native mouth:
 *
 *   [wikisense:recall[probe]]            — merged recall: title tier, then structure (probe as
 *                                          sigil-head), then form (probe as a seed title's shingle
 *                                          neighbors) — tiers CONCATENATE in that order and dedup;
 *                                          no fusion score gets invented across tiers.
 *   [wikisense:recall:title[probe]]      — the title tier alone (exact > prefix > substring).
 *   [wikisense:recall:structure[head]]   — the sigil-head tier alone (the memetic-wikitext reader's strata).
 *   [wikisense:recall:form[title]]       — the shingle-neighbor tier alone (Jaccard-ranked).
 *   [wikisense:cohere[]]                 — ONE JSON string: the compact coherence verdict
 *                                          {radius, glues, vacuous, obstructionLocus, gate,
 *                                          corpusSize, bindingPairs} — flat scalars + loci, the
 *                                          wikitext-idiomatic wire shape (parse it downstream with
 *                                          jsonget-style operators).
 *
 * THE UNIVERSE (operator law — whole-by-default, narrow-by-designation): both verbs fold the WHOLE
 * wiki (ordinary + shadows + `$:/`). Appending the `ordinary` suffix designates the non-shadow
 * non-system narrowing: `[wikisense:cohere:ordinary[]]`, `[wikisense:recall:form:ordinary[t]]`.
 *
 * The operator ACTS AS A COLLECTION SOURCE (the `memes[]` precedent): it reads the wiki's sensed
 * universe and ignores the input pipeline — narrow downstream with ordinary filter steps.
 *
 * FAST PATH: `options.wiki.getIndexer("WikiSenseIndexer")` answers from the incrementally-held
 * fold; when indexers stay disabled (safe mode) the operator folds directly — same math, slower.
 * An unknown verb answers ONE error string (fail loud, never silent-empty).
 */

import type { TW5FilterSource, TW5FilterOperator, TW5Wiki } from "../types/tiddlywiki.js";
import {
  cohereFold,
  contentTier,
  foldCorpus,
  formTier,
  readTw5Universe,
  structureTier,
  summarizeCoherence,
  universeOptions,
  type CorpusFold,
  type WikiSenseUniverse,
} from "../wiki-sense-fold.js";

/** The duck-typed handle the fast path reaches — the indexer's lookup verb, nothing more. */
interface WikiSenseIndexerLike {
  fold(universe: WikiSenseUniverse): CorpusFold;
}

/** Reach the corpus fold — the indexer's held fold when it enumerates, else the direct fold. */
function corpusOf(wiki: TW5Wiki, universe: WikiSenseUniverse): CorpusFold {
  const indexer = typeof wiki.getIndexer === "function"
    ? wiki.getIndexer("WikiSenseIndexer") as unknown as WikiSenseIndexerLike | null
    : null;
  if (indexer && typeof indexer.fold === "function") return indexer.fold(universe);
  // safe mode / indexers disabled — the direct fold answers (the same math, unmemoized).
  return foldCorpus(readTw5Universe(wiki, universeOptions(universe)));
}

/** [wikisense:<verb>[:tier][:ordinary][operand]] — the sensorium spoken from wikitext-land. */
export function wikisense(
  _source: TW5FilterSource,
  operator: TW5FilterOperator,
  options: { wiki: TW5Wiki },
): string[] {
  const parts = (operator.suffix ?? "").split(":").filter((p) => p.length > 0);
  const verb = parts[0] ?? "";
  const universe: WikiSenseUniverse = parts.includes("ordinary") ? "ordinary" : "whole";
  const operand = operator.operand ?? "";

  // fail loud on a residual token naming neither a tier nor a universe — a typo never narrows silently.
  const residual = parts.slice(1).find(
    (p) => p !== "title" && p !== "structure" && p !== "form" && p !== "ordinary",
  );
  if (residual !== undefined) {
    return [`wikisense: unknown suffix token "${residual}" (expected title|structure|form|ordinary)`];
  }

  if (verb === "cohere") {
    const verdict = cohereFold(corpusOf(options.wiki, universe));
    return [JSON.stringify(summarizeCoherence(verdict))];
  }

  if (verb === "recall") {
    const fold = corpusOf(options.wiki, universe);
    const tier = parts.find((p) => p === "title" || p === "structure" || p === "form");
    // the merge order stands documented: title → structure → form, concatenated, deduped —
    // each tier ranks within itself; no cross-tier fusion score gets invented.
    const tiers = tier ? [tier] : ["title", "structure", "form"];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const t of tiers) {
      const hits =
        t === "title" ? contentTier(fold, operand)
        : t === "structure" ? structureTier(fold, operand)
        : formTier(fold, operand);
      for (const h of hits) {
        if (!seen.has(h.title)) { seen.add(h.title); out.push(h.title); }
      }
    }
    return out;
  }

  // fail loud (the confused-deputy covenant): a mistyped verb names itself, never an empty list.
  return [`wikisense: unknown verb suffix "${verb}" (expected recall|cohere)`];
}
