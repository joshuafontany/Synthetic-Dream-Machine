/**
 * reaction-graph.ts — ReactionBinding, ReactionGraph, ReactionHandler, extractReactionBindings.
 *
 * Within-island reaction dispatch substrate. Scope: one TW5 wiki instance.
 * Cross-island routing: IslandMsg_Event (island-protocol.ts).
 * Cross-vessel routing: CRDT convergence — write outcome tiddler, observe convergence.
 *
 * Design vocabulary:
 *   papalohe pranala edge — instance-level OUTPUT→INPUT wiring
 *   listenable            — OUTPUT event pin (Verse listenable / event type)
 *   subscribable          — INPUT fn pin (Verse public method)
 *
 * Production dispatch: reaction-router.ts (nalu-driven TW5 startup module).
 * fireSync is for unit tests only; production calls wiki.dispatchEvent("tm-verse-event").
 *
 * Isomorphic: no Node/browser APIs. Works in vessel, island, and browser.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/reaction-graph
 */

// ---------------------------------------------------------------------------
// ReactionBinding — one papalohe instance-level wire
// ---------------------------------------------------------------------------

/**
 * Instance-level wiring: when `fromUri` emits `listenable`, call `toUri.subscribable`.
 *
 * Derived from papalohe pranala edges (UEFN editor pin-wire).
 *   source = "wired"      — edge originated from the wiki AST (editor-wired)
 *   source = "subscribed" — edge added at runtime via Subscribe() call in code
 */
export interface ReactionBinding {
  readonly fromUri:     string;  // source device instance URI
  readonly toUri:       string;  // target device instance URI
  readonly listenable:  string;  // OUTPUT event pin name on fromUri device
  readonly subscribable: string; // INPUT fn pin name on toUri device
  readonly source:      "wired" | "subscribed";
}

// ---------------------------------------------------------------------------
// ReactionHandler
// ---------------------------------------------------------------------------

/** Handler called when a bound reaction fires. Payload carries the event context. */
export type ReactionHandler = (payload: unknown) => void;

// ---------------------------------------------------------------------------
// EdgeLike — minimal shape accepted by extractReactionBindings
// ---------------------------------------------------------------------------

/**
 * Minimal edge shape required by `extractReactionBindings`.
 * Matches the `PranalaEdge` interface from `@lararium/mesh/ast`.
 */
export interface EdgeLike {
  readonly fromUri: string;
  readonly toUri:   string;
  readonly family:  string;
  readonly role:    string | null;
  readonly payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// ReactionGraph — live wiring map + handler registry
// ---------------------------------------------------------------------------

type FireSyncObserver = (fromUri: string, listenable: string, payload: unknown) => void;

/**
 * Holds the active set of `ReactionBinding` records and routes `fireSync` calls
 * to subscribed handlers.
 *
 * Two subscription surfaces:
 *   subscribe(fromUri, listenable, handler) — direct source-pin subscription
 *   subscribeByFn(fnName, handler)          — target-fn subscription (catches all matching bindings)
 *
 * Additional monitoring hook:
 *   onFireSync(observer) — observe EVERY fireSync call (used by island forwarding).
 *                          Fires before handler dispatch.
 *
 * `fireSync` dispatch order:
 *   1. onFireSync observers (monitoring)
 *   2. Direct handlers for (fromUri, listenable)
 *   3. Per-fn handlers for each binding where fromUri+listenable matches (via subscribable name)
 */
export class ReactionGraph {
  // Bindings stored per source URI for O(|bindings per uri|) lookup.
  private readonly _byFrom = new Map<string, ReactionBinding[]>();

  // Direct subscriptions: key = "${fromUri}\0${listenable}"
  private readonly _direct = new Map<string, Set<ReactionHandler>>();

  // Fn-name subscriptions: key = subscribable fn name (or "*" wildcard)
  private readonly _byFn = new Map<string, Set<ReactionHandler>>();

  // Monitoring observers (fired before handlers on every fireSync)
  private readonly _fireSyncObs = new Set<FireSyncObserver>();

  // ---------------------------------------------------------------------------
  // Bindings API
  // ---------------------------------------------------------------------------

  /** All current bindings as a flat readonly array. */
  get bindings(): readonly ReactionBinding[] {
    const result: ReactionBinding[] = [];
    for (const list of this._byFrom.values()) result.push(...list);
    return result;
  }

  /** Replace the entire binding set. */
  load(bindings: ReactionBinding[]): void {
    this._byFrom.clear();
    for (const b of bindings) this._addBinding(b);
  }

  /** Replace all bindings that reference `uri` (as fromUri OR toUri). */
  updateUri(uri: string, bindings: ReactionBinding[]): void {
    this.removeUri(uri);
    for (const b of bindings) this._addBinding(b);
  }

  /** Remove all bindings that reference `uri` (as fromUri OR toUri). */
  removeUri(uri: string): void {
    // Remove direct entries where fromUri === uri
    this._byFrom.delete(uri);

    // Remove dangling toUri refs from other from-groups
    for (const [fromUri, list] of this._byFrom) {
      const filtered = list.filter((b) => b.toUri !== uri);
      if (filtered.length === 0) this._byFrom.delete(fromUri);
      else if (filtered.length !== list.length) this._byFrom.set(fromUri, filtered);
    }
  }

  private _addBinding(b: ReactionBinding): void {
    let list = this._byFrom.get(b.fromUri);
    if (!list) { list = []; this._byFrom.set(b.fromUri, list); }
    list.push(b);
  }

