/**
 * browser-authority.ts — browser island boundary types.
 *
 * Only data shapes that cross the island boundary live here.
 * No pool contracts. No lease/receipt/capability layer. No phase enums.
 * The pool implementation in @lararium/browser manages its own internal state.
 *
 * Schema: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-authority
 */

import type { Heads } from "@automerge/automerge";
import type { BagBinding } from "./island-protocol.js";

/**
 * BrowserWikiMountParams — what the pool needs to mount a wiki island.
 *
 * Passed to BrowserVesselIslandPool.mountWiki(). No blob bytes — the island
 * reads TW5 core bytes and plugin tiddlers from the @lararium CRDT doc after Repo sync.
 */
export interface BrowserWikiMountParams {
  /** SHA-256 hex of TW5 core blob. null = pre-CAS. Island resolves bytes from the mesh. */
  coreHash: string | null;
  /** Ordered bag bindings for this wiki's content scope. */
  bagBindings: readonly BagBinding[];
}

/**
 * BrowserProjectionSnapshot — minimal render inputs crossing the island boundary.
 *
 * Structured-clone friendly. No live DOM nodes, no callbacks, no proxies.
 * Shape expands in S4 once push-projection channel measurements land.
 */
export interface BrowserProjectionSnapshot {
  islandId: string;
  payload:  Record<string, unknown>;
  heads:    Heads;
  producedAt: number;
}
