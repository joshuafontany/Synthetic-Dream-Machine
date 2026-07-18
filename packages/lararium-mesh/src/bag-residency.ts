/**
 * Bag residency — the thermal residency engine for one vessel's bags.
 *
 * The residency runtime and the federation-authority doctrine share no types,
 * functions, or imports, so each stands in its own file. This module carries the
 * live, widely-imported residency engine; the authority/edge-island doctrine lives
 * in causal-island-authority.ts.
 *
 * Model: a two-state thermal axis in ʻōlelo Hawaiʻi — wela (hot) / anu (cold) —
 * plus an orthogonal pin flag. The `warm` middle tier was cut.
 *
 * Canon: lar:///ha.ka.ba/lararium/api/residency-tiers
 */

import { DAEMON_BAG_ID } from "./lar-uris.js";

/** A bag's URL — Automerge doc URL, e.g. "automerge:abc123…". */
export type BagUrl = string;

/**
 * Residency TEMPERATURE of an island/bag — the thermal axis, in ʻōlelo Hawaiʻi.
 *
 * Canon: lar:///ha.ka.ba/lararium/api/residency-tiers
 *
 *   wela ("hot")  — live + reacting; handle in cache; the island's Worker runs.
 *   anu  ("cold") — torn down; URL known, doc not loaded; resume by spawn + `ea`.
 *
 * TWO states only. The `warm` (mahana) middle tier was cut: a suspended Worker
 * still holds its heap, so warm did NOT shed the memory this model exists to
 * bound, and it had no actor-system precedent (the Orleans/Akka two-state
 * virtual-actor model). Reintroduce only behind a measured resume-cost problem
 * AND a real memory-shedding suspend (isolate evicted, handle-cache retained).
 *
 * `pinned` is NOT a temperature — it is an ORTHOGONAL flag ("exempt from
 * cooling"), kupono-aligned with Orleans `[KeepAlive]` / Android foreground.
 * See `isPinned()`. A pinned bag is wela and stays wela.
 *
 * Transition VERBS wear Hawaiian (the-lararium-hud.md doctrine):
 *   - `hoʻoanu`  ("to cool") — wela → anu. `IslandMsg_HooAnu` drives the island
 *     side; `cool()` drives this bookkeeping side.
 *   - `hoʻowela` ("to heat") — anu → wela. `touch()` heats a bag back to live;
 *     resume re-acquires the handle via repo.find() + the island `ea` handshake.
 */
export type ResidencyTemperature = "wela" | "anu";

/**
 * A bag's residency derives from the islands whose recipes reference it: if ANY
 * referencing island is `wela`, the bag is `wela`; otherwise `anu`. No
 * referencing island → anu. The collapse rule — bags carry no
 * independent tier; their temperature is reachability from a live island root.
 */
export function deriveBagTemperature(
  islandTemps: readonly ResidencyTemperature[],
): ResidencyTemperature {
  return islandTemps.includes("wela") ? "wela" : "anu";
}

/** Snapshot of one bag's residency record. */
export interface BagResidencyEntry {
  readonly url:          BagUrl;
  readonly temperature:  ResidencyTemperature;   // "wela" | "anu"
  readonly pinned:       boolean;  // orthogonal flag — exempt from cooling
  readonly lastTouched:  number;   // ms epoch
  readonly pinReason?:   string;   // operator-supplied or system pin reason
  readonly syncActive?:  boolean;  // true when peers are mid-replication
}

/** Stats summary for `lares residency` instrumentation. */
export interface BagResidencyStats {
  readonly pinned:   readonly BagUrl[];
  readonly wela:     readonly BagResidencyEntry[];   // unpinned live (hot) entries
  readonly anuCount: number;                         // cold (URL known, unloaded)
  readonly hotCap:   number;                         // cap on unpinned-wela residents
}

