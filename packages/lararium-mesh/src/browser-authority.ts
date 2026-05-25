/**
 * browser-authority.ts — S1 worker authority contract for lararium-browser.
 *
 * Defines the three types that govern a pooled browser worker authority:
 *   BrowserAuthorityId      — stable key for a worker authority in the pool
 *   BrowserAuthorityLease   — caller handle, returned by pool.acquire()
 *   BrowserAuthorityReceipt — structured acknowledgment of a completed worker op
 *   BrowserAuthorityPool    — pool contract (extends VmPool law; no DOM types)
 *
 * All types are platform-neutral. No HTMLElement, no window, no document.
 * The browser runtime in @lararium/browser holds the Worker spawn code.
 *
 * Schema: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-authority
 */

import type { Heads } from "@automerge/automerge";

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/**
 * BrowserAuthorityId — stable key for one authority slot in the pool.
 *
 * Formatted as a lar: URI so it matches the wiki identity law:
 *   lar:///ha.ka.ba/@lararium/wikis/<name>/hot
 *   lar:///ha.ka.ba/@lararium/wikis/<name>/admin
 */
export type BrowserAuthorityId = string;

// ---------------------------------------------------------------------------
// Lifecycle phases
// ---------------------------------------------------------------------------

/**
 * BrowserAuthorityPhase — monotonic boot sequence for a worker authority.
 *
 * Mirrors LarOpenPhase for the worker realm. Phase order is strictly forward.
 */
export type BrowserAuthorityPhase =
  | "spawned"       // Worker created; boot message not yet sent
  | "booting"       // boot() message in-flight
  | "tw5-ready"     // TW5 core + plugin blobs loaded inside worker
  | "store-wired"   // Automerge store + CompositeStore resolved
  | "live"          // IslandAdaptor wired; authority participates in causal mesh
  | "leased"        // Acquired by a caller; host frame may attach
  | "idle"          // Lease returned; authority warm in pool
  | "disposing"     // dispose() called; no new operations
  | "disposed";     // Worker terminated; pool entry removed

// ---------------------------------------------------------------------------
// Boot inputs
// ---------------------------------------------------------------------------

/**
 * BrowserAuthorityBootParams — everything the worker needs to boot a TW5 authority.
 *
 * Transferred or cloned across the Worker boundary. No DOM references.
 */
export interface BrowserAuthorityBootParams {
  /** lar: URI identifying this authority slot — becomes the wiki identity inside the worker. */
  authorityId: BrowserAuthorityId;
  /** Serialized TW5 core blob (content-addressed). Transferred, not cloned. */
  coreBlob: Uint8Array;
  /** Serialized compiled plugin blob. Transferred, not cloned. */
  pluginBlob: Uint8Array;
  /**
   * Plugin layer tiddlers (sigils, ahu, pranala, etc.) as deserialized tiddler objects.
   * Prerequisite for ea condition 3 — carried in the manifest so the island can think
   * from first breath. When present, passed directly as WorkerMsg_Manifest.pluginTiddlers.
   * Callers who hold pluginBlob as bytes must deserialize before constructing params.
   */
  pluginTiddlers?: readonly Record<string, unknown>[];
  /** Bag stack for this wiki, ordered from system to draft. */
  bagStack: readonly string[];
  /** Recipe URI that maps this authority's content scope. */
  recipeUri: string;
  /**
   * AutomergeUrl for the wiki doc. Passed as manifest docUrl so the Worker-side Repo
   * calls repo.find(docUrl).whenReady() instead of waiting for gossip sync.
   * null = cold boot (Worker creates fresh doc, state arrives via sync channel).
   */
  docUrl?: string | null;
  /** Optional: pre-serialized Automerge doc snapshots for warm start. */
  snapshots?: ReadonlyArray<{ bagId: string; bytes: Uint8Array }>;
}

// ---------------------------------------------------------------------------
// Capability map
// ---------------------------------------------------------------------------

/**
 * BrowserAuthorityCapabilities — what a worker authority can do on behalf of a caller.
 *
 * Not a permission gate — a declaration of available operations.
 * Callers check before requesting; absent flags mean the operation is not supported
 * in this authority's current phase.
 */
