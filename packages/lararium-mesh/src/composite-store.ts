/**
 * CompositeStore — recipe-ordered overlay of LarTiddlerStore layers.
 *
 * Layers ordered lowest → highest priority (wiki overrides corpus overrides core).
 * Standard TW5 recipe law: same title in multiple bags → highest priority bag wins.
 *
 * Put/tombstone always route to the designated writable store (wiki bag by default).
 * Read paths (get, listVisible) fan out across all layers; highest priority wins.
 * Subscribe fans out to all layers; callers must check origin to avoid echo loops.
 *
 * Layers may be added dynamically after construction — corpus islands arrive async.
 * Callers should subscribe BEFORE addLayer to ensure no change events are missed,
 * or trigger a refresh after addLayer returns.
 */

import type {
  LarTiddlerStore,
  LarTiddlerRecord,
  LarTiddlerChange,
  ChangeOrigin,
  MemeProjection,
} from "./tiddler-store.js";
import type { RecipeTiddler } from "./recipe.js";
import { parseBagStack, parsePlugins } from "./recipe.js";
import {
  corpusLarUri,
  wikiLarUri,
} from "./lar-uris.js";
import { headsEqual } from "./wiki-recipe.js";
import type { WikiRecipe, EpochPinState } from "./wiki-recipe.js";

// Re-export so callers get bag IDs and URI helpers from a single import.
export { corpusLarUri as corpusBagId, wikiLarUri as wikiBagId };
// BAG_IDS lives in lar-uris.ts; re-exported from the package index via `export * from "./lar-uris.js"`.

export interface CompositeLayer {
  readonly bagId:        string;
  readonly store:        LarTiddlerStore;
  readonly writable:     boolean;
  /**
   * When true (default), this layer becomes the composite's default writable
   * store on registration — unbagged writes route here. Set false for layers
   * that accept explicit `record.bag` routing but shouldn't override the
   * default. The projection layer (E.2) uses this: writable=true so explicit
   * writes targeting `bag: "projection"` route correctly, but the default
   * writable stays draft/wiki.
   */
  readonly defaultWritable?: boolean;
  /**
   * Optional read-access policy expression from the bag's BagTiddler descriptor.
   * Carried here so callers can inspect policy without another tiddler lookup.
   * Default interpretation: "public" when absent.
   */
  readonly readPolicy?:  string;
  /**
   * Optional write-access policy expression from the bag's BagTiddler descriptor.
   * Default interpretation: derived from `writable` flag when absent.
   */
  readonly writePolicy?: string;
}

/** Minimal residency-touch shape — kept structural so composite-store
 *  doesn't depend on the BagResidencyManager class directly (avoids
 *  circular imports). The daemon binds it via attachResidency(). */
export interface ResidencyTouch {
  touch(bagUrl: string): Promise<void> | void;
}

export class CompositeStore implements LarTiddlerStore {
  // Ordered lowest-priority → highest-priority.
  private readonly layers:      CompositeLayer[] = [];
  private readonly listeners:   Set<(change: LarTiddlerChange) => void> = new Set();
  private readonly unsubs:      Map<LarTiddlerStore, () => void> = new Map();
  /** Active projections — fanned to every layer and to layers added in the future. */
  private readonly projections: Map<MemeProjection, Array<() => void>> = new Map();

  /** The single writable store — must be registered via addLayer with writable:true. */
  private writableStore: LarTiddlerStore | null = null;

  /** Residency-touch hook — set via attachResidency(). C.4: composite.get
   *  bumps lastTouched on the bag whose layer answered the read. Cold-
   *  promote-mid-get (i.e. hydrate a stub URL when something reads through
   *  it) is reserved for a later refinement; see HANDOFF "Don't re-decide". */
  private residency: ResidencyTouch | null = null;

  /** Bind a residency manager. Calling twice replaces the binding. */
  attachResidency(residency: ResidencyTouch): void {
    this.residency = residency;
  }

  hasBag(bagId: string): boolean {
    return this.layers.some((l) => l.bagId === bagId);
  }

  /** Index of a layer in the cascade (lowest-priority = 0), or -1. */
  layerIndexOf(bagId: string): number {
    return this.layers.findIndex((l) => l.bagId === bagId);
  }

