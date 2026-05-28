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
  CATALOG_DOC_URI, LARARIUM_DOC_URI, LARES_DOC_URI,
  IDENTITIES_DOC_URI, CIRCLES_DOC_URI, SESSIONS_DOC_URI, ADMIN_BAG_ID,
  PERSON_GROUP_DOC_ID_TIDDLER, PERSON_GROUP_AGENT_ID_TIDDLER, MESH_CABAL_DOC_ID_TIDDLER,
  ENGINE_CORE_ID,
  BAG_IDS,
  wikiLarUri,
  type LarDoc, type LarariumVesselOptions, type LarariumVesselResult,
}                                            from "@lararium/mesh";
import {
  MemoryTiddlerStore,
  planActiveWikiSlot, selectActiveWikiSlug, ACTIVE_WIKI_URI,
}                                            from "@lararium/tw5";
import {
  KeyhiveProvider, AdminEventStore,
  runFoundingCeremony,
}                                            from "@lararium/keyhive";
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
  openBrowserAdminVm,
  type BrowserAdminVmResult, type BrowserVerbTable,
}                                            from "./open-browser-admin-vm.js";

// ── Bootstrap artifact ────────────────────────────────────────────────────────

const BOOTSTRAP_KEY    = "social-bootstrap";
const ISLAND_URL_KEY   = "island-doc-url";

interface BrowserBootstrap {
  identitiesUrl:         string;
  circlesUrl:            string;
  sessionsUrl:           string;
  adminUrl:              string;
  personGroupDocIdHex:   string;
  personGroupAgentIdHex: string;
  meshCabalDocIdHex:     string;
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
  verbTable?:      BrowserVerbTable;
}

export interface BrowserVesselResult extends LarariumVesselResult<
  LarVessel<BrowserVesselIslandPool>,
  BrowserVesselIslandPool,
  Repo,
  CompositeStore
