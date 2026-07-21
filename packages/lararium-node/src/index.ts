export type { CorpusSource } from "./node-host.js";
export { LARES_ROOT, REPO_ROOT, bagsRoot, laresMemesRoot } from "./node-host.js";
export {
  larHome, larDataDir, larIdentityDir, larProjectionDir,
  larHarvestDir, larHarvestStageDir, larRuntimeDir, larStructurePalaceDir, larFormPalaceDir,
  larMempalaceDir, larContentDir, larMeshPalaceDir, larCorpusDir, corpusInstanceDir,
  // XDG base homes + the memory sensorium dir + config path (the consolidated layout).
  larDataHome, larStateHome, larCacheHome, larConfigHome, larRuntimeHome, larConfigPath,
  memorySensoriumDir, memorySensoriumLenses, sensoriumLenses, sensoriumNames, sensoriumDir,
  // The `mesh` sensorium dir + its WHO/AUTHORITY/FLOW child dirs (the consolidated federation tree).
  meshSensoriumDir, meshWhoDir, meshAuthorityDir, meshFlowDir,
} from "./vessel-paths.js";
export { atomicWriteFileSync } from "./fs-atomic.js";

// The per-@daemon resource-override reader + the composable daemon resource caps (`~/.lares/config.json`
// sites bags/genesis/cas away from the repo-relative default; genesis artifacts stay checked-in by default).
export {
  loadLaresConfig, laresConfigPath, daemonCorpusRoot, daemonGenesisDir, daemonBagsDir, daemonCasDir,
  runtimeCasOverride,
} from "./lares-config.js";
export type { LaresConfig, LaresResourceRoots, LaresVesselState } from "./lares-config.js";

// The SHEAF-TRUE sensorium primitive — a dir that `#has` fiber-caps (content/structure/form) with
// bands + coupling as base-caps living IN the manifest. The filetree IS the composition.
export {
  SENSORIUM_SCHEMA, SENSORIUM_MANIFEST, manifestPath, capDecl, resolveCapDir, capDir, planeVariance, sensoriumContract,
  SHEAF_PLANES, COSHEAF_PLANES,
  buildSensoriumManifest, readManifest, writeManifest,
} from "./sensorium.js";
export type {
  CapDecl, SensoriumChild, SensoriumCoupling, SensoriumBands, SensoriumManifest, SensoriumOrder, BuildSensoriumOptions,
  Variance,
} from "./sensorium.js";

// The LI (sheaf) CONSISTENCY-RADIUS — the Robinson li-disagreement signal over content/structure/form
// (0 ⟺ they glue; positive ⟺ a localizable obstruction), PAIRED with the KI (cosheaf) co-consistency —
// the PUSHFORWARD mirror over bands/coupling (0 ⟺ the flows co-extend; positive ⟺ a localizable
// co-obstruction), the sheaf/cosheaf dual pair now complete.
// The consistency-radius organ (H⁰ li/ki dual), the cohomological gate (H¹ fusion), and the EFE organ
// now live PLATFORM-BLIND in `@lararium/mesh` (the pono-homes lift: one hull, every tier — node, tw5,
// browser — reaches the same organs; py mirrors them by contract). Import them from `@lararium/mesh`.

// The memetic-wikitext SENSORIUM — the concrete neither-top, co-located-peers instance: the reader
// (island-scan → standoff strata + skeletal tier + typed association graph, TWO axes span×channel), the
// fractal FFZ-aligned coupler (stratum red↔black ≅ corpus formal↔informal through the mesh keel's
// windowed-coupling runtime + linearity screen), and the `#has {formal, informal}` compose (coupling.
// children, neither top). LI (理 pattern) ⊥ KI (氣 flow).
export {
  bandForSpanLength, SPAN_BAND_MAX, sourceCidOf, sigilHead, stratify,
  SIGIL_INJECTION, sigilInjectionQuery,
  PULSE_GRAIN, coupleAligned, stratumTicks, readKiStratum, ffzAlignTicks, readKiCorpus,
  readLi, readKi, defaultSensoriumBands, buildMemeticWikitextSensorium, buildPeerSensorium,
  stratificationRestrictions,
} from "./memetic-wikitext-sensorium.js";
export type {
  ChannelTag, MuOp, Span, Stratum, SkeletalAnchor, AssociationEdge, SpreadDirection, Stratification,
  SigilInjection, ComposeMemeticWikitextOptions,
  AlignedTick, CoupleAlignedOptions, AlignedCouplingRead, FfzCell,
} from "./memetic-wikitext-sensorium.js";

// The shared palace-organ registry — setup (`wake --init`) + teardown read the SAME list. SOVEREIGN
// ONLY; the guest `~/.mempalace` rides its own lane (`guestMempalaceOrgan` / `initGuestMempalace`),
// reached from `lares mempalace …`, never from the boot — the vessel must not write its comparator.
export {
  palaceOrgans, setupPalaceOrgans, organHealthy,
  guestMempalaceOrgan, initGuestMempalace,
  materializeMemorySensorium, materializeMeshSensorium, materializeMemeticWikitextSensorium,
} from "./palace-organs.js";
export type { PalaceOrgan, PalaceSetupStep } from "./palace-organs.js";

