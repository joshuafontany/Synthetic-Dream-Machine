/**
 * openNodeVessel — local-first Node.js vessel factory.
 *
 * Boot sequence — Automerge Tiga + leaves (authority-first-sync-order):
 *   1. Repo     — NodeFS storage + WebSocket relay
 *   2. ka opens — LarDoc: URL registry (wikis, corpora, engine)
 *   3. ha opens — LarDoc: system bag                           [from catalog.larariumDoc]
 *   4. ba opens — LaresDoc: personality bag                         [from ha oracle tiddler]
 *   5. Corpus*  — per-corpus bags from catalog.corpora[*]           [async, non-blocking]
 *   6. Wiki     — situated content, writable                        [wiki bag]
 *   7. Drafts   — per-user draft sync                               [draft bag]
 *
 *   CompositeStore: system → lares → corpus:* → wiki(writable) → draft(writable)
 *   LarVessel: store = wiki AutomergeDocStore, composite = full CompositeStore
 *
 * The node vessel holds no semantic privilege. It carries roads, docks, and sync;
 * it does not adjudicate content truth or wiki ritual meaning.
 * Multiple wikis → multiple openNodeVessel calls, one LarVessel per DocHandle.
 *
 * FPI-5 (trim tab): all Node-specific code lives here.
 *
 * Boot phases: 10 LarOpenPhase transitions emitted; see LarOpenPhase in @lararium/mesh.
 * waitHandleLocal: uses DocHandle.merge() (present in @automerge/automerge-repo@2.5.5).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname }                from "path";
import { fileURLToPath }                from "url";
import type { DocHandle, AutomergeUrl } from "@automerge/automerge-repo";
import { Repo }                         from "@automerge/automerge-repo";
import { NodeFSStorageAdapter }         from "@automerge/automerge-repo-storage-nodefs";
import { NodeWSServerAdapter }          from "@automerge/automerge-repo-network-websocket";
import type { WebSocketServer }         from "isomorphic-ws";
import type {
  LarDoc,
  LarariumVesselOptions, LarariumVesselResult, LarOpenPhase,
} from "@lararium/mesh";
import {
  LarVessel, LAR_VESSEL_CAPABILITIES_NODE, OpenIdentitySlot,
  AutomergeDocStore,
  CompositeStore, corpusBagId,
  emptyLarDoc, mutableLarRecord, tiddlerText,
  LARARIUM_DOC_URI, CATALOG_DOC_URI, LARES_DOC_URI,
  IDENTITIES_DOC_URI, CIRCLES_DOC_URI, SESSIONS_DOC_URI, ADMIN_BAG_ID,
  corpusLarUri, catalogCorpusEntryUri, CATALOG_CORPUS_PREFIX,
  wikiLarUri, wikiDraftLarUri, BAG_IDS, TEMP_BAG,
  PERSON_GROUP_DOC_ID_TIDDLER, PERSON_GROUP_AGENT_ID_TIDDLER, MESH_CABAL_DOC_ID_TIDDLER,
  ENGINE_CORE_ID,
}                                       from "@lararium/mesh";
import type { LarTiddlerRecord } from "@lararium/mesh";
import { toLarTiddlerRecord } from "@lararium/mesh";
import {
  ACTIVE_WIKI_URI,
  MemoryTiddlerStore,
  planActiveWikiSlot,
  selectActiveWikiSlug,
} from "@lararium/tw5";
import {
  loadGenesisIsland, reconcileIslandFromGenesis,
  reconcileWellKnownTiddlers,
} from "./genesis-artifact.js";
import { seedLaresDoc, createSessionEventLog } from "@lararium/mesh";
import { repoRoot }                       from "@lararium/mesh/node";
import { LarEventBusImpl, DEFAULT_RINGS } from "./lar-event-bus-impl.js";
import { VesselIslandPool }                  from "./vessel-island-pool.js";
import { waitHandleLocal }                from "./repo-helpers.js";
import { openAdminVm }                    from "./open-admin-vm.js";
import { VerbTable } from "@lararium/tw5";
import { makeWhereReactor }                       from "./where-handler.js";
import { makeResolveReactor }                     from "./resolve-handler.js";
import {
  makeListWikisReactor, makeInitWikiReactor,
  makeOpenWikiReactor,
} from "./wiki-handlers.js";
import { makePinWikiReactor, makeUnpinWikiReactor } from "./wiki-residency-handlers.js";
import { makeAddBagReactor, makeRemoveBagReactor } from "./wiki-compose-handlers.js";
import { makePruneStaleReactor, makeDraftReactor } from "./wiki-draft-handlers.js";
import { makeEpochBagReactor, makeRotateRecipeReactor } from "./epoch-handlers.js";
import {
  makePinReactor, makeUnpinReactor, makeResidencyStatsReactor,
  makeRegisterColdReactor,
} from "./residency-handlers.js";
import { BagResidencyManager }                      from "@lararium/mesh";
import { KeyhiveProvider, AdminEventStore }         from "@lararium/keyhive";
import { generateOrLoadOperatorKeypair, loadOperatorSigningSeed } from "./operator-key.js";
import { AdminAuthGate }                           from "./admin-auth-gate.js";
import type { AdminVmResult, AdminVmOptions } from "./open-admin-vm.js";

import { LAR_EVENT } from "@lararium/mesh";

const __dir = dirname(fileURLToPath(import.meta.url));

// genesis/social-bootstrap.json — written by `lararium:init`, read here as a boot-path
// infrastructure exception (same pattern as catalog-url). Contains the social-plane
// plugin container: a single lar:/// tiddler with packed oracle tiddlers in its text.
// Primary source for social doc AutomergeUrls on the init node; island oracle tiddlers
// serve as the fallback for replica vessels that sync the island doc from another vessel.
const DEFAULT_GENESIS_DIR = join(__dir, "../genesis");
// Title of the social bootstrap plugin tiddler baked by lararium:init.
export const SOCIAL_BOOTSTRAP_PLUGIN_TITLE = "lar:///ha.ka.ba/@lararium/bootstrap/social";

/** @see LarOpenPhase in @lararium/mesh */
export type NodeOpenPhase = LarOpenPhase;

