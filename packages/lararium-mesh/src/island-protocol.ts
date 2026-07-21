/**
 * island-protocol — GP-1 schema: discriminated union for all vessel ↔ causal-island messages.
 *
 * Every message crossing the vessel / causal-island boundary MUST use this envelope.
 *
 * ## Island Sovereignty Law (isomorphic across all vessel types)
 *
 *   1. Every island boots a Repo-in-island via a transferred `syncPort` (MessagePort).
 *   2. The island derives tiddler state from its own CRDT doc — never from vessel oracle deltas.
 *   3. The island owns its timing. The in-wiki nalu engine drives frame-aligned drain:
 *      browser `requestAnimationFrame` (with setTimeout(16ms) fallback for Safari),
 *      node setTimeout(16ms). Tiddler deltas accumulate via $tw.lares.enqueueNalu;
 *      one wiki.transact() per frame across all bags. No raw-message-receipt drains.
 *   4. (retired) Frame-completion ACK signal — drain timing stays island-internal.
 *   5. Vessel oracle delta delivery is removed. CRDT sync via `syncPort` is the sole
 *      source of tiddler truth for causal islands.
 *   6. `IslandMsg_Manifest` carries `syncPort` (transferred, not cloned), `recipe` (WikiRecipe
 *      slot structure), `grants` (IslandGrants — typed structural capabilities), and `coreHash`
 *      (content-address intent vector; null = pre-CAS). TW5 core bytes are NOT transferred
 *      in the manifest — islands read them from `LarDoc.blobs[ENGINE_CORE_ID]` on the
 *      @lararium CRDT doc after `handle.whenReady()`. Two vessels federating @lararium
 *      share the engine automatically via Automerge sync.
 *   7. The vessel MUST close `mainPort` at evict/unmount time — before or after worker.terminate().
 *      Failure to close leaks the Automerge NetworkAdapter silently. This invariant is structural:
 *      every vessel implementation (node, browser, future) holds a `mainPort: MessagePort` on its
 *      hot slot and calls `mainPort.close()` in its teardown path. No exceptions.
 *   8. Federation seam — when a grant carries a non-empty AutomergeUrl, two obligations
 *      activate. Vessel: the vessel MUST wire the `MessageChannelNetworkAdapter(mainPort)` on the
 *      vessel Repo before delivering `manifest`, so the CRDT graph reaches the island-side Repo
 *      automatically. Island-side: the island MUST call `repo.find(docUrl).whenReady()` and await
 *      readiness before seeding TW5 and declaring `ea`. Failure on either side leaves the island
 *      holding a disconnected doc; the slot MUST transition to disposed within HANDSHAKE_TIMEOUT_MS.
 *      Gate proof: `federation-seam.test.ts` (node, pure Repo — vessel→island + island→vessel) +
*                  `browser-repo-in-island.test.ts` test 2 (browser pool, docUrl non-null path).
 *      When this law holds, two vessels sharing a bag converge without any explicit sync call —
 *      the archipelago forms the moment the AutomergeUrl crosses the boundary.
 *   9. TW5 SHALL NOT instantiate on the main thread. Every `TW5Engine` lives inside a sovereign
 *      Worker (Node `worker_threads`, browser `Web Worker`, future WASM/UE5 runtimes).
 *      The main thread holds `DocHandle` references and `CompositeStore` layers; it does not
 *      hold or reference `TW5Engine`. Any code that calls `bootTw5()` or instantiates
 *      `TW5Engine` outside a Worker constitutes a sovereignty violation.
 *      Boot sites (all inside Workers): `node-daemon-island.ts` (Node daemon),
 *      `lar-wiki-island.ts` (Node wiki), `browser-wiki-worker.ts` (browser wiki),
 *      `browser-daemon-island.ts` (browser daemon). Main-thread entry files carry no TW5 import.
 *
 * GP-1: schema_version on every message. Lock at 1; increment on breaking changes.
 * GP-2: all payloads are plain objects; no class instances, no functions, no DOM.
 * GP-4: CryptoKey — NOT on this protocol surface; key material stays in-thread.
 *
 * Platform-neutral: no Node `worker_threads` import, no browser `self` import.
 * Vessel entrypoints bind the I/O; this module names the envelopes only.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/island-protocol
 */

import type { AuthProofWire } from "./auth-wire.js";
import type { DeviceDelegationTiddler } from "./device-delegation.js";
import type { PersonaKelEvent } from "./persona-kel.js";
import type { WorldlineEdgeTriple, WorldlineEdgeClose } from "./worldline-edge.js";
import type { SparseFormVector } from "./worldline-trajectory.js";

export const ISLAND_PROTOCOL_VERSION = 1 as const;
export type ProtocolVersion = typeof ISLAND_PROTOCOL_VERSION;

// ── Island storage configuration ──────────────────────────────────────────

/**
 * Storage adapter configuration for the island-side Automerge Repo.
 *
 * Islands that own a storage adapter hold persistent CRDT state independently
 * of the vessel relay Repo. The vessel passes this config at manifest
 * delivery time; the island constructs the adapter.
 *
 * - `nodefs`  — Node.js `NodeFSStorageAdapter`; island receives a filesystem `dir`.
 * - `idb`     — Browser `IndexedDBStorageAdapter`; island receives a `dbName`.
 * - `memory`  — ephemeral in-memory storage; cold boot or test path.
 */
export type IslandStorageConfig =
  | { type: "nodefs";  dir:    string }
  | { type: "idb";     dbName: string }
  | { type: "memory" };

// ── Recipe + bag resolution ────────────────────────────────────────────────
//
// The manifest carries a WikiRecipe (the slot structure, vessel-independent)
// and IslandGrants (typed structural capabilities) — plain objects so they
// survive structuredClone across worker boundaries.
//
// `AutomergeUrl` IS the CapTP-style capability token for each CRDT bag's doc.
// A grant absent or null = in-memory / cold; library bags resolve island-side
// from @catalog (boot = first reconcile), never from the manifest.

// ── Vessel → island ──────────────────────────────────────────────────────────

/**
 * Deliver the materials a sovereign causal island needs to establish itself (boot TW5 + Repo-in-island).
 *
 * Island Sovereignty Law:
 *   - `syncPort` MUST be transferred (not cloned): `postMessage(msg, [msg.syncPort])`.
 *   - The island creates its own Automerge Repo with `MessageChannelNetworkAdapter(syncPort)`.
 *   - The island calls `repo.find(docUrl)` and awaits `handle.whenReady()` before declaring `ea`.
 *   - If `docUrl` is null the island creates a fresh empty doc (cold boot).
 *   - `coreHash` carries a SHA-256 hex of the TW5 core blob stored in `LarDoc.blobs[ENGINE_CORE_ID]` on the @lararium CRDT doc; null = pre-content-addressed trust-on-delivery.
 *     This field is an intent vector: once a CAS store exists, null MUST be rejected at boot.
 *
 * BA-5 (revised): TW5 core bytes live in `LarDoc.blobs[ENGINE_CORE_ID]` on the @lararium doc.
 * Islands read bytes from the CRDT after `handle.whenReady()`. The manifest carries only
 * `coreHash` (SHA-256 hex) as an integrity gate — never the raw bytes.
 * The vessel acts as courier — delivering capabilities, not raw bytes.
 * The island establishes its own sovereignty (`ea`) upon receipt.
 *
 * Prerequisite fields (island cannot think without these — not cargo):
 *   - `recipe` is the WikiRecipe slot structure (wikiSlug + optional libraryBags).
 *   - `grants` carries the island's typed structural capabilities (engine doc,
 *     own bag, keyhive-bound @personal/@draft, @catalog ACCESS). Library bags
 *     never ride the manifest: the island resolves them itself from @catalog
 *     (recipe-watch reconcile — boot runs the same path as live composition).
 *
 * Plugin tiddlers travel via the @lararium CRDT blob store (application/json blobs).
 * Islands read and apply them from the CRDT after `handle.whenReady()` — no manifest field needed.
 */

