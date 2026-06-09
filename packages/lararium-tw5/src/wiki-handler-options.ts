/**
 * wiki-handler-options — the shared option contract for the whole-wiki verb reactors.
 *
 * Reactor implementations live one per sub-file (wiki-mint/residency/compose/draft-handlers);
 * the tw5 index exports them directly. This file holds ONLY the option interfaces they share —
 * the re-export hub it grew from collapsed (YIN).
 */

import type { Repo, CompositeStore, BagResidencyManager } from "@lararium/mesh";
import type { CatalogAccessor } from "./catalog-accessor.js";

export interface WikiHandlerOptions {
  readonly composite: CompositeStore;
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

/** Options for whole-wiki residency operations (pin/unpin). */
export interface WikiResidencyOptions {
  readonly composite: CompositeStore;
  readonly residency: BagResidencyManager;
}

/** Options for recipe-composition operations (add-bag / remove-bag). */
export interface WikiComposeOptions {
  readonly composite: CompositeStore;
  readonly repo:      Repo;
  readonly residency: BagResidencyManager;
}

export interface DraftHandlerOptions {
  readonly composite: CompositeStore;
}
