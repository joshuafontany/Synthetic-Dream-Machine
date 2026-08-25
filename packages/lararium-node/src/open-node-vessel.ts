/**
 * openNodeVessel — local-first Node.js vessel factory.
 *
 * A thin opener over the composable-keel engine. Node supplies the platform atoms (NodeFS storage,
 * WS relay + DaemonAuthGate, worker_threads pool) and the capability pieces it holds (the inbound
 * gate, the corpus loader, the residual pool/repo verbs, the main-resident BagStowage mechanism).
 *
 * `prepareNodeBoot` builds those atoms + the keel + the boot closures ONCE, and BOTH entry-points
 * run it: the doors differ only in which #has-cap-stack they compose over the one preparation.
 *   - openNodeVessel → composeLararium — a hearth: the base course plus the caps a FACE lifts.
 *   - openNodeHerm   → composeHerm     — a crossroads: the base course plus the caps an HTTP floor
 *     serves. No wiki, no pool; the daemon stays, the immune core every vessel carries, and its
 *     registerBags omits the user-wiki bags where no wiki stands.
 * Each stack is declared at its compose site and derived by `composeVessel`; read it there.
 *
 * The node vessel holds no semantic privilege. It carries roads, docks, and sync; live VM state lives
 * in sovereign islands (daemon + wiki). FPI-5 (trim tab): all Node-specific code lives here.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { larBootstrapPath } from "./vessel-paths.js";
import { join }                         from "path";
import type { Server }                  from "node:http";
import type { DocHandle, AutomergeUrl, DocumentId } from "@automerge/automerge-repo";
import { Repo }                         from "@automerge/automerge-repo";
import { DurableNodeFSStorageAdapter } from "./durable-storage-adapter.js";
import { NodeWSServerAdapter }          from "@automerge/automerge-repo-network-websocket";
import type { WebSocketServer }         from "isomorphic-ws";
import type {
  LarDoc,
  LarariumVesselOptions, VesselResult, LarOpenPhase,
  VesselBootstrap, VesselCoreAssembly,
  CompositeStore, DiskMirrorGrant,
} from "@lararium/mesh";
import {
  makeDurableMailbox,
  type DurableMailbox,
  OpenIdentitySlot,
  emptyLarDoc, mutableLarRecord, tiddlerText,
  ORACLE_DOC_URI, LARARIUM_DOC_URI, CATALOG_DOC_URI, LARES_DOC_URI, CROSSROADS_DOC_URI, recipeHostFacets,
  DAEMON_BAG_ID,
  BAG_IDS, slugFromUri, verbArgsFromPayload, registerCrossroadsInOracle,
  whoFaceCap, materializeSharedLarDoc, crossroadsDocUrl,
  PERSONA_GROUP_DOC_ID_TIDDLER, PERSONA_GROUP_AGENT_ID_TIDDLER, MESH_CABAL_DOC_ID_TIDDLER,
  SIGNER_DID_TIDDLER, DEVICE_DELEGATION_SELF_TIDDLER, PERSONA_KEL_PREFIX_TIDDLER, type DeviceDelegationTiddler,
  ENGINE_CORE_ID, BagStowage, pluginCidsFromIslandBlobs,
  deriveRegisterBags, catalogNamedBags, personaBagIdFor, personaSiblingBagIds, readPersonaPlanes, mountedPlaneBagId, personaPlanesFault, type PlaneEntry,
  coupleMesh, crystallize, guardHitl,
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
import { LarEventBusImpl, DEFAULT_RINGS, DeterministicFederationGate, federationPostureFromDoc, sealLineageHead, utf8Bytes } from "@lararium/mesh";
import type { SparseFormVector, WorldlineStubWire, AntigenRing, FederationGate, FederationPosture, NexusMembership, PeerClass } from "@lararium/mesh";
import { selfSlotShareDecision } from "./self-slot-share.js";
import { makeAntigenRingHolder } from "./antigen-ring.js";
import { makePersonaKelRingHolder } from "./persona-kel-ring.js";
import { makeNexusMembership } from "./nexus-carriage.js";
import { runNexusRefresh } from "./nexus-refresh.js";
import { rollLeaseEpochOnBoard } from "./lease-rekey.js";
import { listSealedCids } from "./cas-reshare.js";
import { readBulbArtifact, type BulbArtifact } from "./bulb.js";
import { readNexusDoc } from "./nexus-doc.js";
import { makeSealedPlaneRegistry } from "./plane-seal.js";
import type { NexusConvergenceKeyring } from "./nexus-convergence-keyring.js";
import { standNexusKeyring } from "./nexus-convergence-secret-store.js";
import { cadSealDir, sealCarrierForFederation } from "./seal-carrier-federation.js";
import { makeBagTracker } from "./bag-tracker.js";
import { startCarriageServeLoop, type CarriageServeLoop } from "./carriage-serve-loop.js";
import { startCarriageRelay, resolveRelayGateSeed, type CarriageRelay } from "./carriage-relay.js";
import { maybeStartNexusClientDial, type NexusClientDial } from "./nexus-client-dial.js";
import { loadLeafIdentity } from "./leaf-identity.js";
import { readCasBlobFromFs } from "./node-cas.js";
import { makeSourceCapture, type SourceCapture } from "./capture-source.js";
import { VesselIslandPool, NODE_WIKI_ACTIVATION_CAP } from "./vessel-island-pool.js";
import { runFlow } from "./flow-run.js";

/** Node advertises a few rotatable wiki pins BESIDES the daemon bag (resource-rich vessel).
 *  The user's ONE-plus rotatable pin(s) ride this budget; the surface enforces it. */
