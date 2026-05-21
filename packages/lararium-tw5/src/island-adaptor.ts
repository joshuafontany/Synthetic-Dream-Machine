/**
 * island-adaptor — causal-island ↔ TW5 wiki bridge for the Verse polychronous mesh.
 *
 * Architecture law — responsibility split:
 *
 *   IslandAdaptor
 *     inbound:  per-island pre-sync buffer → onSyncComplete() batch flush
 *               non-CRDT origins (tw-local echo, canon-hydrate, lares-command) apply immediately
 *               post-sync crdt-remote: returns — IslandAccumulator (separate MemeProjection) handles
 *     outbound: saveTiddler() → store.put() (direct)
 *               deleteTiddler() → store.tombstone() (direct)
 *
 *   IslandAccumulator (registered separately via addProjection)
 *     post-sync crdt-remote buffering → drained per rAF frame via flushAll()
 *
 * IslandAdaptor wires directly: start() → store.addProjection() / store.subscribe().
 *
 * Preserved invariants:
 *   Echo-loop guard   — _applying Map<key, ChangeOrigin> suppresses outbound during inbound
 *                       key shapes: instanceId · islandId · `${instanceId}:cross-bag`
 *                                   `${instanceId}:acc` · `${instanceId}:child` · `changeset:${kind}`
 *   Canon guard       — lar:///ha.ka.ba/ namespace is read-only (saveTiddler skips)
 *   Temp guard        — $:/temp/* and $:/ never reach the store
 *   Draft suppression — "Draft of …" suppressed until M-E island
 *   Island isolation  — per-island buffer; each onSyncComplete() fires one wiki.transact()
 *   Child cleanup     — deleteTiddler removes ahu fragment-parent slot children
 *
 * Callers wire:
 *   const adaptor     = new IslandAdaptor(tw5, store, instanceId, targetBag);
 *   const accumulator = new IslandAccumulator();
 *   store.addProjection(adaptor);       // handles pre-sync buffer + non-CRDT
 *   store.addProjection(accumulator);   // handles post-sync crdt-remote
 *
 *   // Per camera: wiki.addEventListener("change", tree.refresh) for widget tree refresh.
 *   // Each camera drives its own drain cycle via CameraRegistration.
 *
 *   // browser (multi-camera):
 *   tw5.startRenderLoop(
 *     [{ accumulator: storyAcc, tickMs: 0, budget: 200 },     // Story River — rAF 60fps
 *      { accumulator: canvasAcc, tickMs: 16, budget: 200 },   // TLDraw canvas — 60fps setInterval
 *      { accumulator: minimapAcc, tickMs: 200, budget: 50 }], // mini-map — 5fps
 *     adaptor,
 *   );
 *   // node:
 *   setInterval(() => adaptor.flushAll([accumulator], 200), 16);
 *
 * Schema: lar:///ha.ka.ba/@lares/api/v0.1/lararium/schema/island-adaptor
 */

import type {
  LarTiddlerStore,
  LarTiddlerRecord,
  LarTiddlerChange,
  ChangeOrigin,
} from "@lararium/mesh";
import { toLarTiddlerRecord } from "@lararium/mesh";
import type { MemeProjection } from "@lararium/mesh";
import { IslandAccumulator } from "@lararium/mesh";
import type { TW5Engine } from "./tw5-vm.js";
import { splitBodyTiddler } from "./deserializer.js";
import type { TW5TiddlerInputFields } from "./types/tiddlywiki.d.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTemp(title: string): boolean      { return title.startsWith("$:/temp/"); }
function isDraft(title: string): boolean     { return title.startsWith("Draft of "); }
function isTW5System(title: string): boolean { return title.startsWith("$:/"); }
function isMemeUri(title: string): boolean   { return title.startsWith("lar:"); }

