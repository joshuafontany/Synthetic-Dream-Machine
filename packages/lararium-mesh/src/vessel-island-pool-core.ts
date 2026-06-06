/**
 * VesselIslandPoolCore — the one platform-blind island pool (pair 4).
 *
 * Both vessels ran their own pool: node carried full residency (wela/anu + pin,
 * LRU, sweeper, placeWikiVerb, diskMirror); browser carried a bare slot Map.
 * This core holds that logic ONCE; node and browser supply only a VesselIslandHost
 * (worker spawn, sync channel, per-wiki storage, the ready handshake flag) and
 * pool config (mainRepo, diskMirrorGrant, hotCap). Browser inherits residency by
 * subtraction; `pinned` turns load-bearing wherever a finite hotCap creates
 * eviction pressure.
 *
 * No TW5 dependency — pure protocol + transport + residency, so it lives in mesh.
 * The vessel main thread holds NO engine reference; every TW5 VM runs inside the
 * island worker (no-VM-on-main-thread law).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/vessel-island-pool-core
 */

import { attachMessageChannelSync } from "./island-repo.js";
import { awaitIslandMsg } from "./vessel-host.js";
import type { VesselWorkerHandle, VesselIslandHost } from "./vessel-host.js";
import {
  isIslandToVesselMsg,
  mkManifest,
  mkTeardown,
  mkWikiPlaceVerb,
} from "./island-protocol.js";
import type {
  Repo,
} from "@automerge/automerge-repo";
import type {
  IslandMsg_Event,
  IslandMsg_Ea,
  IslandMsg_Ready,
  IslandMsg_TeardownAck,
  WikiMsg_VerbResult,
} from "./island-protocol.js";
import type { WikiMountSpec } from "./wiki-recipe.js";
import type { ResidencyTemperature } from "./causal-island.js";

// ── Slots — two-state thermal axis (wela/anu) + orthogonal pin flag ──────────

interface IslandSlot {
  temperature: "wela";
  pinned:      boolean;
  wikiId:      string;
  worker:      VesselWorkerHandle;
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

export type DiskMirrorGrant = readonly { bagId: string; mirrorRoot: string; scope: string }[];

export interface VesselIslandPoolCoreOptions {
  host: VesselIslandHost;
  /** Vessel main Repo — each island's mainPort wires to it for CRDT sync. */
  mainRepo?: Repo | null;
  /** Held disk-write capability — bag → mirror configs this pool MAY project. */
  diskMirrorGrant?: DiskMirrorGrant;
  /** Max live unpinned slots before LRU eviction. Infinity = no eviction pressure. */
  hotCap?: number;
  /** Called when an island emits a verse-event reaction. */
  onWorkerEvent?: (wikiId: string, msg: IslandMsg_Event) => void;
}

const HANDSHAKE_TIMEOUT_MS = 10_000;

export class VesselIslandPoolCore {
  private readonly _slots = new Map<string, Slot>();
  private readonly _host:           VesselIslandHost;
  private readonly _mainRepo:       Repo | null;
  private readonly _diskMirrorGrant: DiskMirrorGrant;
  private readonly _hotCap:         number;
  private readonly _onWorkerEvent:  ((wikiId: string, msg: IslandMsg_Event) => void) | null;
  private readonly _pendingWikiVerbs = new Map<string, {
    resolve: (r: Record<string, unknown>) => void;
    reject:  (e: Error) => void;
  }>();

