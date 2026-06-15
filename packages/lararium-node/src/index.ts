export type { CorpusSource } from "./node-host.js";
export { LARES_ROOT, LARES_MEMES_ROOT, REPO_ROOT } from "./node-host.js";

export { LarDiskProjector } from "./disk-projector.js";
export { AdminAuthGate } from "./admin-auth-gate.js";
export { openNodeVessel } from "./open-node-vessel.js";
export { openAdminVm } from "./open-admin-vm.js";
export type { AdminVmOptions, AdminVmResult } from "./open-admin-vm.js";
export type { NodeVesselOptions, NodeVesselResult, NodeOpenPhase } from "./open-node-vessel.js";

export { createSessionEventLog, seedAdminDoc } from "@lararium/mesh";
export { SOCIAL_BOOTSTRAP_PLUGIN_TITLE } from "./open-node-vessel.js";
export { SyncedTree, contentHash, syncedTreeKey } from "./synced-tree.js";
export { bagsFileToUri } from "./bag-paths.js";

export { runInit } from "./commands/init.js";
export type { InitOptions, InitResult } from "./commands/init.js";

export { runDeviceAdmit } from "./commands/device-admit.js";
export type { DeviceAdmitOptions, DeviceAdmitPayload } from "./commands/device-admit.js";

export { loadOperatorVerifyingKey, loadOperatorSigningSeed, loadOperatorCard, persistOperatorCard } from "./operator-key.js";
export { loadLeafIdentity } from "./leaf-identity.js";
export type { LeafIdentity } from "./leaf-identity.js";
export { LarWSClientAdapter } from "./lar-ws-client-adapter.js";
export type { LarWSClientOptions } from "./lar-ws-client-adapter.js";

export { VerbDispatcher, VerbTable } from "@lararium/tw5";
export type { VerbReactor, VerbContext, VerbDispatcherOptions } from "@lararium/tw5";
export { heedSummons } from "@lararium/tw5";
export type { SummonsRelayOptions, SummonsRequest } from "@lararium/tw5";
export { runLocalVerb, makeCapVerify } from "@lararium/tw5";

// where + resolve reactors RELOCATED to @lararium/tw5 (worker-data-verbs) — they now
// run in the admin worker (sovereign-worker, verify-then-delegate). Re-export from there.
export { makeWhereReactor, makeResolveReactor } from "@lararium/tw5";

// Verb-plane reactors relocated to their pono home @lararium/tw5 (composite/repo-only,
// not node-specific; both vessels hold them). Re-exported here for surface stability.
export {
  makeListWikisReactor, makeInitWikiReactor, makeOpenWikiReactor,
  makeWikiPinReactor, makeWikiUnpinReactor,
  makeAddBagReactor, makeRemoveBagReactor,
  makePruneStaleReactor, makeDraftReactor,
  makeEpochBagReactor, makeRotateRecipeReactor,
  makeResidencyStatsReactor,
  makePinReactor, makeUnpinReactor, makeRegisterColdReactor,
} from "@lararium/tw5";
export type {
  WikiHandlerOptions, WikiMintHandlerOptions,
  WikiComposeOptions, DraftHandlerOptions,
  EpochHandlerOptions, RotateRecipeOptions, ResidencyHandlerOptions,
} from "@lararium/tw5";

export { VesselIslandPool } from "./vessel-island-pool.js";
export type { VesselIslandPoolOptions } from "./vessel-island-pool.js";
