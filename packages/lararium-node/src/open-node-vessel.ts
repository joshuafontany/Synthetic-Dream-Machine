/**
 * openNodeVessel — local-first Node.js vessel factory.
 *
 * A thin RECIPE over the composable-keel engine. Node supplies the platform atoms (NodeFS storage,
 * WS relay + DaemonAuthGate, worker_threads pool) and the capability pieces it holds (the inbound
 * gate, the corpus loader, the residual pool/repo verbs, the main-resident BagResidencyManager
 * mechanism). `prepareNodeBoot` builds those atoms + the keel + the boot closures ONCE; the two boot
 * entry-points compose the right #has-cap-stack over them:
 *   - openNodeVessel → composeLararium (the FULL node: substrate → daemon → wiki → pool → live).
 *   - openNodeHerm   → composeHerm     (the wiki-LESS Herm: substrate → daemon → meshpalace →
 *     read-face). The @daemon stays (the immune core); its registerBags omits the absent wiki bags.
 *
 * The node vessel holds no semantic privilege. It carries roads, docks, and sync; live VM state lives
 * in sovereign islands (daemon + wiki). FPI-5 (trim tab): all Node-specific code lives here.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join }                         from "path";
import type { Server }                  from "node:http";
import type { DocHandle, AutomergeUrl } from "@automerge/automerge-repo";
import { Repo }                         from "@automerge/automerge-repo";
import { NodeFSStorageAdapter }         from "@automerge/automerge-repo-storage-nodefs";
import { NodeWSServerAdapter }          from "@automerge/automerge-repo-network-websocket";
import type { WebSocketServer }         from "isomorphic-ws";
import type {
  LarDoc,
  LarariumVesselOptions, VesselResult, LarOpenPhase,
  VesselBootstrap, VesselCoreAssembly,
  CompositeStore, MeshPalaceDoc,
} from "@lararium/mesh";
import {
  makeDurableMailbox,
  OpenIdentitySlot,
  emptyLarDoc, mutableLarRecord, tiddlerText,
  ORACLE_DOC_URI, LARARIUM_DOC_URI, CATALOG_DOC_URI, LARES_DOC_URI, WORKING_BAG,
  IDENTITIES_DOC_URI, CIRCLES_DOC_URI, SESSIONS_DOC_URI, DAEMON_BAG_ID, PERSONA_BAG_ID,
  BAG_IDS, slugFromUri,
  PERSONA_GROUP_DOC_ID_TIDDLER, PERSONA_GROUP_AGENT_ID_TIDDLER, MESH_CABAL_DOC_ID_TIDDLER,
  SIGNER_DID_TIDDLER, DEVICE_DELEGATION_SELF_TIDDLER, type DeviceDelegationTiddler,
  ENGINE_CORE_ID, BagResidencyManager, pluginCidsFromIslandBlobs,
}                                       from "@lararium/mesh";
import { casDirForStorage, mirrorGenesisCasFs } from "./node-cas.js";
import {
  ACTIVE_WIKI_URI,
  MemoryTiddlerStore,
  planActiveWikiSlot,
  selectActiveWikiSlug,
  seedVesselDefaults,
  loadCatalogCorpora,
} from "@lararium/tw5";
import type { VesselWikiSlot, DaemonVmCore, VesselDaemonVm, VesselOrchestration } from "@lararium/tw5";
import {
  loadOrMaterializeOracle,
  reconcileWellKnownTiddlers, mintLaresIfAbsent, mintLarariumIfAbsent,
  readGenesisManifest, genesisCasDir,
} from "./genesis-artifact.js";
import { repoRoot }                       from "@lararium/mesh/node";
import { withMempalace, writebackWing, TelemetryUnavailable, resolvePalacePath, deriveSubagentEdges, orderHandleTurnsToStubs } from "@lararium/mempalace";
import { LarEventBusImpl, DEFAULT_RINGS } from "@lararium/mesh";
import type { SparseFormVector, WorldlineStubWire } from "@lararium/mesh";
import { VesselIslandPool }                from "./vessel-island-pool.js";
import { larRuntimeDir, larAstPalaceDir, larFormPalaceDir }  from "./vessel-paths.js";
import { makeFormPalace, type FormPalace }  from "./formpalace.js";
import { multiGraphRecall, makeFormSearch }  from "./multi-graph-recall.js";
import { waitHandleLocal, resolveBootDoc } from "./repo-helpers.js";
import { openDaemonVm }                    from "./open-daemon-vm.js";
import {
  makeResidencyStatsReactor,
} from "@lararium/tw5";   // residency stats — the lone read that stays main-resident
import { generateOrLoadVesselIdentity, loadVesselSigningSeed } from "./node-vessel-identity.js";
import { DaemonAuthGate }                           from "./daemon-auth-gate.js";
import { composeLararium, composeHerm, meshPalaceCap, carriageCap, meshSelfDial, type MeshSelf } from "./node-caps.js";

const DEFAULT_GENESIS_DIR = join(repoRoot, "genesis");   // one root law (early alpha, no package-dir compatibility)

/**
 * Pull a sparse form-vector out of a form-store entry's stored `document` (the move-space position
 * the worldline-trajectory read joins). The python store keeps the dense embedding internally; the
 * JSON `document` carries the axis activation. The host fetches this node-side (the form store is a
 * node child_process the worker can't reach) and SHIPS it to the in-VM trajectory read. An absent /
 * unparseable document yields null (the worker keeps the turn's TIME slot, form null). Moved here from
 * the retired node-side worldline-holder when the reads lifted into the sovereign worker.
 */
function parseFormVector(document: string): SparseFormVector | null {
  try {
    const obj = JSON.parse(document) as Record<string, unknown>;
    const act = obj["axis_activation"];
    if (act && typeof act === "object") {
      const entries = Object.entries(act as Record<string, unknown>).filter(([, v]) => typeof v === "number");
      if (entries.length === 0) return { indices: [], values: [] };
      return {
        indices: entries.map((_, i) => i),
        values: entries.map(([, v]) => v as number),
      };
    }
    return { indices: [], values: [] };
  } catch {
    return null;
  }
}

/**
 * Upstream's NodeWSServerAdapter declares ready only on its FIRST client
 * connection — un-pono for a local-first vessel: readiness reads from local
 * state (the server listens), never from a peer's arrival (no global now).
 * Upstream's own CLIENT adapter force-readies on a 1s timer for the same
 * reason. Without this, a zero-client vessel parks every storage-miss
 * repo.find() at networkSubsystem.whenReady() and the island→main→island
 * doc relay deadlocks silently (no reply, not even doc-unavailable).
 */
class ListeningWSServerAdapter extends NodeWSServerAdapter {
  override isReady(): boolean { return true; }
  override whenReady(): Promise<void> { return Promise.resolve(); }
}
/** Title of the social bootstrap plugin tiddler baked by lararium:init. */
export const SOCIAL_BOOTSTRAP_PLUGIN_TITLE = "lar:///ha.ka.ba/@lararium/bootstrap/social";

