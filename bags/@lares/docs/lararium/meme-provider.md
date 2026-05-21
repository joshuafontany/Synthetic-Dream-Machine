<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/docs/lararium/meme-provider >>
```toml iam
uri-path = "ha.ka.ba/@lares/docs/lararium/meme-provider"
file-path = "bags/@lares/docs/lararium/meme-provider.md"
type = "text/x-typescript"
register     = "CS"
confidence   = 0.86
mana         = 0.88
manao        = 0.86
manaoio      = 0.82
role         = "coalescing fan-out layer between Automerge DocHandle and typed projections — isomorphic, zero Automerge dep"
cacheable    = true
retain       = true
body-sha256  = "0d482f4f018ba241ba5d582c02b282741306053d9a2fed9c8614bb7a0d6036b1"
docs         = "lar:///ha.ka.ba/@lares/docs/lararium/meme-provider"
```



<<~&#x0002;>>

/**
 * MemeProvider — coalescing fan-out layer between an Automerge DocHandle
 * and multiple typed projections (TW5 wiki, disk write-back, canvas, MCP).
 *
 * Motivation:
 *   Automerge replays all historical patches to new peers on connect. Without
 *   coalescing, each patch fires every subscriber: the same URI is deserialized
 *   8+ times, TW5 accumulates hundreds of addTiddler calls before its first
 *   refresh, and disk write-back hammers the filesystem redundantly.
 *
 * Contract:
 *   - Caller owns the DocHandle and feeds raw patches via handleChange().
 *   - Each projection is registered via addProjection(); receives one coalesced
 *     LarTiddlerChange per URI per debounce window (DEBOUNCE_MS).
 *   - After the initial Automerge replay settles, caller calls markSyncComplete().
 *     MemeProvider flushes all pending timers immediately and fires onSyncComplete
 *     on every registered projection — the TW5 projection uses this to trigger a
 *     single bulk-refresh instead of one refresh per tiddler.
 *
 * Isomorphic: zero Automerge import. Works identically in Node and browser.
 * Lives in @lararium/mesh so @lararium/app, @lararium/node, and future packages
 * all share one implementation without circular dependencies.
 */

import type { LarTiddlerRecord, LarTiddlerChange, ChangeOrigin } from "./tiddler-store.js";

// ---------------------------------------------------------------------------
// MemeProjection — typed slot for a downstream integration
// ---------------------------------------------------------------------------

export interface MemeProjection {
  /**
   * Fired once per coalesced URI, after DEBOUNCE_MS has elapsed since the
   * last patch touching that URI. record is null for tombstoned/deleted URIs.
   */
  onUriChanged(change: LarTiddlerChange): void;

  /**
   * Fired once when the initial Automerge sync replay has settled (after
   * markSyncComplete() is called by the host). Use this to trigger a single
   * bulk-refresh instead of per-tiddler refreshes during boot.
   */
  onSyncComplete?(): void;
}

// Minimal patch shape — only path[0] (the top-level doc key) is needed.
export interface RawPatch {
  path: unknown[];
}

// ---------------------------------------------------------------------------
// MemeProvider
// ---------------------------------------------------------------------------

export class MemeProvider {
  /**
   * Debounce window in ms. Coalesces rapid same-URI patches from Automerge
   * replay (8–50 patches per URI on a fresh peer connect). 40ms is tight
   * enough to feel synchronous on a local connection; loose enough to absorb
   * a full initial-sync burst before the first projection callback fires.
   */
  static readonly DEBOUNCE_MS = 40;

  private readonly _projections = new Set<MemeProjection>();
  private readonly _pending     = new Map<string, { origin: ChangeOrigin; timer: ReturnType<typeof setTimeout> }>();
  private _syncComplete         = false;

  constructor(
    /** Returns the current full document state. Called at debounce-fire time, not patch time. */
    private readonly _getDoc: () => Record<string, unknown>,
  ) {}

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  /** Register a projection. Returns an unsubscribe function. */
  addProjection(p: MemeProjection): () => void {
    this._projections.add(p);
    return () => this._projections.delete(p);
  }

  // ---------------------------------------------------------------------------
  // Patch ingestion — call from handle.on("change", ...)
  // ---------------------------------------------------------------------------

  /**
   * Feed raw Automerge patches. Schedules a debounced fire for each touched
   * lar: URI. Rapid patches for the same URI reset the timer — only the last
   * known state is delivered to projections.
   */
  handleChange(patches: RawPatch[], origin: ChangeOrigin): void {
    for (const p of patches) {
      const uri = p.path[0];
      if (typeof uri === "string" && uri.startsWith("lar:")) {
        this._schedule(uri, origin);
      }
    }
  }

  /**
   * Fire a change immediately, bypassing the debounce. Use for local writes
   * (put / tombstone) where the caller already holds the authoritative value
   * and echo-loop guards depend on synchronous delivery.
   */
  fireImmediate(change: LarTiddlerChange): void {
    for (const p of this._projections) {
      try { p.onUriChanged(change); }
      catch (e) { console.error("[MemeProvider] projection error in onUriChanged:", e); }
    }
  }

  // ---------------------------------------------------------------------------
  // Sync-complete gate — call once after initial Automerge replay settles
  // ---------------------------------------------------------------------------

  /**
   * Signal that the initial Automerge sync replay has settled. Flushes all
   * pending debounce timers immediately (so projections receive the full initial
   * state before onSyncComplete fires), then fires onSyncComplete on every
   * registered projection. Idempotent — safe to call more than once.
   */
  markSyncComplete(): void {
    if (this._syncComplete) return;
    this._syncComplete = true;

    // Flush all pending debounces — deliver final state now, don't wait.
    for (const [uri, { origin, timer }] of this._pending) {
      clearTimeout(timer);
      this._pending.delete(uri);
      this._fire(uri, origin);
    }

    for (const p of this._projections) {
      try { p.onSyncComplete?.(); }
      catch (e) { console.error("[MemeProvider] projection error in onSyncComplete:", e); }
    }
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private _schedule(uri: string, origin: ChangeOrigin): void {
    const existing = this._pending.get(uri);
    if (existing) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      this._pending.delete(uri);
      this._fire(uri, origin);
    }, MemeProvider.DEBOUNCE_MS);

    this._pending.set(uri, { origin, timer });
  }

  private _fire(uri: string, origin: ChangeOrigin): void {
    const doc = this._getDoc();
    const raw = doc[uri] as {
      title?:   string;
      fields?:  Record<string, string>;
      text?:    string;
      deleted?: boolean;
    } | undefined;

    const record: LarTiddlerRecord | null = raw
      ? Object.freeze({
          title:   raw.title ?? uri,
          fields:  Object.freeze({ ...(raw.fields ?? {}) }),
          ...(raw.text    !== undefined && { text:    raw.text    }),
          ...(raw.deleted !== undefined && { deleted: raw.deleted }),
          bag: "room" as const,
        })
      : null;

    const change: LarTiddlerChange = { title: uri, record, origin };
    for (const p of this._projections) {
      try { p.onUriChanged(change); }
      catch (e) { console.error("[MemeProvider] projection error in onUriChanged:", e); }
    }
  }
}

<<~&#x0003;>>

<<~&#x0004; -> ? >>
