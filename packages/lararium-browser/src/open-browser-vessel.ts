/**
 * openBrowserVessel — local-first browser vessel factory.
 *
 * Browser analog of openNodeVessel. Platform deltas:
 *   - Repo uses IndexedDBStorageAdapter (main-thread catalog + social docs)
 *   - Keypair via WebCrypto (browser-operator-key.ts), not NodeFS
 *   - Bootstrap artifact stored in IDB, not genesis/social-bootstrap.json
 *   - Auto-init on first boot: runs runFoundingCeremony if no bootstrap in IDB
 *   - Repo uses IndexedDBStorageAdapter (main-thread catalog + social docs)
 *   - Genesis island: caller provides genesisBytes (Uint8Array); absent = skip island layers
 *   - Admin island: openBrowserAdminVm() — sovereign Worker, workerEa gate before "live"
 *   - Primary wiki island: BrowserVesselIslandPool.mountWiki() after admin ea
 *   - Keypair via WebCrypto (browser-operator-key.ts), not NodeFS
 *   - Bootstrap artifact stored in IDB, not genesis/social-bootstrap.json
 *   - Auto-init on first boot: runs runFoundingCeremony if no bootstrap in IDB
 *   - No WebSocketServer: browser vessel syncs via island MessageChannel + BroadcastChannel
 *   - broadcast() presence call on wikiHandle after gates pass
 *
 * Boot sequence:
 *   "boot" → "repo-open" → "catalog-ready" → "island-ready" → "wiki-ready" →
 *   "vessel-ready" → "tw5-booted" → "live"
 *
 * When genesisBytes is absent (test / pre-genesis path), island-ready and tw5-booted
 * are skipped; the pool stands ready with zero islands mounted.
 *
 * Genesis byte delivery — three-tier model (see browser-genesis.ts):
 *   Tier 1: network → IDB (peer sync via repo.find(islandDocUrl) or CID fetch)
 *   Tier 2: IDB → in-memory (fast path, fully offline after first boot)
 *   Tier 3: OPFS (raw bytes for Worker direct read, no IPC overhead)
 *
 * TW5 engine update signaling:
 *   reconcileGenesisUpdate() detects CID drift between incoming genesis bytes and
 *   the live island doc. When updated === true, write a TW5 alert tiddler to the
 *   admin doc (tagged lar:///ha.ka.ba/tags/engine-update) so the operator sees a
 *   native "Reload to pick up engine changes" prompt. No custom UI needed — TW5
 *   alert tiddlers are rendered natively by the existing alert system.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/open-browser-vessel
 */

import { Repo }                              from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter }           from "@automerge/automerge-repo-storage-indexeddb";
import type { DocHandle, AutomergeUrl }      from "@automerge/automerge-repo";
import {
  LarVessel, LAR_VESSEL_CAPABILITIES_BROWSER, OpenIdentitySlot,
  AutomergeDocStore, CompositeStore,
  emptyLarDoc, mutableLarRecord, tiddlerText,
  CATALOG_DOC_URI, LARARIUM_DOC_URI, LARES_DOC_URI, ADMIN_BAG_ID,
  ENGINE_CORE_ID,
  BAG_IDS, TEMP_BAG,
  slugFromUri,
  type LarDoc, type LarariumVesselOptions, type LarariumVesselResult,
}                                            from "@lararium/mesh";
import {
  MemoryTiddlerStore,
  planActiveWikiSlot, selectActiveWikiSlug,
  mountSocialPlane, addCanonLayer, addReadOnlyLayer, seedVesselDefaults,
}                                            from "@lararium/tw5";
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

// ── Bootstrap artifact ────────────────────────────────────────────────────────

const BOOTSTRAP_KEY  = "social-bootstrap";
const ISLAND_URL_KEY = "island-doc-url";

interface BrowserBootstrap {
  identitiesUrl:         string;
  circlesUrl:            string;
  sessionsUrl:           string;
  adminUrl:              string;
  personGroupDocIdHex:   string;
  personGroupAgentIdHex: string;
  meshCabalDocIdHex:     string;
}

// ── withVesselIdb helpers — one open/close per boot phase ────────────────────

interface BootKeyReads {
  bootstrap:      BrowserBootstrap | undefined;
  catalogUrl:     string | undefined;
  storedIslandUrl: string | undefined;
}

/** Read all boot-time IDB keys in one connection. */
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

