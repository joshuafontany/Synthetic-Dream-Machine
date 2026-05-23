/**
 * NodeVmManager — three-tier TW5 VM lifecycle for the Node.js lararium vessel.
 *
 * ## Tiers
 *
 *   Pinned  — PrimaryWiki + admin. Never evicted. TW5Engine runs in-process
 *             (same thread as the main event loop). IslandAdaptor wires it
 *             to the CompositeStore. All synchronous engine reads are free.
 *
 *   Hot     — LRU of recently-active session wikis (max HOT_CAP slots).
 *             Each slot owns one `worker_threads.Worker`. TW5Engine + (P.3.5)
 *             ReactionEngine run co-located inside the Worker thread.
 *             Main thread communicates via worker-protocol envelope (@lararium/mesh) only.
 *
 *   Cold    — CRDT-only. VmSnapshot stores the materialized tiddler view from
 *             the Worker's last teardown:ack. No thread, no engine.
 *
 * ## Promote / demote flow
 *
 *   mountWiki   → spawn Worker → promote → promote:ack → slot = hot
 *   unmountWiki → teardown → teardown:ack (+ snapshotTiddlers) → worker.terminate()
 *                → slot = cold (cold slot carries the Worker's final TW5 state)
 *
 * ## Render surface (pinned engine)
 *
 *   renderMeme — template-dependent; pinned engine serves all render requests.
 *                Worker-backed wikis are not directly renderable from main in P.3.
 *                Cross-wiki render will route through the Worker event channel in P.4.
 *
 * ## ReactionEngine routing (P.3.5)
 *
 *   When a Worker emits WorkerMsg_Event (RE reaction), the manager forwards it
 *   to the `onWorkerEvent` callback registered at construction. The callback
 *   routes the event into the main-thread LarEventBus.
 *
 * Meme: lar:///ha.ka.ba/@lararium/node/v0.1/node-vm-manager
 * Meme doc: packages/lararium-node/memes/node-vm-manager.md
 */

import { getHeads } from "@lararium/mesh";
import type { Heads } from "@lararium/mesh";
import { Worker }     from "worker_threads";
import type { DocHandle, DocHandleChangePayload } from "@automerge/automerge-repo";
import type { LarDoc } from "@lararium/mesh";
import { TW5Engine, IslandAdaptor } from "@lararium/tw5";
import type { TW5CoreBootBlob } from "@lararium/tw5";
import {
  isWorkerToMainMsg,
  mkPromote,
  mkTeardown,
  WORKER_PROTOCOL_VERSION,
} from "@lararium/mesh";
import type {
  WorkerMsg_Changeset,
  WorkerMsg_Event,
  WorkerMsg_PromoteAck,
  WorkerMsg_TeardownAck,
  WorkerToMainMsg,
  MainToWorkerMsg,
} from "@lararium/mesh";

// ---------------------------------------------------------------------------
// VmSnapshot — cold-tier materialized tiddler cache
// ---------------------------------------------------------------------------

export interface VmSnapshot {
  /** Automerge heads at snapshot capture time. CRDT remains authoritative. */
  heads:      Heads;
  /** Materialized TW5 tiddler view from the Worker's last teardown:ack. */
  tiddlers:   Array<Record<string, unknown>>;
  /** Unix ms of capture — for diagnostics and staleness detection. */
  capturedAt: number;
}

// ---------------------------------------------------------------------------
// Slot types
// ---------------------------------------------------------------------------

type SlotTier = "pinned" | "hot" | "cold";

/** Pinned: PrimaryWiki or admin — TW5Engine lives in-process. */
interface PinnedSlot {
  tier:       "pinned";
  wikiId:     string;
  engine:     TW5Engine;
  adaptor:    IslandAdaptor | null;
  lastUsedAt: number;
}

/**
 * Hot: session wiki — TW5Engine lives inside the Worker thread.
 * Main thread never holds the engine reference; all interaction via postMessage.
 */
interface WorkerHotSlot {
  tier:           "hot";
  wikiId:         string;
  worker:         Worker;
  lastUsedAt:     number;
  /** Unsubscribe function — removes the docHandle "change" listener. */
  unsubChange:    () => void;
}

