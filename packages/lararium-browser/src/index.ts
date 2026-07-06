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
export { composeBrowser } from "./browser-caps.js";
export type { BrowserVesselOptions, BrowserVesselResult } from "./open-browser-vessel.js";

export { mountCoherenceIndicator } from "./wiki-coherence-sink.js";
export type { CoherenceIndicatorSink, CoherenceFrameWithRev } from "./wiki-coherence-sink.js";

export {
  generateOrLoadBrowserVesselIdentity, loadBrowserSigningSeed,
  openVesselIdb, idbGet, idbPut,
} from "./browser-vessel-identity.js";
export type { BrowserVesselIdentity } from "./browser-vessel-identity.js";

export {
  writeBlobsToCasOpfs, readCasBlobFromOpfs,
  fetchGenesisCasToOpfs,
  genesisCidFromBytes,
} from "./browser-genesis.js";

export { openBrowserDaemonVm, VerbTable } from "./open-browser-daemon-vm.js";
export type {
  BrowserDaemonVmOptions,
  BrowserVerbTable, VerbReactor, BrowserVerbPlacementRequest,
} from "./open-browser-daemon-vm.js";
