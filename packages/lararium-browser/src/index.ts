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

export { openBrowserVessel, DAEMON_SURFACE_ID } from "./open-browser-vessel.js";
export { composeBrowser } from "./browser-caps.js";
export type { BrowserVesselOptions, BrowserVesselResult } from "./open-browser-vessel.js";

export { mountCoherenceIndicator } from "./wiki-coherence-sink.js";
export type { CoherenceIndicatorSink, CoherenceFrameWithRev } from "./wiki-coherence-sink.js";

export {
  generateOrLoadBrowserVesselIdentity, loadBrowserSigningSeed,
  openVesselIdb, idbGet, idbPut, idbDelete, idbKeys,
} from "./browser-vessel-identity.js";
export type { BrowserVesselIdentity } from "./browser-vessel-identity.js";
// The two-layer pet-names (#64 stage 4): the PRIVATE own-persona label map (never federates) + the PUBLIC
// own-published-face record. Browser twins of the node fs stores; distinct from the handle-book.
export {
  makeBrowserPersonaPetnameStore, makeBrowserPublicHandleStore,
} from "./browser-vessel-identity.js";

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
export { parseAdmitCarriage, toAdmitCarriage, ADMIT_KIND } from "./admit-carriage.js";
