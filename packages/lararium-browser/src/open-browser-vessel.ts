/**
 * openBrowserVessel — local-first browser vessel factory.
 *
 * A thin RECIPE over `openVesselCore` (the one keel, both substrates) — the BROWSER
 * carries the SAME capabilities as node; only the SUBSTRATE differs. Radical-YIN cleanup
 * (2026-06-08): the prior browser fork drifted thin via easy-path shortcuts (coreless boot,
 * no residency manager, no corpus, a LarVessel wrapper). Those die. Genuine browser
 * substrate (the ONLY divergence): IndexedDB storage, WebCrypto keys, founding-via-ceremony
 * (vs node's lares-init), Web Worker spawn, NO WS-server inbound gate (a browser cannot
 * listen on a socket), genesis-via-bytes/IDB/OPFS/peer. Capabilities held in common: the
 * BagResidencyManager mechanism, corpus loading, the verb plane, presence.
 *
 * Genesis REQUIRED (coreless deleted). The not-yet-held axis sits at anon↔keeper
 * (PersonaGroup/admin), not genesis — see project-sovereign-worker-model.
 */

import { Repo }                              from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter }           from "@automerge/automerge-repo-storage-indexeddb";
import type { DocHandle, AutomergeUrl }      from "@automerge/automerge-repo";
import {
  emptyLarDoc, mutableLarRecord,
  CATALOG_DOC_URI, DAEMON_BAG_ID,
  ENGINE_CORE_ID,
  ed25519SignerFromSeed, LarWSClientAdapter, type LeafIdentity,
  BAG_IDS, slugFromUri, BagResidencyManager,
  type LarDoc, type LarariumVesselOptions, type VesselResult,
  type VesselBootstrap, type VesselCoreAssembly, type DeviceDelegationTiddler,
}                                            from "@lararium/mesh";
import {
  MemoryTiddlerStore,
  planActiveWikiSlot, selectActiveWikiSlug,
  loadCatalogCorpora, seedVesselDefaults,
  openVesselCore,
  makeResidencyStatsReactor,
  PROJECTION_FRAME,
}                                            from "@lararium/tw5";
import type { VesselWikiSlot, VesselCoreResult, DaemonVmCore } from "@lararium/tw5";
import { runFoundingCeremony }               from "@lararium/keyhive";
import type { LarOpenPhase }                 from "@lararium/mesh";
import {
  generateOrLoadBrowserVesselIdentity, loadBrowserSigningSeed,
  openVesselIdb, idbGet, idbPut,
}                                            from "./browser-vessel-identity.js";
import { BrowserVesselIslandPool }           from "./browser-vessel-island-pool.js";
import {
  loadGenesisIslandFromBytes, findGenesisIsland,
  reconcileGenesisUpdate, writeGenesisBytesToOpfs, writeBlobsToCasOpfs,
}                                            from "./browser-genesis.js";
import {
  openBrowserDaemonVm,
}                                            from "./open-browser-daemon-vm.js";
import type { WikiRecipe }                   from "@lararium/mesh";

// ── Bootstrap artifact (IDB-persisted) ──────────────────────────────────────────

const BOOTSTRAP_KEY  = "social-bootstrap";
const ISLAND_URL_KEY = "island-doc-url";

interface BrowserBootstrap extends VesselBootstrap {
  personaGroupDocIdHex:   string;
  personaGroupAgentIdHex: string;
  meshCabalDocIdHex:     string;
  /** The signer DID the Binding Gate pins the edge to — self-DID for an anon (self-signed). */
  signerDid:             string;
  /** This vessel's self-signed device-delegation edge — the public binding the Binding Gate verifies. */
  deviceEdge:            DeviceDelegationTiddler;
  /** Cached self-certifying ContactCard JSON (founding) — the leaf identity for the V3 peer gate. */
  contactCard?:          string;
}