function toTW5FieldStrings(
  tw5: TW5Engine,
  tiddler: unknown,
): Record<string, string> {
  const candidate = tiddler as { getFieldStrings?: (options?: { exclude?: string[] }) => Record<string, string>; fields?: Record<string, unknown> } | null;
  if (candidate?.getFieldStrings) return candidate.getFieldStrings();

  const Tiddler = tw5.$tw.Tiddler;
  if (candidate?.fields && typeof candidate.fields === "object") {
    return new Tiddler(candidate.fields).getFieldStrings();
  }
  if (tiddler && typeof tiddler === "object") {
    return new Tiddler(tiddler as Record<string, unknown>).getFieldStrings();
  }
  return {};
}

function extractFields(tw5: TW5Engine, tiddler: unknown): Record<string, string> {
  return toTW5FieldStrings(tw5, tiddler);
}

function bulkApply(tw5: TW5Engine, batch: TW5TiddlerInputFields[]): void {
  const wiki    = tw5.$tw.wiki;
  const Tiddler = tw5.$tw.Tiddler;
  const apply   = () => { for (const f of batch) wiki.addTiddler(new Tiddler(f)); };
  if (typeof wiki.transact === "function") wiki.transact(apply); else apply();
}

function toTW5ProjectionFields(record: LarTiddlerRecord, bag?: string): TW5TiddlerInputFields {
  return bag ? { ...record.tiddler, bag } : record.tiddler;
}

// ---------------------------------------------------------------------------
// IslandAdaptor
// ---------------------------------------------------------------------------

export class IslandAdaptor implements MemeProjection {
  readonly name = "lararium-island";

  /** Bag this adaptor targets for outbound writes. */
  readonly targetBag: string;

  /**
   * Echo-loop guard.  Keyed by apply slot so concurrent island replays
   * (M-bags) and carrier-child removes don't interfere.
   *
   *   instanceId              — standard inbound apply
   *   islandId                — onSyncComplete batch flush
   *   `${instanceId}:cross-bag` — async tombstone resolution
   *   `${instanceId}:acc`     — flushAll frame drain
   *   `${instanceId}:child`   — carrier-child cleanup during deleteTiddler
   *   `changeset:${kind}`     — onChangeset bulk path
   */
  private readonly _applying = new Map<string, ChangeOrigin>();
  private _isApplying(): boolean { return this._applying.size > 0; }

  /** Per-island sync-complete gate. */
  private readonly _syncComplete = new Set<string>();
  /** Pre-sync inbound buffer, drained on onSyncComplete(). */
  private readonly _buffer = new Map<string, LarTiddlerChange[]>();

  // SP-1 — 400 ms capture debounce (save-path invariant).
  static readonly DEBOUNCE_MS = 400;
  private readonly _debounce = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly _pending  = new Map<string, {
    fields:  Record<string, string>;
    resolve: () => void;
    reject:  (err: Error) => void;
    origin:  ChangeOrigin;
  }>();

  private _unsubscribe: (() => void) | null = null;

  constructor(
    private readonly tw5:   TW5Engine,
    private readonly store: LarTiddlerStore,
    readonly instanceId:    string,
    targetBag = "wiki",
  ) {
    this.targetBag = targetBag;
  }

  // ---------------------------------------------------------------------------
  // MemeProjection — inbound CRDT→TW5
  // ---------------------------------------------------------------------------

  /**
   * Inbound URI change from MemeProvider.
   *
   *   crdt-remote + pre-sync  → buffer per island (onSyncComplete flushes)
   *   crdt-remote + post-sync → return; IslandAccumulator owns this path
   *   all other origins       → apply immediately (echo-guarded)
   */
  onUriChanged(change: LarTiddlerChange): void {
    if (change.origin.kind !== "crdt-remote") {
      this._applyChange(change);
      return;
    }
    const islandId = change.origin.edgeIsland;
    if (this._syncComplete.has(islandId)) return; // IslandAccumulator handles post-sync
    const buf = this._buffer.get(islandId) ?? [];
    buf.push(change);
    this._buffer.set(islandId, buf);
  }