/** @see LarOpenPhase in @lararium/mesh */
export type NodeOpenPhase = LarOpenPhase;

/** Which #has-cap-stack openNodeVessel composes. Default the full Lararium. */
export type NodeRecipe = "lararium" | "herm";

export interface NodeVesselOptions extends LarariumVesselOptions {
  storageDir: string;
  wss:        WebSocketServer;
  catalogUrl?: string | null;
  /** Directory containing social-bootstrap.json. Defaults to the package's own genesis/. */
  genesisDir?: string;
  /** Repo root for wiki memes scan and all mirror paths. Defaults to monorepo root. */
  rootDir?: string;
  /** Cap-stack to compose. "herm" → the wiki-less Lares Viales (use openNodeHerm). Default "lararium". */
  recipe?: NodeRecipe;
  /** HTTP server the Herm's FLOW-map read-face serves over (required for openNodeHerm). */
  httpServer?: Server;
  /** This vessel's mesh standing — derived once via deriveMeshSelf. Present → it self-announces,
   *  self-peers, re-ranks by proximity + drifts r (a Lararium carries ALONGSIDE its wiki-full core; a
   *  Herm IS its carriage). Absent → a leaf that only carries what it pulls. */
  meshSelf?: MeshSelf;
  /** Carriage pull cadence (ms) — tuning, kept separate from membership. */
  pullIntervalMs?: number;
}

export interface NodeVesselResult extends VesselResult<VesselIslandPool, DaemonVmCore> {
  /** Started event bus — ingress rings registered; tick loop running at 20 Hz (node substrate). */
  eventBus:  LarEventBusImpl;
  /** Stop the N-accumulator tick loop (call on graceful shutdown). */
  stopTick:  () => void;
}

/** A composed Herm (wiki-less): the @daemon immune core + a served @meshpalace FLOW-map, no pool. */
export interface NodeHermResult {
  recipe:           "herm";
  repo:             Repo;
  store:            CompositeStore;
  daemon:           DaemonVmCore;
  meshPalaceHandle: DocHandle<MeshPalaceDoc>;
  oracleDocUrl:     string;
  catalogHandleUrl: string;
  larariumDocUrl:   string | null;
  phase:            "live";
  /** Tear down the read-face + the daemon island, then the composed vessel (reverse build order). */
  dispose:          () => Promise<void>;
}

const blankMemeStore = (repo: Repo): (() => DocHandle<LarDoc>) =>
  () => repo.create<LarDoc>(emptyLarDoc());

/** The atoms + keel + boot closures both node cap-stacks compose over (built ONCE per boot). */
interface NodeBootPrep {
  repo:             Repo;
  catalogHandle:    DocHandle<LarDoc>;
  operatorSeed:     Uint8Array;
  residency:        BagResidencyManager;
  emit:             (p: NodeOpenPhase) => void;
  /** The full-node orchestration (keel + every VM closure) the shared openVesselCore walks. */
  orchestration:    VesselOrchestration<VesselIslandPool>;
  /** The daemon/verb closures the granular herm caps consume (openDaemon takes the slot OPTIONAL). */
  openDaemon:       (a: { assembly: VesselCoreAssembly; slot?: VesselWikiSlot }) => Promise<VesselDaemonVm>;
  wireVerbs:        (registry: Parameters<NonNullable<VesselOrchestration<VesselIslandPool>["wireVerbs"]>>[0], assembly: VesselCoreAssembly) => void;
  afterDaemon:      (daemon: VesselDaemonVm, assembly: VesselCoreAssembly) => void;
  /** Forward-ref reads — set as the closures run (the same `let vmManager!` pattern, surfaced). */
  daemonVm:         () => DaemonVmCore;
  eventBus:         () => LarEventBusImpl;
  slotActiveWikiId: () => string;
  activeWikiSource: () => "boot-arg" | "daemon-marker";
}

/**
 * Build the shared node boot substrate: the platform atoms (repo + WS relay/gate, catalog, operator
 * identity, residency mechanism) + the keel recipe + the VM-focused closures (wiki-slot, daemon,
 * verbs, pool, after-hooks). NO sequencing here — `composeLararium`/`composeHerm` wire the order.
 */
