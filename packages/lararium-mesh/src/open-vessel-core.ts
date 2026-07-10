/**
 * open-vessel-core — the ONE composable vessel, in code (mesh-resident).
 *
 * Canon: lar:///ha.ka.ba/lararium/mesh/open-vessel. A vessel IS a composition:
 * a recipe naming which sovereign pieces it carries + the few substrate values each
 * resolves native-first. Node and browser differ ONLY in capabilities, never in
 * structure (Ink & Switch): both walk this ONE protocol sequence.
 *
 * VM-FREE by design — this owns the substrate-level keel (composite cascade,
 * genesis island layer, social plane, daemon doc, wiki-slot layers), so it lives in
 * mesh, NOT tw5. The VM-focused pieces (daemon-VM spawn, primary-wiki mount, island
 * pool) stay in the platform recipe / tw5. The one tw5-class the keel needs — the
 * volatile temp store — injects as `tempStore`, so mesh holds zero tw5 dep.
 *
 * NO `if (platform)` enters here. A capability the recipe omits simply does not run.
 * The seam for every capability stays open on both substrates so the browser SHALL
 * grow into init/PersonaGroup/genesis/corpus/residency.
 */

import type { Repo, DocHandle, AutomergeUrl } from "@automerge/automerge-repo";
import type { LarOpenPhase } from "./lararium-vessel.js";
import { CompositeStore } from "./composite-store.js";
import type { LarTiddlerStore } from "./tiddler-store.js";
import { AutomergeDocStore } from "./automerge-doc-store.js";
import { emptyLarDoc, mutableLarRecord, tiddlerText, resolveOracleDoc, type LarDoc } from "./base-doc.js";
import { BAG_IDS, DAEMON_BAG_ID, PERSONA_BAG_ID, ORACLE_DOC_URI, LARES_DOC_URI, LARARIUM_DOC_URI } from "./lar-uris.js";
import { wikiSlotUri } from "./wiki-recipe.js";
import { resolveBootDoc, isStillJoining } from "./boot-resolver.js";

/** The social-plane + daemon + persona doc URLs a vessel's bootstrap resolves (founding done). */
export interface VesselBootstrap {
  identitiesUrl: string;
  circlesUrl:    string;
  sessionsUrl:   string;
  daemonUrl:      string;
  /** The @persona (PersonaGroup veiled-identity) doc URL — founded alongside @daemon. */
  personaUrl:     string;
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
  /** Resolve-or-fallback a doc handle (the unified allowableStates strategy, D2). */
  waitHandle:    <T>(url: AutomergeUrl, fallback: () => DocHandle<T>) => Promise<DocHandle<T>>;
  /** Genesis island piece → handle + coreHash + the social-plane bootstrap it carries.
   *  Genesis REQUIRED (coreless boot deleted) — the vessel derives bootstrap from the
   *  island (or the init JSON) here, so it resolves together with genesis, not before. */
  loadGenesis:   () => Promise<{ islandHandle: DocHandle<LarDoc>; coreHash: string; bootstrap: VesselBootstrap }>;
  /** The volatile @temp store (a LarTiddlerStore — node/browser pass MemoryTiddlerStore). */
  tempStore:     () => LarTiddlerStore;

  // ── capability pieces (absent = not-yet-held; the seam stays open) ──
  loadCorpora?:  (composite: CompositeStore) => Promise<void>;

  // ── opts ──
  onPhase?:      (p: LarOpenPhase) => void;
}

/** What the keel assembles before the recipe mounts daemon + wiki. */
export interface VesselCoreAssembly {
  repo:          Repo;
  composite:     CompositeStore;
  catalogHandle: DocHandle<LarDoc>;
  islandHandle:  DocHandle<LarDoc>;
  /** Null until the invariant plane reaches this vessel (node home mints;
   *  wild vessels federate it in). The keel never mints. */
  laresHandle:   DocHandle<LarDoc> | null;
  /** The @lararium memetic corpus — its OWN doc (@oracle/@lararium/@lares
   *  are three separate docs). Pointer rides the
   *  @oracle system plane; null until federated/minted. */
  larariumHandle: DocHandle<LarDoc> | null;
  coreHash:      string;
}

const blankDoc = (repo: Repo): DocHandle<LarDoc> => repo.create<LarDoc>(emptyLarDoc());

