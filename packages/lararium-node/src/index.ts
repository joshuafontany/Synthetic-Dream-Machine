export type { CorpusSource } from "./node-host.js";
export { LARES_ROOT, REPO_ROOT, bagsRoot, laresMemesRoot } from "./node-host.js";
export {
  larHome, larDataDir, larIdentityDir, larProjectionDir, larSealHome, larBootstrapPath,
  larHarvestDir, larHarvestStageDir, larRuntimeDir, larStructurePalaceDir, larFormPalaceDir,
  larMempalaceDir, larContentDir, larMeshPalaceDir, scratchSensoriumDir, scratchSensoriumInstanceDir,
  // XDG base homes + the memory sensorium dir + config path (the consolidated layout).
  larDataHome, larariumDataHome, larStateHome, larCacheHome, larConfigHome, larRuntimeHome, larConfigPath,
  memorySensoriumDir, memorySensoriumLenses, sensoriumLenses, sensoriumNames, sensoriumDir,
  // The `mesh` sensorium dir + its WHO/AUTHORITY/FLOW child dirs (the consolidated federation tree).
  meshSensoriumDir, meshWhoDir, meshAuthorityDir, meshFlowDir,
} from "./vessel-paths.js";
export { atomicWriteFileSync } from "./fs-atomic.js";

// The Erisian date: `ddate(1)` where it stands (it carries holydays, exclamations, X-Day and the whole
// %{…%} shape), the computed calendar where it does not — and the STAMP always computed, because ddate's
// own output shape varies by invocation and a key-derivation cannot ride a moving string.
export { readDdate, ddateAvailable, discordianReading } from "./discordian-reader.js";
export type { DiscordianReading, DiscordianSource } from "./discordian-reader.js";

// A bag's OWN declaration on disk (what it carries · who may read it · where it belongs), the operator's
// REPO REGISTRY (ids, never paths), and the MOVE that relocates bytes and re-anchors the declaration together.
export {
  repoRegistryPath, readRepoRegistry, registerRepo, unregisterRepo,
  bagHomeRoots, iamTableFromBody, readBagManifest, writeBagManifest, surveyBags, moveBagHome,
} from "./bag-declare.js";
export type { BagSighting, BagMoveOutcome } from "./bag-declare.js";

// The ACQUIRED tier — bodies a human did not author, sited readable + verifiable in the SHRINE
// (`<abide>/library`), a house no wipe names, so a shelf may grow without a repository growing with it.
export {
  larLibraryHome, libraryCollectionDir, resolveLibraryRef, acquireIntoLibrary,
  readLibraryMeta, listCollections, listCollection, verifyCollection, writeLibraryIndex,
} from "./library-store.js";
export type { AcquireOutcome, AcquireOptions, LibraryVerdict } from "./library-store.js";

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

// The DURABLE sensorium lifecycle CAPS — roster/inspect/reconcile/build/promote/retire/un-retire/purge,
// run direct over the manifest declaration (the mesh reducer + manifest-file I/O; no store holder). The
// gated store-swap + daemon-loop cadence + hardening signal ride here too, feature-gated OFF (stable ground).
export {
  rosterSensoria, inspectSensorium, reconcileSensorium, reconcileAllSensoria, runReconcileCadence,
  buildEphemeralSensorium, promoteSensorium, retireSensorium, unRetireSensorium, purgeSensorium,
  readSensoriumAliases, resolveSensoriumTarget, DEFAULT_HARDENING_HALFLIFE,
} from "./sensorium-lifecycle-verbs.js";
export type {
  LifecycleRow, ReconcileResult, BuildResult, PromoteResult, RetireResult, UnRetireResult, PurgeResult,
} from "./sensorium-lifecycle-verbs.js";

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

// The JING read — the li∘ki SQUARE over a child-hosting sensorium's cover (the mesh's who/authority/flow
// lobes): EXTEND the lobes to a reconciled self (ki `fuse`), RESTRICT it back (li), read the round-trip.
// Coheres ⟺ the node's grain and flow round-trip to the identity — the joint the two legs cannot see alone.
export { readJing } from "./sensorium-square.js";
export type { JingRead, LobeRoundTrip, ReadJingOptions } from "./sensorium-square.js";

