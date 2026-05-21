/**
 * openNodeLarPeer — local-first Node.js peer factory.
 *
 * Boot sequence — Automerge Tiga + leaves (authority-first-sync-order):
 *   1. Repo     — NodeFS storage + WebSocket server
 *   2. ka opens — LarDoc: URL registry (wikis, corpora, engine)
 *   3. ha opens — LarDoc: system bag                           [from catalog.larariumDoc]
 *   4. ba opens — LaresDoc: personality bag                         [from ha oracle tiddler]
 *   5. Corpus*  — per-corpus bags from catalog.corpora[*]           [async, non-blocking]
 *   6. Wiki     — situated content, writable                        [wiki bag]
 *   7. Drafts   — per-user draft sync                               [draft bag]
 *
 *   CompositeStore: system → lares → corpus:* → wiki(writable) → draft(writable)
 *   LarPeer: store = wiki AutomergeDocStore, composite = full CompositeStore
 *
 * The server holds no privilege. It relays; it does not adjudicate content truth.
 * Multiple wikis → multiple openNodeLarPeer calls, one LarPeer per DocHandle.
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
  OperatorPeerOpenOptions, OperatorPeerOpenResult, LarOpenPhase,
} from "@lararium/mesh";
import {
  LarPeer, PEER_CAPABILITIES_NODE, OpenIdentitySlot,
  AutomergeDocStore,
  CompositeStore, corpusBagId,
  emptyLarDoc, mutableLarRecord, tiddlerText,
  LARARIUM_DOC_URI, CATALOG_DOC_URI, LARES_DOC_URI,
  IDENTITIES_DOC_URI, CIRCLES_DOC_URI, SESSIONS_DOC_URI, ADMIN_BAG_ID,
  corpusLarUri, wikiLarUri, wikiDraftLarUri, BAG_IDS, recipeUri,
  VmPool, ENGINE_CORE_ID,
}                                       from "@lararium/mesh";
import type { LarTiddlerRecord } from "@lararium/mesh";
import { toLarTiddlerRecord } from "@lararium/mesh";
import type { MemeRecipeVm } from "@lararium/mesh";
import { IslandAccumulator } from "@lararium/mesh";
import { TW5Engine, IslandAdaptor, DirectMemeRecipeVm, MemoryTiddlerStore } from "@lararium/tw5";
import {
  loadGenesisIsland, reconcileIslandFromGenesis,
  reconcileWellKnownTiddlers,
} from "./genesis-artifact.js";
import { seedLaresDoc, createSessionEventLog } from "./social-seed.js";
import { repoRoot }                       from "@lararium/mesh";
import { LarEventBusImpl, DEFAULT_RINGS } from "./lar-event-bus-impl.js";
import { NodeVmManager }                  from "./node-vm-manager.js";
import { waitHandleLocal }                from "./repo-helpers.js";
import { openAdminVm }                    from "./open-admin-vm.js";
import { CommandDispatcher, CommandHandlerRegistry } from "./command-dispatcher.js";
import { createPromoteHandler }                    from "./promote-handler.js";
import { createWhereHandler }                       from "./where-handler.js";
import {
  createListWikisHandler, createInitWikiHandler,
  createOpenWikiHandler, createSyncWikiHandler,
  createPinWikiHandler, createUnpinWikiHandler,
  createAddBagHandler, createRemoveBagHandler,
  createPruneStaleHandler, createDraftHandler,
} from "./wiki-handlers.js";
import { createEpochBagHandler, createRotateRecipeHandler } from "./epoch-handlers.js";
import {
  createPinHandler, createUnpinHandler, createResidencyStatsHandler,
  createRegisterColdHandler,
} from "./residency-handlers.js";
import { BagResidencyManager }                      from "@lararium/mesh";
import { KeyhiveProvider, AdminEventStore }         from "@lararium/keyhive";
import { generateOrLoadOperatorKeypair, loadOperatorSigningSeed } from "./operator-key.js";
import type { AdminVmResult }             from "./open-admin-vm.js";

import { LAR_EVENT } from "@lararium/mesh";

const __dir = dirname(fileURLToPath(import.meta.url));

// genesis/social-bootstrap.json — written by `lararium:init`, read here as a boot-path
// infrastructure exception (same pattern as catalog-url). Contains the social-plane
// plugin container: a single lar:/// tiddler with packed oracle tiddlers in its text.
// Primary source for social doc AutomergeUrls on the init node; island oracle tiddlers
// serve as the fallback for replica nodes that sync the island doc from a peer.
const DEFAULT_GENESIS_DIR = join(__dir, "../genesis");
// Title of the social bootstrap plugin tiddler baked by lararium:init.
export const SOCIAL_BOOTSTRAP_PLUGIN_TITLE = "lar:///ha.ka.ba/@lararium/bootstrap/social";

/** @see LarOpenPhase in @lararium/mesh */
export type NodeOpenPhase = LarOpenPhase;