/** Canon layer (@lararium / @lares): writable, defaultWritable:false. */
function addSubstrateLayer(composite: CompositeStore, bagId: string, handle: DocHandle<LarDoc>): void {
  composite.addLayer({ bagId, store: new AutomergeDocStore(handle, bagId), writable: true, defaultWritable: false });
}
/** Read-only layer (@catalog, corpus bags). */
function addReadOnlyLayer(composite: CompositeStore, bagId: string, handle: DocHandle<LarDoc>): void {
  composite.addLayer({ bagId, store: new AutomergeDocStore(handle, bagId), writable: false });
}

/**
 * Assemble the shared vessel keel: catalog floor, genesis island canon layer,
 * @lares canon, social plane, daemon doc — plus the corpus capability piece when held.
 * The phase sequence holds invariant; each piece resolves its substrate via the recipe.
 */
export async function assembleVessel(recipe: VesselRecipe): Promise<VesselCoreAssembly> {
  const { repo, catalogHandle, waitHandle, loadGenesis } = recipe;
  const emit = (p: LarOpenPhase) => recipe.onPhase?.(p);

  const composite = new CompositeStore();
  addReadOnlyLayer(composite, BAG_IDS.catalog, catalogHandle);

  // ── genesis island (REQUIRED — coreless boot deleted) + the bootstrap it carries ──
  const { islandHandle, coreHash, bootstrap } = await loadGenesis();
  addSubstrateLayer(composite, BAG_IDS.oracle, islandHandle);
  // @lares — the keel only READS the protocol-invariant oracle. Minting rides
  // the most-restricted grant: operator(admin), timed — held by the node home
  // (genesis office, mintLaresIfAbsent). Wild vessels receive the invariant
  // plane by federating the @lararium doc; absent here reads not-yet-federated,
  // never mint-it-yourself.
  let laresHandle: DocHandle<LarDoc> | null = null;
  const laresUrl = tiddlerText(islandHandle.doc()?.tiddlers?.[LARES_DOC_URI]) ?? null;
  if (laresUrl) {
    // @lares is EXPECTED base canon (the operator's "fail gracefully but expect them"):
    // resolve via the tideline resolver, NOT the blank-mint fallback the comment above
    // forbids. On the node the disk-fed doc resolves READY at once; on a wild vessel whose
    // @lares has not yet federated, a typed StillJoining surfaces — skip the layer, never
    // mint a ghost (it reconciles in the background once a peer at dreamnet-scale delivers it).
    const resolved = await resolveBootDoc<LarDoc>(repo, laresUrl as AutomergeUrl, {
      tideline: "mesh-shared", scale: "dreamnet", label: "@lares (expected base canon)",
    });
    if (!isStillJoining(resolved)) {
      laresHandle = resolved;
      addSubstrateLayer(composite, BAG_IDS.lares, laresHandle);
    }
  }
  // @lararium — the memetic corpus as its OWN doc (three separate docs).
  // Its pointer rides the @oracle system plane (the island
  // doc), resolved the same way as @lares — never the conflated island URL. The
  // wiki-cascade composition (corpus as a library in a recipe) rides the island
  // composite via recipe-watch; this keel layer carries vessel-level access.
  let larariumHandle: DocHandle<LarDoc> | null = null;
  const larariumUrl = tiddlerText(islandHandle.doc()?.tiddlers?.[LARARIUM_DOC_URI]) ?? null;
  if (larariumUrl) {
    // @lararium base canon — same expected-but-graceful resolution as @lares (never mint).
    const resolved = await resolveBootDoc<LarDoc>(repo, larariumUrl as AutomergeUrl, {
      tideline: "mesh-shared", scale: "dreamnet", label: "@lararium (expected base canon)",
    });
    if (!isStillJoining(resolved)) {
      larariumHandle = resolved;
      addSubstrateLayer(composite, BAG_IDS.lararium, larariumHandle);
    }
  }
  const existingRef = tiddlerText(catalogHandle.doc()?.tiddlers?.[ORACLE_DOC_URI]) ?? null;
  if (existingRef !== islandHandle.url) {
    catalogHandle.change((doc) => {
      doc.tiddlers[ORACLE_DOC_URI] = mutableLarRecord(ORACLE_DOC_URI, { text: islandHandle.url }, "vessel-boot");
    });
  }
  // @lares does NOT register in @catalog: it rides the protocol-invariant
  // plane with @lararium (DreamNet federation floor). Islands resolve it from
  // the @lararium doc's well-known tiddlers — the substrate they already hold.
  // @catalog serves USER bag oracles (ocap grants); @crossroads (future) serves
  // public/infrastructure oracles. Three planes, three authorities.
  emit("island-ready");

  // ── social plane (resolveHandle encodes the seed policy) + daemon doc ──
  const resolve = (url: AutomergeUrl) => waitHandle<LarDoc>(url, () => blankDoc(repo));
  composite.addLayer({ bagId: BAG_IDS.identities, store: new AutomergeDocStore(await resolve(bootstrap.identitiesUrl as AutomergeUrl), BAG_IDS.identities), writable: true });
  composite.addLayer({ bagId: BAG_IDS.groups,     store: new AutomergeDocStore(await resolve(bootstrap.circlesUrl    as AutomergeUrl), BAG_IDS.groups),     writable: true });
  composite.addLayer({ bagId: BAG_IDS.sessions,   store: new AutomergeDocStore(await resolve(bootstrap.sessionsUrl   as AutomergeUrl), BAG_IDS.sessions),   writable: true });
  composite.addLayer({ bagId: DAEMON_BAG_ID,       store: new AutomergeDocStore(await resolve(bootstrap.daemonUrl      as AutomergeUrl), DAEMON_BAG_ID),       writable: true });
  // @persona — the operator's veiled-identity bag (PersonaGroup), founded alongside @daemon.
  composite.addLayer({ bagId: PERSONA_BAG_ID,      store: new AutomergeDocStore(await resolve(bootstrap.personaUrl     as AutomergeUrl), PERSONA_BAG_ID),      writable: true });

  if (recipe.loadCorpora) {
    await recipe.loadCorpora(composite);
    emit("corpus-ready");
  }

  return { repo, composite, catalogHandle, islandHandle, laresHandle, larariumHandle, coreHash };
}

