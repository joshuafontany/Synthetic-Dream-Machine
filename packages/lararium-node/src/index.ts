export type { CorpusSource } from "./node-host.js";
export { LARES_ROOT, LARES_MEMES_ROOT, REPO_ROOT } from "./node-host.js";

export { LarDiskProjector } from "./disk-projector.js";
export { AdminAuthGate } from "./admin-auth-gate.js";
export { openNodeVessel } from "./open-node-vessel.js";
export { openAdminVm } from "./open-admin-vm.js";
export type { AdminVmOptions, AdminVmResult } from "./open-admin-vm.js";
export type { NodeVesselOptions, NodeVesselResult, NodeOpenPhase } from "./open-node-vessel.js";

export { loadGenesisIsland, reconcileIslandFromGenesis, readGenesisSha256, GENESIS_CID } from "./genesis-artifact.js";
export { createSessionEventLog, seedAdminDoc } from "@lararium/mesh";
export { SOCIAL_BOOTSTRAP_PLUGIN_TITLE } from "./open-node-vessel.js";
export { LarEventBusImpl, DEFAULT_RINGS } from "./lar-event-bus-impl.js";

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

export {
  makeListWikisReactor, makeInitWikiReactor,
  makeOpenWikiReactor,
  makePinWikiReactor, makeUnpinWikiReactor,
  makeAddBagReactor, makeRemoveBagReactor,
  makePruneStaleReactor, makeDraftReactor,
} from "./wiki-handlers.js";
export type {
  WikiHandlerOptions, WikiMintHandlerOptions, WikiResidencyOptions,
  WikiComposeOptions, DraftHandlerOptions,
} from "./wiki-handlers.js";

export { makeEpochBagReactor, makeRotateRecipeReactor } from "./epoch-handlers.js";
export type { EpochHandlerOptions, RotateRecipeOptions } from "./epoch-handlers.js";

export { makeResidencyStatsReactor } from "./residency-handlers.js";
export type { ResidencyHandlerOptions } from "./residency-handlers.js";
// pin/unpin/register-cold reactors relocated to the admin worker (sovereign-worker).
export { makePinReactor, makeUnpinReactor, makeRegisterColdReactor } from "@lararium/tw5";

export { VesselIslandPool } from "./vessel-island-pool.js";
export type { VesselIslandPoolOptions } from "./vessel-island-pool.js";