/**
 * IslandGrants — the typed structural capabilities a vessel HANDS an island at
 * manifest. Each names a capability granted (ocap: arrives as a grant, never
 * looked up from a main-owned dictionary). The island resolves everything else
 * — @lares, library bags, oracle moves — from @catalog itself, sovereign-side.
 */
export interface IslandGrants {
  /** @lararium engine/system doc — REQUIRED (engine bytes precede TW5 boot). */
  islandUrl:    string;
  /** @catalog registry ACCESS (never layered; access≠load). Absent/null = no watch. */
  catalogUrl?:  string | null;
  /** The island's OWN bag (@<wikiSlug>; @daemon under the one-recipe model). */
  wikiUrl?:     string | null;
  /** Keyhive-bound sovereign slots (daemon resolveBinding grants). */
  personalUrl?: string | null;
  draftUrl?:    string | null;
  /** @working — the SAVED live write layer (PersonaGroup×fingerprint-bound, like
   *  @personal); normal edits route here, canon publishes on a promotion MOVE. */
  workingUrl?:  string | null;
}
export interface IslandMsg_Manifest {
  schema_version: ProtocolVersion;
  type: "manifest";
  wikiUri: string;
  /**
   * SHA-256 hex of the TW5 core blob (`LarDoc.blobs[ENGINE_CORE_ID]`).
   * null = pre-CAS trust-on-delivery. Islands verify on read from @lararium CRDT doc.
   */
  coreHash: string | null;
  /**
   * CIDs (sha256) of the engine's plugin-tiddler blobs (application/json). The worker
   * resolves these — and the core (coreHash) — via the host's content-addressed
   * `resolveByCid` (local CAS), NOT by reading a CRDT-synced blob doc. Absent → the
   * worker falls back to reading blobs off the @oracle doc (node / pre-CAS path).
   */
  pluginCids?: readonly string[];
  /** Slot structure for this wiki — wikiSlug + optional libraryBags. */
  recipe: import("./wiki-recipe.js").WikiRecipe;
  /** Typed structural capabilities (see IslandGrants). Libraries resolve via @catalog. */
  grants: IslandGrants;
  /**
   * Storage adapter configuration for the island-side Automerge Repo.
   * When present, the island creates a persistent Repo (NodeFS or IDB).
   * Absent or `{ type: "memory" }` = ephemeral relay-only Repo (test / cold-boot path).
   */
  storage?: IslandStorageConfig;
  /** MessagePort for island-side Repo ↔ vessel Repo sync. MUST be transferred. */
  syncPort: MessagePort;
  /**
   * Serializable disk mirror configs for island-hosted LarDiskProjector.
   * Each entry carries `bagId`, `mirrorRoot` (absolute path), and `scope`
   * (e.g. "@lares", "@lararium") so the island can reconstruct `BagMirrorConfig`
   * via `namedBagMirror(scope, mirrorRoot)` from `bag-paths`.
   * Absent = no disk projection for this island.
   */
  diskMirrors?: readonly { bagId: string; mirrorRoot: string; scope: string }[];
  /**
   * DAEMON-ISLAND ONLY — operator authn/z material for in-worker keyhive boot
   * (isomorphic-vessel epic, Stage 1). The daemon worker's `onEa` calls
   * `bootDaemonKeyhive` with this + its daemon CompositeStore (the cap-event
   * EventStore backing). Populated ONLY by openDaemonVm / openBrowserDaemonVm;
   * wiki manifests leave it absent, so the operator seed never reaches a wiki
   * worker. The seed crossing the worker boundary is the deliberate custody
   * boundary (operator-confirmed): the daemon island is the authn/z home.
   */
  daemonAuth?: {
    /** 32-byte operator signing seed. */
    seed:                  Uint8Array;
    /** Hex Ed25519 verifying key the keyhive identity MUST resolve to (Gate A). */
    operatorVerifyingKey:  string;
    personaGroupDocIdHex:   string;
    personaGroupAgentIdHex: string;
    meshCabalDocIdHex:     string;
    /** Writable bag URIs to register so verify/delegate resolve (lar: URIs). */
    registerBags:          readonly string[];
    /** The PINNED signer DID — provenance only (the founding op-key = the KEL inception op-key). The Binding
     *  Gate no longer PINS this; it pins `personaKel.prefix` and walks the KEL to the current head (no hybrid). */
    signerDid:             string;
    /** The persona-KEL PIN + the LOCAL-replica chain the worker walks. `prefix` is the stable identifier (AID)
     *  read from @daemon (the pin's root of trust); `chain` is the seq-sorted key-event-log the MAIN thread read
     *  from its per-Nexus KEL board replica "as of last sync" (no-global-now). The Binding Gate asserts
     *  `chain[0].prefix === prefix`, walks to the current head op-key, and verifies the edge against THAT head —
     *  fail-closed on an absent/broken chain (never a global lookup). */
    personaKel:            { readonly prefix: string; readonly chain: readonly PersonaKelEvent[] };
    /** This vessel's signed device-delegation edge (root→vessel) — the public, Beelay-free binding. */
    deviceEdge:            DeviceDelegationTiddler;
    /** A prior keyhive Archive (from the identity home) — the restore FLOOR keyhive inits from before
     *  replaying @daemon cap-events. Absent on a first boot / a vessel that never persisted one. */
    archiveBytes?:         Uint8Array;
  };
}

/**
 * Cool the wiki slot from `wela` (hot) to `anu` (cold) — teardown; thread
 * terminates. Type literal `"hooanu"` — Hawaiian: hoʻoanu, "to cool."
 *
 * The temperature register replaces an organizational rank register (the old
 * `"demote"`) that would conflict with the residency-model ACTION verb surface.
 * The two thermal states wear ʻōlelo Hawaiʻi: `wela` / `anu` (see
 * residency-tiers.md).
 *
 * Counterpart: `anu` → `wela` (hoʻowela, "to heat") happens at the vessel layer
 * via `vessel-island-pool.mountWiki` — a fresh worker boots and runs `ea` — not
 * via a worker-side signal. A `warm` middle tier (suspended-not-terminated,
 * resume by a hoʻomahana signal) was proposed and CUT: a
 * suspended Worker still holds its heap, so it did not shed memory, and the
 * proven virtual-actor runtimes use two states. Reintroduce only behind a
 * measured resume-cost problem AND a memory-shedding suspend — reopening
 * condition in residency-tiers.md #warm-cut. No HooMahana signal type today.
 */
export interface IslandMsg_HooAnu {
  schema_version: ProtocolVersion;
  type: "hooanu";
  wikiUri: string;
}

/**
 * Begin the GP-5 teardown handshake.
 * Island MUST complete in-flight reactions, cancel all live handles, export Repo doc bytes,
 * then respond with `teardown:ack` before the vessel calls worker.terminate().
 */
