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
 * (PersonGroup/admin), not genesis — see project-sovereign-worker-model.
 */

import { Repo }                              from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter }           from "@automerge/automerge-repo-storage-indexeddb";
import type { DocHandle, AutomergeUrl }      from "@automerge/automerge-repo";
import {
  emptyLarDoc, mutableLarRecord, tiddlerText,
  CATALOG_DOC_URI, LARARIUM_DOC_URI, LARES_DOC_URI, ADMIN_BAG_ID,
  ENGINE_CORE_ID, corpusBagId,
  corpusLarUri, catalogCorpusEntryUri, CATALOG_CORPUS_PREFIX,
  BAG_IDS, slugFromUri, BagResidencyManager,
  type LarDoc, type LarariumVesselOptions, type VesselResult,
  type VesselBootstrap, type VesselCoreAssembly,
}                                            from "@lararium/mesh";
import {
  MemoryTiddlerStore,
  planActiveWikiSlot, selectActiveWikiSlug,
  addReadOnlyLayer, seedVesselDefaults,
  openVesselCore,
  makeInitWikiReactor, makeOpenWikiReactor,
  makePinWikiReactor, makeUnpinWikiReactor,
  makeAddBagReactor, makeRemoveBagReactor,
  makePruneStaleReactor, makeDraftReactor,
  makeEpochBagReactor, makeRotateRecipeReactor,
  makeResidencyStatsReactor,
  makeCatalogAccessor,
}                                            from "@lararium/tw5";
import type { VesselWikiSlot, VesselCoreResult } from "@lararium/tw5";
import { runFoundingCeremony }               from "@lararium/keyhive";
import type { LarOpenPhase }                 from "@lararium/mesh";
import {
  generateOrLoadBrowserKeypair, loadBrowserSigningSeed,
  openVesselIdb, idbGet, idbPut,
}                                            from "./browser-operator-key.js";
import { BrowserVesselIslandPool }           from "./browser-vessel-island-pool.js";
import {
  loadGenesisIslandFromBytes, findGenesisIsland,
  reconcileGenesisUpdate, writeGenesisBytesToOpfs,
}                                            from "./browser-genesis.js";
import {
  openBrowserAdminVm, VerbTable,
  type BrowserAdminVmResult,
}                                            from "./open-browser-admin-vm.js";
import type { WikiRecipe }                   from "@lararium/mesh";

// ── Bootstrap artifact (IDB-persisted) ──────────────────────────────────────────

const BOOTSTRAP_KEY  = "social-bootstrap";
const ISLAND_URL_KEY = "island-doc-url";

interface BrowserBootstrap extends VesselBootstrap {
  personGroupDocIdHex:   string;
  personGroupAgentIdHex: string;
  meshCabalDocIdHex:     string;
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
  /** URL of the compiled browser admin island Worker script. */
  adminWorkerUrl?: URL;
  /** URL of the compiled browser wiki Worker script. */
  workerScriptUrl?: URL;
  /** Optional verb registry for admin delegation. */
  verbTable?:      VerbTable;
}

/** The ONE shared VesselResult (no vessel-by-type) + browser's one substrate extra. */
export interface BrowserVesselResult extends VesselResult<BrowserVesselIslandPool, BrowserAdminVmResult> {
  /** True when a genesis update was detected + merged on this boot (browser substrate). */
  engineUpdated: boolean;
}

async function waitHandleLocal<T>(repo: Repo, url: string, fallback: () => DocHandle<T>): Promise<DocHandle<T>> {
  try {
    const handle = await repo.find<T>(url as AutomergeUrl, { allowableStates: ["ready", "unavailable"] });
    if (handle.isUnavailable()) return fallback();
    return handle;
  } catch {
    return fallback();
  }
}

