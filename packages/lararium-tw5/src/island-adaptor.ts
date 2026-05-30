/**
 * island-adaptor — TS membrane between CompositeStore and the wiki's nalu engine.
 *
 * Narrowed role under the yin-collapse law (nalu.md):
 *   - inbound (projection)  → forward LarTiddlerChange → $tw.lares.enqueueNalu()
 *   - outbound (TW5 edits)  → saveTiddler() / deleteTiddler() → store.put/tombstone
 *   - cross-bag tombstone resolution stays in TS (needs async getLive on composite)
 *   - echo guard delegates to $tw.lares.isApplyingNalu() (wiki owns apply lifetime)
 *
 * What this used to own and no longer does (moved into TW5 module nalu-engine):
 *   - per-island pre-sync buffer (initial replay flows through enqueueNalu)
 *   - onSyncComplete batch flush (sync gate is observability only now)
 *   - IslandAccumulator wiring (single shared queue lives in the wiki)
 *   - flushAll(accs, budget) (frame drain lives in the wiki)
 *   - wiki.transact() wrapping (one transact per nalu — wiki side)
 *   - kernel.applyDelta calls (retired — the wiki module owns wiki writes)
 *
 * Initial replay path:
 *   AutomergeDocStore.emitInitialReplay() fires fireImmediate per existing tiddler
 *     → MemeProvider fan-out → this adaptor.onUriChanged → $tw.lares.enqueueNalu
 *     → next frame drains the lot in one wiki.transact()
 *
 * Schema: lar:///ha.ka.ba/@lares/v0.1/api/lararium/schema/island-adaptor
 */

import type {
  LarTiddlerStore,
  LarTiddlerRecord,
  LarTiddlerChange,
  ChangeOrigin,
  MemeProjection,
} from "@lararium/mesh";
import { toLarTiddlerRecord, isPersistableLarUri } from "@lararium/mesh";
import type { TW5Engine } from "./tw5-vm.js";
import type { LaresTw5Extension } from "./types/lares-globals.js";
import { splitBodyTiddler } from "./deserializer.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTemp(title: string): boolean      { return title.startsWith("$:/temp/"); }
function isDraft(title: string): boolean     { return title.startsWith("Draft of "); }
function isTW5System(title: string): boolean { return title.startsWith("$:/"); }

