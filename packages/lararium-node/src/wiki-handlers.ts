/**
 * wiki-handlers — job-tiddler handlers for whole-wiki operations.
 *
 * Reads composite for wiki oracle tiddlers under
 * `lar:///ha.ka.ba/@lararium/wikis/{slug}`. Each oracle tiddler's `text`
 * field carries the wiki's Automerge doc URL.
 *
 * This file is a temporary edge-bridge concentration. It should hold bag minting,
 * repo/doc plumbing, and other vessel-edge work. Wiki-semantic rites should keep
 * moving toward VM-native widgets or ReactionEngine triggers.
 *
 * E.4 ships the read-only handlers (list, which). E.5+ adds write handlers
 * (init, sync, pin, etc.) while that migration is still incomplete.
 */

import type { Repo, DocHandle } from "@automerge/automerge-repo";
import {
  type CompositeStore, type LarDoc, type BagResidencyManager,
  tiddlerText,
} from "@lararium/mesh";
import { TW5Engine } from "@lararium/tw5";
import { createDraftHandler, createPruneStaleHandler } from "./wiki-draft-handlers.js";
import { createInitWikiHandler, createListWikisHandler, createOpenWikiHandler } from "./wiki-mint-handlers.js";


export interface WikiHandlerOptions {
  readonly composite: CompositeStore;
}

/** Options for handlers that need raw repo access to mint new docs.
 *  operatorDid resolves lazily so the registry can register before the
 *  keyhive bridge has finished booting.
 *  getPrimaryEngine resolves lazily (thunk) so the handler closure can
 *  capture it before TW5 finishes booting; safe because handlers only
 *  execute at job-dispatch time, well after the vessel reaches live. */
export interface WikiMintHandlerOptions {
  readonly composite:        CompositeStore;
  readonly repo:             Repo;
  readonly catalogHandle:    DocHandle<LarDoc>;
  readonly islandHandle:     DocHandle<LarDoc>;
  readonly operatorDid:      () => Promise<string> | string;
  readonly rootDir:          string;
  /** Returns the already-booted primary TW5Engine. */
  readonly getPrimaryEngine: () => TW5Engine;
}

/** Options for whole-wiki residency operations (pin/unpin). */
export interface WikiResidencyOptions {
  readonly composite: CompositeStore;
  readonly residency: BagResidencyManager;
}

/** Options for recipe-composition operations (add-bag / remove-bag).
 *  Combines mint surface (repo + composite) with residency for pin-on-add. */
export interface WikiComposeOptions {
  readonly composite: CompositeStore;
  readonly repo:      Repo;
  readonly residency: BagResidencyManager;
}

export { createListWikisHandler, createInitWikiHandler, createOpenWikiHandler } from "./wiki-mint-handlers.js";
export { createDraftHandler, createPruneStaleHandler } from "./wiki-draft-handlers.js";
export { createPinWikiHandler, createUnpinWikiHandler } from "./wiki-residency-handlers.js";
export { createAddBagHandler, createRemoveBagHandler } from "./wiki-compose-handlers.js";

export interface DraftHandlerOptions {
  readonly composite: CompositeStore;
}

