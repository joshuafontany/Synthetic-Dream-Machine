/**
 * BagResidencyManager — three-tier residency model for Automerge bags.
 *
 * Each bag in the lararium stack maps to one Automerge document. As an
 * operator's wiki grows (corpus + wiki + recipe + identity + circles +
 * sessions + admin + N corpus children + N wikis…), the count crosses what
 * any single vessel can keep hot in RAM. Browser tabs hit IndexedDB pressure;
 * Node daemons hit handle-cache growth that automerge-repo does NOT today
 * evict (see https://github.com/automerge/automerge-repo/issues/358).
 *
 * Three tiers:
 *   PINNED  — never evicted. Identity, active wiki, admin, sessions.
 *   HOT     — actively in handle-cache; LRU under cap (default 32).
 *   COLD    — URL known, doc NOT loaded. Stub-on-oracle traversal lands
 *             URLs here without forcing hydration.
 *
 * Golden principles encoded (sourced from research synthesis 2026-05-08):
 *   - Tier by attention, not policy. User-driven hydration; idle eviction.
 *   - Always-hot set: pin identity, active wiki, sessions, admin.
 *   - Don't evict while syncing. Mid-replication = unsafe to drop handle.
 *   - Compact-before-evict. Skip the multi-second rehydrate replay.
 *   - Stub on oracle traversal. Don't `find()` URLs found in tiddler.text
 *     until something reads through them.
 *
 * Forward note (Beelay/Sedimentree alignment):
 *   The `ChunkStore` interface below mirrors what Beelay's Sedimentree-
 *   shaped store is heading toward (load / save / loadRange / remove /
 *   compact). Today the only implementation wraps Automerge's existing
 *   storage adapters; when Beelay ships a stable JS adapter we swap a
 *   single class. The `compact()` hook is reserved for that future.
 *
 * Phase 1 (this file, C.1): instrumentation only — pinned/hot/cold sets,
 * pin / unpin / hydrate API, stats reporting. NO eviction yet. C.2 lands
 * the LRU + idle sweeper.
 *
 * Architecture invariants preserved:
 *   - Local-first: this manager is per-vessel; no central authority.
 *   - Web2 smell test: no RPC; pin state lives as tiddlers in the admin
 *     doc (durable, federates to operator devices via the existing
 *     admin-doc sync surface).
 *   - Causal-island model: eviction operates on whole bags (whole docs),
 *     never on slices within a doc.
 */


import { ADMIN_BAG_ID, LARES_PIN_TAG } from "./lar-uris.js";
/** A bag's URL — Automerge doc URL, e.g. "automerge:abc123…". */
export type BagUrl = string;

/** Residency tier of a single bag. */
export type ResidencyTier = "pinned" | "hot" | "cold";

/**
 * ChunkStore — storage abstraction shaped to match Beelay's Sedimentree
 * format when that ships. Today's only impl wraps Automerge-repo's
 * StorageAdapter. The `compact()` hook stays a no-op until a Sedimentree-
 * aware backend lands.
 *
 * Keys use Automerge's tuple convention: [docId, "snapshot"|"incremental",
 * chunkId]. Values are opaque binary blobs.
 */
export interface ChunkStore {
  load(key: readonly string[]): Promise<Uint8Array | undefined>;
  save(key: readonly string[], data: Uint8Array): Promise<void>;
  remove(key: readonly string[]): Promise<void>;
  loadRange(prefix: readonly string[]): Promise<{ key: readonly string[]; data: Uint8Array }[]>;
  removeRange(prefix: readonly string[]): Promise<void>;
  /** Sedimentree compaction hook — Phase 2; today's impls may no-op. */
  compact?(docId: string): Promise<void>;
}

/** Snapshot of one bag's residency record. */
export interface BagResidencyEntry {
  readonly url:          BagUrl;
  readonly tier:         ResidencyTier;
  readonly lastTouched:  number;   // ms epoch
  readonly pinReason?:   string;   // operator-supplied or system pin reason
  readonly syncActive?:  boolean;  // true when peers are mid-replication
}

/** Stats summary for `lares residency` instrumentation. */
export interface BagResidencyStats {
  readonly pinned:    readonly BagUrl[];
  readonly hot:       readonly BagResidencyEntry[];
  readonly coldCount: number;
  readonly hotCap:    number;
}

