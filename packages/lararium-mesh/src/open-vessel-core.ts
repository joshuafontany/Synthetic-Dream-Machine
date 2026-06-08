/**
 * open-vessel-core — the ONE composable vessel, in code (mesh-resident).
 *
 * Canon: lar:///ha.ka.ba/@lararium/v0.1/mesh/open-vessel. A vessel IS a composition:
 * a recipe naming which sovereign pieces it carries + the few substrate values each
 * resolves native-first. Node and browser differ ONLY in capabilities, never in
 * structure (Ink & Switch): both walk this ONE protocol sequence.
 *
 * VM-FREE by design — this owns the substrate-level keel (composite cascade,
 * genesis island layer, social plane, admin doc, wiki-slot layers), so it lives in
 * mesh, NOT tw5. The VM-focused pieces (admin-VM spawn, primary-wiki mount, island
 * pool) stay in the platform recipe / tw5. The one tw5-class the keel needs — the
 * volatile temp store — injects as `tempStore`, so mesh holds zero tw5 dep.
 *
 * NO `if (platform)` enters here. A capability the recipe omits simply does not run.
 * The seam for every capability stays open on both substrates so the browser SHALL
 * grow into init/PersonGroup/genesis/corpus/residency.
 */

import type { Repo, DocHandle, AutomergeUrl } from "@automerge/automerge-repo";
import type { LarOpenPhase } from "./lararium-vessel.js";
import { CompositeStore } from "./composite-store.js";
import type { LarTiddlerStore } from "./tiddler-store.js";
import { AutomergeDocStore } from "./automerge-doc-store.js";
import { emptyLarDoc, mutableLarRecord, tiddlerText, resolveOracleDoc, type LarDoc } from "./base-doc.js";
import { BAG_IDS, ADMIN_BAG_ID, LARARIUM_DOC_URI, LARES_DOC_URI } from "./lar-uris.js";
import { TEMP_BAG } from "./wiki-recipe.js";

/** The social-plane + admin doc URLs a vessel's bootstrap resolves (founding done). */
export interface VesselBootstrap {
  identitiesUrl: string;
  circlesUrl:    string;
  sessionsUrl:   string;
  adminUrl:      string;
}

/**
 * VesselRecipe — the composition a vessel supplies. NOT a host port: a record of the
 * substrate atoms each sovereign piece resolves native-first + the capability pieces
 * the vessel currently holds. Closures own their substrate; the core never branches.
 */
export interface VesselRecipe {
  // ── substrate atoms (resolved native-first by each piece) ──
  repo:          Repo;
  catalogHandle: DocHandle<LarDoc>;
  bootstrap:     VesselBootstrap;
  /** Resolve-or-fallback a doc handle (the unified allowableStates strategy, D2). */
  waitHandle:    <T>(url: AutomergeUrl, fallback: () => DocHandle<T>) => Promise<DocHandle<T>>;
  /** Genesis island piece → handle + coreHash. Null islandHandle = coreless boot
   *  (pre-sovereign, D6/D19 — held open). */
  loadGenesis:   () => Promise<{ islandHandle: DocHandle<LarDoc> | null; coreHash: string | null }>;
  /** The volatile @temp store (a LarTiddlerStore — node/browser pass MemoryTiddlerStore). */
  tempStore:     () => LarTiddlerStore;

  // ── capability pieces (absent = not-yet-held; the seam stays open) ──
  loadCorpora?:  (composite: CompositeStore) => Promise<void>;

  // ── opts ──
  onPhase?:      (p: LarOpenPhase) => void;
}

/** What the keel assembles before the recipe mounts admin + wiki. */
export interface VesselCoreAssembly {
  repo:          Repo;
  composite:     CompositeStore;
  catalogHandle: DocHandle<LarDoc>;
  islandHandle:  DocHandle<LarDoc> | null;
  laresHandle:   DocHandle<LarDoc> | null;
  coreHash:      string | null;
}

const blankDoc = (repo: Repo): DocHandle<LarDoc> => repo.create<LarDoc>(emptyLarDoc());

/** Canon layer (@lararium / @lares): writable, defaultWritable:false. */
function addCanonLayer(composite: CompositeStore, bagId: string, handle: DocHandle<LarDoc>): void {
  composite.addLayer({ bagId, store: new AutomergeDocStore(handle, bagId), writable: true, defaultWritable: false });
}
/** Read-only layer (@catalog, corpus bags). */
function addReadOnlyLayer(composite: CompositeStore, bagId: string, handle: DocHandle<LarDoc>): void {
  composite.addLayer({ bagId, store: new AutomergeDocStore(handle, bagId), writable: false });
}