export interface BrowserAuthorityCapabilities {
  /** Authority can respond to filter expression queries. */
  filterTiddlers: boolean;
  /** Authority can render a meme URI to its export format. */
  renderMeme: boolean;
  /** Authority can produce a projection snapshot for a frame mount. */
  projectionSnapshot: boolean;
  /** Authority can participate in Automerge sync (receive/send changesets). */
  syncParticipation: boolean;
  /** Authority can export an Automerge doc snapshot for persistence. */
  snapshotExport: boolean;
  /** Authority exposes debug stats (pool diagnostics). */
  debugStats: boolean;
}

export const BROWSER_AUTHORITY_CAPABILITIES_NONE: BrowserAuthorityCapabilities = {
  filterTiddlers: false,
  renderMeme: false,
  projectionSnapshot: false,
  syncParticipation: false,
  snapshotExport: false,
  debugStats: false,
};

export const BROWSER_AUTHORITY_CAPABILITIES_LIVE: BrowserAuthorityCapabilities = {
  filterTiddlers: true,
  renderMeme: true,
  projectionSnapshot: true,
  syncParticipation: true,
  snapshotExport: true,
  debugStats: true,
};

// ---------------------------------------------------------------------------
// Lease
// ---------------------------------------------------------------------------

/**
 * BrowserAuthorityLease — caller handle for a live worker authority.
 *
 * Acquired from BrowserAuthorityPool.acquire(). Returned via release().
 * The pool decides whether the underlying authority stays warm or goes idle
 * after release; callers do not control worker lifecycle directly.
 *
 * All operations are async RPC across the Worker boundary.
 * No DOM types appear on this interface.
 */
export interface BrowserAuthorityLease {
  /** The stable ID this lease targets. */
  readonly authorityId: BrowserAuthorityId;
  /** Current lifecycle phase of the authority. */
  readonly phase: BrowserAuthorityPhase;
  /** What this authority can currently do. */
  readonly capabilities: BrowserAuthorityCapabilities;

  // ── compute ops ──────────────────────────────────────────────────────────

  /** Run a TW5 filter expression inside the worker; return matching titles. */
  filterTiddlers(expr: string): Promise<string[]>;

  /** Render a meme URI to its export wikitext; null if absent or deleted. */
  renderMeme(uri: string): Promise<string | null>;

  /**
   * Request a projection snapshot — the render inputs the host frame needs to
   * paint this authority's current state into a surface.
   * Shape is opaque at this layer; the projection adapter in @lararium/browser
   * knows how to consume it.
   */
  projectionSnapshot(): Promise<BrowserProjectionSnapshot>;

  // ── sync ops ─────────────────────────────────────────────────────────────

  /**
   * Export serialized Automerge doc snapshots for all bags in the authority's
   * bag stack. Used by the persistence layer (IndexedDB) before warm eviction.
   */
  exportSnapshots(): Promise<Array<{ bagId: string; bytes: Uint8Array }>>;

  // ── lifecycle ────────────────────────────────────────────────────────────

  /** Debug stats for pool diagnostics. */
  debugStats(): Promise<BrowserAuthorityDebugStats>;

  /**
   * Return the lease to the pool.
   * After release(), this handle becomes invalid — do not call any other method.
   * The pool transitions the authority to "idle" or begins warm eviction.
   */
  release(): void;
}

// ---------------------------------------------------------------------------
// Projection snapshot
// ---------------------------------------------------------------------------

/**
 * BrowserProjectionSnapshot — minimal render inputs crossing the Worker boundary.
 *
 * Structured-clone friendly. No live DOM nodes, no callbacks, no proxies.
 * The projection adapter in @lararium/browser translates this into DOM/canvas/HUD output.
 *
 * Shape is intentionally minimal at S1. S4 (frame/projection contract) expands it
 * once measurements tell us what actually needs to cross the boundary.
 */
