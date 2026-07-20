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
import { DurableNodeFSStorageAdapter } from "./durable-storage-adapter.js";
import { NodeWSServerAdapter }          from "@automerge/automerge-repo-network-websocket";
import type { WebSocketServer }         from "isomorphic-ws";
import type {
  LarDoc,
  LarariumVesselOptions, VesselResult, LarOpenPhase,
  VesselBootstrap, VesselCoreAssembly,
  CompositeStore, MeshPalaceDoc, DiskMirrorGrant,
} from "@lararium/mesh";
import {
  makeDurableMailbox,
  type DurableMailbox,
  OpenIdentitySlot,
  emptyLarDoc, mutableLarRecord, tiddlerText,
  ORACLE_DOC_URI, LARARIUM_DOC_URI, CATALOG_DOC_URI, LARES_DOC_URI, CROSSROADS_DOC_URI, recipeHostFacets,
  IDENTITIES_DOC_URI, CIRCLES_DOC_URI, SESSIONS_DOC_URI, DAEMON_BAG_ID, PERSONA_BAG_ID,
  BAG_IDS, slugFromUri, verbArgsFromPayload, registerCrossroadsInOracle,
  PERSONA_GROUP_DOC_ID_TIDDLER, PERSONA_GROUP_AGENT_ID_TIDDLER, MESH_CABAL_DOC_ID_TIDDLER,
  SIGNER_DID_TIDDLER, DEVICE_DELEGATION_SELF_TIDDLER, type DeviceDelegationTiddler,
  ENGINE_CORE_ID, BagResidencyManager, pluginCidsFromIslandBlobs,
}                                       from "@lararium/mesh";
import type { WikiActivationCap } from "@lararium/mesh";
import { casDirForStorage, mirrorGenesisCasFs } from "./node-cas.js";
import {
  ACTIVE_WIKI_URI,
  MemoryTiddlerStore,
  selectActiveWikiSlug,
  seedVesselDefaults,
  loadCatalogCorpora,
  composeVerbPlane,
  mempalaceProviderCap, formPalaceProviderCap, daemonVerbProviderCap, telemetryProviderCap,
  recallVerbCap, telemetryVerbCap, captureVerbCap, worldlineVerbCap,
} from "@lararium/tw5";
import type {
  VesselWikiSlot, DaemonVmCore, VesselDaemonVm, VesselOrchestration,
  VerbContribution, MempalaceProvider, FormPalaceProvider, DaemonVerbProvider, TelemetryProvider, RecallClient,
} from "@lararium/tw5";
import {
  loadOrMaterializeOracle,
  reconcileWellKnownTiddlers, mintLaresIfAbsent, mintLarariumIfAbsent,
  readGenesisManifest, genesisCasDir,
} from "./genesis-artifact.js";
import { repoRoot }                       from "@lararium/mesh/node";
import { daemonGenesisDir }               from "./lares-config.js";
import { resolvePalacePath, orderHandleTurnsToStubs, type HandleTurn } from "@lararium/mempalace";
import { writebackWing, TelemetryUnavailable } from "@lararium/sensorium";
import { LarEventBusImpl, DEFAULT_RINGS } from "@lararium/mesh";
import type { SparseFormVector, WorldlineStubWire } from "@lararium/mesh";
import { makeSourceCapture, type SourceCapture } from "./capture-source.js";
import { VesselIslandPool, NODE_WIKI_ACTIVATION_CAP } from "./vessel-island-pool.js";

/** Node advertises a few rotatable wiki pins BESIDES @daemon (resource-rich vessel).
 *  The user's ONE-plus rotatable pin(s) ride this budget; the surface enforces it. */
const NODE_WIKI_PIN_BUDGET = 3;
import { larStructurePalaceDir, larFormPalaceDir, memorySensoriumDir, larContentDir }  from "./vessel-paths.js";
import { makeFormPalace, type FormPalace, makeStructurePalace, type StructurePalace }  from "./sensorium.js";
import { makeRecallHolder, type RecallHolder } from "./recall-holder.js";
import { makeContentPalace, type ContentPalace } from "./sensorium.js";
import { multiGraphRecall, makeFormSearch, makeStructureSearch }  from "./sensorium-recall.js";
import { waitHandleLocal, resolveBootDoc } from "./repo-helpers.js";
import { makeChildProcessDocLoadProbe, quarantineDoc, recoverCleanTail } from "./doc-load-probe.js";
import { loadIdentityArchive } from "./identity-anchors.js";
import { assertSealReady } from "./archive-passphrase.js";
import { openDaemonVm }                    from "./open-daemon-vm.js";
import {
  makeResidencyStatsReactor,
  makeVesselResidency, type VesselResidency,
} from "@lararium/tw5";   // residency stats — the lone read that stays main-resident; the shared residency/pool-wiring factory
import { generateOrLoadVesselIdentity, loadVesselSigningSeed } from "./node-vessel-identity.js";
import { DaemonAuthGate }                           from "./daemon-auth-gate.js";
import { composeLararium, composeHerm, meshPalaceCap, carriageCap, meshSelfSeed, type MeshSelf } from "./node-caps.js";

