/**
 * @lararium/browser — browser vessel for the Lararium causal-islands system.
 *
 * Island Sovereignty Law (isomorphic): each island boots a Repo-in-island via transferred
 * syncPort; derives tiddler state from its own CRDT doc; owns timing via rAF drain.
 *
 * Primary exports:
 *   BrowserVesselIslandPool — island pool (mountWiki / unmountWiki / disposeAll).
 *   browser-wiki-worker — Web Worker entry (compiled separately; not re-exported here).
 */

export { BrowserVesselIslandPool } from "./browser-vessel-island-pool.js";
export type { BrowserVesselIslandPoolOptions } from "./browser-vessel-island-pool.js";

export { openBrowserVessel } from "./open-browser-vessel.js";
export type { BrowserVesselOptions, BrowserVesselResult } from "./open-browser-vessel.js";

export {
  generateOrLoadBrowserVesselIdentity, loadBrowserSigningSeed,
  openVesselIdb, idbGet, idbPut,
} from "./browser-vessel-identity.js";
export type { BrowserVesselIdentity } from "./browser-vessel-identity.js";

export {
  loadGenesisIslandFromBytes, findGenesisIsland,
  reconcileGenesisUpdate,
  writeGenesisBytesToOpfs, readGenesisBytesFromOpfs,
  genesisCidFromBytes,
} from "./browser-genesis.js";

export { openBrowserAdminVm, VerbTable } from "./open-browser-admin-vm.js";
export type {
  BrowserAdminVmOptions,
  BrowserVerbTable, VerbReactor, BrowserVerbPlacementRequest,
} from "./open-browser-admin-vm.js";
