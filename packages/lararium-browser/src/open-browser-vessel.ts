/**
 * openBrowserVessel — local-first browser vessel factory.
 *
 * A thin RECIPE over the composable vessel keel — the BROWSER
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
  BAG_IDS, slugFromUri, laresVerbUriArg, bagStackFromRec, recipeUri, BagResidencyManager, recipeHostFacets, makeWikiActivationCap, type WikiActivationCap, type ResolveWikiSpec, wikiBagUri, tiddlerText,
  meshPalaceCap, carriageCap, meshSelfSeed, deriveMeshLeaf,
  materializeGenesisIsland,
  whoFaceCap, signHandleCard, materializeSharedLarDoc, crossroadsDocUrl, registerCrossroadsInOracle,
  type CapModule,
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
  buildWikiMountSpec,
}                                            from "@lararium/tw5";
import type { WikiSenseSupervisor }          from "@lararium/tw5";
import type { CoherenceStatus } from "@lararium/tw5";
import type { CoherenceFrameWithRev } from "./wiki-coherence-sink.js";
import { composeBrowser }                    from "./browser-caps.js";
import type { VesselWikiSlot, VesselCoreResult, DaemonVmCore } from "@lararium/tw5";
import { runFoundingCeremony, runApplyAdmitPayload } from "@lararium/keyhive";
import type { DeviceAdmitPayload } from "@lararium/keyhive";
import type { LarOpenPhase }                 from "@lararium/mesh";
import {
  generateOrLoadBrowserVesselIdentity, loadBrowserSigningSeed,
  openVesselIdb, idbGet, idbPut,
}                                            from "./browser-vessel-identity.js";
import { BrowserVesselIslandPool }           from "./browser-vessel-island-pool.js";

/** Browser advertises the MINIMAL grant (constrained vessel): a small live-wiki set
 *  (@daemon always + a couple more on reference) and ONE rotatable pin besides @daemon.
 *  The resolver honors this smaller grant — the same cap, a lower point on the spectrum. */
const BROWSER_WIKI_ACTIVATION_CAP = 2;
const BROWSER_WIKI_PIN_BUDGET     = 1;
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
  /**
   * A `device-admit/v1` payload — this vessel JOINS an existing PersonaGroup instead of FOUNDING its
   * own. The founder's root signed it, so it is self-verifying and CARRIAGE-AGNOSTIC: it may arrive by
   * QR, by paste, by a URL fragment (which never reaches a server), by a file on a stick. It is DATA,
   * never a fetch — a vessel that had to ASK a server for its own admission would be a client
   * petitioning an authority, and it would need that authority REACHABLE at the moment of asking, which
   * is a global now this house does not have.
   *
   * Absent, the vessel founds its own group (an anon at the floor) — which is a correct outcome, not a
   * failure. Present, `runApplyAdmitPayload` seeds this vessel's OWN sovereign social docs and adopts
   * the founder's `@persona` (membership crosses; @daemon stays sovereign-per-vessel).
   */
  admit?:           DeviceAdmitPayload;
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

/** The surface id the @daemon owns in the uniform pin-selector — distinct from any pool wiki slug. Pass it to
 *  `setActiveSurface` to summon the @daemon; pass a wiki slug to surface that wiki. It's all the same VM. */
export const DAEMON_SURFACE_ID = "@daemon";

/** The ONE shared VesselResult (no vessel-by-type) + browser's one substrate extra. */
export interface BrowserVesselResult extends VesselResult<BrowserVesselIslandPool, DaemonVmCore> {
  /** True when a genesis update was detected + merged on this boot (browser substrate). */
  engineUpdated: boolean;
  /** Relay a main-thread DOM event to the ACTIVE surface (interactivity RETURN leg) — routes to the @daemon or
   *  the pinned wiki by the live active-surface pointer. */
  sendDomEvent: (renderId: string, eventType: string, fields: Record<string, number | boolean>) => void;
  /** The uniform pin-selector: flip which VM owns the singleton #projection sink. DAEMON_SURFACE_ID summons the
   *  @daemon; a wiki slug surfaces that wiki. LIVE (synchronous gate flip); the durable @daemon/active-wiki
   *  marker persists fire-and-forget, consulted only at next cold boot ("live process state is the boundary"). */
  setActiveSurface: (surfaceId: string) => void;
}

