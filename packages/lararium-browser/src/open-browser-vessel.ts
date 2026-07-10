/**
 * openBrowserVessel — local-first browser vessel factory.
 *
 * A thin RECIPE over `openVesselCore` (the one keel, both substrates) — the BROWSER
 * carries the SAME capabilities as node; only the SUBSTRATE differs. The browser must NOT
 * drift thin via easy-path shortcuts (coreless boot, no residency manager, no corpus, a
 * LarVessel wrapper) — it holds the full keel. Genuine browser
 * substrate (the ONLY divergence): IndexedDB storage, WebCrypto keys, founding-via-ceremony
 * (vs node's lares-init), Web Worker spawn, NO WS-server inbound gate (a browser cannot
 * listen on a socket), genesis-via-bytes/IDB/OPFS/peer. Capabilities held in common: the
 * BagResidencyManager mechanism, corpus loading, the verb plane, presence.
 *
 * Genesis REQUIRED (no coreless boot). The not-yet-held axis sits at anon↔keeper
 * (PersonaGroup/admin), not genesis — see project-sovereign-worker-model.
 */

import { Repo }                              from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter }           from "@automerge/automerge-repo-storage-indexeddb";
import type { DocHandle, AutomergeUrl }      from "@automerge/automerge-repo";
import {
  emptyLarDoc, mutableLarRecord,
  CATALOG_DOC_URI, DAEMON_BAG_ID,
  ENGINE_CORE_ID, pluginCidsFromIslandBlobs,
  ed25519SignerFromSeed, LarWSClientAdapter, type LeafIdentity,
  BAG_IDS, slugFromUri, BagResidencyManager, recipeHostFacets,
  meshPalaceCap, carriageCap, meshSelfSeed, deriveMeshLeaf,
  materializeGenesisIsland,
  type LarDoc, type LarariumVesselOptions, type VesselResult,
  type VesselBootstrap, type VesselCoreAssembly, type DeviceDelegationTiddler,
  type GenesisCasManifest, type GenesisSeed,
}                                            from "@lararium/mesh";
import {
  MemoryTiddlerStore,
  selectActiveWikiSlug,
  loadCatalogCorpora, seedVesselDefaults,
  makeResidencyStatsReactor,
  PROJECTION_FRAME,
  COHERENCE_FRAME,
  SENSORIUM_FRAME,
  createWikiSenseSupervisor, registerWikiSenseVerbs,
}                                            from "@lararium/tw5";
import type { WikiSenseSupervisor }          from "@lararium/tw5";
import type { CoherenceStatus } from "@lararium/tw5";
import type { CoherenceFrameWithRev } from "./wiki-coherence-sink.js";
import { composeBrowser }                    from "./browser-caps.js";
import type { VesselWikiSlot, VesselCoreResult, DaemonVmCore } from "@lararium/tw5";
import { runFoundingCeremony }               from "@lararium/keyhive";
import type { LarOpenPhase }                 from "@lararium/mesh";
import {
  generateOrLoadBrowserVesselIdentity, loadBrowserSigningSeed,
  openVesselIdb, idbGet, idbPut,
}                                            from "./browser-vessel-identity.js";
import { BrowserVesselIslandPool }           from "./browser-vessel-island-pool.js";
import {
  fetchGenesisCasToOpfs,
}                                            from "./browser-genesis.js";
import {
  openBrowserDaemonVm,
}                                            from "./open-browser-daemon-vm.js";
import type { WikiRecipe }                   from "@lararium/mesh";

// ── Bootstrap artifact (IDB-persisted) ──────────────────────────────────────────

const BOOTSTRAP_KEY  = "social-bootstrap";

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

// The @oracle no longer needs an IDB rendezvous key: it lives under the DETERMINISTIC
// doc id (oracleGenesisDocUrl), so a reboot RELOADS it by find-first from IndexedDB and
// a peer SYNCS the same address — no stored island-doc-url, mirroring the node path.
interface BootKeyReads {
  bootstrap:       BrowserBootstrap | undefined;
  catalogUrl:      string | undefined;
}

async function readBootKeys(idbName: string): Promise<BootKeyReads> {
  const idb = await openVesselIdb(idbName);
  try {
    const [bootstrap, catalogUrl] = await Promise.all([
      idbGet<BrowserBootstrap>(idb, "bootstrap", BOOTSTRAP_KEY),
      idbGet<string>(idb, "keystore", "catalog-url"),
    ]);
    return { bootstrap, catalogUrl };
  } finally {
    idb.close();
  }
}

