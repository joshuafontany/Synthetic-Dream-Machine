/**
 * core-caps — THE vessel keel as a GRANULAR #has-cap-stack (one keel, both substrates).
 *
 * Canon: lar:///ha.ka.ba/lararium/api/composable-keel + …/mesh/open-vessel +
 * …/api/lararium-canonical-model. The former monolithic vessel sequence
 * decomposes here into SIX cap-modules a vessel HAS — substrate · wikislot · daemon · wiki ·
 * pool · mount — each declaring only the deps it routes (POLA), `composeVessel` topologically
 * WIRING them. The build order the topo-sort guarantees (substrate → wikislot → daemon → wiki →
 * pool → mount) reproduces the monolith's exact phase ordering verbatim — the daemon-first
 * sovereignty gate (`await daemon.workerEa` before primary-wiki mount) stays INSIDE the mount cap.
 *
 * The substrate + daemon caps are the SHARED floor both the full vessel AND the wiki-less Herm
 * compose over (the Herm omits wikislot/wiki/pool from its stack — blind by structure). The daemon
 * cap OPTIONALLY routes the wiki slot, so it builds with `slot` undefined on the Herm path (the
 * @daemon decouple) and with `slot` present on the full path.
 *
 * Phase distribution (the same sequence the monolith emitted, never re-ordered):
 *   - island-ready / corpus-ready  — inside assembleVessel (the substrate cap)
 *   - wiki-ready / vessel-ready     — the wiki cap (after the slot layers mount)
 *   - tw5-booted / live            — the mount cap (after the daemon-first gate + primary mount)
 */

import type { Repo, DocHandle, LarDoc, LarOpenPhase, VesselKeel, VesselCoreAssembly } from "@lararium/mesh";
import { assembleVessel, mountWikiSlot, LARES_DOC_URI, composeVessel, type CapModule } from "@lararium/mesh";
import { mountPrimaryWiki, type PrimaryMountPool, type BindingResolver } from "./vessel-steps.js";
import { VerbTable } from "./verb-dispatcher.js";

// ── core surface types (the recipe a platform supplies + the result it hands back) ───────────────

/** The daemon VM surface the orchestrator drives (node + browser both satisfy it). */
export interface VesselDaemonVm {
  workerEa:       Promise<void>;
  mountMainVerbs: (registry: VerbTable) => void;
  resolveBinding: BindingResolver;
}

/** The active-wiki slot identity the recipe resolves (projected from the wiki's
 *  slug via `recipeHostFacets` — the isomorphic core, one minter set host + island). */
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
  keel:        VesselKeel;
  /** Resolve the active-wiki slot AFTER the keel assembles — the slug derives from the
   *  daemon-doc marker (post-genesis), so it cannot precede assembleVessel. */
  wikiSlot:     (assembly: VesselCoreAssembly) => VesselWikiSlot | Promise<VesselWikiSlot>;
  /** Open the platform daemon VM once the keel + slot resolved (daemonAuth registers the
   *  slot's wiki/draft bags; sentinels read from the assembled daemon doc). */
  openDaemon:    (a: { assembly: VesselCoreAssembly; slot: VesselWikiSlot }) => Promise<VesselDaemonVm>;
  /** Wire the vessel's verb plane (capability piece; relay holds more). */
  wireVerbs?:   (registry: VerbTable, assembly: VesselCoreAssembly) => void;
  /** Capability hook AFTER daemon VM lives (node: arm the inbound gate). */
  afterDaemon?:  (daemon: VesselDaemonVm, assembly: VesselCoreAssembly) => void;
  /** Build the island pool (platform: VesselIslandPool ↔ BrowserVesselIslandPool). */
  makePool:     (daemon: VesselDaemonVm, assembly: VesselCoreAssembly) => TPool | Promise<TPool>;
  /** Capability hook AFTER `live` (browser: broadcast presence). */
  afterLive?:   (ctx: { pool: TPool; assembly: VesselCoreAssembly; wikiHandle: DocHandle<LarDoc> }) => void;
}

export interface VesselCoreResult<TPool extends PrimaryMountPool> {
  repo:         Repo;
  assembly:     VesselCoreAssembly;
  pool:         TPool;
  daemon:        VesselDaemonVm;
  wikiHandle:   DocHandle<LarDoc>;
  draftHandle:  DocHandle<LarDoc>;
}

