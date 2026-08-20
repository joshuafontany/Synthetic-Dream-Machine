/**
 * @lararium/tw5 — TW5 as the active isomorphic render engine for Lararium.
 *
 * Primary exports:
 *   TW5Engine               — clean isomorphic TW5 VM (boot/render/tiddler mutation)
 *   IslandAdaptor           — causal-island↔TW5 wiki bridge; inbound buffer/flush + outbound writes
 *   MemoryTiddlerStore      — in-memory LarTiddlerStore (tests / fixtures)
 *
 * Widget tree ownership:
 *   Messaging (papalohe/kukali/lele) and kumu device instances are native
 *   TW5 widgets registered via createLarariumWidgets(). The active TW5Engine
 *   builds the widgetTree and fakeDOM on each render call.
 */

export {
  WikiStoreAdapter,
  projectWikiSensorium,
  buildFixtureIsland,
  runWikiConsistencyWitness,
  GLUE_SEEDS,
  OBSTRUCT_SEEDS,
} from "./wiki-store-adapter.js";
export type {
  WikiTiddlerReading,
  WikiSensoriumSnapshot,
  FixtureTiddler,
  WikiConsistencyWitness,
} from "./wiki-store-adapter.js";
export { TW5Engine } from "./tw5-vm.js";
export { bagScopeOf, qualifyStackTag, stackOf } from "./has-stack.js";
export type { StackEntry } from "./has-stack.js";
export type { TW5CoreBootBlob } from "./tw5-vm.js";
export {
  ACTIVE_WIKI_URI,
  buildActiveWikiRecord,
  readActiveWikiSlug,
  selectActiveWikiSlug,
} from "./active-wiki.js";
export type { ActiveWikiSelectionSource } from "./active-wiki.js";
export type { CameraMount } from "./tw5-camera.js";
export { mountCamera } from "./tw5-camera.js";
export { mountProjection, PROJECTION_FRAME, dispatchProjectedEvent } from "./tw5-projection.js";
export {
  mountCoherenceProjection,
  wireCoherenceProjection,
  projectCoherenceIndicator,
  COHERENCE_FRAME,
  COHERENCE_COALESCE_MS,
} from "./wiki-coherence-projection.js";
export type {
  CoherenceIndicatorFrame,
  CoherenceStatus,
  CoherenceProjector,
  CoherenceProjectionShores,
} from "./wiki-coherence-projection.js";
export {
  createWikiSensorium,
  createWikiSensoriumOverReader,
  compositeCorpusReader,
  hasWikiSensorium,
  runWikiSensoriumWitness,
  letterFrequencyEmbedder,
  SENSORIUM_FRAME,
  SENSORIUM_SIGNAL,
  RECALL_LIMIT,
} from "./wiki-sensorium-cap.js";
export type {
  TextEmbedder,
  WikiSensorium,
  WikiSensoriumHandle,
  WikiSensoriumOptions,
  WikiCoherenceVerdict,
  WikiCorpusReader,
  WikiRecallQuery,
  WikiRecallHit,
  WikiRecallResult,
  WikiCouplingRead,
  WikiCouplingUnbuilt,
  WikiSensoriumWitness,
} from "./wiki-sensorium-cap.js";
export { summarizeCoherence, shingles, structureSalience, FORM_SHINGLE_K } from "./wiki-sense-fold.js";
export type { WikiSenseDoc, WikiCoherenceSummary, WikiSenseUniverse } from "./wiki-sense-fold.js";
export {
  createWikiSenseSupervisor,
  registerWikiSenseVerbs,
  buildProofRecordTiddler,
  parseProofRecord,
  proofLedgerPrefix,
  proofRecordUri,
  isProofRecordUri,
  WIKI_SENSE_VERB,
  LARES_PROOF_RECORD_TAG,
} from "./wiki-sense-supervision.js";
export type {
  WikiSenseShores,
  WikiSenseSupervisor,
  WikiSenseSupervisorOptions,
  WikiSenseCohereReading,
  WikiSenseProofRecord,
  WikiSenseFederateRefusal,
} from "./wiki-sense-supervision.js";
export { mountPanel, setPalette, setBootSplash } from "./tw5-browser-surface.js";
export type {
  TW5Wiki,
  TW5Tiddler,
  TW5TiddlerFields,
} from "./types/tiddlywiki.d.ts";