async function prepareNodeBoot(opts: NodeVesselOptions): Promise<NodeBootPrep> {
  const { hostId, wikiId, storageDir, wss, catalogUrl, onPhase, genesisDir, rootDir: rootDirOpt } = opts;
  const bootstrapPath = join(genesisDir ?? DEFAULT_GENESIS_DIR, "social-bootstrap.json");
  const emit = (p: NodeOpenPhase) => onPhase?.(p);

  emit("boot");

  // ── 1. Repo — NodeFS storage + WebSocket relay behind the DaemonAuthGate ─────
  const storage = new NodeFSStorageAdapter(storageDir);
  const authGate = new DaemonAuthGate(wss);
  const network  = new ListeningWSServerAdapter(authGate as unknown as typeof wss);
  const peerIdentifierMap = new Map<string, string>();
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
    // Two rings: WS peers (outside) must have passed the DaemonAuthGate; the
    // vessel's OWN islands (MessageChannel peers — daemon + wiki workers) are
    // house members and share freely. Without the island ring, main never
    // relays daemon-island-minted docs (@personal/@draft bindings) to the wiki
    // island and its slot-resolve hangs at boot.
    sharePolicy: async (peerId) => {
      const wsSocket = (network.sockets as Record<string, unknown> | undefined)?.[peerId];
      return wsSocket ? peerIdentifierMap.has(peerId) : true;
    },
  });
  emit("repo-open");

  // ── 2. Catalog — local-first rendezvous anchor (catalog-url file) ───────────
  const catalogUrlFile = join(storageDir, "catalog-url");
  let resolvedCatalogUrl: string | null = catalogUrl ?? null;
  if (!resolvedCatalogUrl) {
    try { resolvedCatalogUrl = readFileSync(catalogUrlFile, "utf8").trim() || null; } catch { /* first boot */ }
  }
  const blankCatalog = (): DocHandle<LarDoc> => {
    const h = repo.create<LarDoc>(emptyLarDoc());
    h.change((doc) => {
      doc.tiddlers[CATALOG_DOC_URI] = mutableLarRecord(CATALOG_DOC_URI, { text: h.url }, "lararium-seed");
    });
    try { mkdirSync(storageDir, { recursive: true }); writeFileSync(catalogUrlFile, h.url, "utf8"); } catch { /* quota */ }
    return h;
  };
  const catalogHandle: DocHandle<LarDoc> = resolvedCatalogUrl
    ? await resolveBootDoc<LarDoc>(repo, resolvedCatalogUrl as AutomergeUrl, { tideline: "hearth-private", label: "@catalog" })
    : blankCatalog();  // first boot (no url yet): legitimate founder-mint, not a ghost fallback
  if (resolvedCatalogUrl && resolvedCatalogUrl !== catalogUrl) {
    try { mkdirSync(storageDir, { recursive: true }); writeFileSync(catalogUrlFile, catalogHandle.url, "utf8"); } catch { /* quota */ }
  }
  emit("catalog-ready");

  // ── Operator identity (node-held) ──────────────────────────────────────────
  const operatorIdentity = await generateOrLoadVesselIdentity(storageDir);
  const operatorSeed     = await loadVesselSigningSeed(storageDir);

  // ── Main-resident residency MECHANISM (sovereign-worker: policy in the worker,
  //    mechanism here). onEvict commands the pool via the forward `vmManager` ref. ──
  let vmManager!: VesselIslandPool;        // set in makePool
  let daemonVm!:   DaemonVmCore;           // set in openDaemon
  let eventBus!:  LarEventBusImpl;         // set in makePool
  let bootstrap!: VesselBootstrap;         // captured in loadGenesis
  let slotActiveWikiId = "";               // captured in wikiSlot
  let activeWikiSource: "boot-arg" | "daemon-marker" = "boot-arg";

  const residency = new BagResidencyManager({
    hotCap:          32,
    idleMs:          300_000,
    sweepIntervalMs:  30_000,
    onEvict: async (bagId) => {
      await vmManager.unmountWiki(bagId);
      console.log(`[bag-residency] evicted ${bagId} (vm unmounted, compact-then-drop reserved for repo#358)`);
    },
  });

  // Read the daemon doc (idempotent re-resolve; openDaemonVm finds the same handle).
  const readDaemonDoc = async (): Promise<DocHandle<LarDoc>> =>
    resolveBootDoc<LarDoc>(repo, bootstrap.daemonUrl as AutomergeUrl, { tideline: "hearth-private", label: "@daemon" });

  const keel: VesselOrchestration<VesselIslandPool>["keel"] = {
    repo,
    catalogHandle,
    waitHandle: <T>(url: AutomergeUrl, fallback: () => DocHandle<T>) => waitHandleLocal<T>(repo, url, fallback),

    // Genesis island (required) + the social-plane bootstrap it carries.
    loadGenesis: async () => {
      // Slice 2: the @oracle is a LIVE CRDT under a DETERMINISTIC doc id — reload
      // it when persisted (operator writes intact), else MATERIALIZE it fresh from
      // the plain-data seed (island.genesis.json). No Automerge-binary boot seed,
      // no merge-into-stale. The catalog @oracle pointer (written by assembleVessel)
      // is now advisory back-reference, no longer the identity mechanism.
      const islandHandle = await loadOrMaterializeOracle(repo, genesisDir);

      // @lares + @lararium system-bag mint — operator(admin) office, node home
      // only. Both pointers ride the @oracle system plane (the island doc);
      // @oracle/@lararium/@lares stand as three separate docs (operator ruling
      // 2026-06-16). The corpus doc starts empty; LOAD/ingest fills it.
      mintLaresIfAbsent(repo, islandHandle);
      mintLarariumIfAbsent(repo, islandHandle);

      const coreBlobEntry = (islandHandle.doc()?.blobs ?? {})[ENGINE_CORE_ID];
      if (!coreBlobEntry) {
        throw new Error(`[openNodeVessel] missing TW5 core blob metadata (${ENGINE_CORE_ID}) in LarDoc; re-run build:genesis`);
      }
      const coreHash = coreBlobEntry.sha256;
      if (!coreHash) throw new Error(`[openNodeVessel] TW5 core blob missing sha256; re-run build:genesis`);

      // Populate the fs CAS — every island worker pulls engine + plugin bytes by CID from
      // this local CID plane, off the sync port. The genesis CRDT now carries METADATA only;
      // the bytes ship as genesis/cas/<cid> files indexed by island.manifest.json. Mirror exactly
      // those into the runtime CAS the workers read via resolveByCid (the nodefs face of the
      // browser vessel's OPFS fetch — isomorphic by composition).
      const manifest = readGenesisManifest(genesisDir);
      if (!manifest) {
        throw new Error(
          `[openNodeVessel] genesis CAS manifest (island.manifest.json) absent or malformed — re-run build:genesis`,
        );
      }
      const casWritten = mirrorGenesisCasFs(manifest, genesisCasDir(genesisDir), casDirForStorage(storageDir));
      if (casWritten > 0) console.log(`[openNodeVessel] fs CAS: mirrored ${casWritten} blob(s) by CID from genesis/cas`);

      // Bootstrap URLs: genesis/social-bootstrap.json (init node — authoritative),
      // falling back to the island oracle (replica vessels).
      let bootstrapPlugin: Record<string, unknown> | null = null;
      if (existsSync(bootstrapPath)) {
        try { bootstrapPlugin = JSON.parse(readFileSync(bootstrapPath, "utf8")) as Record<string, unknown>; } catch { /* malformed */ }
      }
      const bootstrapTiddlers: Record<string, { text?: string }> = bootstrapPlugin
        ? (JSON.parse(bootstrapPlugin["text"] as string) as { tiddlers: Record<string, { text?: string }> }).tiddlers
        : {};
      const id   = islandHandle.doc()?.tiddlers;
      const identitiesUrl = bootstrapTiddlers[IDENTITIES_DOC_URI]?.text ?? tiddlerText(id?.[IDENTITIES_DOC_URI]) ?? null;
      const circlesUrl    = bootstrapTiddlers[CIRCLES_DOC_URI]?.text    ?? tiddlerText(id?.[CIRCLES_DOC_URI])    ?? null;
      const sessionsUrl   = bootstrapTiddlers[SESSIONS_DOC_URI]?.text   ?? tiddlerText(id?.[SESSIONS_DOC_URI])   ?? null;
      const daemonUrl      = bootstrapTiddlers[DAEMON_BAG_ID]?.text       ?? tiddlerText(id?.[DAEMON_BAG_ID])       ?? null;
      const personaUrl     = bootstrapTiddlers[PERSONA_BAG_ID]?.text      ?? tiddlerText(id?.[PERSONA_BAG_ID])      ?? null;
      if (!identitiesUrl || !circlesUrl || !sessionsUrl || !daemonUrl || !personaUrl) {
        throw new Error(
          `[lararium] social plane not initialised — run: pnpm --filter @lararium/node lararium:init\n` +
          `  missing: ${[!identitiesUrl && "@identities", !circlesUrl && "@circles", !sessionsUrl && "@sessions", !daemonUrl && "@daemon", !personaUrl && "@persona"].filter(Boolean).join(", ")}`,
        );
      }
      bootstrap = { identitiesUrl, circlesUrl, sessionsUrl, daemonUrl, personaUrl };
      return { islandHandle, coreHash, bootstrap };
    },

    tempStore: () => new MemoryTiddlerStore(),

    // Corpus capability piece — one top-level bag per catalog corpus entry (shared loader).
    loadCorpora: (composite) => loadCatalogCorpora({
      repo, catalogHandle,
      mintLocalHandle: (docUrl) => waitHandleLocal<LarDoc>(repo, docUrl as AutomergeUrl, blankMemeStore(repo)),
      source: "lararium-seed",
    }, composite),

    ...(onPhase ? { onPhase } : {}),
  };

  // Active-wiki slot — slug from the daemon-doc marker (post-genesis).
  const wikiSlot = async (_assembly: VesselCoreAssembly): Promise<VesselWikiSlot> => {
    const sel = selectActiveWikiSlug(wikiId, (await readDaemonDoc()).doc()?.tiddlers?.[ACTIVE_WIKI_URI] ?? null);
    activeWikiSource = sel.source;
    slotActiveWikiId = sel.slug;
    const identity = new OpenIdentitySlot(`${hostId}:${sel.slug}`);
    const plan = planActiveWikiSlot({ hostId, wikiSlug: sel.slug, identityDid: identity.did });
    return {
      activeWikiId:     sel.slug,
      wikiSlug:         slugFromUri(sel.slug),
      wikiKey:          plan.wikiKey,
      wikiBagId:        plan.wikiBagId,
      draftOracleTitle: plan.draftOracleTitle,
      draftBagId:       plan.draftBagId,
    };
  };

  // Daemon VM — sovereign daemon island + the operator's authn/z home. `slot` ABSENT (herm) →
  // registerBags omits the user-wiki bags (the decouple); the @daemon's OWN bag still mounts.
  const openDaemon = async ({ assembly, slot }: { assembly: VesselCoreAssembly; slot?: VesselWikiSlot }): Promise<VesselDaemonVm> => {
    const daemonDoc = (await readDaemonDoc()).doc();
    const personaGroupDocIdHex   = tiddlerText(daemonDoc?.tiddlers?.[PERSONA_GROUP_DOC_ID_TIDDLER])   ?? null;
    const personaGroupAgentIdHex = tiddlerText(daemonDoc?.tiddlers?.[PERSONA_GROUP_AGENT_ID_TIDDLER]) ?? null;
    const meshCabalDocIdHex     = tiddlerText(daemonDoc?.tiddlers?.[MESH_CABAL_DOC_ID_TIDDLER])     ?? null;
    if (!personaGroupDocIdHex || !personaGroupAgentIdHex || !meshCabalDocIdHex) {
      throw new Error(`[lararium] DreamNet sentinel oracle tiddlers missing — run \`lares init\`.`);
    }
    // The binding signer-pin + edge — the Binding Gate's authority. FAIL-CLOSED: a missing pin or
    // edge MUST halt the boot, NEVER fall through to skip the Binding Gate (the confused-deputy / PCD cure).
    const signerDid  = tiddlerText(daemonDoc?.tiddlers?.[SIGNER_DID_TIDDLER]) ?? null;
    const edgeRecord = daemonDoc?.tiddlers?.[DEVICE_DELEGATION_SELF_TIDDLER];
    if (!signerDid || !edgeRecord?.tiddler) {
      throw new Error(`[lararium] DreamNet binding (signer pin + device edge) missing from daemon doc — run \`lares init\`.`);
    }
    const deviceEdge = edgeRecord.tiddler as unknown as DeviceDelegationTiddler;
    const daemonAuth = {
      seed:                 operatorSeed,
      operatorVerifyingKey: operatorIdentity.verifyingKey,
      personaGroupDocIdHex, personaGroupAgentIdHex, meshCabalDocIdHex,
      registerBags: [
        DAEMON_BAG_ID, BAG_IDS.identities, BAG_IDS.groups, BAG_IDS.sessions,
        BAG_IDS.catalog, BAG_IDS.oracle, BAG_IDS.lararium, BAG_IDS.lares,
        // User-wiki bags ride registerBags ONLY when a wiki slot is in the stack — a Herm carries
        // no wiki, so it never registers them (blind by structure, not a flag).
        ...(slot ? [slot.wikiBagId, slot.draftBagId] : []),
      ],
      signerDid,
      deviceEdge,
    };
    // The engine's plugin-tiddler CIDs — the daemon worker pulls them by CID from the fs CAS
    // (the breath path), never CRDT-syncing the bytes over the port. Same derivation the pool
    // feeds every wiki island; mirrors the browser vessel.
    const pluginCids = pluginCidsFromIslandBlobs(assembly.islandHandle.doc()?.blobs);
    daemonVm = await openDaemonVm({
      repo,
      daemonUrl: bootstrap.daemonUrl,
      personaUrl: bootstrap.personaUrl,
      coreHash: assembly.coreHash,
      ...(pluginCids.length ? { pluginCids } : {}),
      grants: {
        islandUrl: assembly.islandHandle.url,
        // The daemon island's OWN bag (@daemon = wikiBagUri("daemon"), one-recipe model).
        wikiUrl:   bootstrap.daemonUrl,
        // ACCESS grant, not a LOAD slot — @catalog is absent from expandRecipe,
        // so the kernel never layers it; the worker reaches it via the accessor.
        catalogUrl: catalogHandle.url,
      },
      daemonAuth,
      storageDir,
      // SINK for the @daemon's idempotent capture cap (the telemetry nalu): the palace + the
      // vessel-home spool/WAL/quarantine. Wiring this makes the cap LIVE (it boots the engine +
      // 20Hz tick + the self-regulating two-loop); it stays inert until a FEED sends
      // telemetry:place-verb. role = capability ≠ platform — node supplies the mempalace sink.
      telemetry: {
        // The palace is the chroma dir ~/.mempalace/palace (config palace_path), NOT the parent
        // ~/.mempalace — passing the parent targets a phantom second palace. MEMPALACE_PALACE_PATH
        // overrides for a custom config. resolvePalacePath() CANONICALIZES it (realpath/normalize)
        // so one physical palace = one spelling = one write-daemon (the pile-up cure); takes effect
        // on this @daemon's NEXT restart, never racing a live daemon under an old spelling.
        palacePath:     resolvePalacePath(),
        // TRANSIENT flush batches → tmpfs (XDG_RUNTIME_DIR): write→mine→rm, never need to survive a
        // reboot. The DURABLE layer (WAL + quarantine) stays on disk — that's the crash-replay seam.
        spoolDir:       join(larRuntimeDir(), "capture-nalu"),
        walPath:        join(storageDir, "capture-nalu", "wal.ndjson"),
        quarantinePath: join(storageDir, "capture-nalu", "quarantine.ndjson"),
        // The DURABLE .astpalace — a SECOND mempalace instance (same ChromaDB engine, separate
        // palace) at `~/.lares/.astpalace`, PARALLEL to the verbatim palace + `.meshpalace`. It
        // sits BESIDE the wipe-zone (not inside .lararium / tmpfs): the recurrence tally is durable
        // bridge state that must survive reboots AND `reset`. LAR_ROOT-isolated for staged instances.
        astPalaceDir:   larAstPalaceDir(),
        // The DURABLE .formpalace — the living-grammar FORM-vector store (the two-planes form-capture's
        // CONTINUOUS plane, encoded) at `~/.lares/.formpalace`, PARALLEL to `.astpalace`. Keyed by
        // verbatim_sha (the cross-graph join to the verbatim content drawer); durable bridge state,
        // beside the wipe-zone, never federates. LAR_ROOT-isolated for staged instances.
        formPalaceDir:  larFormPalaceDir(),
      },
    });
    return { workerEa: daemonVm.workerEa, mountMainVerbs: daemonVm.mountMainVerbs, resolveBinding: daemonVm };
  };

  // Thin main verb plane. Every daemon verb that touches the catalog / recipe /
  // residency now lives in the worker (wireWorkerVerbs) — the daemon holds ACCESS to
  // all bags there and writes-then-syncs, never reaching into a mounted wiki. Main
  // keeps only what is genuinely main-resident: sync-wiki (commands the pool's active
  // wiki island) and residency stats (a read of the main-resident manager).
  const wireVerbs: VesselOrchestration<VesselIslandPool>["wireVerbs"] = (registry, _assembly) => {
    seedVesselDefaults(registry);
    // The recall FORM leg — opened ONCE, lazily, on the first dual recall. It REUSES the singleton
    // form holder the capture engine already runs for the same dir (makeFormPalace ref-counts per
    // canonical dir), so this adds one reference, never a second process. Closed implicitly at
    // process exit / idle-reap; recall never tears the holder down under the live capture engine.
    let recallFormPalace: FormPalace | null = null;
    registry.register("sync-wiki", async (args, ctx) =>
      vmManager.placeWikiVerb(slotActiveWikiId, {
        verb: "sync-wiki", args: args as Record<string, unknown>, requestedBy: ctx.invocation.requestedBy,
      }),
    );
    // wiki-act: command a residency ACTION verb to run IN the active wiki
    // island over ITS composite (operator ruling 2026-06-19: promotion executes
    // where @working + canon both live — the island owns its composition; the
    // daemon commands, never reaches the per-fingerprint @working binding). The
    // inner verb (MOVE/LOAD/…) routes to the island's own action reactors.
    registry.register("wiki-act", async (args, ctx) =>
      vmManager.placeWikiVerb(slotActiveWikiId, {
        verb: String(args["verb"]),
        args: (args["args"] as Record<string, unknown>) ?? {},
        requestedBy: ctx.invocation.requestedBy,
      }),
    );
    registry.register("residency", makeResidencyStatsReactor({ residency }));
    // recall — the mempalace READ membrane (Option D, slice 1). The @daemon host
    // reaches the verbatim PLACE memory THROUGH the seat: a read-only sidecar,
    // spawned per call, semantic-search | list | get. mempalace stays a sibling
    // behind the causal-island shore (web3-only law) — only its REACH
    // moves from a raw CLI subprocess to this mediated, capability-gated verb (it
    // rides the worker's verify-then-delegate gate for free, routed to main as the
    // sidecar I/O lives here). A persistent/pooled client is a later optimization.
    registry.register("recall", async (args) => {
      const drawerId = typeof args["drawer"] === "string" ? (args["drawer"] as string) : "";
      const query    = typeof args["query"]  === "string" ? (args["query"]  as string) : "";
      const wing     = typeof args["wing"]   === "string" ? (args["wing"]   as string) : undefined;
      const limitRaw = args["limit"];
      const limit    = typeof limitRaw === "number" ? limitRaw : typeof limitRaw === "string" ? Number(limitRaw) : undefined;
      // Multi-graph recall (P4): N-ary fuse the CONTENT (verbatim mempalace) + FORM (.formpalace) +
      // later graphs by reciprocal rank fusion on the verbatim_sha. Opt-in (`dual`/`multi`) — the FORM
      // leg routes by query shape (bearing → structured where-filter · markers → vector · keywords →
      // where-or-defer). The `dual` arg name stays accepted for callers; `multi` reads the same.
      const dual         = args["dual"] === true || args["dual"] === "true"
                        || args["multi"] === true || args["multi"] === "true";
      const register     = typeof args["register"]     === "string" ? (args["register"]     as string) : undefined;
      const grammarLayer = typeof args["grammarLayer"] === "string" ? (args["grammarLayer"] as string)
                         : typeof args["grammar_layer"] === "string" ? (args["grammar_layer"] as string) : undefined;
      const fwRaw        = args["formWeight"];
      const formWeight   = typeof fwRaw === "number" ? fwRaw : typeof fwRaw === "string" ? Number(fwRaw) : undefined;
      // P6 — the paragraph-scale aperture: a 0..20 grain or a band name ("paragraph"). Off when absent.
      const agRaw        = args["apertureGrain"] ?? args["aperture_grain"] ?? args["aperture"];
      const apertureGrain = typeof agRaw === "number" || typeof agRaw === "string" ? agRaw : undefined;
      const awRaw        = args["apertureWidth"] ?? args["aperture_width"];
      const apertureWidth = typeof awRaw === "number" ? awRaw : typeof awRaw === "string" && awRaw !== "" ? Number(awRaw) : undefined;
      // Warm pooled sidecar (started once, reused, self-healing) — recall stays
      // sub-second after the first cold start; this makes recall-into-wake fast.
      return withMempalace(async (client) => {
        if (drawerId) return { mode: "drawer", drawer: await client.getDrawer(drawerId) };
        if (dual && query) {
          recallFormPalace ??= makeFormPalace(larFormPalaceDir());
          // The markers→vector derive runs IN the @daemon VM — the recall twin of capture, one runtime,
          // NO node-side fallback. A sigil-bearing query round-trips to the warm worker, where it folds
          // against the FULL self-hosted grammar + the LIVE grammar-cache basis (structural plane
          // present), so recall applies the IDENTICAL Move→Vec functor capture does. VM unavailable /
          // cold → resolves null → the markers leg fuses content-only (graceful, no shadow derive).
          const deriveSkeleton = (q: string) => daemonVm.deriveSkeleton(q);
          const formSearchLeg = makeFormSearch({ query, formPalace: recallFormPalace, deriveSkeleton });
          const res = await multiGraphRecall(
            {
              contentSearch: (a) => client.search(a),
              // The FORM leg degrades to content-only if the form holder is unavailable (no python
              // venv, store fault): a rejection collapses to [] → fuseMultiGraph fuses content-only.
              formSearch: async (input) => { try { return await formSearchLeg(input); } catch { return []; } },
            },
            {
              query,
              ...(wing          !== undefined ? { wing } : {}),
              ...(limit         !== undefined ? { limit } : {}),
              ...(register      !== undefined ? { register } : {}),
              ...(grammarLayer  !== undefined ? { grammarLayer } : {}),
              ...(formWeight    !== undefined ? { formWeight } : {}),
              ...(apertureGrain !== undefined ? { apertureGrain } : {}),
              ...(apertureWidth !== undefined ? { apertureWidth } : {}),
            },
          );
          return { mode: "multi", ...res };
        }
        if (query)    return { mode: "search", ...(await client.search({ query, ...(wing !== undefined ? { wing } : {}), ...(limit !== undefined ? { limit } : {}) })) };
        return { mode: "list", ...(await client.listDrawers({ ...(wing !== undefined ? { wing } : {}), ...(limit !== undefined ? { limit } : {}) })) };
      });
    });
    // lar-telemetry — the mempalace WRITE membrane (Option D, slice 2). The @daemon
    // host reads a wing's drawers' instrument readings (the gradient parser) and
    // projects lar_* back ONTO them THROUGH the seat (capability-gated, witnessed),
    // never a raw CLI subprocess. MVP flushes on invocation; the nalu-batched
    // hold/flush (worker enqueueNalu → on-nalu command main) is the next refinement
    // (lar:///ha.ka.ba/@lararium/api/lar-telemetry).
    registry.register("lar-telemetry", async (args) => {
      const wing = typeof args["wing"] === "string" ? (args["wing"] as string) : "";
      if (!wing) throw new Error("args.wing is required");
      const limitRaw = args["limit"];
      const limit    = typeof limitRaw === "number" ? limitRaw : typeof limitRaw === "string" ? Number(limitRaw) : undefined;
      try {
        const r = writebackWing(wing, limit !== undefined ? { limit } : {});
        return { wing, ...r };
      } catch (err) {
        if (err instanceof TelemetryUnavailable) throw new Error(`lar-telemetry unavailable: ${err.message}`);
        throw err;
      }
    });
    // capture — the FEED leg of the telemetry nalu (the @daemon WRITE membrane, forward-capture).
    // Routes ONE captured turn to the daemon island's capture cap (telemetry:place-verb → enqueue →
    // WAL → flush `mine --source ndjson` → mempalace). Fire-and-forget: the nalu owns durability +
    // self-regulation. `lares capture` is the producer; it falls back to a direct `mempalace mine`
    // when the daemon is down (verbatim-always). Distinct from lar-telemetry (the lar_* writeback).
    registry.register("capture", async (args) => {
      const turnText   = typeof args["turnText"]   === "string" ? (args["turnText"]   as string) : "";
      const sourceFile = typeof args["sourceFile"] === "string" ? (args["sourceFile"] as string) : "";
      if (!turnText || !sourceFile) throw new Error("capture: args.turnText + args.sourceFile (non-empty strings) required");
      // Optional turn-DAG fork-frontier (head turn-uuids) the producer derived — threads to buildPatch's
      // 3rd arg so a same-session fork derives a distinct handle. Absent ⇒ byte-identical to before.
      const rawFrontier = args["frontier"];
      const frontier = Array.isArray(rawFrontier)
        ? rawFrontier.filter((x): x is string => typeof x === "string" && x !== "")
        : typeof rawFrontier === "string" && rawFrontier ? [rawFrontier] : undefined;
      daemonVm.placeTelemetry(turnText, sourceFile, frontier && frontier.length ? frontier : undefined);
      return { ok: true, captured: true, bytes: turnText.length };
    });

    // ── worldline reads — the PERMAINAN SUBSTRATE (the flow-lens foundation) ──────────────────────
    // The reads run IN the sovereign daemon worker (worldline-read-vm.ts) — the cap-stack lifts WHOLE,
    // no coordinator carve-out (operator override: a future lares-CLI read → TW5-filter-compute chain
    // must live in-VM). The host supplies only EXTERNAL data the worker can't reach: the edge-DAG
    // (derived from a session transcript) and the form-vector bytes (the python form store, a node
    // child_process). All COMPUTE — registry, ITC compare, ordering, joining, shuffling — is the
    // worker's. Mirrors the recall query-derive (deriveSkeleton), which ships its query string IN.

    // worldline-compare (Well 1, ITC LIVE-READ): two handles → the concurrent-capable causal verdict
    // (before / after / concurrent / equal). The host derives the edge-DAG from a session `transcript`
    // (spawn + handback edges, deriveSubagentEdges) and ships it; the WORKER projects the registry +
    // runs the ITC tree-leq. (Inject Communication edges enrich it via the worldline-inject-detect seam.)
    registry.register("worldline-compare", async (args) => {
      const a = typeof args["a"] === "string" ? (args["a"] as string) : "";
      const b = typeof args["b"] === "string" ? (args["b"] as string) : "";
      if (!a || !b) throw new Error("worldline-compare: args.a + args.b (handles) required");
      const transcript = typeof args["transcript"] === "string" ? (args["transcript"] as string) : "";
      const spirits = transcript ? deriveSubagentEdges(transcript) : [];
      const opens = spirits.map((s) => s.spawn);
      const closes = spirits.map((s) => s.handback);
      try {
        return await daemonVm.worldlineCompare({ a, b, opens, closes });
      } catch (err) {
        throw new Error(`worldline-compare: ${err instanceof Error ? err.message : String(err)} (supply a transcript that names both handles)`);
      }
    });

    // worldline-trajectory (Well 3 + Well 4, THE CORE): a handle → its worldline-ordered form-vector
    // path through move-space (the permainan the flow-lens reads), and optionally a null baseline
    // (shuffled order). `stubs` (verbatimSha + tickCounter, the handle's captured turns) is the clean
    // substrate API — driveable by any turn source. The host pre-fetches each turn's move-space
    // position from the form store (a node child_process the worker can't reach) and SHIPS it on the
    // wire stubs; the WORKER orders + joins + shuffles.
    //
    // SEAM A (LIVE): the PRODUCTION turn source is the CONTENT GRAPH — the drawers WHERE
    // `lar_agent_handle = handle`, each carrying its EXACT capture `lar_verbatim_sha` (full fidelity,
    // not a transcript-text re-hash). When the caller passes no `stubs`, this fetches them live from
    // the content mempalace (client.turnsForHandle → orderHandleTurnsToStubs) and feeds the worker
    // those. An explicit `stubs` arg still overrides (tests / a transcript-driven probe). NOTE: the
    // order rides filed_at → chunk_index (lar_ffz stays documented-but-unstamped; flagged).
    registry.register("worldline-trajectory", async (args) => {
      const handle = typeof args["handle"] === "string" ? (args["handle"] as string) : "";
      if (!handle) throw new Error("worldline-trajectory: args.handle required");
      const wing = typeof args["wing"] === "string" ? (args["wing"] as string) : undefined;
      const rawStubs = Array.isArray(args["stubs"]) ? (args["stubs"] as unknown[]) : null;
      // No explicit stubs → SOURCE FROM THE LIVE CONTENT GRAPH (the production path). A handle with no
      // drawers yields [] → an empty trajectory (graceful). The pooled read-client stays warm.
      const baseStubs = rawStubs === null
        ? await withMempalace(async (client) =>
            orderHandleTurnsToStubs(await client.turnsForHandle(handle, { ...(wing !== undefined ? { wing } : {}) })),
          )
        : rawStubs
            .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
            .map((s, i) => ({
              verbatimSha: typeof s["verbatimSha"] === "string" ? (s["verbatimSha"] as string) : String(s["verbatimSha"] ?? ""),
              tickCounter: typeof s["tickCounter"] === "number" ? (s["tickCounter"] as number) : i,
            }))
            .filter((s) => s.verbatimSha);
      const joinForm = args["joinForm"] !== false && args["joinForm"] !== "false";
      // Pre-fetch each unique turn's move-space position from the form store, node-side (the worker
      // can't reach the python child_process), then SHIP it on the wire stubs. A miss/fault → null
      // (the worker keeps the turn's TIME slot with a null form slot). REUSES the recall form holder.
      const formByKey = new Map<string, SparseFormVector | null>();
      if (joinForm && baseStubs.length) {
        recallFormPalace ??= makeFormPalace(larFormPalaceDir());
        const fp = recallFormPalace;
        await Promise.all(
          [...new Set(baseStubs.map((s) => s.verbatimSha))].map(async (sha) => {
            try {
              const entry = await fp.get(sha);
              formByKey.set(sha, entry?.document ? parseFormVector(entry.document) : null);
            } catch {
              formByKey.set(sha, null);
            }
          }),
        );
      }
      const stubs: WorldlineStubWire[] = baseStubs.map((s) => ({
        verbatimSha: s.verbatimSha,
        tickCounter: s.tickCounter,
        ...(joinForm ? { formVector: formByKey.get(s.verbatimSha) ?? null } : {}),
      }));
      const includeNull = args["null"] === true || args["null"] === "true";
      const seed = typeof args["seed"] === "number" ? (args["seed"] as number) : undefined;
      const windowRaw = args["window"];
      const window = typeof windowRaw === "number" ? windowRaw : typeof windowRaw === "string" && windowRaw !== "" ? Number(windowRaw) : undefined;
      const result = await daemonVm.worldlineTrajectory({
        handle, stubs, joinForm, includeNull,
        ...(seed   !== undefined ? { seed }   : {}),
        ...(window !== undefined ? { window } : {}),
      });
      if (!includeNull) return { trajectory: result.trajectory };
      return { trajectory: result.trajectory, nullBaseline: result.nullBaseline };
    });
  };

  // After the daemon VM lives: residency pins + sweeper, arm the inbound gate, refresh oracles.
  const afterDaemon: VesselOrchestration<VesselIslandPool>["afterDaemon"] = (_daemon, assembly) => {
    void residency.pin(BAG_IDS.catalog,    "boot:catalog");
    void residency.pin(BAG_IDS.oracle,     "boot:oracle-island");
    void residency.pin(BAG_IDS.lararium,   "boot:lararium-corpus");
    if (assembly.laresHandle) void residency.pin(BAG_IDS.lares, "boot:lares-corpus");
    void residency.pin(BAG_IDS.identities, "boot:identities");
    void residency.pin(BAG_IDS.groups,     "boot:circles");
    void residency.pin(BAG_IDS.sessions,   "boot:sessions");
    void residency.pin(DAEMON_BAG_ID,       "boot:daemon");
    residency.startSweeper();
    assembly.composite.attachResidency(residency);

    // Inbound WS gate — the daemon island's in-worker keyhive answers each peer.
    authGate.arm(daemonVm.authSeam, DAEMON_BAG_ID, operatorIdentity.verifyingKey);

    // Keep oracle tiddlers current — self, ka, ba, social plane, daemon.
    reconcileWellKnownTiddlers(
      assembly.islandHandle, catalogHandle.url, assembly.laresHandle?.url,
      bootstrap.identitiesUrl, bootstrap.circlesUrl, bootstrap.sessionsUrl,
      daemonVm.daemonHandle.url,
    );
  };

  // Island pool (worker_threads) + the event bus + the sovereign-worker command bindings.
  const makePool: VesselOrchestration<VesselIslandPool>["makePool"] = (_daemon, assembly) => {
    // ── Durable mailbox (lane law §7) — keel mechanism (vessel-mailbox.ts,
    // substrate-agnostic); this vessel supplies only its live-delivery path.
    const mailbox = makeDurableMailbox(
      assembly.composite,
      (wikiId, v) => vmManager.placeWikiVerb(wikiId, v),
      (line) => console.log(line),
    );
    eventBus = new LarEventBusImpl(20);
    for (const ring of DEFAULT_RINGS) eventBus.registerRing(ring);
    eventBus.start();

    const workerRootDir = rootDirOpt ?? repoRoot;
    const diskMirrorGrant: readonly { bagId: string; mirrorRoot: string; scope: string; perWikiSlug?: boolean; selfCanon?: boolean }[] = [
      { bagId: LARES_DOC_URI,    mirrorRoot: join(workerRootDir, "bags/@lares"),    scope: "@lares" },
      { bagId: LARARIUM_DOC_URI, mirrorRoot: join(workerRootDir, "bags/@lararium"), scope: "@lararium" },
      // @working = the live write layer; projects per-wiki to wikis/@{slug} (the
      // leaf slug fills at mount time — perWikiSlug). The authority (the wikis
      // base) stays static here; designation rides the recipe's mirrorBags.
      { bagId: WORKING_BAG,      mirrorRoot: join(workerRootDir, "wikis"),          scope: "@working", perWikiSlug: true },
      // self-canon = the per-wiki CANON authority: a minted user wiki's own
      // @{slug} bag projects to bags/@{slug} (both bagId and leaf fill from the
      // slug at mount). System wikis (@lares/@lararium) carry literal grants
      // above, so resolveDiskMirrors skips this for them — no double-project.
      { bagId: "@self",          mirrorRoot: join(workerRootDir, "bags"),           scope: "@self",    perWikiSlug: true, selfCanon: true },
    ];
    // The engine's plugin-tiddler CIDs — every wiki island pulls them by CID from the local
    // CAS, the same CID plane the daemon island reads.
    const poolPluginCids = pluginCidsFromIslandBlobs(assembly.islandHandle.doc()?.blobs);
    vmManager = new VesselIslandPool({
      mainRepo:    repo,
      storageRoot: storageDir,
      // A co-located node wiki island resolves its keyhive grants in the SAME synchronous-WASM
      // slot-resolution the daemon island runs (and on the same machine). A one-time keyhive
      // reconverge (e.g. an OutOfOrderOperation fixed-point after a genesis rebake) blocks the
      // worker event loop, so the interval breath cannot fire and the silence window is the only
      // gate. The pool default (HANDSHAKE_TIMEOUT_MS = 10s) is tuned for the browser's lighter
      // profile and false-timed a slow-but-live node mount into a FATAL boot death. Give the node
      // pool the daemon island's generous budget — a healthy mount still settles in <1s; only a
      // slow keyhive reconverge spends it. (silence 120s / stall 360s, matching daemon-vm-core.)
      mountSilenceMs: 120_000,
      mountStallMs:   360_000,
      ...(poolPluginCids.length ? { pluginCids: poolPluginCids } : {}),
      diskMirrorGrant,
      onWorkerEvent: (wikiId, msg) => {
        eventBus.enqueueToRing("vm-ring", "worker.event", { wikiId, listenable: msg.listenable, payload: msg.payload });
      },
      onEa: (wikiId) => { void mailbox.drain(wikiId); },   // breath → parked verbs deliver
    });

    // Sovereign-worker: bind the pool MECHANISM to the worker's POLICY commands.
    daemonVm.onEvictRequest((bagId) => vmManager.unmountWiki(bagId));
    daemonVm.onResidencyOp(async (op, bagId, reason) => {
      if (op === "pin")        await residency.pin(bagId, reason);
      else if (op === "unpin") residency.unpin(bagId);
      else                     residency.registerCold(bagId);
    });
    // Wiki-alert delivery: the worker named an affected wiki; place a system-alert verb
    // into that wiki's live island (skip silently if not mounted). wikiId = host:slug.
    daemonVm.onWikiAlert((wikiSlug, message, cause, kind) => {
      const wikiId = `${hostId}:${wikiSlug}`;
      const verbOpts = { verb: "system-alert", args: { message, cause: cause ?? "", kind: kind ?? "" }, requestedBy: "daemon" };
      void vmManager.placeWikiVerb(wikiId, verbOpts)
        // Not live → the verb PARKS durably and delivers on next mount —
        // the silent skip died 2026-06-12 (Akka /deadLetters lesson:
        // undeliverables go somewhere visible, never nowhere).
        .catch(() => mailbox.park(wikiId, verbOpts));
    });
    return vmManager;
  };

  // After live: wire the cross-island verb routing (worker.event → daemon placeVerb).
  const afterLive: VesselOrchestration<VesselIslandPool>["afterLive"] = ({ wikiHandle: _wikiHandle }) => {
    eventBus.subscribe<{ wikiId: string; listenable: string; payload: Record<string, string | number | boolean> }>(
      "worker.event",
      ({ listenable, payload }) => {
        const verb    = typeof payload["verb"]    === "string" ? payload["verb"]    : undefined;
        const fromUri = typeof payload["fromUri"] === "string" ? payload["fromUri"] : undefined;
        if (!verb) return;
        daemonVm.placeVerb({
          verb,
          args:        payload as unknown as Record<string, unknown>,
          requestedBy: typeof payload["requestedBy"] === "string" ? payload["requestedBy"] : listenable,
          listenable,
          ...(fromUri ? { fromUri } : {}),
        });
      },
    );
  };

  const orchestration: VesselOrchestration<VesselIslandPool> = {
    keel, wikiSlot,
    // openVesselCore always resolves the slot first → it calls openDaemon with slot PRESENT; the
    // wrapper bridges the required-slot field to the optional-slot impl the herm caps share.
    openDaemon: ({ assembly, slot }) => openDaemon({ assembly, slot }),
    wireVerbs, afterDaemon, makePool, afterLive,
  };

  return {
    repo, catalogHandle, operatorSeed, residency, emit, orchestration,
    openDaemon, wireVerbs, afterDaemon,
    daemonVm:         () => daemonVm,
    eventBus:         () => eventBus,
    slotActiveWikiId: () => slotActiveWikiId,
    activeWikiSource: () => activeWikiSource,
  };
}