  /**
   * Scale-3 bulk inbound path — fires when MemeProvider coalesces a large patch
   * (>= CHANGESET_THRESHOLD URIs).  Fetches all records from the store and
   * applies as one wiki.transact() to produce a single widget refresh pass.
   */
  async onChangeset(uris: ReadonlySet<string>, origin: ChangeOrigin): Promise<void> {
    if (this._isApplying()) return;
    const applyKey = `changeset:${origin.kind}`;
    this._applying.set(applyKey, origin);
    try {
      const toRemove: string[] = [];
      const toAdd: TW5TiddlerInputFields[] = [];

      await Promise.all(Array.from(uris).map(async (uri) => {
        const rec = await this.store.get(uri);
        if (!rec || rec.meta?.deleted) { toRemove.push(uri); return; }
        toAdd.push(toTW5ProjectionFields(rec));
      }));

      const wiki = this.tw5.$tw.wiki;
      for (const title of toRemove) wiki.deleteTiddler(title);
      if (toAdd.length > 0) bulkApply(this.tw5, toAdd);
    } finally {
      this._applying.delete(applyKey);
    }
  }

  /**
   * Island initial-sync settled.  Drains the island's buffer in one
   * wiki.transact() — one widget refresh pass per island.
   */
  onSyncComplete(islandId = "automerge"): void {
    this._syncComplete.add(islandId);
    const buf = this._buffer.get(islandId) ?? [];
    this._buffer.delete(islandId);
    if (buf.length === 0) return;

    const toRemove: string[] = [];
    const toAdd: TW5TiddlerInputFields[] = [];

    for (const change of buf) {
      // Suppress own tw-local echoes that arrived before sync settled.
      if (change.origin.kind === "tw-local" && change.origin.instanceId === this.instanceId) continue;

      if (change.record === null || change.record.meta?.deleted) {
        toRemove.push(change.title);
        for (const t of this._childUrisOf(change.title)) toRemove.push(t);
      } else {
        toAdd.push(toTW5ProjectionFields(change.record, change.bag));
      }
    }

    const applyKey = islandId;
    this._applying.set(applyKey, { kind: "crdt-remote", edgeIsland: islandId });
    try {
      const wiki = this.tw5.$tw.wiki;
      for (const title of toRemove) wiki.deleteTiddler(title);
      if (toAdd.length > 0) bulkApply(this.tw5, toAdd);
    } finally {
      this._applying.delete(applyKey);
    }
  }

  // ---------------------------------------------------------------------------
  // Render-loop integration — IslandAccumulator drain
  // ---------------------------------------------------------------------------

  /**
   * Drain N accumulators in recipe priority order (index 0 = lowest bag priority,
   * last index = highest).  Shares `budget` total patches across all accumulators —
   * stops when the frame budget exhausts, carries remainder to the next tick.
   * Each non-empty accumulator drains into one wiki.transact() block.
   *
   * Called per rAF frame by TW5Engine.startRenderLoop() (browser) or a
   * setInterval driver (Node).
   */
  flushAll(accs: IslandAccumulator[], budget = 200): void {
    let remaining = budget;
    for (const acc of accs) {
      if (remaining <= 0) break;
      const batch = acc.drain(remaining);
      if (batch.length === 0) continue;
      remaining -= batch.length;
      this._applyBatch(batch);
    }
  }

