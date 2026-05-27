/**
 * @lararium/browser — browser vessel for the Lararium causal-islands system.
 *
 * Island Sovereignty Law (isomorphic): each island boots a Repo-in-island via transferred
 * syncPort; derives tiddler state from its own CRDT doc; owns timing via rAF drain.
 *
 * Primary exports:
 *   BrowserVesselIslandPool — BrowserAuthorityPool implementation (island routing + lifecycle).
 *   browser-wiki-worker — Web Worker entry (compiled separately; not re-exported here).
 */

export { BrowserVesselIslandPool } from "./browser-vessel-island-pool.js";
export type { BrowserVesselIslandPoolOptions } from "./browser-vessel-island-pool.js";