/** The default grain type — a bag (an Automerge doc). A wiki-island grain rides
 *  the SAME collector under `grainType: "wiki"`, so one directory + one policy
 *  bounds both, with per-type caps (the F2 collapse: fewer parts, one collector). */
export const DEFAULT_GRAIN_TYPE = "bag";

export interface BagResidencyManagerOptions {
  /** Soft cap on unpinned-wela (live) `bag`-grain count. Default 32. Pinned grains
   *  are exempt and do not count against the cap. This is the `bag`-type dial; other
   *  grain types override it via `typeCaps`. */
  readonly hotCap?:     number;
  /** Per-grain-type soft caps — the F2 per-type dials over the ONE collector (e.g.
   *  `{ wiki: 4 }` bounds live wiki islands independently of bags). A type absent
   *  here falls back to `hotCap`. `bag` always reads `hotCap`. */
  readonly typeCaps?:   Readonly<Record<string, number>>;
  /** Idle threshold in ms. A wela grain untouched longer than this cools to anu.
   *  Default 300_000 (5 minutes). */
  readonly idleMs?:     number;
  /** Sweeper tick interval in ms. Default 30_000 (30 seconds). */
  readonly sweepIntervalMs?: number;
  /** Hook called when heating anu → wela (hoʻowela). Wires into repo.find() (bag)
   *  or mountWiki (wiki). The grain type routes the right activation. */
  readonly onHydrate?:  (url: BagUrl, grainType: string) => Promise<void>;
  /** Hook called when cooling wela → anu (hoʻoanu). Compact-then-drop (bag) or
   *  unmountWiki (wiki); the grain type routes the right deactivation. Until
   *  automerge-repo#358 lands a public eviction API the actual bag handle drop
   *  stays a TODO inside the hook impl. */
  readonly onEvict?:    (url: BagUrl, grainType: string) => Promise<void>;
}

/** Internal per-grain residency state (single-map model). */
interface ResidencyState {
  temperature: ResidencyTemperature;
  pinned:      boolean;
  lastTouched: number;
  /** Grain type — `bag` (default) or `wiki`. Selects the per-type cap + the
   *  onHydrate/onEvict routing. Set on first registration; never changes. */
  grainType:   string;
  pinReason?:  string;
  syncActive?: boolean;
  /** Transient: set while an async `onEvict` is in flight. A concurrent touch /
   *  sync-start / pin clears it, which aborts the cool (TOCTOU guard). */
  evicting?:   boolean;
}

/**
 * BagResidencyManager — owns the residency state for one vessel's bags.
 *
 * Single-map model: every known bag carries a `ResidencyState`
 * (temperature + orthogonal pin flag). Temperature moves wela ↔ anu
 * via touch/cool; pin is set independently and exempts a bag from cooling.
 *
 * NOTE: this is the bag-level bookkeeping mechanism the Island Pool drives.
 * Bag temperature ultimately DERIVES from the warmest
 * referencing island (`deriveBagTemperature`); this manager records and bounds
 * that derived state plus the LRU/idle sweeper that frees handles.
 */
export class BagResidencyManager {
  private readonly _bags = new Map<BagUrl, ResidencyState>();
  private readonly hotCap:          number;
  private readonly typeCaps:        Readonly<Record<string, number>>;
  private readonly idleMs:          number;
  private readonly sweepIntervalMs: number;
  private readonly onHydrate?:      (url: BagUrl, grainType: string) => Promise<void>;
  private readonly onEvict?:        (url: BagUrl, grainType: string) => Promise<void>;
  // ReturnType<typeof setInterval> resolves to DOM's `number` here because
  // @types/node isn't on the lararium-mesh type chain. The runtime value
  // is Node's Timeout. clearInterval accepts both; only Node has .unref().
  private sweeperTimer:             ReturnType<typeof setInterval> | null = null;
  private sweepInFlight = false;