export interface IslandMsg_Teardown {
  schema_version: ProtocolVersion;
  type: "teardown";
}

// ── Daemon island protocol ─────────────────────────────────────────────────
//
// Three-message round-trip for daemon island verb coordination.
//
// Vessel → island: DaemonMsg_PlaceVerb   — place a volatile verb invocation in the daemon TW5 wiki.
// Island → vessel: DaemonMsg_DelegateVerb — delegate a wiki-scope verb whose handler lives on main.
// Vessel → island: DaemonMsg_VerbResult  — deliver delegation result or error back to island.
//
// The daemon island owns the TW5 wiki event surface (kumu device law).
// All verbs pass through the daemon wiki change event → VerbDispatcher tick.
// Wiki-scope handlers that need vessel resources (repo, catalogHandle, etc.)
// delegate via DaemonMsg_DelegateVerb; the island awaits DaemonMsg_VerbResult before writing outcome.

/** Vessel → island: place a volatile verb invocation in the daemon island's TW5 wiki. */
export interface DaemonMsg_PlaceVerb {
  schema_version: ProtocolVersion;
  type: "daemon:place-verb";
  verb: string;
  args: Record<string, unknown>;
  requestedBy: string;
  targets?: string[];
  batchMode?: string;
  requestId?: string;
  fromUri?: string;
  listenable?: string;
}

/**
 * Vessel → island: FEED one captured turn to the @daemon's idempotent telemetry capture cap.
 * The cap (hasCapture) claims this signal type and enqueues (turnText, sourceFile) into the nalu
 * (accumulate IN → WAL → flush via `mine --source ndjson`). Distinct from daemon:place-verb (which
 * the DISPATCH cap claims for VerbDispatcher verbs) — caps are independent, so a separate signal.
 */
export interface DaemonMsg_TelemetryPlaceVerb {
  schema_version: ProtocolVersion;
  type: "telemetry:place-verb";
  turnText: string;
  sourceFile: string;
  /**
   * The branch-frontier — the head turn-uuid(s) the producer (cli) derived from the transcript's
   * parentUuid turn-DAG (branchContextForTurn). Absent on a non-forked turn (the common case),
   * so the handle stays byte-identical to before. Carried as flat uuid strings; the in-VM annotate
   * rebuilds the {@link BranchContext} and feeds it to buildPatch's 3rd arg (the fork-cut).
   */
  frontier?: readonly string[];
  /**
   * The USER turn's uuid — the PROVENANCE key the node AST split lifts into the .structurepalace, so a
   * later rewind (kapae) can set-aside exactly this turn's recurrence tally. Absent ⇒ no key (the
   * turn's AST is stored, but not kapae-addressable). Stripped from the content drawer.
   */
  turnKey?: string;
  /**
   * The producer's stable per-source ordinal (the exchange index within the transcript) — the
   * ndjson `chunk_index` half of the deterministic drawer id (`sha256(source_file)_chunk`), so
   * the verb leg and the daemon-down direct-mine fallback converge on ONE drawer per turn.
   * Absent ⇒ the engine derives a stable ordinal from the turnKey / content hash.
   */
  chunkIndex?: number;
}

/**
 * Vessel → island: REWIND (kapae) one turn's .structurepalace tally — the convergence twin of the KG
 * valid-close + the Measure salience down-weight. Fire-and-forget (symmetric with telemetry
 * capture): the @daemon owns the warm .structurepalace serve holder (a flock-singleton the CLI cannot
 * re-open), so the producer routes the rewind here. The capture cap (hasCapture) holds the engine
 * that holds the holder; it set-asides the turn's tally AND down-weights the turn's content drawers.
 */
export interface DaemonMsg_StructurepalaceKapae {
  schema_version: ProtocolVersion;
  type: "structurepalace:kapae";
  /** The USER turn's uuid to rewind (matched against the .structurepalace provenance turn_key). */
  turnKey: string;
  /** Optional rewind timestamp (the tombstone `valid_to`); defaults to now in the holder. */
  ended?: string;
}

/**
 * Vessel → island: derive a recall query's move-skeleton IN the daemon VM (the recall twin of the
 * telemetry capture). The host's recall verb routes a sigil-bearing query string here so the
 * markers→vector recall runs the SAME Move→Vec functor capture runs — parse with the full self-hosted
 * grammar + emit the skeleton (structural plane present) against the LIVE grammar-cache basis. One
 * runtime, no node-side fallback. The island calls `$tw.lares.deriveQuerySkeletonVm` and answers with
 * {@link DaemonMsg_DeriveSkeletonResult}.
 */
export interface DaemonMsg_DeriveSkeletonRequest {
  schema_version: ProtocolVersion;
  type: "daemon:derive-skeleton-request";
  requestId: string;
  /** The recall query — sniffed in-VM for sigil markers, parsed with the full grammar. */
  query: string;
}

/** Island → vessel: the in-VM query-derive result. `skeleton`+`basis` (plain objects — the move-
 *  skeleton + the serialized `{axes, dimension}` basis) when the query carried a derivable move-form;
 *  BOTH absent (a graceful null) when it did not (→ the recall fuses content-only). `error` carries a
 *  derive fault (the VM unavailable degrades to null at the host, never an error). */
export interface DaemonMsg_DeriveSkeletonResult {
  schema_version: ProtocolVersion;
  type: "daemon:derive-skeleton-result";
  requestId: string;
  skeleton?: unknown;
  basis?: unknown;
  error?: string;
}

// ── Worldline reads (the permainan substrate — sovereign-worker home) ───────
//
// The flow-lens reads run IN the daemon VM, the same one-runtime lock the recall
// query-derive rides (the cap-stack lifts WHOLE — no coordinator carve-out). Two
// reads, two request/result pairs mirroring DeriveSkeleton:
//
//   worldline-compare    — Well 1, the ITC LIVE-READ. The worker holds the
//     WorldlineCausal registry (projected from the edge-DAG it receives) and
//     answers the concurrent-capable causal verdict (before/after/concurrent/equal).
//   worldline-trajectory — Well 3 + Well 4, THE CORE. The worker orders a handle's
//     captured turns by happened-before (orderTrajectory), joins each turn's
//     move-space position (joinFormVectors over the form-vectors the host ships —
//     the formpalace is a node child_process the worker can't reach, so the host
//     fetches the bytes and ships them IN, exactly as it ships the query string to
//     derive), and optionally rides the SAME path through the seeded null shuffle.
//
// All COMPUTE — registry, ITC compare, ordering, joining, shuffling — lives in the
// worker; the host supplies only external data (edges from a transcript, form-vector
// bytes from the python store). Graceful: an unknown handle / empty input degrades
// like the derive (an `error` string or an empty result), never throws across the wire.

/** One captured turn pre-order, on the wire (GP-2 plain object): the join key + the within-handle
 *  happened-before tick + (optionally) the move-space position the host pre-fetched from the form
 *  store. `formVector` absent/null → the worker keeps the turn's TIME slot with a null form slot. */
export interface WorldlineStubWire {
  verbatimSha: string;
  tickCounter: number;
  formVector?: SparseFormVector | null;
}

/**
 * Vessel → island: answer the concurrent-capable causal verdict between two handles, IN the daemon VM.
 * The worker projects the WorldlineCausal registry from the edge-DAG carried here (worldlineCausalFromEdges)
 * — `opens`/`closes` derived host-side from a session transcript — then runs the pure ITC tree-leq. The
 * in-VM fn lives on `$tw.lares.worldlineCompareVm`. An unknown handle answers `error` (never throws the wire).
 */
