/**
 * VesselIslandPool — three-tier TW5 VM lifecycle for the Node.js lararium vessel.
 *
 * ## Tiers
 *
 *   Pinned  — PrimaryWiki + admin. Never evicted. Each pinned slot owns a long-lived
 *             Worker thread (same as hot slots, but immune to LRU eviction).
 *             Main thread holds no TW5Engine reference — all interaction via
 *             worker-protocol envelope (@lararium/mesh) only.
 *
 *   Hot     — LRU of recently-active session wikis (max HOT_CAP slots).
 *             Each slot owns one `worker_threads.Worker`. TW5Engine + ReactionEngine
 *             run co-located inside the Worker thread.
 *             Main thread communicates via worker-protocol envelope only.
 *
 *   Cold    — CRDT-only. VmSnapshot stores Automerge heads (+ optional docBytes)
 *             from the Worker's last teardown:ack. No thread, no engine.
 *
 * ## Promote / demote flow
 *
 *   mountWiki   → spawn Worker → manifest → ea → slot = hot
 *   unmountWiki → teardown → teardown:ack (+ docBytes) → worker.terminate()
 *                → slot = cold (cold slot carries the Worker's final TW5 state)
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/vessel-island-pool
 * Meme doc: packages/lararium-node/memes/vessel-island-pool.md
 */

import { getHeads } from "@lararium/mesh";
import { load as automergeLoad } from "@automerge/automerge";
import type { Heads, LarDoc } from "@lararium/mesh";
import { Worker, MessageChannel } from "worker_threads";
import type { MessagePort } from "worker_threads";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";
import type { DocHandle, Repo } from "@automerge/automerge-repo";
import { join } from "path";
import type { TW5CoreBootBlob } from "@lararium/tw5";
import {
  isWorkerToMainMsg,
  mkManifest,
  mkTeardown,
  mkWikiPlaceJob,
  type BagBinding,
  type WorkerStorageConfig,
} from "@lararium/mesh";
import type {
  WorkerMsg_Event,
  WorkerMsg_Ea,
  WorkerMsg_TeardownAck,
  WikiMsg_JobResult,
  WorkerToMainMsg,
  MainToWorkerMsg,
} from "@lararium/mesh";

// ---------------------------------------------------------------------------
// VmSnapshot — cold-tier CRDT checkpoint
// ---------------------------------------------------------------------------

export interface VmSnapshot {
  /** Automerge heads at snapshot capture time. CRDT remains authoritative. */
  heads:      Heads;
  /** Automerge doc bytes from Worker-side Repo at teardown — preferred warm-start seed. */
  docBytes?:  Uint8Array;
  /** Unix ms of capture — for diagnostics and staleness detection. */
  capturedAt: number;
}

// ---------------------------------------------------------------------------
// Slot types
// ---------------------------------------------------------------------------

type SlotTier = "pinned" | "hot" | "cold";

/**
 * Worker slot — covers both pinned (never-evicted) and hot (LRU) tiers.
 *
 * `pinned: true`  → immune to LRU eviction. Used for PrimaryWiki + admin.
 * `pinned: false` → subject to LRU eviction when HOT_CAP is reached.
 *
 * In both cases the TW5Engine lives inside the Worker thread. The main thread
 * holds no engine reference and interacts only via worker-protocol envelopes.
 */
interface WorkerSlot {
  tier:       "pinned" | "hot";
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

type Slot = WorkerSlot | ColdSlot;

// ---------------------------------------------------------------------------
// WikiBootContext
// ---------------------------------------------------------------------------

export interface WikiBootContext {
  /** Automerge doc handle — used to materialize VmSnapshot for initial manifest delivery. */
  docHandle: DocHandle<LarDoc>;
  /**
   * Plugin tiddlers to inject into Worker TW5 boot so sigils/ahu/pranala are
   * present before CRDT deltas begin applying.
   */
  preloadedTiddlers?: Array<Record<string, unknown>>;
  /** TW5 core bytes from the content-addressed LarDoc blob. Required — an authority without an engine is not an authority. */
  coreBlob: TW5CoreBootBlob;
  /**
   * Disk mirror configs for Worker-owned disk projection (Sprint 9).
   * Each entry maps a bag to a mirrorRoot dir + scope for namedBagMirror reconstruction.
   * Only pass for primary Workers with disk write-back responsibility.
   */
  diskMirrors?: readonly { bagId: string; mirrorRoot: string; scope: string }[];
}

// ---------------------------------------------------------------------------
// VesselIslandPoolOptions
// ---------------------------------------------------------------------------

export interface VesselIslandPoolOptions {
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
  /**
   * Root directory for Worker-owned storage partitions (Sprint 3).
   * When provided, each wiki Worker receives a `nodefs` storage config pointing
   * at `<storageRoot>/<sanitized-wikiId>/`. Workers own their CRDT persistence.
   * Absent = Workers use memory-only (relay Repo is the sole persistence layer).
   */
  storageRoot?: string;
}

// ---------------------------------------------------------------------------
// VesselIslandPool
// ---------------------------------------------------------------------------

const HOT_CAP = 4;

// Resolves relative to this module's compiled location (dist/vessel-island-pool.js).
const DEFAULT_WORKER_URL = new URL("./lar-wiki-worker.js", import.meta.url);

// Timeout for GP-5 teardown and ea handshakes.
const HANDSHAKE_TIMEOUT_MS = 10_000;

export class VesselIslandPool {
  private readonly _slots           = new Map<string, Slot>();
  private readonly _workerUrl:      URL;
  private readonly _onWorkerEvent:  ((wikiId: string, msg: WorkerMsg_Event) => void) | null;
  private readonly _mainRepo:       Repo | null;
  private readonly _storageRoot:    string | null;
  /** Pending wiki:place-job results — requestId → { resolve, reject }. */
  private readonly _pendingWikiJobs = new Map<string, {
    resolve: (r: Record<string, unknown>) => void;
    reject:  (e: Error) => void;
  }>();