// The auto-extraction PROJECTOR — read a poured target's child streams into a ChildSignalMV[] signal-matrix
// (the couple_r/mismatch/flow shape), the time-series twin of the salience sidecar. Feature-gated: the
// STRUCTURE lands now, the default reader reads a `signal.json` sidecar the re-pour lands per child; absent
// (every real sensorium today) ⇒ the honest empty matrix, the surface names the calibration data-wait.
export { extractSignalFromTarget, defaultChildSignalReader, CHILD_SIGNAL_SIDECAR } from "./sensorium-signal.js";
export type { ChildSignalReader, SignalExtraction, ExtractSignalOptions } from "./sensorium-signal.js";

// The ephemeral astral multipalace lifecycle (the `sensorium` noun-verb tree).
export {
  newSensoriumId, listSensoria, openSensorium, querySensorium, keepSensorium,
  dissolveSensorium, dissolveAllSensoria, listOrphans, reapOrphans, runSensorium,
  sensoriumTeardownDirs, defaultSensoriumIngest, defaultSensoriumSearch,
} from "./sense-sensorium.js";
export { PETNAMES_FILE, listPetNames, attachPetName, proposePetName, acceptPetName } from "./sensorium-petnames.js";
export type { PetName, OperatorNaming, ProjectionNaming } from "./sensorium-petnames.js";
export type {
  SensoriumLifecycle, SensoriumIngest, SensoriumSearch, OpenSensoriumOptions, OpenSensoriumResult,
  QuerySensoriumResult, KeepResult, DissolveResult, RunSensoriumOptions, RunSensoriumResult,
} from "./sense-sensorium.js";

// The stream compose_palace shore — generalize the sensorium lifecycle to ANY StreamAdapter's frames.
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

export { runInit, runFoundTheFace, faceStands } from "./commands/init.js";
export type { InitOptions, InitResult, FoundFaceOptions, FoundFaceResult } from "./commands/init.js";

export { runDeviceAdmit } from "./commands/device-admit.js";
export type { DeviceAdmitOptions, DeviceAdmitPayload } from "./commands/device-admit.js";

// The Kapae antigen RAISE side (#65) — the founding kahu writes a quorum-signed ban/lift onto the board.
export { runNexusKapae, runNexusKapaeList, NexusKapaeError } from "./commands/nexus-kapae.js";
export type { NexusKapaeOptions, NexusKapaeResult, NexusKapaeListResult } from "./commands/nexus-kapae.js";

// The operator MEMBERS-registry RAISE side (Build-2) — the founding kahu writes a quorum-signed + contract-in
// admit/revoke onto the members board (the antigen's ALLOW-twin); `accept-carriage` mints the operator contract-in.
export { runCabalVouch, CabalVouchError } from "./commands/cabal-vouch.js";
export { runEdgeKapae, EdgeKapaeError } from "./commands/edge-kapae-cmd.js";
export type { EdgeKapaeOptions, EdgeKapaeResult } from "./commands/edge-kapae-cmd.js";
export type { CabalVouchOptions, CabalVouchResult } from "./commands/cabal-vouch.js";
export { runRaiseSign, readRaiseChallenge, RaiseSignError } from "./commands/raise-sign.js";
export { runNexusContract, runNexusAcceptCarriage, runNexusMembersList, NexusContractError } from "./commands/nexus-contract.js";
export type { NexusContractOptions, NexusContractResult, NexusMembersListResult } from "./commands/nexus-contract.js";

// The traceless BOOT-INVITE burn (Build-2) — mint a sealed single-use invite; decide + spend-on-boot LOCALLY.
export {
  runBootInviteMint, runBootInviteSpend, readBurnSet, isBurned, burn as burnBootInvite,
  bootInviteBurnPath, bootInviteId,
} from "./boot-invite-burn.js";