export interface DaemonMsg_WorldlineCompareRequest {
  schema_version: ProtocolVersion;
  type: "daemon:worldline-compare-request";
  requestId: string;
  a: string;
  b: string;
  /** The durable edge-DAG opens (prov:Delegation spawn / prov:Communication inject), plain objects. */
  opens: readonly WorldlineEdgeTriple[];
  /** The edge-DAG closes (prov:Delegation handback) — absent when no handback edges stand. */
  closes?: readonly WorldlineEdgeClose[];
  /** The run-root / common-cause handle the registry seeds from (default "operator"). */
  root?: string;
}

/** Island → vessel: the ITC causal verdict (`order`) — or an `error` (unknown handle / no registry). */
export interface DaemonMsg_WorldlineCompareResult {
  schema_version: ProtocolVersion;
  type: "daemon:worldline-compare-result";
  requestId: string;
  /** "before" | "after" | "concurrent" | "equal" — the ItcOrder, carried as a plain string (GP-2). */
  order?: string;
  error?: string;
}

/**
 * Vessel → island: a handle's worldline-ordered path through move-space, IN the daemon VM (Well 3 +
 * Well 4). The worker runs orderTrajectory over the carried stubs, joins the form-vectors the host
 * shipped, and — when `includeNull` — rides the SAME path through the seeded shuffle. The in-VM fn
 * lives on `$tw.lares.worldlineTrajectoryVm`. The trajectory (+ optional null baseline) rides back as
 * a plain object (GP-2). Empty stubs → an empty trajectory (graceful, like a derive null).
 */
export interface DaemonMsg_WorldlineTrajectoryRequest {
  schema_version: ProtocolVersion;
  type: "daemon:worldline-trajectory-request";
  requestId: string;
  handle: string;
  stubs: readonly WorldlineStubWire[];
  /** Join move-space positions (default true; false = TIME-only skeleton). */
  joinForm?: boolean;
  /** Also compute the seeded null baseline (the shuffled order). */
  includeNull?: boolean;
  /** PRNG seed — a reproducible null (default 1). */
  seed?: number;
  /** Scale grading: the shuffle window (default full shuffle). */
  window?: number;
}

/** Island → vessel: the worldline-ordered trajectory (+ optional null baseline) as plain objects. */
export interface DaemonMsg_WorldlineTrajectoryResult {
  schema_version: ProtocolVersion;
  type: "daemon:worldline-trajectory-result";
  requestId: string;
  trajectory?: unknown;
  nullBaseline?: unknown;
  error?: string;
}

/**
 * Island → vessel: delegate a wiki-scope verb to the vessel handler registry.
 * Emitted when the daemon island's VerbDispatcher encounters a verb not in its local registry.
 * The vessel executes the handler and posts DaemonMsg_VerbResult back.
 */
export interface DaemonMsg_DelegateVerb {
  schema_version: ProtocolVersion;
  type: "daemon:delegate-verb";
  requestId: string;
  verb: string;
  args: Record<string, unknown>;
  requestedBy: string;
  targets?: string[];
  batchMode?: string;
}

/** Vessel → island: delegation result or error. Daemon island resolves the in-flight delegation promise. */
export interface DaemonMsg_VerbResult {
  schema_version: ProtocolVersion;
  type: "daemon:verb-result";
  requestId: string;
  result?: Record<string, unknown>;
  error?: string;
}

// ---------------------------------------------------------------------------
// Auth verify proxy (isomorphic-vessel epic, Stage 1+2)
// ---------------------------------------------------------------------------
// Keyhive lives in the daemon island after Stage 1, but inbound untrusted peers
// land on the HOST transport (node WS server). The host's AuthVerifierSeam asks
// the island to verify each peer; the island answers via its keyhive. Path (b).

/** Vessel → island: verify an inbound peer's capability. Host has no keyhive. */
export interface DaemonMsg_VerifyRequest {
  schema_version: ProtocolVersion;
  type: "daemon:verify-request";
  requestId: string;
  /** The peer's serialized Keyhive ContactCard bytes. */
  cardBytes: Uint8Array;
  /** The bag the peer wants to sync. */
  bagUrl: string;
  /** Access level required. */
  access: "read" | "admin";
  /**
   * V3 proof-of-possession material relayed from the peer's lar:auth, for the
   * in-worker keyholder to verify (project_verification_placement). Optional:
   * absent until the peer transport (C) sources it; the worker reports
   * `proofVerified` advisory-only until the enforcement flip (D).
   */
  proof?: AuthProofWire;
  /**
   * OPTIONAL device-delegation edge (Seam B) relayed from the peer's lar:auth. The in-worker
   * keyholder verifies it against the PINNED hearth root and admits a device-admitted peer that
   * holds no cap=admin. Absent → the worker takes the existing admin-cap path unchanged.
   */
  edge?: DeviceDelegationTiddler;
}

/**
 * PeerClass — how the admitted inbound peer relates to THIS operator's identity, the signal the
 * node sharePolicy reads to arm the federatable-own/private-own self-slot split.
 *   · "same-operator" — the peer proved it carries THIS operator's identity: it holds cap=admin on
 *     @daemon (only this operator's PersonaGroup does), OR it presented a device-delegation edge that
 *     chains to this hearth's PINNED persona-root (signerDid). Either proof binds the peer to the
 *     operator's own device-fleet → it keeps FULL device sync (every private plane crosses).
 *   · "cross-operator" — the peer carries a DIFFERENT operator identity (a cabal-mate / another kahu):
 *     it reaches ONLY the deterministically-federatable-own planes, never a private-own plane.
 *
 * FAIL-CLOSED law: the CLASS a verdict cannot positively vouch as same-operator is `undefined` here;
 * the sharePolicy treats an absent/unresolved class as the STRICTER cross-operator class. Only the two
 * unforgeable proofs above (admin@daemon · pinned-root device-edge) earn "same-operator".
 */
export type PeerClass = "same-operator" | "cross-operator";

/** Island → vessel: the keyhive verdict for a verify-request. */
export interface DaemonMsg_VerifyResult {
  schema_version: ProtocolVersion;
  type: "daemon:verify-result";
  requestId: string;
  ok: boolean;
  /** Peer's keyhive Identifier hex (from the island's receiveContactCard), so the
   *  host can key its sharePolicy/peer map without a local keyhive. */
  identifier?: string;
  reason?: string;
  /**
   * V3 advisory: whether the relayed proof's Ed25519 signature verified against
   * the card-derived key + this gate's own key. `undefined` when no proof crossed.
   * Advisory until the enforcement flip (D) folds it into `ok`.
   */
  proofVerified?: boolean;
  /**
   * The peer's relation to this operator's identity (#the self-slot split). Set only on an `ok` verdict
   * that PROVES same-operator (admin@daemon or a pinned-root device-edge). Absent → the host fails closed
   * to cross-operator (federatable-own planes only). See PeerClass.
   */
  peerClass?: PeerClass;
}

// ---------------------------------------------------------------------------
// @personal / @draft binding resolution (isomorphic-vessel epic, Stage 1)
// ---------------------------------------------------------------------------
// resolveOrMintBinding mints + delegates via keyhive, which lives in the daemon
// island after Stage 1. The host posts a request with the recipe fingerprint;
// the island mints/reuses against its Repo + keyhive and returns the doc URLs.