/** The genesis dir when a caller sites none — resolves through the composable genesis cap
 *  (`LAR_GENESIS` → `~/.lares/config.json` → repo-relative `<corpus>/genesis`). Genesis stays
 *  checked-in-by-default, so a no-config boot lands on the repo's tracked seed exactly as before. */
function defaultGenesisDir(): string {
  return daemonGenesisDir();
}

/** FNV-1a 32-bit over a string → a STABLE non-negative index label. Deterministic per axis-id, so
 *  the SAME axis id maps to the SAME index in EVERY turn's vector — the cross-turn alignment a sparse
 *  form-vector needs. (A dense global basis index would be exact, but the stored `document` does not
 *  carry it — see parseFormVector; this keeps the axis IDENTITY instead of discarding it.) */
function axisIdToIndex(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;   // unsigned 32-bit
}

/**
 * Pull a sparse form-vector out of a form-store entry's stored `document` (the move-space position
 * the worldline-trajectory read joins). The python store keeps the dense embedding internally; the
 * JSON `document` carries the axis activation. The host fetches this node-side (the form store is a
 * node child_process the worker can't reach) and SHIPS it to the in-VM trajectory read. An absent /
 * unparseable document yields null (the worker keeps the turn's TIME slot, form null). Moved here from
 * the retired node-side worldline-holder when the reads lifted into the sovereign worker.
 *
 * The stored `document` carries `axis_activation` as an axis-ID-KEYED map (`{ "voice:council": 0.9, … }`).
 * Each key IS the axis identity — it MUST determine the sparse index, else two turns whose active-axis
 * SETS differ get misaligned indices (a positional counter maps `voice:council`→0 in one turn and →1 in
 * another, silently corrupting every cross-turn comparison). We derive a stable index per axis-id so the
 * axis KEY survives. When the encoder's canonical `form_vector` rides the document (the exact indices),
 * we prefer it verbatim.
 */
