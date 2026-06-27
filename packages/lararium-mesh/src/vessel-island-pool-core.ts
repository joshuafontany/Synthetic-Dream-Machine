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
import { wikiBagUri } from "./wiki-recipe.js";
import type { VesselWorkerHandle, VesselIslandHost } from "./vessel-host.js";
import {
  isIslandToVesselMsg,
  mkManifest,
  mkTeardown,
  mkWikiPlaceVerb,
  mkWikiDomEvent,
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
  cooledAt:   number;
}

type Slot = IslandSlot | ColdSlot;

export type DiskMirrorGrant = readonly { bagId: string; mirrorRoot: string; scope: string; perWikiSlug?: boolean; selfCanon?: boolean }[];

/** Resolve a mount's disk mirrors: intersect the held grant (authority) with the
 *  recipe's `mirrorBags` (designation), then fill a per-wiki-slug grant's leaf —
 *  e.g. `@working` projecting to `wikis/@{slug}` — from the recipe's `wikiSlug`
 *  at mount time.
 *
 *  A `selfCanon` entry is the per-wiki CANON authority: it expands BOTH its
 *  bagId and its leaf from the slug (the wiki's own `@{slug}` bag → `bags/@{slug}`),
 *  and yields only when the recipe designates that canon AND no literal grant
 *  already covers it — so a minted user wiki projects its canon to `bags/@{slug}`
 *  while the system wikis (@lares/@lararium, literal grants) keep their static
 *  roots and never double-project.
 *
 *  OCAP-clean: authority stays in the static grant, designation in the synced
 *  recipe, the per-instance bag + subdir resolved here. */
export function resolveDiskMirrors(
  grant: DiskMirrorGrant,
  mirrorBags: readonly string[] | undefined,
  wikiSlug: string,
): DiskMirrorGrant {
  const selfCanonBag = wikiBagUri(wikiSlug);
  const literalBags = new Set(grant.filter((g) => !g.selfCanon).map((g) => g.bagId));
  return grant
    .filter((g) =>
      g.selfCanon
        ? Boolean(mirrorBags?.includes(selfCanonBag)) && !literalBags.has(selfCanonBag)
        : Boolean(mirrorBags?.includes(g.bagId)),
    )
    .map((g) =>
      g.selfCanon
        ? { ...g, bagId: selfCanonBag, mirrorRoot: `${g.mirrorRoot}/@${wikiSlug}` }
        : g.perWikiSlug
          ? { ...g, mirrorRoot: `${g.mirrorRoot}/@${wikiSlug}` }
          : g,
    );
}

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
  /** The engine's plugin-tiddler CIDs — every wiki island resolves them by CID from the local
   *  CAS (the breath path), the same set the daemon island gets. Constant per genesis. */
  pluginCids?: readonly string[];
  /**
   * Called when the island's `ea` declaration lands — the island speaks
   * "sovereignty, breath, life" and the vessel RESPONDS (never a synthetic
   * vessel-side lifecycle event; the breath is the event). The durable
   * mailbox drains on ea: parked verbs deliver-to-identity the moment the
   * identity breathes again.
   */
  onEa?: (wikiId: string) => void;
  /** Override the mount silence budget in ms (tests). */
  mountSilenceMs?: number;
  /** Override the mount progress-stall budget in ms (default 3x silence). */
  mountStallMs?: number;
  /** Mount failures tolerated per wiki inside the window before the cap trips. */
  maxMountFailures?: number;
  /** The intensity window in ms (OTP MaxR/MaxT discipline). */
  mountFailureWindowMs?: number;
}

// A SILENCE budget, not a mount deadline: the ea-wait re-arms on each island
// breath (resetOnTypes), so a slow mount that keeps breathing never times out.
// The stall budget (3x) bounds breathing-without-advancing; the intensity cap
// (MaxR/MaxT) bounds restart storms on a deterministically failing mount.
const HANDSHAKE_TIMEOUT_MS        = 10_000;
const MAX_MOUNT_FAILURES          = 3;
const MOUNT_FAILURE_WINDOW_MS     = 60_000;

export class VesselIslandPoolCore {
  private readonly _slots = new Map<string, Slot>();
  private readonly _host:           VesselIslandHost;
  private readonly _mainRepo:       Repo | null;
  private readonly _diskMirrorGrant: DiskMirrorGrant;
  private readonly _hotCap:         number;
  private readonly _onWorkerEvent:  ((wikiId: string, msg: IslandMsg_Event) => void) | null;
  private readonly _pluginCids:     readonly string[];
  private readonly _onEa:           ((wikiId: string) => void) | null;
  private readonly _pendingWikiVerbs = new Map<string, {
    resolve: (r: Record<string, unknown>) => void;
    reject:  (e: Error) => void;
  }>();
  // OTP intensity bookkeeping — per-wiki failure timestamps inside the window.
  private readonly _mountFailures = new Map<string, number[]>();
  private readonly _mountSilenceMs:       number;
  private readonly _mountStallMs:         number;
  private readonly _maxMountFailures:     number;
  private readonly _mountFailureWindowMs: number;