interface BootKeyWrites {
  bootstrap?:  BrowserBootstrap;
  catalogUrl?: string;
  islandUrl?:  string;
}

/** Write all boot-time IDB key updates in one connection. */
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

// ── Options / Result ──────────────────────────────────────────────────────────

export interface BrowserVesselOptions extends LarariumVesselOptions {
  /** IDB database prefix. Defaults to "lares:vessel". */
  idbName?:        string;
  /** Operator display name for identity tiddler (first-boot only). */
  displayName?:    string;
  /**
   * Genesis island bytes (Uint8Array). Three delivery paths:
   *   1. Bundled by @elyncia/app (Vite binary import — offline-first install cost).
   *   2. Content-addressed CDN fetch: GET /genesis/island-<cid>.bin; client verifies SHA-256.
   *      elyncia.app will experiment with this pattern post-launch.
   *   3. Peer sync: absent here; caller passes islandDocUrl from DeviceAdmitPayload
   *      to repo.find() before calling openBrowserVessel.
   * When absent: island-ready + tw5-booted skipped; pool stands ready with zero islands.
   */
  genesisBytes?:   Uint8Array;
  /**
   * Automerge URL of a peer's genesis island doc. Used when no genesisBytes is
   * provided but the vessel has a live peer connection (Tier 1 peer-sync path).
   * openBrowserVessel calls repo.find(islandDocUrl) to sync genesis from the peer.
   * Sourced from DeviceAdmitPayload.islandDocUrl.
   */
  islandDocUrl?:   string | null;
  /** URL of the compiled browser admin island Worker script. Required for admin island boot. */
  adminWorkerUrl?: URL;
  /** URL of the compiled browser wiki Worker script. Required for primary wiki island boot. */
  workerScriptUrl?: URL;
  /** Optional verb registry for admin delegation. If absent, only "echo" is wired. */
  verbTable?:      VerbTable;
}

export interface BrowserVesselResult extends LarariumVesselResult<
  LarVessel<BrowserVesselIslandPool>,
  BrowserVesselIslandPool,
  Repo,
  CompositeStore
> {
  wikiDocUrl:  string;
  /** Resolves true when a genesis update was detected and merged on this boot. */
  engineUpdated: boolean;
  /** Admin vm result — available when genesisBytes or islandDocUrl provided. */
  admin:       BrowserAdminVmResult | null;
}

// ── waitHandleLocal (browser) ─────────────────────────────────────────────────

async function waitHandleLocal<T>(
  repo:     Repo,
  url:      string,
  fallback: () => DocHandle<T>,
): Promise<DocHandle<T>> {
  // repo.find() rejects when a doc is unavailable (default allowableStates = ["ready"]).
  // Pass "unavailable" so we receive the handle and can route to fallback() ourselves.
  // Outer catch handles storage adapter errors or unexpected rejections.
  try {
    const handle = await repo.find<T>(url as AutomergeUrl, {
      allowableStates: ["ready", "unavailable"],
    });
    if (handle.isUnavailable()) return fallback();
    return handle;
  } catch {
    return fallback();
  }
}

// ── openBrowserVessel ─────────────────────────────────────────────────────────

