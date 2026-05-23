/**
 * lar-event-bus — Verse-shaped event subscription interface for the Lararium tick loop.
 *
 * Adopts the SHAPE of Verse structured concurrency (subscribable<T> / listenable<T>,
 * race / branch scope-bound tasks) without coupling to UEFN's fixed global tick rate.
 *
 * Concurrency constraints that differ from Verse:
 *   - CRDT merges are always-commit — no STM rollback across Automerge boundaries.
 *   - Automerge operates on wall-clock async I/O time (irregular); the simulation
 *     tick runs on a configurable fixed rate. These are TWO time bases with explicit
 *     bridging, not one unified clock.
 *   - `branch` tasks scope to session lifetime, not UEFN actor lifetime.
 *
 * Runtime implementation lives in @lararium/node (LarEventBusImpl).
 * This file carries only the interface contracts and supporting types.
 *
 * Prior art: Verse subscribable<T>/listenable<T> (Epic UEFN), Nakama MatchLoop,
 * Flecs RateFilter, Akka timer+mailbox, structured concurrency (Kotlinx/Swift).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/lar-event-bus
 */

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

/**
 * A handle that cancels a subscription or scoped task when called.
 * Analogous to Verse's cancelation token returned by `subscribe`.
 */
export interface Cancelable {
  cancel(): void;
}

/**
 * A named event stream — an async iterable that emits typed events.
 * Used with `race` to select the first-arriving event across multiple sources.
 */
export interface LarEventStream<T> {
  readonly eventType: string;
  readonly iter:      AsyncIterable<T>;
}

/**
 * Ingress ring descriptor — one bounded buffer per event source.
 * The tick loop drains all registered rings each tick in priority order.
 *
 * Priority: lower number = drained first.
 * Depth: maximum queued events before backpressure signals overload.
 */
export interface IngressRingDescriptor {
  readonly name:     string;
  readonly priority: number;
  readonly depth:    number;
}

// ---------------------------------------------------------------------------
// LarEventBus interface
// ---------------------------------------------------------------------------

/**
 * LarEventBus — the Verse-shaped pub/sub + structured-concurrency interface
 * for the Lararium node's event loop.
 *
 * Event types use dotted namespaces, e.g.:
 *   "crdt.merge"          — Automerge patch arrived from a peer
 *   "session.grounded"    — operator grounded an exchange turn (L1 tick fires here)
 *   "session.blocked"     — agent waiting for operator input
 *   "world.clock.tick"    — world clock advanced by a tick
 *   "tool.connected"      — external tool bridge connected
 *   "tick.loop"           — each iteration of the base simulation tick
 */
export interface LarEventBus {
  /**
   * Subscribe to all future events of `eventType`.
   * Returns a Cancelable; call `.cancel()` to unsubscribe.
   * Analogous to Verse `subscribable<T>.Subscribe(handler)`.
   */
  subscribe<T>(eventType: string, handler: (event: T) => void): Cancelable;

  /**
   * Await the next single event of `eventType` and resolve.
   * Cancels automatically after one delivery.
   * Analogous to Verse `listenable<T>.Await()`.
   */
  listenOnce<T>(eventType: string): Promise<T>;

  /**
   * Race N event streams: resolves with the first event to arrive,
   * then cancels all other streams.
   * Analogous to Verse `race(A, B, ...)`.
   *
   * CRDT constraint: if a "crdt.merge" stream participates in a race,
   * losing streams are cancelled (no further delivery), but any CRDT
   * ops already applied by the time cancel fires are NOT rolled back.
   */
  race<T>(...streams: LarEventStream<T>[]): Promise<T>;

  /**
   * Spawn a child task scoped to the current session lifetime.
   * The task is automatically cancelled when the session ends.
   * Analogous to Verse `branch { ... }`.
   *
   * Tasks may NOT outlive their parent scope — this prevents
   * Automerge change-listener accumulation on abandoned handles.
   */
  branch(task: () => Promise<void>): Cancelable;

  /**
   * Yield execution to the next simulation tick.
   * Equivalent to Verse `Sleep(0.0)` — no wall-clock delay,
   * just a cooperative yield point within the tick loop.
   */
  nextTick(): Promise<void>;

  /**
   * Emit an event to all subscribers of `eventType`.
   * Adapters call this to feed events from ingress rings into the bus.
   */
  emit<T>(eventType: string, event: T): void;

  /**
   * Register an ingress ring descriptor.
   * The tick loop drains registered rings in priority order each tick.
   */
  registerRing(descriptor: IngressRingDescriptor): void;
}

// ---------------------------------------------------------------------------
// Well-known event type constants
// ---------------------------------------------------------------------------

/** Standard event type strings — prefer these over raw strings at call sites. */
export const LAR_EVENT = {
  CRDT_MERGE:        "crdt.merge",
  SESSION_GROUNDED:  "session.grounded",   // L1 tick fires on this event
  SESSION_BLOCKED:   "session.blocked",
  WORLD_CLOCK_TICK:  "world.clock.tick",
  TOOL_CONNECTED:    "tool.connected",
  TOOL_DISCONNECTED: "tool.disconnected",
  TICK_LOOP:         "tick.loop",
} as const;

export type LarEventType = typeof LAR_EVENT[keyof typeof LAR_EVENT];
