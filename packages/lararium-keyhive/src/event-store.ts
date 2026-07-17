/**
 * EventStore — persistence shape for Keyhive events.
 *
 * Every Keyhive op (PREKEY_ROTATED, CGKA_OPERATION, DELEGATED, REVOKED, etc.)
 * gets handed to our `event_handler` callback at the moment it fires. The
 * handler routes those events to the EventStore for durable persistence.
 *
 * An InMemoryEventStore serves the smoke test and unit work. A
 * tiddler-backed DaemonEventStore persists events under
 * lar:///ha.ka.ba/bags/@daemon/cap/<hash> in the daemon doc.
 *
 * On daemon boot, the EventStore lists all stored events and replays them
 * via Keyhive.ingestEventsBytes() to restore in-memory state. Events are
 * causality-tracked internally by Keyhive; we don't need to sort.
 */

export interface EventRecord {
  /** Identifier — the durable store uses a content hash; the in-memory store uses a counter. */
  readonly hash:    string;
  /** Event variant (PREKEY_ROTATED / CGKA_OPERATION / DELEGATED / REVOKED). */
  readonly variant: string;
  /** Serialized event from `event.toBytes()`. */
  readonly bytes:   Uint8Array;
  /** CIV-3 — the causal-island this event scopes to (a keyhive DocumentId hex; the island IS the
   *  ratchet boundary, so a per-island cut stays decryptability-safe). Absent = cross-cutting
   *  (PREKEY_ROTATED is per-principal, not per-document) — such events co-load with EVERY island's
   *  slice. Populating this for CGKA/prekey needs the operating docId threaded through the
   *  fire-and-forget handler; the attribution rides a later cut. */
  readonly island?: string;
}

export interface EventStore {
  /** Persist a single event. */
  put(rec: EventRecord): Promise<void>;
  /** Read stored events. Order doesn't matter — Keyhive resolves causality. Pass `islandId` to
   *  fetch just ONE island's slice (its own events PLUS the cross-cutting unattributed ones, which
   *  every island must co-load) — the seam boot-flatness (CIV-2) draws on to hydrate self-only and
   *  materialize a peer's island lazily on connect. Absent → every stored event, as before. */
  list(islandId?: string): Promise<readonly EventRecord[]>;
  /** Optional bulk operation; the tiddler-backed store batches writes. */
  putMany?(records: readonly EventRecord[]): Promise<void>;
}

/** True when a stored event belongs to the requested island slice: its own island, or a
 *  cross-cutting (unattributed) event that every island co-loads. `islandId` absent → all. */
export function inIslandSlice(rec: EventRecord, islandId?: string): boolean {
  return islandId === undefined || rec.island === undefined || rec.island === islandId;
}

/** In-memory event store for tests + the smoke test. Not durable. */
export class InMemoryEventStore implements EventStore {
  private readonly records = new Map<string, EventRecord>();
  private counter = 0;

  async put(rec: EventRecord): Promise<void> {
    this.records.set(rec.hash, rec);
  }

  async list(islandId?: string): Promise<readonly EventRecord[]> {
    return [...this.records.values()].filter((r) => inIslandSlice(r, islandId));
  }

  /** Generate a synthetic hash when the caller doesn't supply one (smoke test). */
  nextHash(): string {
    return `mem-${++this.counter}`;
  }
}
