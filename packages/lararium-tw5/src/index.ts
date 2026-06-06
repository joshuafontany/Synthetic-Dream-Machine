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

export { TW5Engine } from "./tw5-vm.js";
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
export { placeVerbInvocation, patchVerbInvocation, removeVerbInvocation, writeVerbOutcome, dispatchVerbLifecycle } from "./verb-vm.js";
export type { VerbPlacement } from "./verb-vm.js";
export type {
  VmCarrierSyncInput,
  VmCarrierSyncResult,
  VmCarrierSyncSession,
  VmCarrierSyncSessionOptions,
} from "./wiki-sync.js";
export { MemoryTiddlerStore } from "./memory-store.js";
export { getOriginBag } from "./residency-surface.js";
export { registerActionReactors, makeActionReactorFor } from "./action-handler.js";
export { makeWikiBehavior } from "./wiki-behavior.js";
export type { WikiBehaviorOptions } from "./wiki-behavior.js";
export type { ActionHandlerOptions } from "./action-handler.js";

export { exportMemeText } from "./meme-write.js";
// (lar-promote module retired 2026-05-31 under the residency-model cleanup;
//  ACTION verb handlers land in Sprint 5 — see packages/EPIC-RESIDENCY-MODEL.md)

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
export { VerbDispatcher, VerbTable } from "./verb-dispatcher.js";
export type { VerbContext, VerbReactor, VerbDispatcherOptions } from "./verb-dispatcher.js";
export { emitVerbSignal } from "./verb-signal.js";
export type { VerbSignalRequest, VerbSignalRelayOptions } from "./verb-signal.js";
export { runLocalVerb, makeCapVerify } from "./verb-local-dispatch.js";
export type { CapVerify, RunLocalVerbOptions } from "./verb-local-dispatch.js";
export { makeAdminBehavior } from "./admin-behavior.js";
export type { AdminBehaviorOptions } from "./admin-behavior.js";

export { IslandKernel } from "./island-kernel.js";
export { runSovereignKernel } from "./sovereign-kernel.js";
export type { IslandHostSeam } from "./sovereign-kernel.js";
export { mountSocialPlane, addCanonLayer, addReadOnlyLayer, seedVesselDefaults, mountPrimaryWiki } from "./vessel-steps.js";
export type { ResolveBagHandle, SocialPlaneUrls, SocialPlaneHandles, PrimaryMountPool, BindingResolver, PrimaryMountInputs } from "./vessel-steps.js";
export { openAdminVmCore } from "./admin-vm-core.js";
export type {
  AdminVmHost,
  AdminVmCore,
  AdminVmCoreOptions,
  VesselPlaceVerbRequest,
} from "./admin-vm-core.js";