  /** `at` splices the layer into the cascade at that priority index (live
   *  recipe reconcile); omitted = push to top (boot-time bottom-up order). */
  addLayer(layer: CompositeLayer, at?: number): void {
    if (this.hasBag(layer.bagId)) throw new Error(`CompositeStore: bag "${layer.bagId}" already registered`);
    if (at !== undefined && at >= 0 && at < this.layers.length) this.layers.splice(at, 0, layer);
    else this.layers.push(layer);
    // defaultWritable defaults to true. Set false for layers that accept
    // explicit-bag-routed writes but shouldn't override the default writable
    // store (the projection layer).
    if (layer.writable && layer.defaultWritable !== false) this.writableStore = layer.store;

    // Forward future change events from this layer to our subscribers.
    const unsub = layer.store.subscribe((change) => {
      this.listeners.forEach((fn) => fn(change));
    });
    this.unsubs.set(layer.store, unsub);

    // Fan any active projections to this new layer (dynamic registration law).
    for (const [projection, unsubs] of this.projections) {
      const layerUnsub = typeof layer.store.addProjection === "function"
        ? layer.store.addProjection(projection)
        : layer.store.subscribe((change) => projection.onUriChanged(change));
      unsubs.push(layerUnsub);
    }

    // Emit synthetic "put" events for tiddlers already in the arriving layer
    // so projections (IslandAdaptor) see existing content.
    if (this.listeners.size > 0) {
      layer.store.listVisible().then((titles) => {
        for (const title of titles) {
          layer.store.get(title).then((rec) => {
            if (!rec) return;
            const change: LarTiddlerChange = { title, record: rec, origin: { kind: "canon-hydrate", receipt: layer.bagId } };
            this.listeners.forEach((fn) => fn(change));
          });
        }
      });
    }
  }

  removeLayer(bagId: string): void {
    const idx = this.layers.findIndex((l) => l.bagId === bagId);
    if (idx === -1) return;
    const removed = this.layers.splice(idx, 1)[0];
    if (!removed) return;
    this.unsubs.get(removed.store)?.();
    this.unsubs.delete(removed.store);
    if (this.writableStore === removed.store) this.writableStore = null;
  }

  /**
   * Remove a layer from a LIVE composite and surface the consequences: for
   * every title the removed layer held visible, emit a synthetic change
   * carrying what now resolves beneath it — the unshadowed lower record, or
   * `record: null` (a tombstone) when nothing remains. Projections
   * (IslandAdaptor) and subscribers both hear it, so the wiki view sheds the
   * departed bag without a reboot. Plain removeLayer stays the teardown path.
   */
  async removeLayerLive(bagId: string): Promise<void> {
    const layer = this.layers.find((l) => l.bagId === bagId);
    if (!layer) return;
    const titles = await layer.store.listVisible();
    this.removeLayer(bagId);
    const origin: ChangeOrigin = { kind: "canon-hydrate", receipt: `layer-removed:${bagId}` };
    for (const title of titles) {
      const remaining = await this.get(title);
      const change: LarTiddlerChange = { title, record: remaining, origin, bag: bagId };
      this.listeners.forEach((fn) => fn(change));
      for (const projection of this.projections.keys()) projection.onUriChanged(change);
    }
  }

  // ---------------------------------------------------------------------------
  // LarTiddlerStore impl
  // ---------------------------------------------------------------------------