interface ColdSlot {
  tier:     "cold";
  wikiId:   string;
  snapshot: VmSnapshot | null;
}

type Slot = PinnedSlot | WorkerHotSlot | ColdSlot;

// ---------------------------------------------------------------------------
// WikiBootContext
// ---------------------------------------------------------------------------

export interface WikiBootContext {
  /** Automerge doc handle — used to materialize VmSnapshot for initial promote. */
  docHandle: DocHandle<LarDoc>;
  /**
   * Plugin tiddlers to inject into the Worker's TW5 boot alongside the cold
   * snapshot. Merged into snapshotTiddlers before sending promote.
   */
  preloadedTiddlers?: Array<Record<string, unknown>>;
  /** TW5 core bytes from the content-addressed LarDoc blob. Required — an authority without an engine is not an authority. */
  coreBlob: TW5CoreBootBlob;
}

// ---------------------------------------------------------------------------
// NodeVmManagerOptions
// ---------------------------------------------------------------------------

export interface NodeVmManagerOptions {
  /**
   * URL of the compiled Worker entry script.
   * Defaults to `lar-wiki-worker.js` in the same directory as this module.
   * Override in tests to use a fixture Worker.
   */
  workerScriptUrl?: URL;
  /**
   * Called when a Worker emits a WorkerMsg_Event (RE reaction).
   * Route this into the main-thread LarEventBus.
   */
  onWorkerEvent?: (wikiId: string, msg: WorkerMsg_Event) => void;
}

// ---------------------------------------------------------------------------
// NodeVmManager
// ---------------------------------------------------------------------------

const HOT_CAP = 4;

// Resolves relative to this module's compiled location (dist/node-vm-manager.js).
const DEFAULT_WORKER_URL = new URL("./lar-wiki-worker.js", import.meta.url);

// Timeout for GP-5 teardown and promote:ack handshakes.
const HANDSHAKE_TIMEOUT_MS = 10_000;

export class NodeVmManager {
  private readonly _slots         = new Map<string, Slot>();
  private readonly _docHandles    = new Map<string, DocHandle<LarDoc>>();
  private readonly _workerUrl:    URL;
  private readonly _onWorkerEvent: ((wikiId: string, msg: WorkerMsg_Event) => void) | null;

  constructor(options: NodeVmManagerOptions = {}) {
    this._workerUrl     = options.workerScriptUrl ?? DEFAULT_WORKER_URL;
    this._onWorkerEvent = options.onWorkerEvent ?? null;
  }

  // ---------------------------------------------------------------------------
  // Pinned tier — PrimaryWiki
  // ---------------------------------------------------------------------------

  /**
   * Register the PrimaryWiki as a pinned (never-evicted) in-process slot.
   * Call once after `openNodeVessel` returns the booted `tw5` engine.
   */
  mountPrimary(wikiId: string, engine: TW5Engine, adaptor: IslandAdaptor | null): void {
    this._slots.set(wikiId, {
      tier: "pinned",
      wikiId,
      engine,
      adaptor,
      lastUsedAt: Date.now(),
    });
  }

  /** Wire or update the IslandAdaptor on the pinned slot. */
  updateAdaptor(wikiId: string, adaptor: IslandAdaptor): void {
    const slot = this._slots.get(wikiId);
    if (slot?.tier === "pinned") slot.adaptor = adaptor;
  }

  /** Register a docHandle for snapshot capture at eviction time. */
  registerDocHandle(wikiId: string, handle: DocHandle<LarDoc>): void {
    this._docHandles.set(wikiId, handle);
  }

