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
 *  — one accessor for every verb, no separate catalogHandle / islandHandle. */
export interface WikiMintHandlerOptions {
  readonly repo:        Repo;
  readonly catalog:     CatalogAccessor;
  /** The VESSEL's DID (`0x`+verifying key) — the PLACE that asks. Distinct from the persona
   *  root (the human), which signs delegation edges and never rides a verb request. */
  readonly vesselDid: () => Promise<string> | string;
  readonly rootDir:     string;
  /**
   * Register a freshly-minted wiki bag's Keyhive Document + delegate admin —
   * called for each new canon/draft bag in the same act as the mint, so a new
   * wiki's bags are born WITH their cap (no cap-denied window). Opaque: the
   * keyhive-holding daemon supplies it; tw5 stays keyhive-free. The arg is the
   * lar: BAG URL (the cap-gate's verify key), never the automerge doc url.
   */
  readonly registerBag?: (bagUrl: string) => Promise<void>;
}

/** prune-stale additionally reads the operator's draft oracle off the daemon
 *  composite; init-wiki shares the mint options without needing it. */
export interface PruneStaleOptions extends WikiMintHandlerOptions {
  readonly composite: CompositeStore;
}

/** Options for recipe-composition operations (add-bag / remove-bag). Pono web3:
 *  the user recipe lives in @catalog (registry) — read+written via the accessor
 *  (access≠load); residency commanded via daemon:residency-op. The daemon never
 *  mounts/unmounts a live wiki's composite layer; the recipe change syncs and each
 *  island reconciles its own mount set. */
export interface WikiComposeOptions {
  readonly catalog: CatalogAccessor;
  readonly post:    ResidencyOpPost;
}

export interface DraftHandlerOptions {
  readonly composite: CompositeStore;
}
