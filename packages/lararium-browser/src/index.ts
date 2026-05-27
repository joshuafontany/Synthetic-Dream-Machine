/**
 * @lararium/browser — browser vessel for the Lararium causal-islands system.
 *
 * Worker Sovereignty Law (isomorphic): Worker boots a Repo-in-Worker via transferred
 * syncPort; derives tiddler state from its own CRDT doc; owns timing via rAF drain.
 *
 * Primary exports:
 *   BrowserVesselIslandPool — BrowserAuthorityPool implementation (island routing + lifecycle).
 *   browser-wiki-worker — Worker entry (compiled separately; not re-exported here).
 */

export { BrowserVesselIslandPool } from "./browser-vessel-island-pool.js";
export type { BrowserVesselIslandPoolOptions } from "./browser-vessel-island-pool.js";
