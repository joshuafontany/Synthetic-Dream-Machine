/**
 * handle-book — a vessel's LOCAL recogniser memory: the petname book that turns announced cards into
 * recognition-over-time.
 *
 * The reader rule (`acceptHandleUpdate`) decides ONE encounter, but it needs what the recogniser remembers —
 * the high-water version and the last card id per Handle. A book HOLDS that memory. It ingests each announced
 * card through the rule, advances its state only on accept, and refuses a rollback or a fork exactly as the
 * rule dictates. This is the same shape a reader of `oracle-substrate` keeps between pointers, here per-nym.
 *
 * TRUST ON FIRST USE, MONOTONE THEREAFTER. A book learns a new Handle from the first self-certifying card it
 * sees (TOFU — it adopts whatever key that card names), then holds that Handle to its own lineage: a later
 * card for the SAME nym must bump the version and link the held card, or it is refused. The petname — the
 * human's local name for the key — rides here and NOWHERE on the wire (persona-circle#the-vault): the book is
 * the recogniser's private side of the self-certifying-name / local-petname split.
 *
 * Pure and I/O-free, like its siblings: the book holds no key and touches no network. A vessel feeds it the
 * cards a transport delivers; persisting the book across reboots is the caller's concern (serialise `snapshot`).
 *
 * Design-of-record: lar:///ha.ka.ba/lares/api/pono/persona-circle#the-vault (petname/recognition model).
 */
import {
  acceptHandleUpdate, verifyHandleCard, handleCardId, type HandleCard, type CardVerdict,
} from "./handle-card.js";

/** What the book remembers of one tracked Handle — enough to run the reader rule on the next card. */
export interface HandleRecord {
  /** The Handle's verifying-key hex — the identity the record is keyed by. */
  readonly nym:              string;
  /** The newest accepted card for this Handle — the current known face. */
  readonly card:             HandleCard;
  /** That card's content id — the `prev` target the next card must link (anti-equivocation). */
  readonly cardId:           string;
  /** The highest version accepted — the floor a later card must exceed (anti-rollback). */
  readonly highWaterVersion: number;
  /** The recogniser's LOCAL name for this key — never published, the reader's own book alone. */
  readonly petname:          string | null;
}

/** A plain-object export of the whole book — serialise this to persist recognition across reboots. */
export interface HandleBookSnapshot {
  readonly records: readonly HandleRecord[];
}

/**
 * The recogniser's private memory of the Handles it has met. Feed it announced cards; ask it who it knows.
 * Never throws on ingest — a card arrives from the open network untrusted, and a bad one returns a named
 * verdict, never an exception.
 */
export class HandleBook {
  private readonly records = new Map<string, HandleRecord>();

  constructor(snapshot?: HandleBookSnapshot) {
    for (const r of snapshot?.records ?? []) this.records.set(r.nym, r);
  }

  /**
   * Ingest one announced card. A FIRST sighting of a nym is admitted on self-certification alone (TOFU); a
   * later card for a known nym must pass the full reader rule against the held state. The book advances only
   * on accept — a rollback or a fork leaves the current record untouched, and the verdict names why.
   */
  async ingest(card: HandleCard, now?: number): Promise<CardVerdict> {
    const held = this.records.get(card.nym);
    const verdict = held
      ? await acceptHandleUpdate(card, {
          expectedNym: held.nym,
          highWaterVersion: held.highWaterVersion,
          lastCardId: held.cardId,
          ...(now !== undefined ? { now } : {}),
        })
      // First sighting: no prior lineage to honour, so the rule reduces to self-certification.
      : await verifyHandleCard(card, now);
    if (!verdict.ok) return verdict;

    this.records.set(card.nym, {
      nym:              card.nym,
      card,
      cardId:           await handleCardId(card),
      highWaterVersion: card.version,
      petname:          held?.petname ?? null,
    });
    return verdict;
  }

  /** The current known face of a Handle, or undefined if the book has never met it. */
  get(nym: string): HandleRecord | undefined {
    return this.records.get(nym);
  }

  /** Attach (or clear) the recogniser's local name for a known key. Refuses an unknown nym — name what you know. */
  setPetname(nym: string, petname: string | null): boolean {
    const r = this.records.get(nym);
    if (!r) return false;
    this.records.set(nym, { ...r, petname });
    return true;
  }

  /** The keys the book tracks — the recogniser's known world. */
  nyms(): string[] {
    return [...this.records.keys()];
  }

  /** Export the whole book — serialise to persist recognition across a reboot; rehydrate via the constructor. */
  snapshot(): HandleBookSnapshot {
    return { records: [...this.records.values()] };
  }
}