/**
 * Open the FULL node Lararium — composeLararium's #has-cap-stack runs the shared keel sequence
 * (substrate → wiki-slot → daemon → verbs → wiki → pool → daemon-first ea-gate → primary-wiki mount
 * → live). Behaviour stays identical to the pre-cap-stack boot; the only change is the composed wrap.
 */
export async function openNodeVessel(opts: NodeVesselOptions): Promise<NodeVesselResult> {
  const p = await prepareNodeBoot(opts);
  // A Lararium is a hearth that is ALSO a first-class mesh-node: when self-announce params are supplied,
  // it composes the carriage (meshpalace + carriage) ALONGSIDE the wiki-full core — it carries + navigates
  // the FLOW-map for its own routing (carry-without-reserve; no second read-face, no @oracle conflict).
  const extraCaps = opts.meshSelf ? [
    meshPalaceCap({
      repo: p.repo, ...(p.residency ? { residency: p.residency } : {}),
      selfCoord: opts.meshSelf.coord,
      seed: [meshSelfDial(opts.meshSelf)],
    }),
    carriageCap({
      peers: opts.meshSelf.peers, selfEndpoint: opts.meshSelf.endpoint, selfBearing: opts.meshSelf.bearing,
      selfCoord: opts.meshSelf.coord,
      ...(opts.meshSelf.maxFanout !== undefined ? { maxFanout: opts.meshSelf.maxFanout } : {}),
      nodeSeedHex: Buffer.from(p.operatorSeed).toString("hex"),
      onLog: (l) => console.log(`[lararium] ${l}`),
    }),
  ] : [];
  const result = await composeLararium<VesselIslandPool>(p.orchestration, extraCaps);

  return {
    activeWikiId: p.slotActiveWikiId(),
    activeWikiSource: p.activeWikiSource(),
    pool: result.pool, repo: p.repo,
    store: result.assembly.composite,
    daemon: p.daemonVm(),
    wikiDocUrl:       result.wikiHandle.url,
    catalogHandleUrl: p.catalogHandle.url,
    oracleDocUrl:     result.assembly.islandHandle.url,
    larariumDocUrl:   result.assembly.larariumHandle?.url ?? null,
    phase: "live",
    eventBus: p.eventBus(),
    stopTick: () => { void result.pool.disposeAll(); },
  };
}

