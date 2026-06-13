/**
 * openNodeVessel — local-first Node.js vessel factory.
 *
 * A thin RECIPE over `openVesselCore` (the one keel, both substrates). Node supplies
 * the platform atoms (NodeFS storage, WS relay + AdminAuthGate, worker_threads pool)
 * and the capability pieces it holds (the inbound gate, the corpus loader, the residual
 * pool/repo verbs, the main-resident BagResidencyManager mechanism). The keel sequences
 * the substrate (composite cascade, genesis, social plane, admin doc, wiki-slot) VM-free
 * in mesh; this file holds ONLY node's I/O + held capabilities. No fork of the boot logic.
 *
 * The node vessel holds no semantic privilege. It carries roads, docks, and sync; live
 * VM state lives in sovereign islands (admin + wiki). FPI-5 (trim tab): all Node-specific
 * code lives here.
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
  LarariumVesselOptions, VesselResult, LarOpenPhase,
  VesselBootstrap, VesselCoreAssembly,
} from "@lararium/mesh";
import {
  makeDurableMailbox,
  OpenIdentitySlot,
  corpusBagId,
  emptyLarDoc, mutableLarRecord, tiddlerText,
  LARARIUM_DOC_URI, CATALOG_DOC_URI, LARES_DOC_URI,
  IDENTITIES_DOC_URI, CIRCLES_DOC_URI, SESSIONS_DOC_URI, ADMIN_BAG_ID,
  corpusLarUri, catalogCorpusEntryUri, CATALOG_CORPUS_PREFIX,
  BAG_IDS, slugFromUri,
  PERSON_GROUP_DOC_ID_TIDDLER, PERSON_GROUP_AGENT_ID_TIDDLER, MESH_CABAL_DOC_ID_TIDDLER,
  ENGINE_CORE_ID, BagResidencyManager,
}                                       from "@lararium/mesh";
import {
  ACTIVE_WIKI_URI,
  MemoryTiddlerStore,
  planActiveWikiSlot,
  selectActiveWikiSlug,
  seedVesselDefaults,
  addReadOnlyLayer,
  openVesselCore,
} from "@lararium/tw5";
import type { VesselWikiSlot } from "@lararium/tw5";
import {
  loadGenesisIsland, reconcileIslandFromGenesis,
  reconcileWellKnownTiddlers, mintLaresIfAbsent,
} from "./genesis-artifact.js";
import { repoRoot }                       from "@lararium/mesh/node";
import { LarEventBusImpl, DEFAULT_RINGS } from "@lararium/mesh";
import { VesselIslandPool }                from "./vessel-island-pool.js";
import { waitHandleLocal }                from "./repo-helpers.js";
import { openAdminVm }                    from "./open-admin-vm.js";
import {
  makeResidencyStatsReactor,
} from "@lararium/tw5";   // residency stats — the lone read that stays main-resident
import { generateOrLoadOperatorKeypair, loadOperatorSigningSeed } from "./operator-key.js";
import { AdminAuthGate }                           from "./admin-auth-gate.js";
import type { AdminVmResult } from "./open-admin-vm.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_GENESIS_DIR = join(repoRoot, "genesis");   // one root law (early alpha, no package-dir compatibility)

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

export interface NodeVesselOptions extends LarariumVesselOptions {
  storageDir: string;
  wss:        WebSocketServer;
  catalogUrl?: string | null;
  /** Directory containing social-bootstrap.json. Defaults to the package's own genesis/. */
  genesisDir?: string;
  /** Repo root for wiki memes scan and all mirror paths. Defaults to monorepo root. */
  rootDir?: string;
}

export interface NodeVesselResult extends VesselResult<VesselIslandPool, AdminVmResult> {
  /** Started event bus — ingress rings registered; tick loop running at 20 Hz (node substrate). */
  eventBus:  LarEventBusImpl;
  /** Stop the N-accumulator tick loop (call on graceful shutdown). */
  stopTick:  () => void;
}

const blankMemeStore = (repo: Repo): (() => DocHandle<LarDoc>) =>
  () => repo.create<LarDoc>(emptyLarDoc());

