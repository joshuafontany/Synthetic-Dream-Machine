/**
 * handle-announce — the bridge that carries a handle-card onto a SYNCED doc, so announcing a Handle rides the
 * transport the mesh already runs.
 *
 * The card + the reader rule + the recogniser book are pure and transport-blind (handle-card, handle-book).
 * This module lands a signed card in a LarDoc as a namespaced tiddler and reads cards back out — nothing more.
 * Once the card is a tiddler in a read-open doc, the EXISTING Automerge sync distributes it over the relay
 * (browser↔node↔browser) with no new channel, exactly as the @daemon doc already carries keyhive cap-events.
 * Which read-open bag HOSTS the announce is the caller's wiring choice — the cards ride under their own key
 * prefix, so they coexist cleanly with whatever else the doc holds.
 *
 * NEXUS-SCOPED, NEVER GLOBAL (causal islands). "Public" here means public within the causal island that has
 * synced the announce doc — the largest practical such island is the Nexus (the WHO plane, sibling to the
 * @meshpalace FLOW-map's WHERE plane). There is no global DreamNet registry of Handles, because there is no
 * global now: a Handle federates exactly as far as its announce doc syncs, and crossing to another Nexus
 * RE-ANNOUNCES. Re-announcement is cheap by the card's self-certifying design — the SAME signed card re-lands
 * in the target Nexus's doc with no re-sign, and the tiddler key stays stable (it names the identity KIND, so
 * recognition carries across islands), while the hosting bag carries the island-scoped reach.
 *
 * Pure and I/O-free: it mutates a LarDoc draft the caller opened inside `handle.change()`, and reads a plain
 * LarDoc. It holds no key and touches no network. Untrusted by construction — a card arrives from an open
 * synced doc, so reading NEVER throws on a malformed tiddler (a bad entry is skipped, and every surviving card
 * still passes the recogniser rule before it is trusted).
 *
 * Canon: lar:///ha.ka.ba/lares/api/pono/lararium-identity#the-oracle-plane (the read-open plane the card
 * publishes on); lar:///ha.ka.ba/lares/api/pono/persona-circle#the-vault (the publication model).
 */
import { mutableLarRecord, tiddlerText, type LarDoc } from "./base-doc.js";
import { HANDLE_CARD_DOMAIN, type HandleCard } from "./handle-card.js";
import { HandleBook } from "./handle-book.js";
import type { CardVerdict } from "./handle-card.js";

/** The tiddler-key prefix announced handle-cards ride under, so they namespace apart from a doc's other content.
 *  On the DreamNet plane, not one lararium's `lares` API — an announced Handle is a super-mesh-wide face. */
export const HANDLE_ANNOUNCE_PREFIX = "lar:///ha.ka.ba/dreamnet/handles/" as const;

/** The tiddler key one Handle's card announces under — keyed by nym, so a nym's newest card supersedes in place. */
export function handleAnnounceKey(nym: string): string {
  return `${HANDLE_ANNOUNCE_PREFIX}${nym}`;
}

/**
 * Announce a card onto a doc draft — write it as a namespaced tiddler, keyed by nym. Call INSIDE a
 * `handle.change()` callback (the draft mutates there, exactly as base-doc writes its oracle tiddlers). A later
 * card for the same nym overwrites the tiddler in place; a recogniser's HandleBook still holds the lineage, so
 * a rollback attempt loses at read time even though the doc keeps only the latest slot.
 */
export function writeHandleAnnounce(draft: LarDoc, card: HandleCard): void {
  const key = handleAnnounceKey(card.nym);
  draft.tiddlers[key] = mutableLarRecord(key, { text: JSON.stringify(card) }, card.nym);
}

/**
 * Read every announced card out of a doc — parse each handle-card tiddler, skipping any that fails to parse or
 * carries the wrong domain. This is a SHAPE filter only: it certifies nothing. Feed the results through a
 * HandleBook (or `ingestAnnounceDoc`), which runs the actual recogniser rule.
 */
export function readHandleAnnounces(doc: LarDoc): HandleCard[] {
  const cards: HandleCard[] = [];
  for (const [key, record] of Object.entries(doc.tiddlers ?? {})) {
    if (!key.startsWith(HANDLE_ANNOUNCE_PREFIX)) continue;
    const text = tiddlerText(record);
    if (text === null) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { continue; }   // a malformed tiddler is skipped, never thrown
    if (
      parsed && typeof parsed === "object" &&
      (parsed as { kind?: unknown }).kind === HANDLE_CARD_DOMAIN
    ) {
      cards.push(parsed as HandleCard);
    }
  }
  return cards;
}

/**
 * Ingest a whole announce doc into a recogniser's book — read every card, run each through the book's rule,
 * and return the per-nym verdicts. The book advances only on accept, so re-ingesting an unchanged doc is
 * idempotent and a stale/forked card in the doc is refused without disturbing the held face.
 */
export async function ingestAnnounceDoc(
  book: HandleBook,
  doc: LarDoc,
  now?: number,
): Promise<Map<string, CardVerdict>> {
  const verdicts = new Map<string, CardVerdict>();
  for (const card of readHandleAnnounces(doc)) {
    verdicts.set(card.nym, await book.ingest(card, now));
  }
  return verdicts;
}
