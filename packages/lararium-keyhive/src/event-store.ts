/**
 * EventStore — persistence shape for Keyhive events.
 *
 * Every Keyhive op (PREKEY_ROTATED, CGKA_OPERATION, DELEGATED, REVOKED, etc.)
 * gets handed to our `event_handler` callback at the moment it fires. The
 * handler routes those events to the EventStore for durable persistence.
 *
 * Phase D.2 ships an InMemoryEventStore — sufficient for the smoke test
 * and unit work. D.4 introduces a tiddler-backed DaemonEventStore that
 * persists events under lar:///ha.ka.ba/@daemon/cap/<hash> in
 * the admin doc.
 *
 * On daemon boot, the EventStore lists all stored events and replays them
 * via Keyhive.ingestEventsBytes() to restore in-memory state. Events are
 * causality-tracked internally by Keyhive; we don't need to sort.
 */

export interface EventRecord {
  /** Identifier — for D.4 we'll use a content hash; D.2 uses a counter. */
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
  /** Optional bulk operation; D.4's tiddler-backed store batches writes. */
  putMany?(records: readonly EventRecord[]): Promise<void>;
}

/** In-memory event store for tests + the D.2 smoke. Not durable. */
export class InMemoryEventStore implements EventStore {
  private readonly records = new Map<string, EventRecord>();
  private counter = 0;

  async put(rec: EventRecord): Promise<void> {
    this.records.set(rec.hash, rec);
  }

  async list(): Promise<readonly EventRecord[]> {
    return [...this.records.values()];
  }

  /** Generate a synthetic hash when the caller doesn't supply one (D.2 smoke). */
  nextHash(): string {
    return `mem-${++this.counter}`;
  }
}