  constructor(options: VesselIslandPoolOptions = {}) {
    this._workerUrl      = options.workerScriptUrl ?? DEFAULT_WORKER_URL;
    this._onWorkerEvent  = options.onWorkerEvent ?? null;
    this._mainRepo       = options.mainRepo ?? null;
    this._storageRoot    = options.storageRoot ?? null;
  }

  // ---------------------------------------------------------------------------
  // Pinned tier — PrimaryWiki
  // ---------------------------------------------------------------------------

  /**
   * Mount the PrimaryWiki as a pinned (never-evicted) Worker slot.
   *
   * Identical to `mountWiki` but the resulting slot is immune to LRU eviction.
   * Call after the vessel has a `coreBlob` and the primary wiki doc handle is ready.
   */
  async mountPrimaryWorker(wikiId: string, ctx: WikiBootContext): Promise<void> {
    await this._mountWorker(wikiId, ctx, true);
  }

  // ---------------------------------------------------------------------------
  // Hot tier — Worker lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Mount a session wiki into the hot tier.
   *
   * Spawns a Worker, materializes a snapshot from the Automerge doc (or uses
   * the cold-slot snapshot), delivers a manifest, and awaits ea.
   * Evicts the LRU Worker slot (non-pinned) when at capacity.
   *
   * Returns void — the main thread holds no direct engine reference for Worker
   * slots. Receive CRDT changes via `onTiddlerDelta` and events via `onWorkerEvent`.
   */
  async mountWiki(wikiId: string, ctx: WikiBootContext): Promise<void> {
    await this._mountWorker(wikiId, ctx, false);
  }

  /**
   * Unmount a hot or pinned Worker slot via GP-5 teardown handshake.
   *
   * 1. Sends teardown signal.
   * 2. Awaits teardown:ack — captures `docBytes` (Repo-in-Worker).
   * 3. Closes mainPort, calls worker.terminate().
   * 4. Moves slot to cold with a VmSnapshot seeded from the ack.
   *
   * No-op for slots already in cold.
   */
  async unmountWiki(wikiId: string): Promise<void> {
    const slot = this._slots.get(wikiId);
    if (!slot || slot.tier === "cold") return;

    const workerSlot = slot as WorkerSlot;
    let snapshot: VmSnapshot | null = null;
    try {
      const ack = await _sendAndAwait<WorkerMsg_TeardownAck>(
        workerSlot.worker,
        mkTeardown(),
        "teardown:ack",
      );
      let heads: Heads = [];
      if (ack.docBytes) {
        try { heads = getHeads(automergeLoad(ack.docBytes)); } catch { /* corrupt bytes */ }
      }
      const snapshotFields: VmSnapshot = { heads, capturedAt: Date.now() };
      if (ack.docBytes !== undefined) snapshotFields.docBytes = ack.docBytes;
      snapshot = snapshotFields;
    } catch (err) {
      console.warn(`[vm-manager] ${wikiId}: teardown handshake failed — ${err}; terminating anyway`);
    }

    workerSlot.mainPort.close();
    await workerSlot.worker.terminate();
    this._slots.set(wikiId, { tier: "cold", wikiId, snapshot });

    const snapDesc = snapshot
      ? (snapshot.docBytes ? `docBytes(${snapshot.docBytes.byteLength}b)` : "heads-only")
      : "none";
    console.log(`[vm-manager] ${wikiId}: unmounted → cold (snapshot: ${snapDesc})`);
  }

  // ---------------------------------------------------------------------------
  // Wiki-scope job dispatch
  // ---------------------------------------------------------------------------

