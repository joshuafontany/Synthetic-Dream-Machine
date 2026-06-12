/**
 * lar-event-bus-impl — the ONE concrete LarEventBus, platform-blind.
 *
 * Lived in lararium-node until 2026-06-12 with zero node imports — a pure
 * mislocation; the isomorphism sweep moved it here so every vessel inherits
 * the bus (equal vessels: capability differs by grant, never by hull).
 *
 * Architecture (from LARARIUM-TICK-CLOCK.md):
 *   Layer 1: ingress rings, one per source (crdt, vm, session, tool)
 *   Layer 2: unified configurable-rate tick loop — drain → apply → dispatch
 *   Layer 3: observers registered via subscribe() / listenOnce()
 *
 * Two time bases kept separate:
 *   Automerge sync  — wall-clock async I/O; arrives via crdt-ring adapter
 *   Simulation tick — fixed-rate setInterval; drives the tick loop
 *
 * CRDT constraint: merges are always-commit. race() cancels further delivery
 * of losing streams but does NOT roll back any Automerge ops already applied.
 *
 * Runtime lifecycle:
 *   1. Construct with tickRateHz (default 20)
 *   2. Call start() — begins the tick interval
 *   3. Adapters call emit() to feed ingress events
 *   4. stop() clears the interval and cancels all branch tasks
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/lar-event-bus-impl
 */

import type {
  Cancelable,
  LarEventStream,
  IngressRingDescriptor,
  LarEventBus,
} from "./lar-event-bus.js";

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type Handler<T = unknown> = (event: T) => void;

interface Subscription {
  eventType: string;
  handler:   Handler;
}

interface IngressRing {
  descriptor: IngressRingDescriptor;
  queue:      Array<{ eventType: string; event: unknown }>;
}

// ---------------------------------------------------------------------------
// LarEventBusImpl
// ---------------------------------------------------------------------------

export class LarEventBusImpl implements LarEventBus {
  private readonly subscriptions = new Map<string, Set<Handler>>();
  private readonly rings         = new Map<string, IngressRing>();
  private readonly branchTasks   = new Set<Cancelable>();
  private tickHandle:            ReturnType<typeof setInterval> | null = null;
  private tickResolvers:         Array<() => void> = [];

  constructor(
    private readonly tickRateHz: number = 20,
  ) {}

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  start(): void {
    if (this.tickHandle !== null) return;
    const intervalMs = Math.floor(1000 / this.tickRateHz);
    this.tickHandle = setInterval(() => this._runTick(), intervalMs);
  }

  stop(): void {
    if (this.tickHandle !== null) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
    for (const task of this.branchTasks) task.cancel();
    this.branchTasks.clear();
  }

  // -------------------------------------------------------------------------
  // LarEventBus interface
  // -------------------------------------------------------------------------

  subscribe<T>(eventType: string, handler: (event: T) => void): Cancelable {
    let handlers = this.subscriptions.get(eventType);
    if (!handlers) {
      handlers = new Set();
      this.subscriptions.set(eventType, handlers);
    }
    const h = handler as Handler;
    handlers.add(h);
    return {
      cancel: () => {
        this.subscriptions.get(eventType)?.delete(h);
      },
    };
  }

  listenOnce<T>(eventType: string): Promise<T> {
    return new Promise<T>((resolve) => {
      let sub: Cancelable;
      sub = this.subscribe<T>(eventType, (event) => {
        sub.cancel();
        resolve(event);
      });
    });
  }

  async race<T>(...streams: LarEventStream<T>[]): Promise<T> {
    return new Promise<T>((resolve) => {
      let settled = false;
      const subs: Cancelable[] = [];

      for (const stream of streams) {
        const sub = this.subscribe<T>(stream.eventType, (event) => {
          if (settled) return;
          settled = true;
          for (const s of subs) s.cancel();
          resolve(event);
        });
        subs.push(sub);
      }
    });
  }

  branch(task: () => Promise<void>): Cancelable {
    let cancelled = false;
    const cancelable: Cancelable = {
      cancel: () => {
        cancelled = true;
        this.branchTasks.delete(cancelable);
      },
    };
    this.branchTasks.add(cancelable);

    task().then(() => {
      this.branchTasks.delete(cancelable);
    }).catch((err) => {
      if (!cancelled) console.error("[LarEventBus] branch task error:", err);
      this.branchTasks.delete(cancelable);
    });

    return cancelable;
  }

  nextTick(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.tickResolvers.push(resolve);
    });
  }

  emit<T>(eventType: string, event: T): void {
    const handlers = this.subscriptions.get(eventType);
    if (!handlers) return;
    for (const handler of handlers) {
      try { handler(event); }
      catch (err) { console.error(`[LarEventBus] handler error (${eventType}):`, err); }
    }
  }

  registerRing(descriptor: IngressRingDescriptor): void {
    if (!this.rings.has(descriptor.name)) {
      this.rings.set(descriptor.name, { descriptor, queue: [] });
    }
  }

  /**
   * Enqueue an event onto a named ingress ring.
   * Called by adapters (CrdtIngressAdapter, SessionAdapter, etc.).
   * If the ring is at capacity, the oldest event is shed (backpressure).
   */
  enqueueToRing(ringName: string, eventType: string, event: unknown): void {
    const ring = this.rings.get(ringName);
    if (!ring) return;
    if (ring.queue.length >= ring.descriptor.depth) {
      ring.queue.shift(); // shed oldest under backpressure
    }
    ring.queue.push({ eventType, event });
  }

  // -------------------------------------------------------------------------
  // Internal tick loop
  // -------------------------------------------------------------------------

  private _runTick(): void {
    // Drain all rings in priority order (lower number = drained first)
    const sorted = Array.from(this.rings.values())
      .sort((a, b) => a.descriptor.priority - b.descriptor.priority);

    for (const ring of sorted) {
      const events = ring.queue.splice(0); // drain atomically
      for (const { eventType, event } of events) {
        this.emit(eventType, event);
      }
    }

    // Resolve nextTick() awaiters
    const resolvers = this.tickResolvers.splice(0);
    for (const resolve of resolvers) resolve();

    // Emit the tick loop event itself (rate-filter subscribers hang off this)
    this.emit("tick.loop", { ts: Date.now() });
  }
}

// ---------------------------------------------------------------------------
// Default ingress ring descriptors
// ---------------------------------------------------------------------------

/** Standard ring descriptors. Import and pass to registerRing() on bus init. */
export const DEFAULT_RINGS: IngressRingDescriptor[] = [
  { name: "session-ring", priority: 1, depth: 256  },
  { name: "crdt-ring",    priority: 2, depth: 512  },
  { name: "vm-ring",      priority: 3, depth: 256  },
  { name: "tool-ring",    priority: 4, depth: 128  },
];
