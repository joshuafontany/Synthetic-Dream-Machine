/**
 * ReadinessMap — observable progressive-readiness registry.
 *
 * Replaces the single "app ready" gate with a named vector per shrine-light.
 * Well-known keys are typed; dynamic corpus/projection keys use string suffixes.
 *
 * Boot doctrine (FFZ web3):
 *
 *   auth         — identity/receipt confirmed
 *   sw-shell     — Service island controls page; app shell from SW cache
 *   catalog      — CatalogDoc synced; wiki + corpus URLs known
 *   tw-vm        — primary wiki TW5 rendering VM kernel booted (C≈1 core rendering pool)
 *                  lights right after t.boot() — before wiki tiddlers hydrate
 *                  nothing renders before this; all render-dependent keys branch here
 *                  isomorphic: relay vessel and browser vessel boot the same way
 *                  additional realm/portal VMs register as projection:<id> keys
 *                  (e.g. a canvas portal to a different wiki gets its own VM + projection key)
 *   wiki-content — wiki Automerge doc ready (starts empty → fast; parallel with tw-vm)
 *   tldraw-doc   — tldraw canvas doc ready
 *   corpus:<id>  — per-corpus island ready (arrive async, non-blocking)
 *   wiki-presence  — presence channel (never blocks content or render)
 *   mcp-index    — MCP resource index built
 *   disk-projector — disk write-back projection active
 *   kowloon-feed — Kowloon federation feed ready
 *   projection:<id> — per-projection cache ready
 *
 * Primary flow:
 *   auth → sw-shell → catalog → tw-vm (VM kernel, early gate)
 *                             → wiki-content (parallel)
 *                             ↘ corpus:<id> (async, non-blocking)
 *   tw-vm → tldraw-doc
 *         ↘ mcp-index → disk-projector → kowloon-feed
 *   wiki-presence lights independently — never blocks render.
 *
 * Presence does not share fate with content. Each vector lights independently.
 */

// ---------------------------------------------------------------------------
// Well-known readiness keys
// ---------------------------------------------------------------------------

// Corpus meme: lar:///ha.ka.ba/lares/api/lararium/schema/readiness-keys
export const READINESS_KEYS = [
  // Primary boot sequence
  "auth",
  "sw-shell",
  "catalog",
  "tw-vm",          // VM kernel for primary wiki — C≈1; boots before wiki hydration
  "wiki-content",   // wiki Automerge doc ready; parallel with tw-vm
  // Branches off tw-vm (all require a running VM to render)
  "tldraw-doc",
  "mcp-index",
  "disk-projector",
  "kowloon-feed",
  // Independent — never blocks content or render
  "wiki-presence",
] as const;

export type WellKnownReadinessKey = typeof READINESS_KEYS[number];

/**
 * Dynamic key forms:
 *   corpus:<id>       e.g. "corpus:sdm-ftls"
 *   projection:<id>   e.g. "projection:hud-render"
 */
export type ReadinessKey = WellKnownReadinessKey | `corpus:${string}` | `projection:${string}`;

// ---------------------------------------------------------------------------
// Listener type
// ---------------------------------------------------------------------------

export type ReadinessListener = (key: ReadinessKey, ready: boolean, map: ReadonlyMap<ReadinessKey, boolean>) => void;

// ---------------------------------------------------------------------------
// ReadinessMap
// ---------------------------------------------------------------------------

export class ReadinessMap {
  private readonly _state = new Map<ReadinessKey, boolean>();
  private readonly _listeners = new Set<ReadinessListener>();

  /** Mark a key ready. No-op if already true. */
  set(key: ReadinessKey, ready: boolean): void {
    if (this._state.get(key) === ready) return;
    this._state.set(key, ready);
    for (const fn of this._listeners) fn(key, ready, this._state);
  }

  mark(key: ReadinessKey): void { this.set(key, true); }
  unmark(key: ReadinessKey): void { this.set(key, false); }

  get(key: ReadinessKey): boolean { return this._state.get(key) ?? false; }

  /** True only if every supplied key reports ready. */
  allReady(...keys: ReadinessKey[]): boolean {
    return keys.every((k) => this._state.get(k) === true);
  }

  /** Subscribe to any readiness change. Returns unsubscribe fn. */
  subscribe(fn: ReadinessListener): () => void {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /** Current snapshot as a plain object — useful for HUD serialization. */
  snapshot(): Record<string, boolean> {
    return Object.fromEntries(this._state);
  }
}
