/**
 * open-vessel-core — the ONE composable vessel, in code (mesh-resident).
 *
 * Canon: lar:///ha.ka.ba/lararium/mesh/open-vessel. A vessel IS a composition:
 * a keel naming which sovereign pieces it carries + the few substrate values each
 * resolves native-first. Node and browser differ ONLY in capabilities, never in
 * structure (Ink & Switch): both walk this ONE protocol sequence.
 *
 * VM-FREE by design — this owns the substrate-level keel (composite cascade,
 * genesis island layer, social plane, daemon doc, wiki-slot layers), so it lives in
 * mesh, NOT tw5. The VM-focused pieces (daemon-VM spawn, primary-wiki mount, island
 * pool) stay in the platform keel / tw5. The one tw5-class the keel needs — the
 * volatile temp store — injects as `tempStore`, so mesh holds zero tw5 dep.
 *
 * NO `if (platform)` enters here. A capability the keel omits simply does not run.
 * The shore for every capability stays open on both substrates so the browser SHALL
 * grow into init/PersonaGroup/genesis/corpus/residency.
 */

import type { Repo, DocHandle, AutomergeUrl } from "@automerge/automerge-repo";
import type { LarOpenPhase } from "./lararium-vessel.js";
import { CompositeStore } from "./composite-store.js";
import type { LarTiddlerStore } from "./tiddler-store.js";
import { AutomergeDocStore } from "./automerge-doc-store.js";
import { emptyLarDoc, mutableLarRecord, tiddlerText, resolveOracleDoc, type LarDoc } from "./base-doc.js";
import { personaSiblingBagIds } from "./persona-scope.js";
import { BAG_IDS, DAEMON_BAG_ID, ORACLE_DOC_URI, LARES_DOC_URI, LARARIUM_DOC_URI } from "./lar-uris.js";
import type { PersonaPlaneRef } from "./persona-planes.js";
import { wikiSlotUri } from "./wiki-recipe.js";
import { resolveBootDoc, isStillJoining } from "./boot-resolver.js";
import { isCondemned, type DocLoadProbe, type ProbeResult } from "./doc-load-probe-contract.js";

/**
 * The doc URLs a vessel's bootstrap resolves.
 *
 * ONLY `daemonUrl` stands required. A founding stands a PLACE first — @daemon, the vessel's own Keyhive
 * individual, the hearth-true-name — and the FACE lands later by an operator act, so a vessel that carries
 * and serves while holding no persona names NO social plane here. Absence reads as the waking floor, never
 * as a torn founding: the boot path refuses a HALF face (some pins standing, others absent) exactly as
 * `bootDaemonKeyhive` does, so fewer caps never buys a softened gate.
 */
export interface VesselBootstrap {
  identitiesUrl?: string;
  circlesUrl?:   string;
  sessionsUrl?:  string;
  daemonUrl:      string;
  /** The mounted PersonaGroup plane's doc URL — founded alongside @daemon. */
  personaUrl?:    string;
  /**
   * The mounted plane's BAG ID, derived from that PersonaGroup's own doc id (`personaBagIdFor`).
   *
   * It travels beside the url rather than being recomputed here, because a vessel resolves "the plane I
   * stand in" ONCE — at the boot path that reads its own sentinels — and everything downstream carries the
   * absolute name (persona-planes, and canon at persona-circle#the-plane-name).
   */
  personaBagId?:  string;
  /**
   * EVERY PersonaGroup plane this vessel carries — the one it mounts among them, and the rest it merely
   * holds. Registration walks all of them; the mount takes exactly one (`persona-planes`).
   */
  personaPlanes:  readonly PersonaPlaneRef[];
}

/**
 * VesselKeel — the composition a vessel supplies. NOT a host port: a record of the
 * substrate atoms each sovereign piece resolves native-first + the capability pieces
 * the vessel currently holds. Closures own their substrate; the core never branches.
 */