export { IslandAdaptor } from "./island-adaptor.js";
export { buildIslandRecipe } from "./island-recipe.js";
export type { BuildIslandRecipeInput, RecipeReadyBinding } from "./island-recipe.js";
export {
  openVmCarrierSyncSession,
} from "./wiki-sync.js";
export { placeVerb, patchVerb, removeVerb, writeOutcome, dispatchVerb } from "./verb-vm.js";
export type { VerbPlacement } from "./verb-vm.js";
export type {
  VmCarrierSyncInput,
  VmCarrierSyncResult,
  VmCarrierSyncSession,
  VmCarrierSyncSessionOptions,
} from "./wiki-sync.js";
export { MemoryTiddlerStore } from "./memory-store.js";
export { getOriginBag } from "./residency-surface.js";
export { registerActionReactors, makeActionReactorFor, makeTw5Deserializer } from "./action-handler.js";
export { makeWikiBehavior } from "./wiki-behavior.js";
export type { WikiBehaviorOptions } from "./wiki-behavior.js";
export { startEngineWatch, ENGINE_WAITING_ALERT_TITLE } from "./engine-watch.js";
export { startRecipeWatch } from "./recipe-watch.js";
export type { ActionHandlerOptions } from "./action-handler.js";

export { exportMemeText, exportCarrierFile } from "./meme-write.js";
export type { CarrierFile } from "./meme-write.js";
export { installLazyResolver, skinnyCid } from "./lazy-resolver.js";
export type { CarrierResolver as LazyCarrierResolver } from "./lazy-resolver.js";

export { tw5ElementToVdom, tw5ElementToHtml } from "./fake-dom.js";
export type { VDomNode, TW5FakeElement, TW5FakeTextNode, TW5FakeNode } from "./fake-dom.js";

export { TW5_VERSION, TW5_CORE_SCRIPT_FILENAME, TW5_CORE_DIR } from "./generated-tw5-version.js";

export { parseTaploFields, patchTomlKey, lintToml } from "./toml-ast.js";

export type { BagTiddler, RecipeTiddler } from "@lararium/mesh";
export { bagDescriptorUri, recipeUri } from "@lararium/mesh/lar-uris";
export { parseBagStack, parsePlugins } from "@lararium/mesh";

export { buildCeremonyTiddlers, didKeyFromVerifyingKey } from "@lararium/mesh";
export type { CeremonyTiddler } from "@lararium/mesh";

export type { IslandContext, IslandBehavior } from "./island-context.js";
export { composeIsland } from "./island-caps.js";
export type { IslandCap, CapTeardown } from "./island-caps.js";
export { hasCapture, TELEMETRY_FRAME } from "./has-capture.js";
export type { CaptureCapOptions } from "./has-capture.js";
export { VerbDispatcher, VerbTable, VERB_SURFACE, projectOntoSurface } from "./verb-dispatcher.js";
export type { VerbContext, VerbReactor, VerbDispatcherOptions, VerbSpec, SurfaceDeclared } from "./verb-dispatcher.js";
export { heedSummons } from "./verb-summons.js";
export type { SummonsRequest, SummonsRelayOptions } from "./verb-summons.js";
export { runLocalVerb, makeCapVerify } from "./verb-local-dispatch.js";
export type { CapVerify, RunLocalVerbOptions } from "./verb-local-dispatch.js";
export { makeDaemonBehavior } from "./daemon-behavior.js";
export type { DaemonBehaviorOptions } from "./daemon-behavior.js";
export { seedDaemonUiTiddlers, makeSwitcherStateReactor, DAEMON_UI_TIDDLERS, SWITCHER_STATE_TITLE, LARES_SURFACE_STATE, LARES_SURFACE_TAG } from "./daemon-ui-tiddlers.js";
export { seedDaemonPersonaTiddlers, makePersonaStateReactor, DAEMON_PERSONA_TIDDLERS, PERSONA_STATE_TITLE } from "./daemon-persona-tiddlers.js";
export { seedDaemonCircleTiddlers, makeCircleStateReactor, DAEMON_CIRCLE_TIDDLERS, CIRCLE_STATE_TITLE } from "./daemon-circle-tiddlers.js";
export { seedDaemonFlowTiddlers } from "./daemon-flow-tiddlers.js";
export { seedDaemonProtocol } from "./daemon-protocol-seed.js";
export { seedDaemonRosterTiddlers, DAEMON_ROSTER_TIDDLERS, ROSTER_STATE_TITLE, LIFECYCLE_APPROVE_CAP } from "./daemon-roster-tiddlers.js";