  // ---------------------------------------------------------------------------
  // Hot tier — Worker lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Mount a session wiki into the hot tier.
   *
   * Spawns a Worker, materializes a snapshot from the Automerge doc (or uses
   * the cold-slot snapshot), sends a promote message, and awaits promote:ack.
   * Evicts the LRU Worker slot (non-pinned) when at capacity.
   *
   * Returns void — the main thread holds no direct engine reference for Worker
   * slots. Route messages via `routeChangeset()` and receive events via
   * `onWorkerEvent`.
   */
  async mountWiki(wikiId: string, ctx: WikiBootContext): Promise<void> {
    const existing = this._slots.get(wikiId);
    if (existing?.tier === "hot") {
      (existing as WorkerHotSlot).lastUsedAt = Date.now();
      return;
    }
    if (existing?.tier === "pinned") {
      (existing as PinnedSlot).lastUsedAt = Date.now();
      return;
    }

    await this._evictLruIfNeeded();

    // Build snapshotTiddlers: cold-slot tiddlers merged with plugin preloads.
    const coldSlot    = this._slots.get(wikiId);
    const coldTiddlers = coldSlot?.tier === "cold" ? (coldSlot.snapshot?.tiddlers ?? null) : null;
    const pluginTiddlers = ctx.preloadedTiddlers ?? [];

    // Prefer cold-slot tiddlers as the base; plugins go in first so wiki
    // content can shadow them — same precedence order as the main TW5 boot.
    const snapshotTiddlers: Record<string, unknown>[] | null =
      coldTiddlers || pluginTiddlers.length > 0
        ? [...pluginTiddlers, ...(coldTiddlers ?? [])]
        : null;

    // Register the handle so disposeAll can capture snapshots from the doc.
    this._docHandles.set(wikiId, ctx.docHandle);

    const worker = new Worker(this._workerUrl);
    this._wireWorkerListeners(wikiId, worker);

    await _sendAndAwait<WorkerMsg_PromoteAck>(
      worker,
      mkPromote(wikiId, ctx.coreBlob.bytes, snapshotTiddlers),
      "promote:ack",
    );

    // Wire live changeset delivery: on every doc change, derive the tiddler-level
    // delta from Automerge patches and forward to the Worker (GP-3).
    const unsubChange = _subscribeDocChanges(wikiId, ctx.docHandle, this);

    this._slots.set(wikiId, {
      tier: "hot",
      wikiId,
      worker,
      lastUsedAt: Date.now(),
      unsubChange,
    });

    console.log(
      `[vm-manager] ${wikiId}: promoted hot (snapshot: ${snapshotTiddlers ? `${snapshotTiddlers.length} tiddlers` : "empty"})`,
    );
  }

  /**
   * Unmount a hot-tier Worker slot via GP-5 teardown handshake.
   *
   * 1. Sends teardown signal.
   * 2. Awaits teardown:ack (which carries the Worker's final TW5 tiddler state).
   * 3. Calls worker.terminate().
   * 4. Moves slot to cold, using the ack's snapshotTiddlers to seed the snapshot.
   *
   * No-op for pinned slots and slots already in cold.
   */
  async unmountWiki(wikiId: string): Promise<void> {
    const slot = this._slots.get(wikiId);
    if (!slot || slot.tier === "pinned" || slot.tier === "cold") return;

    const { worker, unsubChange } = slot as WorkerHotSlot;
    unsubChange(); // stop forwarding doc changes before teardown

    let snapshot: VmSnapshot | null = null;
    try {
      const ack = await _sendAndAwait<WorkerMsg_TeardownAck>(
        worker,
        mkTeardown(),
        "teardown:ack",
      );
      const tiddlers = ack.snapshotTiddlers ? [...ack.snapshotTiddlers] : [];
      let heads: Heads = [];
      try {
        const doc = this._docHandles.get(wikiId)?.doc();
        if (doc) heads = getHeads(doc);
      } catch { /* not a real Automerge doc (e.g. test stub) — use empty heads */ }
      snapshot = { heads, tiddlers, capturedAt: Date.now() };
    } catch (err) {
      console.warn(`[vm-manager] ${wikiId}: teardown handshake failed — ${err}; terminating anyway`);
    }

    await worker.terminate();
    this._slots.set(wikiId, { tier: "cold", wikiId, snapshot });

    console.log(
      `[vm-manager] ${wikiId}: unmounted → cold (snapshot: ${snapshot ? `${snapshot.tiddlers.length} tiddlers` : "none"})`,
    );
  }

  // ---------------------------------------------------------------------------
  // Changeset routing — forward Automerge bytes to the owning Worker
  // ---------------------------------------------------------------------------