interface BootKeyReads {
  bootstrap:       BrowserBootstrap | undefined;
  catalogUrl:      string | undefined;
  storedIslandUrl: string | undefined;
}

async function readBootKeys(idbName: string): Promise<BootKeyReads> {
  const idb = await openVesselIdb(idbName);
  try {
    const [bootstrap, catalogUrl, storedIslandUrl] = await Promise.all([
      idbGet<BrowserBootstrap>(idb, "bootstrap", BOOTSTRAP_KEY),
      idbGet<string>(idb, "keystore", "catalog-url"),
      idbGet<string>(idb, "keystore", ISLAND_URL_KEY),
    ]);
    return { bootstrap, catalogUrl, storedIslandUrl };
  } finally {
    idb.close();
  }
}

interface BootKeyWrites { bootstrap?: BrowserBootstrap; catalogUrl?: string; islandUrl?: string }

async function writeBootKeys(idbName: string, writes: BootKeyWrites): Promise<void> {
  if (!writes.bootstrap && !writes.catalogUrl && !writes.islandUrl) return;
  const idb = await openVesselIdb(idbName);
  try {
    await Promise.all([
      ...(writes.bootstrap  ? [idbPut(idb, "bootstrap", BOOTSTRAP_KEY,  writes.bootstrap)]  : []),
      ...(writes.catalogUrl ? [idbPut(idb, "keystore",  "catalog-url",  writes.catalogUrl)] : []),
      ...(writes.islandUrl  ? [idbPut(idb, "keystore",  ISLAND_URL_KEY, writes.islandUrl)]  : []),
    ]);
  } finally {
    idb.close();
  }
}

// ── Options / Result ────────────────────────────────────────────────────────────

export interface BrowserVesselOptions extends LarariumVesselOptions {
  idbName?:        string;
  displayName?:    string;
  /** Genesis island bytes (Vite binary import / CDN fetch). One genesis source REQUIRED. */
  genesisBytes?:   Uint8Array;
  /** Automerge URL of a peer's genesis island doc (Tier-1 peer-sync; from DeviceAdmitPayload). */
  islandDocUrl?:   string | null;
  /** Relay gate URL (ws://host:port/ws) to dial for the node↔browser spore crossing. When set (and
   *  a founding card is cached), the vessel composes the V3 leaf transport (LarWSClientAdapter) and
   *  adds it to the Repo — the browser's outbound crossing. */
  relayUrl?:       string;
  /** URL of the compiled browser daemon island Worker script. */
  daemonWorkerUrl?: URL;
  /** URL of the compiled browser wiki Worker script. */
  workerScriptUrl?: URL;
  /** Projection-nalu sink: a `projection:frame` (rendered HTML+CSS) from the hot wiki island.
   *  The app applies it to a shadow root — the live wiki made visible. */
  onProjection?:   (frame: { html: string; css: string; rev: number }) => void;
}

/** The ONE shared VesselResult (no vessel-by-type) + browser's one substrate extra. */
export interface BrowserVesselResult extends VesselResult<BrowserVesselIslandPool, DaemonVmCore> {
  /** True when a genesis update was detected + merged on this boot (browser substrate). */
  engineUpdated: boolean;
  /** Relay a main-thread DOM event to the active wiki island (interactivity RETURN leg). */
  sendDomEvent: (renderId: string, eventType: string, fields: Record<string, number | boolean>) => void;
}

async function waitHandleLocal<T>(repo: Repo, url: string, fallback: () => DocHandle<T>): Promise<DocHandle<T>> {
  try {
    // automerge-repo 2.6: find() resolves when ready and rejects on unavailable.
    return await repo.find<T>(url as AutomergeUrl);
  } catch {
    return fallback();
  }
}

/** The engine's plugin-tiddler CIDs from an island doc's blobs (non-engine JSON blobs, by
 *  sha256). The daemon AND every wiki island resolve these by CID from the local CAS (the breath
 *  path), never CRDT-syncing the bytes. One derivation, fed to every island of the runtime. */