/** Vessel → island: resolve (or mint+delegate) the @personal/@draft binding pair. */
export interface DaemonMsg_ResolveBindingRequest {
  schema_version: ProtocolVersion;
  type: "daemon:resolve-binding-request";
  requestId: string;
  fingerprint: string;
  recipeTrace: { wikiDocId: string; libraryBagDocIds: readonly string[] };
}

/** Island → vessel: the resolved binding doc URLs (or an error). */
export interface DaemonMsg_ResolveBindingResult {
  schema_version: ProtocolVersion;
  type: "daemon:resolve-binding-result";
  requestId: string;
  personalUrl?: string;
  draftUrl?: string;
  workingUrl?: string;
  error?: string;
}

// ── Eviction command (sovereign-worker: policy in worker, mechanism at the pool) ──
// The daemon WORKER owns residency POLICY (who/what to evict, gated by keyhive). The
// pool MECHANISM (mount/teardown of main-thread lanes) stays main-side. So the worker
// INITIATES an eviction by sending this command; the main pool obeys + acks. The worker
// holds a CAPABILITY (this channel) to the pool, never the pool itself.

/** Island → vessel: the worker commands the main pool to evict (unmount) a bag's lane. */
export interface DaemonMsg_EvictRequest {
  schema_version: ProtocolVersion;
  type: "daemon:evict-request";
  requestId: string;
  /** The bag (lar: URI) whose live lane the pool should tear down. */
  bagId: string;
}

/** Vessel → island: the pool's ack for an evict-request. */
export interface DaemonMsg_EvictResult {
  schema_version: ProtocolVersion;
  type: "daemon:evict-result";
  requestId: string;
  ok: boolean;
  error?: string;
}

/**
 * Island → vessel: the worker commands a residency-state op on the main-resident
 * BagResidencyManager (sovereign-worker: the worker holds the keyhive-gated POLICY,
 * the manager + its LRU/reachability MECHANISM stays at the resource/main). The
 * worker's residency verbs (pin/unpin/register-cold) post this fire-and-forget — the
 * grant records as policy; main executes. (`residency` stats — a read — stays main
 * pending the askMain research.)
 */
export interface DaemonMsg_ResidencyOp {
  schema_version: ProtocolVersion;
  type: "daemon:residency-op";
  requestId: string;
  op: "pin" | "unpin" | "register-cold";
  bagId: string;
  reason?: string;
}

/** Vessel → island: ack for a residency-op. */
export interface DaemonMsg_ResidencyOpResult {
  schema_version: ProtocolVersion;
  type: "daemon:residency-op-result";
  requestId: string;
  ok: boolean;
  error?: string;
}

/**
 * Island (daemon worker) → vessel: seed a reboot-pending alert into a live wiki's
 * @temp. A reboot-requiring daemon change (recipe/oracle/active-marker edit — all in
 * bags the wiki island doesn't load) syncs but only applies on the wiki's next boot;
 * the daemon commands main to deliver a `system-alert` verb to the affected live
 * island so the operator sees it. Fire-and-forget (best-effort UX); main skips wikis
 * that aren't mounted. The daemon computes "affected by content"; main filters "live".
 */
export interface DaemonMsg_WikiAlert {
  schema_version: ProtocolVersion;
  type: "daemon:wiki-alert";
  /** The affected wiki's slug — main maps it to `${hostId}:${slug}` to find the island. */
  wikiSlug: string;
  /** Operator-facing message (e.g. "Recipe changed — reboot to apply"). */
  message: string;
  /** The verb that caused the change (audit/display). */
  cause?: string;
  /** Alert kind — selects the alert tiddler ("reboot-pending" default; "disk-ward" etc.). */
  kind?: string;
}

/**
 * Vessel → wiki island: one sensorium read-signal ridden over the worker wire. The message
 * TYPE carries the cap-owned signal name (`sensorium:<cap-verb>`), so the kernel's dispatch delivers it
 * STRAIGHT to the island cap that claims it. The wire admits the namespace without enumerating a vessel's
 * possible sensory acts; each cap owns its own verbs. The island answers on its `sensorium:frame` event
 * (IslandMsg_Event), correlated by `requestId`; the vessel routes that frame back through onWorkerEvent.
 * Read-only end to end — no field of this message writes.
 */
export interface WikiMsg_SensoriumSignal {
  schema_version: ProtocolVersion;
  type: SensoriumSignalType;
  requestId: string;
  /** verb fields (recall's text/sigilHead/likeTitle/limit) — the cap reads them off `args`. */
  args?: Record<string, unknown>;
}

/** One cap-owned sensorium signal. The open suffix prevents central protocol edits for new vessel caps. */
export type SensoriumSignalType = `sensorium:${string}`;

/** Accept one non-empty lower-kebab cap verb; the cap, not the wire, owns its semantics. */
export function isSensoriumSignalType(value: unknown): value is SensoriumSignalType {
  return typeof value === "string" && /^sensorium:[a-z][a-z0-9-]*$/.test(value);
}

/** All messages the vessel may send to a causal island. */
export type VesselToIslandMsg =
  | IslandMsg_Manifest
  | IslandMsg_HooAnu
  | IslandMsg_Teardown
  | DaemonMsg_PlaceVerb
  | DaemonMsg_TelemetryPlaceVerb
  | DaemonMsg_StructurepalaceKapae
  | DaemonMsg_DeriveSkeletonRequest
  | DaemonMsg_WorldlineCompareRequest
  | DaemonMsg_WorldlineTrajectoryRequest
  | DaemonMsg_VerbResult
  | DaemonMsg_VerifyRequest
  | DaemonMsg_ResolveBindingRequest
  | DaemonMsg_EvictResult
  | DaemonMsg_ResidencyOpResult
  | WikiMsg_PlaceVerb
  | WikiMsg_DomEvent
  | WikiMsg_SensoriumSignal;

// ── Island → vessel ──────────────────────────────────────────────────────────

/**
 * Emit a verse-event reaction to the vessel for cross-wiki routing.
 * GP-2: payload MUST contain only string | number | boolean values.
 */
export interface IslandMsg_Event {
  schema_version: ProtocolVersion;
  type: "event";
  wikiUri: string;
  listenable: string;
  payload: Record<string, string | number | boolean>;
}

/**
 * GP-5 handshake completion.
 * Sent after all in-flight reactions complete and all live handles cancelled.
 * Vessel calls worker.terminate() on receipt.
 */
export interface IslandMsg_TeardownAck {
  schema_version: ProtocolVersion;
  type: "teardown:ack";
}

/**
 * Sovereignty declaration — the island signals it breathes (`ea`): TW5 live, Repo synced, first frame ready.
 *
 * In Hawaiian: ea = sovereignty, breath, life. The island declares its own standing;
 * the vessel records the declaration and considers the island live.
 * See: lar:///ha.ka.ba/lares/api/pono/ea
 */
export interface IslandMsg_Ea {
  schema_version: ProtocolVersion;
  type: "ea";
  wikiUri: string;
}

/**
 * Mount-progress breath — the island signals it still breathes while mounting.
 *
 * The ea-breath law: a mounting island that still emits never reads dead,
 * however long the mount. Vessel watchdogs (daemon VM, island pool) re-arm
 * their silence window on each breath; silence alone times out. `phase`
 * names the mount stage underway, so a silence timeout can say where the
 * breathing stopped. Emission ends at settle (`ea` or `fault`).
 *
 * `progress` carries a monotonic work counter (slots resolved, stages
 * entered) — the progress-kick law: a breath whose (phase, progress) pair
 * freezes proves only that the event loop turns, not that mount advances;
 * watchdogs bound that state with a stall budget. (The embedded-systems
 * "timer-ISR kick" anti-pattern, guarded.)
 */
