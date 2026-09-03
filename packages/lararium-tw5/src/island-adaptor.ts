/**
 * island-adaptor — TS shore between CompositeStore and the wiki's nalu engine.
 *
 * Narrowed role under the yin-collapse law (nalu.md):
 *   - inbound (projection)  → forward LarTiddlerChange → $tw.lares.enqueueNalu()
 *   - outbound (TW5 edits)  → saveTiddler() / deleteTiddler() → store.put/tombstone
 *   - cross-bag tombstone resolution stays in TS (needs async getLive on composite)
 *   - echo guard delegates to $tw.lares.isApplyingNalu() (wiki owns apply lifetime)
 *
 * The TW5 module nalu-engine owns (not this adaptor):
 *   - the per-island buffer — initial replay flows through enqueueNalu
 *   - batch flush on sync — the sync gate is observability only
 *   - IslandAccumulator wiring — one shared queue lives in the wiki
 *   - flushAll(accs, budget) — frame drain lives in the wiki
 *   - wiki.transact() wrapping — one transact per nalu, wiki side
 *   - kernel.applyDelta calls — the wiki module owns wiki writes
 *
 * Initial replay path:
 *   AutomergeDocStore.emitInitialReplay() fires fireImmediate per existing tiddler
 *     → MemeProvider fan-out → this adaptor.onUriChanged → $tw.lares.enqueueNalu
 *     → next frame drains the lot in one wiki.transact()
 *
 * Schema: lar:///ha.ka.ba/lares/api/lararium/schema/island-adaptor
 */

import type {
  LarTiddlerStore,
  LarTiddlerRecord,
  LarTiddlerChange,
  ChangeOrigin,
  MemeProjection,
  SlotUri,
} from "@lararium/mesh";
import { toLarTiddlerRecord } from "@lararium/mesh";

/** Cascade config tiddler — newline-separated filter expressions; first non-empty result wins. */
const BAG_PATHS_CONFIG   = "lar:///ha.ka.ba/lararium/config/bag-paths";
const CURRENT_WIKI_BAG   = "lar:///ha.ka.ba/lararium/config/current-wiki-bag";

/** What the cascade did with a title. A withholding and a gap both stop a write and mean opposite things. */
type RouteVerdict =
  | { readonly kind: "slot";     readonly uri:  SlotUri }
  | { readonly kind: "withheld"; readonly rule: string }
  | { readonly kind: "gap";      readonly why:  string };