function toTW5FieldStrings(
  tw5: TW5Engine,
  tiddler: unknown,
): Record<string, string> {
  const candidate = tiddler as { getFieldStrings?: () => Record<string, string>; fields?: Record<string, unknown> } | null;
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

// ---------------------------------------------------------------------------
// IslandAdaptor
// ---------------------------------------------------------------------------

export class IslandAdaptor implements MemeProjection {
  readonly name = "lararium-island";

  /** Bag this adaptor targets for outbound writes. */
  readonly targetBag: string;

  // SP-1 — 400 ms capture debounce on outbound saves.
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
  // Echo guard — delegated to the in-wiki nalu engine
  // ---------------------------------------------------------------------------

  private _isApplying(): boolean {
    const { lares } = this.tw5.$tw as unknown as LaresTw5Extension;
    return lares?.isApplyingNalu?.() === true;
  }

  private _enqueue(change: LarTiddlerChange): void {
    const { lares } = this.tw5.$tw as unknown as LaresTw5Extension;
    lares?.enqueueNalu?.(change);
  }

  // ---------------------------------------------------------------------------
  // MemeProjection — inbound CRDT→wiki via the nalu engine
  // ---------------------------------------------------------------------------

  /**
   * Forward each change to the wiki's nalu engine. The engine batches them
   * across all bags and drains one wiki.transact() per frame.
   *
   * Own tw-local echoes are filtered here so they never re-enter the queue.
   * Cross-bag tombstones resolve before enqueue: a tombstone in one bag must
   * not delete the tiddler if another recipe layer still holds a live copy.
   */
  onUriChanged(change: LarTiddlerChange): void {
    if (change.origin.kind === "tw-local" && change.origin.instanceId === this.instanceId) return;

    if (change.record === null || change.record.meta?.deleted) {
      const store = this.store as { getLive?: (t: string) => Promise<LarTiddlerRecord | null> };
      if (typeof store.getLive === "function") {
        void this._resolveCrossBagTombstone(change, store.getLive.bind(store));
        return;
      }
    }
    this._enqueue(change);
  }

  /**
   * Scale-3 bulk inbound path — fires when MemeProvider coalesces a large patch.
   * Translate each URI to a LarTiddlerChange and enqueue. The nalu engine still
   * applies the whole batch in one wiki.transact() at the next frame.
   */
  async onChangeset(uris: ReadonlySet<string>, origin: ChangeOrigin): Promise<void> {
    await Promise.all(Array.from(uris).map(async (uri) => {
      const rec = await this.store.get(uri);
      this._enqueue({ title: uri, record: rec ?? null, origin });
    }));
  }

  /**
   * onSyncComplete is observability-only under the unified-nalu model.
   * The wiki's nalu engine has no per-bag sync gate — initial replay flows
   * through the same enqueue/drain path as live changes.
   */
  onSyncComplete(_islandId = "automerge"): void {
    // intentionally empty
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  start(): () => void {
    if (typeof this.store.addProjection === "function") {
      this._unsubscribe = this.store.addProjection(this);
    } else {
      this._unsubscribe = this.store.subscribe((change) => this.onUriChanged(change));
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

  saveTiddler(tiddler: unknown): Promise<void> {
    if (this._isApplying()) return Promise.resolve();

    const fields = extractFields(this.tw5, tiddler);
    const title  = fields["title"] ?? "";

    if (isTemp(title) || isTW5System(title)) return Promise.resolve();
    if (isDraft(title))                      return Promise.resolve();
    if (!isPersistableLarUri(title))         return Promise.resolve();

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
    if (!isPersistableLarUri(title))         return Promise.resolve();

    const origin: ChangeOrigin = { kind: "tw-local", instanceId: this.instanceId };

    return this.store.tombstone(title, origin).then(() => {
      this._removeSlotChildren(title);
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _childUrisOf(parentUri: string): string[] {
    return this.tw5.$tw.wiki.filterTiddlers(`[field:fragment-parent[${parentUri}]]`) as string[];
  }

  /**
   * Cross-bag tombstone resolution — async path.
   * Stays in TS because it needs to read across CompositeStore layers via getLive.
   * Either enqueues the tombstone (no live copy elsewhere) or enqueues the live
   * record from another bag (one of the other layers still holds it).
   */
  private async _resolveCrossBagTombstone(
    change:  LarTiddlerChange,
    getLive: (t: string) => Promise<LarTiddlerRecord | null>,
  ): Promise<void> {
    const live = await getLive(change.title);
    if (live) {
      this._enqueue({ title: change.title, record: live, origin: change.origin, ...(change.bag !== undefined ? { bag: change.bag } : {}) });
    } else {
      this._enqueue(change);
    }
  }

  /** Remove ahu-slot child tiddlers from TW5 during outbound delete. */
  private _removeSlotChildren(parentUri: string): void {
    const children = this.tw5.$tw.wiki.filterTiddlers(`[field:fragment-parent[${parentUri}]]`);
    for (const t of children) this.tw5.$tw.wiki.deleteTiddler(t);
  }

  /**
   * Write a lar: URI to the store. Splits ahu fragment-parent blocks first
   * (Path H auto-split). Tombstones orphaned slot children.
   */
  private async _writeMeme(
    title:  string,
    fields: Record<string, string>,
    origin: ChangeOrigin,
  ): Promise<void> {
    const bodyText = fields["text"] ?? "";
    const { parent, children } = splitBodyTiddler(title, bodyText, fields);
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
