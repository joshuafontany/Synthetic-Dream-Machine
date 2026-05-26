/**
 * @lararium/tw5 — TW5 as the active isomorphic render engine for Lararium.
 *
 * Primary exports:
 *   TW5Engine               — clean isomorphic TW5 VM (boot/render/tiddler mutation)
 *   IslandAdaptor           — causal-island↔TW5 wiki bridge; inbound buffer/flush + outbound writes
 *   MemoryTiddlerStore      — in-memory LarTiddlerStore (tests / fixtures)
 *   DirectMemeRecipeVm      — in-process TW5Engine wrapper; bootMemeRecipeVm boot helper
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
export type { CameraMount, CameraRegistration } from "./tw5-camera.js";
export { mountCamera, startRenderLoop } from "./tw5-camera.js";
export { mountPanel, setPalette, setBootSplash } from "./tw5-browser-surface.js";
export type {
  TW5Wiki,
  TW5Tiddler,
  TW5TiddlerFields,
} from "./types/tiddlywiki.d.ts";

export { IslandAdaptor } from "./island-adaptor.js";
export { openVmIslandBridge } from "./vm-island-bridge.js";
export type { VmIslandBridge, VmIslandBridgeOptions } from "./vm-island-bridge.js";
export {
  openVmCarrierSyncSession,
} from "./wiki-sync.js";
export { placeVmJob, patchVmJob, removeVmJob, writeVmJobReceipt, dispatchVmJobLifecycle } from "./job-vm.js";
export type {
  VmCarrierSyncInput,
  VmCarrierSyncResult,
  VmCarrierSyncSession,
  VmCarrierSyncSessionOptions,
} from "./wiki-sync.js";
export type { VmJobPlacement } from "./job-vm.js";
export { MemoryTiddlerStore } from "./memory-store.js";
export type { ProjectionStore } from "./memory-store.js";
export type { MemeRecipeVm } from "@lararium/mesh";

export { DirectMemeRecipeVm, bootMemeRecipeVm } from "./meme-recipe-vm.js";
export { collectVmPreloadedTiddlers, openVmSession } from "./vm-session.js";
export type { VmSessionFactoryOptions, VmSessionResult } from "./vm-session.js";
export { MountedWikiController } from "./mounted-wiki-controller.js";
export type {
  MountedWikiControllerDeps,
  MountedWikiFlushDriver,
  MountedWikiMountOptions,
  MountedWikiSession,
} from "./mounted-wiki-controller.js";

export { exportMemeText } from "./meme-write.js";
export { promoteUris, planPromoteUris } from "./modules/lar-promote.js";
export type { PromoteWiki, PromoteResult, PromotePlan, PromotePlannedRecord } from "./modules/lar-promote.js";

export { tw5ElementToVdom, tw5ElementToHtml } from "./fake-dom.js";
export type { VDomNode, TW5FakeElement, TW5FakeTextNode, TW5FakeNode } from "./fake-dom.js";

export { TW5_VERSION, TW5_CORE_SCRIPT_FILENAME, TW5_CORE_DIR } from "./generated-tw5-version.js";

export { parseTaploFields, patchTomlKey, lintToml } from "./toml-ast.js";

export type { BagTiddler, RecipeTiddler } from "@lararium/mesh";
export { bagDescriptorUri, recipeUri } from "@lararium/mesh/lar-uris";
export { parseBagStack, parsePlugins } from "@lararium/mesh";

export { TW5WorkerProxy } from "./tw5-worker-proxy.js";

export { buildCeremonyTiddlers, didKeyFromVerifyingKey } from "@lararium/mesh";
export type { CeremonyTiddler } from "@lararium/mesh";
export type { WorkerFactory, AnyWorker } from "./tw5-worker-proxy.js";

export { WorkerAuthorityHandler } from "./worker-authority-handler.js";
