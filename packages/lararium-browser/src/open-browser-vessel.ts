/**
 * openBrowserVessel — local-first browser vessel factory.
 *
 * Browser analog of openNodeVessel. Platform deltas:
 *   - Repo uses IndexedDBStorageAdapter (main-thread catalog + social docs)
 *   - Keypair via WebCrypto (browser-operator-key.ts), not NodeFS
 *   - Bootstrap artifact stored in IDB, not genesis/social-bootstrap.json
 *   - Auto-init on first boot: runs runFoundingCeremony if no bootstrap in IDB
 *   - No genesis island (TW5 core bytes): reserved for @dreamdeck/app sprint
 *   - No WebSocketServer: browser vessel syncs via island MessageChannel + BroadcastChannel
 *   - broadcast() presence call on wikiHandle after gates pass
 *
 * Boot sequence:
 *   "boot" → "repo-open" → "catalog-ready" → "wiki-ready" →
 *   "vessel-ready" → "live"
 *
 * S9 S4 scope: keypair + founding ceremony + gates B/C + broadcast().
 * Genesis island + TW5 boot = @dreamdeck/app sprint.
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
  CATALOG_DOC_URI,
  IDENTITIES_DOC_URI, CIRCLES_DOC_URI, SESSIONS_DOC_URI, ADMIN_BAG_ID,
  PERSON_GROUP_DOC_ID_TIDDLER, PERSON_GROUP_AGENT_ID_TIDDLER, MESH_CABAL_DOC_ID_TIDDLER,
  BAG_IDS,
  wikiLarUri,
  type LarDoc, type LarariumVesselOptions, type LarariumVesselResult,
}                                            from "@lararium/mesh";
import {
  MemoryTiddlerStore,
  planActiveWikiSlot, selectActiveWikiSlug, ACTIVE_WIKI_URI,
}                                            from "@lararium/tw5";
import {
  KeyhiveProvider, AdminEventStore, InMemoryEventStore,
  runFoundingCeremony,
}                                            from "@lararium/keyhive";
import type { LarOpenPhase }                 from "@lararium/mesh";
import {
  generateOrLoadBrowserKeypair, loadBrowserSigningSeed,
  openVesselIdb, idbGet, idbPut,
}                                            from "./browser-operator-key.js";
import { BrowserVesselIslandPool }           from "./browser-vessel-island-pool.js";

// ── Bootstrap artifact ────────────────────────────────────────────────────────

const BOOTSTRAP_KEY = "social-bootstrap";

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
  idbName?:     string;
  /** Operator display name for identity tiddler (first-boot only). */
  displayName?: string;
}

export interface BrowserVesselResult extends LarariumVesselResult<
  LarVessel<BrowserVesselIslandPool>,
  BrowserVesselIslandPool,
  Repo,
  CompositeStore
> {
  keyhive:   KeyhiveProvider;
  wikiDocUrl: string;
}

// ── waitHandleLocal (browser) ─────────────────────────────────────────────────

