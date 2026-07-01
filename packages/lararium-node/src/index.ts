export type { CorpusSource } from "./node-host.js";
export { LARES_ROOT, LARES_MEMES_ROOT, REPO_ROOT } from "./node-host.js";
export {
  larHome, larDataDir, larIdentityDir, larProjectionDir,
  larHarvestDir, larHarvestStageDir, larRuntimeDir, larAstPalaceDir, larFormPalaceDir,
  larMempalaceDir, larMeshPalaceDir, larCorpusDir, corpusInstanceDir,
  // XDG base homes + the memory sensorium dir + config path (the consolidated layout).
  larDataHome, larStateHome, larCacheHome, larConfigHome, larRuntimeHome, larConfigPath,
  memorySensoriumDir,
} from "./vessel-paths.js";
export { atomicWriteFileSync } from "./fs-atomic.js";

// The SHEAF-TRUE sensorium primitive — a dir that `#has` fiber-caps (content/structure/form) with
// bands + coupling as base-caps living IN the manifest. The filetree IS the composition.
export {
  SENSORIUM_SCHEMA, SENSORIUM_MANIFEST, manifestPath, capDecl, resolveCapDir, capDir,
  buildSensoriumManifest, readManifest, writeManifest,
} from "./sensorium.js";
export type {
  CapDecl, SensoriumChild, SensoriumCoupling, SensoriumBands, SensoriumManifest, BuildSensoriumOptions,
} from "./sensorium.js";

// The shared palace-organ registry — setup (`wake --init`) + teardown read the SAME list.
export { palaceOrgans, setupPalaceOrgans, organHealthy } from "./palace-organs.js";
export type { PalaceOrgan, PalaceSetupStep } from "./palace-organs.js";

// The ephemeral astral multipalace lifecycle (the `corpus` noun-verb tree).
export {
  newCorpusId, listCorpora, openCorpus, queryCorpus, keepCorpus,
  dissolveCorpus, dissolveAll, listOrphans, reapOrphans, runCorpus,
  corpusTeardownDirs, defaultCorpusIngest, defaultCorpusSearch,
} from "./corpus-palace.js";
export type {
  CorpusManifest, CorpusIngest, CorpusSearch, OpenCorpusOptions, OpenCorpusResult,
  QueryCorpusResult, KeepResult, DissolveResult, RunCorpusOptions, RunCorpusResult,
} from "./corpus-palace.js";

// The stream compose_palace seam — generalize the corpus lifecycle to ANY StreamAdapter's frames.
export { composeStreamPalace, defaultStreamPlaneSink } from "./stream-palace.js";
export type { ComposeStreamOptions } from "./stream-palace.js";

export { LarDiskProjector } from "./disk-projector.js";
export { DaemonAuthGate } from "./daemon-auth-gate.js";
export { openNodeVessel } from "./open-node-vessel.js";
export { openDaemonVm } from "./open-daemon-vm.js";
export type { DaemonVmOptions } from "./open-daemon-vm.js";
export type { NodeVesselOptions, NodeVesselResult, NodeOpenPhase } from "./open-node-vessel.js";

export { createSessionEventLog, seedDaemonDoc } from "@lararium/mesh";
export { SOCIAL_BOOTSTRAP_PLUGIN_TITLE } from "./open-node-vessel.js";
export { SyncedTree, contentHash, syncedTreeKey } from "./synced-tree.js";
export { bagsFileToUri, wikisFileToUri } from "./bag-paths.js";

export { runInit } from "./commands/init.js";
export type { InitOptions, InitResult } from "./commands/init.js";

export { runDeviceAdmit } from "./commands/device-admit.js";
export type { DeviceAdmitOptions, DeviceAdmitPayload } from "./commands/device-admit.js";

export { loadVesselVerifyingKey, loadVesselSigningSeed, loadVesselCard, persistVesselCard } from "./node-vessel-identity.js";
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
// run in the daemon worker (sovereign-worker, verify-then-delegate). Re-export from there.
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
export { makeSubprocessFlush } from "./capture-flush.js";
export type { SubprocessFlushOptions } from "./capture-flush.js";
export { makeCaptureReserve } from "./capture-reserve.js";
export type { CaptureReserveOptions } from "./capture-reserve.js";
// makeCaptureEngine + CaptureReserve/CaptureFlush/CaptureAnnotate contracts live in
// @lararium/mesh (the isomorphic core); the annotate runs IN-VM ($tw.lares.captureAnnotateVm,
// injected by node-daemon-island) so the package index never pulls the mempalace barrel.
export { makeNodeCaptureEngine, makeAstSplitFlush, makeFormSplitFlush } from "./node-capture-engine.js";
export type { NodeCaptureEngineOptions } from "./node-capture-engine.js";
// The shared palace-instance transport cap (the #has-stack foundation both local stores compose).
export { PalaceHolder, PalaceHolderRegistry, canonicalDirOf } from "./palace-holder.js";
export type { PalaceHolderProc, PalaceHolderSpawn, PalaceFeedCap } from "./palace-holder.js";
export { makeAstPalace } from "./astpalace.js";
export type { AstPalace, AstEntry, AstProvenance, HolderSpawn } from "./astpalace.js";
export { startMembershipRelay, WSMembershipChannel } from "./ws-membership-channel.js";
export type { MembershipRelay } from "./ws-membership-channel.js";
export { FileMembershipChannel } from "./file-membership-channel.js";
export { makeFormPalace } from "./formpalace.js";
export type {
  FormPalace, FormPalaceOptions, FormHolderSpawn, FormMetadata, FormStoreResult,
  FormMatch, FormEntry, SerializedBasis,
} from "./formpalace.js";
// P4 — the RRF multi-graph query: fuse the CONTENT (verbatim mempalace), FORM (.formpalace), and
// later graphs on verbatim_sha by N-ary reciprocal rank fusion (living-grammar-palace#dual-graph).
export {
  fuseMultiGraph, multiGraphRecall, buildFormWhere, combineWhere, makeFormSearch, DEFAULT_RRF_K,
  resolveApertureGrain, apertureWeight, weightByAperture, PARAGRAPH_APERTURE,
  contentKeyOf, contentLeg, formLeg, verbatimShaOf,
} from "./multi-graph-recall.js";
export type {
  MultiGraphHit, MultiGraphOptions, MultiGraphRecallDeps, MultiGraphRecallArgs, MultiGraphRecallResult,
  GraphLeg, GraphItem, ExtraGraph, ApertureWeightOptions, ShaOrGap,
  FormSearchPalace, FormSearchConfig,
} from "./multi-graph-recall.js";
// The telemetry capture cap is FOLDED into @daemon (idempotent: every @daemon carries it). The
// standalone telemetry island is retired; node-daemon-island wires the capture SINK live (from the
// daemon spawn's optional workerData.telemetry) or leaves the cap inert. The capture core stays
// composable + isomorphic: @lararium/mesh capture-engine + the tw5 `hasCapture` cap; node seams via
// makeNodeCaptureEngine.