export interface IslandMsg_Breath {
  schema_version: ProtocolVersion;
  type: "breath";
  wikiUri: string;
  phase: string;
  progress: number;
}

/**
 * Island fault signal. Vessel MUST mark the slot as evicted.
 */
export interface IslandMsg_Fault {
  schema_version: ProtocolVersion;
  type: "fault";
  wikiUri: string;
  error: string;
}

/**
 * Vessel → island: place a wiki-scope verb invocation into a wiki island's TW5 wiki.
 *
 * Parallel to DaemonMsg_PlaceVerb for the daemon island. Any island running a
 * wiki dispatch behavior handles this by calling placeVerb on its TW5 wiki.
 * The wiki change event fires at next tick; the island's VerbDispatcher dispatches it.
 */
export interface WikiMsg_PlaceVerb {
  schema_version: ProtocolVersion;
  type:           "wiki:place-verb";
  verb:           string;
  args:           Record<string, unknown>;
  requestedBy:    string;
  targets?:       string[];
  batchMode?:     string;
  requestId?:     string;
}

/**
 * Vessel → wiki island: a main-thread DOM event relayed back to the projected wiki — the
 * interactivity RETURN leg (the accumulate-family inbound twin of the coalesce projection OUT).
 * The worker resolves `renderId` to the fake DOM node TW5 bound a listener to and invokes TW5's
 * OWN stored handler; from `tm-navigate` onward the widget tree runs as if the event were local.
 * `fields` is an explicit allowlist of primitive event properties (GP-2: primitives only).
 */
export interface WikiMsg_DomEvent {
  schema_version: ProtocolVersion;
  type:           "wiki:dom-event";
  renderId:       string;
  eventType:      string;
  fields:         Record<string, number | boolean>;
}

/**
 * Island → vessel: wiki-scope verb result.
 *
 * Sent by a wiki island's dispatch behavior after completing a verb whose result
 * the vessel needs (e.g. MOVE — result carries the moved record list).
 * For fire-and-forget verbs (no result needed) the island omits this message.
 */
export interface WikiMsg_VerbResult {
  schema_version: ProtocolVersion;
  type:           "wiki:verb-result";
  requestId:      string;
  result?:        Record<string, unknown>;
  error?:         string;
}

/**
 * Worker readiness signal — the island's message handler is registered and the Worker
 * is ready to receive the manifest. The vessel MUST NOT send the manifest (with
 * transferred syncPort) until it receives this signal.
 *
 * This is required for ES module Workers that load WASM at startup (top-level await).
 * Messages sent before the listener is registered are dropped in browser Workers.
 * Inversion of control: the Worker initiates; the vessel waits.
 */
export interface IslandMsg_Ready {
  schema_version: ProtocolVersion;
  type: "ready";
}

/** All messages a causal island may send to the vessel. */
export type IslandToVesselMsg =
  | IslandMsg_Event
  | IslandMsg_TeardownAck
  | IslandMsg_Ea
  | IslandMsg_Breath
  | IslandMsg_Fault
  | IslandMsg_Ready
  | WikiMsg_VerbResult
  | DaemonMsg_DelegateVerb
  | DaemonMsg_DeriveSkeletonResult
  | DaemonMsg_WorldlineCompareResult
  | DaemonMsg_WorldlineTrajectoryResult
  | DaemonMsg_VerifyResult
  | DaemonMsg_ResolveBindingResult
  | DaemonMsg_EvictRequest
  | DaemonMsg_ResidencyOp
  | DaemonMsg_WikiAlert;

// ── Type guards ────────────────────────────────────────────────────────────

function _hasVersion(v: unknown): v is { schema_version: ProtocolVersion; type: string } {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as Record<string, unknown>).schema_version === ISLAND_PROTOCOL_VERSION &&
    typeof (v as Record<string, unknown>).type === "string"
  );
}

export function isVesselToIslandMsg(v: unknown): v is VesselToIslandMsg {
  if (!_hasVersion(v)) return false;
  return (["manifest", "hooanu", "teardown", "daemon:place-verb", "telemetry:place-verb", "structurepalace:kapae", "daemon:derive-skeleton-request", "daemon:worldline-compare-request", "daemon:worldline-trajectory-request", "daemon:verb-result", "daemon:verify-request", "daemon:resolve-binding-request", "daemon:evict-result", "daemon:residency-op-result", "wiki:place-verb", "wiki:dom-event"] as const)
    .includes(v.type as Exclude<VesselToIslandMsg["type"], SensoriumSignalType>) || isSensoriumSignalType(v.type);
}

export function isIslandToVesselMsg(v: unknown): v is IslandToVesselMsg {
  if (!_hasVersion(v)) return false;
  return (["event", "teardown:ack", "ea", "breath", "fault", "ready", "wiki:verb-result", "daemon:delegate-verb", "daemon:derive-skeleton-result", "daemon:worldline-compare-result", "daemon:worldline-trajectory-result", "daemon:verify-result", "daemon:resolve-binding-result", "daemon:evict-request", "daemon:residency-op", "daemon:wiki-alert"] as const).includes(
    v.type as IslandToVesselMsg["type"],
  );
}

// ── Envelope factories ─────────────────────────────────────────────────────

export function mkTeardown(): IslandMsg_Teardown {
  return { schema_version: ISLAND_PROTOCOL_VERSION, type: "teardown" };
}

export function mkTeardownAck(): IslandMsg_TeardownAck {
  return { schema_version: ISLAND_PROTOCOL_VERSION, type: "teardown:ack" };
}

/**
 * Build a manifest delivery message — the courier packet the vessel sends to a causal island.
 *
 * TRANSFER: caller MUST include `syncPort` in the `postMessage` transfer list:
 *   `worker.postMessage(msg, [msg.syncPort])`
 *
 * The manifest carries the WikiRecipe (slot structure) + IslandGrants (typed
 * structural capabilities). The island wires granted slots to doc handles and
 * resolves library bags from @catalog itself (boot = first reconcile).
 *
 * No blob bytes travel in the manifest — TW5 core bytes and plugin tiddlers live in
 * the @lararium CRDT doc. Islands read them from the CRDT after `handle.whenReady()`.
 */
export function mkManifest(
  wikiUri:  string,
  syncPort: MessagePort,
  recipe:   import("./wiki-recipe.js").WikiRecipe,
  grants:   IslandGrants,
  coreHash: string | null = null,
  opts?: {
    storage?:        IslandStorageConfig;
    diskMirrors?:    readonly { bagId: string; mirrorRoot: string; scope: string }[];
    daemonAuth?:      IslandMsg_Manifest["daemonAuth"];
    pluginCids?:     readonly string[];
  },
): IslandMsg_Manifest {
  const msg: IslandMsg_Manifest = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "manifest",
    wikiUri,
    coreHash,
    recipe,
    grants,
    syncPort,
  };
  if (opts?.storage)             msg.storage     = opts.storage;
  if (opts?.diskMirrors?.length) msg.diskMirrors = opts.diskMirrors;
  if (opts?.daemonAuth)           msg.daemonAuth   = opts.daemonAuth;
  if (opts?.pluginCids?.length)  msg.pluginCids  = opts.pluginCids;
  return msg;
}

