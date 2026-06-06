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
 *      slot structure), `resolver` (slot URI → AutomergeUrl map), and `coreHash`
 *      (content-address intent vector; null = pre-CAS). TW5 core bytes are NOT transferred
 *      in the manifest — islands read them from `LarDoc.blobs[ENGINE_CORE_ID]` on the
 *      @lararium CRDT doc after `handle.whenReady()`. Two vessels federating @lararium
 *      share the engine automatically via Automerge sync.
 *   7. The vessel MUST close `mainPort` at evict/unmount time — before or after worker.terminate().
 *      Failure to close leaks the Automerge NetworkAdapter silently. This invariant is structural:
 *      every vessel implementation (node, browser, future) holds a `mainPort: MessagePort` on its
 *      hot slot and calls `mainPort.close()` in its teardown path. No exceptions.
 *   8. Federation seam — when a slot in `resolver` carries a non-empty AutomergeUrl, two obligations
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
 *      Boot sites (all inside Workers): `lar-admin-island.ts` (Node admin),
 *      `lar-wiki-island.ts` (Node wiki), `browser-wiki-worker.ts` (browser wiki),
 *      `browser-admin-island.ts` (browser admin). Main-thread entry files carry no TW5 import.
 *
 * GP-1: schema_version on every message. Lock at 1; increment on breaking changes.
 * GP-2: all payloads are plain objects; no class instances, no functions, no DOM.
 * GP-4: CryptoKey — NOT on this protocol surface; key material stays in-thread.
 *
 * Platform-neutral: no Node `worker_threads` import, no browser `self` import.
 * Vessel entrypoints bind the I/O; this module names the envelopes only.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/island-protocol
 */

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
// and a serialised BagResolver (slot URI → AutomergeUrl). `WikiRecipe` lives
// in wiki-recipe.ts; the resolver is a plain `{ [slotUri]: docUrl | null }`
// object so it survives structuredClone across worker boundaries.
//
// `AutomergeUrl` IS the CapTP-style capability token for each CRDT bag's doc.
// A slot URI without a resolver entry resolves to null (in-memory / cold).

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
 *   - `recipe` is the WikiRecipe slot structure (wikiSlug + optional canonBags).
 *   - `resolver` is the slot URI → AutomergeUrl map. Null entries indicate
 *     in-memory / cold slots (`@temp` always; other slots if creating fresh).
 *
 * Plugin tiddlers travel via the @lararium CRDT blob store (application/json blobs).
 * Islands read and apply them from the CRDT after `handle.whenReady()` — no manifest field needed.
 */
export interface IslandMsg_Manifest {
  schema_version: ProtocolVersion;
  type: "manifest";
  wikiUri: string;
  /**
   * SHA-256 hex of the TW5 core blob (`LarDoc.blobs[ENGINE_CORE_ID]`).
   * null = pre-CAS trust-on-delivery. Islands verify on read from @lararium CRDT doc.
   */
  coreHash: string | null;
  /** Slot structure for this wiki — wikiSlug + optional canonBags. */
  recipe: import("./wiki-recipe.js").WikiRecipe;
  /** Slot URI → AutomergeUrl. Null = in-memory or cold slot. */
  resolver: Readonly<Record<string, string | null>>;
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
   * ADMIN-ISLAND ONLY — operator authn/z material for in-worker keyhive boot
   * (isomorphic-vessel epic, Stage 1). The admin worker's `onEa` calls
   * `bootAdminKeyhive` with this + its admin CompositeStore (the cap-event
   * EventStore backing). Populated ONLY by openAdminVm / openBrowserAdminVm;
   * wiki manifests leave it absent, so the operator seed never reaches a wiki
   * worker. The seed crossing the worker boundary is the deliberate custody
   * boundary (operator-confirmed): the admin island is the authn/z home.
   */
  adminAuth?: {
    /** 32-byte operator signing seed. */
    seed:                  Uint8Array;
    /** Hex Ed25519 verifying key the keyhive identity MUST resolve to (Gate A). */
    operatorVerifyingKey:  string;
    personGroupDocIdHex:   string;
    personGroupAgentIdHex: string;
    meshCabalDocIdHex:     string;
    /** Writable bag URIs to register so verify/delegate resolve (lar: URIs). */
    registerBags:          readonly string[];
  };
}