  constructor(opts: VesselIslandPoolCoreOptions) {
    this._host            = opts.host;
    this._mainRepo        = opts.mainRepo ?? null;
    this._diskMirrorGrant = opts.diskMirrorGrant ?? [];
    this._hotCap          = opts.hotCap ?? Infinity;
    this._onWorkerEvent   = opts.onWorkerEvent ?? null;
    this._pluginCids      = opts.pluginCids ?? [];
    this._onEa            = opts.onEa ?? null;
    this._mountSilenceMs       = opts.mountSilenceMs ?? HANDSHAKE_TIMEOUT_MS;
    this._mountStallMs         = opts.mountStallMs ?? 3 * this._mountSilenceMs;
    this._maxMountFailures     = opts.maxMountFailures ?? MAX_MOUNT_FAILURES;
    this._mountFailureWindowMs = opts.mountFailureWindowMs ?? MOUNT_FAILURE_WINDOW_MS;
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
    // Intensity gate (MaxR/MaxT): a wiki that keeps failing its mount inside
    // the window fails FAST and NAMED — never another full silence budget per
    // attempt, never a restart storm. The window prunes itself; success clears.
    const failures = (this._mountFailures.get(wikiId) ?? [])
      .filter((t) => Date.now() - t < this._mountFailureWindowMs);
    if (failures.length >= this._maxMountFailures) {
      this._mountFailures.set(wikiId, failures);
      throw new Error(
        `[vessel-pool] mount intensity cap for ${wikiId} — ` +
        `${failures.length} failures inside ${this._mountFailureWindowMs}ms; ` +
        `retry after the window clears`,
      );
    }

    if (!pinned) await this._evictLruIfNeeded();

    const { mainPort, syncPort } = this._host.newSyncChannel();
    if (this._mainRepo) attachMessageChannelSync(this._mainRepo, mainPort);

    const worker = this._host.spawnWorker();
    this._wireWorkerListeners(wikiId, worker);

    // Disk-mirror = designation ∩ grant: the recipe (synced) DESIGNATES bags;
    // this pool's held grant names which it MAY write. A browser pool's empty
    // grant → never mirrors. The unforgeable authority lives in the grant.
    // Authority ∩ designation, with per-wiki-slug leaves filled from the recipe
    // (e.g. @working → wikis/@{slug}). See resolveDiskMirrors.
    const diskMirrors = resolveDiskMirrors(this._diskMirrorGrant, spec.recipe.mirrorBags, spec.recipe.wikiSlug);
    const storage = this._host.storage(wikiId);

    const manifestMsg = mkManifest(
      wikiId, syncPort, spec.recipe, spec.grants, spec.coreHash,
      {
        ...(storage            ? { storage }     : {}),
        ...(diskMirrors.length ? { diskMirrors } : {}),
        ...(this._pluginCids.length ? { pluginCids: this._pluginCids } : {}),
      },
    );

    try {
      // Browser ES-module workers signal "ready" (WASM loaded) before manifest.
      if (this._host.awaitReady) {
        await awaitIslandMsg<IslandMsg_Ready>({
          expectedType: "ready",
          timeoutMs:    this._mountSilenceMs,
          subscribe:      (h) => worker.listen(h),
          subscribeError: (h) => worker.onError(h),
        });
      }

      // The ea-breath law: the mounting island breathes; each breath re-arms
      // the silence window — a long live mount never reads dead; silence alone
      // does. The stall budget bounds breathing-without-advancing.
      await awaitIslandMsg<IslandMsg_Ea>({
        expectedType:    "ea",
        timeoutMs:       this._mountSilenceMs,
        progressStallMs: this._mountStallMs,
        resetOnTypes:    ["breath"],
        rejectOnTypes:   ["fault"],
        subscribe:      (h) => worker.listen(h),
        subscribeError: (h) => worker.onError(h),
        send: () => worker.post(manifestMsg, [syncPort]),
      });
    } catch (err) {
      // A failed mount cleans up after itself: the spawned worker dies, the
      // sync port closes, the failure lands in the intensity ledger. Without
      // the terminate, every ea timeout stranded a live worker thread.
      worker.terminate();
      mainPort.close();
      failures.push(Date.now());
      this._mountFailures.set(wikiId, failures);
      throw err;
    }

    this._mountFailures.delete(wikiId);   // a clean mount clears the ledger
    this._slots.set(wikiId, {
      temperature: "wela", pinned, wikiId, worker, mainPort, lastUsedAt: Date.now(),
    });
    this._onEa?.(wikiId);   // the island breathed; respond
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
    this._slots.set(wikiId, { temperature: "anu", wikiId, cooledAt: Date.now() });
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

  /** Relay a main-thread DOM event to the wiki island — the interactivity RETURN leg. Accumulate-
   *  family but fire-and-forget: postMessage IS the ordered queue, the sink (TW5's own handler) is
   *  synchronous, so no requestId/timeout/reserve. A cooled slot drops it (Hiatus drop-honesty). */
  placeWikiEvent(
    wikiId: string,
    ev: { renderId: string; eventType: string; fields: Record<string, number | boolean> },
  ): void {
    const slot = this._slots.get(wikiId);
    if (!slot || slot.temperature === "anu") return;
    slot.worker.post(mkWikiDomEvent(ev));
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
    return slot?.temperature === "anu" ? slot.cooledAt : null;
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