// The memetic-wikitext sensorium dir + its formal/informal peer dirs (the co-located-peers tree).
export {
  memeticWikitextSensoriumDir, memeticWikitextFormalDir, memeticWikitextInformalDir, resolveMempalaceExe,
} from "./vessel-paths.js";

// The COUPLING READER — makes `coupling.children` load-bearing: resolves the child edges → each child's
// section over a shared stalk → the H¹-GATED fusion (fuse or hold-open, never a silent average).
export {
  readCoupling, readMemeticWikitextCoupling, defaultChildRestriction, SALIENCES_SIDECAR,
} from "./sensorium-coupling.js";
export type {
  ChildRestriction, CouplingChildRead, CouplingRead, ReadCouplingOptions,
} from "./sensorium-coupling.js";

// The li-radius (H⁰ gluing) READER — the sheaf twin: glue a sensorium's OWN sheaf planes over a shared
// cid stalk through the Robinson radius AND the H¹ gate. Cover-agnostic (the boundary, not the codomain):
// the default single-stream cover reads as a nested-cover PLUMBING witness, a live-boundary reader certifies.
export { readCohere, readCohereAcrossContexts, coveragePlaneReader } from "./sensorium-cohere.js";
export type { PlaneReader, CohereRead, ReadCohereOptions, CohereContext } from "./sensorium-cohere.js";

// The ephemeral astral multipalace lifecycle (the `corpus` noun-verb tree).
export {
  newCorpusId, listCorpora, openCorpus, queryCorpus, keepCorpus,
  dissolveCorpus, dissolveAll, listOrphans, reapOrphans, runCorpus,
  corpusTeardownDirs, defaultCorpusIngest, defaultCorpusSearch,
} from "./sense-corpus.js";
export type {
  CorpusLifecycle, CorpusIngest, CorpusSearch, OpenCorpusOptions, OpenCorpusResult,
  QueryCorpusResult, KeepResult, DissolveResult, RunCorpusOptions, RunCorpusResult,
} from "./sense-corpus.js";

// The stream compose_palace seam — generalize the corpus lifecycle to ANY StreamAdapter's frames.
export { composeStreamSensorium, defaultStreamPlaneSink } from "./sense-stream.js";
export type { ComposeStreamOptions } from "./sense-stream.js";

export { LarDiskProjector } from "./disk-projector.js";
export { DaemonAuthGate } from "./daemon-auth-gate.js";
export { openNodeVessel } from "./open-node-vessel.js";
export { openDaemonVm } from "./open-daemon-vm.js";
export { runDoctor, formatDoctorReport, enumerateStoreDocs } from "./doctor.js";
export { probeDocLoad, makeChildProcessDocLoadProbe, quarantineDoc } from "./doc-load-probe.js";
export { precheckDocStore, docStorePath } from "./store-integrity.js";
export { persistIdentityAnchors, loadIdentityAnchors, listAnchoredPersonas, persistIdentityArchive, loadIdentityArchive, archivePath, type IdentityAnchors } from "./identity-anchors.js";

// The passphrase-LIFECYCLE surface over the at-rest seal (#60) — status/seal/rotate/export/repair + the
// boot-gate + the daemon vault handler. No new crypto; composes archive-seal's atoms under a ratify
// discipline (two carriers, independent write lifecycles, never one shared envelope).
export {
  archiveSealStatus, sealArchiveWithPassphrase, rotateArchivePassphrase, exportSealedArchive,
  repairSplitKek, assertSealReady, runVaultVerb, weakPassphraseWarning, PASSPHRASE_MIN_LENGTH,
} from "./archive-passphrase.js";
export type {
  ArchiveSealStatus, CarrierStatus, CarrierState, CarrierName,
  SealResult, RotateResult, ExportResult, RepairResult,
} from "./archive-passphrase.js";
export { sealExpected, setSealExpected } from "./lares-config.js";
export { ARCHIVE_PASSPHRASE_ENV } from "./archive-seal.js";
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

// The Kapae antigen RAISE side (#65) — the founding kahu writes a quorum-signed ban/lift onto the board.
export { runNexusKapae, runNexusKapaeList, NexusKapaeError } from "./commands/nexus-kapae.js";
export type { NexusKapaeOptions, NexusKapaeResult, NexusKapaeListResult } from "./commands/nexus-kapae.js";