export async function openBrowserVessel(
  opts: BrowserVesselOptions,
): Promise<BrowserVesselResult> {
  const {
    hostId, wikiId,
    idbName = "lares:vessel", displayName, onPhase,
    genesisBytes, islandDocUrl: admitIslandDocUrl,
    adminWorkerUrl, workerScriptUrl, verbTable,
  } = opts;
  const emit = (p: LarOpenPhase) => onPhase?.(p);

  emit("boot");

  // ── 1. Repo — IndexedDB-backed ─────────────────────────────────────────────
  const repo = new Repo({
    storage:     new IndexedDBStorageAdapter(`${idbName}:repo`),
    sharePolicy: async () => true,
  });
  emit("repo-open");

  // ── 2. Keypair ─────────────────────────────────────────────────────────────
  const operatorIdentity = await generateOrLoadBrowserKeypair(idbName, displayName);
  const operatorSeed     = await loadBrowserSigningSeed(idbName);

  // ── 3–4–7. Read all boot keys in one IDB session ──────────────────────────
  const bootKeys = await readBootKeys(idbName);
  const bootKeyWrites: BootKeyWrites = {};

  // ── 3. Bootstrap — auto-init on first boot ────────────────────────────────
  let bootstrap = bootKeys.bootstrap;

  if (!bootstrap) {
    const result = await runFoundingCeremony({
      repo,
      operatorSeed,
      operatorVerifyingKey: operatorIdentity.verifyingKey,
      operatorDisplayName:  displayName ?? "Browser Operator",
    });
    bootstrap = {
      identitiesUrl:         result.identitiesUrl,
      circlesUrl:            result.circlesUrl,
      sessionsUrl:           result.sessionsUrl,
      adminUrl:              result.adminUrl,
      personGroupDocIdHex:   result.personGroupDocIdHex,
      personGroupAgentIdHex: result.personGroupAgentIdHex,
      meshCabalDocIdHex:     result.meshCabalDocIdHex,
    };
    bootKeyWrites.bootstrap = bootstrap;
  }

  // ── 4. Catalog doc ────────────────────────────────────────────────────────
  const blankCatalog = (): DocHandle<LarDoc> => {
    const h = repo.create<LarDoc>(emptyLarDoc());
    h.change((doc) => {
      doc.tiddlers[CATALOG_DOC_URI] = mutableLarRecord(CATALOG_DOC_URI, { text: h.url }, "browser-boot");
    });
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

  // ── 5. Social docs + 6. CompositeStore ─────────────────────────────────────
  const blankDoc = () => repo.create<LarDoc>(emptyLarDoc());
  const adminHandle = await waitHandleLocal<LarDoc>(repo, bootstrap.adminUrl, blankDoc);

  const composite = new CompositeStore();
  addReadOnlyLayer(composite, BAG_IDS.catalog, catalogHandle);
  // Keeper office: may SEED — a missing social doc is created blank.
  await mountSocialPlane(
    composite,
    { identitiesUrl: bootstrap.identitiesUrl, circlesUrl: bootstrap.circlesUrl, sessionsUrl: bootstrap.sessionsUrl },
    (url) => waitHandleLocal<LarDoc>(repo, url, blankDoc),
  );
  composite.addLayer({ bagId: ADMIN_BAG_ID, store: new AutomergeDocStore(adminHandle, ADMIN_BAG_ID), writable: true });

  // ── 7. Genesis island (optional — Tier 1/2 paths) ─────────────────────────
  let islandHandle: DocHandle<LarDoc> | null = null;
  let coreHash:     string | null            = null;
  let engineUpdated                          = false;

  if (genesisBytes) {
    // Tier 1 (bytes path): import bytes → Repo → IDB.
    const incomingHandle = await loadGenesisIslandFromBytes(repo, genesisBytes);

    if (bootKeys.storedIslandUrl) {
      // Resume: load live handle, reconcile if CID drifted (engine update).
      const liveHandle = await findGenesisIsland(repo, bootKeys.storedIslandUrl);
      if (liveHandle) {
        const reconcile = await reconcileGenesisUpdate(liveHandle, incomingHandle, genesisBytes);
        engineUpdated = reconcile.updated;
        islandHandle  = liveHandle;
      } else {
        islandHandle = incomingHandle;
      }
    } else {
      // Cold boot: incoming IS the island; persist URL.
      islandHandle             = incomingHandle;
      bootKeyWrites.islandUrl  = islandHandle.url;
      // Tier 3: write to OPFS for Worker direct access.
      await writeGenesisBytesToOpfs(genesisBytes);
    }
  } else if (bootKeys.storedIslandUrl) {
    // Tier 2: no bytes this boot — load from IDB via Automerge URL.
    islandHandle = await findGenesisIsland(repo, bootKeys.storedIslandUrl);
  } else if (admitIslandDocUrl) {
    // Tier 1 (peer-sync path): caller connected Repo to peer; sync island doc.
    islandHandle = await findGenesisIsland(repo, admitIslandDocUrl);
    if (islandHandle) bootKeyWrites.islandUrl = islandHandle.url;
  }

  // ── Write all new boot keys in one IDB session ────────────────────────────
  await writeBootKeys(idbName, bootKeyWrites);

  if (islandHandle) {
    const doc = islandHandle.doc();
    coreHash  = doc?.blobs?.[ENGINE_CORE_ID]?.sha256 ?? null;

    if (!coreHash) {
      console.warn("[browser-vessel] genesis island missing ENGINE_CORE_ID blob — skipping island layers");
      islandHandle = null;
    } else {
      addCanonLayer(composite, BAG_IDS.lararium, islandHandle);

      // @lares layer — oracle tiddler in island doc.
      const laresDocUrl = tiddlerText(doc?.tiddlers?.[LARES_DOC_URI]) ?? null;
      if (laresDocUrl) {
        const laresHandle = await waitHandleLocal<LarDoc>(repo, laresDocUrl, blankDoc);
        addCanonLayer(composite, BAG_IDS.lares, laresHandle);
      }

      // Write island URL oracle into catalog so island-ready state persists.
      const existingIslandRef = tiddlerText(catalogHandle.doc()?.tiddlers?.[LARARIUM_DOC_URI]) ?? null;
      if (existingIslandRef !== islandHandle.url) {
        catalogHandle.change((cdoc) => {
          cdoc.tiddlers[LARARIUM_DOC_URI] = mutableLarRecord(LARARIUM_DOC_URI, { text: islandHandle!.url }, "browser-boot");
        });
      }

      emit("island-ready");
    }
  }

  // ── 8. Authn/z home — keyhive boots IN the admin island worker ─────────────
  // Isomorphic-vessel Stage 1 (mirror of the node E.5 move): the host no longer
  // boots keyhive. The operator seed + sentinels cross into the admin worker via
  // manifest.adminAuth, where bootAdminKeyhive clears Gates A/B/C + the registerBag
  // sweep. Sovereignty-follows-canon: the admin worker only spins up WITH a core
  // (the `if (islandHandle && coreHash && adminWorkerUrl)` guard below); a coreless
  // browser boot is honestly pre-sovereign (founding done, not yet gated/live).
  //
  // operatorDid is the keyhive identity from the host's vantage: `whoami` returns
  // the verifying key hex verbatim (keyhive-provider.ts:114), so the persisted
  // verifyingKey IS the DID — used for the active-wiki identity + presence.
  const operatorDid = operatorIdentity.verifyingKey;

  // ── 9. Wiki doc ───────────────────────────────────────────────────────────
  const { slug: activeWikiId } = selectActiveWikiSlug(wikiId, undefined);
  const activeWikiPlan         = planActiveWikiSlot({ hostId, wikiSlug: activeWikiId, identityDid: operatorDid });

  const wikiKey     = activeWikiPlan.wikiKey;
  const wikiDocUrl  = tiddlerText(catalogHandle.doc()?.tiddlers?.[wikiKey]) ?? null;
  const wikiHandle: DocHandle<LarDoc> = wikiDocUrl
    ? await waitHandleLocal<LarDoc>(repo, wikiDocUrl, () => repo.create<LarDoc>(emptyLarDoc()))
    : repo.create<LarDoc>(emptyLarDoc());

  if (!wikiDocUrl) {
    catalogHandle.change((doc) => {
      doc.tiddlers[wikiKey] = mutableLarRecord(wikiKey, { text: wikiHandle.url }, "browser-boot");
    });
  }

  const wikiBagId = activeWikiPlan.wikiBagId;
  composite.addLayer({ bagId: wikiBagId, store: new AutomergeDocStore(wikiHandle, wikiBagId), writable: true, defaultWritable: true });

  // Draft bag — per-wiki CRDT layer; persists across tab closes (unlike scratch).
  const draftOracleTitle = activeWikiPlan.draftOracleTitle;
  const existingDraftUrl = tiddlerText(catalogHandle.doc()?.tiddlers?.[draftOracleTitle]) ?? null;
  const draftHandle: DocHandle<LarDoc> = existingDraftUrl
    ? await waitHandleLocal<LarDoc>(repo, existingDraftUrl, blankDoc)
    : blankDoc();
  if (!existingDraftUrl) {
    catalogHandle.change((doc) => {
      doc.tiddlers[draftOracleTitle] = mutableLarRecord(draftOracleTitle, { text: draftHandle.url }, "browser-boot");
    });
  }
  composite.addLayer({ bagId: activeWikiPlan.draftBagId, store: new AutomergeDocStore(draftHandle, activeWikiPlan.draftBagId), writable: true, defaultWritable: false });

  composite.addLayer({ bagId: TEMP_BAG, store: new MemoryTiddlerStore(), writable: true, defaultWritable: true });

  emit("wiki-ready");

  // adminAuth — delivered to the admin island so it boots keyhive in-worker and
  // clears Gates A/B/C + the registerBag sweep (bootAdminKeyhive). registerBags
  // mirrors the operator's writable-bag set (lar: URIs, not automerge: URLs).
  const adminAuth = {
    seed:                  operatorSeed,
    operatorVerifyingKey:  operatorIdentity.verifyingKey,
    personGroupDocIdHex:   bootstrap.personGroupDocIdHex,
    personGroupAgentIdHex: bootstrap.personGroupAgentIdHex,
    meshCabalDocIdHex:     bootstrap.meshCabalDocIdHex,
    registerBags: [
      ADMIN_BAG_ID,
      BAG_IDS.identities, BAG_IDS.groups, BAG_IDS.sessions,
      activeWikiPlan.wikiBagId, activeWikiPlan.draftBagId,
    ],
  };

  // ── 10. LarVessel ────────────────────────────────────────────────────────
  const identity = new OpenIdentitySlot(`${hostId}:${activeWikiId}`);
  const vessel   = new LarVessel<BrowserVesselIslandPool>({
    vesselId:     activeWikiPlan.vesselId,
    store:        composite,
    capabilities: LAR_VESSEL_CAPABILITIES_BROWSER,
    identity,
  });
  emit("vessel-ready");

  // ── 11. Island pool ───────────────────────────────────────────────────────
  const pool = new BrowserVesselIslandPool({
    mainRepo:      repo,
    // Path M.1 — cross-island verb routing.
    // Promise-pipelining law: island fires without ACK; vessel routes fire-and-forget.
    // admin resolves after openBrowserAdminVm(); closure captures the reference.
    onWorkerEvent: (_id, msg) => {
      const verb    = typeof msg.payload["verb"]    === "string" ? msg.payload["verb"]    : undefined;
      const fromUri = typeof msg.payload["fromUri"] === "string" ? msg.payload["fromUri"] : undefined;
      if (!verb || !admin) return; // observation-only or admin not yet live
      admin.placeVerb({
        verb,
        args:        msg.payload as unknown as Record<string, unknown>,
        requestedBy: typeof msg.payload["requestedBy"] === "string"
          ? msg.payload["requestedBy"]
          : msg.listenable,
        listenable: msg.listenable,
        ...(fromUri ? { fromUri } : {}),
      });
    },
    ...(workerScriptUrl ? { workerScriptUrl } : {}),
  });
  vessel.attachVmPool(pool);

  // ── 12. Admin island + primary wiki island (when genesis available) ────────
  let admin: BrowserAdminVmResult | null = null;

  if (islandHandle && coreHash && adminWorkerUrl) {
    admin = await openBrowserAdminVm({
      repo,
      adminUrl:        bootstrap.adminUrl,
      coreHash,
      workerScriptUrl: adminWorkerUrl,
      recipe: { wikiSlug: "admin" } satisfies WikiRecipe,
      resolver: {
        [BAG_IDS.lararium]:        islandHandle.url,
        "lar:///ha.ka.ba/@admin":  bootstrap.adminUrl,
      },
      adminAuth,
    });

    // Wire verb registry — minimal browser surface (echo + verbs from caller).
    const registry: VerbTable = verbTable ?? new VerbTable();
    seedVesselDefaults(registry);   // echo + universal base verbs
    admin.mountMainVerbs(registry);

    if (workerScriptUrl) {
      const wikiSlug = slugFromUri(activeWikiId);
      await pool.mountWiki(activeWikiId, {
        coreHash,
        recipe: { wikiSlug } satisfies WikiRecipe,
        resolver: {
          [BAG_IDS.lararium]:           islandHandle.url,
          [`lar:///ha.ka.ba/@${wikiSlug}`]: wikiHandle.url,
        },
      });
      emit("tw5-booted");
    }

    // Sovereignty gate — vessel does not emit "live" until admin island declares ea.
    await admin.workerEa;
  }

  // ── 13. Presence — broadcast operator DID on wiki doc ────────────────────
  // BV-4: ephemeral; does not travel via CRDT.
  wikiHandle.broadcast({ did: operatorDid, ts: Date.now() });

  emit("live");

  return {
    vessel,
    pool,
    repo,
    store:            composite,
    admin,
    wikiDocUrl:       wikiHandle.url,
    catalogHandleUrl: catalogHandle.url,
    larariumDocUrl:   islandHandle?.url ?? null,
    phase:            "live",
    engineUpdated,
  };
}