/**
 * Assemble the shared vessel keel: catalog floor, genesis island canon layer,
 * @lares canon, social plane, admin doc — plus the corpus capability piece when held.
 * The phase sequence holds invariant; each piece resolves its substrate via the recipe.
 */
export async function assembleVessel(recipe: VesselRecipe): Promise<VesselCoreAssembly> {
  const { repo, catalogHandle, bootstrap, waitHandle, loadGenesis } = recipe;
  const emit = (p: LarOpenPhase) => recipe.onPhase?.(p);

  const composite = new CompositeStore();
  addReadOnlyLayer(composite, BAG_IDS.catalog, catalogHandle);

  // ── genesis island piece (coreless boot held open) ──
  const { islandHandle, coreHash } = await loadGenesis();
  let laresHandle: DocHandle<LarDoc> | null = null;
  if (islandHandle) {
    addCanonLayer(composite, BAG_IDS.lararium, islandHandle);
    const laresUrl = tiddlerText(islandHandle.doc()?.tiddlers?.[LARES_DOC_URI]) ?? null;
    if (laresUrl) {
      laresHandle = await waitHandle<LarDoc>(laresUrl as AutomergeUrl, () => blankDoc(repo));
      addCanonLayer(composite, BAG_IDS.lares, laresHandle);
    }
    const existingRef = tiddlerText(catalogHandle.doc()?.tiddlers?.[LARARIUM_DOC_URI]) ?? null;
    if (existingRef !== islandHandle.url) {
      catalogHandle.change((doc) => {
        doc.tiddlers[LARARIUM_DOC_URI] = mutableLarRecord(LARARIUM_DOC_URI, { text: islandHandle.url }, "vessel-boot");
      });
    }
    emit("island-ready");
  }

  // ── social plane (resolveHandle encodes the seed policy) + admin doc ──
  const resolve = (url: AutomergeUrl) => waitHandle<LarDoc>(url, () => blankDoc(repo));
  composite.addLayer({ bagId: BAG_IDS.identities, store: new AutomergeDocStore(await resolve(bootstrap.identitiesUrl as AutomergeUrl), BAG_IDS.identities), writable: true });
  composite.addLayer({ bagId: BAG_IDS.groups,     store: new AutomergeDocStore(await resolve(bootstrap.circlesUrl    as AutomergeUrl), BAG_IDS.groups),     writable: true });
  composite.addLayer({ bagId: BAG_IDS.sessions,   store: new AutomergeDocStore(await resolve(bootstrap.sessionsUrl   as AutomergeUrl), BAG_IDS.sessions),   writable: true });
  composite.addLayer({ bagId: ADMIN_BAG_ID,       store: new AutomergeDocStore(await resolve(bootstrap.adminUrl      as AutomergeUrl), ADMIN_BAG_ID),       writable: true });

  if (recipe.loadCorpora) {
    await recipe.loadCorpora(composite);
    emit("corpus-ready");
  }

  return { repo, composite, catalogHandle, islandHandle, laresHandle, coreHash };
}

/**
 * Mount the wiki-slot composite layers (D5: every vessel carries wiki + draft +
 * temp; the island still owns live VM state). Returns the handles for the mount.
 */
export async function mountWikiSlot(
  recipe: VesselRecipe,
  composite: CompositeStore,
  slot: { wikiKey: string; wikiBagId: string; draftOracleTitle: string; draftBagId: string },
): Promise<{ wikiHandle: DocHandle<LarDoc>; draftHandle: DocHandle<LarDoc> }> {
  const { repo, catalogHandle, waitHandle } = recipe;
  const wikiHandle = await resolveOracleDoc(
    catalogHandle, slot.wikiKey,
    (url) => url ? waitHandle<LarDoc>(url as AutomergeUrl, () => blankDoc(repo)) : blankDoc(repo),
    "vessel-boot",
  );
  composite.addLayer({ bagId: slot.wikiBagId, store: new AutomergeDocStore(wikiHandle, slot.wikiBagId), writable: true, defaultWritable: true });

  const draftHandle = await resolveOracleDoc(
    catalogHandle, slot.draftOracleTitle,
    (url) => url ? waitHandle<LarDoc>(url as AutomergeUrl, () => blankDoc(repo)) : blankDoc(repo),
    "vessel-boot",
  );
  composite.addLayer({ bagId: slot.draftBagId, store: new AutomergeDocStore(draftHandle, slot.draftBagId), writable: true, defaultWritable: false });

  composite.addLayer({ bagId: TEMP_BAG, store: recipe.tempStore(), writable: true, defaultWritable: true });

  return { wikiHandle, draftHandle };
}