export { loadVesselVerifyingKey, loadVesselSigningSeed, loadVesselCard, persistVesselCard } from "./node-vessel-identity.js";
// The active-persona selector — "put on a mask" at the identity layer (Plurality Pono). The persona-root
// SET mints/loads the operator-root the `lares persona` door drives (founder-side custody).
export { loadActivePersonaIndex, wearPersona, personaRootExists, listPersonaRoots } from "./node-vessel-identity.js";
export { generateOrLoadPersonaGroupRoot, loadPersonaGroupRootSeed } from "./node-vessel-identity.js";
export type { PersonaGroupRoot } from "./node-vessel-identity.js";
// The two-layer pet-names (#64 stage 4): the PRIVATE own-persona label map (never federates) + the PUBLIC
// own-published-face record (persona → @crossroads glamour). Distinct stores, distinct from the handle-book.
export { makeNodePersonaPetnameStore, makeNodePublicHandleStore } from "./node-vessel-identity.js";
// The `bags/@nexus` charter DOC adapter — the antigen roster's authority home read/written on disk (#66).
export {
  readNexusCharterDoc, writeNexusCharterDoc, renderNexusCharterDoc,
  nexusCharterDocPath, nexusCharterDocRelPath, NEXUS_BAG,
} from "./nexus-charter-doc.js";
export { loadLeafIdentity } from "./leaf-identity.js";
export type { LeafIdentity } from "./leaf-identity.js";
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
// The consolidated sensorium file — the manifest primitive + the shared palace transport +
// the palace CLIENTS (content/form/persistence) + the unified cap-stack. The palace transport
// cap (the #has-stack foundation both local stores compose) lives here now.
export { PalaceHolder, PalaceHolderRegistry, canonicalDirOf } from "./sensorium.js";
export type { PalaceHolderProc, PalaceHolderSpawn, PalaceFeedCap } from "./sensorium.js";
export { makePersistencePalace } from "./sensorium.js";
export type { PersistencePalace, RecordProvenance, PersistencePalaceOptions } from "./sensorium.js";
export { makeContentPalace } from "./sensorium.js";
export type { ContentPalace, ContentEntry, ContentMatch, ScannedRecord, ScanPage, Taxonomy, ContentPalaceOptions } from "./sensorium.js";
export { importGuestPalace } from "./guest-import.js";
export type { GuestImportResult } from "./guest-import.js";
export { makeSearchCap } from "./search-cap.js";
export type { SearchCap, SearchHit, SearchResult, SearchCapOptions } from "./search-cap.js";
export { makeKgCap } from "./kg-cap.js";
export type { KgCap, TripleOpts, KgCapOptions } from "./kg-cap.js";
export { makeGraphCap } from "./graph-cap.js";
export type { GraphCap, GraphCapOptions } from "./graph-cap.js";
export { composePalaceCaps } from "./sensorium.js";
export type { PalaceCaps, PalaceCapsOptions } from "./sensorium.js";
export { makeLaresQuery, openMemorySensorium } from "./lares-query.js";
export type { LaresQuery, Lens } from "./lares-query.js";
export { makeEmbedCap } from "./embed-cap.js";
export type { EmbedCap, EmbedResult, EmbedCapOptions } from "./embed-cap.js";
export { makeSourceCapture } from "./capture-source.js";
export type { SourceCapture, SourceCaptureRequest, SourceCaptureResult, SourceCaptureSpawn } from "./capture-source.js";
export { startMembershipRelay, WSMembershipChannel } from "./ws-membership-channel.js";
export type { MembershipRelay } from "./ws-membership-channel.js";
export { FileMembershipChannel } from "./file-membership-channel.js";
export { makeFormPalace } from "./sensorium.js";
export type {
  FormPalace, FormPalaceOptions, FormHolderSpawn, FormMetadata, FormStoreResult,
  FormMatch, FormEntry, SerializedBasis,
} from "./sensorium.js";
// P4 — the RRF multi-graph query: fuse the CONTENT (verbatim mempalace), FORM (.formpalace), and
// later graphs on verbatim_sha by N-ary reciprocal rank fusion (living-grammar-palace#dual-graph).
export {
  fuseMultiGraph, multiGraphRecall, buildFormWhere, combineWhere, makeFormSearch, DEFAULT_RRF_K,
  resolveApertureGrain, apertureWeight, weightByAperture, PARAGRAPH_APERTURE,
  contentKeyOf, contentLeg, formLeg, verbatimShaOf,
} from "./sensorium-recall.js";
export type {
  MultiGraphHit, MultiGraphOptions, MultiGraphRecallDeps, MultiGraphRecallArgs, MultiGraphRecallResult,
  GraphLeg, GraphItem, ExtraGraph, ApertureWeightOptions, ShaOrGap,
  FormSearchPalace, FormSearchConfig,
} from "./sensorium-recall.js";
// The telemetry capture cap is FOLDED into @daemon (idempotent: every @daemon carries it). The
// standalone telemetry island is retired; node-daemon-island wires the capture SINK live (from the
// daemon spawn's optional workerData.telemetry) or leaves the cap inert. The capture core stays
// composable + isomorphic: @lararium/mesh capture-engine + the tw5 `hasCapture` cap; node seams via
// makeNodeCaptureEngine.