export interface NodeVesselOptions extends LarariumVesselOptions {
  storageDir: string;
  wss:        WebSocketServer;
  catalogUrl?: string | null;
  /** Directory containing social-bootstrap.json. Defaults to the package's own genesis/. */
  genesisDir?: string;
  /** Repo root for wiki memes scan and all mirror paths. Defaults to monorepo root. */
  rootDir?: string;
}

export interface NodeVesselResult extends LarariumVesselResult<
  LarVessel<VesselIslandPool>,
  VesselIslandPool,
  Repo,
  CompositeStore
> {
  /** The wiki slug this vessel actually mounted after admin-marker resolution. */
  activeWikiId:     string;
  /** Whether the mounted wiki came from CLI boot args or the admin marker. */
  activeWikiSource: "boot-arg" | "admin-marker";
  /** Started event bus — ingress rings registered; tick loop running at 20 Hz. */
  eventBus:         LarEventBusImpl;
  /** Island Pool — two-state VM lifecycle (wela/anu) + orthogonal pin flag;
   *  PrimaryWiki pinned-wela, unpinned-wela LRU-evicted, anu = torn-down snapshot. */
  vmManager:        VesselIslandPool;
  /** Admin VM — operator-private coordinator (S5.6). */
  admin:            AdminVmResult;
  /** Capability provider — Keyhive-backed cap layer (S7.1 D.3). */
  keyhive:          KeyhiveProvider;
  /** Stop the N-accumulator tick loop (call on graceful shutdown). */
  stopTick:         () => void;
}

// waitHandleLocal moved to repo-helpers.ts — shared with openAdminVm.

const blankMemeStore = (repo: Repo): (() => DocHandle<LarDoc>) =>
  () => repo.create<LarDoc>(emptyLarDoc());

