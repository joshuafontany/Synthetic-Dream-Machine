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
}

export interface EventStore {
  /** Persist a single event. */
  put(rec: EventRecord): Promise<void>;
  /** Read every stored event. Order doesn't matter — Keyhive resolves causality. */
  list(): Promise<readonly EventRecord[]>;
  /** Optional bulk operation; the tiddler-backed store batches writes. */
  putMany?(records: readonly EventRecord[]): Promise<void>;
}

/** In-memory event store for tests + the smoke test. Not durable. */
export class InMemoryEventStore implements EventStore {
  private readonly records = new Map<string, EventRecord>();
  private counter = 0;

  async put(rec: EventRecord): Promise<void> {
    this.records.set(rec.hash, rec);
  }

  async list(): Promise<readonly EventRecord[]> {
    return [...this.records.values()];
  }

  /** Generate a synthetic hash when the caller doesn't supply one (smoke test). */
  nextHash(): string {
    return `mem-${++this.counter}`;
  }
}