/** The wiki-slot layers the wiki cap exposes (the write + draft handles). */
export interface WikiSlotComponent {
  readonly wikiHandle:  DocHandle<LarDoc>;
  readonly draftHandle: DocHandle<LarDoc>;
}

/** The cap-ids that name a core cap-module in a vessel's #has-cap-stack (shared by node + browser). */
export const CORE_CAP = {
  substrate: "substrate",
  wikislot:  "wikislot",
  daemon:    "daemon",
  wiki:      "wiki",
  pool:      "pool",
  mount:     "mount",
} as const;

// ── the SHARED floor caps (both the full vessel and the Herm compose over these two) ─────────────

/** substrate — the shared keel floor: assembleVessel (composite cascade → genesis @oracle island →
 *  @lares/@lararium canon → social plane @identities/@groups/@sessions/@daemon/@persona + corpora).
 *  Emits island-ready/corpus-ready INSIDE assembleVessel. */
export function substrateCap(keel: VesselKeel): CapModule {
  return { id: CORE_CAP.substrate, build: () => assembleVessel(keel) };
}

export interface DaemonCapDeps {
  /** Open the platform @daemon VM. `slot` ABSENT (herm) → the builder omits the user-wiki bags from
   *  daemonAuth.registerBags (the decouple); the @daemon's own bag (bootstrap.daemonUrl) stays. */
  readonly openDaemon:   (a: { assembly: VesselCoreAssembly; slot?: VesselWikiSlot }) => Promise<VesselDaemonVm>;
  readonly wireVerbs?:   (registry: VerbTable, assembly: VesselCoreAssembly) => void;
  readonly afterDaemon?: (daemon: VesselDaemonVm, assembly: VesselCoreAssembly) => void;
}

/** daemon — the IMMUNE CORE, present in BOTH stacks. Requires substrate; OPTIONALLY routes the wiki
 *  slot (absent in herm → `slot` resolves undefined, the decouple). Wires the main verb plane + the
 *  after-daemon capability hook in place. */
export function daemonCap(deps: DaemonCapDeps): CapModule {
  return {
    id: CORE_CAP.daemon, requires: [CORE_CAP.substrate], optional: [CORE_CAP.wikislot],
    build: async (resolve) => {
      const assembly = resolve<VesselCoreAssembly>(CORE_CAP.substrate);
      const slot     = resolve<VesselWikiSlot | undefined>(CORE_CAP.wikislot);  // undefined in the herm stack
      const daemon   = await deps.openDaemon(slot ? { assembly, slot } : { assembly });
      const registry = new VerbTable();
      deps.wireVerbs?.(registry, assembly);
      daemon.mountMainVerbs(registry);
      deps.afterDaemon?.(daemon, assembly);
      return daemon;
    },
  };
}

// ── the full-vessel-only caps (the wiki-slot tail the Herm never declares) ───────────────────────

/** wikislot — resolve the active-wiki slot identity AFTER the keel assembles (post-genesis slug from
 *  the daemon-doc marker). Requires substrate. */
export function wikiSlotCap<TPool extends PrimaryMountPool>(o: VesselOrchestration<TPool>): CapModule {
  return {
    id: CORE_CAP.wikislot, requires: [CORE_CAP.substrate],
    build: async (resolve) => {
      const assembly = resolve<VesselCoreAssembly>(CORE_CAP.substrate);
      return o.wikiSlot(assembly);
    },
  };
}

/** wiki — mount the wiki-slot layers. The @lares-as-wiki quine: when the active slug opens the
 *  invariant bag itself, seat the operator-minted doc as the write layer. Requires substrate +
 *  wikislot. Emits wiki-ready/vessel-ready. */
export function wikiCap<TPool extends PrimaryMountPool>(o: VesselOrchestration<TPool>): CapModule {
  return {
    id: CORE_CAP.wiki, requires: [CORE_CAP.substrate, CORE_CAP.wikislot],
    build: async (resolve): Promise<WikiSlotComponent> => {
      const emit     = (p: LarOpenPhase) => o.keel.onPhase?.(p);
      const assembly = resolve<VesselCoreAssembly>(CORE_CAP.substrate);
      const slot     = resolve<VesselWikiSlot>(CORE_CAP.wikislot);
      const presetWiki = slot.wikiBagId === LARES_DOC_URI ? assembly.laresHandle ?? undefined : undefined;
      const { wikiHandle, draftHandle } = await mountWikiSlot(o.keel, assembly.composite, slot, presetWiki);
      emit("wiki-ready");
      emit("vessel-ready");
      return { wikiHandle, draftHandle };
    },
  };
}