export async function openNodeVessel(opts: NodeVesselOptions): Promise<NodeVesselResult> {
  const { hostId, wikiId, storageDir, wss, catalogUrl, onPhase, genesisDir, rootDir: rootDirOpt } = opts;
  const bootstrapPath = join(genesisDir ?? DEFAULT_GENESIS_DIR, "social-bootstrap.json");
  const emit = (p: NodeOpenPhase) => onPhase?.(p);

  emit("boot");

  // ── 1. Repo ───────────────────────────────────────────────────────────────
  const storage = new NodeFSStorageAdapter(storageDir);
  // Tier-3 causal-island boundary: WebSocket relay serves Automerge sync only.
  // AdminAuthGate wraps the wss: runs lar:challenge/lar:auth before Automerge
  // join flows. Gate starts disarmed (rejects all) until keyhive boots.
  const authGate = new AdminAuthGate(wss);
  const network  = new NodeWSServerAdapter(authGate as unknown as typeof wss);
  // peerIdentifierMap: built by the "peer-candidate" listener below; sharePolicy
  // admits only auth-gate-verified peers.
  const peerIdentifierMap = new Map<string, string>();
  // NodeWSServerAdapter sets sockets[peerId] AFTER emitting "peer-candidate",
  // so defer the lookup by one microtask to let the assignment land first.
  network.on("peer-candidate", ({ peerId }: { peerId: string }) => {
    queueMicrotask(() => {
      const socket = (network.sockets as Record<string, unknown>)[peerId];
      if (socket) {
        const identHex = authGate.getIdentifierForSocket(socket as Parameters<typeof authGate.getIdentifierForSocket>[0]);
        if (identHex) peerIdentifierMap.set(peerId, identHex);
      }
    });
  });
  const repo = new Repo({
    storage,
    network: [network],
    sharePolicy: async (peerId) => peerIdentifierMap.has(peerId),
  });
  emit("repo-open");

  // ── 2. Catalog ────────────────────────────────────────────────────────────
  // Local-first rendezvous anchor: catalog URL persisted to storageDir/catalog-url.
  // On first boot: create blank catalog, write URL to disk immediately.
  // On subsequent boots: read URL from disk, call repo.find() — already in NodeFS, fast.
  // NOT seed-then-hydrate: the URL file serves as the stable rendezvous anchor.
  // GET /api/catalog serves this file's content — available before any sync completes.
  // catalog-url: named infrastructure exception — stores this vessel's own Automerge
  // doc URL, not content. Vessel-symmetric: any vessel writes only its own URL here.
  // Analogous to BOOTSTRAP_SCANS (codec layer) — intentionally not in the CRDT.
  const catalogUrlFile = join(storageDir, "catalog-url");
  let resolvedCatalogUrl: string | null = catalogUrl ?? null;
  if (!resolvedCatalogUrl) {
    try { resolvedCatalogUrl = readFileSync(catalogUrlFile, "utf8").trim() || null; } catch { /* first boot */ }
  }

  const blankCatalog = (): DocHandle<LarDoc> => {
    const h = repo.create<LarDoc>(emptyLarDoc());
    // Self-reference: catalog doc holds its own lar: URI and automerge: URL.
    // Follows the same pattern as LarDoc — any vessel that syncs this doc self-discovers.
    h.change((doc) => {
      doc.tiddlers[CATALOG_DOC_URI] = mutableLarRecord(CATALOG_DOC_URI, { text: h.url }, "lararium-seed");
    });
    // Persist URL synchronously before returning.
    try { mkdirSync(storageDir, { recursive: true }); writeFileSync(catalogUrlFile, h.url, "utf8"); } catch { /* quota */ }
    return h;
  };

  const catalogHandle: DocHandle<LarDoc> = resolvedCatalogUrl
    ? await waitHandleLocal(repo, resolvedCatalogUrl as AutomergeUrl, blankCatalog)
    : blankCatalog();

  // Ensure the URL file exists even if catalog came from env/arg rather than disk.
  if (resolvedCatalogUrl && resolvedCatalogUrl !== catalogUrl) {
    try { mkdirSync(storageDir, { recursive: true }); writeFileSync(catalogUrlFile, catalogHandle.url, "utf8"); } catch { /* quota */ }
  }

  const catalog = catalogHandle.doc();
  emit("catalog-ready");

  // ── 3. CompositeStore — lowest→highest priority ──────────────────────────
  // Recipe: LARARIUM_DOC_URI → CATALOG_DOC_URI → LARES_DOC_URI → corpusLarUri(*) → wikiLarUri → draft
  const composite = new CompositeStore();

  // ── 3a. LarDoc (ka) — bag = CATALOG_DOC_URI ──────────────────────────
  composite.addLayer({ bagId: BAG_IDS.catalog, store: new AutomergeDocStore(catalogHandle, BAG_IDS.catalog), writable: false });

  // ── 3b. LarariumIsland doc (ha) — lararium bag ───────────────────────────
  // Genesis-first boot: load the build-time artifact, then reconcile with any
  // existing live doc. Both cold and resume boot call loadGenesisIsland so the
  // vessel always holds the full engine content, even before any network sync.
  const genesisHandle = await loadGenesisIsland(repo, genesisDir);

  const islandDocUrl = tiddlerText(catalog?.tiddlers?.[LARARIUM_DOC_URI]) ?? null;
  let islandHandle: DocHandle<LarDoc>;

  if (islandDocUrl) {
    // Resume boot — load existing island doc; merge genesis if CID diverged.
    islandHandle = await waitHandleLocal<LarDoc>(
      repo, islandDocUrl as AutomergeUrl,
      () => genesisHandle,
    );
    await reconcileIslandFromGenesis(islandHandle, genesisHandle, genesisDir);
  } else {
    // Cold boot — genesis IS the island doc; register URL in catalog.
    islandHandle = genesisHandle;
    const blobEntry = islandHandle.doc()?.blobs?.["tiddlywikicore"];
    catalogHandle.change((doc) => {
      doc.tiddlers[LARARIUM_DOC_URI] = mutableLarRecord(LARARIUM_DOC_URI, {
        text: islandHandle.url,
        ...(blobEntry?.version ? { version: blobEntry.version } : {}),
        ...(blobEntry?.sha256 ? { sha256: blobEntry.sha256 } : {}),
      }, "lararium-boot");
    });
  }

  // Writable so future residency-action handlers (Sprint 5 of the Residency Model Epic) can land tiddlers here.
  // defaultWritable:false keeps unbagged TW5 saves routing to the wiki — only
  // explicit record.bag === BAG_IDS.lararium writes land here.
  composite.addLayer({
    bagId:           BAG_IDS.lararium,
    store:           new AutomergeDocStore(islandHandle, BAG_IDS.lararium),
    writable:        true,
    defaultWritable: false,
  });
  emit("island-ready");

  // ── 3b. LaresDoc (ba) — personality bag ──────────────────────────────────
  // Ha → ba oracle: LarDoc.tiddlers[LARES_DOC_URI].text = LaresDoc automerge URL.
  // On resume: read URL from oracle tiddler, open existing doc.
  // On first boot: seed a new doc, then write the oracle tiddler into LarDoc.
  // Zelenka: relay vessel carries sync — no privilege over ba.
  let laresHandle: DocHandle<LarDoc> | null = null;
  {
    const laresDocUrl = tiddlerText(islandHandle.doc()?.tiddlers?.[LARES_DOC_URI]) ?? null;
    if (laresDocUrl) {
      laresHandle = await waitHandleLocal<LarDoc>(
        repo, laresDocUrl as AutomergeUrl,
        blankMemeStore(repo),
      );
    } else {
      laresHandle = seedLaresDoc(repo);
    }
    // Writable so residency-action handlers (Sprint 5) can land tiddlers from wiki/draft into @lares canon.
    // defaultWritable:false so unbagged TW5 saves continue routing to the wiki.
    composite.addLayer({
      bagId:           BAG_IDS.lares,
      store:           new AutomergeDocStore(laresHandle, BAG_IDS.lares),
      writable:        true,
      defaultWritable: false,
    });
  }

  // ── 3b-social. Social plane docs — @identities / @circles / @sessions ─────
  // Causal-island law: the relay vessel finds; it never seeds. Run `lararium:init` before
  // first relay start to establish these docs via scripts/init-lararium.ts.
  //
  // URL source priority:
  //   1. genesis/social-bootstrap.json plugin container (init node — authoritative)
  //   2. ha island oracle tiddlers (replica vessels that synced the island doc from another vessel)
  //
  // The bootstrap plugin is also pushed to preloadedTiddlers so TW5 boots with the
  // oracle tiddlers available as plugin shadows. The lararium-bootstrap-sync startup
  // module (lararium-boot-shadows.json) promotes them to regular wiki tiddlers at boot.
  //
  // Social bags are writable so composite.put(record) routes to them by bag field.
  let bootstrapPlugin: Record<string, unknown> | null = null;
  if (existsSync(bootstrapPath)) {
    try {
      bootstrapPlugin = JSON.parse(readFileSync(bootstrapPath, "utf8")) as Record<string, unknown>;
    } catch { /* malformed — fall through to island oracle fallback */ }
  }

  const bootstrapTiddlers: Record<string, { text?: string }> = bootstrapPlugin
    ? (JSON.parse(bootstrapPlugin["text"] as string) as { tiddlers: Record<string, { text?: string }> }).tiddlers
    : {};

  const identitiesUrl =
    bootstrapTiddlers[IDENTITIES_DOC_URI]?.text ??
    tiddlerText(islandHandle.doc()?.tiddlers?.[IDENTITIES_DOC_URI]) ?? null;
  const circlesUrl =
    bootstrapTiddlers[CIRCLES_DOC_URI]?.text ??
    tiddlerText(islandHandle.doc()?.tiddlers?.[CIRCLES_DOC_URI])    ?? null;
  const sessionsUrl =
    bootstrapTiddlers[SESSIONS_DOC_URI]?.text ??
    tiddlerText(islandHandle.doc()?.tiddlers?.[SESSIONS_DOC_URI])   ?? null;
  const adminUrl =
    bootstrapTiddlers[ADMIN_BAG_ID]?.text ??
    tiddlerText(islandHandle.doc()?.tiddlers?.[ADMIN_BAG_ID])       ?? null;

  if (!identitiesUrl || !circlesUrl || !sessionsUrl || !adminUrl) {
    throw new Error(
      `[lararium] social plane not initialised — run: pnpm --filter @lararium/node lararium:init\n` +
      `  missing: ${[!identitiesUrl && "@identities", !circlesUrl && "@circles", !sessionsUrl && "@sessions", !adminUrl && "@admin"].filter(Boolean).join(", ")}\n` +
      `  (older bundles: delete genesis/social-bootstrap.json and re-run init to add @admin)`,
    );
  }

  const identitiesHandle = await waitHandleLocal<LarDoc>(
    repo, identitiesUrl as AutomergeUrl,
    () => { throw new Error(`[lararium] @identities doc not found in local storage — sync may be incomplete`); },
  );
  const groupsHandle = await waitHandleLocal<LarDoc>(
    repo, circlesUrl as AutomergeUrl,
    () => { throw new Error(`[lararium] @circles doc not found in local storage — sync may be incomplete`); },
  );
  const sessionsHandle = await waitHandleLocal<LarDoc>(
    repo, sessionsUrl as AutomergeUrl,
    () => { throw new Error(`[lararium] @sessions doc not found in local storage — sync may be incomplete`); },
  );

  composite.addLayer({ bagId: BAG_IDS.identities, store: new AutomergeDocStore(identitiesHandle, BAG_IDS.identities), writable: true });
  composite.addLayer({ bagId: BAG_IDS.groups,     store: new AutomergeDocStore(groupsHandle,     BAG_IDS.groups),     writable: true });
  composite.addLayer({ bagId: BAG_IDS.sessions,   store: new AutomergeDocStore(sessionsHandle,   BAG_IDS.sessions),   writable: true });

  const blobs = islandHandle?.doc()?.blobs ?? {};
  const coreBlobEntry = blobs[ENGINE_CORE_ID];
  if (!coreBlobEntry?.blob) {
    throw new Error(`[openNodeVessel] missing TW5 core blob (${ENGINE_CORE_ID}) in LarDoc; re-run build:genesis`);
  }
  const coreHash = coreBlobEntry.sha256 ?? null;

  // Admin VM — sovereign admin island. Spawns lar-admin-island.ts; holds its own
  // TW5 VM (recipe: @temp + @draft + @admin + @lares + @lararium) + Repo + VerbDispatcher.
  // Vessel retains adminHandle (keyhive gates) + composite (cap-event writes).
  // The resolver delivers AutomergeUrl capability tokens for each CRDT slot.
  const adminVm = await openAdminVm({
    repo,
    adminUrl,
    coreHash,
    resolver: {
      "lar:///ha.ka.ba/@admin":    adminUrl,
      [BAG_IDS.lararium]:          islandHandle.url,
      ...(laresHandle ? { [BAG_IDS.lares]: laresHandle.url } : {}),
    },
    storageDir,
  });

  const { slug: activeWikiId, source: activeWikiSource } = selectActiveWikiSlug(
    wikiId,
    await adminVm.composite.get(ACTIVE_WIKI_URI),
  );
  const identity = new OpenIdentitySlot(`${hostId}:${activeWikiId}`);
  const activeWikiPlan = planActiveWikiSlot({
    hostId,
    wikiSlug: activeWikiId,
    identityDid: identity.did,
  });

  // Vessel delegation registry — wiki-scope job handlers whose closure dependencies
  // live on the vessel (repo, catalogHandle, residency, primary composite).
  // The admin island's VerbDispatcher delegates unknown verbs here via admin:delegate-verb.
  // vmManager is assigned after island boot; jobs only execute after "live" is emitted.
  const jobRegistry  = new VerbTable();
  // Stub "echo" handler — useful for end-to-end smoke of the protocol.
  jobRegistry.register("echo", async (args) => ({ echoed: args }));
  // Read-only recipe-presence query — `lares where` previews source bag.
  jobRegistry.register("where",   makeWhereReactor({ composite }));
  // Read-only Residency Model coordinate-inspection — `lares wiki resolve`.
  // Returns live Manifestations + tombstoning bags + change-id per Manifestation
  // (the full kāpae surface for operator-driven Talk Story).
  jobRegistry.register("resolve", makeResolveReactor({ composite }));
  // E.4 — read-only wiki jobs. write jobs (init/sync/pin/etc) land
  // in E.5+. `list-wikis` walks the catalog for wiki oracle tiddlers.
  jobRegistry.register("list-wikis", makeListWikisReactor({ composite }));
  // E.5 — wiki write jobs. operatorDid resolves lazily so the registry
  // can register before the keyhive bridge finishes booting.
  let vmManager: VesselIslandPool;
  // sync-wiki is VM-native — route as placeWikiVerb to the primary wiki island.
  // vmManager is assigned after TW5 boot; jobs only execute after "live" is emitted.
  //
  // The "promote" registration retired 2026-05-31 under the residency-model cleanup.
  // Residency ACTION verb handlers (ADD / COPY / MOVE / CLEAR / DROP / LOAD) land in
  // Sprint 5 of the Residency Model Epic — see packages/EPIC-RESIDENCY-MODEL.md.
  jobRegistry.register("sync-wiki", async (args, ctx) =>
    vmManager.placeWikiVerb(activeWikiId, {
      verb:        "sync-wiki",
      args:        args as Record<string, unknown>,
      requestedBy: ctx.invocation.requestedBy,
    }),
  );
  const wikiMintOpts = {
    composite,
    repo,
    catalogHandle,
    islandHandle,
    rootDir: rootDirOpt ?? repoRoot,
    operatorDid: async () => {
      // Keyhive's whoami is the canonical source post-boot; until then
      // the operator's verifyingKey hex (loaded earlier) is sufficient.
      return "0x" + operatorIdentity.verifyingKey;
    },
  };
  jobRegistry.register("init-wiki", makeInitWikiReactor(wikiMintOpts));
  jobRegistry.register("open-wiki", makeOpenWikiReactor({ composite }));

  // BagResidencyManager — hot-cap LRU + idle sweeper + sync-state guard.
  // onEvict calls vmManager.unmountWiki; handle-drop deferred to automerge-repo#358.
  const residency = new BagResidencyManager({
    hotCap:          32,
    idleMs:          300_000,   // 5 min
    sweepIntervalMs:  30_000,   // 30 sec
    onEvict: async (bagId) => {
      // TW5 lives inside the island Worker — unmountWiki sends teardown, awaits ack,
      // then terminates the Worker. No TW5Engine reference exists on the main thread.
      // No-op if bagId is pinned or has no live island.
      await vmManager.unmountWiki(bagId);
      console.log(`[bag-residency] evicted ${bagId} (vm unmounted, compact-then-drop reserved for repo#358)`);
    },
  });
  // C.4 — pin by bagId (lar: URI), NOT handle.url (automerge: URL).
  // Composite layers register with bagId; residency.touch fires with the
  // matching layer.bagId on read. Pinning by handle.url would track two
  // disjoint namespaces and make hot/pinned never intersect.
  await residency.pin(BAG_IDS.catalog,        "boot:catalog");
  if (islandHandle) await residency.pin(BAG_IDS.lararium,        "boot:lararium-island");
  if (laresHandle)  await residency.pin(BAG_IDS.lares,           "boot:lares-corpus");
  await residency.pin(BAG_IDS.identities,     "boot:identities");
  await residency.pin(BAG_IDS.groups,         "boot:circles");
  await residency.pin(BAG_IDS.sessions,       "boot:sessions");
  await residency.pin(ADMIN_BAG_ID,           "boot:admin");
  jobRegistry.register("pin",       makePinReactor({ residency }));
  jobRegistry.register("unpin",     makeUnpinReactor({ residency }));
  jobRegistry.register("residency",     makeResidencyStatsReactor({ residency }));
  jobRegistry.register("register-cold", makeRegisterColdReactor({ residency }));
  // E.6 — whole-recipe residency. Walks the wiki's bag-stack and
  // pins/unpins each bag in one shot.
  jobRegistry.register("pin-wiki",   makePinWikiReactor({ composite, residency }));
  jobRegistry.register("unpin-wiki", makeUnpinWikiReactor({ composite, residency }));
  // E.7 — recipe composition. Hot-reload at the composite layer; soft
  // remove (no MNT_DETACH StoryList reconciliation yet — F-arc territory).
  jobRegistry.register("add-bag",    makeAddBagReactor({    composite, repo, residency }));
  jobRegistry.register("remove-bag", makeRemoveBagReactor({ composite, repo, residency }));
  // E.8 — DXOS-style snapshot-restart on a single bag. Bounds history;
  // lossy by design. Tombstones survive (Cassandra rule).
  jobRegistry.register("bag-epoch", makeEpochBagReactor({
    composite, repo, residency, catalogHandle,
  }));
  // E.9a — Nix-generations stack rotation. Mints a fresh canonical doc;
  // retains old canonical as a previous-canon underlay slot (lower
  // priority) so old generations stay readable.
  jobRegistry.register("rotate-recipe", makeRotateRecipeReactor({
    composite, repo, residency, catalogHandle,
  }));
  // E.9b — read-only stale-tiddler queue. Scans the draft bag for
  // tiddlers whose last activity exceeds a threshold (default 7 days);
  // surfaces them for operator's residency-action-or-prune decisions.
  jobRegistry.register("prune-stale", makePruneStaleReactor(wikiMintOpts));
  jobRegistry.register("draft",       makeDraftReactor({ composite }));
  // C.2 — start the background sweeper. Idle eviction + LRU trim run
  // every sweepIntervalMs (default 30s). The manager's own re-entrancy
  // guard makes overlapping ticks safe.
  residency.startSweeper();
  // C.4 — wire composite reads through the residency manager so
  // lastTouched advances on actual traffic. Sweeper's idle-evict path
  // now reflects real activity rather than only boot-time pins.
  composite.attachResidency(residency);

  // S7.1 D.3 — Capability layer. Bridge operator-key.ts ed25519 seed into
  // KeyhiveProvider. The same 32-byte seed deterministically derives the
  // operator's verifying key AND the Keyhive principal — they're the same
  // identity from two surfaces.
  //
  // EventStore persists every Keyhive event as a tiddler in the admin
  // Automerge doc (lar:///...@admin/cap/<sha256>, tagged lar:///ha.ka.ba/tags/cap-event).
  // Daemon restart re-hydrates Keyhive state from these tiddlers via
  // ingestEventsBytes — the operator's identity and delegations survive
  // across reboots.
  //
  // D.4 minimum-viable: every event lands in the admin doc regardless of
  // semantic scope. Per-bag routing per the D4.a decision is reserved for
  // a future refinement; tracked in HANDOFF "Don't re-decide" + memory.
  //
  // D.5 wires this provider as the dispatcher's verifier, so handlers'
  // ctx.cap closures route through real Keyhive verification.
  const operatorIdentity   = await generateOrLoadOperatorKeypair(storageDir);
  const operatorSeed       = await loadOperatorSigningSeed(storageDir);
  const keyhiveEventStore  = new AdminEventStore({ admin: adminVm.composite });
  const keyhive            = new KeyhiveProvider();
  await keyhive.init({ seed: operatorSeed, eventStore: keyhiveEventStore });
  // Re-ingest any events the previous daemon process persisted.
  const hydrated = await keyhive.hydrateFromEventStore();
  if (hydrated.ingested > 0) {
    console.log(`[lararium] keyhive: hydrated ${hydrated.ingested} cap events from admin doc`);
  }
  const keyhiveDid         = await keyhive.whoami();
  // Gate A: Keyhive and disk keypair MUST derive the same identity.
  // Drift here indicates a corrupted event store or mismatched seed file — HALT.
  if (!keyhiveDid.endsWith(operatorIdentity.verifyingKey)) {
    throw new Error(
      `[lararium] identity drift — Keyhive whoami does not match disk keypair. ` +
      `whoami=${keyhiveDid.slice(0, 18)}… verifyingKey=${operatorIdentity.verifyingKey.slice(0, 16)}… ` +
      `Run \`lares init --force\` to re-establish operator identity.`,
    );
  }
  // ── DreamNet boot gates ────────────────────────────────────────────────
  // Gate B: this vessel's Individual MUST belong to the operator's PersonGroup.
  //   Proves: this device holds a key that was admitted to this operator's fleet.
  // Gate C: the operator's PersonGroup MUST belong to the Nexus MeshCabal.
  //   Proves: this operator holds DreamNet Nexus membership.
  //
  // Both gates read sentinel oracle tiddlers written by `lares init`.
  // If tiddlers are absent, the node has never been initialized — HALT.
  // If verification fails, the node's identity diverged — HALT.
  //
  // NOTE: sentinel Documents are used (not Keyhive Groups) because GroupId
  // lacks a public constructor in alpha.56c — no round-trip from stored hex.
  // Migrate to Group when Keyhive API exposes GroupId serialization.

  const adminDoc = adminVm.adminHandle.doc();

  const personGroupDocIdHex   = tiddlerText(adminDoc?.tiddlers?.[PERSON_GROUP_DOC_ID_TIDDLER])   ?? null;
  const personGroupAgentIdHex = tiddlerText(adminDoc?.tiddlers?.[PERSON_GROUP_AGENT_ID_TIDDLER]) ?? null;
  const meshCabalDocIdHex     = tiddlerText(adminDoc?.tiddlers?.[MESH_CABAL_DOC_ID_TIDDLER])     ?? null;

  if (!personGroupDocIdHex || !personGroupAgentIdHex || !meshCabalDocIdHex) {
    throw new Error(
      `[lararium] DreamNet sentinel oracle tiddlers missing — ` +
      `this node may not have completed initialization. Run \`lares init\`.`,
    );
  }

  // Gate B — vessel Individual membership in PersonGroup
  const vesselIdentifierHex = keyhiveDid; // whoami = hex of IndividualId bytes (with 0x prefix)
  const gateB = await keyhive.verifySentinelMembership(vesselIdentifierHex, personGroupDocIdHex);
  if (!gateB.ok) {
    throw new Error(
      `[lararium] Gate B: this vessel (${keyhiveDid.slice(0, 18)}…) lacks PersonGroup membership. ` +
      `${gateB.reason ?? ""} Run \`lares device-admit\` on an existing admitted vessel.`,
    );
  }
  console.log(`[lararium] Gate B ✓ — vessel admitted to operator PersonGroup`);

  // Gate C — PersonGroup membership in MeshCabal (Nexus adminCabal)
  const gateC = await keyhive.verifySentinelMembership(personGroupAgentIdHex, meshCabalDocIdHex);
  if (!gateC.ok) {
    throw new Error(
      `[lararium] Gate C: operator PersonGroup lacks Nexus MeshCabal membership. ` +
      `${gateC.reason ?? ""} Run \`lares invite-receive\` with the founding operator's invitation payload.`,
    );
  }
  console.log(`[lararium] Gate C ✓ — operator admitted to Nexus MeshCabal (DreamNet)`);

  // Register every writable bag the operator owns with Keyhive — operator
  // becomes implicit admin via Keyhive's generateDocument semantics. The
  // bagId namespace MUST match what dispatchers verify against (lar: URIs,
  // NOT automerge: URLs) — same shape as the C.4 residency-pin namespace
  // fix. Without this, ctx.cap("admin", lar:URI) returns false because
  // keyhive's bagToDocId map only has automerge: URL keys.
  await keyhive.registerBag(ADMIN_BAG_ID);
  await keyhive.registerBag(BAG_IDS.identities);
  await keyhive.registerBag(BAG_IDS.groups);
  await keyhive.registerBag(BAG_IDS.sessions);
  await keyhive.registerBag(BAG_IDS.catalog);            // catalog index of wiki oracles
  await keyhive.registerBag(BAG_IDS.lararium);           // engine corpus (canon)
  await keyhive.registerBag(BAG_IDS.lares);              // @lares persona/doctrine (canon)
  await keyhive.registerBag(activeWikiPlan.wikiBagId);         // active wiki canonical
  await keyhive.registerBag(activeWikiPlan.draftBagId);        // active wiki draft

  // Arm the auth gate — connections arriving after this point go through
  // Keyhive accessForDoc verification before Automerge sync begins.
  authGate.arm(keyhive, ADMIN_BAG_ID);

  // Smoke: confirm the operator's registerBag path wires correctly.
  // Log-only — not a gate. The real sovereignty check ran at Gates B and C above.
  const selfVerify = await keyhive.verify({
    presenter: keyhiveDid,
    bagUrl:    ADMIN_BAG_ID,
    access:    "admin",
  });
  console.log(
    `[lararium] keyhive: did=${keyhiveDid.slice(0, 18)}…  admin-bag registered  ` +
    `self-admin=${selfVerify.ok}${selfVerify.ok ? "" : ` (smoke fail: ${selfVerify.reason})`}`,
  );

  // Wire the delegation registry now that keyhive exists.
  // The admin island's VerbDispatcher delegates unknown verbs to this registry via
  // admin:delegate-verb messages. mountMainVerbs must be called before workerEa resolves
  // to ensure no delegated jobs are dropped during the boot window.
  adminVm.mountMainVerbs(jobRegistry, keyhive);

  // Zelenka: keep oracle tiddlers current on every boot — self, ka, ba, social plane, admin.
  reconcileWellKnownTiddlers(
    islandHandle, catalogHandle.url,
    laresHandle?.url,
    identitiesHandle.url,
    groupsHandle.url,
    sessionsHandle.url,
    adminVm.adminHandle.url,
  );

  // ── 3c. Corpus docs — one top-level bag per corpus ───────────────────────
  // Each corpus is a first-class bag at child[1] (e.g. lar:///ha.ka.ba/@elyncia).
  // The catalog tracks corpora as registry entries at
  // lar:///ha.ka.ba/@catalog/corpus/<slug> whose `text` field carries the
  // corpus bag's AutomergeUrl. Discovery walks the registry.
  const corpusEntries = Object.entries(catalog?.tiddlers ?? {})
    .filter(([uri]) => uri.startsWith(CATALOG_CORPUS_PREFIX))
    .map(([uri, tiddler]) => ({
      id: uri.slice(CATALOG_CORPUS_PREFIX.length),
      docUrl: tiddlerText(tiddler),
    }))
    .filter((e): e is { id: string; docUrl: string } => Boolean(e.docUrl));
  const corpusReadyP = Promise.all(corpusEntries.map(async (entry) => {
    const handle = await waitHandleLocal<LarDoc>(
      repo, entry.docUrl as AutomergeUrl,
      blankMemeStore(repo),
    );
    const bagId = corpusBagId(entry.id);
    composite.addLayer({ bagId, store: new AutomergeDocStore(handle, bagId), writable: false });

    // Self-describing: corpus doc holds its own canonical bag URI as a tiddler
    // whose `text` is the AutomergeUrl. Any vessel that opens the doc can read
    // its canonical lar: address without a catalog lookup.
    const corpusUri = corpusLarUri(entry.id);
    const existingCorpusSelfRef = tiddlerText(handle.doc()?.tiddlers?.[corpusUri]);
    if (existingCorpusSelfRef !== handle.url) {
      handle.change((doc) => {
        doc.tiddlers[corpusUri] = mutableLarRecord(corpusUri, { text: handle.url }, "lararium-seed");
      });
    }

    // Catalog registry entry — points from the catalog at the corpus bag's
    // AutomergeUrl. Registry pattern: catalog catalogs; it does not host.
    const registryUri = catalogCorpusEntryUri(entry.id);
    const existingText = tiddlerText(catalogHandle.doc()?.tiddlers?.[registryUri]);
    if (existingText !== entry.docUrl) {
      catalogHandle.change((doc) => {
        doc.tiddlers[registryUri] = mutableLarRecord(registryUri, { text: entry.docUrl }, "lararium-seed");
      });
    }
  }));

  // Stable identity URI for the selected primary wiki — the map key in catalog oracles.
  const wikiKey = activeWikiPlan.wikiKey;

  // ── 4. Wiki doc — oracle tiddler path ──────────────────────────────────
  const wikiDocUrl = tiddlerText(catalog?.tiddlers?.[wikiKey]) ?? null;
  const blankRoom  = blankMemeStore(repo);
  const wikiHandle: DocHandle<LarDoc> = wikiDocUrl
    ? await waitHandleLocal<LarDoc>(repo, wikiDocUrl as AutomergeUrl, blankRoom)
    : blankRoom();

  if (!wikiDocUrl) {
    // Write as oracle tiddler — same schema as browser vessel.
    catalogHandle.change((doc) => {
      (doc.tiddlers as Record<string, LarTiddlerRecord>)[wikiKey] = mutableLarRecord(wikiKey, { text: wikiHandle.url }, "lararium-boot");
    });
  }
  const wikiBagId = activeWikiPlan.wikiBagId;
  const wikiStore = new AutomergeDocStore(wikiHandle, wikiBagId);
  emit("wiki-ready");

  // ── 5. Wiki-Drafts doc — per-user, stored in catalog oracle tiddler ───────
  // Node vessel uses hostId:wikiId identity for its own drafts (operator drafts).
  // User drafts from browser vessels are stored under each browser vessel's DID key.
  const draftTiddlerKey = activeWikiPlan.draftOracleTitle;
  const existingDraftUrl: string | null = tiddlerText(catalog?.tiddlers?.[draftTiddlerKey]) ?? null;
  const blankDraft = blankMemeStore(repo);
  const draftHandle: DocHandle<LarDoc> = existingDraftUrl
    ? await waitHandleLocal<LarDoc>(repo, existingDraftUrl as AutomergeUrl, blankDraft)
    : blankDraft();

  if (!existingDraftUrl) {
    catalogHandle.change((doc) => {
      (doc.tiddlers as Record<string, LarTiddlerRecord>)[draftTiddlerKey] = mutableLarRecord(draftTiddlerKey, { text: draftHandle.url }, "lararium-boot");
    });
  }
  // E.3 — per-wiki draft bagId. Composite layer encodes which wiki owns
  // the drafts so multiple wikis can mount simultaneously without
  // intermingling. The Automerge doc URL still lives in the catalog under
  // ${wikiLarUri(slug)}/drafts/${vesselDid} (unchanged); only the layer
  // bagId namespace changed from the static "draft" constant.
  const draftBagId = activeWikiPlan.draftBagId;
  const draftStore = new AutomergeDocStore(draftHandle, draftBagId);

  // @temp layer — local-VM-only MemoryTiddlerStore. Receives $:/temp/* and
  // any volatile session writes. defaultWritable:true so unbagged TW5 saves
  // land here, not in the draft CRDT. Top of cascade per WikiRecipe law.
  composite.addLayer({
    bagId:           TEMP_BAG,
    store:           new MemoryTiddlerStore(),
    writable:        true,
    defaultWritable: true,
  });
  emit("draft-ready");

  // ── 6. LarVessel ────────────────────────────────────────────────────────────
  wikiStore.markSyncComplete();
  const vessel = new LarVessel<VesselIslandPool>({
    vesselId:     activeWikiPlan.vesselId,
    store:        composite,
    capabilities: LAR_VESSEL_CAPABILITIES_NODE,
    identity,
  });
  emit("vessel-ready");

  // ── 7. Event bus ─────────────────────────────────────────────────────────
  const eventBus = new LarEventBusImpl(20);
  for (const ring of DEFAULT_RINGS) eventBus.registerRing(ring);
  eventBus.start();

  // ── 7a. VesselIslandPool — sovereign island pool ─────────────────────────────
  // Primary wiki runs in a pinned Worker thread (makeWikiPrimaryBehavior).
  // Hot LRU islands host session wikis. All VM state lives in islands.
  vmManager = new VesselIslandPool({
    mainRepo:      repo,
    storageRoot:   storageDir,
    laraiumDocUrl: islandHandle.url,
    onWorkerEvent: (wikiId, msg) => {
      eventBus.enqueueToRing("vm-ring", "worker.event", {
        wikiId,
        listenable: msg.listenable,
        payload: msg.payload,
      });
    },
    // Path M.1 — cross-island verb routing.
    // Promise-pipelining law: island fires without ACK; vessel routes fire-and-forget.
    // When a worker.event payload carries `verb`, place it on the admin island.
    // adminVm not yet available here — consumer wired after adminVm resolves (see below).
  });

  // ── 8. Corpus bags — await before mounting primary island ─────────────────
  await corpusReadyP;
  emit("corpus-ready");

  // ── 8a. Admin sovereignty gate — BEFORE any wiki mount (S11.5 boot reorder) ──
  // The vessel is not live until the admin island declares sovereignty; the admin
  // island holds the TW5 job event surface (drain loop + VerbDispatcher). Gating
  // here — admin-first — means the delegate-verb seam is live before the primary
  // wiki mounts, which is the prerequisite for S7.5 @personal binding-resolution
  // (resolve/mint @personal+@draft via the admin VM, then mount the primary with
  // the resolved URLs). Admin was spawned at boot start; this only awaits its ea.
  await adminVm.workerEa;

  // ── 9. Primary wiki island ────────────────────────────────────────────────
  // Build disk mirror configs — @lares + @lararium corpus bags only.
  // island reconstructs BagMirrorConfig via namedBagMirror(bagId, scope, mirrorRoot).
  const workerRootDir = rootDirOpt ?? repoRoot;
  const diskMirrors: readonly { bagId: string; mirrorRoot: string; scope: string }[] = [
    { bagId: LARES_DOC_URI,    mirrorRoot: join(workerRootDir, "bags/@lares/v0.1"),    scope: "@lares" },
    { bagId: LARARIUM_DOC_URI, mirrorRoot: join(workerRootDir, "bags/@lararium/v0.1"), scope: "@lararium" },
  ];
  // Unified mount path — primary is a `wela` slot with the `pinned` flag set
  // (never LRU-evicted); pin is orthogonal to temperature (EPIC S11.5).
  await vmManager.mountWiki(activeWikiId, {
    docHandle: wikiHandle,
    coreHash,
    diskMirrors,
  }, { pinned: true });
  emit("tw5-booted");

  // ── 10. VmPool — vmManager IS the pool ────────────────────────────────────
  vessel.attachVmPool(vmManager);

  // Path M.1 — wire worker.event consumer now that adminVm is live.
  // Rings drain through emit() → subscribe() handlers; subscribe on the event type directly.
  // Promise-pipelining law: island fires IslandMsg_Event without ACK; vessel routes fire-and-forget.
  // payload.verb present → cross-island verb dispatch; absent → observation-only signal.
  eventBus.subscribe<{ wikiId: string; listenable: string; payload: Record<string, string | number | boolean> }>(
    "worker.event",
    ({ listenable, payload }) => {
      const verb    = typeof payload["verb"]    === "string" ? payload["verb"]    : undefined;
      const fromUri = typeof payload["fromUri"] === "string" ? payload["fromUri"] : undefined;
      if (!verb) return;
      adminVm.placeVerb({
        verb,
        args:        payload as unknown as Record<string, unknown>,
        requestedBy: typeof payload["requestedBy"] === "string" ? payload["requestedBy"] : listenable,
        listenable,
        ...(fromUri ? { fromUri } : {}),
      });
    },
  );

  emit("live");
  return {
    activeWikiId,
    activeWikiSource,
    vessel, pool: vmManager, repo, eventBus,
    store: composite,
    vmManager,
    admin: adminVm,
    keyhive,
    catalogHandleUrl: catalogHandle.url,
    larariumDocUrl: islandHandle?.url ?? null,
    phase: "live",
    stopTick: () => { void vmManager.disposeAll(); },
  };
}