/**
 * Cool the wiki slot from `wela` (hot) to `anu` (cold) — teardown; thread
 * terminates. Type literal `"hooanu"` — Hawaiian: hoʻoanu, "to cool."
 *
 * Renamed from `"demote"` 2026-05-31 under the residency-model cleanup — the
 * temperature register replaces the old organizational rank register that
 * conflicted with the residency-model ACTION verb surface. The two thermal
 * states wear ʻōlelo Hawaiʻi: `wela` / `anu` (see residency-tiers.md).
 *
 * Counterpart: `anu` → `wela` (hoʻowela, "to heat") happens at the vessel layer
 * via `vessel-island-pool.mountWiki` — a fresh worker boots and runs `ea` — not
 * via a worker-side signal. A `warm` middle tier (suspended-not-terminated,
 * resume by a hoʻomahana signal) was proposed and CUT 2026-06-01 (YIN pass): a
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

// ── Admin island protocol ─────────────────────────────────────────────────
//
// Three-message round-trip for admin island verb coordination.
//
// Vessel → island: AdminMsg_PlaceVerb   — place a volatile verb invocation in the admin TW5 wiki.
// Island → vessel: AdminMsg_DelegateVerb — delegate a wiki-scope verb whose handler lives on main.
// Vessel → island: AdminMsg_VerbResult  — deliver delegation result or error back to island.
//
// The admin island owns the TW5 wiki event surface (kumu device law).
// All verbs pass through the admin wiki change event → VerbDispatcher tick.
// Wiki-scope handlers that need vessel resources (repo, catalogHandle, etc.)
// delegate via AdminMsg_DelegateVerb; the island awaits AdminMsg_VerbResult before writing outcome.

/** Vessel → island: place a volatile verb invocation in the admin island's TW5 wiki. */
export interface AdminMsg_PlaceVerb {
  schema_version: ProtocolVersion;
  type: "admin:place-verb";
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
 * Island → vessel: delegate a wiki-scope verb to the vessel handler registry.
 * Emitted when the admin island's VerbDispatcher encounters a verb not in its local registry.
 * The vessel executes the handler and posts AdminMsg_VerbResult back.
 */
export interface AdminMsg_DelegateVerb {
  schema_version: ProtocolVersion;
  type: "admin:delegate-verb";
  requestId: string;
  verb: string;
  args: Record<string, unknown>;
  requestedBy: string;
  targets?: string[];
  batchMode?: string;
}

/** Vessel → island: delegation result or error. Admin island resolves the in-flight delegation promise. */
export interface AdminMsg_VerbResult {
  schema_version: ProtocolVersion;
  type: "admin:verb-result";
  requestId: string;
  result?: Record<string, unknown>;
  error?: string;
}

// ---------------------------------------------------------------------------
// Auth verify proxy (isomorphic-vessel epic, Stage 1+2)
// ---------------------------------------------------------------------------
// Keyhive lives in the admin island after Stage 1, but inbound untrusted peers
// land on the HOST transport (node WS server). The host's AuthVerifierSeam asks
// the island to verify each peer; the island answers via its keyhive. Path (b).

/** Vessel → island: verify an inbound peer's capability. Host has no keyhive. */
export interface AdminMsg_VerifyRequest {
  schema_version: ProtocolVersion;
  type: "admin:verify-request";
  requestId: string;
  /** The peer's serialized Keyhive ContactCard bytes. */
  cardBytes: Uint8Array;
  /** The bag the peer wants to sync. */
  bagUrl: string;
  /** Access level required. */
  access: "read" | "admin";
}

/** Island → vessel: the keyhive verdict for a verify-request. */
export interface AdminMsg_VerifyResult {
  schema_version: ProtocolVersion;
  type: "admin:verify-result";
  requestId: string;
  ok: boolean;
  /** Peer's keyhive Identifier hex (from the island's receiveContactCard), so the
   *  host can key its sharePolicy/peer map without a local keyhive. */
  identifier?: string;
  reason?: string;
}

// ---------------------------------------------------------------------------
// @personal / @draft binding resolution (isomorphic-vessel epic, Stage 1)
// ---------------------------------------------------------------------------
// resolveOrMintBinding mints + delegates via keyhive, which lives in the admin
// island after Stage 1. The host posts a request with the recipe fingerprint;
// the island mints/reuses against its Repo + keyhive and returns the doc URLs.

/** Vessel → island: resolve (or mint+delegate) the @personal/@draft binding pair. */
export interface AdminMsg_ResolveBindingRequest {
  schema_version: ProtocolVersion;
  type: "admin:resolve-binding-request";
  requestId: string;
  fingerprint: string;
  recipeTrace: { wikiDocId: string; canonBagDocIds: readonly string[] };
}

/** Island → vessel: the resolved binding doc URLs (or an error). */
export interface AdminMsg_ResolveBindingResult {
  schema_version: ProtocolVersion;
  type: "admin:resolve-binding-result";
  requestId: string;
  personalUrl?: string;
  draftUrl?: string;
  error?: string;
}

/** All messages the vessel may send to a causal island. */
export type VesselToIslandMsg =
  | IslandMsg_Manifest
  | IslandMsg_HooAnu
  | IslandMsg_Teardown
  | AdminMsg_PlaceVerb
  | AdminMsg_VerbResult
  | AdminMsg_VerifyRequest
  | AdminMsg_ResolveBindingRequest
  | WikiMsg_PlaceVerb;

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
 * See: lar:///ha.ka.ba/@lares/v0.1/api/pono/ea
 */
export interface IslandMsg_Ea {
  schema_version: ProtocolVersion;
  type: "ea";
  wikiUri: string;
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
 * Parallel to AdminMsg_PlaceVerb for the admin island. Any island running a
 * wiki dispatch behavior handles this by calling placeVerbInvocation on its TW5 wiki.
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
  | IslandMsg_Fault
  | IslandMsg_Ready
  | WikiMsg_VerbResult
  | AdminMsg_DelegateVerb
  | AdminMsg_VerifyResult
  | AdminMsg_ResolveBindingResult;

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
  return (["manifest", "hooanu", "teardown", "admin:place-verb", "admin:verb-result", "admin:verify-request", "admin:resolve-binding-request", "wiki:place-verb"] as const).includes(
    v.type as VesselToIslandMsg["type"],
  );
}

export function isIslandToVesselMsg(v: unknown): v is IslandToVesselMsg {
  if (!_hasVersion(v)) return false;
  return (["event", "teardown:ack", "ea", "fault", "ready", "wiki:verb-result", "admin:delegate-verb", "admin:verify-result", "admin:resolve-binding-result"] as const).includes(
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
 * The manifest carries the WikiRecipe (slot structure) + BagResolver (slot URI →
 * AutomergeUrl). The island walks `expandRecipe(recipe)` to build its composite
 * stack and reads `resolver` to wire each CRDT slot to its doc handle.
 *
 * No blob bytes travel in the manifest — TW5 core bytes and plugin tiddlers live in
 * the @lararium CRDT doc. Islands read them from the CRDT after `handle.whenReady()`.
 */
export function mkManifest(
  wikiUri:  string,
  syncPort: MessagePort,
  recipe:   import("./wiki-recipe.js").WikiRecipe,
  resolver: Readonly<Record<string, string | null>>,
  coreHash: string | null = null,
  opts?: {
    storage?:        IslandStorageConfig;
    diskMirrors?:    readonly { bagId: string; mirrorRoot: string; scope: string }[];
    adminAuth?:      IslandMsg_Manifest["adminAuth"];
  },
): IslandMsg_Manifest {
  const msg: IslandMsg_Manifest = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "manifest",
    wikiUri,
    coreHash,
    recipe,
    resolver,
    syncPort,
  };
  if (opts?.storage)             msg.storage     = opts.storage;
  if (opts?.diskMirrors?.length) msg.diskMirrors = opts.diskMirrors;
  if (opts?.adminAuth)           msg.adminAuth   = opts.adminAuth;
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

export function mkFault(wikiUri: string, error: string): IslandMsg_Fault {
  return { schema_version: ISLAND_PROTOCOL_VERSION, type: "fault", wikiUri, error };
}

export function mkAdminPlaceVerb(opts: {
  verb: string;
  args: Record<string, unknown>;
  requestedBy: string;
  targets?: string[];
  batchMode?: string;
  requestId?: string;
  fromUri?: string;
  listenable?: string;
}): AdminMsg_PlaceVerb {
  const msg: AdminMsg_PlaceVerb = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "admin:place-verb",
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

export function mkAdminDelegateVerb(opts: {
  requestId: string;
  verb: string;
  args: Record<string, unknown>;
  requestedBy: string;
  targets?: string[];
  batchMode?: string;
}): AdminMsg_DelegateVerb {
  const msg: AdminMsg_DelegateVerb = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "admin:delegate-verb",
    requestId: opts.requestId,
    verb: opts.verb,
    args: opts.args,
    requestedBy: opts.requestedBy,
  };
  if (opts.targets?.length)  msg.targets   = opts.targets;
  if (opts.batchMode)        msg.batchMode = opts.batchMode;
  return msg;
}

export function mkAdminVerbResult(opts: {
  requestId: string;
  result?: Record<string, unknown>;
  error?: string;
}): AdminMsg_VerbResult {
  const msg: AdminMsg_VerbResult = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "admin:verb-result",
    requestId: opts.requestId,
  };
  if (opts.result !== undefined) msg.result = opts.result;
  if (opts.error  !== undefined) msg.error  = opts.error;
  return msg;
}

export function mkAdminVerifyRequest(opts: {
  requestId: string;
  cardBytes: Uint8Array;
  bagUrl:    string;
  access:    "read" | "admin";
}): AdminMsg_VerifyRequest {
  return {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "admin:verify-request",
    requestId: opts.requestId,
    cardBytes: opts.cardBytes,
    bagUrl:    opts.bagUrl,
    access:    opts.access,
  };
}

export function mkAdminVerifyResult(opts: {
  requestId:   string;
  ok:          boolean;
  identifier?: string;
  reason?:     string;
}): AdminMsg_VerifyResult {
  const msg: AdminMsg_VerifyResult = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "admin:verify-result",
    requestId: opts.requestId,
    ok:        opts.ok,
  };
  if (opts.identifier !== undefined) msg.identifier = opts.identifier;
  if (opts.reason     !== undefined) msg.reason     = opts.reason;
  return msg;
}

export function mkAdminResolveBindingRequest(opts: {
  requestId:   string;
  fingerprint: string;
  recipeTrace: { wikiDocId: string; canonBagDocIds: readonly string[] };
}): AdminMsg_ResolveBindingRequest {
  return {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "admin:resolve-binding-request",
    requestId:   opts.requestId,
    fingerprint: opts.fingerprint,
    recipeTrace: opts.recipeTrace,
  };
}

export function mkAdminResolveBindingResult(opts: {
  requestId:    string;
  personalUrl?: string;
  draftUrl?:    string;
  error?:       string;
}): AdminMsg_ResolveBindingResult {
  const msg: AdminMsg_ResolveBindingResult = {
    schema_version: ISLAND_PROTOCOL_VERSION,
    type: "admin:resolve-binding-result",
    requestId: opts.requestId,
  };
  if (opts.personalUrl !== undefined) msg.personalUrl = opts.personalUrl;
  if (opts.draftUrl    !== undefined) msg.draftUrl    = opts.draftUrl;
  if (opts.error       !== undefined) msg.error       = opts.error;
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


// ── Tiddler delta extraction — island-side utility ─────────────────────────

