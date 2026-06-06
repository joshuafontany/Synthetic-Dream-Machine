/**
 * VesselIslandPool — three-tier TW5 VM lifecycle for the Node.js lararium vessel.
 *
 * ## Tiers
 *
 *   Pinned  — PrimaryWiki + admin. Never evicted. Each pinned slot owns a long-lived
 *             Worker thread (same as hot slots, but immune to LRU eviction).
 *             Vessel holds no TW5Engine reference — all interaction via
 *             island-protocol envelope (@lararium/mesh) only.
 *
 *   Hot     — LRU of recently-active session wikis (max HOT_CAP slots).
 *             Each slot owns one `worker_threads.Worker`. TW5Engine + ReactionEngine
 *             run co-located inside the Worker thread.
 *             Vessel communicates via island-protocol envelope only.
 *
 *   Cold    — CRDT-only. Records demotedAt timestamp. No thread, no engine.
 *             CRDT Repo (NodeFS) holds all persistent state.
 *
 * ## Promote / demote flow
 *
 *   mountWiki   → spawn island → manifest → ea → slot = hot
 *   unmountWiki → teardown → teardown:ack → worker.terminate()
 *                → slot = cold (NodeFS Repo owns CRDT persistence)
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/vessel-island-pool
 * Meme doc: packages/lararium-node/memes/vessel-island-pool.md
 */

import { Worker, MessageChannel } from "worker_threads";
import type { MessagePort } from "worker_threads";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";
import type { Repo } from "@automerge/automerge-repo";
import { join } from "path";
import {
  isIslandToVesselMsg,
  mkManifest,
  mkTeardown,
  mkWikiPlaceVerb,
  awaitIslandMsg,
  type IslandStorageConfig,
  type WikiMountSpec,
} from "@lararium/mesh";
import type {
  IslandMsg_Event,
  IslandMsg_Ea,
  IslandMsg_TeardownAck,
  WikiMsg_VerbResult,
  IslandToVesselMsg,
  VesselToIslandMsg,
  ResidencyTemperature,
} from "@lararium/mesh";

// ---------------------------------------------------------------------------
// Slot types
//
// The pool stands in the SAME residency vocabulary as the mesh model (EPIC S11
// collapse — residency-tiers.md): a two-state ʻōlelo thermal axis `wela` (live)
// / `anu` (torn down), plus an orthogonal `pinned` flag. A live island is always
// `wela`; `pinned` (PrimaryWiki + admin) exempts it from LRU eviction. There is
// no separate "pinned tier" — pin is a flag crossing the temperature axis.
// ---------------------------------------------------------------------------

/**
 * IslandSlot — a live (`wela`) island Worker, pinned or not.
 *
 * `pinned: true`  → immune to LRU eviction. Used for PrimaryWiki + admin.
 * `pinned: false` → subject to LRU eviction when HOT_CAP is reached.
 *
 * The TW5Engine lives inside the Worker thread. The vessel holds no engine
 * reference and interacts only via island-protocol envelopes.
 */
interface IslandSlot {
  temperature: "wela";
  pinned:      boolean;
  wikiId:      string;
  worker:      Worker;
  /** Vessel side of the island sync channel. Close on unmount (Law §7). */
  mainPort:    MessagePort;
  lastUsedAt:  number;
}

interface ColdSlot {
  temperature: "anu";
  wikiId:      string;
  demotedAt:   number;
}

type Slot = IslandSlot | ColdSlot;

// ---------------------------------------------------------------------------
// VesselIslandPoolOptions
// ---------------------------------------------------------------------------