  constructor(opts: BagResidencyManagerOptions = {}) {
    this.hotCap          = opts.hotCap          ?? 32;
    this.typeCaps        = opts.typeCaps        ?? {};
    this.idleMs          = opts.idleMs          ?? 300_000;
    this.sweepIntervalMs = opts.sweepIntervalMs ?? 30_000;
    if (opts.onHydrate) this.onHydrate = opts.onHydrate;
    if (opts.onEvict)   this.onEvict   = opts.onEvict;
  }

  /** The soft cap for a grain type — `bag` reads `hotCap`; other types read their
   *  `typeCaps` dial, falling back to `hotCap` when unset. */
  private _capForType(grainType: string): number {
    if (grainType === DEFAULT_GRAIN_TYPE) return this.hotCap;
    return this.typeCaps[grainType] ?? this.hotCap;
  }

  private _ensure(url: BagUrl, grainType: string = DEFAULT_GRAIN_TYPE): ResidencyState {
    let s = this._bags.get(url);
    if (!s) {
      s = { temperature: "anu", pinned: false, lastTouched: Date.now(), grainType };
      this._bags.set(url, s);
    }
    return s;
  }

  private _entry(url: BagUrl, s: ResidencyState): BagResidencyEntry {
    return {
      url,
      temperature: s.temperature,
      pinned:      s.pinned,
      lastTouched: s.lastTouched,
      ...(s.pinReason  !== undefined && { pinReason:  s.pinReason  }),
      ...(s.syncActive !== undefined && { syncActive: s.syncActive }),
    };
  }

  /** Pin a bag — exempt it from cooling (orthogonal flag). An anu bag heats to
   *  wela (hydrate); a wela bag stays resident and gains the flag. */
  async pin(url: BagUrl, reason?: string, grainType: string = DEFAULT_GRAIN_TYPE): Promise<void> {
    const wasCold = (this._bags.get(url)?.temperature ?? "anu") === "anu";
    const s = this._ensure(url, grainType);
    s.pinned = true;
    if (reason !== undefined) s.pinReason = reason;
    if (wasCold) {
      s.temperature = "wela";
      s.lastTouched = Date.now();
      if (this.onHydrate) await this.onHydrate(url, s.grainType);
    }
  }

  /** Clear the pin flag. Temperature is unchanged — the doc still lives in RAM
   *  (hot/warm); it simply becomes a cooling candidate again. */
  unpin(url: BagUrl): void {
    const s = this._bags.get(url);
    if (!s || !s.pinned) return;
    s.pinned = false;
    delete s.pinReason;
  }

  /** Note that a bag was just touched (read or write) — `hoʻowela` to wela.
   *  Heats anu → wela via onHydrate (only when it was cold); bumps lastTouched.
   *  Triggers an LRU trim when adding pushes resident count past hotCap. */
  async touch(url: BagUrl, grainType: string = DEFAULT_GRAIN_TYPE): Promise<void> {
    const wasCold = (this._bags.get(url)?.temperature ?? "anu") === "anu";
    const s = this._ensure(url, grainType);
    if (wasCold && this.onHydrate) await this.onHydrate(url, s.grainType);
    s.temperature = "wela";
    s.lastTouched = Date.now();
    delete s.evicting;            // cancel any in-flight cool — grain is live again
    await this.enforceCap();
  }

  /** Register a URL we know about but haven't loaded. Oracle traversal calls
   *  this when it sees a `tiddler.text → automerge:URL` pointer for a bag not
   *  already tracked. No-op if already known (never cools a live grain). */
  registerCold(url: BagUrl, grainType: string = DEFAULT_GRAIN_TYPE): void {
    if (this._bags.has(url)) return;
    this._bags.set(url, { temperature: "anu", pinned: false, lastTouched: Date.now(), grainType });
  }