/**
 * Mount the wiki-slot composite layers (D5: every vessel carries wiki + draft +
 * temp; the island still owns live VM state). Returns the handles for the mount.
 */
export async function mountWikiSlot(
  recipe: VesselRecipe,
  composite: CompositeStore,
  slot: { wikiSlug: string; wikiKey: string; wikiBagId: string; draftOracleTitle: string; draftBagId: string },
  /** Pre-resolved wiki doc — the @lares-as-wiki quine seats the operator-minted
   *  invariant doc as the write layer (its oracle lives on the @lararium doc,
   *  never in @catalog — no cross-plane resolution, no second mint). */
  presetWikiHandle?: DocHandle<LarDoc>,
): Promise<{ wikiHandle: DocHandle<LarDoc>; draftHandle: DocHandle<LarDoc> }> {
  const { repo, catalogHandle, waitHandle } = recipe;
  // Resolve the CANON doc by its content key (bags/@{slug}) — where the mint
  // writer keys it. The wiki IDENTITY (wikis/@{slug}, slot.wikiKey) is a separate
  // registry entry, not the canon-doc lookup.
  const wikiHandle = presetWikiHandle ?? await resolveOracleDoc(
    catalogHandle, slot.wikiBagId,
    (url) => url ? waitHandle<LarDoc>(url as AutomergeUrl, () => blankDoc(repo)) : blankDoc(repo),
    "vessel-boot",
  );
  // When the wiki's own bag coincides with an already-mounted substrate layer
  // (the quine), the read-only substrate layer yields to the writable one.
  if (composite.hasBag(slot.wikiBagId)) composite.removeLayer(slot.wikiBagId);
  composite.addLayer({ bagId: slot.wikiBagId, store: new AutomergeDocStore(wikiHandle, slot.wikiBagId), writable: true, defaultWritable: true });

  const draftHandle = await resolveOracleDoc(
    catalogHandle, slot.draftOracleTitle,
    (url) => url ? waitHandle<LarDoc>(url as AutomergeUrl, () => blankDoc(repo)) : blankDoc(repo),
    "vessel-boot",
  );
  composite.addLayer({ bagId: slot.draftBagId, store: new AutomergeDocStore(draftHandle, slot.draftBagId), writable: true, defaultWritable: false });

  composite.addLayer({ bagId: wikiSlotUri(slot.wikiSlug, "temp"), store: recipe.tempStore(), writable: true, defaultWritable: true });

  return { wikiHandle, draftHandle };
}
