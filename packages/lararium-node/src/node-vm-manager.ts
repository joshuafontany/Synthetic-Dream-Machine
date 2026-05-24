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
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/node-vm-manager
 * Meme doc: packages/lararium-node/memes/node-vm-manager.md
 */

import { getHeads } from "@lararium/mesh";
import type { Heads } from "@lararium/mesh";
import { Worker, MessageChannel } from "worker_threads";
import type { MessagePort } from "worker_threads";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";
import type { DocHandle, Repo } from "@automerge/automerge-repo";
import type { LarDoc } from "@lararium/mesh";
import { TW5Engine, IslandAdaptor } from "@lararium/tw5";
import type { TW5CoreBootBlob } from "@lararium/tw5";
import {
  isWorkerToMainMsg,
  mkPromote,
  mkTeardown,
} from "@lararium/mesh";
import type {
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
  /** Automerge doc bytes from Worker-side Repo at teardown — preferred warm-start seed. */
  docBytes?:  Uint8Array;
  /**
   * @deprecated GP-3 tiddler snapshot. Remove when lar-wiki-worker fully migrates to
   * Repo-in-Worker and teardown:ack carries docBytes instead.
   */
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
 *
 * Repo-in-Worker: CRDT sync flows via `mainPort` ↔ `syncPort` MessageChannel.
 * Main-thread Repo wires a `MessageChannelNetworkAdapter` to `mainPort`; the Worker
 * creates its own Repo with the transferred `syncPort`. No oracle delta needed.
 */
interface WorkerHotSlot {
  tier:       "hot";
  wikiId:     string;
  worker:     Worker;
  /** Main-thread side of the Worker sync channel. Close on unmount (Law §7). */
  mainPort:   MessagePort;
  lastUsedAt: number;
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
  /**
   * Optional main-thread Automerge Repo. When provided, each hot slot wires
   * `mainPort` to this Repo via `MessageChannelNetworkAdapter` so the Worker-side
   * Repo syncs the wiki doc automatically (Repo-in-Worker path).
   */
  mainRepo?: Repo;
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
  private readonly _mainRepo:      Repo | null;

  constructor(options: NodeVmManagerOptions = {}) {
    this._workerUrl     = options.workerScriptUrl ?? DEFAULT_WORKER_URL;
    this._onWorkerEvent = options.onWorkerEvent ?? null;
    this._mainRepo      = options.mainRepo ?? null;
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
   * slots. Receive CRDT changes via the `mainRepo` MessageChannel and events via
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

    // Create sync channel — main keeps port1, Worker receives port2 (syncPort).
    const { port1: mainPort, port2: syncPort } = new MessageChannel();

    // Optionally wire mainPort to the main-thread Repo (Repo-in-Worker path).
    if (this._mainRepo) {
      const adapter = new MessageChannelNetworkAdapter(mainPort as unknown as globalThis.MessagePort);
      this._mainRepo.networkSubsystem.addNetworkAdapter(adapter);
    }

    const worker = new Worker(this._workerUrl);
    this._wireWorkerListeners(wikiId, worker);

    // Pass docUrl when mainRepo is wired so Worker calls repo.find(docUrl).whenReady()
    // instead of the unreliable gossip path (repo.on("document")). null = cold boot.
    const docUrl = this._mainRepo ? (ctx.docHandle.url as string ?? null) : null;
    const promoteMsg = mkPromote(wikiId, ctx.coreBlob.bytes, syncPort as unknown as globalThis.MessagePort, docUrl, null);
    await _sendAndAwait<WorkerMsg_PromoteAck>(
      worker,
      promoteMsg,
      "promote:ack",
      [syncPort],
    );

    this._slots.set(wikiId, {
      tier:       "hot",
      wikiId,
      worker,
      mainPort,
      lastUsedAt: Date.now(),
    });

    console.log(
      `[vm-manager] ${wikiId}: promoted hot (snapshot: ${snapshotTiddlers ? `${snapshotTiddlers.length} tiddlers` : "empty"})`,
    );
  }

  /**
   * Unmount a hot-tier Worker slot via GP-5 teardown handshake.
   *
   * 1. Sends teardown signal.
   * 2. Awaits teardown:ack — captures `docBytes` (Repo-in-Worker) or
   *    `snapshotTiddlers` (@deprecated GP-3 fallback).
   * 3. Closes mainPort, calls worker.terminate().
   * 4. Moves slot to cold with a VmSnapshot seeded from the ack.
   *
   * No-op for pinned slots and slots already in cold.
   */
  async unmountWiki(wikiId: string): Promise<void> {
    const slot = this._slots.get(wikiId);
    if (!slot || slot.tier === "pinned" || slot.tier === "cold") return;

    const hotSlot = slot as WorkerHotSlot;
    let snapshot: VmSnapshot | null = null;
    try {
      const ack = await _sendAndAwait<WorkerMsg_TeardownAck>(
        hotSlot.worker,
        mkTeardown(),
        "teardown:ack",
      );
      // Prefer docBytes (Repo-in-Worker); fall back to @deprecated snapshotTiddlers (GP-3).
      const tiddlers = ack.snapshotTiddlers ? [...ack.snapshotTiddlers] : [];
      let heads: Heads = [];
      try {
        const doc = this._docHandles.get(wikiId)?.doc();
        if (doc) heads = getHeads(doc);
      } catch { /* test stub — use empty heads */ }
      const snapshotFields: VmSnapshot = { heads, tiddlers, capturedAt: Date.now() };
      if (ack.docBytes !== undefined) snapshotFields.docBytes = ack.docBytes;
      snapshot = snapshotFields;
    } catch (err) {
      console.warn(`[vm-manager] ${wikiId}: teardown handshake failed — ${err}; terminating anyway`);
    }

    hotSlot.mainPort.close();
    await hotSlot.worker.terminate();
    this._slots.set(wikiId, { tier: "cold", wikiId, snapshot });

    const snapDesc = snapshot
      ? (snapshot.docBytes ? `docBytes(${snapshot.docBytes.byteLength}b)` : `${snapshot.tiddlers.length} tiddlers`)
      : "none";
    console.log(`[vm-manager] ${wikiId}: unmounted → cold (snapshot: ${snapDesc})`);
  }

  // ---------------------------------------------------------------------------
  // Engine access — pinned tier only
  // ---------------------------------------------------------------------------

  /**
   * Returns the in-process TW5Engine for the given wikiId, or null.
   *
   * In P.3 this returns a non-null value ONLY for the pinned (PrimaryWiki)
   * slot. Worker-backed hot slots do not expose an in-process engine — drive
   * changes via the `mainRepo` MessageChannel and consume events via `onWorkerEvent`.
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
  transferList: (ArrayBuffer | MessagePort)[] = [],
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