import type { TW5Engine } from "./tw5-vm.js";
import type { LaresTw5Extension } from "./types/lares-globals.js";
import { splitBodyTiddler } from "./deserializer.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  ) {}

  /**
   * Walk the in-wiki bag-path cascade to pick a target slot URI.
   *
   * ── THE CASCADE ROUTES; IT DOES NOT DECIDE WHETHER TO WRITE ───────────────────────────────────
   * Everything a hand edits and saves — memes, `.tid`s, and every other TW5 filetype — travels
   * through the CRDT and round-trips. The cascade answers WHICH slot; the only thing that may
   * withhold a write is a rule that NAMES what it withholds.
   *
   * Mirrors TW5's `$:/config/FileSystemPaths` pattern: newline-separated filter expressions
   * evaluated against a single-tiddler source, first non-empty result wins. And it takes TW5's
   * OTHER shape too — `$:/config/SyncFilter` is total (`[is[tiddler]]`) minus a named exclusion
   * list, so the shipped cascade ends in a catch-all and opens with the exclusions.
   *
   * ⚠ THE THREE OUTCOMES ARE NOT ONE. A rule may route a title, a rule may withhold it, or no rule
   * may reach it at all — and the third is a ROUTER GAP rather than a decision. Read as one, a gap
   * drops the write in silence: the promise resolves, the wiki shows the edit, nothing persists, and
   * the tiddler is gone on the next boot. So the walk reports which of the three happened and the
   * callers act differently on each.
   */
  private _routeBag(title: string): RouteVerdict {
    const wiki = this.tw5.$tw.wiki;
    if (typeof wiki.getTiddlerText !== "function" || typeof wiki.filterTiddlers !== "function") {
      return { kind: "gap", why: "the wiki exposes no filter engine" };
    }
    const config = wiki.getTiddlerText(BAG_PATHS_CONFIG, "");
    if (!config) return { kind: "gap", why: `no cascade at ${BAG_PATHS_CONFIG}` };
    const filters = config.split("\n").map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    // Single-tiddler iterator — equivalent to TW5's wiki.makeTiddlerIterator([title]).
    const source = (fn: (t: unknown, ti: string) => void): void => fn(wiki.getTiddler(title), title);
    for (const filter of filters) {
      const result = wiki.filterTiddlers(filter, undefined, source as never);
      if (result.length === 0) continue;
      const first = result[0] ?? "";
      // An empty operand is the WITHHOLDING form, and it is only lawful from a rule that names its
      // subject — the cascade carries `[[$:/core]then[]]`, never a bare `[…]then[]` standing for
      // "whatever fell this far".
      return first === "" ? { kind: "withheld", rule: filter } : { kind: "slot", uri: first };
    }
    return { kind: "gap", why: "no rule reached this title — the cascade lost its catch-all" };
  }

  /**
   * Resolve a write's destination, and say so out loud when the cascade cannot.
   *
   * A GAP IS A BUG IN THE CASCADE, never a property of the tiddler, so it MUST NOT pass as a quiet
   * no-op. The write still lands — at the write layer, which is where an unrouted save belongs — and
   * the console carries the title that had no rule, because the alternative is an operator losing
   * work and having nothing to read.
   */
  private _destination(title: string): SlotUri | null {
    const verdict = this._routeBag(title);
    if (verdict.kind === "slot")     return verdict.uri;
    if (verdict.kind === "withheld") return null;
    const fallback = this.tw5.$tw.wiki.getTiddlerText?.(CURRENT_WIKI_BAG, "") ?? "";
    console.warn(
      `[island-adaptor] no cascade rule routes "${title}" (${verdict.why}) — ` +
      (fallback ? `writing to the write layer ${fallback}. ` : "and no write layer resolves. ") +
      `Add a rule to ${BAG_PATHS_CONFIG}; a save must never vanish for want of one.`,
    );
    return fallback ? (fallback as SlotUri) : null;
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
      const store = this.store as { resolveTopmost?: (t: string) => Promise<{ bagId: string; record: LarTiddlerRecord } | null> };
      if (typeof store.resolveTopmost === "function") {
        void this._resolveCrossBagTombstone(change, store.resolveTopmost.bind(store));
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

    // Cascade pre-check: skip if no rule routes this title AND no explicit
    // `bag` override (ceremony). Routing filters live in the in-wiki bag-paths
    // cascade — operator-editable, per-wiki overlayable.
    // A ceremony write names its own bag and bypasses the cascade. Otherwise the cascade answers,
    // and only a NAMED withholding stops the write (`_destination` fills a router gap and says so).
    const explicitBag = fields["bag"];
    if (!explicitBag && this._destination(title) === null) return Promise.resolve();

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
    if (this._isApplying()) return Promise.resolve();
    // A DELETE ROUTES LIKE A SAVE, and the tiddler is already gone from the wiki when this runs — so
    // any rule keyed on a tiddler's EXISTENCE would route its creation and drop its deletion, leaving
    // a record that resurrects on the next boot. The cascade keys on titles for exactly this reason.
    if (this._destination(title) === null) return Promise.resolve();

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
    change:        LarTiddlerChange,
    resolveTopmost: (t: string) => Promise<{ bagId: string; record: LarTiddlerRecord } | null>,
  ): Promise<void> {
    const survivor = await resolveTopmost(change.title);
    if (survivor) {
      // Stamp the SURVIVOR's bag — where the carrier NOW lives — never change.bag
      // (the bag it just LEFT). On a cross-bag MOVE the record retracts from the
      // source and surfaces in a lower bag; tagging it with the source's bag left
      // the projector targeting the stale source mirror (byte-identical → silent
      // hash-skip) and never publishing the destination. resolveTopmost carries
      // the origin-bag the read path needs (residency-model anti-pattern #4).
      this._enqueue({ title: change.title, record: survivor.record, origin: change.origin, bag: survivor.bagId });
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
    // Ceremony writes carry an explicit `bag` field to route to a canonical slot;
    // live edits route by walking the in-wiki cascade (lar:///ha.ka.ba/lararium/config/bag-paths).
    // The cascade returns null when no rule matches or an explicit-skip rule fires
    // (e.g. $:/* system tiddlers).
    // Explicit `bag` field (ceremony writes) short-circuits the cascade; only
    // walk the in-wiki cascade when no override is present.
    const targetBag = (fields["bag"] as SlotUri | undefined) ?? this._destination(title) ?? undefined;
    if (!targetBag) return;
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