async function waitHandleLocal<T>(repo: Repo, url: string, fallback: () => DocHandle<T>): Promise<DocHandle<T>> {
  try {
    // automerge-repo 2.6: find() resolves when ready and rejects on unavailable.
    return await repo.find<T>(url as AutomergeUrl);
  } catch {
    return fallback();
  }
}

/**
 * Load a PREVIOUSLY-FOUNDED @catalog by its persisted url — and never re-found it SILENTLY. A stored
 * catalogUrl means this vessel already founded + persisted a catalog; a find() rejection here means the
 * LOCAL copy is gone (IndexedDB quota eviction under storage pressure, or corruption). Re-founding a
 * BLANK catalog in that case is data-amnesia — every registered wiki/recipe vanishes from local view
 * with no trace. So we surface the loss LOUD (never a bare `catch`→blank) before recovering with a fresh
 * blank catalog, so the vessel still boots but the operator SEES the amnesia. (First boot — no stored
 * url — never reaches here; that founding is legitimate.)
 */
export async function loadFoundedCatalogOrWarn<T>(
  repo: Repo,
  url: string,
  refound: () => DocHandle<T>,
  onLoud: (msg: string) => void = (m) => console.error(m),
): Promise<DocHandle<T>> {
  try {
    return await repo.find<T>(url as AutomergeUrl);
  } catch (err) {
    onLoud(
      `[lararium-browser] DATA-AMNESIA: the persisted @catalog (${url}) FAILED to load — its local ` +
      `copy is gone (IndexedDB quota eviction or corruption). Founding a BLANK catalog so the vessel ` +
      `boots; previously-registered wikis/recipes are ABSENT locally until a peer re-sync restores ` +
      `them. This is NOT a silent discard — repair or re-admit before relying on local catalog state: ${String(err)}`,
    );
    return refound();
  }
}

/**
 * A browser wiki-alert had no live target and no durable mailbox — surface the drop LOUD. The browser
 * holds no park (unlike node), so an un-deliverable operator alert would otherwise vanish invisibly.
 * The console is the browser's observability floor: a warn keeps the drop legible.
 */
export function warnDroppedBrowserAlert(
  wikiSlug: string,
  message: string,
  cause: string | undefined,
  reason: string,
  onWarn: (msg: string) => void = (m) => console.warn(m),
): void {
  onWarn(
    `[lararium-browser] wiki-alert DROPPED (${reason}) for "${wikiSlug}" — no durable browser mailbox: ` +
    `${message}${cause ? ` (cause: ${cause})` : ""}`,
  );
}