function pluginCidsFromIslandBlobs(
  blobs: Record<string, { id?: string; sha256?: string; mimeType?: string }> | undefined,
): readonly string[] {
  return Object.values(blobs ?? {})
    .filter((b) => b.id !== ENGINE_CORE_ID && b.mimeType === "application/json" && typeof b.sha256 === "string")
    .map((b) => b.sha256 as string);
}

export async function openBrowserVessel(opts: BrowserVesselOptions): Promise<BrowserVesselResult> {
  const {
    hostId, wikiId,
    idbName = "lares:vessel", displayName, onPhase,
    genesisBytes, islandDocUrl: admitIslandDocUrl,
    daemonWorkerUrl, workerScriptUrl, onProjection, relayUrl,
  } = opts;
  const emit = (p: LarOpenPhase) => onPhase?.(p);

  emit("boot");

  // ── Repo — IndexedDB-backed (substrate) ────────────────────────────────────
  const repo = new Repo({
    storage:     new IndexedDBStorageAdapter(`${idbName}:repo`),
    sharePolicy: async () => true,   // same-origin/in-process peers only (no WS server)
  });
  emit("repo-open");

  // ── Keypair (WebCrypto substrate) + founding (the personaGroup capability) ───
  const operatorIdentity = await generateOrLoadBrowserVesselIdentity(idbName, displayName);
  const operatorSeed     = await loadBrowserSigningSeed(idbName);
  const operatorDid      = operatorIdentity.verifyingKey;

  const bootKeys = await readBootKeys(idbName);
  const bootKeyWrites: BootKeyWrites = {};
  let bootstrap = bootKeys.bootstrap;
  if (!bootstrap) {
    const f = await runFoundingCeremony({
      repo, operatorSeed,
      operatorVerifyingKey: operatorIdentity.verifyingKey,
      operatorDisplayName:  displayName ?? "Browser Operator",
      signerSeed: operatorSeed,   // self-signed anon (signerDid == deviceDid) — the floor tier
      hearthTrueName: "",          // hearth-agnostic: an anon is not yet bound to a place; it binds on upgrade
    });
    bootstrap = {
      identitiesUrl: f.identitiesUrl, circlesUrl: f.circlesUrl, sessionsUrl: f.sessionsUrl, daemonUrl: f.daemonUrl,
      personaGroupDocIdHex: f.personaGroupDocIdHex, personaGroupAgentIdHex: f.personaGroupAgentIdHex, meshCabalDocIdHex: f.meshCabalDocIdHex,
      signerDid: f.signerDid, deviceEdge: f.founderEdge,
      contactCard: f.contactCardJson,
    };
    bootKeyWrites.bootstrap = bootstrap;
  }
  const social = bootstrap;   // narrowed (defined past this point)

  // ── The spore crossing — the outbound V3 leaf transport (opt-in via relayUrl) ──────────────
  // When a relay URL is given AND a founding card is cached, compose the platform-blind
  // LarWSClientAdapter and add it to the Repo: the browser dials the node's gate, runs the V3
  // handshake on the socket, and — on a passing verdict — syncs shared docs (the second spore).
  // FLOW ⊥ AUTHORITY: this is pure authority+sync; the nalu servo / ea-backpressure rides later.
  // NOTE: the gate admits only a peer holding cap=admin on the node's @daemon — a same-operator leaf
  // (gatePubKey == own DID) or a device-admitted key. An un-admitted anon dials + fails closed.
  if (relayUrl && social.contactCard) {
    const leaf: LeafIdentity = {
      contactCard: social.contactCard,
      peerPubKey:  operatorDid,
      sign:        ed25519SignerFromSeed(operatorSeed),
    };
    const relayAdapter = new LarWSClientAdapter({
      url: relayUrl, identity: leaf, aud: DAEMON_BAG_ID, gatePubKey: operatorDid,
    });
    repo.networkSubsystem.addNetworkAdapter(relayAdapter);
  }

  // ── Catalog ────────────────────────────────────────────────────────────────
  const blankCatalog = (): DocHandle<LarDoc> => {
    const h = repo.create<LarDoc>(emptyLarDoc());
    h.change((doc) => { doc.tiddlers[CATALOG_DOC_URI] = mutableLarRecord(CATALOG_DOC_URI, { text: h.url }, "browser-boot"); });
    return h;
  };
  let catalogHandle: DocHandle<LarDoc>;
  if (bootKeys.catalogUrl) {
    catalogHandle = await waitHandleLocal<LarDoc>(repo, bootKeys.catalogUrl, blankCatalog);
  } else {
    catalogHandle = blankCatalog();
    bootKeyWrites.catalogUrl = catalogHandle.url;
  }
  emit("catalog-ready");

  // ── Residency MECHANISM (parity with node — a tab has finite memory too) ────
  let vmManager!: BrowserVesselIslandPool;   // set in makePool
  let daemon!:     DaemonVmCore;      // set in openDaemon
  let slotActiveWikiId = "";
  let engineUpdated = false;
  const residency = new BagResidencyManager({
    hotCap: 32, idleMs: 300_000, sweepIntervalMs: 30_000,
    onEvict: async (bagId) => { await vmManager.unmountWiki(bagId); },
  });

  const result: VesselCoreResult<BrowserVesselIslandPool> = await openVesselCore<BrowserVesselIslandPool>({
    keel: {
      repo,
      catalogHandle,
      waitHandle: <T>(url: AutomergeUrl, fallback: () => DocHandle<T>) => waitHandleLocal<T>(repo, url, fallback),

      // Genesis REQUIRED — bytes (Tier 1/3) ⇆ IDB (Tier 2) ⇆ peer (Tier 1). No coreless.
      loadGenesis: async () => {
        let islandHandle: DocHandle<LarDoc> | null = null;
        if (genesisBytes) {
          const incoming = await loadGenesisIslandFromBytes(repo, genesisBytes);
          if (bootKeys.storedIslandUrl) {
            const live = await findGenesisIsland(repo, bootKeys.storedIslandUrl);
            if (live) { const r = await reconcileGenesisUpdate(live, incoming); engineUpdated = r.updated; islandHandle = live; }
            else islandHandle = incoming;
          } else {
            islandHandle = incoming;
            bootKeyWrites.islandUrl = islandHandle.url;
            await writeGenesisBytesToOpfs(genesisBytes);
          }
        } else if (bootKeys.storedIslandUrl) {
          islandHandle = await findGenesisIsland(repo, bootKeys.storedIslandUrl);
        } else if (admitIslandDocUrl) {
          islandHandle = await findGenesisIsland(repo, admitIslandDocUrl);
          if (islandHandle) bootKeyWrites.islandUrl = islandHandle.url;
        }
        await writeBootKeys(idbName, bootKeyWrites);
        if (!islandHandle) {
          throw new Error("[openBrowserVessel] genesis REQUIRED (coreless boot deleted) — provide genesisBytes, a stored island, or islandDocUrl (peer-sync)");
        }
        const coreHash = islandHandle.doc()?.blobs?.[ENGINE_CORE_ID]?.sha256 ?? null;
        if (!coreHash) throw new Error("[openBrowserVessel] genesis island missing ENGINE_CORE_ID blob");
        // Populate the OPFS CAS — the worker pulls engine + plugin bytes by CID from here
        // (the breath path), never CRDT-syncing the 2.3 MB @oracle blob doc over the port.
        await writeBlobsToCasOpfs((islandHandle.doc()?.blobs ?? {}) as Record<string, { sha256?: string; blob?: unknown }>);
        return { islandHandle, coreHash, bootstrap: social };
      },

      tempStore: () => new MemoryTiddlerStore(),

      // Corpus capability (parity — browser syncs corpus bags too; shared loader).
      loadCorpora: (composite) => loadCatalogCorpora({
        repo, catalogHandle,
        mintLocalHandle: (docUrl) => waitHandleLocal<LarDoc>(repo, docUrl, () => repo.create<LarDoc>(emptyLarDoc())),
        source: "browser-boot",
      }, composite),

      ...(onPhase ? { onPhase } : {}),
    },

    wikiSlot: (_assembly: VesselCoreAssembly): VesselWikiSlot => {
      const sel = selectActiveWikiSlug(wikiId, undefined);
      slotActiveWikiId = sel.slug;
      const plan = planActiveWikiSlot({ hostId, wikiSlug: sel.slug, identityDid: operatorDid });
      return {
        activeWikiId: sel.slug, wikiSlug: slugFromUri(sel.slug),
        wikiKey: plan.wikiKey, wikiBagId: plan.wikiBagId,
        draftOracleTitle: plan.draftOracleTitle, draftBagId: plan.draftBagId,
      };
    },

    openDaemon: async ({ assembly, slot }) => {
      if (!daemonWorkerUrl) throw new Error("[openBrowserVessel] daemonWorkerUrl REQUIRED (genesis present → sovereign daemon island)");
      const daemonAuth = {
        seed: operatorSeed, operatorVerifyingKey: operatorIdentity.verifyingKey,
        personaGroupDocIdHex: social.personaGroupDocIdHex,
        personaGroupAgentIdHex: social.personaGroupAgentIdHex,
        meshCabalDocIdHex: social.meshCabalDocIdHex,
        registerBags: [
          DAEMON_BAG_ID, BAG_IDS.identities, BAG_IDS.groups, BAG_IDS.sessions,
          BAG_IDS.catalog, BAG_IDS.oracle, BAG_IDS.lares,
          slot.wikiBagId, slot.draftBagId,
        ],
        signerDid: social.signerDid,
        deviceEdge: social.deviceEdge,
      };
      // The engine's plugin-tiddler CIDs — the worker pulls them by CID from OPFS (the breath
      // path), never CRDT-syncing the @oracle blob doc over the port. Same derivation as the pool.
      const pluginCids = pluginCidsFromIslandBlobs(assembly.islandHandle.doc()?.blobs);
      daemon = await openBrowserDaemonVm({
        repo, daemonUrl: social.daemonUrl, coreHash: assembly.coreHash,
        ...(pluginCids.length ? { pluginCids } : {}),
        workerScriptUrl: daemonWorkerUrl,
        recipe: { wikiSlug: "daemon" } satisfies WikiRecipe,
        grants: {
          islandUrl: assembly.islandHandle.url,
          // The daemon island's OWN bag (@daemon = wikiBagUri("daemon"), one-recipe model).
          wikiUrl:   social.daemonUrl,
          // ACCESS grant, not a LOAD slot — the worker reaches @catalog via the accessor.
          catalogUrl: catalogHandle.url,
        },
        daemonAuth,
      });
      return { workerEa: daemon.workerEa, mountMainVerbs: daemon.mountMainVerbs, resolveBinding: daemon };
    },

    wireVerbs: (registry, _assembly) => {
      seedVesselDefaults(registry);
      // Thin main verb plane (node parity). Every catalog/recipe/residency-mutating
      // daemon verb lives in the worker now (wireWorkerVerbs) — access≠load, write-then-sync.
      // Main keeps only sync-wiki (commands the pool's active wiki) + residency stats (a read).
      registry.register("sync-wiki", async (args, ctx) =>
        vmManager.placeWikiVerb(slotActiveWikiId, {
          verb: "sync-wiki", args: args as Record<string, unknown>, requestedBy: ctx.invocation.requestedBy,
        }),
      );
      registry.register("residency", makeResidencyStatsReactor({ residency }));
    },

    afterDaemon: (_a, assembly) => {
      void residency.pin(BAG_IDS.catalog,    "boot:catalog");
      void residency.pin(BAG_IDS.oracle,   "boot:lararium-island");
      if (assembly.laresHandle) void residency.pin(BAG_IDS.lares, "boot:lares-corpus");
      void residency.pin(BAG_IDS.identities, "boot:identities");
      void residency.pin(BAG_IDS.groups,     "boot:circles");
      void residency.pin(BAG_IDS.sessions,   "boot:sessions");
      void residency.pin(DAEMON_BAG_ID,       "boot:daemon");
      residency.startSweeper();
      assembly.composite.attachResidency(residency);
      // NB: no inbound WS gate — a browser cannot listen on a socket (substrate floor).
    },

    makePool: (_a, assembly) => {
      // Every wiki island resolves the SAME engine plugin-CIDs from the local CAS as the daemon
      // island does — one derivation, fed to both (role = capability ≠ platform; the wiki and
      // daemon are the one island runtime, differing only by their capability stack).
      const pluginCids = pluginCidsFromIslandBlobs(assembly.islandHandle.doc()?.blobs);
      vmManager = new BrowserVesselIslandPool({
        mainRepo: repo,
        ...(pluginCids.length ? { pluginCids } : {}),
        onWorkerEvent: (_id, msg) => {
          // Projection-nalu frames route to the display, not the verb plane.
          if (msg.listenable === PROJECTION_FRAME) {
            onProjection?.({
              html: String(msg.payload["html"] ?? ""),
              css:  String(msg.payload["css"]  ?? ""),
              rev:  Number(msg.payload["rev"]  ?? 0),
            });
            return;
          }
          const verb    = typeof msg.payload["verb"]    === "string" ? msg.payload["verb"]    : undefined;
          const fromUri = typeof msg.payload["fromUri"] === "string" ? msg.payload["fromUri"] : undefined;
          if (!verb) return;
          daemon.placeVerb({
            verb, args: msg.payload as unknown as Record<string, unknown>,
            requestedBy: typeof msg.payload["requestedBy"] === "string" ? msg.payload["requestedBy"] : msg.listenable,
            listenable: msg.listenable, ...(fromUri ? { fromUri } : {}),
          });
        },
        ...(workerScriptUrl ? { workerScriptUrl } : {}),
      });
      daemon.onEvictRequest((bagId) => vmManager.unmountWiki(bagId));
      daemon.onResidencyOp(async (op, bagId, reason) => {
        if (op === "pin")        await residency.pin(bagId, reason);
        else if (op === "unpin") residency.unpin(bagId);
        else                     residency.registerCold(bagId);
      });
      // Wiki-alert delivery — place a system-alert verb into the affected wiki's live
      // island (skip if not mounted). Same isomorphic seam as node. wikiId = host:slug.
      daemon.onWikiAlert((wikiSlug, message, cause) => {
        void vmManager.placeWikiVerb(`${hostId}:${wikiSlug}`, {
          verb: "system-alert", args: { message, cause: cause ?? "" }, requestedBy: "daemon",
        }).catch(() => { /* not mounted — best-effort */ });
      });
      return vmManager;
    },

    afterLive: ({ wikiHandle }) => {
      // Presence — ephemeral, does not travel via CRDT.
      wikiHandle.broadcast({ did: operatorDid, ts: Date.now() });
    },
  });

  return {
    pool: result.pool,
    repo,
    store: result.assembly.composite,
    daemon,
    activeWikiId:     slotActiveWikiId,
    activeWikiSource: "boot-arg",
    wikiDocUrl:       result.wikiHandle.url,
    catalogHandleUrl: catalogHandle.url,
    oracleDocUrl:     result.assembly.islandHandle.url,
    larariumDocUrl:   result.assembly.larariumHandle?.url ?? null,
    phase:            "live",
    engineUpdated,
    sendDomEvent: (renderId, eventType, fields) =>
      vmManager.placeWikiEvent(slotActiveWikiId, { renderId, eventType, fields }),
  };
}