  /**
   * Place a wiki-scope job into a hot or pinned Worker and await the result.
   *
   * Sends WikiMsg_PlaceJob to the Worker identified by `wikiId`. The Worker
   * must run a behavior that handles "wiki:place-job" (e.g. makeWikiDispatchBehavior).
   * Resolves with the result record or rejects on error / timeout.
   */
  placeWikiJob(
    wikiId:  string,
    opts: {
      verb:        string;
      args:        Record<string, unknown>;
      requestedBy: string;
      targets?:    string[];
      batchMode?:  string;
    },
  ): Promise<Record<string, unknown>> {
    const slot = this._slots.get(wikiId);
    if (!slot || slot.tier === "cold") {
      return Promise.reject(new Error(`[vm-manager] no live Worker for ${wikiId}`));
    }
    const requestId = crypto.randomUUID();
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(
        () => {
          this._pendingWikiJobs.delete(requestId);
          reject(new Error(`[vm-manager] wiki:place-job timeout for ${wikiId}/${opts.verb}`));
        },
        HANDSHAKE_TIMEOUT_MS,
      );
      this._pendingWikiJobs.set(requestId, {
        resolve: (r) => { clearTimeout(timer); resolve(r); },
        reject:  (e) => { clearTimeout(timer); reject(e); },
      });
      (slot as WorkerSlot).worker.postMessage(
        mkWikiPlaceJob({ ...opts, requestId }),
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Accessors
  // ---------------------------------------------------------------------------

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
      if (s.tier === "pinned")   pinned++;
      else if (s.tier === "hot") hot++;
      else                       cold++;
    }
    return { pinned, hot, cold };
  }

  // ---------------------------------------------------------------------------
  // Dispose all
  // ---------------------------------------------------------------------------

  /** Teardown all Worker slots (GP-5). */
  async disposeAll(): Promise<void> {
    const teardowns: Promise<void>[] = [];
    for (const slot of this._slots.values()) {
      if (slot.tier === "hot" || slot.tier === "pinned") {
        teardowns.push(this.unmountWiki(slot.wikiId));
      }
    }
    await Promise.allSettled(teardowns);
    this._slots.clear();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async _mountWorker(wikiId: string, ctx: WikiBootContext, pinned: boolean): Promise<void> {
    const existing = this._slots.get(wikiId);
    if (existing && (existing.tier === "hot" || existing.tier === "pinned")) {
      (existing as WorkerSlot).lastUsedAt = Date.now();
      return;
    }

    if (!pinned) await this._evictLruIfNeeded();

    const pluginTiddlers = ctx.preloadedTiddlers?.length ? ctx.preloadedTiddlers : undefined;

    const { port1: mainPort, port2: syncPort } = new MessageChannel();

    if (this._mainRepo) {
      const adapter = new MessageChannelNetworkAdapter(mainPort as unknown as globalThis.MessagePort);
      this._mainRepo.networkSubsystem.addNetworkAdapter(adapter);
    }

    const worker = new Worker(this._workerUrl);
    this._wireWorkerListeners(wikiId, worker);

    const rawDocUrl = ctx.docHandle.url as string | undefined ?? null;
    const bagBindings: readonly BagBinding[] = [
      { bagId: wikiId, writable: true, mode: "relational", docUrl: rawDocUrl ?? "" },
    ];

    const storage: WorkerStorageConfig | undefined = this._storageRoot
      ? { type: "nodefs", dir: join(this._storageRoot, _sanitizeWikiId(wikiId)) }
      : undefined;

    const manifestMsg = mkManifest(
      wikiId,
      ctx.coreBlob.bytes,
      syncPort as unknown as globalThis.MessagePort,
      null,
      {
        ...(pluginTiddlers ? { pluginTiddlers } : {}),
        bagBindings,
        ...(storage      ? { storage      } : {}),
        ...(ctx.diskMirrors?.length ? { diskMirrors: ctx.diskMirrors } : {}),
      },
    );
    await _sendAndAwait<WorkerMsg_Ea>(
      worker,
      manifestMsg,
      "ea",
      [syncPort],
    );

    const tier = pinned ? "pinned" : "hot";
    this._slots.set(wikiId, { tier, wikiId, worker, mainPort, lastUsedAt: Date.now() });

    console.log(
      `[vm-manager] ${wikiId}: island ea — ${tier} (plugins: ${pluginTiddlers ? pluginTiddlers.length : 0})`,
    );
  }

  /**
   * Evict the LRU hot (non-pinned) Worker slot when at capacity.
   * Uses the GP-5 teardown handshake — async.
   */
  private async _evictLruIfNeeded(): Promise<void> {
    const hotSlots = [...this._slots.values()].filter(
      (s): s is WorkerSlot => s.tier === "hot",
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
      if (raw.type === "wiki:job-result") {
        const result = raw as WikiMsg_JobResult;
        const pending = this._pendingWikiJobs.get(result.requestId);
        if (pending) {
          this._pendingWikiJobs.delete(result.requestId);
          if (result.error) pending.reject(new Error(result.error));
          else               pending.resolve(result.result ?? {});
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a lar: URI to a safe filesystem path component. */
function _sanitizeWikiId(wikiId: string): string {
  return wikiId.replace(/^lar:\/\/\//, "").replace(/[^a-zA-Z0-9@._-]/g, "_");
}