/** pool — build the platform island pool (VesselIslandPool ↔ BrowserVesselIslandPool). Requires
 *  substrate + daemon (the pool drives the daemon-resolved bindings). */
export function poolCap<TPool extends PrimaryMountPool>(o: VesselOrchestration<TPool>): CapModule {
  return {
    id: CORE_CAP.pool, requires: [CORE_CAP.substrate, CORE_CAP.daemon],
    build: async (resolve): Promise<TPool> => {
      const assembly = resolve<VesselCoreAssembly>(CORE_CAP.substrate);
      const daemon   = resolve<VesselDaemonVm>(CORE_CAP.daemon);
      return o.makePool(daemon, assembly);
    },
  };
}

/** mount — the daemon-first sovereignty gate → primary-wiki mount → live. Requires the whole keel
 *  (substrate, wikislot, daemon, wiki, pool) so the topo-sort builds it LAST. The `await
 *  daemon.workerEa` gate stays INSIDE this cap, ahead of mountPrimaryWiki (the invariant). Emits
 *  tw5-booted/live, then the after-live capability hook. */
export function mountCap<TPool extends PrimaryMountPool>(o: VesselOrchestration<TPool>): CapModule {
  return {
    id: CORE_CAP.mount,
    requires: [CORE_CAP.substrate, CORE_CAP.wikislot, CORE_CAP.daemon, CORE_CAP.wiki, CORE_CAP.pool],
    build: async (resolve): Promise<void> => {
      const emit     = (p: LarOpenPhase) => o.keel.onPhase?.(p);
      const assembly = resolve<VesselCoreAssembly>(CORE_CAP.substrate);
      const slot     = resolve<VesselWikiSlot>(CORE_CAP.wikislot);
      const daemon   = resolve<VesselDaemonVm>(CORE_CAP.daemon);
      const { wikiHandle } = resolve<WikiSlotComponent>(CORE_CAP.wiki);
      const pool     = resolve<TPool>(CORE_CAP.pool);

      // ── daemon-first sovereignty gate → primary-wiki mount ──
      await daemon.workerEa;
      await mountPrimaryWiki(pool, daemon.resolveBinding, {
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
    },
  };
}

/**
 * composeCoreVessel — run the one vessel boot as a GRANULAR #has-cap-stack on either substrate.
 * composeVessel topologically wires substrate → wikislot → daemon → wiki → pool → mount (the exact
 * monolith order), then this extracts the few entry-points the boot needs and drops the broad
 * composer authority (the powerbox guard). The daemon-first gate holds inside the mount cap.
 */
export async function composeCoreVessel<TPool extends PrimaryMountPool>(
  o: VesselOrchestration<TPool>,
  extraCaps: readonly CapModule[] = [], // role caps composed ALONGSIDE the core (e.g. meshpalace+carriage → a hearth that also navigates the mesh)
): Promise<VesselCoreResult<TPool>> {
  const vessel = await composeVessel([
    substrateCap(o.keel),
    wikiSlotCap(o),
    daemonCap({
      // The full vessel ALWAYS resolves the slot first (wikislot is in the stack) → bridge the
      // shared optional-slot daemon cap to this recipe's required-slot openDaemon.
      openDaemon: (a) => o.openDaemon({ assembly: a.assembly, slot: a.slot! }),
      ...(o.wireVerbs   ? { wireVerbs:   o.wireVerbs   } : {}),
      ...(o.afterDaemon ? { afterDaemon: o.afterDaemon } : {}),
    }),
    wikiCap(o),
    poolCap(o),
    mountCap(o),
    ...extraCaps, // the hearth caps above ride ON the floor every vessel stands; these add its role (carriage, WHO)
  ]);

  const assembly = vessel.get<VesselCoreAssembly>(CORE_CAP.substrate)!;
  const daemon   = vessel.get<VesselDaemonVm>(CORE_CAP.daemon)!;
  const pool     = vessel.get<TPool>(CORE_CAP.pool)!;
  const { wikiHandle, draftHandle } = vessel.get<WikiSlotComponent>(CORE_CAP.wiki)!;

  return { repo: assembly.repo, assembly, pool, daemon, wikiHandle, draftHandle };
}