/** Ready signal — Worker has registered its message listener, vessel may now send the manifest. */
export function mkReady(): IslandMsg_Ready {
  return { schema_version: ISLAND_PROTOCOL_VERSION, type: "ready" };
}

/** Build an ea sovereignty declaration — the island signals it breathes and stands ready. */
export function mkEa(wikiUri: string): IslandMsg_Ea {
  return { schema_version: ISLAND_PROTOCOL_VERSION, type: "ea", wikiUri };
}

/** Build a mount-progress breath — `phase` names the stage, `progress` the monotonic work counter. */
export function mkBreath(wikiUri: string, phase: string, progress = 0): IslandMsg_Breath {
  return { schema_version: ISLAND_PROTOCOL_VERSION, type: "breath", wikiUri, phase, progress };
}

export function mkFault(wikiUri: string, error: string): IslandMsg_Fault {
  return { schema_version: ISLAND_PROTOCOL_VERSION, type: "fault", wikiUri, error };
}

export function mkDaemonPlaceVerb(opts: {
  verb: string;
  args: Record<string, unknown>;
  requestedBy: string;
  targets?: string[];
  batchMode?: string;
  requestId?: string;
  fromUri?: string;
  listenable?: string;
}): DaemonMsg_PlaceVerb {
  const msg: DaemonMsg_PlaceVerb = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "daemon:place-verb",
    verb: opts.verb,
    args: opts.args,
    requestedBy: opts.requestedBy,
  };
  if (opts.targets?.length)  msg.targets    = opts.targets;
  if (opts.batchMode)        msg.batchMode  = opts.batchMode;
  if (opts.requestId)        msg.requestId  = opts.requestId;
  if (opts.fromUri)          msg.fromUri    = opts.fromUri;
  if (opts.listenable)       msg.listenable = opts.listenable;
  return msg;
}

export function mkTelemetryPlaceVerb(opts: {
  turnText: string;
  sourceFile: string;
  frontier?: readonly string[];
  turnKey?: string;
  chunkIndex?: number;
}): DaemonMsg_TelemetryPlaceVerb {
  return {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "telemetry:place-verb",
    turnText: opts.turnText,
    sourceFile: opts.sourceFile,
    ...(opts.frontier && opts.frontier.length ? { frontier: [...opts.frontier] } : {}),
    ...(opts.turnKey ? { turnKey: opts.turnKey } : {}),
    ...(opts.chunkIndex !== undefined ? { chunkIndex: opts.chunkIndex } : {}),
  };
}

export function mkStructurepalaceKapae(opts: {
  turnKey: string;
  ended?: string;
}): DaemonMsg_StructurepalaceKapae {
  return {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "structurepalace:kapae",
    turnKey: opts.turnKey,
    ...(opts.ended ? { ended: opts.ended } : {}),
  };
}

export function mkDaemonDeriveSkeletonRequest(opts: {
  requestId: string;
  query: string;
}): DaemonMsg_DeriveSkeletonRequest {
  return {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "daemon:derive-skeleton-request",
    requestId: opts.requestId,
    query: opts.query,
  };
}

export function mkDaemonDeriveSkeletonResult(opts: {
  requestId: string;
  skeleton?: unknown;
  basis?: unknown;
  error?: string;
}): DaemonMsg_DeriveSkeletonResult {
  const msg: DaemonMsg_DeriveSkeletonResult = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "daemon:derive-skeleton-result",
    requestId: opts.requestId,
  };
  if (opts.skeleton !== undefined) msg.skeleton = opts.skeleton;
  if (opts.basis    !== undefined) msg.basis    = opts.basis;
  if (opts.error    !== undefined) msg.error    = opts.error;
  return msg;
}

export function mkDaemonWorldlineCompareRequest(opts: {
  requestId: string;
  a: string;
  b: string;
  opens: readonly WorldlineEdgeTriple[];
  closes?: readonly WorldlineEdgeClose[];
  root?: string;
}): DaemonMsg_WorldlineCompareRequest {
  const msg: DaemonMsg_WorldlineCompareRequest = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "daemon:worldline-compare-request",
    requestId: opts.requestId,
    a: opts.a,
    b: opts.b,
    opens: opts.opens,
  };
  if (opts.closes !== undefined) msg.closes = opts.closes;
  if (opts.root   !== undefined) msg.root   = opts.root;
  return msg;
}

export function mkDaemonWorldlineCompareResult(opts: {
  requestId: string;
  order?: string;
  error?: string;
}): DaemonMsg_WorldlineCompareResult {
  const msg: DaemonMsg_WorldlineCompareResult = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "daemon:worldline-compare-result",
    requestId: opts.requestId,
  };
  if (opts.order !== undefined) msg.order = opts.order;
  if (opts.error !== undefined) msg.error = opts.error;
  return msg;
}

export function mkDaemonWorldlineTrajectoryRequest(opts: {
  requestId: string;
  handle: string;
  stubs: readonly WorldlineStubWire[];
  joinForm?: boolean;
  includeNull?: boolean;
  seed?: number;
  window?: number;
}): DaemonMsg_WorldlineTrajectoryRequest {
  const msg: DaemonMsg_WorldlineTrajectoryRequest = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "daemon:worldline-trajectory-request",
    requestId: opts.requestId,
    handle: opts.handle,
    stubs: opts.stubs,
  };
  if (opts.joinForm    !== undefined) msg.joinForm    = opts.joinForm;
  if (opts.includeNull !== undefined) msg.includeNull = opts.includeNull;
  if (opts.seed        !== undefined) msg.seed        = opts.seed;
  if (opts.window      !== undefined) msg.window      = opts.window;
  return msg;
}

export function mkDaemonWorldlineTrajectoryResult(opts: {
  requestId: string;
  trajectory?: unknown;
  nullBaseline?: unknown;
  error?: string;
}): DaemonMsg_WorldlineTrajectoryResult {
  const msg: DaemonMsg_WorldlineTrajectoryResult = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "daemon:worldline-trajectory-result",
    requestId: opts.requestId,
  };
  if (opts.trajectory   !== undefined) msg.trajectory   = opts.trajectory;
  if (opts.nullBaseline !== undefined) msg.nullBaseline = opts.nullBaseline;
  if (opts.error        !== undefined) msg.error        = opts.error;
  return msg;
}

export function mkDaemonDelegateVerb(opts: {
  requestId: string;
  verb: string;
  args: Record<string, unknown>;
  requestedBy: string;
  targets?: string[];
  batchMode?: string;
}): DaemonMsg_DelegateVerb {
  const msg: DaemonMsg_DelegateVerb = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "daemon:delegate-verb",
    requestId: opts.requestId,
    verb: opts.verb,
    args: opts.args,
    requestedBy: opts.requestedBy,
  };
  if (opts.targets?.length)  msg.targets   = opts.targets;
  if (opts.batchMode)        msg.batchMode = opts.batchMode;
  return msg;
}

export function mkDaemonVerbResult(opts: {
  requestId: string;
  result?: Record<string, unknown>;
  error?: string;
}): DaemonMsg_VerbResult {
  const msg: DaemonMsg_VerbResult = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "daemon:verb-result",
    requestId: opts.requestId,
  };
  if (opts.result !== undefined) msg.result = opts.result;
  if (opts.error  !== undefined) msg.error  = opts.error;
  return msg;
}