export interface VesselKeel {
  // ── substrate atoms (resolved native-first by each piece) ──
  repo:          Repo;
  catalogHandle: DocHandle<LarDoc>;
  /** Resolve-or-fallback a doc handle (the unified allowableStates strategy, D2). */
  waitHandle:    <T>(url: AutomergeUrl, fallback: () => DocHandle<T>) => Promise<DocHandle<T>>;
  /** Genesis island piece → handle + coreHash + the social-plane bootstrap it carries.
   *  Genesis REQUIRED (coreless boot deleted) — the vessel derives bootstrap from the
   *  island (or the init JSON) here, so it resolves together with genesis, not before. */
  loadGenesis:   () => Promise<{ islandHandle: DocHandle<LarDoc>; coreHash: string; bootstrap: VesselBootstrap }>;
  /** The volatile temp store (a LarTiddlerStore — node/browser pass MemoryTiddlerStore). */
  tempStore:     () => LarTiddlerStore;

  // ── capability pieces (absent = not-yet-held; the shore stays open) ──
  loadCorpora?:  (composite: CompositeStore) => Promise<void>;
  /** L1/L2: probe a social-plane doc's load in a disposable boundary AHEAD of the live
   *  repo materializing it. Absent = skip the probe (the doc resolves straight through —
   *  the pre-hardening path). The node injects a child_process probe; a browser a Worker. */
  docLoadProbe?: DocLoadProbe;
  /** L2: quarantine a condemned doc — the platform MOVES its bytes aside (nodefs rename /
   *  IndexedDB key-drop). Fires only when the probe condemns. */
  quarantineDoc?: (result: ProbeResult) => void;
  /** L3: attempt a clean-tail recovery of a condemned doc AHEAD of quarantine — the platform
   *  verifies the doc's clean record-prefix loads in isolation, MOVES only the torn tail aside
   *  (keeping the verified prefix), and returns the re-verified `status:"ok"` verdict. Returns
   *  null when the base itself is torn (unrecoverable — the whole-doc quarantine still fires).
   *  Absent = no recovery; every condemn falls straight to quarantine, as before. */
  recoverCleanTail?: (result: ProbeResult) => Promise<ProbeResult | null>;

  // ── opts ──
  onPhase?:      (p: LarOpenPhase) => void;
}

/** One social-plane doc's boot outcome — mounted live, promoted from a clean-tail recovery,
 *  or mounted degraded (read-only blank). */
export interface MountEntry {
  readonly bagId: string;
  readonly documentId: string;
  readonly status: "mounted" | "promoted" | "degraded";
  /** names the condemnation when status=degraded, or the clean-tail cut when status=promoted. */
  readonly reason?: string;
}

/** The degraded-boot manifest — what mounted live, what came up read-only after a condemn. */
export interface MountManifest {
  readonly entries: readonly MountEntry[];
  /** true once any plane mounts degraded — a live-but-not-write-ready vessel. */
  readonly degraded: boolean;
}

/** What the keel assembles before the wiki recipe mounts daemon + wiki. */
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
  /** L2: which social planes mounted live vs degraded (read-only after a condemn). */
  mountManifest: MountManifest;
}