// The @nexus MEMBERSHIP consult holder (Build-2) — the carry-split's member gate: kahu floor ∪ folded members{}.
export { makeNexusMembership } from "./nexus-carriage.js";
export type { NexusMembershipHolder } from "./nexus-carriage.js";
// The `nexus-refresh` LIVE-refold shore — re-reads the disk posture + re-folds the antigen / members boards from
// storage into the live holders, so an out-of-process CLI edit reaches a running node without a bounce.
export { runNexusRefresh } from "./nexus-refresh.js";
export type { NexusRefreshDeps, NexusRefreshResult } from "./nexus-refresh.js";
// The @cad seal's key custody (per-Nexus convergence secrets, minted-per-epoch, persisted read-all) + its FIRST
// live producer (seal a staged carrier body into the ciphertext federation plane, additive to the cleartext wake).
export { standNexusKeyring, loadNexusKeyring, installDeliveredKeyring } from "./nexus-convergence-secret-store.js";
export { cadSealDir, sealCarrierForFederation } from "./seal-carrier-federation.js";
// The @cad WIRE CONSUMER — a member carries a sealed body peer-to-peer over the request-response hop, gated by the
// member blind-transit lane; a stranger / Kapae'd presenter draws Mu (byte-identical to caught-up satiety).
export {
  serveCasWire, decideAndServeWantBlock, fetchSealedCidOverWire, muWireBytes,
  CAS_WANT_BLOCK, CAS_BLOCK, CAS_MU,
} from "./cas-wire.js";
export type { CasWireServerDeps, CasWireFetch } from "./cas-wire.js";

export { loadVesselVerifyingKey, loadVesselSigningSeed, loadVesselCard, persistVesselCard } from "./node-vessel-identity.js";
// The reach-face helpers — every http origin a vessel answers on + the ws:// dial each yields. Re-used by the
// `lares herm` stand-up verb to print the carriage crossroads' dial URLs (host from the face, the relay's own port).
export { deriveReachFaces, wsUrlForOrigin, type ReachFace, type InterfaceTable } from "./lan-address.js";
// The active-persona selector — "put on a mask" at the identity layer (Plurality Pono). The persona-root
// SET mints/loads the operator-root the `lares persona` door drives (founder-side custody).
export { loadActivePersonaIndex, wearPersona, personaRootExists, listPersonaRoots } from "./node-vessel-identity.js";
export { generateOrLoadPersonaGroupRoot, loadPersonaGroupRootSeed, loadPersonaGroupRootVerifyingKey } from "./node-vessel-identity.js";
export type { PersonaGroupRoot } from "./node-vessel-identity.js";
// The two-layer pet-names (#64 stage 4): the PRIVATE own-persona label map (fleet-only; never PUBLICLY
// federates) + the PUBLIC own-published-face record (persona → @crossroads glamour, the one act that binds a
// persona to a public name). Distinct stores, distinct from the handle-book.
export { makeNodePersonaPetnameStore, makeNodePublicHandleStore } from "./node-vessel-identity.js";
// The DECLARATION store — the Handle a persona answers to + whether it stands for a Kahu seat. Sits between
// the private label and the published record so a private compartment name never becomes a public commitment.
export { makeNodePersonaDeclarationStore } from "./node-vessel-identity.js";