export function mkDaemonVerifyRequest(opts: {
  requestId: string;
  cardBytes: Uint8Array;
  bagUrl:    string;
  access:    "read" | "admin";
  proof?:    AuthProofWire;
  edge?:     DeviceDelegationTiddler;
}): DaemonMsg_VerifyRequest {
  return {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "daemon:verify-request",
    requestId: opts.requestId,
    cardBytes: opts.cardBytes,
    bagUrl:    opts.bagUrl,
    access:    opts.access,
    ...(opts.proof ? { proof: opts.proof } : {}),
    ...(opts.edge ? { edge: opts.edge } : {}),
  };
}

export function mkDaemonVerifyResult(opts: {
  requestId:      string;
  ok:             boolean;
  identifier?:    string;
  reason?:        string;
  proofVerified?: boolean;
  peerClass?:     PeerClass;
}): DaemonMsg_VerifyResult {
  const msg: DaemonMsg_VerifyResult = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "daemon:verify-result",
    requestId: opts.requestId,
    ok:        opts.ok,
  };
  if (opts.identifier    !== undefined) msg.identifier    = opts.identifier;
  if (opts.reason        !== undefined) msg.reason        = opts.reason;
  if (opts.proofVerified !== undefined) msg.proofVerified = opts.proofVerified;
  if (opts.peerClass     !== undefined) msg.peerClass     = opts.peerClass;
  return msg;
}

export function mkDaemonResolveBindingRequest(opts: {
  requestId:   string;
  fingerprint: string;
  recipeTrace: { wikiDocId: string; libraryBagDocIds: readonly string[] };
}): DaemonMsg_ResolveBindingRequest {
  return {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "daemon:resolve-binding-request",
    requestId:   opts.requestId,
    fingerprint: opts.fingerprint,
    recipeTrace: opts.recipeTrace,
  };
}

export function mkDaemonResolveBindingResult(opts: {
  requestId:    string;
  personalUrl?: string;
  draftUrl?:    string;
  workingUrl?:  string;
  error?:       string;
}): DaemonMsg_ResolveBindingResult {
  const msg: DaemonMsg_ResolveBindingResult = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "daemon:resolve-binding-result",
    requestId: opts.requestId,
  };
  if (opts.personalUrl !== undefined) msg.personalUrl = opts.personalUrl;
  if (opts.draftUrl    !== undefined) msg.draftUrl    = opts.draftUrl;
  if (opts.workingUrl  !== undefined) msg.workingUrl  = opts.workingUrl;
  if (opts.error       !== undefined) msg.error       = opts.error;
  return msg;
}

export function mkDaemonEvictRequest(opts: { requestId: string; bagId: string }): DaemonMsg_EvictRequest {
  return {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "daemon:evict-request",
    requestId: opts.requestId,
    bagId:     opts.bagId,
  };
}

export function mkDaemonEvictResult(opts: { requestId: string; ok: boolean; error?: string }): DaemonMsg_EvictResult {
  const msg: DaemonMsg_EvictResult = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "daemon:evict-result",
    requestId: opts.requestId,
    ok:        opts.ok,
  };
  if (opts.error !== undefined) msg.error = opts.error;
  return msg;
}

export function mkDaemonResidencyOp(opts: {
  requestId: string;
  op: "pin" | "unpin" | "register-cold";
  bagId: string;
  reason?: string;
}): DaemonMsg_ResidencyOp {
  const msg: DaemonMsg_ResidencyOp = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "daemon:residency-op",
    requestId: opts.requestId,
    op:        opts.op,
    bagId:     opts.bagId,
  };
  if (opts.reason !== undefined) msg.reason = opts.reason;
  return msg;
}

export function mkDaemonWikiAlert(opts: {
  wikiSlug: string;
  message:  string;
  cause?:   string;
  kind?:    string;
}): DaemonMsg_WikiAlert {
  const msg: DaemonMsg_WikiAlert = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type:     "daemon:wiki-alert",
    wikiSlug: opts.wikiSlug,
    message:  opts.message,
    ...(opts.kind ? { kind: opts.kind } : {}),
  };
  if (opts.cause !== undefined) msg.cause = opts.cause;
  return msg;
}

export function mkDaemonResidencyOpResult(opts: { requestId: string; ok: boolean; error?: string }): DaemonMsg_ResidencyOpResult {
  const msg: DaemonMsg_ResidencyOpResult = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "daemon:residency-op-result",
    requestId: opts.requestId,
    ok:        opts.ok,
  };
  if (opts.error !== undefined) msg.error = opts.error;
  return msg;
}

export function mkWikiPlaceVerb(opts: {
  verb: string;
  args: Record<string, unknown>;
  requestedBy: string;
  targets?: string[];
  batchMode?: string;
  requestId?: string;
}): WikiMsg_PlaceVerb {
  const msg: WikiMsg_PlaceVerb = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "wiki:place-verb",
    verb: opts.verb,
    args: opts.args,
    requestedBy: opts.requestedBy,
  };
  if (opts.targets?.length)  msg.targets   = opts.targets;
  if (opts.batchMode)        msg.batchMode = opts.batchMode;
  if (opts.requestId)        msg.requestId = opts.requestId;
  return msg;
}

export function mkWikiDomEvent(opts: {
  renderId: string;
  eventType: string;
  fields: Record<string, number | boolean>;
}): WikiMsg_DomEvent {
  return {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "wiki:dom-event",
    renderId: opts.renderId,
    eventType: opts.eventType,
    fields: opts.fields,
  };
}

export function mkSensoriumSignal(opts: {
  signal: SensoriumSignalType;
  requestId: string;
  args?: Record<string, unknown>;
}): WikiMsg_SensoriumSignal {
  return {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: opts.signal,
    requestId: opts.requestId,
    // the S2 cap reads its fields off `args` when present — carry the requestId inside it too.
    args: { requestId: opts.requestId, ...(opts.args ?? {}) },
  };
}

export function mkWikiVerbResult(opts: {
  requestId: string;
  result?: Record<string, unknown>;
  error?: string;
}): WikiMsg_VerbResult {
  const msg: WikiMsg_VerbResult = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "wiki:verb-result",
    requestId: opts.requestId,
  };
  if (opts.result !== undefined) msg.result = opts.result;
  if (opts.error  !== undefined) msg.error  = opts.error;
  return msg;
}


// ── AuthVerifierSeam — host-side verify proxy (path b) ─────────────────────
//
// The host transport (node WS gate) holds no keyhive after Stage 1; it asks the
// daemon island to verify each inbound peer (the DaemonMsg_VerifyRequest/Result
// pair above) and keys its sharePolicy map off the returned `identifier`. Node
// binds this to DaemonAuthGate; the browser leaves it unbound (no inbound peer yet).
export interface AuthVerifierSeam {
  verify(
    cardBytes: Uint8Array,
    bagUrl: string,
    access: "read" | "admin",
    /** V3 proof material relayed from the peer's lar:auth; the in-worker
     *  keyholder verifies it (advisory `proofVerified` until the D flip). */
    proof?: AuthProofWire,
    /** OPTIONAL device-delegation edge (Seam B) — admits an operator-device-admitted peer. */
    edge?: DeviceDelegationTiddler,
  ): Promise<{ ok: boolean; identifier?: string; reason?: string; proofVerified?: boolean; peerClass?: PeerClass }>;
}
