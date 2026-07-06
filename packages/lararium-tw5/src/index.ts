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
  structureSalience,
  shingles,
  buildFixtureIsland,
  runWikiConsistencyWitness,
  GLUE_SEEDS,
  OBSTRUCT_SEEDS,
  FORM_SHINGLE_K,
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
  ActiveWikiLayerSlot,
  buildActiveWikiRecord,
  planActiveWikiSlot,
  readActiveWikiSlug,
  selectActiveWikiSlug,
} from "./active-wiki.js";
export type { ActiveWikiSelectionSource, ActiveWikiLayerMount, ActiveWikiSlotPlan } from "./active-wiki.js";
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
  CoherenceProjectionSeams,
} from "./wiki-coherence-projection.js";
export {
  createWikiSensorium,
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
  WikiRecallQuery,
  WikiRecallHit,
  WikiRecallResult,
  WikiCouplingRead,
  WikiCouplingUnbuilt,
  WikiSensoriumWitness,
} from "./wiki-sensorium-cap.js";
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

export { exportMemeText } from "./meme-write.js";

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
export { VerbDispatcher, VerbTable } from "./verb-dispatcher.js";
export type { VerbContext, VerbReactor, VerbDispatcherOptions } from "./verb-dispatcher.js";
export { heedSummons } from "./verb-summons.js";
export type { SummonsRequest, SummonsRelayOptions } from "./verb-summons.js";
export { runLocalVerb, makeCapVerify } from "./verb-local-dispatch.js";
export type { CapVerify, RunLocalVerbOptions } from "./verb-local-dispatch.js";
export { makeDaemonBehavior } from "./daemon-behavior.js";
export type { DaemonBehaviorOptions } from "./daemon-behavior.js";

export { IslandKernel } from "./island-kernel.js";
export { runSovereignKernel } from "./sovereign-kernel.js";
export type { IslandHostSeam } from "./sovereign-kernel.js";
export { mountSocialPlane, addSubstrateLayer, addReadOnlyLayer, seedVesselDefaults, mountPrimaryWiki } from "./vessel-steps.js";
export type { ResolveBagHandle, SocialPlaneUrls, SocialPlaneHandles, PrimaryMountPool, BindingResolver, PrimaryMountInputs } from "./vessel-steps.js";
export { loadCatalogCorpora } from "./load-corpora.js";
export type { CorpusLoaderDeps } from "./load-corpora.js";
export {
  makeWhereReactor, makeResolveReactor, makeListWikisReactor,
  makePinReactor, makeUnpinReactor, makeRegisterColdReactor,
  makeWikiPinReactor, makeWikiUnpinReactor,
  makeWardAlertReactor,
} from "./worker-data-verbs.js";
export type { ResidencyOpPost } from "./worker-data-verbs.js";
// Verb-plane reactors (composite/repo-only — pono home is tw5, not node; both vessels hold them).
export { makeInitWikiReactor, makeOpenWikiReactor }   from "./wiki-mint-handlers.js";
export { makeDraftReactor, makePruneStaleReactor }    from "./wiki-draft-handlers.js";
export { makeAddBagReactor, makeRemoveBagReactor }    from "./wiki-compose-handlers.js";
export type {
  WikiHandlerOptions, WikiMintHandlerOptions, PruneStaleOptions, WikiComposeOptions, DraftHandlerOptions,
} from "./wiki-handler-options.js";
export { makeEpochBagReactor, makeRotateRecipeReactor } from "./epoch-handlers.js";
export type { EpochHandlerOptions, RotateRecipeOptions } from "./epoch-handlers.js";
export { makeResidencyStatsReactor } from "./residency-handlers.js";
export type { ResidencyHandlerOptions } from "./residency-handlers.js";
export { makeCatalogAccessor } from "./catalog-accessor.js";
export type { CatalogAccessor } from "./catalog-accessor.js";
export { openVesselCore } from "./open-vessel.js";
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