export interface BagResidencyManagerOptions {
  /** Soft cap on hot-tier bag count. Default 32. */
  readonly hotCap?:     number;
  /** Idle threshold in ms — bags untouched longer than this become eviction
   *  candidates during a sweeper tick. Default 300_000 (5 minutes). */
  readonly idleMs?:     number;
  /** Sweeper tick interval in ms. Default 30_000 (30 seconds). */
  readonly sweepIntervalMs?: number;
  /** Hook the manager calls when transitioning cold → hot. C.4 wires
   *  this into Automerge's repo.find(). Today (C.1) it's a stub. */
  readonly onHydrate?:  (url: BagUrl) => Promise<void>;
  /** Hook called when transitioning hot → cold. C.2 wires this into
   *  compact-then-drop; until automerge-repo#358 lands a public eviction
   *  API, the actual handle drop stays a TODO inside the hook impl. */
  readonly onEvict?:    (url: BagUrl) => Promise<void>;
}

/**
 * BagResidencyManager — owns the residency state for one vessel's bags.
 *
 * Phase 1 surface (C.1): pin / unpin / mark hot / mark cold / stats.
 * No eviction triggered automatically; callers can request it but the
 * manager just routes to onEvict() (C.2 wires the LRU + sweeper).
 */
export class BagResidencyManager {
  private readonly _pinned     = new Map<BagUrl, string | undefined>();
  private readonly _hot        = new Map<BagUrl, BagResidencyEntry>();
  private readonly _cold       = new Set<BagUrl>();
  private readonly hotCap:          number;
  private readonly idleMs:          number;
  private readonly sweepIntervalMs: number;
  private readonly onHydrate?:      (url: BagUrl) => Promise<void>;
  private readonly onEvict?:        (url: BagUrl) => Promise<void>;
  // ReturnType<typeof setInterval> resolves to DOM's `number` here because
  // @types/node isn't on the lararium-mesh type chain. The runtime value
  // is Node's Timeout. clearInterval accepts both; only Node has .unref().
  private sweeperTimer:             ReturnType<typeof setInterval> | null = null;
  private sweepInFlight = false;

  constructor(opts: BagResidencyManagerOptions = {}) {
    this.hotCap          = opts.hotCap          ?? 32;
    this.idleMs          = opts.idleMs          ?? 300_000;
    this.sweepIntervalMs = opts.sweepIntervalMs ?? 30_000;
    if (opts.onHydrate) this.onHydrate = opts.onHydrate;
    if (opts.onEvict)   this.onEvict   = opts.onEvict;
  }

  /** Pin a bag — never evict it. Pinning a hot bag promotes; pinning a
   *  cold bag both promotes AND triggers hydrate. */
  async pin(url: BagUrl, reason?: string): Promise<void> {
    this._pinned.set(url, reason);
    this._hot.delete(url);
    if (this._cold.has(url)) {
      this._cold.delete(url);
      if (this.onHydrate) await this.onHydrate(url);
    }
  }

  unpin(url: BagUrl): void {
    if (!this._pinned.has(url)) return;
    this._pinned.delete(url);
    // Demote to hot — operator unpinned but the doc still lives in RAM.
    this._hot.set(url, { url, tier: "hot", lastTouched: Date.now() });
  }

  /** Note that a bag was just touched (read or write). Promotes cold → hot
   *  via the onHydrate hook; bumps lastTouched for hot bags. Triggers an
   *  LRU trim when adding pushes the hot count past hotCap. */
  async touch(url: BagUrl): Promise<void> {
    if (this._pinned.has(url)) return;        // already always-hot
    if (this._cold.has(url)) {
      this._cold.delete(url);
      if (this.onHydrate) await this.onHydrate(url);
    }
    const existing = this._hot.get(url);
    this._hot.set(url, {
      url,
      tier:        "hot",
      lastTouched: Date.now(),
      ...(existing?.syncActive !== undefined && { syncActive: existing.syncActive }),
    });
    await this.enforceCap();
  }

  /** Register a URL we know about but haven't loaded. Oracle traversal
   *  calls this when it sees a `tiddler.text → automerge:URL` pointer
   *  for a bag that isn't already pinned or hot. */
  registerCold(url: BagUrl): void {
    if (this._pinned.has(url)) return;
    if (this._hot.has(url))    return;
    this._cold.add(url);
  }

  /** Demote a hot bag to cold — calls onEvict hook for compact-then-drop.
   *  Refuses pinned bags AND bags currently mid-sync (the
   *  automerge-repo#358 invariant: don't evict while a vessel is replicating
   *  to us; we'd drop the sync conversation and have to renegotiate). */
  async evict(url: BagUrl): Promise<boolean> {
    if (this._pinned.has(url)) return false;
    const entry = this._hot.get(url);
    if (!entry) return false;
    if (entry.syncActive) return false;
    if (this.onEvict) await this.onEvict(url);
    this._hot.delete(url);
    this._cold.add(url);
    return true;
  }

