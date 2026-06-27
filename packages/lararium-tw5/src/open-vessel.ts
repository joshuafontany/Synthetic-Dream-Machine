/**
 * open-vessel — THE vessel orchestrator (one keel, both sides).
 *
 * Canon: lar:///ha.ka.ba/@lararium/v0.1/mesh/open-vessel +
 * lar:///ha.ka.ba/@lararium/v0.1/api/lararium-canonical-model. Radical-alpha: the old
 * open-node-vessel / open-browser-vessel FORK is deleted; both platforms become thin
 * RECIPES over this one orchestrator. The substrate keel (composite cascade, genesis,
 * social plane, admin doc, wiki-slot) lives VM-free in mesh (assembleVessel +
 * mountWikiSlot); this orchestrator sequences it + the VM-focused tail (admin VM ea-gate
 * → primary-wiki mount → live). Platform atoms + capability pieces inject as recipe
 * closures; NO `if (platform)` enters here.
 *
 * A capability the recipe omits simply does not run (absent = not-yet-held, Ink & Switch).
 */

import type { Repo, DocHandle, LarDoc, LarOpenPhase, VesselRecipe, VesselCoreAssembly } from "@lararium/mesh";
import { assembleVessel, mountWikiSlot, LARES_DOC_URI } from "@lararium/mesh";
import { mountPrimaryWiki, type PrimaryMountPool, type BindingResolver } from "./vessel-steps.js";
import { VerbTable } from "./verb-dispatcher.js";

/** The admin VM surface the orchestrator drives (node + browser both satisfy it). */
export interface VesselDaemonVm {
  workerEa:       Promise<void>;
  mountMainVerbs: (registry: VerbTable) => void;
  resolveBinding: BindingResolver;
}

/** The active-wiki slot identity the recipe resolves (from planActiveWikiSlot). */
export interface VesselWikiSlot {
  activeWikiId:     string;
  wikiSlug:         string;
  wikiKey:          string;
  wikiBagId:        string;
  draftOracleTitle: string;
  draftBagId:       string;
}

/**
 * VesselOrchestration — the full recipe a platform supplies. The mesh `keel` recipe
 * carries the substrate atoms (repo, catalog, bootstrap, waitHandle, loadGenesis,
 * tempStore, loadCorpora); the closures below carry the VM-focused + capability pieces.
 */
export interface VesselOrchestration<TPool extends PrimaryMountPool> {
  keel:        VesselRecipe;
  /** Resolve the active-wiki slot AFTER the keel assembles — the slug derives from the
   *  admin-doc marker (post-genesis), so it cannot precede assembleVessel. */
  wikiSlot:     (assembly: VesselCoreAssembly) => VesselWikiSlot | Promise<VesselWikiSlot>;
  /** Open the platform admin VM once the keel + slot resolved (daemonAuth registers the
   *  slot's wiki/draft bags; sentinels read from the assembled admin doc). */
  openDaemon:    (a: { assembly: VesselCoreAssembly; slot: VesselWikiSlot }) => Promise<VesselDaemonVm>;
  /** Wire the vessel's verb plane (capability piece; relay holds more). */
  wireVerbs?:   (registry: VerbTable, assembly: VesselCoreAssembly) => void;
  /** Capability hook AFTER admin VM lives (node: arm the inbound gate). */
  afterDaemon?:  (admin: VesselDaemonVm, assembly: VesselCoreAssembly) => void;
  /** Build the island pool (platform: VesselIslandPool ↔ BrowserVesselIslandPool). */
  makePool:     (admin: VesselDaemonVm, assembly: VesselCoreAssembly) => TPool | Promise<TPool>;
  /** Capability hook AFTER `live` (browser: broadcast presence). */
  afterLive?:   (ctx: { pool: TPool; assembly: VesselCoreAssembly; wikiHandle: DocHandle<LarDoc> }) => void;
}

export interface VesselCoreResult<TPool extends PrimaryMountPool> {
  repo:         Repo;
  assembly:     VesselCoreAssembly;
  pool:         TPool;
  admin:        VesselDaemonVm;
  wikiHandle:   DocHandle<LarDoc>;
  draftHandle:  DocHandle<LarDoc>;
}

/**
 * openVesselCore — run the one vessel boot sequence on either substrate.
 * Phases: (caller emits boot/repo-open/catalog-ready before calling) → keel →
 * island-ready/corpus-ready (inside assembleVessel) → admin VM → verb plane →
 * wiki-slot → vessel-ready → pool → admin ea-gate → primary-wiki mount → tw5-booted →
 * live. The admin-first gate (await workerEa before mount) holds invariant.
 */
export async function openVesselCore<TPool extends PrimaryMountPool>(
  o: VesselOrchestration<TPool>,
): Promise<VesselCoreResult<TPool>> {
  const emit = (p: LarOpenPhase) => o.keel.onPhase?.(p);

  // ── vessel: composite cascade + genesis + social + admin + corpus (mesh, VM-free) ──
  const assembly = await assembleVessel(o.keel);

  // ── active-wiki slot (post-genesis: slug from the admin-doc marker) ──
  const slot = await o.wikiSlot(assembly);

  // ── admin VM (platform) ──
  const admin = await o.openDaemon({ assembly, slot });

  // ── verb plane (capability piece) ──
  const registry = new VerbTable();
  o.wireVerbs?.(registry, assembly);
  admin.mountMainVerbs(registry);
  o.afterDaemon?.(admin, assembly);

  // ── wiki-slot layers (mesh) ──
  // The @lares-as-wiki quine: when the active slug opens the invariant bag
  // itself, seat the operator-minted doc as the write layer.
  const presetWiki = slot.wikiBagId === LARES_DOC_URI ? assembly.laresHandle ?? undefined : undefined;
  const { wikiHandle, draftHandle } = await mountWikiSlot(o.keel, assembly.composite, slot, presetWiki);
  emit("wiki-ready");
  emit("vessel-ready");

  // ── island pool (platform) ──
  const pool = await o.makePool(admin, assembly);

  // ── admin-first sovereignty gate → primary-wiki mount ──
  await admin.workerEa;
  await mountPrimaryWiki(pool, admin.resolveBinding, {
    activeWikiId: slot.activeWikiId,
    wikiSlug:     slot.wikiSlug,
    coreHash:     assembly.coreHash,
    islandUrl:    assembly.islandHandle.url,
    wikiUrl:      wikiHandle.url,
    catalogUrl:   assembly.catalogHandle.url,
  });
  emit("tw5-booted");

  emit("live");
  o.afterLive?.({ pool, assembly, wikiHandle });

  return { repo: assembly.repo, assembly, pool, admin, wikiHandle, draftHandle };
}