export interface VesselIslandPoolOptions {
  /**
   * URL of the compiled island entry script.
   * Defaults to `lar-wiki-island.js` in the same directory as this module.
   * Override in tests to use a fixture island.
   */
  workerScriptUrl?: URL;
  /**
   * Called when an island emits a IslandMsg_Event (RE reaction).
   * Route this into the vessel LarEventBus.
   */
  onWorkerEvent?: (wikiId: string, msg: IslandMsg_Event) => void;
  /**
   * Optional vessel Automerge Repo. When provided, each hot slot wires
   * `mainPort` to this Repo via `MessageChannelNetworkAdapter` so the island-side
   * Repo syncs the wiki doc automatically (Repo-in-island path).
   */
  mainRepo?: Repo;
  /**
   * Root directory for island-owned storage partitions (Sprint 3).
   * When provided, each wiki island receives a `nodefs` storage config pointing
   * at `<storageRoot>/<sanitized-wikiId>/`. islands own their CRDT persistence.
   * Absent = islands use memory-only (relay Repo is the sole persistence layer).
   */
  storageRoot?: string;
  /**
   * Disk-write CAPABILITY this pool HOLDS — the canon bag → mirror configs it may
   * project to local disk. A node pool's construction grant (held, local,
   * per-device; fs access does not replicate); a browser pool holds none. The
   * pool mirrors a bag IFF it appears here AND a mounted wiki's recipe designates
   * it in `mirrorBags`. The unforgeable authority lives here, never in the recipe.
   */
  diskMirrorGrant?: readonly { bagId: string; mirrorRoot: string; scope: string }[];
}

// ---------------------------------------------------------------------------
// VesselIslandPool
// ---------------------------------------------------------------------------

const HOT_CAP = 4;

// Resolves relative to this module's compiled location (dist/vessel-island-pool.js).
const DEFAULT_WORKER_URL = new URL("./lar-wiki-island.js", import.meta.url);

// Timeout for GP-5 teardown and ea handshakes.
const HANDSHAKE_TIMEOUT_MS = 10_000;

export class VesselIslandPool {
  private readonly _slots           = new Map<string, Slot>();
  private readonly _workerUrl:      URL;
  private readonly _onWorkerEvent:  ((wikiId: string, msg: IslandMsg_Event) => void) | null;
  private readonly _mainRepo:       Repo | null;
  private readonly _storageRoot:    string | null;
  private readonly _diskMirrorGrant: readonly { bagId: string; mirrorRoot: string; scope: string }[];
  /** Pending wiki:place-verb results — requestId → { resolve, reject }. */
  private readonly _pendingWikiVerbs = new Map<string, {
    resolve: (r: Record<string, unknown>) => void;
    reject:  (e: Error) => void;
  }>();

  constructor(options: VesselIslandPoolOptions) {
    this._workerUrl      = options.workerScriptUrl ?? DEFAULT_WORKER_URL;
    this._onWorkerEvent  = options.onWorkerEvent ?? null;
    this._mainRepo       = options.mainRepo ?? null;
    this._storageRoot    = options.storageRoot ?? null;
    this._diskMirrorGrant = options.diskMirrorGrant ?? [];
  }

  // ---------------------------------------------------------------------------
  // Island lifecycle — one unified mount path
  // ---------------------------------------------------------------------------

  /**
   * Mount a wiki as a live (`wela`) island slot.
   *
   * Spawns an island, delivers a manifest, awaits ea. `opts.pinned: true` makes
   * the slot immune to LRU eviction (PrimaryWiki + admin) — pin is an orthogonal
   * flag, NOT a separate temperature (EPIC S11). Unpinned slots are LRU-evicted
   * when HOT_CAP is reached.
   *
   * Returns void — the vessel holds no direct engine reference for island slots.
   * Receive CRDT changes via `onWorkerEvent`.
   */
  async mountWiki(
    wikiId: string,
    spec:   WikiMountSpec,
    opts:   { pinned?: boolean } = {},
  ): Promise<void> {
    await this._mountWorker(wikiId, spec, opts.pinned ?? false);
  }

  /**
   * Unmount a hot or pinned island slot via GP-5 teardown handshake.
   *
   * 1. Sends teardown signal.
   * 2. Awaits teardown:ack.
   * 3. Closes mainPort, calls worker.terminate().
   * 4. Moves slot to cold. NodeFS Repo inside the island owns CRDT persistence.
   *
   * No-op for slots already in cold.
   */
  async unmountWiki(wikiId: string): Promise<void> {
    const slot = this._slots.get(wikiId);
    if (!slot || slot.temperature === "anu") return;

    const workerSlot = slot as IslandSlot;
    try {
      await _sendAndAwait<IslandMsg_TeardownAck>(
        workerSlot.worker,
        mkTeardown(),
        "teardown:ack",
      );
    } catch (err) {
      console.warn(`[vm-manager] ${wikiId}: teardown handshake failed — ${err}; terminating anyway`);
    }

    workerSlot.mainPort.close();
    await workerSlot.worker.terminate();
    const demotedAt = Date.now();
    this._slots.set(wikiId, { temperature: "anu", wikiId, demotedAt });

    console.log(`[vm-manager] ${wikiId}: unmounted → anu`);
  }