  private _applyBatch(batch: LarTiddlerChange[]): void {
    const applyKey = `${this.instanceId}:acc`;
    const origin: ChangeOrigin = { kind: "crdt-remote", edgeIsland: "automerge" };
    this._applying.set(applyKey, origin);
    try {
      const wiki    = this.tw5.$tw.wiki;
      const Tiddler = this.tw5.$tw.Tiddler;
      const apply = () => {
        for (const change of batch) {
          if (change.origin.kind === "tw-local" && change.origin.instanceId === this.instanceId) continue;
          if (change.record === null || change.record.meta?.deleted) {
            wiki.deleteTiddler(change.title);
            for (const t of this._childUrisOf(change.title)) wiki.deleteTiddler(t);
          } else {
            wiki.addTiddler(new Tiddler(toTW5ProjectionFields(change.record, change.bag)));
          }
        }
      };
      if (typeof wiki.transact === "function") wiki.transact(apply); else apply();
    } finally {
      this._applying.delete(applyKey);
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  start(): () => void {
    if (typeof this.store.addProjection === "function") {
      this._unsubscribe = this.store.addProjection(this);
    } else {
      this._unsubscribe = this.store.subscribe((change) => this._applyChange(change));
    }
    return () => this.stop();
  }

  stop(): void {
    for (const t of this._debounce.values()) clearTimeout(t);
    this._debounce.clear();
    this._pending.clear();
    this._unsubscribe?.();
    this._unsubscribe = null;
  }

  // ---------------------------------------------------------------------------
  // Outbound TW5→CRDT
  // ---------------------------------------------------------------------------

  /**
   * TW5 wiki edit → bag write.
   *
   * Guards:
   *   - Echo-loop: _applying active → skip (inbound apply in progress)
   *   - Temp guard: $:/temp/* → skip
   *   - System guard: $:/ → skip
   *   - Draft suppression: "Draft of …" → skip (M-E island not yet wired)
   *   - Meme URI gate: only lar: URIs reach the store
   *
   * Routing law: explicit bag field → ceremony write (promote uses this to reach canonical bags).
   * No explicit bag field → live TW5 edit; routes to this.targetBag (top wiki draft bag).
   *
   * Path H auto-split: if the body contains <<~ ahu blocks, splitBodyTiddler()
   * materialises child slot tiddlers in the bag (ONE parser, FOUR call sites law).
   */
  saveTiddler(tiddler: unknown): Promise<void> {
    if (this._isApplying()) return Promise.resolve();

    const fields = extractFields(this.tw5, tiddler);
    const title  = fields["title"] ?? "";

    if (isTemp(title) || isTW5System(title)) return Promise.resolve();
    if (isDraft(title))                      return Promise.resolve();
    if (!isMemeUri(title))                   return Promise.resolve();

    const origin: ChangeOrigin = { kind: "tw-local", instanceId: this.instanceId };

    const existing = this._debounce.get(title);
    if (existing !== undefined) {
      clearTimeout(existing);
      this._pending.get(title)?.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      this._pending.set(title, { fields, resolve, reject, origin });
      this._debounce.set(title, setTimeout(() => this._flushPending(title), IslandAdaptor.DEBOUNCE_MS));
    });
  }

  saveRecord(record: LarTiddlerRecord): Promise<void> {
    return this.saveTiddler({ fields: toTW5FieldStrings(this.tw5, record.tiddler) });
  }

  private _flushPending(title: string): void {
    this._debounce.delete(title);
    const p = this._pending.get(title);
    this._pending.delete(title);
    if (!p) return;
    this._writeMeme(title, p.fields, p.origin)
      .then(p.resolve)
      .catch(p.reject);
  }

  deleteTiddler(title: string): Promise<void> {
    if (this._isApplying())                  return Promise.resolve();
    if (isTemp(title) || isTW5System(title)) return Promise.resolve();
    if (!isMemeUri(title))                   return Promise.resolve();

    const origin: ChangeOrigin = { kind: "tw-local", instanceId: this.instanceId };

    return this.store.tombstone(title, origin).then(() => {
      this._removeSlotChildren(title, origin);
    });
  }


  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _childUrisOf(parentUri: string): string[] {
    return this.tw5.$tw.wiki.filterTiddlers(`[field:fragment-parent[${parentUri}]]`) as string[];
  }

  private _removeFromTw5(title: string): void {
    const wiki = this.tw5.$tw.wiki;
    wiki.deleteTiddler(title);
    for (const t of this._childUrisOf(title)) wiki.deleteTiddler(t);
  }

  private _applyChange(change: LarTiddlerChange): void {
    if (change.origin.kind === "tw-local" && change.origin.instanceId === this.instanceId) return;

    const applyKey = this.instanceId;
    this._applying.set(applyKey, change.origin);
    try {
      if (change.record === null || change.record.meta?.deleted) {
        // Cross-bag tombstone: only wipe TW5 when no live copy remains anywhere in the recipe.
        const store = this.store as { getLive?: (t: string) => Promise<LarTiddlerRecord | null> };
        if (typeof store.getLive === "function") {
          // Guard held for the full async lifetime — key re-set inside the closure
          // so the echo guard stays active through the microtask gap.
          void this._applyCrossBagTombstone(change.title, change.origin, store.getLive.bind(store));
        } else {
          this._removeFromTw5(change.title);
        }
      } else {
        this.tw5.$tw.wiki.addTiddler(new this.tw5.$tw.Tiddler(toTW5ProjectionFields(change.record, change.bag)));
      }
    } finally {
      this._applying.delete(applyKey);
    }
  }

  /**
   * Cross-bag tombstone resolution — async path with explicit guard lifetime.
   * The _applying key persists through the await so the echo guard never drops
   * between the synchronous delete and the async getLive resolution.
   */
  private async _applyCrossBagTombstone(
    title:   string,
    origin:  ChangeOrigin,
    getLive: (t: string) => Promise<LarTiddlerRecord | null>,
  ): Promise<void> {
    const key = `${this.instanceId}:cross-bag`;
    this._applying.set(key, origin);
    try {
      const live = await getLive(title);
      if (live) {
        this.tw5.$tw.wiki.addTiddler(new this.tw5.$tw.Tiddler(toTW5ProjectionFields(live)));
      } else {
        this._removeFromTw5(title);
      }
    } finally {
      this._applying.delete(key);
    }
  }

  /** Remove ahu-slot child tiddlers from TW5 under the echo guard. */
  private _removeSlotChildren(parentUri: string, origin: ChangeOrigin): void {
    const children = this.tw5.$tw.wiki.filterTiddlers(`[field:fragment-parent[${parentUri}]]`);
    if (children.length === 0) return;
    const childKey = `${this.instanceId}:child`;
    this._applying.set(childKey, origin);
    try { for (const t of children) this.tw5.$tw.wiki.deleteTiddler(t); }
    finally { this._applying.delete(childKey); }
  }

  /**
   * Write a lar: URI to the store.  Splits ahu fragment-parent blocks first
   * (Path H auto-split).  Tombstones orphaned slot children.
   */
  private async _writeMeme(
    title:  string,
    fields: Record<string, string>,
    origin: ChangeOrigin,
  ): Promise<void> {
    const bodyText = fields["text"] ?? "";
    const { parent, children } = splitBodyTiddler(title, bodyText, fields);
    // Ceremony writes (promote) pass an explicit bag field to route to the canonical target.
    // Live TW5 edits without an explicit bag field fall back to this.targetBag (top wiki draft bag).
    const targetBag = fields["bag"] || this.targetBag;
    const { bag: _bag, ...persistedParent } = parent;

    await this.store.put(toLarTiddlerRecord({ ...persistedParent, title }), origin, { bag: targetBag });

    if (children.length > 0) {
      const existingChildren = new Set<string>(this._childUrisOf(title));
      const newChildren      = new Set<string>();

      for (const child of children) {
        const childTitle = String(child["title"] ?? "");
        if (!childTitle.startsWith("lar:")) continue;
        newChildren.add(childTitle);
        const { bag: _childBag, ...persistedChild } = child;
        await this.store.put(toLarTiddlerRecord({ ...persistedChild, title: childTitle }), origin, { bag: targetBag });
      }

      for (const uri of existingChildren) {
        if (!newChildren.has(uri)) await this.store.tombstone(uri, origin);
      }
    }
  }
}