interface BootKeyWrites { bootstrap?: BrowserBootstrap; catalogUrl?: string }

async function writeBootKeys(idbName: string, writes: BootKeyWrites): Promise<void> {
  if (!writes.bootstrap && !writes.catalogUrl) return;
  const idb = await openVesselIdb(idbName);
  try {
    await Promise.all([
      ...(writes.bootstrap  ? [idbPut(idb, "bootstrap", BOOTSTRAP_KEY,  writes.bootstrap)]  : []),
      ...(writes.catalogUrl ? [idbPut(idb, "keystore",  "catalog-url",  writes.catalogUrl)] : []),
    ]);
  } finally {
    idb.close();
  }
}

// ── Options / Result ────────────────────────────────────────────────────────────

export interface BrowserVesselOptions extends LarariumVesselOptions {
  idbName?:        string;
  displayName?:    string;
  /**
   * The PLAIN-DATA genesis seed (island.genesis.json) — the @oracle's initial state the
   * boot MATERIALIZES fresh under the deterministic doc id (the node-parity materialize-fresh
   * path; the retired island.bin binary import is gone). REQUIRED on first boot; a reboot
   * reloads the persisted @oracle by find-first, a peer syncs it — neither needs the seed.
   */
  genesisSeed?:    GenesisSeed;
  /** Genesis CAS manifest (island.manifest.json) — names the engine + plugin blob files. With
   *  genesisCasBaseUrl, first boot fetches genesis/cas/<cid> over HTTP into the OPFS CAS. */
  genesisCasManifest?:  GenesisCasManifest;
  /** Base URL the genesis static host serves (manifest + cas/ live under it). */
  genesisCasBaseUrl?:   string;
  /** Relay gate URL (ws://host:port/ws) to dial for the node↔browser spore crossing. When set (and
   *  a founding card is cached), the vessel composes the V3 leaf transport (LarWSClientAdapter) and
   *  adds it to the Repo — the browser's outbound crossing. */
  relayUrl?:       string;
  /**
   * The relay gate's verifying-key hex — the gate-binding the V3 proof commits to (anti-relay;
   * known OUT-OF-BAND, NEVER trusted from the wire). For a cross-operator crossing this is the
   * NODE daemon's gate key (so the proof clears against the node's own key). Absent → defaults to
   * this vessel's own operatorDid (the same-operator leaf, the prior behavior — back-compat).
   */
  relayGatePubKey?: string;
  /** URL of the compiled browser daemon island Worker script. */
  daemonWorkerUrl?: URL;
  /** URL of the compiled browser wiki Worker script. */
  workerScriptUrl?: URL;
  /** Projection-nalu sink: a `projection:frame` (rendered HTML+CSS) from the hot wiki island.
   *  The app applies it to a shadow root — the live wiki made visible. */
  onProjection?:   (frame: { html: string; css: string; rev: number }) => void;
  /** Coherence-nalu sink: a `coherence:frame` (the wiki's own consistency-radius read as an indicator
   *  frame) from the hot wiki island. The app applies it to a DOM coherence indicator via
   *  {@link mountCoherenceIndicator} — the sensorium's self-reading made visible over the tiddler-view. */
  onCoherence?:    (frame: CoherenceFrameWithRev) => void;
  /**
   * Mesh-LEAF standing — the browser carries-in the FLOW-map as a LEAF: it navigates
   * the mesh (pulls peers' public @meshpalace + re-ranks by l-space proximity) WITHOUT serving or
   * dialing. A browser holds no listening socket, so a leaf advertises NO endpoint and seeds no
   * self-dial (`deriveMeshLeaf` → no endpoint; `meshSelfSeed` → []). The mirror of the node's `meshSelf`,
   * the leaf tier. ABSENT → the browser composes NO carriage (exactly today's behavior). PRESENT → it
   * carries-in via the read-face fetch (isomorphic global `fetch`; the peers' read-faces serve CORS `*`).
   */
  meshLeaf?: {
    /** A stable self-identifier (the vessel's origin / relay URL) hashed to the leaf's chart coord +
     *  bearing — content-blind, names where this leaf sits on the routing chart. */
    coordSeed: string;
    /** Bootstrap peer read-face base URLs (`https://…`) the leaf carries-in from; the carriage UNIONs
     *  these with the dials it discovers off the carried FLOW-map (self-peering). */
    peers:     readonly string[];
    /** Optional radial standing override (default 1 — a rim leaf). */
    radius?:   number;
    /** Max peer read-faces pulled per carriage cycle (default 16). */
    maxFanout?: number;
  };
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

export async function openBrowserVessel(opts: BrowserVesselOptions): Promise<BrowserVesselResult> {
  const {
    hostId, wikiId,
    idbName = "lares:vessel", displayName, onPhase,
    genesisSeed,
    genesisCasManifest, genesisCasBaseUrl,
    daemonWorkerUrl, workerScriptUrl, onProjection, onCoherence, relayUrl, relayGatePubKey,
    meshLeaf,
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
      identitiesUrl: f.identitiesUrl, circlesUrl: f.circlesUrl, sessionsUrl: f.sessionsUrl, daemonUrl: f.daemonUrl, personaUrl: f.personaUrl,
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
  // NOTE: the gate admits a peer holding cap=admin on the node's @daemon, OR (Seam B) one the
  // operator device-admitted that carries a valid device-delegation edge pinned to the node's
  // hearth root. The leaf rides its own device edge (social.deviceEdge) so the in-worker keyholder
  // can admit it at the operator's-own-device tier. gatePubKey is PROVISIONED out-of-band: for a
  // cross-operator crossing pass the NODE's gate key (relayGatePubKey); absent → own DID (the
  // same-operator leaf, prior behavior). An un-admitted anon dials + fails closed.
  if (relayUrl && social.contactCard) {
    const leaf: LeafIdentity = {
      contactCard: social.contactCard,
      peerPubKey:  operatorDid,
      sign:        ed25519SignerFromSeed(operatorSeed),
      ...(social.deviceEdge ? { edge: social.deviceEdge } : {}),
    };
    const relayAdapter = new LarWSClientAdapter({
      url: relayUrl, identity: leaf, aud: DAEMON_BAG_ID, gatePubKey: relayGatePubKey ?? operatorDid,
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
  let wikiSense!:  WikiSenseSupervisor;   // set in wireVerbs (post-daemon)
  let slotActiveWikiId = "";
  // The materialize-fresh path RELOADS a persisted @oracle intact (find-first) or
  // materializes it fresh — never the old merge-into-stale reconcile. No engine
  // CID-diverge merge happens at boot, so this stays false (kept for API parity).
  const engineUpdated = false;
  const residency = new BagResidencyManager({
    hotCap: 32, idleMs: 300_000, sweepIntervalMs: 30_000,
    onEvict: async (bagId) => { await vmManager.unmountWiki(bagId); },
  });

  // ── The mesh carriage as a LEAF ───────────────────────────────
  // PRESENT → derive the leaf standing and compose the carriage ALONGSIDE the wiki core: meshpalace
  // (a writable @meshpalace FLOW-map, seeded with NO self-dial — `meshSelfSeed([leaf])` is [] for a
  // leaf) + carriage (pulls peers' public read-faces, re-ranks by l-space proximity). A LEAF has no
  // endpoint → it carries-in but is NOT dial-able (a browser holds no listening socket). ABSENT → [],
  // the browser composes no carriage (today's behavior, unchanged). The mirror of openNodeVessel.
  const meshExtraCaps = meshLeaf ? (() => {
    const leaf = deriveMeshLeaf(
      meshLeaf.coordSeed, meshLeaf.peers,
      ...(meshLeaf.radius !== undefined ? [{ radius: meshLeaf.radius }] : []),
    );
    return [
      meshPalaceCap({
        repo, residency,
        selfCoord: leaf.coord,
        seed: meshSelfSeed(leaf),   // [] for a leaf — carries-in, advertises no self-dial
      }),
      carriageCap({
        peers: leaf.peers, selfBearing: leaf.bearing,
        // no selfEndpoint — a leaf is not dial-able (the endpoint-absent leaf↔full tier)
        selfCoord: leaf.coord,
        ...(meshLeaf.maxFanout !== undefined ? { maxFanout: meshLeaf.maxFanout } : {}),
        nodeSeedHex: operatorDid,   // the per-vessel cadence seed (browser-safe hex string, no Buffer)
        onLog: (l) => console.log(`[lararium-browser] ${l}`),
      }),
    ];
  })() : [];

  const result = await composeBrowser<BrowserVesselIslandPool>({
    keel: {
      repo,
      catalogHandle,
      waitHandle: <T>(url: AutomergeUrl, fallback: () => DocHandle<T>) => waitHandleLocal<T>(repo, url, fallback),

      // Genesis REQUIRED — the node-parity materialize-fresh path. The @oracle is a LIVE
      // CRDT under the DETERMINISTIC doc id (oracleGenesisDocUrl): materializeGenesisIsland
      // does find-FIRST (a prior boot persisted it to IndexedDB → reload intact; a peer
      // synced it → adopt) ELSE materializes it fresh from the plain-data seed and imports
      // it under that id. No island.bin binary import, no merge-into-stale reconcile. One
      // call, isomorphic with the node loadOrMaterializeOracle.
      loadGenesis: async () => {
        await writeBootKeys(idbName, bootKeyWrites);
        if (!genesisSeed) {
          throw new Error(
            "[openBrowserVessel] genesis seed REQUIRED — pass genesisSeed (island.genesis.json); " +
            "a reboot reloads the persisted @oracle by find-first, but first boot needs the seed",
          );
        }
        const islandHandle = await materializeGenesisIsland(repo, genesisSeed, "browser-genesis");
        const coreHash = islandHandle.doc()?.blobs?.[ENGINE_CORE_ID]?.sha256 ?? null;
        if (!coreHash) throw new Error("[openBrowserVessel] genesis island missing ENGINE_CORE_ID blob metadata");
        // Populate the OPFS CAS — the worker pulls engine + plugin bytes by CID from here
        // (the breath path), never CRDT-syncing the bytes over the port. The genesis CRDT now
        // carries METADATA only; the bytes ship as genesis/cas/<cid> files. Fetch them over HTTP
        // by manifest (the browser face of the node mirrorGenesisCasFs). Once in OPFS they
        // persist (write-once-read-many), so later/replica boots need no manifest.
        if (genesisCasManifest && genesisCasBaseUrl) {
          await fetchGenesisCasToOpfs(genesisCasManifest, genesisCasBaseUrl);
        }
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
      const facets = recipeHostFacets(slugFromUri(sel.slug), operatorDid);
      return {
        activeWikiId: sel.slug, wikiSlug: facets.wikiSlug,
        wikiKey: facets.wikiKey, wikiBagId: facets.wikiBagId,
        draftOracleTitle: facets.draftOracleTitle, draftBagId: facets.draftBagId,
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
        repo, daemonUrl: social.daemonUrl, personaUrl: social.personaUrl, coreHash: assembly.coreHash,
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
      // wiki-sense (the supervision reads) — the daemon's supervision READ-verbs over the islands this vessel's pool
      // actually holds. The seams ARE the supervision grant: designation resolves through the pool
      // alone (confused-deputy ward — a name outside the pool fails loud at both ends), and the
      // proof-hold writes into the daemon's OWN @daemon layer (local, self-sovereign). The daemon
      // worker reaches these verbs over its existing delegate loop.
      wikiSense = createWikiSenseSupervisor(
        {
          supervises: (island) => vmManager.has(island),
          sendSignal: (island, msg) => vmManager.placeSensoriumSignal(island, msg),
        },
        { proofStore: daemon.composite, proofBag: DAEMON_BAG_ID },
      );
      registerWikiSenseVerbs(registry, wikiSense);
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
          // Coherence-nalu frame → the DOM coherence indicator. `obstructing` rode the wire as JSON
          // (the event payload admits only scalars); parse it back for the sink.
          if (msg.listenable === COHERENCE_FRAME) {
            let obstructing: string[] = [];
            try { obstructing = JSON.parse(String(msg.payload["obstructing"] ?? "[]")) as string[]; }
            catch { obstructing = []; }
            onCoherence?.({
              status:      String(msg.payload["status"] ?? "indeterminate") as CoherenceStatus,
              radius:      Number(msg.payload["radius"] ?? 0),
              glues:       Boolean(msg.payload["glues"]),
              vacuous:     Boolean(msg.payload["vacuous"]),
              obstructing,
              lociTotal:   Number(msg.payload["lociTotal"] ?? obstructing.length),
              label:       String(msg.payload["label"] ?? ""),
              rev:         Number(msg.payload["rev"] ?? 0),
            });
            return;
          }
          // Sensorium-nalu frame → the wiki-sense supervisor's return leg. The FRAME's island id
          // (the pool's wikiId, not any payload claim) pins the answer to the ask's designation.
          if (msg.listenable === SENSORIUM_FRAME) {
            wikiSense.acceptFrame(_id, msg.payload);
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
  }, meshExtraCaps);

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