/**
 * Open a node Herm (Lares Viales) — composeHerm's wiki-LESS #has-cap-stack: substrate + the @daemon
 * immune core + a writable @meshpalace FLOW-map + the read-face that serves it. No wiki, no pool. The
 * @daemon boots WITHOUT a user wiki (its own bag = bootstrap.daemonUrl); registerBags omits the
 * absent wiki bags. Requires an HTTP server for the FLOW-map read-face.
 */
export async function openNodeHerm(opts: NodeVesselOptions): Promise<NodeHermResult> {
  if (!opts.httpServer) {
    throw new Error("[lararium] openNodeHerm requires opts.httpServer (the FLOW-map read-face serves over it)");
  }
  const p = await prepareNodeBoot(opts);
  const herm = await composeHerm({
    keel:        p.orchestration.keel,
    openDaemon:  p.openDaemon,
    wireVerbs:   p.wireVerbs,
    afterDaemon: p.afterDaemon,
    repo:        p.repo,
    residency:   p.residency,
    httpServer:  opts.httpServer,
    signerSeed:  p.operatorSeed,
    storageDir:  opts.storageDir,
    ...(opts.meshSelf ? { meshSelf: opts.meshSelf } : {}),
    ...(opts.pullIntervalMs !== undefined ? { pullIntervalMs: opts.pullIntervalMs } : {}),
    onLog:       (line) => console.log(`[herm] ${line}`),
  });
  p.emit("vessel-ready");
  p.emit("live");

  return {
    recipe:           "herm",
    repo:             p.repo,
    store:            herm.assembly.composite,
    daemon:           p.daemonVm(),
    meshPalaceHandle: herm.meshPalaceHandle,
    oracleDocUrl:     herm.assembly.islandHandle.url,
    catalogHandleUrl: p.catalogHandle.url,
    larariumDocUrl:   herm.assembly.larariumHandle?.url ?? null,
    phase:            "live",
    dispose: async () => {
      await p.daemonVm().shutdown();
      await herm.vessel.dispose();   // reverse build order → read-face disposes (clears the HTTP handler)
    },
  };
}