const NODE_WIKI_PIN_BUDGET = 3;
import { larSealHome, larStructurePalaceDir, larFormPalaceDir, memorySensoriumDir, meshSensoriumDir, larContentDir, sensoriumDir }  from "./vessel-paths.js";
import { makeFormPalace, type FormPalace, makeStructurePalace, type StructurePalace }  from "./sensorium.js";
import { readCoupling } from "./sensorium-coupling.js";
import { readCohere } from "./sensorium-cohere.js";
import { readJing } from "./sensorium-square.js";
import { extractSignalFromTarget } from "./sensorium-signal.js";
import {
  rosterSensoria, inspectSensorium, buildEphemeralSensorium, promoteSensorium,
  retireSensorium, unRetireSensorium, purgeSensorium, reconcileSensorium, reconcileAllSensoria,
} from "./sensorium-lifecycle-verbs.js";
import { makeRecallHolder, type RecallHolder } from "./recall-holder.js";
import { makeContentPalace, type ContentPalace } from "./sensorium.js";
import { multiGraphRecall, makeFormSearch, makeStructureSearch }  from "./sensorium-recall.js";
import { waitHandle, resolveBootDoc } from "./repo-helpers.js";
import { makeChildProcessDocLoadProbe, quarantineDoc, recoverCleanTail } from "./doc-load-probe.js";
import { loadIdentityArchive } from "./identity-anchors.js";
import { archiveOpens } from "./archive-passphrase.js";
import { openDaemonVm }                    from "./open-daemon-vm.js";
import {
  makeResidencyStatsReactor,
  makeVesselResidency, type VesselResidency,
} from "@lararium/tw5";   // residency stats — the lone read that stays main-resident; the shared residency/pool-wiring factory
import { generateOrLoadVesselIdentity, loadVesselSigningSeed } from "./node-vessel-identity.js";
import { DaemonAuthGate }                           from "./daemon-auth-gate.js";
import { composeLararium, composeHerm, carriageStack, type MeshSelf } from "./node-caps.js";

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
 * unparseable document yields null (the worker keeps the turn's TIME slot, form null). The node-side
 * reads live here; the trajectory read itself runs in the sovereign worker.
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

/**
 * What the operator ASKS this vessel to stand as — the first argument `standAs` weighs.
 *
 * A vessel composes by what it EARNS, never by a type it declares: every one stands as a herm and lifts to a
 * hearth when a face stands. So this DECLINES the lift ("herm" — a public crossroads meant to stay faceless)
 * or leaves it open; it never selects a different kind of thing.
 *
 * The word "recipe" belongs to the pinned WIKI's composition and to nothing else.
 */
export type AskedStanding = "lararium" | "herm";

export interface NodeVesselOptions extends LarariumVesselOptions {
  storageDir: string;
  wss:        WebSocketServer;
  catalogUrl?: string | null;
  /** Directory holding the BAKED GENESIS SEED (island + cas). The bootstrap no longer lives here. */
  genesisDir?: string;
  /** Repo root for wiki memes scan and all mirror paths. Defaults to monorepo root. */
  rootDir?: string;
  /** HTTP server the Herm's FLOW-map read-face serves over (required for openNodeHerm). */
  httpServer?: Server;
  /** This vessel's mesh standing — derived once via deriveMeshSelf. Present → it self-announces,
   *  self-peers, re-ranks by proximity + drifts r (a Lararium carries ALONGSIDE its wiki-full core; a
   *  Herm IS its carriage). Absent → a leaf that only carries what it pulls. */
  meshSelf?: MeshSelf;
  /** Carriage pull cadence (ms) — tuning, kept separate from membership. */
  pullIntervalMs?: number;
  /** The CARRIAGE-relay URL (Socket B, ciphertext) the vessel dials to serve sealed cad bodies to members.
   *  ABSENT (and `LAR_CARRIAGE_RELAY` unset) → NO carriage socket opens, NO serve-loop stands (provably inert). */
  carriageRelayUrl?: string;
  /** The carriage serve-loop poll cadence (ms) — how promptly a member's want-block draws a serve turn. */
  carriagePollIntervalMs?: number;
  /** STAND a carriage relay (Socket B, ciphertext CROSSROADS) so a family's hearths dial THIS vessel to carry sealed
   *  cad bodies between each other — the Herm's Lares-Viales role (a running Herm IS a crossroads). The port the
   *  relay BINDS (0 → an OS-assigned free port; a Pi deployment pins a stable one). ABSENT (and `LAR_HERM_RELAY_PORT`
   *  unset) → NO relay socket stands, boot behaves exactly as today (provably inert). SEPARATE from `carriageRelayUrl`
   *  (that DIALS a relay as a client; this STANDS one as the crossroads). */
  standCarriageRelayPort?: number;
  /** The relay's gate seed hex (32 bytes) — a dialing hearth binds its proof-of-possession to this key's PUBLIC half.
   *  ABSENT → derived from the vessel's OWN identity seed (stable across restarts, so hearths keep dialing the same
   *  key). NEVER a fresh random per boot. Only read when `standCarriageRelayPort` (or its env) is set. */
  standCarriageRelayGateSeedHex?: string;
  /** The peer node's `/ws` URL (Socket A, cleartext CRDT) this vessel DIALS to sync — the same-operator device
   *  breath. ABSENT (and `LAR_JOIN_SYNC` unset) → NO client adapter mounts, NO dial, zero change (provably inert). */
  joinSyncUrl?: string;
  /** The DIALED peer's gate verifying-key hex — the gate-binding the outbound V3 proof commits to (out-of-band,
   *  NEVER trusted from the wire). REQUIRED alongside `joinSyncUrl`; absent → fail-closed to inert (no dial). */
  joinGatePubKey?: string;
  /** OPTIONAL island/doc URL the dial-out `repo.find()`s once mounted — consumes the device-admit payload's
   *  `islandDocUrl`. Absent → the vessel syncs only docs it already knows. */
  joinDocUrl?: string;
}

export interface NodeVesselResult extends VesselResult<VesselIslandPool, DaemonVmCore> {
  /** Started event bus — ingress rings registered; tick loop running at 20 Hz (node substrate). */
  eventBus:  LarEventBusImpl;
  /** Stop the N-accumulator tick loop (call on graceful shutdown). */
  stopTick:  () => void;
}

/** A composed Herm (wiki-less): the daemon immune core + a served meshpalace FLOW-map, no pool. */
export interface NodeHermResult {
  repo:             Repo;
  store:            CompositeStore;
  daemon:           DaemonVmCore;
  oracleDocUrl:     string;
  catalogHandleUrl: string;
  larariumDocUrl:   string | null;
  phase:            "live";
  /** The bound port the STOOD carriage relay (Socket B crossroads) listens on — `null` when no relay was configured
   *  (inert). The operator hands a hearth `ws://<host>:<port>` from this. */
  carriageRelayPort:       number | null;
  /** The stood carriage relay's gate verifying-key hex — the key a dialing hearth binds its proof to (out-of-band).
   *  `null` when no relay was configured. The operator hands a hearth this alongside the URL. */
  carriageRelayGatePubKey: string | null;
  /** Tear down the read-face + the daemon island, then the composed vessel (reverse build order). */
  dispose:          () => Promise<void>;
}

const blankMemeStore = (repo: Repo): (() => DocHandle<LarDoc>) =>
  () => repo.create<LarDoc>(emptyLarDoc());

/** The atoms + keel + boot closures both node cap-stacks compose over (built ONCE per boot). */
interface NodeBootPrep {
  repo:             Repo;
  catalogHandle:    DocHandle<LarDoc>;
  /** This vessel's own daemon doc — the plane a caller writes a verb SUMMONS onto (VesselResult carries it
   *  out, so a host surface can ask this vessel rather than only render it).
   *
   *  A THUNK, like every other late-bound member here: the bootstrap lands inside `loadGenesis`, which runs
   *  well after this prefab is built. Reading it at construction time reads `undefined` — and a FACELESS
   *  place, which stands with no bootstrap at all until a face is lit, is where that shows. */
  daemonDocUrl:     () => string;
  /** The HEARTH this vessel asks for a seat — null when it holds its own face and IS the hearth. A thunk for
   *  the same reason. */
  hearthDaemonUrl:  () => string | null;
  /** This PLACE's own 32-byte signing seed — the substrate key, never the human's. The two-key atom keeps it
   *  distinct from the persona root a device-delegation edge signs under (`device-delegation.vesselSeed`). */
  vesselSeed:     Uint8Array;
  /** This vessel's own gate key — the node ANCHORS its confederation, so its gate key doubles as the Nexus
   *  key its browser leaves pass as relayGatePubKey. Every per-Nexus board (WHO, KEL, antigen) scopes to it. */
  nexusPubkey:      string;
  residency:        BagStowage;
  /** The carriage serve-loop (Socket B) — present ONLY when a carriage-relay URL was configured; else null (inert).
   *  The two vessel entry-points fold its `stop()` into their teardown so no timer / socket leaks past close. */
  carriageLoop:     CarriageServeLoop | null;
  /** The STOOD carriage relay (Socket B CROSSROADS) — present ONLY when a relay port was configured; else null
   *  (inert). A running crossroads a family's hearths dial to carry sealed cad bodies between each other. The two
   *  vessel entry-points fold its `close()` into their teardown so no WS server / peer socket leaks past close. */
  carriageRelay:    CarriageRelay | null;
  /** The client dial-out (Socket A) — present ONLY when a peer sync URL + gate key were configured; else null
   *  (inert). The two vessel entry-points fold its `stop()` into teardown so no client socket leaks past close. */
  nexusDial:        NexusClientDial | null;
  /** The HELD bulb (genesis seed + CAS + bootstrap, epoch-PINNED) this vessel can serve over the public floor —
   *  null when the genesis is absent. A Herm serves it by cid so a stranger kindles their OWN sovereign hearth. */
  bulb:             BulbArtifact | null;
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
 * identity, residency mechanism) + the keel + the VM-focused closures (wiki-slot, daemon,
 * verbs, pool, after-hooks). NO sequencing here — `composeLararium`/`composeHerm` wire the order.
 */
async function prepareNodeBoot(opts: NodeVesselOptions): Promise<NodeBootPrep> {
  const { hostId, wikiId, storageDir, wss, catalogUrl, onPhase, genesisDir, rootDir: rootDirOpt } = opts;
  const bootstrapPath = larBootstrapPath();   // <lares>/vessel — beside the docs it addresses
  const emit = (p: NodeOpenPhase) => onPhase?.(p);

  emit("boot");

  // ── 1. Repo — NodeFS storage + WebSocket relay behind the DaemonAuthGate ─────
  const storage = new DurableNodeFSStorageAdapter(storageDir);
  const authGate = new DaemonAuthGate(wss);
  const network  = new ListeningWSServerAdapter(authGate as unknown as typeof wss);
  const peerIdentifierMap = new Map<string, string>();
  // The self-slot CLASS map — peerId → the class the keyholder vouched at admission. Populated in the
  // SAME microtask as peerIdentifierMap so that by the time the outer admission gate sees a peer in
  // peerIdentifierMap (its admit condition), the class is already keyed — no read-before-set window for
  // an admitted same-operator peer. A WS peer absent here (or present-but-not-same-operator) reads as the
  // stricter cross-operator class at the sharePolicy (fail-closed).
  const peerClassMap = new Map<string, PeerClass>();
  network.on("peer-candidate", ({ peerId }: { peerId: string }) => {
    queueMicrotask(() => {
      const socket = (network.sockets as Record<string, unknown>)[peerId];
      if (socket) {
        const identHex = authGate.getIdentifierForSocket(socket as Parameters<typeof authGate.getIdentifierForSocket>[0]);
        if (identHex) peerIdentifierMap.set(peerId, identHex);
        const cls = authGate.getClassForSocket(socket as Parameters<typeof authGate.getClassForSocket>[0]);
        if (cls) peerClassMap.set(peerId, cls);
      }
    });
  });
  // The #59 antigen ring — the live Kapae-immune consult. Forward-declared here (the sharePolicy closes
  // over it) and STOOD once the operator's own nym (its Nexus key) is loaded, below. A null ring denies
  // nobody (a denylist's absence = no bans), so the boot window before the ring stands is correctly inert.
  let antigenRing: AntigenRing | null = null;
  // The self-slot FEDERATION gate — the federatable-own/private-own classifier for a CROSS-OPERATOR peer.
  // Forward-declared (the sharePolicy closes over it) and STOOD once the operator's own nym is loaded,
  // below (the nexus pubkey it addresses the federatable planes from). Null keeps the pre-classification
  // boot window inert (no peer gated) — correct: no doc crosses to any WS peer until the gate arms anyway.
  let selfSlotFedGate: FederationGate | null = null;
  // The nexus-doc MEMBERSHIP consult — the carry-split's member gate (a cross-operator MEMBER blind-transits a
  // sealed plane; a STRANGER reaches only the public shelf). Forward-declared (the sharePolicy closes over
  // it) and STOOD once the operator's own nym is loaded, below. Null keeps every cross-operator STRANGER
  // (public-read only) through the boot window — the fail-closed default (a node never assumes Nexus-pono).
  let nexusMembership: NexusMembership | null = null;
  // The per-Nexus federation POSTURE — read as-of-last-sync off the nexus doc. Default PRIVATE
  // (fail-closed): the pre-read boot window denies every cross-Nexus foreign operator co-federation. STOOD
  // once the operator's own nym + bags dir are known, below; a live posture-flip re-reads on membership refold.
  let federationPosture: FederationPosture = "private";
  // THE SEAL-PRODUCER — a LIVE sealed-plane registry, empty at boot (fail-closed: behaves EXACTLY as
  // DENY-ALL until the encrypt-on-CAS installer seals a body). `sealRegistry.seal` is the oracle the
  // sharePolicy closes over; the moment `installSealedBody(sealRegistry, …)` seals a cad body, its docId
  // registers here AS A SIDE-EFFECT and the member blind-transit lane opens for that ciphertext body. A
  // cleartext body reaches no encrypt path → never registers → a doc can never self-label sealed.
  const sealRegistry = makeSealedPlaneRegistry();
  // THE PER-NEXUS CONVERGENCE KEYRING — the SOURCE the cad seal message-locks against (fork-② = A2, operator-
  // ruled 2026-07-21). Forward-declared null and STOOD once the operator's own nym + the charter epoch are known:
  // the private-lane admission handoff (the SAME lane the read-caps ride, below) delivers the `{epoch → secret}`
  // keyring; `makeNexusConvergenceKeyring(entries)` stands it here. A null keyring keeps the boot window — and any
  // member never handed a keyring — FAIL-CLOSED: `installSealedBody` reads `keyring.current()`, which throws on an
  // absent/empty keyring, so the body stays local/unsealed (never a plaintext body registered sealed). The
  // custody + distribution of that keyring over the private lane is the admission shore this name marks; it does
  // NOT stand a Nexus-scope CGKA group (the exporter north-star, deferred — see nexus-convergence-keyring.ts).
  // The admission-delivery wiring RIDES THE PERSISTED STORE: `openAdmitFlow` (persona-admit) opens the founder's
  // sealed keyring envelope and `installDeliveredKeyring` writes the founder's `{epoch → secret}` set into THIS
  // vessel's identity home AUTHORITATIVELY (the delivered secret supersedes a self-minted phantom). `standNexusKeyring`
  // below reads that persisted set FIRST (minting only an absent head epoch), so the delivered keyring becomes the
  // one BOTH `cad-seal` (the seal producer) and any keyring-read path resolve — every path threads this ONE variable.
  // NO-GLOBAL-NOW: an admission that lands out-of-process reaches THIS running vessel at its next stand of the store.
  let nexusConvergenceKeyring: NexusConvergenceKeyring | null = null;
  const repo = new Repo({
    storage,
    network: [network],
    // Two rings: WS peers (outside) must have passed the DaemonAuthGate; the
    // vessel's OWN islands (MessageChannel peers — daemon + wiki workers) are
    // house members and share freely. Without the island ring, main never
    // relays daemon-island-minted docs (personal/draft bindings) to the wiki
    // island and its slot-resolve hangs at boot.
    //
    // V5 SYMMETRY: this WS ring gates at the PEER (gate-passed vs not); the browser
    // leaf gates at the DOC (a deny-by-default FederationGate, since a leaf cannot
    // run a gate). Both are the same shore at two resolutions — the V5 KeyhiveIdentitySlot
    // composes verifyCapability(docUrl, ability) as the INNER ring here (per-doc caps
    // behind the per-peer admission), matching the browser's FederationGate call site.
    sharePolicy: async (peerId, documentId) => {
      const wsSocket = (network.sockets as Record<string, unknown> | undefined)?.[peerId];
      // OUTER peer-admission gate (unchanged): a WS peer that never passed the DaemonAuthGate is not in
      // `peerIdentifierMap` → deny; an in-process island peer (no WS socket) is a house member → admit.
      if (wsSocket && !peerIdentifierMap.has(peerId)) return false;
      // THE SELF-SLOT SPLIT — federatable-own vs private-own, keyed on the class the keyholder vouched
      // (selfSlotShareDecision holds the whole law + fail-closed default). A same-operator WS peer and
      // every in-process island peer full-sync; a cross-operator/unclassified WS peer reaches only the
      // deterministically-federatable planes; the antigen draws Mu on a Kapae'd presenter regardless.
      return selfSlotShareDecision({
        hasWsSocket:     !!wsSocket,
        peerClass:       peerClassMap.get(peerId),
        selfSlotFedGate,
        antigenRing,
        // THE CARRY-SPLIT — a cross-operator MEMBER (per the nexus-doc consult) blind-transits a PROVABLY-sealed
        // private plane (carry ciphertext, never the read-cap); a STRANGER reaches only the federatable shelf.
        // planeSeal is DENY-ALL today (the sync wire carries cleartext — no plane is provably sealed), so the
        // member lane stands ready but inert; it opens the moment a sealed plane type (cad/BeeKEM) registers.
        membership:      nexusMembership,
        // THE LIVE SEAL ORACLE — reads the current sealed set (fail-closed empty ⇒ DENY-ALL). A cad ciphertext
        // body sealed by `installSealedBody` registers its docId here; the member lane then blind-transits it
        // (carry the ciphertext, never the read-cap — the read-cap rides the private keyhive lane).
        planeSeal:       sealRegistry.seal,
        // THE POSTURE OUTER GATE — PRIVATE (default) denies a cross-Nexus (non-member) foreign operator ALL
        // co-federation; OPEN lets a proof-carrying foreign operator reach the public shelf (never a private plane).
        federationPosture,
        peerId,
        documentId: documentId as DocumentId | undefined,
      });
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
  const vesselIdentity = await generateOrLoadVesselIdentity(storageDir);
  const vesselSeed     = await loadVesselSigningSeed(storageDir);

  // ── The #59 antigen ring — STOOD now the operator's own verifying key is loaded ─────────────
  // The node IS the confederation anchor: its own gate key IS its Nexus key (the same key browsers
  // pass as relayGatePubKey, and the deterministic antigen-board id is a pure function of it). The
  // holder resolves the always-carried antigen board, folds the quorum-signed bans against the
  // founding-kahu roster read off `bags/nexus` (LAR_BAGS ?? <root>/bags), and re-folds on every board
  // change. FAILS CLOSED: an unseated charter → empty roster → nothing Kapae'd (no quorum, no bans).
  // The Nexus SEAL homes PER-OPERATOR (`<lares>/nexus`), never in the corpus bags tree: a seal sited in the
  // corpus inherits that tree's home, which on a development install sits inside the repository. The seal
  // belongs to the operators who founded it, so it survives every substrate wipe beside the sovereign root
  // and travels with neither a clone nor a `reset`.
  const sealHome = larSealHome();
  const antigenHolder = makeAntigenRingHolder({
    repo,
    nexusPubkey:       vesselIdentity.verifyingKey,
    sealHome,
    peerIdentifierMap,
  });
  antigenRing = antigenHolder.ring;

  // Stand the nexus-doc membership consult now the operator's own verifying key is loaded — the carry-split's
  // member gate. It reads the SAME `bags/nexus` charter roster the antigen folds against (the seated-kahu
  // keys as the conservative provable-member floor; see nexus-membership for the surfaced members-registry
  // fork) and resolves a peerId → nym off the same proven `peerIdentifierMap`. FAILS CLOSED: an unseated
  // charter → empty member set → every cross-operator STRANGER (public-read only), never a false member.
  // Fold the members BOARD (repo + nexusPubkey) atop the kahu floor — this LIGHTS SELF-SLOT-B: a general
  // contracted operator (members{}, not a kahu) now reads MEMBER, so the carry-split's member lane names it.
  // Keep the HOLDER (not just its `.membership` consult): the `nexus-refresh` main verb calls its
  // `refoldWithBoard` to re-fold the member union against an out-of-process CLI board write.
  const nexusMembershipHolder = makeNexusMembership({
    sealHome,
    peerIdentifierMap,
    repo,
    nexusPubkey:       vesselIdentity.verifyingKey,
  });
  nexusMembership = nexusMembershipHolder.membership;

  // Read the federation POSTURE off the nexus doc (as-of-last-sync). Default PRIVATE (fail-closed):
  // a cross-Nexus foreign operator co-federates ONLY when the operator flips the Nexus open. A live flip needs
  // a re-read (surfaced gap — boot-time read for alpha; the CLI `lares nexus posture` edits the doc).
  const nexusDocForBoot = readNexusDoc(sealHome);
  federationPosture = federationPostureFromDoc(nexusDocForBoot);

  // Read the HELD bulb off the genesis dir, EPOCH-PINNED to the charter chain-head — the ALL-PUBLIC cold-boot
  // snapshot a Herm serves so a stranger kindles their OWN sovereign hearth (serve fire, never key). Null when the
  // genesis is absent (nothing to hand). Read once at boot; the corm-lease pointer re-issues on the read-face breath.
  const bulb: BulbArtifact | null = readBulbArtifact(genesisDir ?? defaultGenesisDir(), nexusDocForBoot?.sealEpochCid ?? null, bootstrapPath);

  // STAND THE cad CONVERGENCE KEYRING — the cad seal's key source, minted for THIS vessel's charter-head epoch
  // (genesis = 0 when unseated) and persisted local (read-all). This fills the forward-declared shore: the vessel
  // now HOLDS a keyring, so the seal producer (`cad-seal`) can message-lock a carrier body's ciphertext. It seals
  // the vessel's OWN staged bodies for the FEDERATION plane; STAGE-2 admission delivery hands this keyring to a
  // joinee so a member reads too. FAIL-CLOSED elsewhere holds: absent this stand, `keyring.current()` throws and
  // the seal producer keeps a body cleartext-local (never plaintext sealed).
  const sealHeadEpoch = sealLineageHead(nexusDocForBoot)?.epoch ?? 0;
  nexusConvergenceKeyring = standNexusKeyring({ sealEpoch: sealHeadEpoch });
  // The relay-side discovery index the seal producer announces a sealed cid onto (DHT-free; hint → peers → tracker).
  const casBagTracker = makeBagTracker();

  // Stand the self-slot federation gate now the operator's own verifying key is loaded — the SAME nexus
  // pubkey the antigen board derives from. The gate's federatable surface is a PURE function of that key
  // (crossroads plane · WHO · kapae-antigen board — deny-by-default for every other doc), so a cross-operator
  // peer reaches exactly the always-carried public/infra planes and nothing private. No hand-maintained
  // allow-list; the private planes (catalog/personal/daemon/home/wikis) fall outside the set → DENY.
  selfSlotFedGate = new DeterministicFederationGate(vesselIdentity.verifyingKey);

  // ── The CARRIAGE serve-loop (Socket B, ciphertext) — INERT until a carriage-relay URL rides the config ──────
  // When configured, the vessel dials the carriage relay over an authenticated WS channel (proving `vesselSeed`)
  // and serves members' want-blocks for sealed cad bodies on a poll interval. The gate stays `serveCasWire`'s own
  // `carrierShareDecision` VERBATIM: a proven MEMBER over a provably-sealed plane carries the ciphertext; a
  // STRANGER / non-member / Kapae'd draws byte-identical Mu. Carry ⊥ read — the read-cap never rides this shore.
  // Socket B stays SEPARATE from the Automerge `/ws` relay (Socket A): cleartext CRDT never routes through here.
  // ABSENT the URL → this branch never runs, so no socket opens and boot behaves exactly as it did before.
  const carriageRelayUrl = opts.carriageRelayUrl ?? process.env["LAR_CARRIAGE_RELAY"] ?? null;
  const carriageLoop: CarriageServeLoop | null = carriageRelayUrl
    ? startCarriageServeLoop({
        relayUrl:     carriageRelayUrl,
        vesselSeed: vesselSeed,
        serverAddr:   vesselIdentity.verifyingKey,
        deps: {
          cadDir:     cadSealDir(storageDir),
          seal:       sealRegistry.seal,
          membership: nexusMembership,
          antigen:    antigenRing,
          fedGate:    selfSlotFedGate,
        },
        ...(opts.carriagePollIntervalMs !== undefined ? { pollIntervalMs: opts.carriagePollIntervalMs } : {}),
        // HEAL — on a RE-connect after a drop, re-fold the antigen + members boards + posture the vessel read
        // as-of-its-last-sync (a peer's bans/admits that landed during the partition). The SAME refold the
        // `nexus-refresh` verb runs; here it fires automatically when the carriage transport re-dials.
        onReconnect:  async () => {
          await runNexusRefresh({
            storageDir, sealHome, nexusPubkey: vesselIdentity.verifyingKey,
            antigen: antigenHolder, membership: nexusMembershipHolder,
            setPosture: (p) => { federationPosture = p; },
          });
        },
        onLog:        (line) => console.log(`[carriage] ${line}`),
      })
    : null;

  // ── The CARRIAGE relay (Socket B, ciphertext CROSSROADS) — INERT until a relay port rides the config ─────────
  // A running crossroads a family's HEARTHS dial (`ws://<host>:<port>`) to carry sealed cad bodies between each
  // other — the Herm's Lares-Viales role. The relay CARRIES opaque ciphertext envelopes, stamps each `from` with the
  // sender's PROVEN Ed25519 key, and holds the DHT-free bag-tracker HINT index — it reads NO plaintext, holds NO
  // read-cap / keyring / roster (carry ⊥ read ⊥ contract), so a compromised crossroads leaks nothing. Its gate seed
  // derives from the vessel's OWN identity seed (or a configured seed) — STABLE across restarts, NEVER fresh-random,
  // so hearths keep dialing the same key. This CROSSROADS (a stood WS server) SEPARATES from both the Automerge `/ws`
  // relay (Socket A, cleartext CRDT) and the client-side carriage serve-loop dial above. ABSENT the port → this
  // branch never runs, so no socket opens and boot behaves exactly as it did before (provably inert).
  const relayPortRaw = opts.standCarriageRelayPort ?? process.env["LAR_HERM_RELAY_PORT"];
  const relayPort = relayPortRaw !== undefined && relayPortRaw !== "" ? Number(relayPortRaw) : null;
  const relayGateSeed = resolveRelayGateSeed(vesselSeed, opts.standCarriageRelayGateSeedHex ?? process.env["LAR_HERM_RELAY_SEED"]);
  const carriageRelay: CarriageRelay | null = relayPort !== null && !Number.isNaN(relayPort)
    ? await startCarriageRelay({ gateSeed: relayGateSeed, port: relayPort })
    : null;
  if (carriageRelay) {
    console.log(`[carriage] crossroads relay standing — ws://<host>:${carriageRelay.port} · gate ${carriageRelay.gatePubKey}`);
  }

  // ── The CLIENT dial-out (Socket A, cleartext CRDT) — INERT until a peer sync URL + gate key ride the config ──
  // When configured, the vessel mounts a `LarWSClientAdapter` carrying the operator's OWN leaf identity onto the
  // running Repo and DIALS the peer node's `/ws`, so a same-operator second device syncs the private planes both
  // ways (the peer's gate vouches it `same-operator`; `selfSlotShareDecision` opens full sync). The dial rides the
  // Automerge `/ws` relay (Socket A) — the SAME transport the server adapter answers on, SEPARATE from the carriage
  // relay (Socket B). REAL crypto: the outbound proof binds to the peer's gate key (out-of-band, never the wire) and
  // carries the operator's own identity, never a forged one. ABSENT the config → no adapter, no dial, no change.
  const joinSyncUrl    = opts.joinSyncUrl    ?? process.env["LAR_JOIN_SYNC"] ?? null;
  const joinGatePubKey = opts.joinGatePubKey ?? process.env["LAR_JOIN_GATE"] ?? null;
  const joinDocUrl     = opts.joinDocUrl     ?? process.env["LAR_JOIN_DOC"]  ?? null;
  // The operator's OWN light leaf identity (cached ContactCard + bare-Ed25519 signer). A missing card (never
  // `lares vessel found`-ed) → skip the dial rather than crash the boot (fail-open to inert; a dial needs a real card).
  let nexusDial: NexusClientDial | null = null;
  if (joinSyncUrl) {
    try {
      const leafIdentity = await loadLeafIdentity(storageDir);
      nexusDial = maybeStartNexusClientDial({
        repo, syncUrl: joinSyncUrl, gatePubKey: joinGatePubKey, identity: leafIdentity,
        ...(joinDocUrl ? { docUrl: joinDocUrl } : {}),
        onLog: (line) => console.log(`[nexus-join] ${line}`),
      });
    } catch (e) {
      console.log(`[nexus-join] dial-out skipped — leaf identity unavailable (run \`lares vessel found\`): ${e instanceof Error ? e.message : String(e)}`);
    }
  }

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
  // the daemon bag) and supplies its vessel-specific hooks: it NARRATES a cool (browser stays silent),
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
    waitHandle: <T>(url: AutomergeUrl, fallback: () => DocHandle<T>) => waitHandle<T>(repo, url, fallback),

    // Genesis island (required) + the social-plane bootstrap it carries.
    loadGenesis: async () => {
      // Slice 2: the oracle island is a LIVE CRDT under a DETERMINISTIC doc id — reload
      // it when persisted (operator writes intact), else MATERIALIZE it fresh from
      // the plain-data seed (island.genesis.json). No Automerge-binary boot seed,
      // no merge-into-stale. The catalog registry's oracle pointer (written by assembleVessel)
      // serves as an advisory back-reference, not the identity mechanism.
      const islandHandle = await loadOrMaterializeOracle(repo, genesisDir);

      // lares + lararium system-bag mint — operator(admin) office, node home
      // only. Both pointers ride the oracle system plane (the island doc);
      // oracle island, lararium bag and lares bag stand as three separate docs. The corpus doc
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

      // Bootstrap URLs: the vessel's own social bootstrap (init node — authoritative),
      // falling back to the island oracle (replica vessels).
      let bootstrapPlugin: Record<string, unknown> | null = null;
      if (existsSync(bootstrapPath)) {
        try { bootstrapPlugin = JSON.parse(readFileSync(bootstrapPath, "utf8")) as Record<string, unknown>; } catch { /* malformed */ }
      }
      const bootstrapTiddlers: Record<string, { text?: string }> = bootstrapPlugin
        ? (JSON.parse(bootstrapPlugin["text"] as string) as { tiddlers: Record<string, { text?: string }> }).tiddlers
        : {};
      const id   = islandHandle.doc()?.tiddlers;
      const daemonUrl      = bootstrapTiddlers[DAEMON_BAG_ID]?.text       ?? tiddlerText(id?.[DAEMON_BAG_ID])       ?? null;
      // THE ONE RESOLUTION POINT on this platform. The vessel reads back the whole FAMILY of compartments
      // it carries, then resolves the gesture — "the one I stand in" — to that plane's absolute name.
      // Every reader downstream carries the name; none receives the gesture.
      const planeEntries: PlaneEntry[] = [
        ...Object.entries(bootstrapTiddlers).map(([title, t]) => ({ title, text: t?.text ?? null })),
        ...Object.entries(id ?? {}).map(([title, rec]) => ({ title, text: tiddlerText(rec) })),
      ];
      const personaPlanes  = readPersonaPlanes(planeEntries);
      // A family that could shadow itself never boots. One group entered twice derives ONE bag id and
      // would mount a second writable layer over the first — the same silent shadowing the one-face law
      // exists to prevent, arriving through a merge rather than a switch.
      const planesFault = personaPlanes.length ? personaPlanesFault(personaPlanes) : null;
      if (planesFault) throw new Error(`[lararium] the PersonaGroup planes this vessel carries do not stand: ${planesFault}`);
      const personaGroupId = bootstrapTiddlers[PERSONA_GROUP_DOC_ID_TIDDLER]?.text
        ?? tiddlerText(id?.[PERSONA_GROUP_DOC_ID_TIDDLER]) ?? null;
      // A vessel standing in compartments but told to wear none it carries halts here rather than
      // wearing whichever happened to load first.
      const personaBagId   = personaGroupId && personaPlanes.length
        ? mountedPlaneBagId(personaPlanes, personaGroupId)
        : null;
      const personaUrl     = personaPlanes.find((p) => p.personaGroupId === personaGroupId)?.url ?? null;
      // THE THREE PLANES THAT TRAVEL WITH THE FACE, read under the face's own names. The plane id
      // resolved just above carries the tag, so its siblings come from it — the name is the index, and
      // no second copy of the tag rides the bootstrap to drift from this one. A vessel standing in no
      // face reads none of them, which is the faceless floor answering honestly.
      const faceSiblings  = personaBagId ? personaSiblingBagIds(personaBagId) : null;
      const readPlane = (bagId: string | undefined): string | null =>
        bagId ? (bootstrapTiddlers[bagId]?.text ?? tiddlerText(id?.[bagId]) ?? null) : null;
      const identitiesUrl = readPlane(faceSiblings?.identities);
      const circlesUrl    = readPlane(faceSiblings?.circles);
      const sessionsUrl   = readPlane(faceSiblings?.sessions);
      // ── THE PLACE STANDS ALONE; THE FACE RIDES OPTIONAL ────────────────────────────────────────
      // Only the daemon doc reads required — a founding stands a PLACE first (`lares vessel found`) and a FACE
      // later (`lares persona new 0`), so a vessel that carries and serves while holding no persona names
      // none of the social planes here. Absence reads as the WAKING FLOOR.
      if (!daemonUrl) {
        throw new Error(`[lararium] this vessel names no daemon doc — the place never finished founding. Run \`lares vessel found\`.`);
      }
      // A TORN face refuses outright, mirroring `bootDaemonKeyhive`: some pins standing and others absent
      // names a half-finished founding, and guessing which half to trust is the confused-deputy error.
      const faceParts = [identitiesUrl, circlesUrl, sessionsUrl, personaUrl, personaBagId];
      const faceHeld  = faceParts.filter(Boolean).length;
      if (faceHeld > 0 && faceHeld < faceParts.length) {
        throw new Error(
          `[lararium] the face this vessel carries reads TORN — some social planes stand and others do not.\n` +
          `  missing: ${[!identitiesUrl && "the identities plane", !circlesUrl && "the circles plane", !sessionsUrl && "the sessions plane", !personaUrl && "the PersonaGroup plane", !personaBagId && "the PersonaGroup sentinel"].filter(Boolean).join(", ")}\n` +
          `  Re-light the face (\`lares persona new 0\`) rather than booting on half of one.`,
        );
      }
      bootstrap = {
        daemonUrl, personaPlanes,
        ...(identitiesUrl ? { identitiesUrl } : {}),
        ...(circlesUrl    ? { circlesUrl }    : {}),
        ...(sessionsUrl   ? { sessionsUrl }   : {}),
        ...(personaUrl    ? { personaUrl }    : {}),
        ...(personaBagId  ? { personaBagId }  : {}),
      };
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
        ` → ${moved ?? "already gone"}; the plane mounts read-only until \`lares vessel rite rebirth\` rematerializes it`,
      );
    },

    // Corpus capability piece — one top-level bag per catalog corpus entry (shared loader).
    loadCorpora: (composite) => loadCatalogCorpora({
      repo, catalogHandle,
      mintLocalHandle: (docUrl) => waitHandle<LarDoc>(repo, docUrl as AutomergeUrl, blankMemeStore(repo)),
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
  // registerBags omits the user-wiki bags (the decouple); the daemon's OWN bag still mounts.
  const openDaemon = async ({ assembly, slot }: { assembly: VesselCoreAssembly; slot?: VesselWikiSlot }): Promise<VesselDaemonVm> => {
    const daemonDoc = (await readDaemonDoc()).doc();
    const personaGroupDocIdHex   = tiddlerText(daemonDoc?.tiddlers?.[PERSONA_GROUP_DOC_ID_TIDDLER])   ?? undefined;
    const personaGroupAgentIdHex = tiddlerText(daemonDoc?.tiddlers?.[PERSONA_GROUP_AGENT_ID_TIDDLER]) ?? undefined;
    const meshCabalDocIdHex     = tiddlerText(daemonDoc?.tiddlers?.[MESH_CABAL_DOC_ID_TIDDLER])     ?? undefined;
    // The cabal rides with the FACE — its members read as PersonaGroups, so a faceless place names none.
    // ── THE FACE, IF ONE STANDS ────────────────────────────────────────────────────────────────
    // The signer pin + edge carry the Binding Gate's authority. Their ABSENCE names a place at the
    // WAKING FLOOR rather than a fault: a vessel founded by `lares vessel found` and never lit by
    // `lares persona new 0` holds no persona, by design — canon has it boot permissionlessly on its
    // own key (identity-classes#herm-establishment).
    //
    // THE GATE STILL NEVER SOFTENS. Downstream, `bootDaemonKeyhive` runs the Binding Gate in FULL or
    // grants no persona caps at all, and refuses a TORN face outright. So absence buys fewer caps, never
    // a skipped check — the confused-deputy / PCD cure survives the floor intact.
    const signerDid  = tiddlerText(daemonDoc?.tiddlers?.[SIGNER_DID_TIDDLER]) ?? undefined;
    const edgeRecord = daemonDoc?.tiddlers?.[DEVICE_DELEGATION_SELF_TIDDLER];
    const deviceEdge = edgeRecord?.tiddler as unknown as DeviceDelegationTiddler | undefined;
    // THE PERSONA-KEL PIN — the continuity anchor the Binding Gate walks. Read the pinned identifier PREFIX
    // from the daemon bag (the pin's root of trust), then read its seq-sorted key-event-log from the per-Nexus KEL
    // board — this node's OWN gate key IS its Nexus key. The read runs against the LOCAL replica "as of last
    // sync" (no-global-now); FAIL-CLOSED — a missing prefix OR a chain the local replica does not carry HALTS
    // the boot (never a global lookup, never a fall-through to the raw signer pin).
    // PINNED-BUT-UNWALKABLE ≠ UNPINNED, and the difference decides between a floor and a fault. A vessel
    // that pins NO identifier holds no face and stands at the floor. A vessel that pins one whose chain its
    // local replica cannot reach has a face it cannot prove — that HALTS, fail-closed, exactly as before
    // (never a global lookup; a not-yet-synced replica simply denies).
    const personaKelPrefix = tiddlerText(daemonDoc?.tiddlers?.[PERSONA_KEL_PREFIX_TIDDLER]) ?? undefined;
    let personaKelChain: ReturnType<ReturnType<typeof makePersonaKelRingHolder>["chainForPrefix"]> = null;
    if (personaKelPrefix) {
      const kelHolder = makePersonaKelRingHolder({ repo, nexusPubkey: vesselIdentity.verifyingKey });
      await kelHolder.ready;
      personaKelChain = kelHolder.chainForPrefix(personaKelPrefix);
      if (!personaKelChain || personaKelChain.length === 0) {
        throw new Error(`[lararium] persona-KEL chain for the pinned identifier ${personaKelPrefix.slice(0, 20)}… absent from the local board replica — the Binding Gate cannot reach a head (fail-closed).`);
      }
    }
    // Register the per-Nexus crossroads plane into the oracle plane (isomorphic with the browser). The node IS the
    // confederation anchor, so its own gate key IS its Nexus key — the same key browsers pass as
    // relayGatePubKey — so node + its browser leaves resolve the identical crossroads doc. The daemon core
    // splices the crossroads bag into the recipe + registerBags for either vessel.
    await registerCrossroadsInOracle(repo, assembly.islandHandle, vesselIdentity.verifyingKey);
    // ── THE BOOTSTRAP SEEDS; THE CATALOG PLANE REGISTERS ────────────────────────────────────────
    // A face is lit by `lares persona new 0` — a CLI act, on a vessel that is not running — so the plane it
    // stands lands in the BOOTSTRAP, which is this island's cold-start seed and reaches no registry. The
    // verbs that read a persona plane resolve it the way every user bag resolves, from the catalog registry. This boot
    // carries the seed across that gap.
    //
    // ALL FOUR OF A FACE'S PLANES, not the persona plane alone: the circles, identities and sessions planes carry
    // the same tag and answer the same ownership question, so one bridge serves the whole face and the four
    // cannot drift onto different registries.
    //
    // Idempotent by construction: it writes the url the seed already names, so a plane registered on an
    // earlier boot is re-written identically and a plane the operator lit an hour ago registers now.
    const registerInCatalog = (bagId: string, url: string | null | undefined): void => {
      if (!url || tiddlerText(assembly.catalogHandle.doc()?.tiddlers?.[bagId]) === url) return;
      assembly.catalogHandle.change((doc) => {
        doc.tiddlers[bagId] = mutableLarRecord(bagId, { text: url, kind: "oracle" }, "vessel-boot");
      });
    };
    for (const plane of bootstrap.personaPlanes) {
      registerInCatalog(personaBagIdFor(plane.personaGroupId), plane.url);
    }
    // The worn face's siblings ride the bootstrap under their own derived names; register them beside it.
    const wornFace = bootstrap.personaBagId ? personaSiblingBagIds(bootstrap.personaBagId) : null;
    if (wornFace) {
      registerInCatalog(wornFace.circles,    bootstrap.circlesUrl);
      registerInCatalog(wornFace.identities, bootstrap.identitiesUrl);
      registerInCatalog(wornFace.sessions,   bootstrap.sessionsUrl);
    }
    // M3 — node-main reads the persisted keyhive Archive from the identity home and passes it into the
    // worker (same custody boundary the 32-byte seed already crosses). keyhive inits from it as the
    // restore FLOOR, then replays daemon cap-events on top — a torn daemon doc restores instead of orphaning.
    // THE WAKING FLOOR (#60, superseding the boot-gate throw): when the config marks sealing expected and no
    // passphrase rides the environment, the archive stays SHUT and this daemon stands WITHOUT it. Throwing
    // here would have made the floor a lie — the boot announces that it stands faceless and carrying, then
    // the same condition killed it one frame later. `daemonAuth` already treats the archive as optional, so
    // standing without it costs nothing structurally: keyhive loses its restore FLOOR and replays cap-events
    // alone, which is exactly a vessel that has lost its CAPS and kept its FLOOR.
    //
    // Reading rather than asserting is the ruling itself (canon: waking-floor). Nothing is lowered — a
    // vessel that cannot open simply never rose, and an operator supplying the key raises it.
    const archiveBytes = archiveOpens() ? loadIdentityArchive() : null;
    const daemonAuth = {
      seed:                 vesselSeed,
      vesselVerifyingKey: vesselIdentity.verifyingKey,
      // The face pins ride CONDITIONALLY — a place at the floor carries none, and writing them as
      // explicit `undefined` would read as a torn face rather than an unlit one.
      ...(personaGroupDocIdHex   ? { personaGroupDocIdHex }   : {}),
      ...(personaGroupAgentIdHex ? { personaGroupAgentIdHex } : {}),
      ...(meshCabalDocIdHex      ? { meshCabalDocIdHex }      : {}),
      // Derived, never enumerated — one derivation both vessels share, so the node and the browser
      // cannot drift apart on which bags a cap check can resolve. A wiki slot's bags ride only when a
      // wiki stands in the stack; a Herm carries none, blind by structure rather than by a flag.
      registerBags: deriveRegisterBags({
        // EVERY compartment registers — a plane absent from the ring stops that compartment's own
        // devices reconciling. Only ONE mounts; the two verbs part company here.
        fleets: bootstrap.personaPlanes.map((p) => ({
          personaGroupId: p.personaGroupId,
          catalogNamed: p.personaGroupId === personaGroupDocIdHex ? catalogNamedBags(assembly.catalogHandle.doc()) : [],
        })),
        ...(slot ? { wikiBags: [slot.wikiBagId, slot.draftBagId] } : {}),
      }),
      ...(signerDid ? { signerDid } : {}),
      ...(personaKelPrefix && personaKelChain
        ? { personaKel: { prefix: personaKelPrefix, chain: personaKelChain } }
        : {}),
      ...(deviceEdge ? { deviceEdge } : {}),
      ...(archiveBytes ? { archiveBytes } : {}),
    };
    // The engine's plugin-tiddler CIDs — the daemon worker pulls them by CID from the fs CAS
    // (the breath path), never CRDT-syncing the bytes over the port. Same derivation the pool
    // feeds every wiki island; mirrors the browser vessel.
    const pluginCids = pluginCidsFromIslandBlobs(assembly.islandHandle.doc()?.blobs);
    daemonVm = await openDaemonVm({
      repo,
      daemonUrl: bootstrap.daemonUrl,
      // The persona plane rides only when a face stands; the daemon VM resolves nothing that is absent.
      ...(bootstrap.personaUrl   ? { personaUrl:   bootstrap.personaUrl }   : {}),
      ...(bootstrap.personaBagId ? { personaBagId: bootstrap.personaBagId } : {}),
      coreHash: assembly.coreHash,
      ...(pluginCids.length ? { pluginCids } : {}),
      grants: {
        islandUrl: assembly.islandHandle.url,
        // The daemon island's OWN bag (daemon = wikiBagUri("daemon"), one-recipe model).
        wikiUrl:   bootstrap.daemonUrl,
        // ACCESS grant, not a LOAD slot — the catalog registry is absent from expandRecipe,
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
      // The dual recall fuse — the form-leg construction (markers→vector derive IN the daemon VM, the
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
    // The ki↔R comparator body, extracted so BOTH the `mismatch` verb and the `flow` runner's mismatch
    // cap-step reuse it: run the TS-hull Gaussian-CMI coupling (coupleMesh) beside the R effective-TE
    // (couple_r serve-op) over the SAME signals and diff the directed edges. The daemon is the one seat
    // that reaches both hulls, so the diff lands here and nowhere else.
    const computeMismatch = async (rows: number[][], namesIn: string[] | undefined, root?: string): Promise<Record<string, unknown>> => {
      const width = rows[0]?.length ?? 0;
      const names: string[] = namesIn && namesIn.length === width
        ? namesIn : Array.from({ length: width }, (_, i) => `s${i}`);
      // TS side: each column is a child's univariate signal (T×1).
      const tsCoupling = coupleMesh(names.map((name, i) => ({ name, signal: rows.map((r) => [r[i]!]) })));
      // R side: the py/R serve-op (graceful skip when R absent).
      const r = await captureFor(root).coupleR({ rows, names });
      const rAvailable = r["r_available"] !== false;
      if (!rAvailable) {
        return { agree: null, rAvailable, note: "R unavailable — cannot compare (couple-r skipped)", edges: [] };
      }
      const rEdges = Array.isArray(r["edges"]) ? (r["edges"] as Array<Record<string, unknown>>) : [];
      const rHas = (from: string, to: string): boolean => rEdges.some((e) => e["from"] === from && e["to"] === to);
      const edges: Array<Record<string, unknown>> = [];
      let agree = true;
      for (let i = 0; i < names.length; i++) for (let j = 0; j < names.length; j++) {
        if (i === j) continue;
        const tsCoupled = (tsCoupling.te[i]?.[j] ?? 0) > 0;
        const rCoupled = rHas(names[i]!, names[j]!);
        const edgeAgree = tsCoupled === rCoupled;
        if (!edgeAgree) agree = false;
        if (tsCoupled || rCoupled) {
          edges.push({ from: names[i], to: names[j], ki: tsCoupled, r: rCoupled, agree: edgeAgree,
                       kiTe: tsCoupling.te[i]?.[j] ?? 0 });
        }
      }
      const disagreements = edges.filter((e) => e["agree"] === false).length;
      return {
        agree, rAvailable, edges, disagreements,
        note: agree
          ? `ki (Gaussian-CMI) and R (effective-TE) AGREE on all ${edges.length} directed edge(s) — the coupling reads honest`
          : `MISMATCH — ki and R disagree on ${disagreements} of ${edges.length} directed edge(s); the vessel's local read parts ways from the R reference`,
      } as unknown as Record<string, unknown>;
    };

    // The TS-hull coupleMesh capstone over an N-signal matrix (each column a child's univariate signal) —
    // whiten→couple→gate in one call. The `flow` couple cap-step reads it; the reading zeroes non-significant
    // edges (so a surviving `te[i][j] > 0` names a directed, significance-clean coupling).
    const coupleSignal = (rows: number[][], names: string[]): Record<string, unknown> => {
      const c = coupleMesh(names.map((name, i) => ({ name, signal: rows.map((r) => [r[i]!]) })));
      return c as unknown as Record<string, unknown>;
    };

    // The crystallize cap-step over an explicit signal: fold the matrix into occurrences — each cell a
    // (stratum=column, ordinal=row, strength=value) attestation — and read whether the pattern FIXES into
    // shared grammar (born ACROSS the columns/strata ⊕ its recurrence rhythm re-locks). A lone column never
    // crystallizes (single-stratum → zero cross-stratum drive), the honest floor.
    const crystallizeSignal = (rows: number[][], names: string[]): Record<string, unknown> => {
      type Occ = { stratum: string; ordinal: number; strength: number };
      const occ: Occ[] = [];
      for (let t = 0; t < rows.length; t++) {
        for (let i = 0; i < names.length; i++) occ.push({ stratum: names[i]!, ordinal: t, strength: rows[t]![i]! });
      }
      const verdict = crystallize<Occ>(occ, {
        stratumOf:  (o) => o.stratum,
        ordinalOf:  (o) => o.ordinal,
        strengthOf: (o) => o.strength,
      });
      return verdict as unknown as Record<string, unknown>;
    };

    // AUTO-EXTRACTION (feature-gated): when a coupling verb rides a target sensorium but no explicit signal,
    // project the target's child streams into a matrix (extractSignalFromTarget). Empty today on every real
    // sensorium (no child lands a signal.json until the re-pour) → the verb sees empty rows and answers its
    // own honest no-signal, never fabricating a matrix. An explicit signal always wins (never overridden).
    const signalOrExtract = (rows: number[][], names: string[] | undefined, root?: string): { rows: number[][]; names?: string[] } => {
      if (rows.length > 0 || !root) return { rows, ...(names ? { names } : {}) };
      const ex = extractSignalFromTarget(root);
      return { rows: ex.rows, ...(ex.names.length ? { names: ex.names } : {}) };
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
      coupleR: async (input) => {
        // The R effective-TE coupling reference (coupling.R RTransferEntropy::calc_ete) over the passed
        // signal matrix — the py/R twin of `ki`, computed py-side behind the causal-island boundary.
        // Stateless: it couples `rows`, not any store, so the holder is only the pipe to the py serve-op.
        // AUTO-EXTRACT when a target rides without a signal (feature-gated; empty until the re-pour lands it).
        const { sensoriumRoot, rows, names, ...req } = input;
        const src = signalOrExtract(Array.isArray(rows) ? rows : [], names, sensoriumRoot);
        return await captureFor(sensoriumRoot).coupleR({ ...req, rows: src.rows, ...(src.names ? { names: src.names } : {}) });
      },
      forecast: async (input) => {
        // The R early-warning plane (ews.R critical-slowing-down forecast) over the passed signal matrix —
        // computed py-side behind the causal-island boundary; the holder is only the pipe to the serve-op.
        const { sensoriumRoot, ...req } = input;
        return await captureFor(sensoriumRoot).forecast(req);
      },
      mismatch: async (input) => {
        // The ki↔R comparator — the ONE place that reaches both hulls (extracted to computeMismatch so the
        // `flow` runner reuses the same diff). A disagreement means the vessel's local read and the R
        // reference part ways on whether streams couple.
        // AUTO-EXTRACT when a target rides without a signal (feature-gated; empty until the re-pour lands it).
        const rows: number[][] = Array.isArray(input.rows) ? input.rows : [];
        const names = Array.isArray(input.names) ? input.names : undefined;
        const src = signalOrExtract(rows, names, input.sensoriumRoot);
        return await computeMismatch(src.rows, src.names, input.sensoriumRoot);
      },
      flow: async (input) => {
        // THE FLOW RUNNER — look the pet-named cap-stack up (flowSeedByPetname) and run each step routed by
        // hull. The daemon is the one seat that reaches both hulls, so it wires every instrument's handle:
        // crystallize + the coupleMesh capstone (TS), phase (the py rhythm serve-op), mismatch (the ki↔R
        // comparator), and the auto-extraction projector (a target's child streams → a signal-matrix,
        // feature-gated: empty until the re-pour lands child signals).
        const root = typeof input.sensoriumRoot === "string" ? input.sensoriumRoot : undefined;
        return await runFlow(
          {
            crystallize: (rows, names) => crystallizeSignal(rows, names),
            couple:      (rows, names) => coupleSignal(rows, names),
            phase:       (rows, names, r) => captureFor(r).phase({ rows, names }),
            mismatch:    (rows, names, r) => computeMismatch(rows, names, r),
            extractSignal: (r) => { const ex = extractSignalFromTarget(r); return { rows: ex.rows, names: ex.names, note: ex.note }; },
          },
          {
            ...(typeof input.petname === "string" ? { petname: input.petname } : {}),
            ...(Array.isArray(input.rows) ? { rows: input.rows } : {}),
            ...(Array.isArray(input.names) ? { names: input.names } : {}),
            ...(Array.isArray(input.targets) ? { targets: input.targets } : {}),
            ...(root ? { sensoriumRoot: root } : {}),
          },
        );
      },
      ki: async (input) => {
        // The Ki (氣) coupling verdict computed HERE in TS — the H¹-gated fuse over the ADDRESSED sensorium's
        // coupling cap (general: any sensorium that #has coupling.children answers; memory carries none). The
        // MCP `ki` tool reaches this daemon verb (routed-only; no python standalone computes the cohomology).
        const root = input?.sensoriumRoot ?? memorySensoriumDir();
        return readCoupling(root) as unknown as Record<string, unknown>;
      },
      li: async (input) => {
        // The Li (理) gluing verdict computed HERE in TS — the Robinson li-radius + H¹-gated fuse over the
        // ADDRESSED sensorium's OWN sheaf planes (general: any sensorium with ≥2 sheaf planes answers). The
        // default single-stream cover glues a nested-cover PLUMBING witness (flagged), never a health verdict.
        const root = input?.sensoriumRoot ?? memorySensoriumDir();
        return readCohere(root) as unknown as Record<string, unknown>;
      },
      jing: async (input) => {
        // The Jing (勁) coherence verdict computed HERE in TS — the li∘ki square over the ADDRESSED
        // child-host's lobes: EXTEND them to a reconciled self (ki fuse), RESTRICT back (li), read the
        // round-trip. Bare reads the MESH (who/authority/flow — the DreamNet-serving load-bearing host).
        const root = input?.sensoriumRoot ?? meshSensoriumDir();
        return readJing(root) as unknown as Record<string, unknown>;
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
      // ── the DURABLE sensorium-lifecycle executors ─────────────────────────────────────────────────
      // These route over manifest.json alone (no store holder, no captureFor) — the SAME pure verb
      // functions the CLI-direct door drives, now reachable over the daemon wire so the MCP surface
      // mirrors the CLI three-way. The reversibility×trust seat rides guardHitl (the mesh grid): an
      // HITL verb (promote·retire·purge) REFUSES without an operator-approval capability — the surface
      // twin of the CLI's `--approve`, so an irreversible verb crosses the SAME gate on both surfaces.
      senseRoster: async () => ({ sensoria: rosterSensoria() }),
      senseInspect: async (input) => {
        const insp = inspectSensorium(input.name);
        if (!insp) throw new Error(`no sensorium named '${input.name}'`);
        return insp as unknown as Record<string, unknown>;
      },
      senseBuild: async (input) => buildEphemeralSensorium(
        input.name, input.halfLife !== undefined ? { halfLife: input.halfLife } : {},
      ) as unknown as Record<string, unknown>,
      senseReconcile: async (input) => {
        // --all re-settles every sensorium; else one by name (the pure reducer writes only on change).
        if (input.all) return { all: reconcileAllSensoria() } as unknown as Record<string, unknown>;
        if (!input.name) throw new Error("reconcile wants a sensorium name (or all)");
        return reconcileSensorium(sensoriumDir(input.name)) as unknown as Record<string, unknown>;
      },
      sensePromote: async (input) => {
        // in-loop human graduation — one-way by intent → HITL. The gate mirrors the CLI's requireApprove.
        guardHitl("promote", input.approve);
        return promoteSensorium(
          input.name, input.storeSwap ? { storeSwapTarget: input.storeSwap } : {},
        ) as unknown as Record<string, unknown>;
      },
      senseRetire: async (input) => {
        // a JUDGED deaccession (grounds required; move-not-delete) → HITL. The gate mirrors requireApprove.
        guardHitl("retire", input.approve);
        return retireSensorium(input.name, input.grounds) as unknown as Record<string, unknown>;
      },
      senseUnRetire: async (input) => unRetireSensorium(input.name) as unknown as Record<string, unknown>,
      sensePurge: async (input) => {
        // the irreversible byte GC → HITL. purgeSensorium ITSELF guardHitls (defense-in-depth) and refuses
        // a live sensorium (only a tombstone GCs), so the approval rides through as the reclaim authority.
        return purgeSensorium(input.name, input.approve) as unknown as Record<string, unknown>;
      },
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
    // where working + canon both live — the island owns its composition; the
    // daemon commands, never reaches the per-fingerprint working binding). The
    // inner verb (MOVE/LOAD/…) routes to the island's own action reactors.
    // project-md: the submission projection as a first-class wire verb — routes to the island's
    // PROJECT-MD QUERY reactor (read-cap, no mutation; returns the markdown + meta pair bytes).
    // Same mouth as `lares project-md` (files) and the wiki UI gesture: meme-markdown.
    registry.register("project-md", async (args, ctx) => {
      await wikiActivation.ensureActive(slotActiveWikiId);
      return vmManager.placeWikiVerb(slotActiveWikiId, {
        verb: "PROJECT-MD", args: args as Record<string, unknown>, requestedBy: ctx.invocation.requestedBy,
      });
    });
    registry.register("wiki-act", async (args, ctx) => {
      await wikiActivation.ensureActive(slotActiveWikiId);
      return vmManager.placeWikiVerb(slotActiveWikiId, {
        verb: String(args["verb"]),
        args: (args["args"] as Record<string, unknown>) ?? {},
        requestedBy: ctx.invocation.requestedBy,
      });
    });
    registry.register("residency", makeResidencyStatsReactor({ residency }));

    // nexus-refresh — the LIVE-refold of the three nexus-doc authorities the boot read once: the federation
    // POSTURE (a disk-charter re-read → reassigns the sharePolicy's live `federationPosture`), the antigen
    // Kapae'd DENY set, and the contracted MEMBER set (both re-folded off freshly-materialized boards). The
    // shore an OUT-OF-PROCESS CLI edit (`lares nexus posture` / `kapae` / `admit`, each writing its own repo)
    // needs to reach this running node — NodeFS carries no cross-process change bus, so a peer's WS-sync
    // refold never fires for a same-operator CLI write beside it. DISTINCT from the worldline `kapae`
    // branch-mute; this touches the mesh immune/federation surface, never a worldline branch.
    registry.register("nexus-refresh", async () => {
      const r = await runNexusRefresh({
        storageDir,
        sealHome,
        nexusPubkey: vesselIdentity.verifyingKey,
        antigen:     antigenHolder,
        membership:  nexusMembershipHolder,
        // Reassign the live posture the sharePolicy closure reads each call (fail-closed PRIVATE on a torn read).
        setPosture:  (p) => { federationPosture = p; },
      });
      return { verb: "nexus-refresh", ...r };
    });

    // nexus-rekey — the immune keel's RE-KEY tooth at the Herm's OWN tier: roll a resource's LEASE EPOCH
    // forward on the live daemon board, staling every grant bound below the new epoch. It writes the
    // CALLER's OWN per-writer slot only (a MAX-REGISTER, never a bare scalar — the Automerge-LWW backward-drop
    // hazard), so two hearths rekeying the same resource concurrently both climb, never drop. This is the
    // NON-RENEWAL half of revocation (a lease stales; it never re-derives a secret) — targeted key-material
    // rotation rides keyhive CGKA, NEVER this lease. A live board write → the roll rides WS-sync to replicas.
    registry.register("nexus-rekey", async (args) => {
      const resource = typeof args["resource"] === "string" ? (args["resource"] as string) : "";
      if (!resource) throw new Error("nexus-rekey: `resource` required (the lease resource id to roll)");
      const r = rollLeaseEpochOnBoard(await readDaemonDoc(), resource, vesselIdentity.verifyingKey);
      return { verb: "nexus-rekey", ...r };
    });

    // nexus-reshare — the immune keel's RE-SHARE tooth: re-announce every sealed body this hearth HOLDS over the
    // carriage, so a relay that PRUNED this holder on a drop re-learns `cid → holder` FROM THE WIRE. The held set =
    // the cad ciphertext tier on disk (cid-named files); the announce carries a HINT (where to ask), never the
    // bytes (a member re-verifies `verifyCiphertextCid`). The PUBLIC FLOOR re-announce rides the read-face's own Ea
    // breath (the signed monotone pointer re-issues each TTL/2), so a static floor never reads stale — no extra verb.
    registry.register("nexus-reshare", async () => {
      const cids = listSealedCids(cadSealDir(storageDir));
      const announced = carriageLoop ? await carriageLoop.announce(cids) : 0;
      return { verb: "nexus-reshare", held: cids.length, announced, carriage: carriageLoop !== null };
    });

    // cad-seal — the cad seal's FIRST live producer. Seal a carrier body's PLAINTEXT into the ciphertext
    // federation plane (a distinct `cad/` tier), ADDITIVELY: the cleartext-local corpus CAS the wake reads stays
    // untouched. The body arrives as a staged `cid` (resolved cleartext from the corpus CAS) or inline `text`.
    // The seal registers the ciphertext docId into the live sealRegistry → the member blind-transit lane opens
    // for exactly that body; a member reads NOTHING (carry ⊥ read — the read-cap rides the keyring, never here).
    // FAIL-CLOSED: no keyring (an empty stand) → `keyring.current()` throws → the body stays cleartext-local only.
    registry.register("cad-seal", async (args) => {
      const keyring = nexusConvergenceKeyring;
      if (!keyring) throw new Error("cad-seal: no convergence keyring on this vessel — cannot seal (the body stays cleartext-local)");
      const cid  = typeof args["cid"]  === "string" ? (args["cid"]  as string) : "";
      const text = typeof args["text"] === "string" ? (args["text"] as string) : "";
      let plaintext: Uint8Array;
      if (cid) {
        const bytes = readCasBlobFromFs(cid, casDirForStorage(storageDir));   // the SAME cleartext corpus CAS the CLI staged to
        if (!bytes) throw new Error(`cad-seal: no staged carrier body at cid ${cid} in the corpus CAS`);
        plaintext = bytes;
      } else if (text) {
        plaintext = utf8Bytes(text);
      } else {
        throw new Error("cad-seal: `cid` (a staged carrier) or `text` (an inline body) required");
      }
      const installed = sealCarrierForFederation({
        registry:  sealRegistry,
        cadDir:    cadSealDir(storageDir),
        plaintext,
        keyring,
        tracker:   casBagTracker,
        self:      vesselIdentity.verifyingKey,
      });
      // Return the PUBLIC verify-cap only (cid + docId + epoch) — the read-cap NEVER crosses this boundary.
      return { verb: "cad-seal", cid: installed.cid, docId: installed.docId, epoch: installed.epoch, sealed: sealRegistry.seal.isSealedPlane(installed.docId) };
    });

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
    // control), budget-enforced by the cap (the daemon bag always + pinBudget rotatable).
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
    // A face's planes pin under the face's own names — the vessel pins what it actually mounted.
    const pinFace = bootstrap.personaBagId ? personaSiblingBagIds(bootstrap.personaBagId) : null;
    if (pinFace) {
      void residency.pin(pinFace.identities, "boot:identities");
      void residency.pin(pinFace.circles,    "boot:circles");
      void residency.pin(pinFace.sessions,   "boot:sessions");
    }
    void residency.pin(DAEMON_BAG_ID,       "boot:daemon");
    residency.startSweeper();
    assembly.composite.attachResidency(residency);

    // Inbound WS gate — the daemon island's in-worker keyhive answers each peer.
    authGate.arm(daemonVm.authShore, DAEMON_BAG_ID, vesselIdentity.verifyingKey);

    // Keep oracle tiddlers current — self, ka, ba, social plane, daemon.
    reconcileWellKnownTiddlers(
      assembly.islandHandle, catalogHandle.url, assembly.laresHandle?.url,
      bootstrap.personaBagId ? personaSiblingBagIds(bootstrap.personaBagId) : null,
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
      { bagId: LARES_DOC_URI,    mirrorRoot: join(workerRootDir, "bags/lares"),    scope: "lares" },
      { bagId: LARARIUM_DOC_URI, mirrorRoot: join(workerRootDir, "bags/lararium"), scope: "lararium" },
      // crossroads = the PUBLIC plane's seed/canon bag — it holds the moved public-domain
      // library (raw .txt books + .mem memes with large source ahus). It projects to
      // bags/crossroads like the other seed bags. Safe to project ONLY with the skinny-handle
      // rule in place (T3): a book too big for the CRDT lands as a skinny handle, and the
      // projector writes only its handle — the body stays in the cid/ CAS, never re-overflowing.
      { bagId: CROSSROADS_DOC_URI, mirrorRoot: join(workerRootDir, "bags/crossroads"), scope: "crossroads" },
      // VIRTUAL BAGS. `working` (and `self` below) name LAYER COORDINATES, never bags on disk — a write
      // layer and a per-wiki canon authority the mount expands from the slug. They carry no `@` for the
      // same reason a bag does not: the SEGMENT and the FLAGS say what a name is, so the name says only
      // which one. `resolveDiskMirrors` branches on `selfCanon`/`wikiSlot`, never on any marker in the
      // string — a marker here would decorate a decision two booleans already carry.
      //
      // working = the live write layer; projects per-wiki to wikis/{slug} (BOTH
      // the bag `wikis/{slug}/working` and the leaf fill from the slug at mount —
      // wikiSlot). The authority (the wikis base) stays static here; designation
      // rides the recipe's mirrorBags.
      { bagId: "working",        mirrorRoot: join(workerRootDir, "wikis"),          scope: "working",  wikiSlot: "working" },
      // self-canon = the per-wiki CANON authority: a minted user wiki's own
      // @{slug} bag projects to bags/{slug} (both bagId and leaf fill from the
      // slug at mount). System wikis (lares/lararium) carry literal grants
      // above, so resolveDiskMirrors skips this for them — no double-project.
      { bagId: "self",          mirrorRoot: join(workerRootDir, "bags"),           scope: "self",    perWikiSlug: true, selfCanon: true },
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

    // Boot DEMOTED to a pin. The daemon island stays always-live on its own (never
    // pooled, never collected — the "daemon bag always there"). The home wiki (the ONE
    // rotatable user pin BESIDES the daemon bag; a resource-rich node MAY hold up to
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
    repo, catalogHandle, vesselSeed, nexusPubkey: vesselIdentity.verifyingKey,
    daemonDocUrl:    () => bootstrap?.daemonUrl ?? "",
    hearthDaemonUrl: () => (bootstrap as { hearthDaemonUrl?: string | null } | undefined)?.hearthDaemonUrl ?? null,
    residency, carriageLoop, carriageRelay, nexusDial, bulb, emit, orchestration,
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
  // the FLOW-map for its own routing (carry-without-reserve; no second read-face, no conflict over the oracle doc).
  const carriageCaps = opts.meshSelf ? carriageStack({
    repo:        p.repo,
    self:        opts.meshSelf,
    nodeSeedHex: Buffer.from(p.vesselSeed).toString("hex"),
    ...(p.residency ? { residency: p.residency } : {}),
    onLog: (l) => console.log(`[lararium] ${l}`),
  }) : [];

  // ── The WHO plane at the ANCHOR — resolve this island's own board; announce NOTHING ──
  // The identity twin of the browser leaf's whoFaceCap, the SAME cap composed by the SAME contract: the node
  // anchors the confederation, so its gate key scopes the board its leaves resolve, and both vessels layer the
  // one crossroads-advertised doc. The node already REGISTERS the crossroads plane into the oracle plane for its leaves to find;
  // composing here makes it RESOLVE that board too, so a hearth RECOGNISES the peers it federates with instead
  // of carrying a WHO plane it can only advertise. Unconditional — an anchor always holds its own island key
  // (unlike a leaf, which needs a relay + gate before any board can sync).
  //
  // NO BOOT-TIME FACE: the cap takes no card and publishes nothing. Binding the vessel never announces the
  // identity; disclosure rides the component's deliberate `announce`, and the only key at boot would be this
  // vessel's substrate key — the one co-surface the two-key atom forbids on a social board.
  const crossroadsHandle = await materializeSharedLarDoc(p.repo, crossroadsDocUrl(p.nexusPubkey), "board:crossroads");
  const extraCaps = [
    ...carriageCaps,
    whoFaceCap({ repo: p.repo, crossroadsHandle, nexusPubkey: p.nexusPubkey, residency: p.residency }),
  ];
  const result = await composeLararium<VesselIslandPool>(p.orchestration, extraCaps);

  return {
    activeWikiId: p.slotActiveWikiId(),
    activeWikiSource: p.activeWikiSource(),
    pool: result.pool, repo: p.repo,
    store: result.assembly.composite,
    daemon: p.daemonVm(),
    wikiDocUrl:       result.wikiHandle.url,
    catalogHandleUrl: p.catalogHandle.url,
    daemonDocUrl:     p.daemonDocUrl(),
    // A node hearth carries and serves its own face; when it was ADMITTED instead, its bootstrap names the
    // hearth it asks. Null here reads "this vessel IS the hearth", never "unknown".
    hearthDaemonUrl:  p.hearthDaemonUrl(),
    oracleDocUrl:     result.assembly.islandHandle.url,
    larariumDocUrl:   result.assembly.larariumHandle?.url ?? null,
    phase: "live",
    eventBus: p.eventBus(),
    // Graceful shutdown tears the pool down AND stops the carriage serve-loop (Socket B) + the client dial-out
    // (Socket A) — each a no-op when none stood — so no timer / client socket leaks past close.
    stopTick: () => { void result.pool.disposeAll(); void p.carriageRelay?.close(); void p.carriageLoop?.stop(); p.nexusDial?.stop(); },
  };
}

/**
 * Open a node Herm (Lares Viales) — composeHerm's wiki-LESS #has-cap-stack: substrate + the daemon
 * immune core + a writable meshpalace FLOW-map + the read-face that serves it. No wiki, no pool. The
 * The daemon boots WITHOUT a user wiki (its own bag = bootstrap.daemonUrl); registerBags omits the
 * absent wiki bags. Requires an HTTP server for the FLOW-map read-face.
 */
export async function openNodeHerm(opts: NodeVesselOptions): Promise<NodeHermResult> {
  if (!opts.httpServer) {
    throw new Error("[lararium] openNodeHerm requires opts.httpServer (the FLOW-map read-face serves over it)");
  }
  const p = await prepareNodeBoot(opts);
  // ── The WHO plane at a WAYFARER — recognition for a vessel that holds no face to lose ──
  // A Herm carries a Place DID and NO persona: there are no local human keys to steal at a crossroads. That
  // makes it the vessel with the least to risk and the most to gain from the board — it already recognises
  // BANS (the antigen ring rides its carriage), so reading the WHO plane completes the pair: it recognises
  // the presenters those bans name. The cap cannot betray the asymmetry, because it holds no card to publish.
  const hermCrossroads = await materializeSharedLarDoc(p.repo, crossroadsDocUrl(p.nexusPubkey), "board:crossroads");
  const herm = await composeHerm({
    extraCaps: [whoFaceCap({
      repo: p.repo, crossroadsHandle: hermCrossroads, nexusPubkey: p.nexusPubkey, residency: p.residency,
    })],
    keel:        p.orchestration.keel,
    openDaemon:  p.openDaemon,
    wireVerbs:   p.wireVerbs,
    afterDaemon: p.afterDaemon,
    repo:        p.repo,
    residency:   p.residency,
    httpServer:  opts.httpServer,
    signerSeed:  p.vesselSeed,
    storageDir:  opts.storageDir,
    ...(opts.meshSelf ? { meshSelf: opts.meshSelf } : {}),
    ...(opts.pullIntervalMs !== undefined ? { pullIntervalMs: opts.pullIntervalMs } : {}),
    // Serve the HELD bulb by cid over the public floor (the OPEN path) — present only when the genesis stands.
    ...(p.bulb ? { bulb: p.bulb } : {}),
    onLog:       (line) => console.log(`[herm] ${line}`),
  });
  p.emit("vessel-ready");
  p.emit("live");

  return {
    repo:             p.repo,
    store:            herm.assembly.composite,
    daemon:           p.daemonVm(),
    oracleDocUrl:     herm.assembly.islandHandle.url,
    catalogHandleUrl: p.catalogHandle.url,
    larariumDocUrl:   herm.assembly.larariumHandle?.url ?? null,
    phase:            "live",
    carriageRelayPort:       p.carriageRelay?.port ?? null,
    carriageRelayGatePubKey: p.carriageRelay?.gatePubKey ?? null,
    dispose: async () => {
      await p.carriageRelay?.close();  // tear the crossroads down first (a no-op when none stood) — no WS server leak
      await p.carriageLoop?.stop();   // stop Socket B serve-loop (a no-op when none stood) — no timer / socket leaks
      p.nexusDial?.stop();            // stop the client dial-out (Socket A) — a no-op when none stood
      await p.daemonVm().shutdown();
      await herm.vessel.dispose();   // reverse build order → read-face disposes (clears the HTTP handler)
    },
  };
}