  /** LRU trim — while hot.size > hotCap, evict the oldest non-syncing entry.
   *  Called automatically from touch() and from sweepOnce(). */
  private async enforceCap(): Promise<void> {
    while (this._hot.size > this.hotCap) {
      const target = this.oldestEvictable();
      if (!target) break;        // every hot entry is mid-sync
      const ok = await this.evict(target);
      if (!ok) break;            // race or refusal — bail; next sweep retries
    }
  }

  /** Pick the oldest non-syncing hot entry. Returns null when none qualify. */
  private oldestEvictable(): BagUrl | null {
    let oldestUrl: BagUrl | null = null;
    let oldestAt  = Infinity;
    for (const entry of this._hot.values()) {
      if (entry.syncActive) continue;
      if (entry.lastTouched < oldestAt) {
        oldestAt  = entry.lastTouched;
        oldestUrl = entry.url;
      }
    }
    return oldestUrl;
  }

  /** Start the background sweeper. Idempotent — calling twice is a no-op. */
  startSweeper(): void {
    if (this.sweeperTimer) return;
    this.sweeperTimer = setInterval(() => {
      void this.sweepOnce().catch((err) => {
        console.error("[bag-residency] sweep crashed:", err);
      });
    }, this.sweepIntervalMs);
    // Don't keep the Node event loop alive just for this. Cast through
    // unknown — DOM's setInterval-return-type lacks .unref() but the
    // runtime value (Node's Timeout) carries it.
    (this.sweeperTimer as unknown as { unref?: () => void }).unref?.();
  }

  /** Stop the sweeper; safe to call multiple times. */
  stopSweeper(): void {
    if (!this.sweeperTimer) return;
    clearInterval(this.sweeperTimer);
    this.sweeperTimer = null;
  }

  /** One sweep pass: idle-evict bags untouched longer than idleMs, then
   *  enforce hotCap. Re-entrancy-guarded so overlapping ticks don't fight. */
  async sweepOnce(): Promise<{ idleEvicted: number; lruEvicted: number }> {
    if (this.sweepInFlight) return { idleEvicted: 0, lruEvicted: 0 };
    this.sweepInFlight = true;
    let idleEvicted = 0;
    let lruEvicted  = 0;
    try {
      const cutoff = Date.now() - this.idleMs;
      const stale: BagUrl[] = [];
      for (const entry of this._hot.values()) {
        if (entry.syncActive) continue;
        if (entry.lastTouched < cutoff) stale.push(entry.url);
      }
      for (const url of stale) {
        if (await this.evict(url)) idleEvicted++;
      }
      const before = this._hot.size;
      await this.enforceCap();
      lruEvicted = before - this._hot.size;
    } finally {
      this.sweepInFlight = false;
    }
    return { idleEvicted, lruEvicted };
  }

  /** Mark or unmark a bag as mid-sync. C.2's sweeper consults this before
   *  eviction (the automerge-repo#358 invariant: "don't evict while
   *  another vessel is actively replicating to us"). */
  setSyncActive(url: BagUrl, active: boolean): void {
    const entry = this._hot.get(url);
    if (!entry) return;
    this._hot.set(url, { ...entry, syncActive: active });
  }

  has(url: BagUrl): boolean {
    return this._pinned.has(url) || this._hot.has(url) || this._cold.has(url);
  }

  tier(url: BagUrl): ResidencyTier | null {
    if (this._pinned.has(url)) return "pinned";
    if (this._hot.has(url))    return "hot";
    if (this._cold.has(url))   return "cold";
    return null;
  }

  pinned(): readonly BagUrl[] {
    return [...this._pinned.keys()];
  }

  /** Hot entries sorted by lastTouched DESC (most-recent first). */
  hot(): readonly BagResidencyEntry[] {
    return [...this._hot.values()].sort((a, b) => b.lastTouched - a.lastTouched);
  }

  cold(): readonly BagUrl[] {
    return [...this._cold];
  }

  stats(): BagResidencyStats {
    return {
      pinned:    this.pinned(),
      hot:       this.hot(),
      coldCount: this._cold.size,
      hotCap:    this.hotCap,
    };
  }
}

// ---------------------------------------------------------------------------
// Pin tiddler shape — pins persist as tiddlers in the admin doc.
// Same pattern as bag-mirror configs (S5.6 A.5). The dispatcher's residency
// manager reads pin tiddlers at boot and applies them.
// ---------------------------------------------------------------------------

/** Build the URI for a pin tiddler under the admin doc. */
export function pinTiddlerUri(bagUrl: BagUrl): string {
  return `${ADMIN_BAG_ID}/pin/${encodeURIComponent(bagUrl)}`;
}