// The IoC follow — the node-fs LOCAL adapters for the private circle-graph + the recogniser's handle-book.
// Both under the identity home, 0o600, never federated (the `lares circle` door drives them via composeFollow).
export { makeNodeCircleStore, loadNodeHandleBook, saveNodeHandleBook } from "./node-circle-store.js";
// The persona-admission PER-VESSEL multitude-view (never fleet-syncs) + the airgapped ceremony's consume-once
// pending state — the node-fs local store the `lares persona admit` door drives.
export {
  recordAdmittedPersona, listAdmittedPersonas, isPersonaAdmitted,
  stashEnrollmentSecret, takeEnrollmentSecret, peekEnrollmentSecrets, stashSentMemo, takeSentMemo, clearPersonaAdmitPending,
} from "./node-persona-admit-store.js";
// QR transport — GENERATE a scannable carriage QR (terminal / PNG / SVG / matrix, ECC H) + DECODE a still PNG
// through an injected decoder shore (the headless node scanner + the browser camera both plug in behind it).
export {
  qrCarriageToTerminal, qrCarriageToPngBuffer, qrCarriageToSvg, qrCarriageMatrix,
  pngToImageData, decodeQrPng, HANDSHAKE_QR_ECC,
} from "./qr-transport.js";
export type { QrImageDecoder } from "./qr-transport.js";
// The airgapped persona-admission ORCHESTRATION — the 5 flow functions the `lares persona admit` CLI thin-wraps
// (mint/seal/open/ack composing the ceremony + the per-vessel store + the QR render).
export { offerAdmitFlow, grantAdmitFlow, openAdmitFlow, acceptAdmitFlow, makeLocalPersonaKelHeadResolver } from "./persona-admit-flow.js";
export type { HopRender } from "./persona-admit-flow.js";
// The `bags/@nexus` charter DOC adapter — the antigen roster's authority home read/written on disk (#66).
export {
  readNexusDoc, writeNexusDoc, renderNexusDoc, writeNexusSeal, writeNexusKahu, writeNexusPractice,
  nexusCharterDocPath, nexusCharterDocRelPath,
} from "./nexus-doc.js";
export { loadLeafIdentity } from "./leaf-identity.js";
export type { LeafIdentity } from "./leaf-identity.js";
// The seal-reserve node adapter — seals the operator's "mine" share + records the PUBLIC reserve state.
export {
  sealReserveMineShare, loadReserveMineShare, writeCharterReserveState, readCharterReserveState,
  reserveMineSharePath, reserveStatePath,
} from "./seal-reserve-store.js";
export type { SealReserveState } from "./seal-reserve-store.js";
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
  makeCompactBagReactor, makeRotateRecipeReactor,
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
// The AUTHENTICATED live-WS membership transport — Ed25519 proof-of-possession binds each envelope's `from` to a
// proven key (no impersonation of the cas-wire member gate), reusing the DaemonAuthGate's own challenge/verify.
export { startAuthenticatedMembershipRelay, AuthenticatedWSMembershipChannel } from "./authenticated-membership-relay.js";
export type { AuthenticatedMembershipRelay } from "./authenticated-membership-relay.js";
// The CARRIAGE relay capability (Socket B) — the authenticated transport + the DHT-free bag-tracker, one service;
// and the vessel-side serve-loop that carries a sealed @cad body to members (inert until a relay URL is configured).
export { startCarriageRelay } from "./carriage-relay.js";
export type { CarriageRelay } from "./carriage-relay.js";
export { startCarriageServeLoop } from "./carriage-serve-loop.js";
export type { CarriageServeLoop, CarriageServeLoopConfig } from "./carriage-serve-loop.js";
// The immune keel's RE-KEY (roll a lease epoch, per-writer-slot max-register) + RE-SHARE (list held sealed bodies
// to re-announce) teeth at the Herm's own tier — the `nexus-rekey` / `nexus-reshare` daemon verbs' cores.
export { rollLeaseEpochOnBoard } from "./lease-rekey.js";
export type { LeaseRekeyResult } from "./lease-rekey.js";
export { listSealedCids } from "./cas-reshare.js";
// The BULB cap — the HELD cold-boot snapshot (genesis seed + CAS + bootstrap, epoch-PINNED), content-addressed +
// served by cid over the public floor; and the `lares kindle <herm-url>` cold path that pulls it + kindles a NEW
// SOVEREIGN hearth (the device mints its OWN key — serve fire, never key). All-public OPEN path (bulb ⊥ stolon).
export { buildBulb, assembleBulb, readBulbArtifact, BULB_MANIFEST_FORMAT } from "./bulb.js";
export type { BulbArtifact, BulbBlob, BulbManifest } from "./bulb.js";
export { mountBulbReadFace } from "./bulb-read-face.js";
export { bulbCap } from "./node-caps.js";
export { pullBulb, kindleFromBulb, httpBulbTransport } from "./kindle.js";
export type { BulbPullTransport, KindleResult } from "./kindle.js";
export { startNexusClientDial, maybeStartNexusClientDial } from "./nexus-client-dial.js";
export type { NexusClientDial, NexusClientDialConfig, NexusClientDialInput } from "./nexus-client-dial.js";
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
// The telemetry capture cap is FOLDED into @daemon (idempotent: every @daemon carries it).
// node-daemon-island wires the capture SINK live (from the
// daemon spawn's optional workerData.telemetry) or leaves the cap inert. The capture core stays
// composable + isomorphic: @lararium/mesh capture-engine + the tw5 `hasCapture` cap; node shores via
// makeNodeCaptureEngine.
