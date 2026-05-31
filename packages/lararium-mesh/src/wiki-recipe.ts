/**
 * wiki-recipe — one-model recipe spec for every wiki.
 *
 * Slot order = cascade order. Top of stack wins (TW5 cascade law).
 *
 *   lar:///ha.ka.ba/@temp       — volatile, in-memory, $:/temp/* lives here
 *   lar:///ha.ka.ba/@draft      — "Draft of …" tiddlers, CRDT, high-churn
 *   lar:///ha.ka.ba/@<slug>     — wiki identity bag, CRDT, operator's edits land here
 *   canonBags[]                 — optional content libraries, CRDT, read-only from wiki
 *   lar:///ha.ka.ba/@lares      — personality, CRDT, required
 *   lar:///ha.ka.ba/@lararium   — system / engine core / plugins, CRDT, required
 *
 * Above-stack projections defer (separate concern). When they land they will
 * subscribe to nalu events, not participate in the cascade.
 *
 * Schema: lar:///ha.ka.ba/@lares/v0.1/api/lararium/wiki-recipe
 */

import type { AutomergeUrl } from "@automerge/automerge-repo";

/** A slot URI in the lar:///ha.ka.ba/@<name> namespace. */
export type SlotUri = string;

/** Five fixed slots always present in every recipe. */
export const TEMP_BAG     = "lar:///ha.ka.ba/@temp"     as const;
export const DRAFT_BAG    = "lar:///ha.ka.ba/@draft"    as const;
export const LARES_BAG    = "lar:///ha.ka.ba/@lares"    as const;
export const LARARIUM_BAG = "lar:///ha.ka.ba/@lararium" as const;

/** Build a wiki identity bag URI from a slug. */
export function wikiBagUri(slug: string): SlotUri {
  return `lar:///ha.ka.ba/@${slug}`;
}

/**
 * Extract the slug from a lar URI of the form `lar:///ha.ka.ba/@<slug>`.
 * Falls back to the input string for malformed inputs (callers can detect
 * by comparing input === slugFromUri(input) — true means malformed).
 */
export function slugFromUri(uri: string): string {
  const match = /^lar:\/\/\/ha\.ka\.ba\/@([^/]+)/.exec(uri);
  return match ? match[1]! : uri;
}

/**
 * WikiRecipe — the one shape that fits every wiki under the sun.
 *
 *   adminRecipe: { wikiSlug: "admin" }
 *   sdmRecipe:   { wikiSlug: "synthetic-dream-machine",
 *                  canonBags: ["lar:///ha.ka.ba/@sdm", "lar:///ha.ka.ba/@ftls"] }
 */
export interface WikiRecipe {
  /** Identity slug; expands to lar:///ha.ka.ba/@<wikiSlug>. */
  readonly wikiSlug: string;
  /**
   * Canon content bag URIs, ordered top→bottom within the canon slot —
   * canonBags[0] wins ties over canonBags[1]. Read-only from this wiki.
   */
  readonly canonBags?: readonly SlotUri[];
}

/**
 * Slot URI → AutomergeUrl. Null for @temp (no CRDT — in-memory only).
 * The vessel populates this when sending the manifest; the island reads it
 * to wire each CRDT slot to its doc handle.
 */
export type BagResolver = ReadonlyMap<SlotUri, AutomergeUrl | null>;

/**
 * Full expanded slot order — top of array = highest priority (first wins).
 * Iterating bottom→top (reverse) gives the addLayer order for CompositeStore.
 */
export function expandRecipe(r: WikiRecipe): readonly SlotUri[] {
  return [
    TEMP_BAG,
    DRAFT_BAG,
    wikiBagUri(r.wikiSlug),
    ...(r.canonBags ?? []),
    LARES_BAG,
    LARARIUM_BAG,
  ];
}

// Write routing happens via the in-wiki `lar:///ha.ka.ba/@lararium/config/bag-paths` cascade
// (IslandAdaptor._routeBag walks it). The cascade evaluates filter expressions
// against the saving tiddler — first non-empty result is the target slot URI.
// Operator-configurable at runtime; per-wiki overlays compose via the recipe
// cascade. See: lar:///ha.ka.ba/@lares/v0.1/api/lararium/bag-paths-cascade
