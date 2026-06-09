/**
 * wiki-handler-options — the shared option contract for the whole-wiki verb reactors.
 *
 * Reactor implementations live one per sub-file (wiki-mint/residency/compose/draft-handlers);
 * the tw5 index exports them directly. This file holds ONLY the option interfaces they share —
 * the re-export hub it grew from collapsed (YIN).
 */

import type { Repo, CompositeStore } from "@lararium/mesh";
import type { CatalogAccessor } from "./catalog-accessor.js";
import type { ResidencyOpPost } from "./worker-data-verbs.js";

export interface WikiHandlerOptions {
  readonly composite: CompositeStore;
  /** Catalog accessor — wiki oracles live in @catalog (access≠load). */
  readonly catalog:   CatalogAccessor;
  /** Worker→main poster — open-wiki alerts the wiki being switched away from. */
  readonly post:      ResidencyOpPost;
}

/** Options for handlers that need raw repo access to mint new docs.
 *  `catalog` is the one catalog-driven accessor (access≠load): the registry
 *  doc itself via `catalog.handle()`, any registered bag via `catalog.find()`
 *  — collapses the old per-verb `catalogHandle` + `islandHandle` plumbing. */
export interface WikiMintHandlerOptions {
  readonly composite:   CompositeStore;
  readonly repo:        Repo;
  readonly catalog:     CatalogAccessor;
  readonly operatorDid: () => Promise<string> | string;
  readonly rootDir:     string;
}

/** Options for recipe-composition operations (add-bag / remove-bag). Pono web3:
 *  the user recipe lives in @catalog (registry) — read+written via the accessor
 *  (access≠load); residency commanded via admin:residency-op. The admin never
 *  mounts/unmounts a live wiki's composite layer; the recipe change syncs and each
 *  island reconciles its own mount set. */
export interface WikiComposeOptions {
  readonly catalog: CatalogAccessor;
  readonly post:    ResidencyOpPost;
}

export interface DraftHandlerOptions {
  readonly composite: CompositeStore;
}