export async function openBrowserVessel(opts: BrowserVesselOptions): Promise<BrowserVesselResult> {
  const {
    hostId, wikiId,
    idbName = "lares:vessel", displayName, onPhase,
    genesisSeed,
    genesisCasManifest, genesisCasBaseUrl,
    daemonWorkerUrl, workerScriptUrl, onProjection, onCoherence, relayUrl, relayGatePubKey,
    meshLeaf, admit,
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
  // AN ADMIT SUPERSEDES AN ANON BOOTSTRAP. A vessel MUST boot anon first — it needs a key before anyone
  // can admit that key — so the admit ALWAYS arrives at a vessel that already founded its own group. The
  // anon founding is not a competing state; it is the FLOOR the admit lifts the vessel from. Gating the
  // admit behind `!bootstrap` therefore ignores every admit that will ever arrive.
  if (admit) {
    // JOIN. The founder's root already signed this vessel's edge, so the ceremony here ADOPTS a binding
    // rather than minting one: `runApplyAdmitPayload` seeds this vessel's OWN sovereign social docs and
    // takes the founder's @persona (membership crosses; @daemon stays sovereign-per-vessel), then writes
    // the oracle tiddlers and cap events the boot gates read.
    //
    // The payload arrived as DATA — carried, never fetched — so this path runs with no network, no clock
    // and no server, which is also what makes it a pure function of its bytes and therefore testable.
    // It fails closed on a missing binding field: a half-bound daemon doc is the confused-deputy hole.
    const a = await runApplyAdmitPayload({
      repo,
      operatorSeed,
      operatorVerifyingKey: operatorIdentity.verifyingKey,
      operatorDisplayName:  displayName ?? "Browser Operator",
      payload:              admit,
    });
    bootstrap = {
      identitiesUrl: a.identitiesUrl, circlesUrl: a.circlesUrl, sessionsUrl: a.sessionsUrl,
      daemonUrl: a.daemonUrl, personaUrl: a.personaUrl,
      personaGroupDocIdHex: admit.personaGroupDocIdHex,
      personaGroupAgentIdHex: admit.personaGroupAgentIdHex,
      meshCabalDocIdHex: admit.meshCabalDocIdHex,
      // The PINNED signer and the SIGNED edge ride from the payload, never from this vessel: an admitted
      // leaf presents a binding it could not have written for itself, and that is the whole difference
      // between joining a group and declaring one.
      signerDid: admit.signerDid, deviceEdge: admit.deviceEdge,
      contactCard: a.contactCardJson,
    };
    bootKeyWrites.bootstrap = bootstrap;
  } else if (!bootstrap) {
    // FOUND. No admit — the vessel raises its own PersonaGroup and stands at the floor as an anon. This
    // is a correct outcome, not a failure: fail-closed reads stay-at-the-floor, never destroy.
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
    // A catalog was previously founded + persisted — a load failure is DATA-AMNESIA, surfaced LOUD
    // (never a silent blank re-founding). See loadFoundedCatalogOrWarn.
    catalogHandle = await loadFoundedCatalogOrWarn<LarDoc>(repo, bootKeys.catalogUrl, blankCatalog);
  } else {
    catalogHandle = blankCatalog();
    bootKeyWrites.catalogUrl = catalogHandle.url;
  }
  emit("catalog-ready");

  // The uniform pin-selector's ONE live pointer (BA·HA braid): which VM surface owns the singleton #projection
  // sink right now. Defaults to the pinned wiki at boot; setActiveSurface flips it live (a pure gate flip, no
  // reboot). Pin ⊥ active — the frame gate admits only this surface's frames, keyed on the transport id.
  let activeSurfaceId = "";

  // ── Residency MECHANISM (parity with node — a tab has finite memory too) ────
  let vmManager!: BrowserVesselIslandPool;   // set in makePool
  let wikiActivation!: WikiActivationCap;     // set in makePool — activation-on-reference cap (minimal grant)
  let daemon!:     DaemonVmCore;      // set in openDaemon
  let wikiSense!:  WikiSenseSupervisor;   // set in wireVerbs (post-daemon)
  let slotActiveWikiId = "";

  // Push the live switcher state INTO the @daemon widget (main → local, reactive — never
  // a poll): the switcher-state worker verb writes $:/temp/lares/switcher (volatile, local)
  // so the @daemon's projected list re-renders. Called on every activation change and on
  // summon. Fire-and-forget — a lost push self-heals on the next change or summon.
  const pushSwitcherState = (): void => {
    if (!daemon || !vmManager || !wikiActivation) return;
    const active = vmManager.inspect().filter((s) => s.temperature === "wela").map((s) => s.wikiId);
    // The recipe surface edits the vessel's HOME wiki (always present) — read its
    // bag-stack off the catalog so the widget paints a live, editable recipe.
    const recipeSlug = slotActiveWikiId ? slugFromUri(slotActiveWikiId) : "";
    let recipe: string[] = [];
    if (recipeSlug) {
      const rec = catalogHandle.doc()?.tiddlers?.[recipeUri("@catalog", recipeSlug)];
      if (rec) recipe = bagStackFromRec(rec);
    }
    // Add-candidates: the daemon-resolvable system library bags not already in this
    // recipe. The projection round-trip relays CLICKS only (never text input), so
    // recipe-add rides click-to-add candidates rather than a typed URI.
    const inRecipe = new Set(recipe);
    const availableBags = [BAG_IDS.lares, BAG_IDS.lararium, BAG_IDS.crossroads]
      .filter((b) => !inRecipe.has(b));
    void daemon.placeVerb({
      verb: "switcher-state",
      args: {
        active:        active.join(" "),
        held:          [...wikiActivation.held()].join(" "),
        surface:       activeSurfaceId,
        recipeSlug,
        recipe:        recipe.join(" "),
        availableBags: availableBags.slice(0, 8).join(" "),
      },
      requestedBy: "switcher",
    });
  };
  // The materialize-fresh path RELOADS a persisted @oracle intact (find-first) or
  // materializes it fresh — never a merge-into-stale reconcile. No engine
  // CID-diverge merge happens at boot, so this stays false (kept for API parity).
  const engineUpdated = false;
  // The ONE residency collector — bags AND wiki islands, per-grain-type dials. Sole
  // authority for reachability + eviction (the pool no longer self-evicts). Browser's
  // small wiki cap rides the constrained grant; wiki grains heat by re-mounting.
  const residency = new BagResidencyManager({
    hotCap: 32, typeCaps: { wiki: BROWSER_WIKI_ACTIVATION_CAP }, idleMs: 300_000, sweepIntervalMs: 30_000,
    onHydrate: async (id, grainType) => { if (grainType === "wiki") await vmManager.ensureWiki(id); },
    onEvict:   async (id, grainType) => { if (grainType === "wiki") await vmManager.unmountWiki(id); },
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

  // ── The WHO plane as a LEAF — announce this vessel's Handle on the per-Nexus @crossroads board ──
  // Networked only: the board needs the relay to sync, and the confederation key (relayGatePubKey) scopes the
  // causal island so a human's two vessels resolve the SAME board. The vessel mints its self-certifying
  // handle-card (nym = its own key, glamour = display name) and composes whoFaceCap: resolve the island's WHO
  // board through the deterministic @crossroads address, self-announce, layer it writable so the relay syncs.
  // The identity sibling of the carriage leaf above (WHO ⊥ WHERE, the two-key atom). Absent a relay/gate → [].
  const whoExtraCaps: CapModule[] = (relayUrl && relayGatePubKey) ? await (async () => {
    const nexusPubkey = relayGatePubKey;
    const crossroadsHandle = await materializeSharedLarDoc(repo, crossroadsDocUrl(nexusPubkey), "@crossroads");
    const card = await signHandleCard(
      { nym: operatorDid, glamour: displayName ?? "Anon", version: 1, prev: null,
        expiry: Date.now() + 30 * 24 * 3_600_000, standing: null },
      ed25519SignerFromSeed(operatorSeed),
    );
    return [whoFaceCap({ repo, crossroadsHandle, nexusPubkey, card, residency })];
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
      activeSurfaceId  = sel.slug;   // the pinned wiki owns #projection at boot; summon flips it live
      const facets = recipeHostFacets(slugFromUri(sel.slug), operatorDid);
      return {
        activeWikiId: sel.slug, wikiSlug: facets.wikiSlug,
        wikiKey: facets.wikiKey, wikiBagId: facets.wikiBagId,
        draftOracleTitle: facets.draftOracleTitle, draftBagId: facets.draftBagId,
      };
    },

    openDaemon: async ({ assembly, slot }) => {
      if (!daemonWorkerUrl) throw new Error("[openBrowserVessel] daemonWorkerUrl REQUIRED (genesis present → sovereign daemon island)");
      // Register the per-Nexus @crossroads (public oracle plane) into @oracle so the @daemon recipe resolves
      // it. Isomorphic: node + browser share registerCrossroadsInOracle, and the @daemon core splices
      // @crossroads into the recipe + registerBags for either vessel — only the nexus key differs (here the
      // relay's gate key, so a human's two vessels register the SAME @crossroads).
      if (relayGatePubKey) await registerCrossroadsInOracle(repo, assembly.islandHandle, relayGatePubKey);
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
      registry.register("sync-wiki", async (args, ctx) => {
        await wikiActivation.ensureActive(slotActiveWikiId);   // reference wakes a cold grain (home wiki: no-op)
        return vmManager.placeWikiVerb(slotActiveWikiId, {
          verb: "sync-wiki", args: args as Record<string, unknown>, requestedBy: ctx.invocation.requestedBy,
        });
      });
      registry.register("residency", makeResidencyStatsReactor({ residency }));

      // ── The wiki-SWITCHER surface (the FACE over the activation cap) ────────────
      // The LIVE swap (distinct from boot-time `open-wiki`): ACTIVATE the grain
      // (resolveWikiSpec wakes ANY registered wiki cold, single-flight) THEN flip the
      // singleton #projection gate to it — the summon, mount-then-flip. Persist the
      // choice fire-and-forget to the boot pointer (read only at next cold boot).
      registry.register("wiki-switch", async (args) => {
        // slug rides EITHER as an explicit arg (CLI / MCP) OR encoded in the summon
        // tiddler URI (`…/verb/wiki-switch/<slug>`) when a DOM verse-event drives it
        // — the verse-event payload admits only {uri, verb, fromUri}, never args.
        const slug = String(args["slug"] ?? "") || laresVerbUriArg(String(args["uri"] ?? ""), 0);
        if (!slug) throw new Error("wiki-switch: `slug` required");
        const active = await wikiActivation.ensureActive(slug);
        if (active) {
          activeSurfaceId = slug;   // flip the projection gate to the now-live wiki
          void daemon.placeVerb({ verb: "open-wiki", args: { slug }, requestedBy: "wiki-switch" });
          pushSwitcherState();      // reflect the new surface into the @daemon widget
        }
        return { verb: "wiki-switch", slug, active, held: [...wikiActivation.held()] };
      });
      // wiki-hold / wiki-release — the ROTATABLE active-wiki pin (budget-enforced by the
      // cap: @daemon always + pinBudget rotatable; browser grant = one). The switcher's pin.
      registry.register("wiki-hold", async (args) => {
        const slug = String(args["slug"] ?? "");
        if (!slug) throw new Error("wiki-hold: `slug` required");
        const held = await wikiActivation.hold(slug);
        pushSwitcherState();
        return { verb: "wiki-hold", slug, held, holds: [...wikiActivation.held()], budget: wikiActivation.grant.pinBudget };
      });
      registry.register("wiki-release", async (args) => {
        const slug = String(args["slug"] ?? "");
        if (!slug) throw new Error("wiki-release: `slug` required");
        wikiActivation.release(slug);
        pushSwitcherState();
        return { verb: "wiki-release", slug, holds: [...wikiActivation.held()] };
      });
      // wiki-active — the live switcher state: which wikis run now + which are held +
      // which surface holds the projection. The @daemon widget's state-tiddler reads this.
      registry.register("wiki-active", async () => {
        const active = vmManager.inspect().filter((s) => s.temperature === "wela").map((s) => s.wikiId);
        return {
          verb: "wiki-active", active, held: [...wikiActivation.held()], activeSurface: activeSurfaceId,
          activationCap: wikiActivation.grant.activationCap, pinBudget: wikiActivation.grant.pinBudget,
        };
      });

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
          // Projection-nalu frames route to the display, not the verb plane — but ONLY from the ACTIVE surface.
          // The frame gate keys on the transport id (never a payload claim), so a summon that flips
          // activeSurfaceId auto-supersedes the previous surface's frames with no explicit teardown (the
          // wlroots seat / tmux active-pane rhyme: one sink, N emitters, one gate).
          if (msg.listenable === PROJECTION_FRAME) {
            if (_id !== activeSurfaceId) return;   // not the active surface → drop
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
      // resolveWikiSpec — the UNKNOWN-grain branch (the true multi-wiki swap): a bare
      // reference to a never-opened wiki resolves its spec from the recipe/catalog.
      // READ-ONLY catalog lookup (no phantom mint); the island self-resolves its
      // composition from the grants. Browser resolves within its minimal grant like node.
      const resolveWikiSpec: ResolveWikiSpec = async (wikiId) => {
        const slug    = slugFromUri(wikiId);
        const wikiUrl = tiddlerText(assembly.catalogHandle.doc()?.tiddlers?.[wikiBagUri(slug)]) ?? null;
        if (!wikiUrl || !wikiUrl.startsWith("automerge:")) return null;   // unknown → best-effort drop
        const { spec } = await buildWikiMountSpec(daemon, {
          activeWikiId: wikiId,
          wikiSlug:     slug,
          coreHash:     assembly.coreHash,
          islandUrl:    assembly.islandHandle.url,
          wikiUrl,
          catalogUrl:   assembly.catalogHandle.url,
        });
        return spec;
      };
      // The activation-on-reference CAP the vessel HOLDS + the resolver READS —
      // browser advertises the MINIMAL grant (small active set + @daemon; one rotatable pin).
      wikiActivation = makeWikiActivationCap(residency, vmManager, {
        activationCap: BROWSER_WIKI_ACTIVATION_CAP,
        pinBudget:     BROWSER_WIKI_PIN_BUDGET,
      }, resolveWikiSpec);
      // A daemon evict request routes THROUGH the ONE collector (cool → onEvict →
      // unmountWiki) so the collector stays authoritative (never a desyncing direct unmount).
      daemon.onEvictRequest(async (bagId) => { await residency.cool(bagId); });
      daemon.onResidencyOp(async (op, bagId, reason) => {
        if (op === "pin")        await residency.pin(bagId, reason);
        else if (op === "unpin") residency.unpin(bagId);
        else                     residency.registerCold(bagId);
      });
      // Wiki-alert delivery — place a system-alert verb into the affected wiki's live
      // island. The pool keys a slot by its BARE SLUG (`slotActiveWikiId = sel.slug`;
      // `placeWikiVerb(slotActiveWikiId, …)`), so this MUST key the bare slug too —
      // keying `${hostId}:${wikiSlug}` forks the keyspace: placeWikiVerb never matches a
      // live slot (even the active wiki) and the alert is lost. Browser holds no durable
      // mailbox (unlike node, which parks), so an unmounted target is a best-effort drop.
      daemon.onWikiAlert((wikiSlug, message, cause) => {
        const wikiId = wikiSlug;
        // Resolver-as-activator: a reference ACTIVATES a cold grain — ensureActive
        // re-mounts a known grain, or resolves a never-opened grain's spec through
        // resolveWikiSpec (single-flight) — then delivers. Browser holds no durable
        // mailbox, so a grain that cannot activate (unregistered — no catalog entry to
        // resolve — or the mount cap full) is a best-effort drop — the constrained-vessel degradation.
        void wikiActivation.ensureActive(wikiId)
          .then((live) => {
            if (live) void vmManager.placeWikiVerb(wikiId, {
              verb: "system-alert", args: { message, cause: cause ?? "" }, requestedBy: "daemon",
            }).catch(() => warnDroppedBrowserAlert(wikiId, message, cause, "raced-cold"));
            else warnDroppedBrowserAlert(wikiId, message, cause, "unmounted-no-mailbox");
          })
          .catch(() => warnDroppedBrowserAlert(wikiId, message, cause, "not-activatable"));
      });
      // The @daemon inherits the render cap (dormant-mounted at boot). Forward its frames into the SAME
      // #projection sink the pool wikis use — gated on the active-surface pointer, so a summoned @daemon paints
      // and otherwise its frames drop. One sink, the @daemon a peer surface among the wikis (KA·BA braid).
      daemon.onProjection((frame) => {
        if (activeSurfaceId === DAEMON_SURFACE_ID) onProjection?.(frame);
      });
      // The @daemon's OWN verb OUT-path (a projected switcher click → wiki-switch /
      // add-bag / remove-bag): re-enter the dispatcher via placeVerb so the verb runs on
      // the main registry. The bridge is wired end-to-end (daemon-vm onVerbEvent), but the
      // forward is GATED OFF pending a loop-safe dispatch: a verb's durable outcome +
      // volatile invocation are themselves lar:-titled with a `verb` field, so the
      // reaction-router re-fires on the verb machinery's own writes and re-forwarding them
      // loops. #48 (args-payload in the verse-event contract) carries the clean fix; until
      // then the switcher activates wikis via the CLI `lares wiki switch` face.
      const DAEMON_SURFACE_VERBS_LIVE = false;   // flip on with the #48 loop-safe dispatch
      if (DAEMON_SURFACE_VERBS_LIVE) {
        daemon.onVerbEvent((e) => {
          void daemon.placeVerb({
            verb: e.verb, args: e.args, requestedBy: "daemon-surface",
            ...(e.fromUri ? { fromUri: e.fromUri } : {}),
            ...(e.listenable ? { listenable: e.listenable } : {}),
          });
        });
      }
      return vmManager;
    },

    afterLive: ({ wikiHandle }) => {
      // Presence — ephemeral, does not travel via CRDT.
      wikiHandle.broadcast({ did: operatorDid, ts: Date.now() });
      // Boot DEMOTED to a pin (browser gradient): the @daemon surface stays always-live
      // on its own; the home wiki registers in the ONE collector as a PINNED `wiki` grain
      // (the single rotatable pin this constrained vessel grants besides @daemon).
      // mountPrimaryWiki already mounted + spec-retained it → onHydrate no-ops.
      if (slotActiveWikiId) void residency.pin(slotActiveWikiId, "boot:home-wiki", "wiki");
    },
  }, [...meshExtraCaps, ...whoExtraCaps]);

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
    // The return-leg routes to whichever surface is LIVE-active (read the pointer, never a captured value —
    // the seat routes the next event to whatever holds focus). @daemon → its own worker; else the pinned wiki.
    sendDomEvent: (renderId, eventType, fields) =>
      activeSurfaceId === DAEMON_SURFACE_ID
        ? daemon.sendDomEvent(renderId, eventType, fields)
        : vmManager.placeWikiEvent(slotActiveWikiId, { renderId, eventType, fields }),
    // The uniform pin-selector: flip the live gate synchronously (mount-then-flip — @daemon + the pinned wiki
    // are already mounted), then persist the choice fire-and-forget to @daemon/active-wiki (read only at next
    // cold boot). No reboot — an active-surface change is a projection-gate flip, not a manifest rebuild.
    setActiveSurface: (surfaceId: string) => {
      activeSurfaceId = surfaceId;
      void daemon.placeVerb({
        verb: "open-wiki",
        args: { slug: surfaceId === DAEMON_SURFACE_ID ? "daemon" : surfaceId },
        requestedBy: "summon",
      });
      // Summoning the @daemon: seed its switcher list with the live activation state so
      // the projected widget paints a current list the moment it becomes the surface.
      if (surfaceId === DAEMON_SURFACE_ID) pushSwitcherState();
    },
  };
}