export function parseFormVector(document: string): SparseFormVector | null {
  try {
    const obj = JSON.parse(document) as Record<string, unknown>;
    // Preferred: the encoder's canonical sparse vector, if the store persisted it — exact basis indices.
    const fv = obj["form_vector"];
    if (fv && typeof fv === "object") {
      const rec = fv as Record<string, unknown>;
      const idx = rec["indices"];
      const val = rec["values"];
      if (Array.isArray(idx) && Array.isArray(val) && idx.length === val.length
          && idx.every((n) => typeof n === "number") && val.every((n) => typeof n === "number")) {
        return { indices: idx as number[], values: val as number[] };
      }
    }
    const act = obj["axis_activation"];
    if (act && typeof act === "object") {
      const entries = Object.entries(act as Record<string, unknown>).filter(([, v]) => typeof v === "number");
      if (entries.length === 0) return { indices: [], values: [] };
      // Index by the axis KEY (not by position) so the identity survives + aligns across turns; sort
      // by the derived index so the pairing stays deterministic.
      const pairs = entries
        .map(([k, v]) => [axisIdToIndex(k), v as number] as const)
        .sort((a, b) => a[0] - b[0]);
      return {
        indices: pairs.map(([i]) => i),
        values: pairs.map(([, v]) => v),
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
export const SOCIAL_BOOTSTRAP_PLUGIN_TITLE = "lar:///ha.ka.ba/lararium/bootstrap/social";

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
  /** The full-node orchestration (keel + every VM closure) the shared cap composer walks. */
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
  const bootstrapPath = join(genesisDir ?? defaultGenesisDir(), "social-bootstrap.json");
  const emit = (p: NodeOpenPhase) => onPhase?.(p);

  emit("boot");

  // ── 1. Repo — NodeFS storage + WebSocket relay behind the DaemonAuthGate ─────
  const storage = new DurableNodeFSStorageAdapter(storageDir);
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
    //
    // V5 SYMMETRY: this WS ring gates at the PEER (gate-passed vs not); the browser
    // leaf gates at the DOC (a deny-by-default FederationGate, since a leaf cannot
    // run a gate). Both are the same seam at two resolutions — the V5 KeyhiveIdentitySlot
    // composes verifyCapability(docUrl, ability) as the INNER ring here (per-doc caps
    // behind the per-peer admission), matching the browser's FederationGate call site.
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
  let wikiActivation!: WikiActivationCap;  // set in makePool — the activation-on-reference cap
  let mailbox!: DurableMailbox;            // set in makePool — the durable park/drain lane (node-only capability)
  let daemonVm!:   DaemonVmCore;           // set in openDaemon
  let eventBus!:  LarEventBusImpl;         // set in makePool
  let bootstrap!: VesselBootstrap;         // captured in loadGenesis
  let slotActiveWikiId = "";               // captured in wikiSlot
  let activeWikiSource: "boot-arg" | "daemon-marker" = "boot-arg";
  // The recall FORM leg holder — opened ONCE, lazily, shared by BOTH the dual recall fuse and the
  // worldline form pre-fetch (makeFormPalace ref-counts per canonical dir → one reference, never a
  // second process). Owned by the form provider impl below; closed implicitly at process exit / idle-reap.
  let recallFormPalace: FormPalace | null = null;
  // The STRUCTURE recall leg (the 3rd fusion graph) — ref-counts per canonical dir → one reference.
  let recallStructurePalace: StructurePalace | null = null;
  // SOVEREIGN recall — the house-code content leg (`search_io.py` embeds+searches · `content_io.py`
  // get/scan) over the MEMORY content plane. `lares sense recall` reads through THIS, never the guest
  // mempalace client (that stays the `lares mempalace` sidecar lane) — the sovereign/guest separation.
  // Lazy: the read holders spawn on first recall, reused after (distinct lock-prefixes from the capture
  // holder, so a concurrent re-pour never blocks a read).
  // One recall holder PER sensorium root — ADDRESSED recall up the cap ladder (each sensorium's own
  // coordinator; `memory` is the default). The same machinery serves ai-sessions, text, and encoded streams.
  const recallHolders = new Map<string, RecallHolder>();
  const recallFor = (root?: string): RecallHolder => {
    const r = root && root.length > 0 ? root : memorySensoriumDir();
    let h = recallHolders.get(r);
    if (!h) { h = makeRecallHolder(r); recallHolders.set(r, h); }
    return h;
  };
  let recallContent: ContentPalace | null = null;
  const sovereignRecallClient: RecallClient = {
    // Combined-arms search rides the ONE Python coordinator (recall_session.py → LaresCoordinator): it
    // composes the sensorium's #has recall-surfaces (content-vector ⊕ mempalace lexical+entity), RRF-fuses,
    // and resolves verbatim — machine-code stays Python; this is a thin coordinator call. STREAM-AGNOSTIC +
    // ADDRESSED: `sensoriumRoot` picks any sensorium's holder up the ladder (ai-sessions → text → encoded).
    search: async (a) => {
      const root = typeof a["sensoriumRoot"] === "string" ? a["sensoriumRoot"] : undefined;
      // Forward the CLI args VERBATIM to the one Python coordinator. The daemon holds NO filter knowledge:
      // recall_session introspects LaresCoordinator.recall — the SINGLE source of truth for the filter set —
      // and forwards whatever it accepts, dropping the rest. So a new recall filter needs zero change here
      // (2 surfaces, 1 API — the collapse: the API signature is the capability, the surfaces just forward).
      const { sensoriumRoot: _sensoriumRoot, ...req } = a;
      return await recallFor(root).recall(req);
    },
    getImago: async (imagoId) => {
      recallContent ??= makeContentPalace(larContentDir());
      const e = await recallContent.get(imagoId);
      return e ? { imago_id: e.cid, content: e.document, ...e.metadata } : {};
    },
    listDrawers: async (a) => {
      recallContent ??= makeContentPalace(larContentDir());
      const limit = typeof a["limit"] === "number" ? a["limit"] : 50;
      const wing = typeof a["wing"] === "string" ? a["wing"] : undefined;
      const page = await recallContent.scan({ limit });
      let recs = page.records as ReadonlyArray<{ cid: string; document?: string; metadata?: Record<string, unknown> }>;
      if (wing) recs = recs.filter((r) => r.metadata?.["wing"] === wing);
      return {
        imagines: recs.map((r) => ({ imago_id: r.cid, content: r.document ?? "", wing: r.metadata?.["wing"], room: r.metadata?.["room"] })),
        total: page.total,
      };
    },
  };
  // One Python source-stream owner for the sovereign memory sensorium. It receives pointers only;
  // parsing, CID identity, embedding and land all stay on the Python side of the boundary.
  // One serialized capture holder PER sensorium root (each owns its own content-palace singleton flock).
  // `memory` is the default; a `lares sense <sensorium> …` address threads its own root here.
  const sourceCaptures = new Map<string, SourceCapture>();
  const captureFor = (root?: string): SourceCapture => {
    const r = root && root.length > 0 ? root : memorySensoriumDir();
    let sc = sourceCaptures.get(r);
    if (!sc) { sc = makeSourceCapture(r); sourceCaptures.set(r, sc); }
    return sc;
  };
  // The composed verb plane (the four provider-heavy groups, NESTED-composed). composeVerbPlane is async
  // but wireVerbs runs SYNCHRONOUSLY (daemonCap.build calls it un-awaited); the plane composes at the END
  // of openDaemon (where daemonVm is ready, awaited BEFORE wireVerbs inside daemonCap) and wireVerbs
  // applies this cached contribution synchronously.
  let pendingVerbContribution: VerbContribution | null = null;

  // The ONE residency collector + pool-wiring, composed through the SHARED factory (both vessels
  // call it). Node advertises the FULL grant (concurrent multi-wiki + rotatable pins besides
  // @daemon) and supplies its vessel-specific hooks: it NARRATES a cool (browser stays silent),
  // stamps the alert `kind`, and PARKS an undeliverable alert in the durable mailbox (a dropped
  // verb stays observable, never nowhere — the Akka /deadLetters lesson; browser has no mailbox,
  // so it warns + drops best-effort). getPool reads vmManager lazily (the forward-ref pattern);
  // the alert hook reads the forward-declared mailbox at delivery time (long after boot).
  const residencyWiring: VesselResidency = makeVesselResidency(
    () => vmManager,
    { wikiActivationCap: NODE_WIKI_ACTIVATION_CAP, wikiPinBudget: NODE_WIKI_PIN_BUDGET },
    {
      onWikiCooled: (id) => console.log(`[residency] cooled wiki ${id} (island unmounted)`),
      onBagCooled:  (id) => console.log(`[residency] cooled bag ${id} (compact-then-drop reserved for repo#358)`),
      alertArgs:    (kind) => ({ kind: kind ?? "" }),
      onUndeliverableAlert: (wikiId, verbOpts) => { void mailbox.park(wikiId, verbOpts); },
    },
  );
  const residency = residencyWiring.residency;

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
      // @oracle/@lararium/@lares stand as three separate docs. The corpus doc
      // starts empty; LOAD/ingest fills it.
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

    // L1/L2 — the child_process load-probe + quarantine, closing over this vessel's
    // storageDir. Each social-plane doc materializes in a disposable process before the
    // live repo touches it; a condemned doc gets MOVED aside (never deleted) and its plane
    // mounts read-only, so a torn doc downgrades the vessel to degraded instead of aborting
    // the whole boot.
    docLoadProbe: makeChildProcessDocLoadProbe(storageDir),
    // L3 — clean-tail recovery, tried AHEAD of quarantine: salvage the doc's verified clean
    // record-prefix and drop only the torn tail, so a torn-tail doc promotes to a writable
    // mount (a suffix of edits lost) instead of downgrading the vessel to degraded.
    recoverCleanTail: async (verdict) => {
      const promoted = await recoverCleanTail(storageDir, verdict);
      if (promoted) {
        console.warn(
          `[lararium] PROMOTED plane — clean-tail recovered ${verdict.documentId} (${verdict.reason ?? "?"})` +
          ` → ${promoted.reason ?? "recovered"}; the torn tail sits in quarantine-torn-tail-*`,
        );
      }
      return promoted;
    },
    quarantineDoc: (verdict) => {
      const moved = quarantineDoc(storageDir, verdict);
      console.warn(
        `[lararium] DEGRADED plane — quarantined ${verdict.documentId} (${verdict.status}: ${verdict.reason ?? "?"})` +
        ` → ${moved ?? "already gone"}; the plane mounts read-only until \`lares regenesis\` rematerializes it`,
      );
    },

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
    const facets = recipeHostFacets(slugFromUri(sel.slug), identity.did);
    return {
      activeWikiId:     sel.slug,
      wikiSlug:         facets.wikiSlug,
      wikiKey:          facets.wikiKey,
      wikiBagId:        facets.wikiBagId,
      draftOracleTitle: facets.draftOracleTitle,
      draftBagId:       facets.draftBagId,
    };
  };

  // Daemon VM — sovereign daemon island + the operator's authn/z home. `slot` ABSENT (herm) →
  // registerBags omits the user-wiki bags (the decouple); the @daemon's OWN bag still mounts.
  /**
   * The bag URIs the @catalog registry NAMES — its tiddlers key by bag URI, their text carrying the
   * bag's automerge url. `act CREATE` writes a durable entry here; nothing else registers the bag
   * with keyhive, whose bag→doc map lives in process memory. Reading the catalog at boot means a
   * cap check resolves for every bag the operator's vessel actually holds, across restarts.
   *
   * An entry whose text carries no automerge url names a bag that never minted — skip it rather
   * than register a doc that cannot resolve.
   */
  const catalogNamedBags = (catalogHandle: VesselCoreAssembly["catalogHandle"]): string[] => {
    const tiddlers = catalogHandle.doc()?.tiddlers ?? {};
    return Object.keys(tiddlers).filter((title) => {
      if (!title.startsWith("lar:///")) return false;
      return (tiddlerText(tiddlers[title]) ?? "").startsWith("automerge:");
    });
  };

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
    // Register the per-Nexus @crossroads into @oracle (isomorphic with the browser). The node IS the
    // confederation anchor, so its own gate key IS its Nexus key — the same key browsers pass as
    // relayGatePubKey — so node + its browser leaves resolve the identical @crossroads. The @daemon core
    // splices @crossroads into the recipe + registerBags for either vessel.
    await registerCrossroadsInOracle(repo, assembly.islandHandle, operatorIdentity.verifyingKey);
    // M3 — node-main reads the persisted keyhive Archive from the identity home and passes it into the
    // worker (same custody boundary the 32-byte seed already crosses). keyhive inits from it as the
    // restore FLOOR, then replays @daemon cap-events on top — a torn @daemon restores instead of orphaning.
    // BOOT-GATE (#60): when the config marks sealing expected but no LARES_ARCHIVE_PASSPHRASE rides the
    // environment, fail PRECISELY here — naming the fix — rather than deeper in the reader on the generic
    // sealed-without-key throw. The marker is a config HINT, never a secret.
    assertSealReady();
    const archiveBytes = loadIdentityArchive();
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
        // Every bag the @catalog NAMES. The catalog holds refs to the operator's own bags (any
        // vessel); the core list above names only the Cabal-controlled and infrastructural ones.
        // keyhive's bag→doc map lives in process memory, so a bag absent here can never satisfy a
        // cap check — `act LOAD` into an operator bag would refuse forever, and a freshly-founded
        // vessel could never re-seed. Read the projection rather than hard-code it.
        ...catalogNamedBags(assembly.catalogHandle),
      ],
      signerDid,
      deviceEdge,
      ...(archiveBytes ? { archiveBytes } : {}),
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
    });

    // ── NESTED verb-plane compose (composable-keel idiom) ─────────────────────────────────────────
    // The four provider-heavy verb groups (recall · lar-telemetry · capture · worldline) lift into a
    // #has-cap-stack of provider caps + verb-group caps (@lararium/tw5 verb-caps). The platform builds the
    // provider impls HERE from its node helpers + the now-live daemonVm, and composeVerbPlane wires the
    // stack (a verb cap whose mandatory provider is absent REFUSES — blind by structure). The merged
    // contribution stashes in `pendingVerbContribution`; wireVerbs applies it synchronously below.
    // Ordering: openDaemon runs (awaited) inside daemonCap.build BEFORE the un-awaited wireVerbs, and
    // daemonVm is set just above — so every injected impl is ready at this compose point.
    const mempalaceImpl: MempalaceProvider = {
      // SOVEREIGN recall + worldline: both read through house code, never the guest mempalace client —
      // the sovereign⊥guest separation is now complete on the `lares sense` surface.
      withClient: (fn) => fn(sovereignRecallClient),
      turnsForHandleStubs: async (handle, opts) => {
        // Page the content plane, keep drawers stamped with this agent-lineage handle, order by the shared
        // functor — house-code content_io alone, the guest client nowhere. The join keys (lar_agent_handle ·
        // lar_verbatim_sha) ride sovereign-captured exchange drawers; an empty plane → an empty trajectory.
        recallContent ??= makeContentPalace(larContentDir());
        const turns: HandleTurn[] = [];
        for (let offset = 0; ; ) {
          const page = await recallContent.scan({ offset, limit: 512 });
          for (const r of page.records) {
            const m = (r.metadata ?? {}) as Record<string, unknown>;
            if (m["lar_agent_handle"] !== handle) continue;
            if (opts?.wing !== undefined && m["wing"] !== opts.wing) continue;
            const sha = m["lar_verbatim_sha"];
            if (typeof sha !== "string" || !sha) continue;
            turns.push({
              drawerId: r.cid,
              verbatimSha: sha,
              ...(typeof m["lar_ffz"] === "string" ? { ffz: m["lar_ffz"] } : {}),
              ...(typeof m["chunk_index"] === "number" ? { chunkIndex: m["chunk_index"] } : {}),
              ...(typeof m["filed_at"] === "string" ? { filedAt: m["filed_at"] } : {}),
              ...(typeof m["source_file"] === "string" ? { sourceFile: m["source_file"] } : {}),
            });
          }
          if (page.next === null) break;
          offset = page.next;
        }
        return orderHandleTurnsToStubs(turns);
      },
    };
    const formImpl: FormPalaceProvider = {
      // The worldline form pre-fetch: a miss/fault → null (the worker keeps the turn's TIME slot, form
      // null). REUSES the recall form holder (one process).
      getForm: async (sha) => {
        recallFormPalace ??= makeFormPalace(larFormPalaceDir());
        try {
          const entry = await recallFormPalace.get(sha);
          return entry?.document ? parseFormVector(entry.document) : null;
        } catch {
          return null;
        }
      },
      // The dual recall fuse — the form-leg construction (markers→vector derive IN the @daemon VM, the
      // content-only degradation on fault) + the RRF fuse, verbatim. The markers derive round-trips the
      // warm worker (deriveSkeleton); VM cold/unavailable → resolves null → the markers leg fuses
      // content-only (graceful, no shadow derive). A form-holder rejection collapses to [] → fuse
      // content-only. REUSES the recall form holder.
      multiRecall: (legs, args) => {
        recallFormPalace ??= makeFormPalace(larFormPalaceDir());
        recallStructurePalace ??= makeStructurePalace(larStructurePalaceDir());
        const deriveSkeleton = (q: string) => daemonVm.deriveSkeleton(q);
        const formSearchLeg = makeFormSearch({ query: args["query"] as string, formPalace: recallFormPalace, deriveSkeleton });
        // The STRUCTURE leg rides the reserved `extraGraphs` slot — the 3rd graph, fused on the shared
        // verbatim_sha like content+form (a holder fault degrades to []). The N-ary core needs no change.
        const structureLeg = makeStructureSearch(recallStructurePalace);
        return multiGraphRecall(
          {
            contentSearch: (a: Record<string, unknown>) => legs.contentSearch(a),
            formSearch: async (input: { nResults: number; where?: Record<string, unknown> }) => { try { return await formSearchLeg(input); } catch { return []; } },
            extraGraphs: [{ name: "structure", search: structureLeg }],
          } as unknown as Parameters<typeof multiGraphRecall>[0],
          args as unknown as Parameters<typeof multiGraphRecall>[1],
        ) as unknown as Promise<Record<string, unknown>>;
      },
    };
    const daemonImpl: DaemonVerbProvider = {
      captureSource: async (input) => {
        const { sensoriumRoot, ...req } = input;
        return await captureFor(sensoriumRoot).capture(req);
      },
      sweep: async (input) => {
        // BULK backfill through the holder that owns the store — it discovers EVERY transcript and captures
        // each on its ONE warm stream (never a second holder). The routed sweep spine.
        const { sensoriumRoot, ...req } = input;
        return await captureFor(sensoriumRoot).sweep(req);
      },
      analyze: async (input) => {
        // DETECT-ONLY change-point arms over the poured stream, through the holder that owns the store
        // (reuses its ONE content handle; blind to any ground-truth — the wall stays uncrossed).
        const { sensoriumRoot, ...req } = input;
        return await captureFor(sensoriumRoot).analyze(req);
      },
      refreshDerived: async (input) => {
        // RE-DERIVE the whole derived layer through the holder that owns the store — one command, serialized
        // on the capture pipe (queues between passes, never races the writer). `which` narrows to one.
        const { sensoriumRoot, ...req } = input;
        return await captureFor(sensoriumRoot).refresh(req);
      },
      readRejim: async (input) => {
        // Read the landed rejim (rhythm/geology) plane through the holder that owns the store.
        const { sensoriumRoot } = input;
        return await captureFor(sensoriumRoot).readRejim({});
      },
      status: async (input) => {
        // The taxonomy over the holder's content store — reads the ONE handle the holder owns (no second client).
        const { sensoriumRoot } = input;
        return await captureFor(sensoriumRoot).status({});
      },
      worldline: async (input) => {
        // The fork-DAG rhizome read through the holder that owns the store (fresh worldline handle per-op).
        const { sensoriumRoot, ...req } = input;
        return await captureFor(sensoriumRoot).worldlineDag(req);
      },
      kapae: async (input) => {
        // Mute a worldline branch + cascade across the content store, through the holder — serialized with
        // capture so the mutation never races the live writer (the one-owner discipline).
        const { sensoriumRoot, ...req } = input;
        return await captureFor(sensoriumRoot).cascadeKapae(req);
      },
      unKapae: async (input) => {
        // Restore a muted worldline branch across the content store — the reverse of kapae, through the holder.
        const { sensoriumRoot, ...req } = input;
        return await captureFor(sensoriumRoot).cascadeUnKapae(req);
      },
      planeRecord: async (input) => {
        // The cross-plane witness through the holder that owns the store (read-only, shared plane-query impl).
        const { sensoriumRoot, ...req } = input;
        return await captureFor(sensoriumRoot).planeRecord(req);
      },
      placeStructurepalaceKapae: (turnKey, ended) => daemonVm.placeStructurepalaceKapae(turnKey, ended),
      subagentEdges: async (input) => {
        // The subagent edge CRUNCH moved to python (beside the transcript data) — route to the holder's
        // `subagent-edges` serve-op through the SAME sensorium-addressed capture pipe the other verbs use.
        const { sensoriumRoot, ...req } = input;
        return await captureFor(sensoriumRoot).subagentEdges(req);
      },
      worldlineCompare: (input) => daemonVm.worldlineCompare(input),
      worldlineTrajectory: (input) => daemonVm.worldlineTrajectory(input),
    };
    const telemetryImpl: TelemetryProvider = {
      writeback: (wing, opts) => {
        try {
          const r = writebackWing(wing, opts);
          return { wing, ...r };
        } catch (err) {
          if (err instanceof TelemetryUnavailable) throw new Error(`lar-telemetry unavailable: ${err.message}`);
          throw err;
        }
      },
    };
    pendingVerbContribution = await composeVerbPlane([
      mempalaceProviderCap(mempalaceImpl),
      formPalaceProviderCap(formImpl),
      daemonVerbProviderCap(daemonImpl),
      telemetryProviderCap(telemetryImpl),
      recallVerbCap(),
      telemetryVerbCap(),
      captureVerbCap(),
      worldlineVerbCap(),
    ]);

    return { workerEa: daemonVm.workerEa, mountMainVerbs: daemonVm.mountMainVerbs, resolveBinding: daemonVm };
  };

  // Thin main verb plane. Every daemon verb that touches the catalog / recipe /
  // residency now lives in the worker (wireWorkerVerbs) — the daemon holds ACCESS to
  // all bags there and writes-then-syncs, never reaching into a mounted wiki. Main
  // keeps only what is genuinely main-resident: sync-wiki (commands the pool's active
  // wiki island) and residency stats (a read of the main-resident manager).
  const wireVerbs: VesselOrchestration<VesselIslandPool>["wireVerbs"] = (registry, _assembly) => {
    seedVesselDefaults(registry);
    registry.register("sync-wiki", async (args, ctx) => {
      // Resolver-as-activator: a reference wakes a cold grain before the verb lands
      // (the pinned home wiki is already live → a cheap no-op).
      await wikiActivation.ensureActive(slotActiveWikiId);
      return vmManager.placeWikiVerb(slotActiveWikiId, {
        verb: "sync-wiki", args: args as Record<string, unknown>, requestedBy: ctx.invocation.requestedBy,
      });
    });
    // wiki-act: command a residency ACTION verb to run IN the active wiki
    // island over ITS composite (promotion executes
    // where @working + canon both live — the island owns its composition; the
    // daemon commands, never reaches the per-fingerprint @working binding). The
    // inner verb (MOVE/LOAD/…) routes to the island's own action reactors.
    registry.register("wiki-act", async (args, ctx) => {
      await wikiActivation.ensureActive(slotActiveWikiId);
      return vmManager.placeWikiVerb(slotActiveWikiId, {
        verb: String(args["verb"]),
        args: (args["args"] as Record<string, unknown>) ?? {},
        requestedBy: ctx.invocation.requestedBy,
      });
    });
    registry.register("residency", makeResidencyStatsReactor({ residency }));

    // ── The wiki-SWITCHER surface (the FACE over the activation cap) ──────────────
    // The LIVE chokepoint (distinct from boot-time `open-wiki`): a reference ACTIVATES
    // the grain (resolveWikiSpec wakes ANY registered wiki cold, single-flight). node is
    // headless — no #projection surface to flip — so a switch here is pure activation.
    registry.register("wiki-switch", async (args) => {
      // The slug rides as a structured `slug` arg — from the CLI / MCP, OR from a
      // DOM-driven verse-event whose `arg-slug` field the reaction-router lifted into
      // the args payload (#48 unified the DOM path onto the CLI's structured-args contract).
      const slug = String(args["slug"] ?? "");
      if (!slug) throw new Error("wiki-switch: `slug` required");
      const active = await wikiActivation.ensureActive(slug);
      return { verb: "wiki-switch", slug, active, held: [...wikiActivation.held()] };
    });
    // wiki-hold / wiki-release — the ROTATABLE active-wiki pin (the switcher's pin
    // control), budget-enforced by the cap (@daemon always + pinBudget rotatable).
    // Distinct from the recipe-bag `pin-wiki`: this pins the wiki GRAIN in the collector.
    registry.register("wiki-hold", async (args) => {
      const slug = String(args["slug"] ?? "");
      if (!slug) throw new Error("wiki-hold: `slug` required");
      const held = await wikiActivation.hold(slug);
      return { verb: "wiki-hold", slug, held, holds: [...wikiActivation.held()], budget: wikiActivation.grant.pinBudget };
    });
    registry.register("wiki-release", async (args) => {
      const slug = String(args["slug"] ?? "");
      if (!slug) throw new Error("wiki-release: `slug` required");
      wikiActivation.release(slug);
      return { verb: "wiki-release", slug, holds: [...wikiActivation.held()] };
    });
    // wiki-active — the live switcher state: which wikis run now + which are held.
    registry.register("wiki-active", async () => {
      const active = vmManager.inspect().filter((s) => s.temperature === "wela").map((s) => s.wikiId);
      return {
        verb: "wiki-active", active, held: [...wikiActivation.held()],
        activationCap: wikiActivation.grant.activationCap, pinBudget: wikiActivation.grant.pinBudget,
      };
    });

    // The four provider-heavy verb groups (recall · lar-telemetry · capture · worldline-compare/-trajectory)
    // lifted into the NESTED #has-cap-stack (verb-caps.ts) — composed at the END of openDaemon (where the
    // daemonVm + the node helpers are live) and stashed in `pendingVerbContribution`. Apply it here,
    // synchronously: a verb a missing provider would have refused never reaches this point. openDaemon runs
    // (awaited) inside daemonCap.build BEFORE this un-awaited wireVerbs, so the contribution is always ready.
    if (!pendingVerbContribution) {
      throw new Error("[openNodeVessel] verb plane not composed — wireVerbs ran before openDaemon stashed the contribution");
    }
    pendingVerbContribution(registry);
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
    // substrate-agnostic); this vessel supplies only its live-delivery path. Assigned to the
    // forward-declared ref so the shared residency wiring's undeliverable-alert hook parks here.
    mailbox = makeDurableMailbox(
      assembly.composite,
      // Delivery activates on reference: a drain to a cold grain re-mounts it first
      // (on `ea` the grain is already live → a cheap no-op; this covers a drain raced
      // ahead of the breath). A grain that cannot activate rejects → stays parked.
      async (wikiId, v) => {
        if (!(await wikiActivation.ensureActive(wikiId))) throw new Error(`[mailbox] ${wikiId} not activatable — kept parked`);
        return vmManager.placeWikiVerb(wikiId, v);
      },
      (line) => console.log(line),
    );
    eventBus = new LarEventBusImpl(20);
    for (const ring of DEFAULT_RINGS) eventBus.registerRing(ring);
    eventBus.start();

    const workerRootDir = rootDirOpt ?? repoRoot;
    const diskMirrorGrant: DiskMirrorGrant = [
      { bagId: LARES_DOC_URI,    mirrorRoot: join(workerRootDir, "bags/@lares"),    scope: "@lares" },
      { bagId: LARARIUM_DOC_URI, mirrorRoot: join(workerRootDir, "bags/@lararium"), scope: "@lararium" },
      // @crossroads = the PUBLIC plane's seed/canon bag — it holds the moved public-domain
      // library (raw .txt books + .mem memes with large source ahus). It projects to
      // bags/@crossroads like the other seed bags. Safe to project ONLY with the skinny-handle
      // rule in place (T3): a book too big for the CRDT lands as a skinny handle, and the
      // projector writes only its handle — the body stays in the cid/ CAS, never re-overflowing.
      { bagId: CROSSROADS_DOC_URI, mirrorRoot: join(workerRootDir, "bags/@crossroads"), scope: "@crossroads" },
      // working = the live write layer; projects per-wiki to wikis/@{slug} (BOTH
      // the bag `wikis/@{slug}/working` and the leaf fill from the slug at mount —
      // wikiSlot). The authority (the wikis base) stays static here; designation
      // rides the recipe's mirrorBags.
      { bagId: "@working",       mirrorRoot: join(workerRootDir, "wikis"),          scope: "@working", wikiSlot: "working" },
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

    // Wire the pool through the SHARED residency factory: resolveWikiSpec (the UNKNOWN-grain
    // branch of the true multi-wiki swap) + the activation-on-reference cap (node's full grant)
    // + the sovereign-worker residency binding (daemon evict routes THROUGH the ONE collector) +
    // wiki-alert delivery (the resolver-as-activator single-flight orchestration; node's hook
    // parks an undeliverable alert durably). The pool + the mailbox drain key a slot by its BARE
    // SLUG (`slotActiveWikiId = sel.slug`; `onEa(wikiId) → mailbox.drain`), and the shared wiring
    // keys the alert on that same bare slug — never `${hostId}:${wikiSlug}`, which would fork the
    // keyspace and silently lose every alert.
    wikiActivation = residencyWiring.wireToPool({
      daemon:        daemonVm,
      pool:          vmManager,
      coreHash:      assembly.coreHash,
      islandUrl:     assembly.islandHandle.url,
      catalogHandle: assembly.catalogHandle,
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
          args:        verbArgsFromPayload(payload),   // structured args off the `verb-args` JSON (#48)
          requestedBy: typeof payload["requestedBy"] === "string" ? payload["requestedBy"] : listenable,
          listenable,
          ...(fromUri ? { fromUri } : {}),
        });
      },
    );

    // Boot DEMOTED to a pin. The @daemon island stays always-live on its own (never
    // pooled, never collected — the "@daemon always there"). The home wiki (the ONE
    // rotatable user pin BESIDES @daemon; a resource-rich node MAY hold up to
    // pinBudget more) registers in the ONE collector as a PINNED `wiki` grain —
    // exempt from collection. Everything else activates on reference through the cap.
    // mountPrimaryWiki already mounted + spec-retained it, so onHydrate → ensureWiki
    // sees it live and no-ops (idempotent). Rotation = unpin the old, pin the new.
    if (slotActiveWikiId) void residency.pin(slotActiveWikiId, "boot:home-wiki", "wiki");
  };

  const orchestration: VesselOrchestration<VesselIslandPool> = {
    keel, wikiSlot,
    // The shared cap composer resolves the slot first → it calls openDaemon with slot PRESENT; the
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
      seed: meshSelfSeed(opts.meshSelf),
    }),
    carriageCap({
      peers: opts.meshSelf.peers, selfBearing: opts.meshSelf.bearing,
      ...(opts.meshSelf.endpoint ? { selfEndpoint: opts.meshSelf.endpoint } : {}), // absent → a leaf
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