export async function openNodeVessel(opts: NodeVesselOptions): Promise<NodeVesselResult> {
  const { hostId, wikiId, storageDir, wss, catalogUrl, onPhase, genesisDir, rootDir: rootDirOpt } = opts;
  const bootstrapPath = join(genesisDir ?? DEFAULT_GENESIS_DIR, "social-bootstrap.json");
  const emit = (p: NodeOpenPhase) => onPhase?.(p);

  emit("boot");

  // ── 1. Repo — NodeFS storage + WebSocket relay behind the AdminAuthGate ─────
  const storage = new NodeFSStorageAdapter(storageDir);
  const authGate = new AdminAuthGate(wss);
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
    // Two rings: WS peers (outside) must have passed the AdminAuthGate; the
    // vessel's OWN islands (MessageChannel peers — admin + wiki workers) are
    // house members and share freely. Without the island ring, main never
    // relays admin-island-minted docs (@personal/@draft bindings) to the wiki
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
    ? await waitHandleLocal(repo, resolvedCatalogUrl as AutomergeUrl, blankCatalog)
    : blankCatalog();
  if (resolvedCatalogUrl && resolvedCatalogUrl !== catalogUrl) {
    try { mkdirSync(storageDir, { recursive: true }); writeFileSync(catalogUrlFile, catalogHandle.url, "utf8"); } catch { /* quota */ }
  }
  emit("catalog-ready");

  // ── Operator identity (node-held) ──────────────────────────────────────────
  const operatorIdentity = await generateOrLoadOperatorKeypair(storageDir);
  const operatorSeed     = await loadOperatorSigningSeed(storageDir);

  // ── Main-resident residency MECHANISM (sovereign-worker: policy in the worker,
  //    mechanism here). onEvict commands the pool via the forward `vmManager` ref. ──
  let vmManager!: VesselIslandPool;        // set in makePool
  let adminVm!:   AdminVmResult;           // set in openAdmin
  let eventBus!:  LarEventBusImpl;         // set in makePool
  let bootstrap!: VesselBootstrap;         // captured in loadGenesis
  let slotActiveWikiId = "";               // captured in wikiSlot
  let activeWikiSource: "boot-arg" | "admin-marker" = "boot-arg";

  const residency = new BagResidencyManager({
    hotCap:          32,
    idleMs:          300_000,
    sweepIntervalMs:  30_000,
    onEvict: async (bagId) => {
      await vmManager.unmountWiki(bagId);
      console.log(`[bag-residency] evicted ${bagId} (vm unmounted, compact-then-drop reserved for repo#358)`);
    },
  });

  // Read the admin doc (idempotent re-resolve; openAdminVm finds the same handle).
  const readAdminDoc = async (): Promise<DocHandle<LarDoc>> =>
    waitHandleLocal<LarDoc>(repo, bootstrap.adminUrl as AutomergeUrl, () => repo.create<LarDoc>(emptyLarDoc()));

  const result = await openVesselCore<VesselIslandPool>({
    keel: {
      repo,
      catalogHandle,
      waitHandle: <T>(url: AutomergeUrl, fallback: () => DocHandle<T>) => waitHandleLocal<T>(repo, url, fallback),

      // Genesis island (required) + the social-plane bootstrap it carries.
      loadGenesis: async () => {
        const genesisHandle = await loadGenesisIsland(repo, genesisDir);
        const catalog = catalogHandle.doc();
        const islandDocUrl = tiddlerText(catalog?.tiddlers?.[LARARIUM_DOC_URI]) ?? null;
        let islandHandle: DocHandle<LarDoc>;
        if (islandDocUrl) {
          islandHandle = await waitHandleLocal<LarDoc>(repo, islandDocUrl as AutomergeUrl, () => genesisHandle);
          await reconcileIslandFromGenesis(islandHandle, genesisHandle, genesisDir);
        } else {
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

        // @lares protocol-invariant mint — operator(admin) office, node home only.
        mintLaresIfAbsent(repo, islandHandle);

        const coreBlobEntry = (islandHandle.doc()?.blobs ?? {})[ENGINE_CORE_ID];
        if (!coreBlobEntry?.blob) {
          throw new Error(`[openNodeVessel] missing TW5 core blob (${ENGINE_CORE_ID}) in LarDoc; re-run build:genesis`);
        }
        const coreHash = coreBlobEntry.sha256;
        if (!coreHash) throw new Error(`[openNodeVessel] TW5 core blob missing sha256; re-run build:genesis`);

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
        const adminUrl      = bootstrapTiddlers[ADMIN_BAG_ID]?.text       ?? tiddlerText(id?.[ADMIN_BAG_ID])       ?? null;
        if (!identitiesUrl || !circlesUrl || !sessionsUrl || !adminUrl) {
          throw new Error(
            `[lararium] social plane not initialised — run: pnpm --filter @lararium/node lararium:init\n` +
            `  missing: ${[!identitiesUrl && "@identities", !circlesUrl && "@circles", !sessionsUrl && "@sessions", !adminUrl && "@admin"].filter(Boolean).join(", ")}`,
          );
        }
        bootstrap = { identitiesUrl, circlesUrl, sessionsUrl, adminUrl };
        return { islandHandle, coreHash, bootstrap };
      },

      tempStore: () => new MemoryTiddlerStore(),

      // Corpus capability piece — one top-level bag per catalog corpus entry.
      loadCorpora: async (composite) => {
        const catalog = catalogHandle.doc();
        const entries = Object.entries(catalog?.tiddlers ?? {})
          .filter(([uri]) => uri.startsWith(CATALOG_CORPUS_PREFIX))
          .map(([uri, tiddler]) => ({ id: uri.slice(CATALOG_CORPUS_PREFIX.length), docUrl: tiddlerText(tiddler) }))
          .filter((e): e is { id: string; docUrl: string } => Boolean(e.docUrl));
        await Promise.all(entries.map(async (entry) => {
          const handle = await waitHandleLocal<LarDoc>(repo, entry.docUrl as AutomergeUrl, blankMemeStore(repo));
          addReadOnlyLayer(composite, corpusBagId(entry.id), handle);
          const corpusUri = corpusLarUri(entry.id);
          if (tiddlerText(handle.doc()?.tiddlers?.[corpusUri]) !== handle.url) {
            handle.change((doc) => { doc.tiddlers[corpusUri] = mutableLarRecord(corpusUri, { text: handle.url }, "lararium-seed"); });
          }
          const registryUri = catalogCorpusEntryUri(entry.id);
          if (tiddlerText(catalogHandle.doc()?.tiddlers?.[registryUri]) !== entry.docUrl) {
            catalogHandle.change((doc) => { doc.tiddlers[registryUri] = mutableLarRecord(registryUri, { text: entry.docUrl }, "lararium-seed"); });
          }
        }));
      },

      ...(onPhase ? { onPhase } : {}),
    },

    // Active-wiki slot — slug from the admin-doc marker (post-genesis).
    wikiSlot: async (_assembly: VesselCoreAssembly): Promise<VesselWikiSlot> => {
      const sel = selectActiveWikiSlug(wikiId, (await readAdminDoc()).doc()?.tiddlers?.[ACTIVE_WIKI_URI] ?? null);
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
    },

    // Admin VM — sovereign admin island + the operator's authn/z home.
    openAdmin: async ({ assembly, slot }) => {
      const adminDoc = (await readAdminDoc()).doc();
      const personGroupDocIdHex   = tiddlerText(adminDoc?.tiddlers?.[PERSON_GROUP_DOC_ID_TIDDLER])   ?? null;
      const personGroupAgentIdHex = tiddlerText(adminDoc?.tiddlers?.[PERSON_GROUP_AGENT_ID_TIDDLER]) ?? null;
      const meshCabalDocIdHex     = tiddlerText(adminDoc?.tiddlers?.[MESH_CABAL_DOC_ID_TIDDLER])     ?? null;
      if (!personGroupDocIdHex || !personGroupAgentIdHex || !meshCabalDocIdHex) {
        throw new Error(`[lararium] DreamNet sentinel oracle tiddlers missing — run \`lares init\`.`);
      }
      const adminAuth = {
        seed:                 operatorSeed,
        operatorVerifyingKey: operatorIdentity.verifyingKey,
        personGroupDocIdHex, personGroupAgentIdHex, meshCabalDocIdHex,
        registerBags: [
          ADMIN_BAG_ID, BAG_IDS.identities, BAG_IDS.groups, BAG_IDS.sessions,
          BAG_IDS.catalog, BAG_IDS.lararium, BAG_IDS.lares,
          slot.wikiBagId, slot.draftBagId,
        ],
      };
      adminVm = await openAdminVm({
        repo,
        adminUrl: bootstrap.adminUrl,
        coreHash: assembly.coreHash,
        grants: {
          islandUrl: assembly.islandHandle.url,
          // The admin island's OWN bag (@admin = wikiBagUri("admin"), one-recipe model).
          wikiUrl:   bootstrap.adminUrl,
          // ACCESS grant, not a LOAD slot — @catalog is absent from expandRecipe,
          // so the kernel never layers it; the worker reaches it via the accessor.
          catalogUrl: catalogHandle.url,
        },
        adminAuth,
        storageDir,
      });
      return { workerEa: adminVm.workerEa, mountMainVerbs: adminVm.mountMainVerbs, resolveBinding: adminVm };
    },

    // Thin main verb plane. Every admin verb that touches the catalog / recipe /
    // residency now lives in the worker (wireWorkerVerbs) — the admin holds ACCESS to
    // all bags there and writes-then-syncs, never reaching into a mounted wiki. Main
    // keeps only what is genuinely main-resident: sync-wiki (commands the pool's active
    // wiki island) and residency stats (a read of the main-resident manager).
    wireVerbs: (registry, _assembly) => {
      seedVesselDefaults(registry);
      registry.register("sync-wiki", async (args, ctx) =>
        vmManager.placeWikiVerb(slotActiveWikiId, {
          verb: "sync-wiki", args: args as Record<string, unknown>, requestedBy: ctx.invocation.requestedBy,
        }),
      );
      registry.register("residency", makeResidencyStatsReactor({ residency }));
    },

    // After the admin VM lives: residency pins + sweeper, arm the inbound gate, refresh oracles.
    afterAdmin: (_admin, assembly) => {
      void residency.pin(BAG_IDS.catalog,    "boot:catalog");
      void residency.pin(BAG_IDS.lararium,   "boot:lararium-island");
      if (assembly.laresHandle) void residency.pin(BAG_IDS.lares, "boot:lares-corpus");
      void residency.pin(BAG_IDS.identities, "boot:identities");
      void residency.pin(BAG_IDS.groups,     "boot:circles");
      void residency.pin(BAG_IDS.sessions,   "boot:sessions");
      void residency.pin(ADMIN_BAG_ID,       "boot:admin");
      residency.startSweeper();
      assembly.composite.attachResidency(residency);

      // Inbound WS gate — the admin island's in-worker keyhive answers each peer.
      authGate.arm(adminVm.authSeam, ADMIN_BAG_ID, operatorIdentity.verifyingKey);

      // Keep oracle tiddlers current — self, ka, ba, social plane, admin.
      reconcileWellKnownTiddlers(
        assembly.islandHandle, catalogHandle.url, assembly.laresHandle?.url,
        bootstrap.identitiesUrl, bootstrap.circlesUrl, bootstrap.sessionsUrl,
        adminVm.adminHandle.url,
      );
    },

    // Island pool (worker_threads) + the event bus + the sovereign-worker command bindings.
    makePool: (_admin, assembly) => {
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
      const diskMirrorGrant: readonly { bagId: string; mirrorRoot: string; scope: string }[] = [
        { bagId: LARES_DOC_URI,    mirrorRoot: join(workerRootDir, "bags/@lares"),    scope: "@lares" },
        { bagId: LARARIUM_DOC_URI, mirrorRoot: join(workerRootDir, "bags/@lararium"), scope: "@lararium" },
      ];
      vmManager = new VesselIslandPool({
        mainRepo:    repo,
        storageRoot: storageDir,
        diskMirrorGrant,
        onWorkerEvent: (wikiId, msg) => {
          eventBus.enqueueToRing("vm-ring", "worker.event", { wikiId, listenable: msg.listenable, payload: msg.payload });
        },
        onEa: (wikiId) => { void mailbox.drain(wikiId); },   // breath → parked verbs deliver
      });

      // Sovereign-worker: bind the pool MECHANISM to the worker's POLICY commands.
      adminVm.onEvictRequest((bagId) => vmManager.unmountWiki(bagId));
      adminVm.onResidencyOp(async (op, bagId, reason) => {
        if (op === "pin")        await residency.pin(bagId, reason);
        else if (op === "unpin") residency.unpin(bagId);
        else                     residency.registerCold(bagId);
      });
      // Wiki-alert delivery: the worker named an affected wiki; place a system-alert verb
      // into that wiki's live island (skip silently if not mounted). wikiId = host:slug.
      adminVm.onWikiAlert((wikiSlug, message, cause, kind) => {
        const wikiId = `${hostId}:${wikiSlug}`;
        const verbOpts = { verb: "system-alert", args: { message, cause: cause ?? "", kind: kind ?? "" }, requestedBy: "admin" };
        void vmManager.placeWikiVerb(wikiId, verbOpts)
          // Not live → the verb PARKS durably and delivers on next mount —
          // the silent skip died 2026-06-12 (Akka /deadLetters lesson:
          // undeliverables go somewhere visible, never nowhere).
          .catch(() => mailbox.park(wikiId, verbOpts));
      });
      return vmManager;
    },

    // After live: wire the cross-island verb routing (worker.event → admin placeVerb).
    afterLive: ({ wikiHandle: _wikiHandle }) => {
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
    },
  });

  return {
    activeWikiId: slotActiveWikiId,
    activeWikiSource,
    pool: result.pool, repo,
    store: result.assembly.composite,
    admin: adminVm,
    wikiDocUrl:       result.wikiHandle.url,
    catalogHandleUrl: catalogHandle.url,
    larariumDocUrl:   result.assembly.islandHandle.url,
    phase: "live",
    eventBus,
    stopTick: () => { void result.pool.disposeAll(); },
  };
}