export interface BrowserProjectionSnapshot {
  /** Authority that produced this snapshot. */
  authorityId: BrowserAuthorityId;
  /**
   * Serialized TW5 state needed to hydrate the frame.
   * Exact schema deferred to S4; placeholder allows S2/S3 to wire the channel.
   */
  payload: Record<string, unknown>;
  /** Automerge vector clock heads at snapshot time — for staleness detection. */
  heads: Heads;
  /** Timestamp (ms since epoch) when snapshot was produced. */
  producedAt: number;
}

// ---------------------------------------------------------------------------
// Debug stats
// ---------------------------------------------------------------------------

export interface BrowserAuthorityDebugStats {
  authorityId: BrowserAuthorityId;
  phase: BrowserAuthorityPhase;
  bootDurationMs: number | null;
  lastLeaseAt: number | null;
  lastReleaseAt: number | null;
  /** Approximate Worker heap usage in bytes, if available via performance.measureUserAgentSpecificMemory(). */
  heapBytes: number | null;
}

// ---------------------------------------------------------------------------
// Receipt
// ---------------------------------------------------------------------------

/**
 * BrowserAuthorityReceipt — structured acknowledgment of a completed worker operation.
 *
 * Returned by pool-level operations (acquire, preWarm, dispose) rather than
 * by individual lease calls. Lets the orchestrator log and audit pool behavior
 * without coupling to individual op results.
 */
export interface BrowserAuthorityReceipt {
  authorityId: BrowserAuthorityId;
  operation: "acquire" | "release" | "preWarm" | "evict" | "dispose" | "boot";
  /** Whether the operation completed successfully. */
  ok: boolean;
  /** Error message if ok === false. */
  error?: string;
  /** Wall-clock duration of the operation in ms. */
  durationMs: number;
  /** Phase the authority reached as a result of this operation. */
  resultPhase: BrowserAuthorityPhase;
  /** Timestamp (ms since epoch). */
  at: number;
}

// ---------------------------------------------------------------------------
// Pool contract
// ---------------------------------------------------------------------------

/**
 * BrowserAuthorityPool — pool contract for browser worker authorities.
 *
 * Extends the VmPool law: keyed by BrowserAuthorityId, warm/idle lifecycle,
 * lease and release discipline. No DOM types. Metrics surface included.
 *
 * The concrete implementation lives in @lararium/browser. This interface lives
 * in @lararium/mesh so vessel-level code can type against the pool without
 * importing browser runtime.
 */
export interface BrowserAuthorityPool {
  /**
   * Acquire a lease on the authority for the given ID.
   * Boots the authority if it is not yet warm.
   * Returns a receipt describing the acquire operation plus the live lease.
   */
  acquire(
    id: BrowserAuthorityId,
    params: BrowserAuthorityBootParams,
  ): Promise<{ receipt: BrowserAuthorityReceipt; lease: BrowserAuthorityLease }>;

  /**
   * Pre-warm an authority without acquiring a lease.
   * The authority boots and reaches "idle" phase; no caller holds the lease.
   * Useful for anticipated wiki opens before the host frame requests them.
   */
  preWarm(
    id: BrowserAuthorityId,
    params: BrowserAuthorityBootParams,
  ): Promise<BrowserAuthorityReceipt>;

  /**
   * Evict a specific authority from the pool.
   * Exports snapshots for persistence before terminating the Worker.
   * Returns the snapshot export for the persistence layer to write to IndexedDB.
   */
  evict(id: BrowserAuthorityId): Promise<{
    receipt: BrowserAuthorityReceipt;
    snapshots: Array<{ bagId: string; bytes: Uint8Array }>;
  }>;

  /**
   * Dispose the entire pool.
   * Evicts all warm and idle authorities; terminates all Workers.
   * Awaitable — resolves when all Workers have terminated.
   */
  disposeAll(): Promise<BrowserAuthorityReceipt[]>;

  /** True if an authority for this ID is warm or leased. */
  has(id: BrowserAuthorityId): boolean;

  /** All known IDs and their current phases. */
  inspect(): Array<{ id: BrowserAuthorityId; phase: BrowserAuthorityPhase }>;

  /** Number of authorities currently in the pool (all phases). */
  readonly size: number;
}