  /**
   * Route a tiddler-level delta to the wiki's hot-tier Worker (GP-3).
   *
   * `added`   — plain tiddler field objects to upsert into the Worker's TW5 wiki.
   * `deleted` — titles to remove.
   *
   * The main thread derives these from Automerge `change` event patches, so the
   * Worker never loads the WASM runtime.
   *
   * No-op if the wiki slot is not in the hot tier.
   */
  routeChangeset(
    wikiId:  string,
    added:   readonly Record<string, unknown>[],
    deleted: readonly string[],
  ): void {
    const slot = this._slots.get(wikiId);
    if (slot?.tier !== "hot") return;

    const msg: WorkerMsg_Changeset = {
      schema_version: WORKER_PROTOCOL_VERSION,
      type: "changeset" as const,
      wikiUri: wikiId,
      added,
      deleted,
    };
    (slot as WorkerHotSlot).worker.postMessage(msg);
  }

  // ---------------------------------------------------------------------------
  // Engine access — pinned tier only
  // ---------------------------------------------------------------------------

  /**
   * Returns the in-process TW5Engine for the given wikiId, or null.
   *
   * In P.3 this returns a non-null value ONLY for the pinned (PrimaryWiki)
   * slot. Worker-backed hot slots do not expose an in-process engine — use
   * `routeChangeset()` and `onWorkerEvent` instead.
   */
  getEngine(wikiId: string): TW5Engine | null {
    const slot = this._slots.get(wikiId);
    if (slot?.tier === "pinned") {
      (slot as PinnedSlot).lastUsedAt = Date.now();
      return (slot as PinnedSlot).engine;
    }
    return null;
  }

  tier(wikiId: string): SlotTier | null {
    return this._slots.get(wikiId)?.tier ?? null;
  }

  snapshot(wikiId: string): VmSnapshot | null {
    const slot = this._slots.get(wikiId);
    return slot?.tier === "cold" ? slot.snapshot : null;
  }

  /** Diagnostics: slot counts by tier. */
  stats(): { pinned: number; hot: number; cold: number } {
    let pinned = 0, hot = 0, cold = 0;
    for (const s of this._slots.values()) {
      if (s.tier === "pinned")      pinned++;
      else if (s.tier === "hot")    hot++;
      else                          cold++;
    }
    return { pinned, hot, cold };
  }

  /**
   * Render a meme URI using the pinned wiki's engine (template-dependent).
   * Worker-backed wikis are not directly renderable from the main thread in P.3.
   */
  async renderMeme(uri: string): Promise<string | null> {
    const engine = this._pinnedEngine();
    if (!engine) return null;
    try {
      const { exportMemeText } = await import("@lararium/tw5");
      return exportMemeText(engine, uri);
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Dispose all
  // ---------------------------------------------------------------------------

  /** Teardown all Worker slots (GP-5) and dispose the pinned engine. */
  async disposeAll(): Promise<void> {
    const teardowns: Promise<void>[] = [];
    for (const slot of this._slots.values()) {
      if (slot.tier === "hot")    teardowns.push(this.unmountWiki(slot.wikiId));
      if (slot.tier === "pinned") {
        const p = slot as PinnedSlot;
        p.adaptor?.stop();
        p.engine.dispose();
      }
    }
    await Promise.allSettled(teardowns);
    this._slots.clear();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _pinnedEngine(): TW5Engine | null {
    for (const slot of this._slots.values()) {
      if (slot.tier === "pinned") return (slot as PinnedSlot).engine;
    }
    return null;
  }

  /**
   * Evict the LRU Worker hot slot when at capacity.
   * Uses the GP-5 teardown handshake — async.
   */
  private async _evictLruIfNeeded(): Promise<void> {
    const hotSlots = [...this._slots.values()].filter(
      (s): s is WorkerHotSlot => s.tier === "hot",
    );
    if (hotSlots.length < HOT_CAP) return;

    const lru = hotSlots.sort((a, b) => a.lastUsedAt - b.lastUsedAt)[0]!;
    console.log(`[vm-manager] ${lru.wikiId}: LRU evict — hot cap reached (${HOT_CAP})`);
    await this.unmountWiki(lru.wikiId);
  }

  /** Wire message / error listeners on a newly spawned Worker. */
  private _wireWorkerListeners(wikiId: string, worker: Worker): void {
    worker.on("message", (raw: unknown) => {
      if (!isWorkerToMainMsg(raw)) return;
      if (raw.type === "event") {
        if (this._onWorkerEvent) {
          this._onWorkerEvent(wikiId, raw as WorkerMsg_Event);
        } else {
          console.warn(`[vm-manager] WorkerMsg_Event dropped for ${wikiId} — no onWorkerEvent callback registered`);
        }
      }
      if (raw.type === "fault") {
        console.error(`[vm-manager] Worker fault for ${wikiId}: ${(raw as { error: string }).error}`);
      }
    });
    worker.on("error", (err) => {
      console.error(`[vm-manager] Worker error for ${wikiId}:`, err);
    });
  }
}

// ---------------------------------------------------------------------------
// _sendAndAwait — send a message to a Worker and await the first matching reply
// ---------------------------------------------------------------------------

/**
 * Post `msg` to `worker` and resolve when the Worker replies with a message
 * whose `type` matches `expectedType`.
 *
 * Rejects after `HANDSHAKE_TIMEOUT_MS` or on a Worker error event.
 * The caller is responsible for calling `worker.terminate()` after this resolves.
 */
function _sendAndAwait<T extends WorkerToMainMsg>(
  worker:       Worker,
  msg:          MainToWorkerMsg,
  expectedType: T["type"],
  transferList: ArrayBuffer[] = [],
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`[vm-manager] handshake timeout waiting for ${expectedType}`)),
      HANDSHAKE_TIMEOUT_MS,
    );