> {
  keyhive:     KeyhiveProvider;
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
  const handle = await repo.find<T>(url as AutomergeUrl);
  try {
    await handle.whenReady(["ready", "unavailable"]);
  } catch {
    return fallback();
  }
  if (handle.state === "unavailable") return fallback();
  return handle;
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

  // ── 3. Bootstrap — auto-init on first boot ────────────────────────────────
  const idb     = await openVesselIdb(idbName);
  let bootstrap = await idbGet<BrowserBootstrap>(idb, "bootstrap", BOOTSTRAP_KEY);
  idb.close();

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
    const idb2 = await openVesselIdb(idbName);
    await idbPut(idb2, "bootstrap", BOOTSTRAP_KEY, bootstrap);
    idb2.close();
  }

  // ── 4. Catalog doc ────────────────────────────────────────────────────────
  const blankCatalog = (): DocHandle<LarDoc> => {
    const h = repo.create<LarDoc>(emptyLarDoc());
    h.change((doc) => {
      doc.tiddlers[CATALOG_DOC_URI] = mutableLarRecord(CATALOG_DOC_URI, { text: h.url }, "browser-boot");
    });
    return h;
  };

  const idb3       = await openVesselIdb(idbName);
  const catalogUrl = await idbGet<string>(idb3, "keystore", "catalog-url");
  idb3.close();

  let catalogHandle: DocHandle<LarDoc>;
  if (catalogUrl) {
    catalogHandle = await waitHandleLocal<LarDoc>(repo, catalogUrl, blankCatalog);
  } else {
    catalogHandle = blankCatalog();
    const idb4 = await openVesselIdb(idbName);
    await idbPut(idb4, "keystore", "catalog-url", catalogHandle.url);
    idb4.close();
  }
  emit("catalog-ready");

  // ── 5. Social docs ────────────────────────────────────────────────────────
  const blankDoc = () => repo.create<LarDoc>(emptyLarDoc());

  const identitiesHandle = await waitHandleLocal<LarDoc>(repo, bootstrap.identitiesUrl, blankDoc);
  const circlesHandle    = await waitHandleLocal<LarDoc>(repo, bootstrap.circlesUrl,    blankDoc);
  const sessionsHandle   = await waitHandleLocal<LarDoc>(repo, bootstrap.sessionsUrl,   blankDoc);
  const adminHandle      = await waitHandleLocal<LarDoc>(repo, bootstrap.adminUrl,      blankDoc);

  // ── 6. CompositeStore ─────────────────────────────────────────────────────
  const composite = new CompositeStore();
  composite.addLayer({ bagId: BAG_IDS.catalog,    store: new AutomergeDocStore(catalogHandle,    BAG_IDS.catalog),    writable: false });
  composite.addLayer({ bagId: BAG_IDS.identities, store: new AutomergeDocStore(identitiesHandle, BAG_IDS.identities), writable: true  });
  composite.addLayer({ bagId: BAG_IDS.groups,     store: new AutomergeDocStore(circlesHandle,    BAG_IDS.groups),     writable: true  });
  composite.addLayer({ bagId: BAG_IDS.sessions,   store: new AutomergeDocStore(sessionsHandle,   BAG_IDS.sessions),   writable: true  });
  composite.addLayer({ bagId: ADMIN_BAG_ID,       store: new AutomergeDocStore(adminHandle,      ADMIN_BAG_ID),       writable: true  });

  // ── 7. Genesis island (optional — Tier 1/2 paths) ─────────────────────────
  let islandHandle:    DocHandle<LarDoc> | null = null;
  let coreHash:        string | null = null;
  let engineUpdated  = false;

  // Resolve stored island URL from IDB keystore (Tier 2 fast path).
  const idb5          = await openVesselIdb(idbName);
  const storedIslandUrl = await idbGet<string>(idb5, "keystore", ISLAND_URL_KEY);
  idb5.close();

  if (genesisBytes) {
    // Tier 1 (bytes path): import bytes → Repo → IDB.
    const incomingHandle = await loadGenesisIslandFromBytes(repo, genesisBytes);

    if (storedIslandUrl) {
      // Resume: load live handle, reconcile if CID drifted (engine update).
      const liveHandle = await findGenesisIsland(repo, storedIslandUrl);
      if (liveHandle) {
        const reconcile = await reconcileGenesisUpdate(liveHandle, incomingHandle, genesisBytes);
        engineUpdated = reconcile.updated;
        islandHandle  = liveHandle;
      } else {
        islandHandle = incomingHandle;
      }
    } else {
      // Cold boot: incoming IS the island; persist URL.
      islandHandle = incomingHandle;
      const idb6   = await openVesselIdb(idbName);
      await idbPut(idb6, "keystore", ISLAND_URL_KEY, islandHandle.url);
      idb6.close();
      // Tier 3: write to OPFS for Worker direct access.
      await writeGenesisBytesToOpfs(genesisBytes);
    }
  } else if (storedIslandUrl) {
    // Tier 2: no bytes this boot — load from IDB via Automerge URL.
    islandHandle = await findGenesisIsland(repo, storedIslandUrl);
  } else if (admitIslandDocUrl) {
    // Tier 1 (peer-sync path): caller connected Repo to peer; sync island doc.
    islandHandle = await findGenesisIsland(repo, admitIslandDocUrl);
    if (islandHandle) {
      const idb7 = await openVesselIdb(idbName);
      await idbPut(idb7, "keystore", ISLAND_URL_KEY, islandHandle.url);
      idb7.close();
    }
  }

  if (islandHandle) {
    const doc = islandHandle.doc();
    coreHash  = doc?.blobs?.[ENGINE_CORE_ID]?.sha256 ?? null;

    composite.addLayer({
      bagId:           BAG_IDS.lararium,
      store:           new AutomergeDocStore(islandHandle, BAG_IDS.lararium),
      writable:        true,
      defaultWritable: false,
    });

    // @lares layer — oracle tiddler in island doc.
    const laresDocUrl = tiddlerText(doc?.tiddlers?.[LARES_DOC_URI]) ?? null;
    if (laresDocUrl) {
      const laresHandle = await waitHandleLocal<LarDoc>(repo, laresDocUrl, blankDoc);
      composite.addLayer({
        bagId:           BAG_IDS.lares,
        store:           new AutomergeDocStore(laresHandle, BAG_IDS.lares),
        writable:        true,
        defaultWritable: false,
      });
    }

    // Write island URL oracle into catalog so island-ready state persists.
    const existingIslandRef = tiddlerText(catalogHandle.doc()?.tiddlers?.[LARARIUM_DOC_URI]) ?? null;
    if (existingIslandRef !== islandHandle.url) {
      catalogHandle.change((doc) => {
        doc.tiddlers[LARARIUM_DOC_URI] = mutableLarRecord(LARARIUM_DOC_URI, { text: islandHandle!.url }, "browser-boot");
      });
    }

    emit("island-ready");
  }

  // ── 8. Capability layer ───────────────────────────────────────────────────
  const keyhiveEventStore = new AdminEventStore({ admin: composite });
  const keyhive           = new KeyhiveProvider();
  await keyhive.init({ seed: operatorSeed, eventStore: keyhiveEventStore });

  const { ingested } = await keyhive.hydrateFromEventStore();
  if (ingested > 0) {
    console.log(`[browser-vessel] keyhive: hydrated ${ingested} cap events`);
  }

  const keyhiveDid = await keyhive.whoami();

  // Gate A: Keyhive DID MUST end with the operator verifying key.
  if (!keyhiveDid.endsWith(operatorIdentity.verifyingKey)) {
    throw new Error(
      `[browser-vessel] Gate A: Keyhive DID does not match persisted verifying key. ` +
      `whoami=${keyhiveDid.slice(0, 18)}… verifyingKey=${operatorIdentity.verifyingKey.slice(0, 16)}…`,
    );
  }

  // Gate B: vessel Individual MUST belong to PersonGroup sentinel.
  const gateB = await keyhive.verifySentinelMembership(keyhiveDid, bootstrap.personGroupDocIdHex);
  if (!gateB.ok) {
    throw new Error(
      `[browser-vessel] Gate B: vessel lacks PersonGroup membership. ${gateB.reason ?? ""}`,
    );
  }

  // Gate C: PersonGroup MUST belong to MeshCabal sentinel.
  const gateC = await keyhive.verifySentinelMembership(
    bootstrap.personGroupAgentIdHex,
    bootstrap.meshCabalDocIdHex,
  );
  if (!gateC.ok) {
    throw new Error(
      `[browser-vessel] Gate C: PersonGroup lacks MeshCabal membership. ${gateC.reason ?? ""}`,
    );
  }

  console.log("[browser-vessel] Gate B ✓  Gate C ✓ — vessel sovereign");

  // ── 9. Wiki doc ───────────────────────────────────────────────────────────
  const { slug: activeWikiId } = selectActiveWikiSlug(wikiId, undefined);
  const activeWikiPlan         = planActiveWikiSlot({ hostId, wikiSlug: activeWikiId, identityDid: keyhiveDid });

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

  composite.addLayer({ bagId: BAG_IDS.scratch,    store: new MemoryTiddlerStore(), writable: true, defaultWritable: true  });
  composite.addLayer({ bagId: BAG_IDS.projection, store: new MemoryTiddlerStore(), writable: true, defaultWritable: false });

  emit("wiki-ready");

  // Register writable bags with Keyhive so cap checks resolve.
  await keyhive.registerBag(ADMIN_BAG_ID);
  await keyhive.registerBag(BAG_IDS.identities);
  await keyhive.registerBag(BAG_IDS.groups);
  await keyhive.registerBag(BAG_IDS.sessions);
  await keyhive.registerBag(activeWikiPlan.wikiBagId);
  await keyhive.registerBag(activeWikiPlan.draftBagId);

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
    onWorkerEvent: () => { /* event bus integration deferred to event-bus sprint */ },
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
      bagBindings: [
        { bagId: BAG_IDS.lararium, writable: false, mode: "relational", docUrl: islandHandle.url },
        { bagId: ADMIN_BAG_ID,     writable: true,  mode: "relational", docUrl: bootstrap.adminUrl },
      ],
    });

    // Wire verb registry — minimal browser surface (echo + verbs from caller).
    const registry: BrowserVerbTable = new Map(verbTable ?? []);
    if (!registry.has("echo")) {
      registry.set("echo", async (args) => ({ echoed: args }));
    }
    admin.mountMainVerbs(registry);

    if (workerScriptUrl) {
      await pool.mountWiki(activeWikiId, {
        coreHash,
        recipeUri: wikiLarUri(activeWikiId),
        bagBindings: [
          { bagId: BAG_IDS.lararium, writable: false, mode: "relational", docUrl: islandHandle.url },
          { bagId: wikiBagId,        writable: true,  mode: "relational", docUrl: wikiHandle.url  },
        ],
      });
      emit("tw5-booted");
    }

    // Sovereignty gate — vessel does not emit "live" until admin island declares ea.
    await admin.workerEa;
  }

  // ── 13. Presence — broadcast operator DID on wiki doc ────────────────────
  // BV-4: ephemeral; does not travel via CRDT.
  wikiHandle.broadcast({ did: keyhiveDid, ts: Date.now() });

  emit("live");

  return {
    vessel,
    pool,
    repo,
    store:            composite,
    keyhive,
    admin,
    wikiDocUrl:       wikiHandle.url,
    catalogHandleUrl: catalogHandle.url,
    larariumDocUrl:   islandHandle?.url ?? null,
    phase:            "live",
    engineUpdated,
  };
}