  async listVisible(): Promise<string[]> {
    // Iterate from highest to lowest priority, deduplicating by title.
    const seen = new Set<string>();
    const result: string[] = [];
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const titles = await this.layers[i]!.store.listVisible();
      for (const t of titles) {
        if (!seen.has(t)) { seen.add(t); result.push(t); }
      }
    }
    return result;
  }

  async get(title: string): Promise<LarTiddlerRecord | null> {
    // Highest priority first.
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i]!;
      const rec   = await layer.store.get(title);
      if (rec !== null) {
        // C.4 — bump residency lastTouched on the bag that answered. Fire-
        // and-forget; we don't block the read on the touch handler.
        if (this.residency) void Promise.resolve(this.residency.touch(layer.bagId));
        return rec;
      }
    }
    return null;
  }

  async put(record: LarTiddlerRecord, origin: ChangeOrigin, options?: { bag?: string }): Promise<void> {
    // Route to the explicitly named writable bag when provided.
    if (options?.bag) {
      const bagLayer = this.layers.find((l) => l.bagId === options.bag && l.writable);
      if (bagLayer) return bagLayer.store.put(record, origin, options);
    }
    if (!this.writableStore) throw new Error("CompositeStore: no writable layer registered");
    return this.writableStore.put(record, origin, options);
  }

  async tombstone(title: string, origin: ChangeOrigin): Promise<void> {
    if (!this.writableStore) throw new Error("CompositeStore: no writable layer registered");
    return this.writableStore.tombstone(title, origin);
  }

  /**
   * Tombstone a tiddler in a specific writable bag — used by ceremonies that
   * need to delete from a non-default writable layer (e.g. the MOVE residency
   * ACTION removes the source-bag copy after writing the destination copy).
   * Throws when the named bag is absent or not writable.
   */
  async tombstoneInBag(bagId: string, title: string, origin: ChangeOrigin): Promise<void> {
    const layer = this.layers.find((l) => l.bagId === bagId && l.writable);
    if (!layer) throw new Error(`CompositeStore: no writable layer for bag "${bagId}"`);
    return layer.store.tombstone(title, origin);
  }

  /** True when a writable layer for the given bag is registered. */
  hasWritableBag(bagId: string): boolean {
    return this.layers.some((l) => l.bagId === bagId && l.writable);
  }

  /** BagId of the layer that receives unbagged writes — i.e. the last-
   *  registered layer with `writable:true` AND `defaultWritable !== false`.
   *  Returns null when no default writable layer is registered. */
  defaultWritableBagId(): string | null {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const l = this.layers[i]!;
      if (l.writable && l.defaultWritable !== false) return l.bagId;
    }
    return null;
  }

  /** Read the highest-priority LIVE (non-tombstoned) record for a title.
   *  Standard composite.get() returns the first non-null result including
   *  tombstones — useful when a caller needs to know about deletions.
   *  getLive() is the variant ceremonies use when "is the tiddler actually
   *  there right now" matters (MOVE source-detection, draft-from).
   *
   *  Residency Model S4.3 — **kāpae semantics**: a tombstone in a
   *  higher-priority bag stops the cascade rather than falling through. A
   *  tombstone-in-HIGH means "intentionally hidden at this priority"; lower
   *  bags do not surface. Anti-pattern #3 defense (kāpae resurrection —
   *  OverlayFS / Docker layer pattern adapted to multi-bag CRDT). */
  async getLive(title: string): Promise<LarTiddlerRecord | null> {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i]!;
      const rec = await layer.store.get(title);
      if (rec === null) continue;          // truly absent — fall through
      if (rec.meta?.deleted) return null;  // tombstone — intentionally hidden, stop
      if (this.residency) void Promise.resolve(this.residency.touch(layer.bagId));
      return rec;
    }
    return null;
  }

  /** Bag ids of every layer currently holding a non-tombstoned record for the
   *  given title. Highest-priority bag appears first (recipe-presence order).
   *  Used by the `where` ceremony — recipe-presence preview before promotion. */
  async listBagsHolding(title: string): Promise<string[]> {
    const out: string[] = [];
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i]!;
      const rec = await layer.store.get(title);
      if (rec && !rec.meta?.deleted) out.push(layer.bagId);
    }
    return out;
  }

  /**
   * Residency Model S3.1 — return every (bagId, record) pair holding a
   * non-tombstoned manifestation of `title`, ordered highest-priority first.
   *
   * Surfaces multi-bag residency for operator inspection (lares wiki resolve)
   * and for downstream tooling that needs the full set of Manifestations.
   * Pairs with resolveTopmost() which returns only the winning pair.
   *
   * Meme: lar:///ha.ka.ba/@lares/v0.1/api/lararium/residency-model
   */
  async resolveAll(title: string): Promise<Array<{ bagId: string; record: LarTiddlerRecord }>> {
    const out: Array<{ bagId: string; record: LarTiddlerRecord }> = [];
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i]!;
      const rec = await layer.store.get(title);
      if (rec && !rec.meta?.deleted) out.push({ bagId: layer.bagId, record: rec });
    }
    return out;
  }

  /**
   * Residency Model S3.2 — return the winning (bagId, record) pair for `title`
   * per recipe priority, or null when no live residency exists.
   *
   * Equivalent to getLive() but carries the source bag for operator-visible
   * coordinate surface. The CSS DevTools Computed-panel analog at the data
   * layer; consumers surface origin-bag in the read path (IslandAdaptor +
   * getOriginBag).
   *
   * Residency Model S4.3 — **kāpae semantics**: tombstone in a
   * higher-priority bag stops the cascade and returns null. Anti-pattern #3
   * defense (kāpae resurrection). For multi-residency presence-reporting
   * that ignores the shadow, call `resolveAll(title)` instead.
   *
   * Meme: lar:///ha.ka.ba/@lares/v0.1/api/lararium/residency-model
   */
  async resolveTopmost(title: string): Promise<{ bagId: string; record: LarTiddlerRecord } | null> {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i]!;
      const rec = await layer.store.get(title);
      if (rec === null) continue;          // truly absent — fall through
      if (rec.meta?.deleted) return null;  // tombstone — intentionally hidden, stop
      if (this.residency) void Promise.resolve(this.residency.touch(layer.bagId));
      return { bagId: layer.bagId, record: rec };
    }
    return null;
  }

  /**
   * Residency Model S4.3 — list bag IDs that explicitly tombstone `title`,
   * ordered highest-priority first. Sibling of resolveAll (presence report);
   * surfaces the kāpae hides for operator-visible coordinate
   * inspection. A title may BOTH appear in resolveAll (live in lower bags)
   * AND in listKapaeBags (hidden by upper-bag kāpae) when an
   * operator deaccessions in a high-priority bag while lower bags retain
   * their copies — that combination signals "topmost reader sees nothing
   * but the union catalog still holds the title."
   */
  async listKapaeBags(title: string): Promise<string[]> {
    const out: string[] = [];
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i]!;
      const rec = await layer.store.get(title);
      if (rec && rec.meta?.deleted) out.push(layer.bagId);
    }
    return out;
  }

  /**
   * Residency Model — audit per-bag pin state against the recipe's `bagEpochs`.
   *
   * Returns a Map keyed by bagId carrying one EpochPinState per pinned bag.
   * Default policy: **audit-only**. Operators read the audit; downstream
   * consumers MAY refuse, time-travel via `view(pinnedHeads)`, or warn. Loud
   * silent refusal at the read path stays out of scope per the deferred-
   * enactment design (modal-view reader belongs to a follow-up sprint with
   * explicit "detached" operator UX, modelled on Loro's checkout cycle).
   *
   * Heads comparison uses `headsEqual` (set-semantics) — Automerge Heads form
   * a mathematical set; order across save/load or implementations stays
   * non-contractual. See wiki-recipe.headsEqual for sources.
   *
   * Bags whose store omits `getHeads()` (e.g. MemoryTiddlerStore) report
   * `{ state: "opaque" }` rather than `matched` or `drifted` — the audit
   * surfaces uninspectable layers honestly instead of asserting matches it
   * cannot verify.
   *
   * Anti-pattern #5 defense (recipe-drift poisoning).
   * Meme: lar:///ha.ka.ba/@lares/v0.1/api/lararium/residency-model
   */
  async auditEpochs(recipe: WikiRecipe): Promise<Map<string, EpochPinState>> {
    const out = new Map<string, EpochPinState>();
    const pins = recipe.bagEpochs;
    if (!pins || pins.size === 0) return out;
    for (const [bagId, pinned] of pins) {
      const layer = this.layers.find((l) => l.bagId === bagId);
      if (!layer) { out.set(bagId, { state: "absent" }); continue; }
      const getHeads = layer.store.getHeads;
      if (typeof getHeads !== "function") {
        out.set(bagId, { state: "opaque" });
        continue;
      }
      const current = await getHeads.call(layer.store);
      if (current === null) {
        out.set(bagId, { state: "opaque" });
        continue;
      }
      out.set(bagId, headsEqual(pinned, current)
        ? { state: "matched", heads: current }
        : { state: "drifted", pinned, current });
    }
    return out;
  }

  subscribe(fn: (change: LarTiddlerChange) => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  /**
   * Register a MemeProjection across all layers.
   *
   * Fans the projection to each layer's `addProjection?` (AutomergeDocStore
   * routes through MemeProvider — debounce, changeset, onSyncComplete).
   * Layers without `addProjection` fall back to their plain `subscribe()`.
   *
   * Returns a combined unsubscribe function.
   *
   * Causal-islands law: each island (doc) delivers changes through its own
   * MemeProvider so debounce and onSyncComplete remain per-island — a slow
   * corpus island cannot gate a fast wiki island.
   */
  addProjection(p: MemeProjection): () => void {
    const unsubs: Array<() => void> = this.layers.map((layer) =>
      typeof layer.store.addProjection === "function"
        ? layer.store.addProjection(p)
        : layer.store.subscribe((change) => p.onUriChanged(change)),
    );
    // Store so future addLayer() calls fan this projection to new layers.
    this.projections.set(p, unsubs);
    return () => {
      for (const u of unsubs) u();
      this.projections.delete(p);
    };
  }

  get layerCount(): number { return this.layers.length; }
  get layerIds(): string[] { return this.layers.map((l) => l.bagId); }

  // ---------------------------------------------------------------------------
  // Recipe helpers — topology-derived VM support
  // ---------------------------------------------------------------------------

  /**
   * Read a RecipeTiddler from the composite store by its lar: URI.
   *
   * Returns null if the tiddler does not exist, was tombstoned, or has no
   * parseable bagStack field.  Reads from the highest-priority layer that
   * holds the tiddler (standard CompositeStore read semantics).
   *
   * Recipe tiddlers arrive via IslandAdaptor from the ha island.  Call this
   * method after the peer boot sequence completes so ha is already in the store.
   *
   * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/recipe
   */
  async getRecipe(uri: string): Promise<RecipeTiddler | null> {
    const rec = await this.get(uri);
    if (!rec || rec.meta?.deleted) return null;
    const fields = rec.tiddler as Record<string, unknown>;
    const bagStack = parseBagStack(fields["bagStack"]);
    if (bagStack.length === 0) return null;
    const writableBag = fields["writableBag"] as string | undefined;
    const plugins = parsePlugins(fields["plugins"]);
    const bags = await this.listBagsHolding(uri);
    return {
      title:     rec.tiddler.title,
      label:     (fields["label"] as string) ?? rec.tiddler.title,
      bagStack,
      ...(writableBag !== undefined ? { writableBag } : {}),
      ...(plugins.length > 0 ? { plugins } : {}),
      updatedAt: (fields["updatedAt"] as string) ?? new Date().toISOString(),
      authority: (rec.meta?.authority as string | undefined) ?? "unknown",
      bag:       bags[0] ?? "",
    };
  }

  /**
   * Return the subset of registered layers whose bagId appears in the recipe's
   * bagStack, ordered lowest → highest priority (bagStack order).
   *
   * Layers not yet registered (corpus docs arriving async) are silently omitted.
   * Callers may call this again after corpus bags attach to get the full set.
   *
   * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/recipe
   */
  buildLayersFromRecipe(recipe: RecipeTiddler): CompositeLayer[] {
    const result: CompositeLayer[] = [];
    for (const bagId of recipe.bagStack) {
      const layer = this.layers.find((l) => l.bagId === bagId);
      if (layer) result.push(layer);
    }
    return result;
  }

  /**
   * Route a put() through the recipe's declared `writableBag`.
   *
   * TW5 Bags and Recipes law: writes in a recipe target the designated writable
   * bag, not an arbitrary registered layer.  This method enforces that law.
   *
   * Falls back to `this.put(record, origin)` (default writable store) when the
   * recipe declares no `writableBag` — safe for read-only recipes like "default".
   *
   * Throws if `writableBag` is declared but the layer is not registered or is not
   * marked writable — indicating a boot-sequence ordering error.
   *
   * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/recipe
   */
  async putViaRecipe(recipe: RecipeTiddler, record: LarTiddlerRecord, origin: ChangeOrigin): Promise<void> {
    if (!recipe.writableBag) {
      return this.put(record, origin);
    }
    const layer = this.layers.find((l) => l.bagId === recipe.writableBag && l.writable);
    if (!layer) {
      throw new Error(
        `CompositeStore: recipe writableBag "${recipe.writableBag}" not registered or not writable`,
      );
    }
    return layer.store.put(record, origin, { bag: recipe.writableBag });
  }
}

/**
 * Returns a LarTiddlerStore view over `composite` that fans reads across all
 * layers (standard composite priority) but pins writes to `bagId`.
 *
 * Use this when a ceremony (MOVE, wiki-sync) needs to issue `put`/`tombstone`
 * to one specific bag while still resolving cross-bag reads through the full
 * composite (e.g. cross-bag tombstone resolution, getLive checks).
 */
export function bagScopedStore(composite: CompositeStore, bagId: string): LarTiddlerStore {
  return {
    listVisible:   () => composite.listVisible(),
    get:           (title) => composite.getLive(title),
    put:           (record, origin, options) => composite.put(record, origin, { bag: options?.bag ?? bagId }),
    tombstone:     (title, origin) => composite.tombstoneInBag(bagId, title, origin),
    subscribe:     (fn) => composite.subscribe(fn),
    addProjection: (p) => composite.addProjection(p),
  };
}