async function waitHandleLocal<T>(
  repo:    Repo,
  url:     string,
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
  const { hostId, wikiId, idbName = "lares:vessel", displayName, onPhase } = opts;
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
  const idb          = await openVesselIdb(idbName);
  let bootstrap      = await idbGet<BrowserBootstrap>(idb, "bootstrap", BOOTSTRAP_KEY);

  if (!bootstrap) {
    // First boot: run founding ceremony. Seeds social docs into Repo, writes Keyhive
    // sentinel oracle tiddlers, returns doc URLs + sentinel IDs.
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
    await idbPut(idb, "bootstrap", BOOTSTRAP_KEY, bootstrap);
  }
  idb.close();

  // ── 4. Catalog doc ────────────────────────────────────────────────────────
  const blankCatalog = (): DocHandle<LarDoc> => {
    const h = repo.create<LarDoc>(emptyLarDoc());
    h.change((doc) => {
      doc.tiddlers[CATALOG_DOC_URI] = mutableLarRecord(CATALOG_DOC_URI, { text: h.url }, "browser-boot");
    });
    return h;
  };

  // Read catalog URL from IDB bootstrap if available; otherwise create fresh.
  const idb2 = await openVesselIdb(idbName);
  const catalogUrl = await idbGet<string>(idb2, "keystore", "catalog-url");
  idb2.close();

  let catalogHandle: DocHandle<LarDoc>;
  if (catalogUrl) {
    catalogHandle = await waitHandleLocal<LarDoc>(repo, catalogUrl, blankCatalog);
  } else {
    catalogHandle = blankCatalog();
    const idb3 = await openVesselIdb(idbName);
    await idbPut(idb3, "keystore", "catalog-url", catalogHandle.url);
    idb3.close();
  }
  emit("catalog-ready");

  // ── 5. Social docs ────────────────────────────────────────────────────────
  const blankDoc = () => repo.create<LarDoc>(emptyLarDoc());

  const identitiesHandle = await waitHandleLocal<LarDoc>(repo, bootstrap.identitiesUrl, blankDoc);
  const circlesHandle    = await waitHandleLocal<LarDoc>(repo, bootstrap.circlesUrl,    blankDoc);
  const sessionsHandle   = await waitHandleLocal<LarDoc>(repo, bootstrap.sessionsUrl,   blankDoc);
  const adminHandle      = await waitHandleLocal<LarDoc>(repo, bootstrap.adminUrl,      blankDoc);

  // ── 6. Capability layer ───────────────────────────────────────────────────
  // Wire operator seed + admin event store into Keyhive.
  // Re-hydrate from cap events persisted in admin doc on prior boots.
  const composite = new CompositeStore();
  composite.addLayer({ bagId: BAG_IDS.catalog,    store: new AutomergeDocStore(catalogHandle,    BAG_IDS.catalog),    writable: false });
  composite.addLayer({ bagId: BAG_IDS.identities, store: new AutomergeDocStore(identitiesHandle, BAG_IDS.identities), writable: true  });
  composite.addLayer({ bagId: BAG_IDS.groups,     store: new AutomergeDocStore(circlesHandle,    BAG_IDS.groups),     writable: true  });
  composite.addLayer({ bagId: BAG_IDS.sessions,   store: new AutomergeDocStore(sessionsHandle,   BAG_IDS.sessions),   writable: true  });
  composite.addLayer({ bagId: ADMIN_BAG_ID,       store: new AutomergeDocStore(adminHandle,      ADMIN_BAG_ID),       writable: true  });

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

  // ── 7. Wiki doc ───────────────────────────────────────────────────────────
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
  composite.addLayer({ bagId: BAG_IDS.scratch,    store: new MemoryTiddlerStore(), writable: true, defaultWritable: true  });
  composite.addLayer({ bagId: BAG_IDS.projection, store: new MemoryTiddlerStore(), writable: true, defaultWritable: false });

  emit("wiki-ready");

  // Register writable bags with Keyhive so cap checks resolve.
  await keyhive.registerBag(ADMIN_BAG_ID);
  await keyhive.registerBag(BAG_IDS.identities);
  await keyhive.registerBag(BAG_IDS.groups);
  await keyhive.registerBag(BAG_IDS.sessions);
  await keyhive.registerBag(activeWikiPlan.wikiBagId);

  // ── 8. LarVessel ─────────────────────────────────────────────────────────
  const identity = new OpenIdentitySlot(`${hostId}:${activeWikiId}`);
  const vessel   = new LarVessel<BrowserVesselIslandPool>({
    vesselId:     activeWikiPlan.vesselId,
    store:        composite,
    capabilities: LAR_VESSEL_CAPABILITIES_BROWSER,
    identity,
  });
  emit("vessel-ready");

  // ── 9. Island pool ────────────────────────────────────────────────────────
  // No genesis island for S4 (TW5 core bytes deferred to dreamdeck-app sprint).
  // The pool stands ready; islands boot once a genesis artifact is available.
  // Callers that need TW5 wiki islands pass a coreHash + @lararium bag binding.
  const pool = new BrowserVesselIslandPool({
    mainRepo: repo,
    onWorkerEvent: () => { /* event bus integration deferred */ },
  });
  vessel.attachVmPool(pool);

  // ── 10. Presence — broadcast operator DID on wiki doc ────────────────────
  // BV-4: presence data is ephemeral and does not travel via CRDT.
  // docHandle.broadcast() fans out to every Repo peer subscribed to this doc.
  // At S4 (no network adapter), this is a no-op beyond the Repo event loop —
  // the call path proves the API is wired and ready for when network adapters arrive.
  wikiHandle.broadcast({ did: keyhiveDid, ts: Date.now() });

  emit("live");

  return {
    vessel,
    pool,
    repo,
    store:            composite,
    keyhive,
    wikiDocUrl:       wikiHandle.url,
    catalogHandleUrl: catalogHandle.url,
    larariumDocUrl:   null,
    phase:            "live",
  };
}