  // ---------------------------------------------------------------------------
  // Subscription API
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to events emitted by `fromUri` with name `listenable`.
   * Returns a cancellation function.
   * Analogous to Verse `sourceDevice.OutputEvent.Subscribe(handler)`.
   *
   * Verse constraint: valid only for sources with `verseKind: "listenable"`.
   * User-declared `event(T)` fields (verseKind: "event") lack `subscribable` —
   * they support only `Await()`. Use `subscribeOnce()` for those sources instead.
   */
  subscribe(fromUri: string, listenable: string, handler: ReactionHandler): () => void {
    const key = `${fromUri}\0${listenable}`;
    let set = this._direct.get(key);
    if (!set) { set = new Set(); this._direct.set(key, set); }
    set.add(handler);
    return () => { set!.delete(handler); };
  }

  /**
   * Subscribe by target fn name. Fires whenever a binding routes to `fnName`.
   * Pass `"*"` as a wildcard to receive all fn-routed dispatches.
   * Returns a cancellation function.
   * Analogous to Verse `@subscribes Enable()` — wired from any matching binding.
   */
  subscribeByFn(fnName: string, handler: ReactionHandler): () => void {
    let set = this._byFn.get(fnName);
    if (!set) { set = new Set(); this._byFn.set(fnName, set); }
    set.add(handler);
    return () => { set!.delete(handler); };
  }

  /**
   * Single-shot: resolves with the next `payload` from `(fromUri, listenable)`.
   * Analogous to Verse `Await(event)<suspends>` — valid for both `listenable` and `event` sources.
   * Analogous to Verse `Await(event)<suspends>` (kukali primitive).
   */
  subscribeOnce(fromUri: string, listenable: string): Promise<unknown> {
    return new Promise<unknown>((resolve) => {
      const unsub = this.subscribe(fromUri, listenable, (payload) => {
        unsub();
        resolve(payload);
      });
    });
  }

  /**
   * Register an observer that receives EVERY `fireSync` call before handler dispatch.
   * Intended for cross-boundary forwarding (e.g. island → vessel bridge).
   * Returns a cancellation function.
   */
  onFireSync(observer: FireSyncObserver): () => void {
    this._fireSyncObs.add(observer);
    return () => { this._fireSyncObs.delete(observer); };
  }

  // ---------------------------------------------------------------------------
  // Dispatch
  // ---------------------------------------------------------------------------

  /**
   * Synchronously dispatch an event — UEFN game-loop tick fidelity.
   *
   * Dispatch order:
   *   1. onFireSync observers (monitoring — full context available)
   *   2. Direct handlers for (fromUri, listenable)
   *   3. Per-fn handlers for every binding where fromUri+listenable matches
   *      (including wildcard "*" subscribers — fired once per fireSync call)
   */
  fireSync(fromUri: string, listenable: string, payload: unknown = {}): void {
    // 1. Monitoring observers
    for (const obs of this._fireSyncObs) {
      try { obs(fromUri, listenable, payload); } catch { /* isolate observer errors */ }
    }

    // 2. Direct (fromUri, listenable) handlers
    const directKey = `${fromUri}\0${listenable}`;
    const directSet = this._direct.get(directKey);
    if (directSet) {
      for (const h of directSet) try { h(payload); } catch { /* isolate */ }
    }

    // 3. Binding-routed dispatch → per-fn handlers
    const fromList = this._byFrom.get(fromUri);
    if (!fromList) return;

    const wildcard = this._byFn.get("*");
    let wildcardFired = false;

    for (const b of fromList) {
      if (b.listenable !== listenable) continue;

      const fnSet = this._byFn.get(b.subscribable);
      if (fnSet) {
        for (const h of fnSet) try { h(payload); } catch { /* isolate */ }
      }

      // Wildcard fires once per fireSync call (not once per matching binding)
      if (wildcard && !wildcardFired) {
        wildcardFired = true;
        for (const h of wildcard) try { h(payload); } catch { /* isolate */ }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// extractReactionBindings — derive bindings from a flat edge list
// ---------------------------------------------------------------------------

/**
 * Extract `ReactionBinding` records from a flat edge list.
 *
 * Identifies papalohe instance-level wiring edges by requiring:
 *   - `payload.listenable`  — non-empty string (source OUTPUT event name)
 *   - `payload.subscribable` — non-empty string (target INPUT fn name)
 *   - `fromUri` and `toUri` both present (wiring requires both endpoints)
 *
 * All extracted bindings carry `source: "wired"` (wiki-AST origin).
 *
 * Ignores type-level `reaction:listenable` / `reaction:subscribable` declarations —
 * those carry only one of the two payload fields and declare the pin type, not a wire.
 */
export function extractReactionBindings(edges: readonly EdgeLike[]): ReactionBinding[] {
  const result: ReactionBinding[] = [];
  for (const e of edges) {
    if (!e.fromUri || !e.toUri) continue;
    const listenable  = e.payload["listenable"];
    const subscribable = e.payload["subscribable"];
    if (
      typeof listenable  === "string" && listenable.length  > 0 &&
      typeof subscribable === "string" && subscribable.length > 0
    ) {
      result.push({
        fromUri:     e.fromUri,
        toUri:       e.toUri,
        listenable,
        subscribable,
        source:      "wired",
      });
    }
  }
  return result;
}
