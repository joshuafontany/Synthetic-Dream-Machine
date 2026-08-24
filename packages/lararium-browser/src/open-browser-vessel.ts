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
 * BagStowage mechanism, corpus loading, the verb plane, presence.
 *
 * Genesis REQUIRED (no coreless boot). The not-yet-held axis sits at anon↔keeper
 * (PersonaGroup/admin), not genesis — see project-sovereign-worker-model.
 */

import { Repo }                              from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter }           from "@automerge/automerge-repo-storage-indexeddb";
import type { DocHandle, AutomergeUrl, PeerId } from "@automerge/automerge-repo";
import {
  emptyLarDoc, mutableLarRecord,
  CATALOG_DOC_URI, DAEMON_BAG_ID,
  ENGINE_CORE_ID, pluginCidsFromIslandBlobs,
  personaMultitudeView, renameOwnPersona,
  DeterministicFederationGate, identityShareDecision, type FederationGate, type IdentityRing,
  ed25519SignerFromSeed, LarWSClientAdapter, type LeafIdentity,
  BAG_IDS, slugFromUri, verbArgsFromPayload, bagStackFromRec, recipeUri, recipeHostFacets, type WikiActivationCap,
  carriageStack, deriveMeshLeaf,
  materializeGenesisIsland,
  whoFaceCap, materializeSharedLarDoc, crossroadsDocUrl, registerCrossroadsInOracle,
  personaKelBoardDocUrl, personaKelChainForPrefix,
  deriveRegisterBags, catalogNamedBags, personaBagIdFor, personaSiblingBagIds,
  type CapModule,
  type LarDoc, type LarariumVesselOptions, type VesselResult,
  type VesselBootstrap, type VesselCoreAssembly, type DeviceDelegationTiddler,
  type GenesisCasManifest, type GenesisSeed,
  type BootInvite, type BootInvitePolicy,
}                                            from "@lararium/mesh";
import { runBrowserBootInviteSpend }         from "./browser-boot-invite-burn.js";
import {
  MemoryTiddlerStore,
  selectActiveWikiSlug,
  loadCatalogCorpora, seedVesselDefaults,
  makeResidencyStatsReactor,
  makeVesselResidency, type VesselResidency,
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
import { runFoundingCeremony, runApplyAdmitPayload } from "@lararium/keyhive";
import type { DeviceAdmitPayload } from "@lararium/keyhive";
import type { LarOpenPhase }                 from "@lararium/mesh";
import {
  generateOrLoadBrowserVesselIdentity, loadBrowserSigningSeed,
  generateOrLoadBrowserPersonaRoot, loadBrowserPersonaRootSeed, wearBrowserPersona,
  browserJoineePersonaIndex,
  listBrowserPersonaRoots, loadBrowserActivePersona,
  makeBrowserIdbPersonaVault, makeBrowserPersonaPetnameStore,
  openVesselIdb, idbGet, idbPut,
}                                            from "./browser-vessel-identity.js";
import { personaPanelStateArgs }             from "./persona-panel-state.js";
import { BrowserVesselIslandPool }           from "./browser-vessel-island-pool.js";

/** Browser advertises the MINIMAL grant (constrained vessel): a small live-wiki set
 *  (the daemon bag always + a couple more on reference) and ONE rotatable pin besides the daemon bag.
 *  The resolver honors this smaller grant — the same cap, a lower point on the spectrum. */
const BROWSER_WIKI_ACTIVATION_CAP = 2;
const BROWSER_WIKI_PIN_BUDGET     = 1;

/** The founding persona's handle-index. A fresh browser founds its FIRST persona here (never the self-
 *  signed floor); the multitude adds h1, h2, … each with its own root (a stage-4+ UX). Kept explicit so
 *  the founding + the worker-reach selector name the SAME index. */
const FOUNDING_PERSONA_INDEX = 0;
import {
  fetchGenesisCasToOpfs,
}                                            from "./browser-genesis.js";
import {
  openBrowserDaemonVm,
}                                            from "./open-browser-daemon-vm.js";
import type { WikiRecipe }                   from "@lararium/mesh";

import { waitHandle } from "@lararium/mesh";
// ── Bootstrap artifact (IDB-persisted) ──────────────────────────────────────────

const BOOTSTRAP_KEY  = "social-bootstrap";

interface BrowserBootstrap extends VesselBootstrap {
  personaGroupDocIdHex:   string;
  personaGroupAgentIdHex: string;
  meshCabalDocIdHex:     string;
  /** The signer DID — provenance only (the founding op-key = the persona-KEL inception op-key). */
  signerDid:             string;
  /** The persona-KEL identifier PREFIX (AID) the Binding Gate PINS — stable across every op-key rotation.
   *  The gate walks the per-Nexus KEL board to this prefix's current head and verifies the edge against it. */
  personaKelPrefix:      string;
  /** This vessel's self-signed device-delegation edge — the public binding the Binding Gate verifies. */
  deviceEdge:            DeviceDelegationTiddler;
  /** Cached self-certifying ContactCard JSON (founding) — the leaf identity for the V3 peer gate. */
  contactCard?:          string;
  /** The HEARTH's daemon url — the door this vessel knocks on for its seat. Null/absent when it founded
   *  its own face; such a vessel IS the hearth. Persisted at admission, re-read on every later boot. */
  hearthDaemonUrl?:      string | null;
}

// The oracle doc no longer needs an IDB rendezvous key: it lives under the DETERMINISTIC
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
   * The PLAIN-DATA genesis seed (island.genesis.json) — the oracle doc's initial state the
   * boot MATERIALIZES fresh under the deterministic doc id (the node-parity materialize-fresh
   * path; the retired island.bin binary import is gone). REQUIRED on first boot; a reboot
   * reloads the persisted oracle doc by find-first, a peer syncs it — neither needs the seed.
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
   * this vessel's own verifying key (the same-operator leaf, the prior behavior — back-compat).
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
   * the founder's persona doc (membership crosses; the daemon bag stays sovereign-per-vessel).
   */
  admit?:           DeviceAdmitPayload;
  /**
   * A carried TRACELESS boot-invite (membership-doctrine #the-invite) — a sealed, single-use capability the
   * vessel spends ON BOOT to cross into the Nexus. CARRIED, never fetched (a URL fragment / paste / QR that
   * never reaches a server); verified OFFLINE against the Nexus seal. WITHHOLD-NEVER-FORGE: a garbled / absent
   * / expired / already-spent invite does NOT throw and does NOT cross — the vessel founds its own group and
   * stands at the ANON FLOOR (a correct outcome, never an attack). Single-use is burned LOCALLY (IndexedDB;
   * NO federated burn-registry). ABSENT (with no invite-only policy) → the vessel crosses on the open setting
   * exactly as today (the relay/who caps compose when a relay is configured).
   */
  bootInvite?:      BootInvite | null;
  /** The boot-invite policy — `invite-only` REQUIRES a sealed unspent in-date invite to cross (else anon
   *  floor); `open` crosses with no invite. DEFAULT: `invite-only` when a `bootInvite` is carried, else `open`
   *  (so today's un-gated crossing is unchanged unless the operator opts into the gate). */
  bootInvitePolicy?: BootInvitePolicy;
  /** The Nexus pubkey the carried invite seals — the key its `sig` verifies against. Provisioned OUT-OF-BAND.
   *  DEFAULT: `relayGatePubKey` (the Nexus this vessel crosses into) ?? this vessel's own DID. */
  inviteNexusPubkey?: string;
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
   * the mesh (pulls peers' public meshpalace docs + re-ranks by l-space proximity) WITHOUT serving or
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

/** The surface id the daemon owns in the uniform pin-selector — distinct from any pool wiki slug. Pass it to
 *  `setActiveSurface` to summon the daemon; pass a wiki slug to surface that wiki. It's all the same VM. */
// THE SENTINEL IS THE SLUG — one string, no decoding at any boundary, so no call site can decode it
// wrongly. A sentinel that differs from the slug buys a translation everywhere the two must meet.
export const DAEMON_SURFACE_ID = "daemon";

/** The ONE shared VesselResult (no vessel-by-type) + browser's one substrate extra. */
export interface BrowserVesselResult extends VesselResult<BrowserVesselIslandPool, DaemonVmCore> {
  /** True when a genesis update was detected + merged on this boot (browser substrate). */
  engineUpdated: boolean;
  /**
   * True → this boot CROSSED into the Nexus (an OPEN policy, or a sealed unspent invite spent this boot).
   * False → the vessel WITHHELD the crossing and founded its own group at the ANON FLOOR (garbled / absent /
   * expired / already-spent invite under an invite-only policy). Either way the vessel booted — a withhold is
   * a correct outcome, never a throw — and on a withhold NO relay/who cap composed, so NO federated record was
   * written (the traceless proof).
   */
  admittedToNexus: boolean;
  /** Relay a main-thread DOM event to the ACTIVE surface (interactivity RETURN leg) — routes to the daemon or
   *  the pinned wiki by the live active-surface pointer. */
  sendDomEvent: (renderId: string, eventType: string, fields: Record<string, number | boolean>) => void;
  /** The RETURN leg's TEXT half — a relayed input/change carrying the field's whole bounded value, routed
   *  to whichever surface holds focus exactly as the click leg routes. Its own message kind, so the click
   *  channel keeps its primitives-only allowlist. */
  sendDomInput: (renderId: string, eventType: string, value: string) => void;
  /** The uniform pin-selector: flip which VM owns the singleton #projection sink. DAEMON_SURFACE_ID summons the
   *  daemon; a wiki slug surfaces that wiki. LIVE (synchronous gate flip); the durable bags/daemon/active-wiki
   *  marker persists fire-and-forget, consulted only at next cold boot ("live process state is the boundary"). */
  setActiveSurface: (surfaceId: string) => void;
}

/**
 * Load a PREVIOUSLY-FOUNDED catalog doc by its persisted url — and never re-found it SILENTLY. A stored
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
      `[lararium-browser] DATA-AMNESIA: the persisted catalog doc (${url}) FAILED to load — its local ` +
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
    bootInvite, bootInvitePolicy, inviteNexusPubkey,
  } = opts;
  const emit = (p: LarOpenPhase) => onPhase?.(p);

  emit("boot");

  // ── Repo — IndexedDB-backed (substrate) ────────────────────────────────────
  // The federation ring split. This vessel's own islands (daemon + wiki workers) sync over
  // MessageChannel and are house members — they share freely. The spore crossing (below) may add
  // a WS *relay* adapter reaching the wider Nexus; a relay peer must NOT be volunteered every
  // sovereign doc. `relayPeers` tags exactly the peers that arrive via the relay adapter (the
  // adapter-scoped peer-candidate is unambiguous — no socket-map inference), and `fedGate`
  // (a DENY-BY-DEFAULT FederationGate) is armed ONLY for a cross-operator crossing. Absent a
  // gate the relay is the operator's OWN node (same-operator leaf, own DID) → full device sync.
  const relayPeers = new Set<string>();
  let   fedGate: FederationGate | null = null;
  // #58 — the deny-by-default IDENTITY ring, composed INSIDE the #49 federation gate
  // (identityShareDecision: a doc crosses only if BOTH rings allow). This is the
  // socket the crypto-backed KeyhiveIdentitySlot slots into — mirroring how `fedGate`
  // itself pre-sockets ahead of a cross-operator crossing.
  //
  // HONEST GAP (surfaced, NOT papered): `identityRing` stays null on this path today,
  // so the composition degenerates EXACTLY to the #49 fed gate (zero behavior change).
  // The live KeyhiveProvider runs INSIDE the daemon-island worker (bootDaemonKeyhive
  // over the worker composite); the founding ceremony DISPOSES its transient provider
  // before returning, so NO provider — and no bag↔docId registry — reaches this
  // main-thread shore synchronously.
  //
  // WHAT STANDS AND WHAT REMAINS, precisely — the two get conflated, and they differ:
  //   · the async main↔worker cap-verify bridge EXISTS and runs — `daemon:verify-request` /
  //     `daemon:verify-result`, handled worker-side and exposed as the daemon VM's authShore, which the
  //     node vessel already arms for its peer gate.
  //   · the docId→bagUrl map EXISTS too, inside the worker's provider.
  //   · what is missing sits between them: NO message carries that map across. `verify-request` already
  //     TAKES a bagUrl, so it assumes a caller who knows one, and this shore holds only a documentId.
  // So the gap reads one message wide, plus building the ring over it.
  //
  // AND WIRING IT CLOSES A DOOR. The capability layer hashes a bag URL to seed the Document behind it, so
  // once this ring verifies, every name that has been through it costs a re-founding to change. The
  // remaining naming fusions therefore resolve BEFORE this lights, not after
  // (canon: lar:///ha.ka.ba/lares/api/pono/one-name-one-relation).
  const identityRing: IdentityRing | null = null;
  const repo = new Repo({
    storage:     new IndexedDBStorageAdapter(`${idbName}:repo`),
    sharePolicy: (peerId, documentId) => identityShareDecision(relayPeers, fedGate, identityRing, peerId, documentId),
  });
  emit("repo-open");

  // ── Keypair (WebCrypto substrate) + founding (the personaGroup capability) ───
  const vesselIdentity = await generateOrLoadBrowserVesselIdentity(idbName, displayName);
  const vesselSeed     = await loadBrowserSigningSeed(idbName);
  const vesselVerifyingKey      = vesselIdentity.verifyingKey;

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
    // takes the founder's persona doc (membership crosses; the daemon bag stays sovereign-per-vessel), then writes
    // the oracle tiddlers and cap events the boot gates read.
    //
    // The payload arrived as DATA — carried, never fetched — so this path runs with no network, no clock
    // and no server, which is also what makes it a pure function of its bytes and therefore testable.
    // It fails closed on a missing binding field: a half-bound daemon doc is the confused-deputy hole.
    const a = await runApplyAdmitPayload({
      repo,
      vesselSeed,
      vesselVerifyingKey: vesselIdentity.verifyingKey,
      vesselDisplayName:  displayName ?? "Browser Operator",
      payload:              admit,
      // This vessel's own gate key IS its Nexus key — the local KEL board it seeds the founder's inception onto.
      nexusPubkey: vesselIdentity.verifyingKey,
    });
    bootstrap = {
      identitiesUrl: a.identitiesUrl, circlesUrl: a.circlesUrl, sessionsUrl: a.sessionsUrl,
      daemonUrl: a.daemonUrl, personaUrl: a.personaUrl, personaBagId: a.personaBagId,
      // The compartments this vessel carries. An admitted browser joins one today; the shape takes the
      // family so a second admission adds an entry rather than re-typing the boot path.
      personaPlanes: [{ personaGroupId: admit.personaGroupDocIdHex, url: a.personaUrl }],
      personaGroupDocIdHex: admit.personaGroupDocIdHex,
      personaGroupAgentIdHex: admit.personaGroupAgentIdHex,
      meshCabalDocIdHex: admit.meshCabalDocIdHex,
      // The PINNED identifier and the SIGNED edge ride from the payload, never from this vessel: an admitted
      // leaf presents a binding it could not have written for itself, and that is the whole difference
      // between joining a group and declaring one. The gate walks the KEL prefix to the current head.
      signerDid: admit.signerDid, personaKelPrefix: admit.personaKelPrefix, deviceEdge: admit.deviceEdge,
      contactCard: a.contactCardJson,
      hearthDaemonUrl: a.hearthDaemonUrl,
    };
    bootKeyWrites.bootstrap = bootstrap;
  } else if (!bootstrap) {
    // FOUND. No admit — the vessel raises its own PersonaGroup and founds its FIRST persona (never the
    // self-signed floor). The two-key atom: the DEVICE key (vesselSeed) inits keyhive as the Individual;
    // a DISTINCT PersonaGroup ROOT signs the device-delegation edge. Mint that root founder-side (root-on-
    // founder), load its seed as the signer, and WEAR it — mirroring node's `lares vessel found` (init.ts: mint
    // generateOrLoadPersonaGroupRoot → loadPersonaGroupRootSeed → runFoundingCeremony{signerSeed}).
    await generateOrLoadBrowserPersonaRoot(idbName, FOUNDING_PERSONA_INDEX);
    const signerSeed = await loadBrowserPersonaRootSeed(idbName, FOUNDING_PERSONA_INDEX);
    await wearBrowserPersona(idbName, FOUNDING_PERSONA_INDEX);   // the selector points at the founded root
    const f = await runFoundingCeremony({
      repo, vesselSeed,
      vesselVerifyingKey: vesselIdentity.verifyingKey,
      vesselDisplayName:  displayName ?? "Browser Operator",
      // The persona-root SIGNS (signerDid == the root DID, DISTINCT from deviceDid). The self-signed anon
      // (signerSeed == vesselSeed) survives ONLY as an explicit named floor tier, never the default.
      binding: { mode: "self-stood", signerSeed },
      hearthTrueName: "",          // hearth-agnostic: an anon is not yet bound to a place; it binds on upgrade
      // This vessel's own gate key IS its Nexus key — the per-Nexus KEL board the founding seats the inception on.
      nexusPubkey: vesselIdentity.verifyingKey,
    });
    bootstrap = {
      identitiesUrl: f.identitiesUrl, circlesUrl: f.circlesUrl, sessionsUrl: f.sessionsUrl, daemonUrl: f.daemonUrl, personaUrl: f.personaUrl, personaBagId: f.personaBagId,
      personaPlanes: [{ personaGroupId: f.personaGroupDocIdHex, url: f.personaUrl }],
      personaGroupDocIdHex: f.personaGroupDocIdHex, personaGroupAgentIdHex: f.personaGroupAgentIdHex, meshCabalDocIdHex: f.meshCabalDocIdHex,
      signerDid: f.signerDid, personaKelPrefix: f.personaKelPrefix, deviceEdge: f.founderEdge,
      contactCard: f.contactCardJson,
      hearthDaemonUrl: null,   // a vessel that founded its own face IS the hearth
    };
    bootKeyWrites.bootstrap = bootstrap;
  }
  const social = bootstrap;   // narrowed (defined past this point)

  // ── The TRACELESS boot-invite gate — spend-on-boot, WITHHOLD-NEVER-FORGE ──────────────────────
  // Decide whether this boot CROSSES into the Nexus. The vessel ALREADY founded its own group above
  // (the anon floor is the ground, not a competing state) — the invite only lifts it into the crossing.
  // The policy DEFAULTS to `open` (today's un-gated crossing) unless the operator carries a `bootInvite`
  // or names an `invite-only` policy; then a sealed, unspent, in-date, Nexus-signed invite is REQUIRED, or
  // the vessel WITHHOLDS the crossing (garbled/absent/expired/already-spent → anon floor, never a throw).
  // The nexus the invite seals: `inviteNexusPubkey` ?? the relay's gate key ?? this vessel's own DID. The
  // single-use burn lands in this island's OWN IndexedDB (NO federated burn-registry). On a WITHHOLD nothing
  // burns and — because the relay/who caps below gate on `admittedToNexus` — NO federated record is written.
  const invitePolicy: BootInvitePolicy =
    bootInvitePolicy ?? (bootInvite ? { kind: "invite-only" } : { kind: "open" });
  const inviteNexus = inviteNexusPubkey ?? relayGatePubKey ?? vesselVerifyingKey;
  const bootVerdict = await runBrowserBootInviteSpend({
    idbName, nexusPubkey: inviteNexus, invite: bootInvite ?? null, policy: invitePolicy,
  });
  const admittedToNexus = bootVerdict.admitted;
  if (!admittedToNexus) {
    console.log(
      `[lararium-browser] boot-invite WITHHELD (${bootVerdict.refusal ?? "no-invite"}) — founding own group at the ` +
      `anon floor; no crossing, no federated record written (the invite did not arrive, never an attack).`,
    );
  }

  // ── The spore crossing — the outbound V3 leaf transport (opt-in via relayUrl) ──────────────
  // When a relay URL is given AND a founding card is cached, compose the platform-blind
  // LarWSClientAdapter and add it to the Repo: the browser dials the node's gate, runs the V3
  // handshake on the socket, and — on a passing verdict — syncs shared docs (the second spore).
  // FLOW ⊥ AUTHORITY: this is pure authority+sync; the nalu servo / ea-backpressure rides later.
  // NOTE: the gate admits a peer holding cap=admin on the node's daemon bag, OR one the
  // operator device-admitted that carries a valid device-delegation edge pinned to the node's
  // hearth root. The leaf rides its own device edge (social.deviceEdge) so the in-worker keyholder
  // can admit it at the operator's-own-device tier. gatePubKey is PROVISIONED out-of-band: for a
  // cross-operator crossing pass the NODE's gate key (relayGatePubKey); absent → own DID (the
  // same-operator leaf, prior behavior). An un-admitted anon dials + fails closed.
  // Gated on `admittedToNexus`: a WITHHELD boot founds its own group at the anon floor and composes NO relay
  // adapter (no crossing, no federated sync) — the traceless outcome.
  if (relayUrl && social.contactCard && admittedToNexus) {
    const leaf: LeafIdentity = {
      contactCard: social.contactCard,
      peerPubKey:  vesselVerifyingKey,
      sign:        ed25519SignerFromSeed(vesselSeed),
      ...(social.deviceEdge ? { edge: social.deviceEdge } : {}),
    };
    const relayAdapter = new LarWSClientAdapter({
      url: relayUrl, identity: leaf, aud: DAEMON_BAG_ID, gatePubKey: relayGatePubKey ?? vesselVerifyingKey,
    });
    // Tag the relay ring: every peer reached through this adapter enters `relayPeers`, so the
    // sharePolicy gates them while the in-process island peers keep sharing freely. Listeners
    // attach BEFORE addNetworkAdapter so a peer is classified before any doc is announced to it.
    relayAdapter.on("peer-candidate",    ({ peerId }: { peerId: PeerId }) => { relayPeers.add(peerId); });
    relayAdapter.on("peer-disconnected", ({ peerId }: { peerId: PeerId }) => { relayPeers.delete(peerId); });
    // Arm the deny-by-default gate ONLY for a cross-operator crossing (relayGatePubKey names a
    // foreign Nexus, and its deterministic crossroads doc + WHO board are the whole public surface).
    // Absent a gate key the relay is the operator's own node: fedGate stays null → full device sync.
    if (relayGatePubKey) fedGate = new DeterministicFederationGate(relayGatePubKey);
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

  // Push the live switcher state INTO the daemon widget (main → local, reactive — never
  // a poll): the switcher-state worker verb writes $:/temp/lares/switcher (volatile, local)
  // so the daemon's projected list re-renders. Called on every activation change and on
  // summon. Fire-and-forget — a lost push self-heals on the next change or summon.
  const pushSwitcherState = (): void => {
    if (!daemon || !vmManager || !wikiActivation) return;
    const active = vmManager.inspect().filter((s) => s.temperature === "wela").map((s) => s.wikiId);
    // The recipe surface edits the vessel's HOME wiki (always present) — read its
    // bag-stack off the catalog so the widget paints a live, editable recipe.
    const recipeSlug = slotActiveWikiId ? slugFromUri(slotActiveWikiId) : "";
    let recipe: string[] = [];
    if (recipeSlug) {
      const rec = catalogHandle.doc()?.tiddlers?.[recipeUri("catalog", recipeSlug)];
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
  // Push the live PERSONA multitude INTO the daemon persona surface (main → local, reactive):
  // main HOLDS the IDB persona vault, so it reads the multitude-view here + writes it through the
  // `persona-state` worker verb onto the volatile $:/temp/lares/personas. PRIVATE-all: the view is
  // built with NO public-handle view, so every persona reads private-only — no glamour federates
  // off this push. Fired after a mint/wear + on daemon summon. Fire-and-forget (a lost push self-
  // heals on the next mint/wear or summon), mirroring pushSwitcherState.
  const pushPersonaState = async (): Promise<void> => {
    if (!daemon) return;
    const vault    = await makeBrowserIdbPersonaVault(idbName);
    const petnames = await makeBrowserPersonaPetnameStore(idbName);
    const view     = await personaMultitudeView(vault, petnames);   // no publicView → private-only
    const active   = await loadBrowserActivePersona(idbName);
    void daemon.placeVerb({
      verb:        "persona-state",
      args:        personaPanelStateArgs(view, active),
      requestedBy: "persona",
    });
  };
  // The default circle the daemon follow panel paints — the primary system circle seedCirclesDoc plants.
  const CIRCLE_PANEL_DEFAULT = "following";
  // RENDER the daemon follow surface FROM the sovereign circles doc (the follow-graph's SOURCE OF TRUTH). The
  // daemon WORKER holds the circles doc by access, so `circle-list` reads the membership there and writes the volatile
  // $:/temp/lares/circles itself — main only TRIGGERS. The circles doc is PRIVATE + fleet-synced same-operator (a follow
  // shows on ALL the operator's own devices) and NEVER federates. Petname/glamour ride blank until the handle-
  // book co-moves onto the circles doc (the open fork). Fired on a follow/unfollow + daemon summon; fire-and-forget.
  const pushCircleState = (circleId = CIRCLE_PANEL_DEFAULT): void => {
    if (!daemon) return;
    void daemon.placeVerb({ verb: "circle-list", args: { circle: circleId }, requestedBy: "circle" });
  };
  // The materialize-fresh path RELOADS a persisted oracle doc intact (find-first) or
  // materializes it fresh — never a merge-into-stale reconcile. No engine
  // CID-diverge merge happens at boot, so this stays false (kept for API parity).
  const engineUpdated = false;
  // The ONE residency collector + pool-wiring, composed through the SHARED factory (both vessels
  // call it). Browser advertises the MINIMAL grant (a small live-wiki set + one rotatable pin
  // besides the daemon bag) and supplies its vessel-specific hooks: it stays SILENT on a cool (node
  // narrates the cool) and holds NO durable mailbox, so an undeliverable alert WARNS + drops
  // best-effort (node parks it durably). getPool reads vmManager lazily (the forward-ref pattern).
  const residencyWiring: VesselResidency = makeVesselResidency(
    () => vmManager,
    { wikiActivationCap: BROWSER_WIKI_ACTIVATION_CAP, wikiPinBudget: BROWSER_WIKI_PIN_BUDGET },
    {
      onUndeliverableAlert: (wikiId, verbOpts, reason) =>
        warnDroppedBrowserAlert(
          wikiId,
          String(verbOpts.args["message"] ?? ""),
          (verbOpts.args["cause"] as string) || undefined,
          reason,
        ),
    },
  );
  const residency = residencyWiring.residency;

  // ── The mesh carriage as a LEAF ───────────────────────────────
  // PRESENT → derive the leaf standing and compose the carriage ALONGSIDE the wiki core: meshpalace
  // (a writable meshpalace FLOW-map, seeded with NO self-dial — `meshSelfSeed([leaf])` is [] for a
  // leaf) + carriage (pulls peers' public read-faces, re-ranks by l-space proximity). A LEAF has no
  // endpoint → it carries-in but is NOT dial-able (a browser holds no listening socket). ABSENT → [],
  // the browser composes no carriage (today's behavior, unchanged). The mirror of openNodeVessel.
  const meshExtraCaps = meshLeaf ? (() => {
    const leaf = deriveMeshLeaf(
      meshLeaf.coordSeed, meshLeaf.peers,
      ...(meshLeaf.radius !== undefined ? [{ radius: meshLeaf.radius }] : []),
    );
    // The SAME pair a node hearth and a Herm compose — a leaf differs only in the standing it hands in.
    // `deriveMeshLeaf` yields a self with NO endpoint, so the stack seeds no dial and announces nothing:
    // this vessel carries-in and is never dial-able (the endpoint-absent leaf↔full tier).
    return [...carriageStack({
      repo, residency, self: leaf,
      nodeSeedHex: vesselVerifyingKey,   // the per-vessel cadence seed (browser-safe hex string, no Buffer)
      onLog: (l) => console.log(`[lararium-browser] ${l}`),
    })];
  })() : [];

  // ── The WHO plane as a LEAF — RESOLVE the per-Nexus crossroads board; announce NOTHING ──
  // Networked only: the board needs the relay to sync, and the confederation key (relayGatePubKey) scopes the
  // causal island so a human's two vessels resolve the SAME board. Boot composes whoFaceCap with NO card: it
  // resolves the island's WHO board through the deterministic crossroads address and layers it writable so
  // the relay syncs, giving this vessel RECOGNITION (it reads every peer's card) while publishing none of its
  // own. The identity sibling of the carriage leaf above (WHO ⊥ WHERE, the two-key atom). No relay/gate → [].
  //
  // NO BOOT-TIME FACE, by construction rather than by gate. Canon never collapses binding-the-vessels into
  // announcing-the-identity, so publishing rides a deliberate holder act through the component's `announce` —
  // the ONLY thing that ever federates stays a glamour the human consciously posts, never a boot side-effect.
  // (A boot-minted card also had to name SOME key, and the only key at hand is this vessel's own — publishing
  // it would put the substrate key on the social board, the one co-surface the two-key atom forbids.)
  const whoExtraCaps: CapModule[] = (relayUrl && relayGatePubKey && admittedToNexus) ? await (async () => {
    const nexusPubkey = relayGatePubKey;
    const crossroadsHandle = await materializeSharedLarDoc(repo, crossroadsDocUrl(nexusPubkey), "board:crossroads");
    return [whoFaceCap({ repo, crossroadsHandle, nexusPubkey, residency })];
  })() : [];

  const result = await composeBrowser<BrowserVesselIslandPool>({
    keel: {
      repo,
      catalogHandle,
      waitHandle: <T>(url: AutomergeUrl, fallback: () => DocHandle<T>) => waitHandle<T>(repo, url, fallback),

      // Genesis REQUIRED — the node-parity materialize-fresh path. The oracle island is a LIVE
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
            "a reboot reloads the persisted oracle doc by find-first, but first boot needs the seed",
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
        mintLocalHandle: (docUrl) => waitHandle<LarDoc>(repo, docUrl, () => repo.create<LarDoc>(emptyLarDoc())),
        source: "browser-boot",
      }, composite),

      ...(onPhase ? { onPhase } : {}),
    },

    wikiSlot: (_assembly: VesselCoreAssembly): VesselWikiSlot => {
      const sel = selectActiveWikiSlug(wikiId, undefined);
      slotActiveWikiId = sel.slug;
      activeSurfaceId  = sel.slug;   // the pinned wiki owns #projection at boot; summon flips it live
      const facets = recipeHostFacets(slugFromUri(sel.slug), vesselVerifyingKey);
      return {
        activeWikiId: sel.slug, wikiSlug: facets.wikiSlug,
        wikiKey: facets.wikiKey, wikiBagId: facets.wikiBagId,
        draftOracleTitle: facets.draftOracleTitle, draftBagId: facets.draftBagId,
      };
    },

    openDaemon: async ({ assembly, slot }) => {
      if (!daemonWorkerUrl) throw new Error("[openBrowserVessel] daemonWorkerUrl REQUIRED (genesis present → sovereign daemon island)");
      // Register the per-Nexus crossroads (public oracle plane) into the oracle plane so the daemon recipe resolves
      // it. Isomorphic: node + browser share registerCrossroadsInOracle, and the daemon core splices
      // the crossroads bag into the recipe + registerBags for either vessel — only the nexus key differs (here the
      // relay's gate key, so a human's two vessels register the SAME crossroads doc).
      if (relayGatePubKey) await registerCrossroadsInOracle(repo, assembly.islandHandle, relayGatePubKey);
      // The worker boots on the WORN persona's binding. The two-key atom: `seed` is the DEVICE key —
      // it inits keyhive as the Individual, and NEVER derives the persona-root — while `signerDid` +
      // `deviceEdge` carry the WORN PersonaGroup root's founder-signed binding (the Binding Gate pins
      // that root). The selector chooses WHICH root: `browserJoineePersonaIndex` reads the worn index
      // (a founder's worn/founding root, or a joinee's admitted anchor index — the anchor/edge path,
      // never a held root the joinee lacks).
      //
      // SURFACED FORK (per-persona social plane): the browser bootstrap holds ONE founding's social docs,
      // so today the WORN binding IS the founding persona's. Wearing a SECOND persona whose OWN
      // PersonaGroup + daemon social docs feed the worker means founding those docs per persona and
      // keying the bootstrap by index — a whole-social-plane fork node itself does NOT exercise (node
      // founds only index 0). Left to the operator; this reach threads the worn root's binding from the
      // single bootstrap, which is exactly node's behaviour.
      const wornPersona = await browserJoineePersonaIndex(idbName);
      if (wornPersona !== undefined && wornPersona !== FOUNDING_PERSONA_INDEX) {
        console.log(`[lararium-browser] worker boots on worn persona h${wornPersona} (binding from bootstrap)`);
      }
      // THE PERSONA-KEL PIN — the continuity anchor the Binding Gate walks. Read the pinned identifier's
      // seq-sorted key-event-log from this vessel's OWN per-Nexus KEL board (its gate key IS its Nexus key),
      // against the LOCAL replica "as of last sync" (no-global-now). FAIL-CLOSED: a chain the replica does not
      // carry HALTS the boot (never a global lookup, never a fall-through to the raw signer pin).
      const kelBoard = await materializeSharedLarDoc(repo, personaKelBoardDocUrl(vesselIdentity.verifyingKey), "board:persona-kel");
      const personaKelChain = personaKelChainForPrefix(kelBoard.doc(), social.personaKelPrefix);
      if (!personaKelChain || personaKelChain.length === 0) {
        throw new Error(`[lararium-browser] persona-KEL chain for ${social.personaKelPrefix.slice(0, 20)}… absent from the local board — the Binding Gate cannot reach a head (fail-closed).`);
      }
      const daemonAuth = {
        seed: vesselSeed, vesselVerifyingKey: vesselIdentity.verifyingKey,
        personaGroupDocIdHex: social.personaGroupDocIdHex,
        personaGroupAgentIdHex: social.personaGroupAgentIdHex,
        meshCabalDocIdHex: social.meshCabalDocIdHex,
        // Derived, never enumerated — the same derivation the node vessel runs, so neither can drift on
        // which bags a cap check can resolve. This vessel had been carrying neither the shared substrate
        // bag nor any bag its own catalog named, which no test could see and no throw announced.
        registerBags: deriveRegisterBags({
          // EVERY compartment registers; exactly one mounts. The two verbs part company here.
          fleets: social.personaPlanes.map((pl) => ({
            personaGroupId: pl.personaGroupId,
            catalogNamed: pl.personaGroupId === social.personaGroupDocIdHex ? catalogNamedBags(catalogHandle.doc()) : [],
          })),
          wikiBags: [slot.wikiBagId, slot.draftBagId],
        }),
        // The WORN persona-root's binding (founder-signed): the gate pins personaKel.prefix and walks the KEL
        // to the current head; deviceEdge is the signed device→hearth edge. From the single bootstrap.
        signerDid: social.signerDid,
        personaKel: { prefix: social.personaKelPrefix, chain: personaKelChain },
        deviceEdge: social.deviceEdge,
      };
      // The engine's plugin-tiddler CIDs — the worker pulls them by CID from OPFS (the breath
      // path), never CRDT-syncing the oracle blob doc over the port. Same derivation as the pool.
      const pluginCids = pluginCidsFromIslandBlobs(assembly.islandHandle.doc()?.blobs);
      daemon = await openBrowserDaemonVm({
        repo, daemonUrl: social.daemonUrl, coreHash: assembly.coreHash,
        // The persona plane rides only when a face stands. A browser vessel normally holds one — it IS
        // a person's face — so absence here names an unfinished founding rather than a crossroads, and
        // the VM stands faceless instead of resolving a document nobody founded.
        ...(social.personaUrl ? { personaUrl: social.personaUrl } : {}),
        ...(social.personaBagId ? { personaBagId: social.personaBagId } : {}),
        ...(pluginCids.length ? { pluginCids } : {}),
        workerScriptUrl: daemonWorkerUrl,
        recipe: { wikiSlug: "daemon" } satisfies WikiRecipe,
        grants: {
          islandUrl: assembly.islandHandle.url,
          // The daemon island's OWN bag (daemon = wikiBagUri("daemon"), one-recipe model).
          wikiUrl:   social.daemonUrl,
          // ACCESS grant, not a LOAD slot — the worker reaches the catalog registry via the accessor.
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
        // slug rides as a structured `slug` arg — from the CLI / MCP, OR from a DOM
        // verse-event whose `arg-slug` field the reaction-router lifted into the args
        // payload (#48 unified the DOM path onto the CLI's structured-args contract).
        const slug = String(args["slug"] ?? "");
        if (!slug) throw new Error("wiki-switch: `slug` required");
        const active = await wikiActivation.ensureActive(slug);
        if (active) {
          activeSurfaceId = slug;   // flip the projection gate to the now-live wiki
          void daemon.placeVerb({ verb: "open-wiki", args: { slug }, requestedBy: "wiki-switch" });
          pushSwitcherState();      // reflect the new surface into the daemon widget
        }
        return { verb: "wiki-switch", slug, active, held: [...wikiActivation.held()] };
      });
      // wiki-hold / wiki-release — the ROTATABLE active-wiki pin (budget-enforced by the
      // cap: the daemon bag always + pinBudget rotatable; browser grant = one). The switcher's pin.
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
      // which surface holds the projection. The daemon widget's state-tiddler reads this.
      registry.register("wiki-active", async () => {
        const active = vmManager.inspect().filter((s) => s.temperature === "wela").map((s) => s.wikiId);
        return {
          verb: "wiki-active", active, held: [...wikiActivation.held()], activeSurface: activeSurfaceId,
          activationCap: wikiActivation.grant.activationCap, pinBudget: wikiActivation.grant.pinBudget,
        };
      });

      // ── The PERSONA surface (the multitude-of-one door) ─────────────────────────
      // The isomorphic mirror of the wiki-switcher: main holds the IDB persona vault, so
      // these verbs DRIVE it (list / mint / wear) and reflect the fresh state into the
      // daemon persona surface via pushPersonaState. A projected click routes here exactly
      // as wiki-switch does (worker delegates the unknown verb to the main registry).

      // persona-refresh — repaint the surface from the live vault (idempotent read + push).
      registry.register("persona-refresh", async () => {
        void pushPersonaState();
        const roster = await listBrowserPersonaRoots(idbName);
        const active = await loadBrowserActivePersona(idbName);
        return { verb: "persona-refresh", roster, ...(active !== undefined ? { active } : {}) };
      });

      // persona-mint — mint a new persona-root at the NEXT index and set its DEFAULT private
      // pet-name (PRIVATE-all — the label never PUBLICLY federates; only a publicly announced Handle
      // binds a persona to a glamour, and that stays a SEPARATE explicit act, never auto-fired here).
      // The mint names the face for the human, who renames it through the pet-name store's own private
      // bag: a label typed into a projected field would travel a render surface with no way to tell a fleet
      // peer from a stranger, and the label is PRIVATE. Next index = max(held) + 1, or 0 when the
      // vessel holds no root (a joinee founding its first face).
      registry.register("persona-mint", async () => {
        const roster = await listBrowserPersonaRoots(idbName);
        const nextIndex = roster.length ? Math.max(...roster) + 1 : 0;
        const root = await generateOrLoadBrowserPersonaRoot(idbName, nextIndex);
        const petnames = await makeBrowserPersonaPetnameStore(idbName);
        await renameOwnPersona(petnames, nextIndex, `persona-h${nextIndex}`);
        void pushPersonaState();
        return { verb: "persona-mint", index: nextIndex, created: root.created };
      });

      // persona-wear — don the face at `index` (reboot-to-switch, one-face-to-mesh). FAIL CLOSED
      // on custody: wearBrowserPersona REFUSES when this vessel holds no root at that index (the
      // custody-by-type wall — sign only as a persona whose sovereign secret this vessel carries).
      // Wearing moves only the selector pointer; the worker BINDS the worn persona at boot
      // (browserJoineePersonaIndex feeds openDaemon), so the switch lands on the next reboot —
      // rebootRequired names that for the app shell (the reboot itself is the caller's act).
      registry.register("persona-wear", async (args) => {
        const index = Number(args["index"]);
        if (!Number.isSafeInteger(index) || index < 0) throw new Error("persona-wear: valid `index` required");
        await wearBrowserPersona(idbName, index);   // custody-gated — throws when no root held
        void pushPersonaState();
        return { verb: "persona-wear", index, rebootRequired: true };
      });

      // ── The FOLLOW surface (the IoC social-graph door) ──────────────────────────
      // The follow-graph's SOURCE OF TRUTH rides the sovereign circles doc, held in the daemon WORKER: the
      // FOLLOW-GRAPH verbs (circle-add / circle-remove / circle-list) live there (registered by the shared
      // operator-daemon-behavior), reaching the circles doc by access and writing-then-syncing. The circles doc is PRIVATE +
      // fleet-synced same-operator (a follow shows on ALL the operator's own devices) and NEVER federates. A
      // projected unfollow click carries the row's nym + circle straight to the WORKER `circle-remove` verb
      // (verse-event → placeVerb → the worker dispatcher, which shadows any main reactor); it self-renders the
      // surface from the circles doc. FOLLOWING a NEW nym needs a nym + a self-certifying card (recognition, fail-
      // closed) — the `lares circle` CLI / the exported composeFollow, never a projected text field.

      // circle-refresh — repaint the follow surface FROM the circles doc (the worker `circle-list` reads + renders it).
      registry.register("circle-refresh", async (args) => {
        const circleId = String(args["circle"] ?? CIRCLE_PANEL_DEFAULT) || CIRCLE_PANEL_DEFAULT;
        pushCircleState(circleId);
        return { verb: "circle-refresh", circle: circleId, federated: false };
      });

      // wiki-sense (the supervision reads) — the daemon's supervision READ-verbs over the islands this vessel's pool
      // actually holds. The shores ARE the supervision grant: designation resolves through the pool
      // alone (confused-deputy ward — a name outside the pool fails loud at both ends), and the
      // proof-hold writes into the daemon's OWN daemon layer (local, self-sovereign). The daemon
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
      // A face's planes pin under the face's own names — the vessel pins what it actually mounted.
      const pinFace = social.personaBagId ? personaSiblingBagIds(social.personaBagId) : null;
      if (pinFace) {
        void residency.pin(pinFace.identities, "boot:identities");
        void residency.pin(pinFace.circles,    "boot:circles");
        void residency.pin(pinFace.sessions,   "boot:sessions");
      }
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
            verb, args: verbArgsFromPayload(msg.payload),   // structured args off the `verb-args` JSON (#48)
            requestedBy: typeof msg.payload["requestedBy"] === "string" ? msg.payload["requestedBy"] : msg.listenable,
            listenable: msg.listenable, ...(fromUri ? { fromUri } : {}),
          });
        },
        ...(workerScriptUrl ? { workerScriptUrl } : {}),
      });
      // Wire the pool through the SHARED residency factory: resolveWikiSpec (the UNKNOWN-grain
      // branch of the true multi-wiki swap) + the activation-on-reference cap (browser's minimal
      // grant) + the sovereign-worker residency binding (daemon evict routes THROUGH the ONE
      // collector) + wiki-alert delivery (the resolver-as-activator single-flight orchestration;
      // browser's hook WARNS + drops best-effort — no durable mailbox). The pool keys a slot by
      // its BARE SLUG (`slotActiveWikiId = sel.slug`), and the shared wiring keys the alert on
      // that same bare slug — never `${hostId}:${wikiSlug}`, which would fork the keyspace and
      // lose every alert. Browser resolves within its minimal grant exactly like node.
      wikiActivation = residencyWiring.wireToPool({
        daemon,
        pool:          vmManager,
        coreHash:      assembly.coreHash,
        islandUrl:     assembly.islandHandle.url,
        catalogHandle: assembly.catalogHandle,
      });
      // The daemon inherits the render cap (dormant-mounted at boot). Forward its frames into the SAME
      // #projection sink the pool wikis use — gated on the active-surface pointer, so a summoned daemon paints
      // and otherwise its frames drop. One sink, the daemon a peer surface among the wikis (KA·BA braid).
      daemon.onProjection((frame) => {
        if (activeSurfaceId === DAEMON_SURFACE_ID) onProjection?.(frame);
      });
      // The daemon's OWN verb OUT-path (a projected switcher click → wiki-switch /
      // add-bag / remove-bag): re-enter the dispatcher via placeVerb so the verb runs on
      // the main registry. LOOP-SAFE as of #48: the reaction-router fires a verb
      // verse-event ONLY on a tiddler carrying the `lares-dispatch` marker, which the verb
      // machinery's own invocation/outcome writes never set — so re-forwarding cannot loop.
      // Summon args ride the structured `verb-args` payload, not the URI (bearing-only).
      const DAEMON_SURFACE_VERBS_LIVE = true;   // #48 loop-safe dispatch — live
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
      // Presence — ephemeral, does not travel via CRDT. The PLACE announces itself, never a face:
      // being-as-place costs nothing civic, so a vessel key is the right thing to be seen by here.
      // Carried in the canonical DID form (`0x` + verifying key) so the field holds what it names.
      wikiHandle.broadcast({ did: `0x${vesselVerifyingKey}`, ts: Date.now() });
      // Boot DEMOTED to a pin (browser gradient): the daemon surface stays always-live
      // on its own; the home wiki registers in the ONE collector as a PINNED `wiki` grain
      // (the single rotatable pin this constrained vessel grants besides the daemon bag).
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
    daemonDocUrl:     social.daemonUrl,
    hearthDaemonUrl:  social.hearthDaemonUrl ?? null,
    oracleDocUrl:     result.assembly.islandHandle.url,
    larariumDocUrl:   result.assembly.larariumHandle?.url ?? null,
    phase:            "live",
    engineUpdated,
    admittedToNexus,
    // The return-leg routes to whichever surface is LIVE-active (read the pointer, never a captured value —
    // the seat routes the next event to whatever holds focus). daemon → its own worker; else the pinned wiki.
    sendDomEvent: (renderId, eventType, fields) =>
      activeSurfaceId === DAEMON_SURFACE_ID
        ? daemon.sendDomEvent(renderId, eventType, fields)
        : vmManager.placeWikiEvent(slotActiveWikiId, { renderId, eventType, fields }),
    sendDomInput: (renderId, eventType, value) =>
      activeSurfaceId === DAEMON_SURFACE_ID
        ? daemon.sendDomInput(renderId, eventType, value)
        : vmManager.placeWikiInput(slotActiveWikiId, { renderId, eventType, value }),
    // The uniform pin-selector: flip the live gate synchronously (mount-then-flip — daemon + the pinned wiki
    // are already mounted), then persist the choice fire-and-forget to bags/daemon/active-wiki (read only at next
    // cold boot). No reboot — an active-surface change is a projection-gate flip, not a manifest rebuild.
    setActiveSurface: (surfaceId: string) => {
      activeSurfaceId = surfaceId;
      void daemon.placeVerb({
        verb: "open-wiki",
        args: { slug: surfaceId },
        requestedBy: "summon",
      });
      // Summoning the daemon: seed its switcher list + persona multitude with the live state so
      // the projected widgets paint a current view the moment the daemon becomes the surface.
      if (surfaceId === DAEMON_SURFACE_ID) { pushSwitcherState(); void pushPersonaState(); void pushCircleState(); }
    },
  };
}