// ---------------------------------------------------------------------------
// Session lifecycle — create a session + seed its event log
// ---------------------------------------------------------------------------

export interface CreateNodeSessionOptions {
  sessionId:   string;
  operatorDid: string;
  agentId:     string;
}

export interface NodeSessionResult {
  sessionTiddlerUri: string;
  eventLogUrl:       string;
}

/**
 * Open a new session: writes a SessionTiddler into the CRDT via the composite
 * store (TW5 VM path), creates the per-session SessionEventLog child doc, and
 * wires `session.grounded` emission onto the event bus for L1 clock ticks.
 *
 * Call after `openNodeVessel` returns. One call per operator session.
 * Pass `result.store` (the CompositeStore) — session tiddler routes to the
 * sessions bag because that layer is registered as writable.
 */
export async function createNodeSession(
  opts:     CreateNodeSessionOptions,
  repo:     Repo,
  store:    CompositeStore,
  eventBus: LarEventBusImpl,
): Promise<NodeSessionResult> {
  const { sessionId, operatorDid, agentId } = opts;
  const tiddlerUri = `lar:///ha.ka.ba/@sessions/${sessionId}`;
  const now = new Date().toISOString();

  // Create the event log child doc first so its URL is available for the tiddler.
  // repo.create() is unavoidable here (new Automerge doc). The self-ref oracle
  // tiddler inside it is a direct write on a brand-new doc not yet in the composite.
  const logHandle = createSessionEventLog(repo, sessionId);

  // Write session tiddler through the composite store — routes to sessions bag
  // (writable: true) because record.bag === SESSIONS_DOC_URI.
  // This is the TW5 VM write path: composite.put() → AutomergeDocStore → CRDT.
  await store.put(
    toLarTiddlerRecord({
      title: tiddlerUri,
      text: "",
      id:            sessionId,
      operatorDid,
      agentId,
      startedAt:     now,
      state:         "active",
      eventLogUrl:   logHandle.url,
      eventLogHeads: "",
    }, { authority: "lararium-session" }),
    { kind: "operator-import", sessionId },
    { bag: SESSIONS_DOC_URI },
  );

  // Wire session.grounded events from the event bus so L1 clock ticks can fire.
  eventBus.subscribe(LAR_EVENT.SESSION_GROUNDED, (e) => {
    const ev = e as { sessionId?: string };
    if (ev.sessionId === sessionId) {
      console.log(`[session:${sessionId}] grounded — L1 tick fires`);
    }
  });

  return { sessionTiddlerUri: tiddlerUri, eventLogUrl: logHandle.url };
}