export async function openBrowserVessel(opts: BrowserVesselOptions): Promise<BrowserVesselResult> {
  const {
    hostId, wikiId,
    idbName = "lares:vessel", displayName, onPhase,
    genesisBytes, islandDocUrl: admitIslandDocUrl,
    adminWorkerUrl, workerScriptUrl, verbTable,
  } = opts;
  const emit = (p: LarOpenPhase) => onPhase?.(p);

  emit("boot");

  // ── Repo — IndexedDB-backed (substrate) ────────────────────────────────────
  const repo = new Repo({
    storage:     new IndexedDBStorageAdapter(`${idbName}:repo`),
    sharePolicy: async () => true,   // same-origin/in-process peers only (no WS server)
  });
  emit("repo-open");

  // ── Keypair (WebCrypto substrate) + founding (the personGroup capability) ───
  const operatorIdentity = await generateOrLoadBrowserKeypair(idbName, displayName);
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
    });
    bootstrap = {
      identitiesUrl: f.identitiesUrl, circlesUrl: f.circlesUrl, sessionsUrl: f.sessionsUrl, adminUrl: f.adminUrl,
      personGroupDocIdHex: f.personGroupDocIdHex, personGroupAgentIdHex: f.personGroupAgentIdHex, meshCabalDocIdHex: f.meshCabalDocIdHex,
    };
    bootKeyWrites.bootstrap = bootstrap;
  }
  const social = bootstrap;   // narrowed (defined past this point)

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
  let admin!:     BrowserAdminVmResult;      // set in openAdmin
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
            if (live) { const r = await reconcileGenesisUpdate(live, incoming, genesisBytes); engineUpdated = r.updated; islandHandle = live; }
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
        return { islandHandle, coreHash, bootstrap: social };
      },

      tempStore: () => new MemoryTiddlerStore(),

      // Corpus capability (parity — browser syncs corpus bags too).
      loadCorpora: async (composite) => {
        const entries = Object.entries(catalogHandle.doc()?.tiddlers ?? {})
          .filter(([uri]) => uri.startsWith(CATALOG_CORPUS_PREFIX))
          .map(([uri, t]) => ({ id: uri.slice(CATALOG_CORPUS_PREFIX.length), docUrl: tiddlerText(t) }))
          .filter((e): e is { id: string; docUrl: string } => Boolean(e.docUrl));
        await Promise.all(entries.map(async (entry) => {
          const h = await waitHandleLocal<LarDoc>(repo, entry.docUrl, () => repo.create<LarDoc>(emptyLarDoc()));
          addReadOnlyLayer(composite, corpusBagId(entry.id), h);
          const cu = corpusLarUri(entry.id);
          if (tiddlerText(h.doc()?.tiddlers?.[cu]) !== h.url) h.change((doc) => { doc.tiddlers[cu] = mutableLarRecord(cu, { text: h.url }, "browser-boot"); });
          const ru = catalogCorpusEntryUri(entry.id);
          if (tiddlerText(catalogHandle.doc()?.tiddlers?.[ru]) !== entry.docUrl) catalogHandle.change((doc) => { doc.tiddlers[ru] = mutableLarRecord(ru, { text: entry.docUrl }, "browser-boot"); });
        }));
      },

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

    openAdmin: async ({ assembly, slot }) => {
      if (!adminWorkerUrl) throw new Error("[openBrowserVessel] adminWorkerUrl REQUIRED (genesis present → sovereign admin island)");
      const adminAuth = {
        seed: operatorSeed, operatorVerifyingKey: operatorIdentity.verifyingKey,
        personGroupDocIdHex: social.personGroupDocIdHex,
        personGroupAgentIdHex: social.personGroupAgentIdHex,
        meshCabalDocIdHex: social.meshCabalDocIdHex,
        registerBags: [
          ADMIN_BAG_ID, BAG_IDS.identities, BAG_IDS.groups, BAG_IDS.sessions,
          BAG_IDS.catalog, BAG_IDS.lararium, BAG_IDS.lares,
          slot.wikiBagId, slot.draftBagId,
        ],
      };
      admin = await openBrowserAdminVm({
        repo, adminUrl: social.adminUrl, coreHash: assembly.coreHash,
        workerScriptUrl: adminWorkerUrl,
        recipe: { wikiSlug: "admin" } satisfies WikiRecipe,
        resolver: {
          [BAG_IDS.lararium]:       assembly.islandHandle.url,
          "lar:///ha.ka.ba/@admin": social.adminUrl,
          ...(assembly.laresHandle ? { [BAG_IDS.lares]: assembly.laresHandle.url } : {}),
        },
        adminAuth,
      });
      return { workerEa: admin.workerEa, mountMainVerbs: admin.mountMainVerbs, resolveBinding: admin };
    },

    wireVerbs: (registry, assembly) => {
      seedVesselDefaults(registry);
      // Verb parity with node — the mint/compose/residency-stats verbs (now tw5-resident).
      // ONE catalog-driven accessor (access≠load) replaces catalogHandle/islandHandle.
      const catalog = makeCatalogAccessor(assembly.repo, catalogHandle.url);
      const wikiMintOpts = {
        composite: assembly.composite, repo: assembly.repo, catalog,
        rootDir: "",
        operatorDid: async () => "0x" + operatorDid,
      };
      registry.register("sync-wiki", async (args, ctx) =>
        vmManager.placeWikiVerb(slotActiveWikiId, {
          verb: "sync-wiki", args: args as Record<string, unknown>, requestedBy: ctx.invocation.requestedBy,
        }),
      );
      registry.register("init-wiki",     makeInitWikiReactor(wikiMintOpts));
      registry.register("open-wiki",     makeOpenWikiReactor({ composite: assembly.composite }));
      registry.register("residency",     makeResidencyStatsReactor({ residency }));
      registry.register("pin-wiki",      makePinWikiReactor({ composite: assembly.composite, residency }));
      registry.register("unpin-wiki",    makeUnpinWikiReactor({ composite: assembly.composite, residency }));
      registry.register("add-bag",       makeAddBagReactor({ composite: assembly.composite, repo: assembly.repo, residency }));
      registry.register("remove-bag",    makeRemoveBagReactor({ composite: assembly.composite, repo: assembly.repo, residency }));
      registry.register("bag-epoch",     makeEpochBagReactor({ composite: assembly.composite, repo: assembly.repo, residency, catalog }));
      registry.register("rotate-recipe", makeRotateRecipeReactor({ composite: assembly.composite, repo: assembly.repo, residency, catalog }));
      registry.register("prune-stale",   makePruneStaleReactor(wikiMintOpts));
      registry.register("draft",         makeDraftReactor({ composite: assembly.composite }));
    },

    afterAdmin: (_a, assembly) => {
      void residency.pin(BAG_IDS.catalog,    "boot:catalog");
      void residency.pin(BAG_IDS.lararium,   "boot:lararium-island");
      if (assembly.laresHandle) void residency.pin(BAG_IDS.lares, "boot:lares-corpus");
      void residency.pin(BAG_IDS.identities, "boot:identities");
      void residency.pin(BAG_IDS.groups,     "boot:circles");
      void residency.pin(BAG_IDS.sessions,   "boot:sessions");
      void residency.pin(ADMIN_BAG_ID,       "boot:admin");
      residency.startSweeper();
      assembly.composite.attachResidency(residency);
      // NB: no inbound WS gate — a browser cannot listen on a socket (substrate floor).
    },

    makePool: (_a, _assembly) => {
      vmManager = new BrowserVesselIslandPool({
        mainRepo: repo,
        onWorkerEvent: (_id, msg) => {
          const verb    = typeof msg.payload["verb"]    === "string" ? msg.payload["verb"]    : undefined;
          const fromUri = typeof msg.payload["fromUri"] === "string" ? msg.payload["fromUri"] : undefined;
          if (!verb) return;
          admin.placeVerb({
            verb, args: msg.payload as unknown as Record<string, unknown>,
            requestedBy: typeof msg.payload["requestedBy"] === "string" ? msg.payload["requestedBy"] : msg.listenable,
            listenable: msg.listenable, ...(fromUri ? { fromUri } : {}),
          });
        },
        ...(workerScriptUrl ? { workerScriptUrl } : {}),
      });
      admin.onEvictRequest((bagId) => vmManager.unmountWiki(bagId));
      admin.onResidencyOp(async (op, bagId, reason) => {
        if (op === "pin")        await residency.pin(bagId, reason);
        else if (op === "unpin") residency.unpin(bagId);
        else                     residency.registerCold(bagId);
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
    admin,
    activeWikiId:     slotActiveWikiId,
    activeWikiSource: "boot-arg",
    wikiDocUrl:       result.wikiHandle.url,
    catalogHandleUrl: catalogHandle.url,
    larariumDocUrl:   result.assembly.islandHandle.url,
    phase:            "live",
    engineUpdated,
  };
}