  constructor(opts: VesselIslandPoolCoreOptions) {
    this._host            = opts.host;
    this._mainRepo        = opts.mainRepo ?? null;
    this._diskMirrorGrant = opts.diskMirrorGrant ?? [];
    this._hotCap          = opts.hotCap ?? Infinity;
    this._onWorkerEvent   = opts.onWorkerEvent ?? null;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /** Mount a wiki as a live (`wela`) island. `opts.pinned` exempts from LRU. */
  async mountWiki(wikiId: string, spec: WikiMountSpec, opts: { pinned?: boolean } = {}): Promise<void> {
    const existing = this._slots.get(wikiId);
    if (existing && existing.temperature === "wela") {
      existing.lastUsedAt = Date.now();
      return;
    }

    const pinned = opts.pinned ?? false;
    if (!pinned) await this._evictLruIfNeeded();

    const { mainPort, syncPort } = this._host.newSyncChannel();
    if (this._mainRepo) attachMessageChannelSync(this._mainRepo, mainPort);

    const worker = this._host.spawnWorker();
    this._wireWorkerListeners(wikiId, worker);

    // Disk-mirror = designation ∩ grant: the recipe (synced) DESIGNATES bags;
    // this pool's held grant names which it MAY write. A browser pool's empty
    // grant → never mirrors. The unforgeable authority lives in the grant.
    const diskMirrors = this._diskMirrorGrant.filter(
      (g) => spec.recipe.mirrorBags?.includes(g.bagId),
    );
    const storage = this._host.storage(wikiId);

    const manifestMsg = mkManifest(
      wikiId, syncPort, spec.recipe, spec.resolver, spec.coreHash,
      {
        ...(storage            ? { storage }     : {}),
        ...(diskMirrors.length ? { diskMirrors } : {}),
      },
    );

    // Browser ES-module workers signal "ready" (WASM loaded) before manifest.
    if (this._host.awaitReady) {
      await awaitIslandMsg<IslandMsg_Ready>({
        expectedType: "ready",
        timeoutMs:    HANDSHAKE_TIMEOUT_MS,
        subscribe:      (h) => worker.listen(h),
        subscribeError: (h) => worker.onError(h),
      });
    }

    await awaitIslandMsg<IslandMsg_Ea>({
      expectedType: "ea",
      timeoutMs:    HANDSHAKE_TIMEOUT_MS,
      subscribe:      (h) => worker.listen(h),
      subscribeError: (h) => worker.onError(h),
      send: () => worker.post(manifestMsg, [syncPort]),
    });

    this._slots.set(wikiId, {
      temperature: "wela", pinned, wikiId, worker, mainPort, lastUsedAt: Date.now(),
    });
  }

  /** Unmount a live island via teardown handshake; slot goes cold (`anu`). */
  async unmountWiki(wikiId: string): Promise<void> {
    const slot = this._slots.get(wikiId);
    if (!slot || slot.temperature === "anu") return;

    const workerSlot = slot;
    try {
      await awaitIslandMsg<IslandMsg_TeardownAck>({
        expectedType: "teardown:ack",
        timeoutMs:    HANDSHAKE_TIMEOUT_MS,
        subscribe:      (h) => workerSlot.worker.listen(h),
        subscribeError: (h) => workerSlot.worker.onError(h),
        send: () => workerSlot.worker.post(mkTeardown()),
      });
    } catch (err) {
      console.warn(`[vessel-pool] ${wikiId}: teardown handshake failed — ${err}; terminating anyway`);
    }

    workerSlot.mainPort.close();
    workerSlot.worker.terminate();
    this._slots.set(wikiId, { temperature: "anu", wikiId, demotedAt: Date.now() });
  }

  /** Teardown all live islands. */
  async disposeAll(): Promise<void> {
    const teardowns: Promise<void>[] = [];
    for (const slot of this._slots.values()) {
      if (slot.temperature === "wela") teardowns.push(this.unmountWiki(slot.wikiId));
    }
    await Promise.allSettled(teardowns);
    this._slots.clear();
  }

  // ── Wiki-scope job dispatch ──────────────────────────────────────────────────

  /** Place a wiki-scope job into a live island and await the result. */
  placeWikiVerb(
    wikiId: string,
    opts: { verb: string; args: Record<string, unknown>; requestedBy: string; targets?: string[]; batchMode?: string },
  ): Promise<Record<string, unknown>> {
    const slot = this._slots.get(wikiId);
    if (!slot || slot.temperature === "anu") {
      return Promise.reject(new Error(`[vessel-pool] no live island for ${wikiId}`));
    }
    const requestId = crypto.randomUUID();
    const worker = slot.worker;
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pendingWikiVerbs.delete(requestId);
        reject(new Error(`[vessel-pool] wiki:place-verb timeout for ${wikiId}/${opts.verb}`));
      }, HANDSHAKE_TIMEOUT_MS);
      this._pendingWikiVerbs.set(requestId, {
        resolve: (r) => { clearTimeout(timer); resolve(r); },
        reject:  (e) => { clearTimeout(timer); reject(e); },
      });
      worker.post(mkWikiPlaceVerb({ ...opts, requestId }));
    });
  }

  // ── Accessors ────────────────────────────────────────────────────────────────

  tier(wikiId: string): ResidencyTemperature | null {
    return this._slots.get(wikiId)?.temperature ?? null;
  }

  isPinned(wikiId: string): boolean {
    const slot = this._slots.get(wikiId);
    return slot?.temperature === "wela" ? slot.pinned : false;
  }

  coldSince(wikiId: string): number | null {
    const slot = this._slots.get(wikiId);
    return slot?.temperature === "anu" ? slot.demotedAt : null;
  }

  has(wikiId: string): boolean {
    return this._slots.get(wikiId)?.temperature === "wela";
  }

  stats(): { pinned: number; wela: number; anu: number } {
    let pinned = 0, wela = 0, anu = 0;
    for (const s of this._slots.values()) {
      if (s.temperature === "anu") anu++;
      else if (s.pinned)           pinned++;
      else                         wela++;
    }
    return { pinned, wela, anu };
  }

  inspect(): Array<{ wikiId: string; temperature: ResidencyTemperature; pinned: boolean }> {
    return [...this._slots.values()].map((s) =>
      s.temperature === "wela"
        ? { wikiId: s.wikiId, temperature: s.temperature, pinned: s.pinned }
        : { wikiId: s.wikiId, temperature: s.temperature, pinned: false },
    );
  }

  get size(): number { return this._slots.size; }

  // ── Private ───────────────────────────────────────────────────────────────────

  private async _evictLruIfNeeded(): Promise<void> {
    const hot = [...this._slots.values()].filter(
      (s): s is IslandSlot => s.temperature === "wela" && !s.pinned,
    );
    if (hot.length < this._hotCap) return;
    const lru = hot.sort((a, b) => a.lastUsedAt - b.lastUsedAt)[0]!;
    await this.unmountWiki(lru.wikiId);
  }

  private _wireWorkerListeners(wikiId: string, worker: VesselWorkerHandle): void {
    worker.listen((raw: unknown) => {
      if (!isIslandToVesselMsg(raw)) return;
      if (raw.type === "event") {
        if (this._onWorkerEvent) this._onWorkerEvent(wikiId, raw as IslandMsg_Event);
        return;
      }
      if (raw.type === "wiki:verb-result") {
        const result = raw as WikiMsg_VerbResult;
        const pending = this._pendingWikiVerbs.get(result.requestId);
        if (pending) {
          this._pendingWikiVerbs.delete(result.requestId);
          if (result.error) pending.reject(new Error(result.error));
          else              pending.resolve(result.result ?? {});
        }
        return;
      }
      if (raw.type === "fault") {
        console.error(`[vessel-pool] island fault for ${wikiId}: ${(raw as { error: string }).error}`);
      }
    });
    worker.onError((err) => {
      console.error(`[vessel-pool] island error for ${wikiId}:`, err);
    });
  }
}
