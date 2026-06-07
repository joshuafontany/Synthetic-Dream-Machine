/**
 * wiki-handlers — verb-tiddler handlers for whole-wiki operations.
 *
 * Vessel-edge handlers: bag minting, repo/doc plumbing, residency.
 * Wiki-semantic rites (sync-wiki, residency ACTION verbs) live in the VM islands.
 */

import type { Repo, DocHandle } from "@automerge/automerge-repo";
import type { CompositeStore, LarDoc, BagResidencyManager } from "@lararium/mesh";
import { makeDraftReactor, makePruneStaleReactor } from "./wiki-draft-handlers.js";
import { makeInitWikiReactor, makeListWikisReactor, makeOpenWikiReactor } from "./wiki-mint-handlers.js";

export interface WikiHandlerOptions {
  readonly composite: CompositeStore;
}

/** Options for handlers that need raw repo access to mint new docs. */
export interface WikiMintHandlerOptions {
  readonly composite:     CompositeStore;
  readonly repo:          Repo;
  readonly catalogHandle: DocHandle<LarDoc>;
  readonly islandHandle:  DocHandle<LarDoc>;
  readonly operatorDid:   () => Promise<string> | string;
  readonly rootDir:       string;
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

export { makeListWikisReactor, makeInitWikiReactor, makeOpenWikiReactor } from "./wiki-mint-handlers.js";
export { makeDraftReactor, makePruneStaleReactor } from "./wiki-draft-handlers.js";
export { makePinWikiReactor, makeUnpinWikiReactor } from "./wiki-residency-handlers.js";
export { makeAddBagReactor, makeRemoveBagReactor } from "./wiki-compose-handlers.js";
