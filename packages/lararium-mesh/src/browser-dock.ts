/**
 * browser-dock.ts — browser island boundary types.
 *
 * The dock: where boundary-crossing shapes berth as they pass between vessel
 * and island. Only boundary-crossing shapes live here; the pool implementation
 * in @lararium/browser manages its own internal state.
 *
 * Under the one-recipe model, the canonical `WikiRecipe` + `BagResolver`
 * live in `wiki-recipe.ts`. This file re-exports `WikiRecipe` and holds the
 * ISOMORPHIC mount spec (`WikiMountSpec`) both vessel pools take, plus the
 * projection-snapshot shapes.
 *
 * Schema: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-dock
 */

import type { Heads } from "@automerge/automerge";
import type { WikiRecipe } from "./wiki-recipe.js";

export type { WikiRecipe } from "./wiki-recipe.js";

/**
 * WikiMountSpec — the ISOMORPHIC shape both vessel pools take to mount a wiki
 * island (node `VesselIslandPool` + browser `BrowserVesselIslandPool`).
 *
 * One signature, both platforms: divergence rides in the DATA (the recipe's
 * `mirrorBags` designation, the resolver's slots) and in the island's held
 * CAPABILITIES (a node pool's `diskMirrorGrant`), never in the method's shape.
 * The caller builds the full `resolver` on both platforms. No blob bytes — the
 * island reads TW5 core + plugin tiddlers from the @lararium CRDT doc after sync.
 */
export interface WikiMountSpec {
  /** SHA-256 hex of TW5 core blob. null = pre-CAS. Island resolves bytes from the mesh. */
  coreHash: string | null;
  /** WikiRecipe slot structure (wikiSlug + optional canonBags + mirrorBags). */
  recipe: WikiRecipe;
  /** Full slot URI → AutomergeUrl map (caller-built). Null = in-memory or cold slot. */
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
