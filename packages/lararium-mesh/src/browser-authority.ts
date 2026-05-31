/**
 * browser-authority.ts — browser island boundary types.
 *
 * Only data shapes that cross the island boundary live here. The pool
 * implementation in @lararium/browser manages its own internal state.
 *
 * Under the one-recipe model, the canonical `WikiRecipe` + `BagResolver`
 * live in `wiki-recipe.ts`. This file re-exports `WikiRecipe` as a
 * convenience alias for the browser API surface and adds browser-specific
 * mount-time params and projection-snapshot shapes.
 *
 * Schema: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-authority
 */

import type { Heads } from "@automerge/automerge";
import type { WikiRecipe } from "./wiki-recipe.js";

export type { WikiRecipe } from "./wiki-recipe.js";

/**
 * BrowserWikiMountParams — what the pool needs to mount a wiki island.
 *
 * Passed to BrowserVesselIslandPool.mountWiki(). No blob bytes — the island
 * reads TW5 core bytes and plugin tiddlers from the @lararium CRDT doc after Repo sync.
 */
export interface BrowserWikiMountParams {
  /** SHA-256 hex of TW5 core blob. null = pre-CAS. Island resolves bytes from the mesh. */
  coreHash: string | null;
  /** WikiRecipe slot structure (wikiSlug + optional canonBags). */
  recipe: WikiRecipe;
  /** Slot URI → AutomergeUrl. Null = in-memory or cold slot. */
  resolver: Readonly<Record<string, string | null>>;
}

/**
 * BrowserProjectionSnapshot — minimal render inputs crossing the island boundary.
 *
 * Structured-clone friendly. No live DOM nodes, no callbacks, no proxies.
 * Above-stack projections defer to a future sprint; this shape stays as a
 * forward marker for when they land.
 */
export interface BrowserProjectionSnapshot {
  islandId: string;
  payload:  Record<string, unknown>;
  heads:    Heads;
  producedAt: number;
}