export { IslandKernel } from "./island-kernel.js";
export { runSovereignKernel } from "./sovereign-kernel.js";
export type { IslandHostShore } from "./sovereign-kernel.js";
export { addSubstrateLayer, addReadOnlyLayer, seedVesselDefaults, mountPrimaryWiki, buildWikiMountSpec } from "./vessel-steps.js";
export type { ResolveBagHandle, PrimaryMountPool, BindingResolver, PrimaryMountInputs } from "./vessel-steps.js";
export { makeVesselResidency } from "./vessel-residency-wiring.js";
export type {
  VesselResidency, VesselResidencyPool, VesselResidencyConfig, VesselResidencyHooks,
  VesselAlertVerbOpts, AlertDropReason, WireToPoolArgs,
} from "./vessel-residency-wiring.js";
export { loadCatalogCorpora } from "./load-corpora.js";
export type { CorpusLoaderDeps } from "./load-corpora.js";
export {
  makeWhereReactor, makeResolveReactor, makeListWikisReactor,
  makePinReactor, makeUnpinReactor, makeRegisterColdReactor,
  makeWikiPinReactor, makeWikiUnpinReactor,
  makeWardAlertReactor,
} from "./worker-data-verbs.js";
export type { ResidencyOpPost } from "./worker-data-verbs.js";
// The FOLLOW-GRAPH verbs over the sovereign @circles doc (source of truth; PRIVATE, fleet-synced
// same-operator, NEVER federated). Both vessels register them through the shared operator-daemon-behavior.
export {
  makeCircleReactors, makeCircleAddReactor, makeCircleRemoveReactor, makeCircleListReactor,
} from "./circle-verbs.js";
export type { CircleVerbOptions, ResolveCirclesStore } from "./circle-verbs.js";
// The OWN-PERSONA name verbs over @persona — the fleet-riding pet-name + declared Handle (the `seat` claim
// stays local to whichever node holds it).
export { makePersonaSelvesReactors } from "./persona-selves-verbs.js";
export type { PersonaSelvesVerbOptions, ResolvePersonaStore } from "./persona-selves-verbs.js";
// The CABAL-REALM verbs over @daemon — the OFFERING that feeds a realm, and the verdict-free capture-clock.
export { makeCabalRealmReactors, makeRealmFeedReactor, makeRealmClockReactor } from "./cabal-realm-verbs.js";
export type { CabalRealmVerbOptions, ResolveDaemonStore } from "./cabal-realm-verbs.js";
// Verb-plane reactors (composite/repo-only — pono home is tw5, not node; both vessels hold them).
export { makeInitWikiReactor, makeOpenWikiReactor }   from "./wiki-mint-handlers.js";
export { makeDraftReactor, makePruneStaleReactor }    from "./wiki-draft-handlers.js";
export { makeAddBagReactor, makeRemoveBagReactor }    from "./wiki-compose-handlers.js";
export type {
  WikiHandlerOptions, WikiMintHandlerOptions, PruneStaleOptions, WikiComposeOptions, DraftHandlerOptions,
} from "./wiki-handler-options.js";
export { makeCompactBagReactor, makeRotateRecipeReactor } from "./compaction-handlers.js";
export type { EpochHandlerOptions, RotateRecipeOptions } from "./compaction-handlers.js";
export { makeResidencyStatsReactor } from "./residency-handlers.js";
export type { ResidencyHandlerOptions } from "./residency-handlers.js";
export { makeCatalogAccessor } from "./catalog-accessor.js";
export type { CatalogAccessor } from "./catalog-accessor.js";
export {
  composeCoreVessel,
  substrateCap, daemonCap, wikiSlotCap, wikiCap, poolCap, mountCap,
  CORE_CAP,
} from "./core-caps.js";
export type {
  VesselOrchestration, VesselCoreResult, VesselDaemonVm, VesselWikiSlot,
  WikiSlotComponent, DaemonCapDeps,
} from "./core-caps.js";
export { openDaemonVmCore } from "./daemon-vm-core.js";
export type {
  DaemonVmHost,
  DaemonVmCore,
  DaemonVmCoreOptions,
  VesselPlaceVerbRequest,
} from "./daemon-vm-core.js";
export {
  composeVerbPlane,
  mempalaceProviderCap, formPalaceProviderCap, daemonVerbProviderCap, telemetryProviderCap,
  recallVerbCap, telemetryVerbCap, captureVerbCap, worldlineVerbCap,
  VERB_PROVIDER, VERB_GROUP, VERB_GROUP_PREFIX,
} from "./verb-caps.js";
export type {
  VerbContribution,
  MempalaceProvider, FormPalaceProvider, DaemonVerbProvider, TelemetryProvider,
  RecallClient, RecalledTrajectoryStub, SubagentEdgePair,
} from "./verb-caps.js";

export * from "./memetic-wikitext-sensorium.js";