  /** `hoʻoanu` — cool a wela bag to anu (compact-then-drop the handle).
   *  Refuses pinned bags and bags mid-replication (automerge-repo#358).
   *
   *  TOCTOU guard: `onEvict` is async; a concurrent `touch` (hoʻowela), pin, or
   *  sync-start may land during the await. We raise a transient `evicting` flag
   *  before the await; touch/pin/setSyncActive clear it. If it was cleared (or
   *  the bag began syncing / got pinned) we abort the drop — never clobber a
   *  freshly-live bag (the llama.cpp `unload_lru` race). `onEvict` MUST be
   *  idempotent: if a cool aborts after onEvict ran, the bag stays wela and the
   *  next sweep retries. Returns true only when the bag actually moved to anu. */
  async cool(url: BagUrl): Promise<boolean> {
    const s = this._bags.get(url);
    if (!s || s.pinned || s.temperature === "anu" || s.syncActive) return false;
    s.evicting = true;
    if (this.onEvict) await this.onEvict(url, s.grainType);
    const after = this._bags.get(url);
    if (!after || !after.evicting || after.pinned || after.syncActive) {
      if (after) delete after.evicting;
      return false;   // raced — a touch / pin / sync-start cleared the intent
    }
    after.temperature = "anu";
    delete after.evicting;
    delete after.syncActive;
    return true;
  }

  /** Alias — historical name for cooling a bag to anu (handle drop). */
  async evict(url: BagUrl): Promise<boolean> {
    return this.cool(url);
  }

  /** Count of UNPINNED wela (live) grains of a type. Pinned grains are exempt from
   *  cooling and do NOT count against the cap (preserves pre-collapse semantics where
   *  `_hot` excluded pinned). The per-type cap bounds this number. */
  private residentCount(grainType: string): number {
    let n = 0;
    for (const s of this._bags.values())
      if (!s.pinned && s.temperature === "wela" && s.grainType === grainType) n++;
    return n;
  }

  /** LRU trim — per grain type, while unpinned-wela of that type > its cap, cool the
   *  oldest evictable grain of that type. Each type bounds independently (the F2
   *  per-type dials over the ONE collector): a wiki flood never evicts a live bag. */
  private async enforceCap(): Promise<void> {
    const types = new Set<string>();
    for (const s of this._bags.values()) if (!s.pinned && s.temperature === "wela") types.add(s.grainType);
    for (const grainType of types) {
      const cap = this._capForType(grainType);
      while (this.residentCount(grainType) > cap) {
        const target = this._oldestWela(grainType);
        if (!target) break;        // every wela grain of this type is pinned or mid-sync
        const ok = await this.cool(target);
        if (!ok) break;            // race or refusal — bail; next sweep retries
      }
    }
  }

  /** Total UNPINNED wela grains across all types — the sweep's evicted-delta base. */
  private _totalResidentCount(): number {
    let n = 0;
    for (const s of this._bags.values()) if (!s.pinned && s.temperature === "wela") n++;
    return n;
  }

  /** Oldest unpinned, non-syncing wela grain of a type, or null. */
  private _oldestWela(grainType: string): BagUrl | null {
    let oldestUrl: BagUrl | null = null;
    let oldestAt  = Infinity;
    for (const [url, s] of this._bags) {
      if (s.pinned || s.syncActive || s.temperature !== "wela" || s.grainType !== grainType) continue;
      if (s.lastTouched < oldestAt) {
        oldestAt  = s.lastTouched;
        oldestUrl = url;
      }
    }
    return oldestUrl;
  }