/** Strip the `automerge:` scheme, leaving the documentId the storage path shards on. */
function documentIdFromUrl(url: string): string {
  return url.startsWith("automerge:") ? url.slice("automerge:".length) : url;
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
 * The phase sequence holds invariant; each piece resolves its substrate via the keel.
 */
export async function assembleVessel(keel: VesselKeel): Promise<VesselCoreAssembly> {
  const { repo, catalogHandle, waitHandle, loadGenesis } = keel;
  const emit = (p: LarOpenPhase) => keel.onPhase?.(p);

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
  // Route symmetry: the base-canon docs above resolve through the graceful tideline
  // resolver; the social plane earns the same discipline here. A `docLoadProbe` (when the
  // keel holds one) materializes each doc in a disposable boundary FIRST — a condemned
  // doc gets quarantined and mounts as a read-only blank (writable:false, so no write forks
  // into the placeholder), and the manifest marks the vessel degraded. Absent a probe, the
  // doc resolves straight through, as before.
  const resolve = (url: AutomergeUrl) => waitHandle<LarDoc>(url, () => blankDoc(repo));
  const entries: MountEntry[] = [];
  let degraded = false;
  const mountSocial = async (bagId: string, url: string): Promise<void> => {
    const documentId = documentIdFromUrl(url);
    if (keel.docLoadProbe) {
      const verdict = await keel.docLoadProbe.probe(documentId);
      if (isCondemned(verdict)) {
        // L3 — before condemning the whole doc, try a clean-tail recovery: verify the doc's
        // clean record-prefix loads in isolation, then drop only the torn tail. A promoted
        // doc mounts WRITABLE from its verified prefix (a suffix of edits lost, never a tear
        // kept), and the vessel stays whole. Only a torn base (null) falls through.
        const promoted = keel.recoverCleanTail ? await keel.recoverCleanTail(verdict) : null;
        if (promoted && !isCondemned(promoted)) {
          composite.addLayer({ bagId, store: new AutomergeDocStore(await resolve(url as AutomergeUrl), bagId), writable: true });
          const cut = promoted.cleanTail;
          entries.push({ bagId, documentId, status: "promoted", reason: cut ? `clean-tail: kept ${cut.kept}, moved ${cut.movedAside.length} aside` : "clean-tail recovery" });
          return;
        }
        keel.quarantineDoc?.(verdict);
        degraded = true;
        entries.push({ bagId, documentId, status: "degraded", reason: `${verdict.status}: ${verdict.reason ?? ""}`.trim() });
        // Read-only blank stands in — the plane reads empty until L4 rematerializes it,
        // and no write forks a placeholder the real doc will later reconcile against.
        composite.addLayer({ bagId, store: new AutomergeDocStore(blankDoc(repo), bagId), writable: false });
        return;
      }
    }
    composite.addLayer({ bagId, store: new AutomergeDocStore(await resolve(url as AutomergeUrl), bagId), writable: true });
    entries.push({ bagId, documentId, status: "mounted" });
  };
  // A PLACE names no social plane, so each mount rides its own url standing. A faceless vessel carries
  // and serves with these absent — the waking floor, reached by founding rather than by falling.
  //
  // THE NAME IS THE INDEX. The three planes that travel with a face answer to names derived off the SAME
  // tag as the persona plane already mounted here, so the plane id in hand yields its own siblings and
  // nothing stores a second copy to drift from. A vessel that names no persona plane names none of them.
  const face = bootstrap.personaBagId ? personaSiblingBagIds(bootstrap.personaBagId) : null;
  if (face) {
    if (bootstrap.identitiesUrl) await mountSocial(face.identities, bootstrap.identitiesUrl);
    if (bootstrap.circlesUrl)    await mountSocial(face.circles,    bootstrap.circlesUrl);
    if (bootstrap.sessionsUrl)   await mountSocial(face.sessions,   bootstrap.sessionsUrl);
  }
  await mountSocial(DAEMON_BAG_ID,      bootstrap.daemonUrl);
  // The PersonaGroup plane this vessel stands in, mounted under its own derived name. Exactly one face
  // mounts: the composite resolves a title by walking layers, so a second writable plane would answer
  // reads meant for the first, in load order — and one face's circles would answer for another's.
  if (bootstrap.personaBagId && bootstrap.personaUrl) {
    await mountSocial(bootstrap.personaBagId, bootstrap.personaUrl);
  }
  const mountManifest: MountManifest = { entries, degraded };

  if (keel.loadCorpora) {
    await keel.loadCorpora(composite);
    emit("corpus-ready");
  }

  return { repo, composite, catalogHandle, islandHandle, laresHandle, larariumHandle, coreHash, mountManifest };
}

/**
 * Mount the wiki-slot composite layers (D5: every vessel carries wiki + draft +
 * temp; the island still owns live VM state). Returns the handles for the mount.
 */
export async function mountWikiSlot(
  keel: VesselKeel,
  composite: CompositeStore,
  slot: { wikiSlug: string; wikiKey: string; wikiBagId: string; draftOracleTitle: string; draftBagId: string },
  /** Pre-resolved wiki doc — the @lares-as-wiki quine seats the operator-minted
   *  invariant doc as the write layer (its oracle lives on the @lararium doc,
   *  never in @catalog — no cross-plane resolution, no second mint). */
  presetWikiHandle?: DocHandle<LarDoc>,
): Promise<{ wikiHandle: DocHandle<LarDoc>; draftHandle: DocHandle<LarDoc> }> {
  const { repo, catalogHandle, waitHandle } = keel;
  // Resolve the CANON doc by its content key (bags/{slug}) — where the mint
  // writer keys it. The wiki IDENTITY (wikis/{slug}, slot.wikiKey) is a separate
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

  composite.addLayer({ bagId: wikiSlotUri(slot.wikiSlug, "temp"), store: keel.tempStore(), writable: true, defaultWritable: true });

  return { wikiHandle, draftHandle };
}