export interface NodeLarPeerOptions extends OperatorPeerOpenOptions<MemeRecipeVm, TW5Engine> {
  storageDir: string;
  wss:        WebSocketServer;
  catalogUrl?: string | null;
  /**
   * Optional factory for the per-recipe VM.  Defaults to DirectMemeRecipeVm (same-thread).
   * Pass a TW5WorkerProxy factory for Worker isolation (Sprint 6 node Worker isolation).
   *
   * @param recipeUri - The resolved recipe URI for the VM scope.
   * @param tw5       - The booted TW5Engine for this peer.
   * @param bagStack  - Ordered bag stack for this recipe's tiddler view.
   */
  /** Directory containing social-bootstrap.json. Defaults to the package's own genesis/. */
  genesisDir?: string;
  /** Repo root for wiki memes scan and all mirror paths. Defaults to monorepo root. */
  rootDir?: string;
}

export interface NodeLarPeerResult extends OperatorPeerOpenResult<
  LarPeer<VmPool<MemeRecipeVm>>,
  VmPool<MemeRecipeVm>,
  Repo,
  CompositeStore
> {
  tw5:              TW5Engine;
  /** Started event bus — ingress rings registered; tick loop running at 20 Hz. */
  eventBus:         LarEventBusImpl;
  /** Three-tier VM lifecycle manager — PrimaryWiki pinned, hot LRU, cold snapshots. */
  vmManager:        NodeVmManager;
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

export async function openNodeLarPeer(opts: NodeLarPeerOptions): Promise<NodeLarPeerResult> {
  const { hostId, wikiId, storageDir, wss, catalogUrl, recipeUri: recipeUriOpt, onPhase, vmFactory, genesisDir, rootDir: rootDirOpt } = opts;
  const bootstrapPath = join(genesisDir ?? DEFAULT_GENESIS_DIR, "social-bootstrap.json");
  const emit = (p: NodeOpenPhase) => onPhase?.(p);
  // Stable identity URI for this wiki — the map key in LarDoc.wikis.
  const wikiKey = wikiLarUri(wikiId);

  emit("boot");

  // ── 1. Repo ───────────────────────────────────────────────────────────────
  const storage = new NodeFSStorageAdapter(storageDir);
  // Tier-3 causal-island boundary: WebSocket server serves as the network relay.
  // wss is typed via isomorphic-ws — the same module NodeWSServerAdapter uses.
  const network = new NodeWSServerAdapter(wss);
  // sharePolicy: alpha stub — open federation.
  // Keyhive/UCAN injection point: async (peerId) => identity.verifyCapability(peerId, "read")
  const repo    = new Repo({ storage, network: [network], sharePolicy: async () => true });
  emit("repo-open");

  // ── 2. Catalog ────────────────────────────────────────────────────────────
  // Local-first rendezvous anchor: catalog URL persisted to storageDir/catalog-url.
  // On first boot: create blank catalog, write URL to disk immediately.
  // On subsequent boots: read URL from disk, call repo.find() — already in NodeFS, fast.
  // NOT seed-then-hydrate: the URL file serves as the stable rendezvous anchor.
  // GET /api/catalog serves this file's content — available before any sync completes.
  // catalog-url: named infrastructure exception — stores this peer's own Automerge
  // doc URL, not content. Peer-symmetric: any peer writes only its own URL here.
  // Analogous to BOOTSTRAP_SCANS (codec layer) — intentionally not in the CRDT.
  const catalogUrlFile = join(storageDir, "catalog-url");
  let resolvedCatalogUrl: string | null = catalogUrl ?? null;
  if (!resolvedCatalogUrl) {
    try { resolvedCatalogUrl = readFileSync(catalogUrlFile, "utf8").trim() || null; } catch { /* first boot */ }
  }

  const blankCatalog = (): DocHandle<LarDoc> => {
    const h = repo.create<LarDoc>(emptyLarDoc());
    // Self-reference: catalog doc holds its own lar: URI and automerge: URL.
    // Follows the same pattern as LarDoc — any peer that syncs this doc self-discovers.
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
  // peer always holds the full engine content, even before any network sync.
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

  // Writable for the canon-promotion ceremony (`lares promote --to <lararium>`).
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
  // Zelenka: server is just another peer — no privilege over ba.
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
    // Writable for the canon-promotion ceremony (wiki/draft → @lares canon).
    // defaultWritable:false so unbagged TW5 saves continue routing to the wiki.
    composite.addLayer({
      bagId:           BAG_IDS.lares,
      store:           new AutomergeDocStore(laresHandle, BAG_IDS.lares),
      writable:        true,
      defaultWritable: false,
    });
  }

  // ── 3b-social. Social plane docs — @identities / @circles / @sessions ─────
  // Causal-island law: the server finds; it never seeds. Run `lararium:init` before
  // first server start to establish these docs via scripts/init-lararium.ts.
  //
  // URL source priority:
  //   1. genesis/social-bootstrap.json plugin container (init node — authoritative)
  //   2. ha island oracle tiddlers (replica nodes that synced the island doc from a peer)
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
    throw new Error(`[openNodeLarPeer] missing TW5 core blob (${ENGINE_CORE_ID}) in LarDoc; re-run build:genesis`);
  }
  const coreBlob = {
    bytes:  new Uint8Array(coreBlobEntry.blob),
    sha256: coreBlobEntry.sha256,
    source: coreBlobEntry.source ?? ENGINE_CORE_ID,
  };

  // Admin VM — operator-private coordinator with its own TW5 engine and
  // composite. Corpus tiddlers arrive via the bag recipe stack; no plugin preload needed.
  const adminVm = await openAdminVm({ repo, adminUrl, preloadedTiddlers: [], coreBlob });

  // Command dispatcher — subscribes to the admin store and runs commands
  // delivered as command-tiddlers (CRDT-native CLI ↔ daemon coordination).
  // Real handlers register here; the registry stays empty for now and
  // populates as B.4+ lands them.
  const commandRegistry  = new CommandHandlerRegistry();
  // Stub "echo" handler — useful for end-to-end smoke of the protocol.
  commandRegistry.register("echo", async (args) => ({ echoed: args }));
  // Read-only recipe-presence query — `lares where` previews source bag.
  commandRegistry.register("where",   createWhereHandler({ composite }));
  // E.4 — read-only wiki commands. write commands (init/sync/pin/etc) land
  // in E.5+. `list-wikis` walks the catalog for wiki oracle tiddlers.
  commandRegistry.register("list-wikis", createListWikisHandler({ composite }));
  // E.5 — wiki write commands. operatorDid resolves lazily so the registry
  // can register before the keyhive bridge finishes booting.
  // tw5 is assigned after boot (below). The thunk is safe because
  // command handlers only execute after the daemon emits "live".
  let tw5: TW5Engine;
  let vmManager: NodeVmManager;
  commandRegistry.register("promote", createPromoteHandler({
    composite,
    getPrimaryEngine: () => tw5,
    getMirrorLookupWiki: () => adminVm.tw5.wiki,
  }));
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
    getPrimaryEngine: () => tw5,
  };
  commandRegistry.register("init-wiki", createInitWikiHandler(wikiMintOpts));
  commandRegistry.register("open-wiki", createOpenWikiHandler({ composite }));
  commandRegistry.register("sync-wiki", createSyncWikiHandler(wikiMintOpts));

  // S6 — BagResidencyManager. Phase 1 (C.1): instrumentation only; no
  // eviction yet. Pin every doc the daemon touches at boot so we don't
  // unintentionally evict load-bearing infrastructure once C.2 wires the LRU.
  // S6 C.2 — sweeper-aware residency manager. onEvict stays a stub here
  // until upstream Automerge-repo lands a public eviction API (#358);
  // C.2's value is the manager's own book-keeping (hot cap enforcement,
  // idle eviction, sync-state guard) so the wiring is in place when the
  // handle-drop path materializes.
  const residency = new BagResidencyManager({
    hotCap:          32,
    idleMs:          300_000,   // 5 min
    sweepIntervalMs:  30_000,   // 30 sec
    onEvict: async (bagId) => {
      // vmManager.unmountWiki captures a VmSnapshot and tears down the TW5Engine.
      // No-op if bagId is pinned or has no live VM.
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
  commandRegistry.register("pin",       createPinHandler({ residency }));
  commandRegistry.register("unpin",     createUnpinHandler({ residency }));
  commandRegistry.register("residency",     createResidencyStatsHandler({ residency }));
  commandRegistry.register("register-cold", createRegisterColdHandler({ residency }));
  // E.6 — whole-recipe residency. Walks the wiki's bag-stack and
  // pins/unpins each bag in one shot.
  commandRegistry.register("pin-wiki",   createPinWikiHandler({ composite, residency }));
  commandRegistry.register("unpin-wiki", createUnpinWikiHandler({ composite, residency }));
  // E.7 — recipe composition. Hot-reload at the composite layer; soft
  // remove (no MNT_DETACH StoryList reconciliation yet — F-arc territory).
  commandRegistry.register("add-bag",    createAddBagHandler({    composite, repo, residency }));
  commandRegistry.register("remove-bag", createRemoveBagHandler({ composite, repo, residency }));
  // E.8 — DXOS-style snapshot-restart on a single bag. Bounds history;
  // lossy by design. Tombstones survive (Cassandra rule).
  commandRegistry.register("bag-epoch", createEpochBagHandler({
    composite, repo, residency, catalogHandle,
  }));
  // E.9a — Nix-generations stack rotation. Mints a fresh canonical doc;
  // retains old canonical as a previous-canon underlay slot (lower
  // priority) so old generations stay readable.
  commandRegistry.register("rotate-recipe", createRotateRecipeHandler({
    composite, repo, residency, catalogHandle,
  }));
  // E.9b — read-only stale-tiddler queue. Scans the draft bag for
  // tiddlers whose last activity exceeds a threshold (default 7 days);
  // surfaces them for operator's promote-or-prune decisions.
  commandRegistry.register("prune-stale", createPruneStaleHandler(wikiMintOpts));
  commandRegistry.register("draft",       createDraftHandler({ composite }));
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
  // Automerge doc (lar:///...@admin/cap/<sha256>, tagged $:/tags/CapEvent).
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
  // Sanity: the bridge derives the same identity from both surfaces.
  if (!keyhiveDid.endsWith(operatorIdentity.verifyingKey)) {
    console.warn(
      `[lararium] keyhive identity drift: whoami=${keyhiveDid} verifyingKey=${operatorIdentity.verifyingKey}`,
    );
  }
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
  await keyhive.registerBag(wikiLarUri(wikiId));         // active wiki canonical
  await keyhive.registerBag(wikiDraftLarUri(wikiId));    // active wiki draft

  // Sanity: confirm the operator can verify their own admin access. This
  // closes the D.3 bridge end-to-end — bytes-on-disk → seed → Keyhive
  // principal → registered bag → admin proof verifies.
  const selfVerify = await keyhive.verify({
    presenter: keyhiveDid,
    bagUrl:    ADMIN_BAG_ID,
    access:    "admin",
  });
  console.log(
    `[lararium] keyhive: did=${keyhiveDid.slice(0, 18)}…  admin-bag registered  ` +
    `self-admin=${selfVerify.ok}${selfVerify.ok ? "" : ` (${selfVerify.reason})`}`,
  );

  // Now that keyhive exists, construct the dispatcher with it as verifier.
  // ctx.cap in every handler routes through keyhive.verify().
  const commandDispatcher = new CommandDispatcher({
    admin:    adminVm.composite,
    registry: commandRegistry,
    verifier: keyhive,
  });
  commandDispatcher.start();

  // Zelenka: keep oracle tiddlers current on every boot — self, ka, ba, social plane, admin.
  reconcileWellKnownTiddlers(
    islandHandle, catalogHandle.url,
    laresHandle?.url,
    identitiesHandle.url,
    groupsHandle.url,
    sessionsHandle.url,
    adminVm.adminHandle.url,
  );

  // ── 3c. Corpus docs — one bag per corpus child-doc ───────────────────────
  // Isomorphic oracle path: read from LarDoc.tiddlers keyed by corpusLarUri(slug).
  // corpusLarUri(slug) = "lar:///ha.ka.ba/@catalog/@{slug}" (pos-2 child-doc slot).
  // catalog.corpora Record is a legacy optimization index only; tiddlers oracle authoritative.
  const CORPUS_PREFIX = "lar:///ha.ka.ba/@catalog/@";
  const corpusEntries = Object.entries(catalog?.tiddlers ?? {})
    .filter(([uri]) => uri.startsWith(CORPUS_PREFIX))
    .map(([uri, tiddler]) => ({
      id: uri.slice(CORPUS_PREFIX.length),
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

    // Self-describing: corpus doc holds its own lar: URI + automerge URL as a tiddler.
    // Any peer that opens the doc can discover its canonical lar: address without a catalog lookup.
    const corpusUri = corpusLarUri(entry.id);
    const existingCorpusSelfRef = tiddlerText(handle.doc()?.tiddlers?.[corpusUri]);
    if (existingCorpusSelfRef !== handle.url) {
      handle.change((doc) => {
        doc.tiddlers[corpusUri] = mutableLarRecord(corpusUri, { text: handle.url }, "lararium-seed");
      });
    }

    // Zelenka: keep tiddler store current so any peer can enumerate corpora
    // without walking the corpora Record — same pattern as LarDoc oracle.
    const existingText = tiddlerText(catalogHandle.doc()?.tiddlers?.[corpusUri]);
    if (existingText !== entry.docUrl) {
      catalogHandle.change((doc) => {
        doc.tiddlers[corpusUri] = mutableLarRecord(corpusUri, { text: entry.docUrl }, "lararium-seed");
      });
    }
  }));

  // ── 4. Wiki doc — oracle tiddler path ──────────────────────────────────
  const wikiDocUrl = tiddlerText(catalog?.tiddlers?.[wikiKey]) ?? null;
  const blankRoom  = blankMemeStore(repo);
  const wikiHandle: DocHandle<LarDoc> = wikiDocUrl
    ? await waitHandleLocal<LarDoc>(repo, wikiDocUrl as AutomergeUrl, blankRoom)
    : blankRoom();

  if (!wikiDocUrl) {
    // Write as oracle tiddler — same schema as browser peer.
    catalogHandle.change((doc) => {
      (doc.tiddlers as Record<string, LarTiddlerRecord>)[wikiKey] = mutableLarRecord(wikiKey, { text: wikiHandle.url }, "lararium-boot");
    });
  }
  const wikiBagId = wikiLarUri(wikiId);
  const wikiStore = new AutomergeDocStore(wikiHandle, wikiBagId);
  composite.addLayer({ bagId: wikiBagId, store: wikiStore, writable: true });
  emit("wiki-ready");

  // ── 5. Wiki-Drafts doc — per-user, stored in catalog oracle tiddler ───────
  // Node peer uses hostId:wikiId identity for its own drafts (operator drafts).
  // User drafts from browser peers are stored under each browser peer's DID key.
  const identity = new OpenIdentitySlot(`${hostId}:${wikiId}`);
  const draftTiddlerKey = `${wikiKey}/drafts/${encodeURIComponent(identity.did)}`;
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
  // ${wikiLarUri(slug)}/drafts/${peerDid} (unchanged); only the layer
  // bagId namespace changed from the static "draft" constant.
  const draftBagId = wikiDraftLarUri(wikiId);
  composite.addLayer({ bagId: draftBagId, store: new AutomergeDocStore(draftHandle, draftBagId), writable: true });

  // S6 E.2 — projection layer. In-memory MemoryTiddlerStore at top read
  // priority. Holds TW5 runtime state ($:/state/*, $:/HistoryList,
  // $:/StoryList, derived projections) that the operator does not want
  // synced or persisted. Writes route here only when record.bag ===
  // BAG_IDS.projection ("projection"); defaultWritable=false keeps draft
  // as the unbagged-write target. Daemon restart starts this layer empty.
  composite.addLayer({
    bagId:           BAG_IDS.projection,
    store:           new MemoryTiddlerStore(),
    writable:        true,
    defaultWritable: false,
  });
  emit("draft-ready");

  // ── 6. LarPeer ────────────────────────────────────────────────────────────
  wikiStore.markSyncComplete();
  const peer = new LarPeer<VmPool<MemeRecipeVm>>({
    peerId:       `${hostId}:${wikiId}`,
    store:        composite,
    capabilities: PEER_CAPABILITIES_NODE,
    identity,
  });
  emit("peer-ready");

  // ── 7. TW5Engine ──────────────────────────────────────────────────────────
  // Derive VM bag stack from the recipe tiddler seeded into ha island.
  // Falls back to composite.layerIds (full view) if recipe is not yet available.
  // Default recipe: content Tiga — ha + ka + ba, no social plane, no wiki leaf.
  const resolvedRecipeUri = recipeUriOpt ?? recipeUri("@lararium", "default");
  const vmRecipe = await composite.getRecipe(resolvedRecipeUri);
  const vmBagStack: readonly string[] = vmRecipe?.bagStack ?? composite.layerIds;

  // Corpus tiddlers (bags/@lares, bags/@lararium) arrive via the bag recipe stack.
  // Only preload vendored plugins declared in the resolved Recipe's plugins list.
  tw5 = new TW5Engine();
  const preloadedTiddlers: Array<Record<string, unknown>> = [];

  // Only preload vendored plugins declared in the resolved Recipe's plugins list.
  const recipePlugins = new Set(vmRecipe?.plugins ?? []);
  for (const [id, entry] of Object.entries(blobs)) {
    if (!id.startsWith("$:/plugins/")) continue;
    if (!recipePlugins.has(id)) continue;
    try {
      const parsed = JSON.parse(new TextDecoder().decode(new Uint8Array(entry.blob))) as unknown;
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of arr) {
        if (item && typeof item === "object" && (item as Record<string, unknown>)["title"]) {
          preloadedTiddlers.push(item as Record<string, unknown>);
        }
      }
    } catch { /* malformed — skip */ }
  }

  // Preload the social bootstrap plugin container.
  // The lararium-bootstrap-sync startup module (lararium-boot-shadows.json) promotes
  // this plugin to a regular wiki tiddler at boot, routing it to the CRDT store.
  if (bootstrapPlugin) preloadedTiddlers.push(bootstrapPlugin);

  await tw5.boot(coreBlob, preloadedTiddlers.length > 0 ? preloadedTiddlers : undefined);
  emit("tw5-booted");

  // ── 7a. Event bus — ingress rings + tick loop ────────────────────────────
  // Constructed before NodeVmManager so onWorkerEvent can enqueue to vm-ring.
  const eventBus = new LarEventBusImpl(20);
  for (const ring of DEFAULT_RINGS) eventBus.registerRing(ring);
  eventBus.start();

  // P.2 — NodeVmManager. Mount PrimaryWiki as pinned slot.
  // Adaptor wires after IslandAdaptor construction below; updateAdaptor called there.
  // onWorkerEvent routes RE reactions from hot-tier Workers into the vm-ring.
  vmManager = new NodeVmManager({
    onWorkerEvent: (wikiId, msg) => {
      eventBus.enqueueToRing("vm-ring", "worker.event", {
        wikiId,
        listenable: msg.listenable,
        payload: msg.payload,
      });
    },
  });
  vmManager.mountPrimary(wikiId, tw5, null);
  if (islandHandle) vmManager.registerDocHandle(wikiId, islandHandle);

  // ── 8. Corpus bags — await after TW5 boots ────────────────────────────────
  await corpusReadyP;
  emit("corpus-ready");

  // ── 9. IslandAdaptor + N-accumulators — causal-island ↔ TW5 wiki bridge ────
  // Adaptor: pre-sync buffer + non-CRDT immediate apply + outbound saveTiddler/deleteTiddler.
  // Accumulators: one per bag in recipe — sibling projections; buffer crdt-remote
  // patches post-sync and drain them as one nalu per setInterval tick.
  // Priority order matches vmBagStack (lowest index = lowest priority read layer).
  const adaptor = new IslandAdaptor(tw5, peer.store, wikiBagId);
  vmManager.updateAdaptor(wikiId, adaptor);
  peer.addProjection(adaptor);

  const accumulators: IslandAccumulator[] = vmBagStack.map(() => {
    const acc = new IslandAccumulator();
    peer.addProjection(acc);
    return acc;
  });

  const _nodeTickHandle = setInterval(() => {
    adaptor.flushAll(accumulators, 200);
  }, 16);

  // ── 10. VmPool ────────────────────────────────────────────────────────────
  const pool = new VmPool<MemeRecipeVm>();
  const _vmFactory = vmFactory ?? (
    async (_uri: string, engine: TW5Engine, bags: readonly string[]) =>
      new DirectMemeRecipeVm(engine, bags)
  );
  await pool.get(resolvedRecipeUri, () => _vmFactory(resolvedRecipeUri, tw5, vmBagStack));
  peer.attachVmPool(pool);

  emit("live");
  return {
    peer, tw5, pool, repo, eventBus,
    store: composite,
    vmManager,
    admin: adminVm,
    keyhive,
    catalogHandleUrl: catalogHandle.url,
    larariumDocUrl: islandHandle?.url ?? null,
    phase: "live",
    stopTick: () => clearInterval(_nodeTickHandle),
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
 * Call after `openNodeLarPeer` returns. One call per operator session.
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