  /** Start the background sweeper. Idempotent — calling twice is a no-op. */
  startSweeper(): void {
    if (this.sweeperTimer) return;
    this.sweeperTimer = setInterval(() => {
      void this.sweepOnce().catch((err) => {
        console.error("[residency] sweep crashed:", err);
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

  /** One sweep pass: cool idle wela → anu (idle > idleMs), then enforce the cap.
   *  Re-entrancy-guarded so overlapping ticks don't fight.
   *
   *  Known refinement (deferred, adversarial-research finding): this is pure-age
   *  LRU and so is not scan-resistant — a one-shot sweep over many bags can
   *  evict the genuine working set. A cheap second-chance reference bit
   *  (CLOCK/SIEVE) would fix it; not yet warranted at current scale. */
  async sweepOnce(): Promise<{ cooled: number; lruEvicted: number }> {
    if (this.sweepInFlight) return { cooled: 0, lruEvicted: 0 };
    this.sweepInFlight = true;
    let cooled = 0, lruEvicted = 0;
    try {
      const cutoff = Date.now() - this.idleMs;
      const stale: BagUrl[] = [];
      for (const [url, s] of this._bags)
        if (!s.pinned && !s.syncActive && s.temperature === "wela" && s.lastTouched < cutoff)
          stale.push(url);
      for (const url of stale) if (await this.cool(url)) cooled++;
      const before = this._totalResidentCount();
      await this.enforceCap();
      lruEvicted = before - this._totalResidentCount();
    } finally {
      this.sweepInFlight = false;
    }
    return { cooled, lruEvicted };
  }

  /** Mark or unmark a bag as mid-sync. The sweeper + cool() consult this
   *  before dropping a handle (the automerge-repo#358 invariant: "don't evict
   *  while another vessel is actively replicating to us"). No-op if unknown. */
  setSyncActive(url: BagUrl, active: boolean): void {
    const s = this._bags.get(url);
    if (!s) return;
    s.syncActive = active;
  }

  has(url: BagUrl): boolean {
    return this._bags.has(url);
  }

  /** Temperature of a bag (`wela` | `anu`), or null if unknown. NOTE: returns
   *  the thermal tier only — use `isPinned()` for the orthogonal pin flag. */
  tier(url: BagUrl): ResidencyTemperature | null {
    return this._bags.get(url)?.temperature ?? null;
  }

  /** The orthogonal pin flag — true if this bag is exempt from cooling. */
  isPinned(url: BagUrl): boolean {
    return this._bags.get(url)?.pinned ?? false;
  }

  pinned(): readonly BagUrl[] {
    const out: BagUrl[] = [];
    for (const [url, s] of this._bags) if (s.pinned) out.push(url);
    return out;
  }

  /** Unpinned wela (live) entries, most-recently-touched first. */
  wela(): readonly BagResidencyEntry[] {
    return this._entriesAt("wela").sort((a, b) => b.lastTouched - a.lastTouched);
  }

  /** anu (cold) bag URLs — known but not loaded. */
  anu(): readonly BagUrl[] {
    const out: BagUrl[] = [];
    for (const [url, s] of this._bags) if (s.temperature === "anu") out.push(url);
    return out;
  }

  // Reports UNPINNED entries at a temperature — stats buckets (pinned / wela /
  // anu) stay disjoint, so a pinned-wela bag appears only under pinned().
  private _entriesAt(temp: ResidencyTemperature): BagResidencyEntry[] {
    const out: BagResidencyEntry[] = [];
    for (const [url, s] of this._bags)
      if (!s.pinned && s.temperature === temp) out.push(this._entry(url, s));
    return out;
  }

  stats(): BagResidencyStats {
    return {
      pinned:   this.pinned(),
      wela:     this.wela(),
      anuCount: this.anu().length,
      hotCap:   this.hotCap,
    };
  }
}

// ---------------------------------------------------------------------------
// Pin tiddler shape — pins persist as tiddlers in the daemon doc.
// Same pattern as bag-mirror configs. The dispatcher's residency
// manager reads pin tiddlers at boot and applies them.
// ---------------------------------------------------------------------------

/** Build the URI for a pin tiddler under the daemon doc. */
export function pinTiddlerUri(bagUrl: BagUrl): string {
  return `${DAEMON_BAG_ID}/pin/${encodeURIComponent(bagUrl)}`;
}