    const onMessage = (raw: unknown) => {
      if (!isWorkerToMainMsg(raw) || raw.type !== expectedType) return;
      clearTimeout(timer);
      worker.off("message", onMessage);
      worker.off("error",   onError);
      resolve(raw as T);
    };

    const onError = (err: Error) => {
      clearTimeout(timer);
      worker.off("message", onMessage);
      worker.off("error",   onError);
      reject(err);
    };

    worker.on("message", onMessage);
    worker.on("error",   onError);

    if (transferList.length > 0) {
      worker.postMessage(msg, transferList);
    } else {
      worker.postMessage(msg);
    }
  });
}

// ---------------------------------------------------------------------------
// _subscribeDocChanges — live tiddler-delta forwarding to a Worker slot
// ---------------------------------------------------------------------------

/**
 * Subscribe to `docHandle` change events and forward tiddler-level deltas to
 * the Worker via `manager.routeChangeset()`.
 *
 * Automerge-repo emits `change` with `{ doc, patches }` after every local or
 * remote mutation. Patches identify affected paths; we extract unique tiddler
 * URIs and read current field state from the updated doc — no Automerge WASM
 * in the Worker thread needed.
 *
 * Returns an unsubscribe function the caller MUST invoke before teardown.
 */
function _subscribeDocChanges(
  wikiId:    string,
  handle:    DocHandle<LarDoc>,
  manager:   NodeVmManager,
): () => void {
  const onChangeHandler = (payload: DocHandleChangePayload<LarDoc>) => {
    const { doc, patches } = payload;
    const changedUris = new Set<string>();
    for (const patch of patches) {
      if (patch.path.length >= 2 && patch.path[0] === "tiddlers") {
        changedUris.add(String(patch.path[1]));
      }
    }
    if (changedUris.size === 0) return;

    const added:   Record<string, unknown>[] = [];
    const deleted: string[]                  = [];

    for (const uri of changedUris) {
      const rec = (doc.tiddlers ?? {})[uri] as (Record<string, unknown> & { deleted?: boolean }) | undefined;
      if (!rec || rec["deleted"]) {
        deleted.push(uri);
      } else {
        const fields: Record<string, unknown> = { title: uri };
        for (const [k, v] of Object.entries(rec)) {
          if (k !== "deleted") fields[k] = v;
        }
        added.push(fields);
      }
    }

    manager.routeChangeset(wikiId, added, deleted);
  };

  handle.on("change", onChangeHandler);
  return () => handle.off("change", onChangeHandler);
}