  // ---------------------------------------------------------------------------
  // Wiki-scope job dispatch
  // ---------------------------------------------------------------------------

  /**
   * Place a wiki-scope job into a hot or pinned island and await the result.
   *
   * Sends WikiMsg_PlaceVerb to the island identified by `wikiId`. The island
   * must run a behavior that handles "wiki:place-verb" (e.g. makeWikiDispatchBehavior).
   * Resolves with the result record or rejects on error / timeout.
   */
  placeWikiVerb(
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
    if (!slot || slot.temperature === "anu") {
      return Promise.reject(new Error(`[vm-manager] no live island for ${wikiId}`));
    }
    const requestId = crypto.randomUUID();
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(
        () => {
          this._pendingWikiVerbs.delete(requestId);
          reject(new Error(`[vm-manager] wiki:place-verb timeout for ${wikiId}/${opts.verb}`));
        },
        HANDSHAKE_TIMEOUT_MS,
      );
      this._pendingWikiVerbs.set(requestId, {
        resolve: (r) => { clearTimeout(timer); resolve(r); },
        reject:  (e) => { clearTimeout(timer); reject(e); },
      });
      (slot as IslandSlot).worker.postMessage(
        mkWikiPlaceVerb({ ...opts, requestId }),
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Accessors
  // ---------------------------------------------------------------------------

  /** Temperature of an island slot (`wela` | `anu`), or null if unknown. NOTE:
   *  use `isPinned()` for the orthogonal pin flag. */
  tier(wikiId: string): ResidencyTemperature | null {
    return this._slots.get(wikiId)?.temperature ?? null;
  }

  /** The orthogonal pin flag — true if this island is exempt from LRU eviction
   *  (PrimaryWiki + admin). False for anu slots and unpinned live islands. */
  isPinned(wikiId: string): boolean {
    const slot = this._slots.get(wikiId);
    return slot?.temperature === "wela" ? slot.pinned : false;
  }

  /** Unix ms when this island last went anu (cold), or null if still live. */
  coldSince(wikiId: string): number | null {
    const slot = this._slots.get(wikiId);
    return slot?.temperature === "anu" ? slot.demotedAt : null;
  }

  /** Diagnostics: slot counts. `wela` is unpinned-live; `pinned` counts live
   *  pin-flagged islands separately (disjoint); `anu` is torn-down. */
  stats(): { pinned: number; wela: number; anu: number } {
    let pinned = 0, wela = 0, anu = 0;
    for (const s of this._slots.values()) {
      if (s.temperature === "anu")  anu++;
      else if (s.pinned)            pinned++;
      else                          wela++;
    }
    return { pinned, wela, anu };
  }

  // ---------------------------------------------------------------------------
  // Dispose all
  // ---------------------------------------------------------------------------

  /** Teardown all island slots (GP-5). */
  async disposeAll(): Promise<void> {
    const teardowns: Promise<void>[] = [];
    for (const slot of this._slots.values()) {
      if (slot.temperature === "wela") {
        teardowns.push(this.unmountWiki(slot.wikiId));
      }
    }
    await Promise.allSettled(teardowns);
    this._slots.clear();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async _mountWorker(wikiId: string, spec: WikiMountSpec, pinned: boolean): Promise<void> {
    const existing = this._slots.get(wikiId);
    if (existing && existing.temperature === "wela") {
      existing.lastUsedAt = Date.now();
      return;
    }

    if (!pinned) await this._evictLruIfNeeded();

    const { port1: mainPort, port2: syncPort } = new MessageChannel();

    if (this._mainRepo) {
      const adapter = new MessageChannelNetworkAdapter(mainPort as unknown as globalThis.MessagePort);
      this._mainRepo.networkSubsystem.addNetworkAdapter(adapter);
    }

    const worker = new Worker(this._workerUrl);
    this._wireWorkerListeners(wikiId, worker);

    // Disk-mirror = designation ∩ grant: the recipe (synced) DESIGNATES bags via
    // `mirrorBags`; this pool's held grant names which it MAY write. Mirror only
    // the intersection — a designation alone confers nothing (the grant is the
    // unforgeable authority; a browser pool holds an empty grant → never mirrors).
    const diskMirrors = this._diskMirrorGrant.filter(
      (g) => spec.recipe.mirrorBags?.includes(g.bagId),
    );

    const storage: IslandStorageConfig | undefined = this._storageRoot
      ? { type: "nodefs", dir: join(this._storageRoot, _sanitizeWikiId(wikiId)) }
      : undefined;

    const manifestMsg = mkManifest(
      wikiId,
      syncPort as unknown as globalThis.MessagePort,
      spec.recipe,
      spec.resolver,
      spec.coreHash,
      {
        ...(storage            ? { storage }      : {}),
        ...(diskMirrors.length ? { diskMirrors }  : {}),
      },
    );
    await _sendAndAwait<IslandMsg_Ea>(
      worker,
      manifestMsg,
      "ea",
      [syncPort],
    );

    this._slots.set(wikiId, {
      temperature: "wela", pinned, wikiId, worker, mainPort, lastUsedAt: Date.now(),
    });

    console.log(`[vm-manager] ${wikiId}: island ea — wela${pinned ? " (pinned)" : ""}`);
  }

  /**
   * Evict the LRU hot (non-pinned) island slot when at capacity.
   * Uses the GP-5 teardown handshake — async.
   */
  private async _evictLruIfNeeded(): Promise<void> {
    const hotSlots = [...this._slots.values()].filter(
      (s): s is IslandSlot => s.temperature === "wela" && !s.pinned,
    );
    if (hotSlots.length < HOT_CAP) return;

    const lru = hotSlots.sort((a, b) => a.lastUsedAt - b.lastUsedAt)[0]!;
    console.log(`[vm-manager] ${lru.wikiId}: LRU evict — hot cap reached (${HOT_CAP})`);
    await this.unmountWiki(lru.wikiId);
  }

  /** Wire message / error listeners on a newly spawned island. */
  private _wireWorkerListeners(wikiId: string, worker: Worker): void {
    worker.on("message", (raw: unknown) => {
      if (!isIslandToVesselMsg(raw)) return;
      if (raw.type === "event") {
        if (this._onWorkerEvent) {
          this._onWorkerEvent(wikiId, raw as IslandMsg_Event);
        } else {
          console.warn(`[vm-manager] Island event dropped for ${wikiId} — no onWorkerEvent callback registered`);
        }
      }
      if (raw.type === "wiki:verb-result") {
        const result = raw as WikiMsg_VerbResult;
        const pending = this._pendingWikiVerbs.get(result.requestId);
        if (pending) {
          this._pendingWikiVerbs.delete(result.requestId);
          if (result.error) pending.reject(new Error(result.error));
          else               pending.resolve(result.result ?? {});
        }
      }
      if (raw.type === "fault") {
        console.error(`[vm-manager] island fault for ${wikiId}: ${(raw as { error: string }).error}`);
      }
    });
    worker.on("error", (err) => {
      console.error(`[vm-manager] island error for ${wikiId}:`, err);
    });
  }
}

// ---------------------------------------------------------------------------
// _sendAndAwait — send a message to a island and await the first matching reply
// ---------------------------------------------------------------------------

/**
 * Post `msg` to `worker` and resolve when the island replies with a message
 * whose `type` matches `expectedType`.
 *
 * Rejects after `HANDSHAKE_TIMEOUT_MS` or on a island error event.
 * The caller is responsible for calling `worker.terminate()` after this resolves.
 */
function _sendAndAwait<T extends IslandToVesselMsg>(
  worker:       Worker,
  msg:          VesselToIslandMsg,
  expectedType: T["type"],
  transferList: (ArrayBuffer | MessagePort)[] = [],
): Promise<T> {
  return awaitIslandMsg<T>({
    expectedType,
    timeoutMs: HANDSHAKE_TIMEOUT_MS,
    subscribe:      (h) => { worker.on("message", h); return () => worker.off("message", h); },
    subscribeError: (h) => { worker.on("error",   h); return () => worker.off("error",   h); },
    send: () => {
      if (transferList.length > 0) worker.postMessage(msg, transferList);
      else                          worker.postMessage(msg);
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a lar: URI to a safe filesystem path component. */
function _sanitizeWikiId(wikiId: string): string {
  return wikiId.replace(/^lar:\/\/\//, "").replace(/[^a-zA-Z0-9@._-]/g, "_");
}
