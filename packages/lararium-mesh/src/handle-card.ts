/**
 * handle-card — a self-certifying published FACE, recognised by its own key, never by a registry.
 *
 * PUBLISH A FACE, NEVER A SELF. A human keeps many unlinkable handles in a private vault (persona-circle
 * #the-vault); a HANDLE-CARD is what ONE handle shows the world so others can recognise it again. It carries
 * the handle's public key, a display glamour, and pointers to where its standing lives — and NOTHING that
 * reaches the vault or the human's other faces. Publishing Guru-Josh's card reveals nothing about Telarus-KSC,
 * because they share no key and the collector that knows they are one human is never published.
 *
 * RECOGNITION IS SELF-CERTIFYING. The card is signed by the handle's OWN key, and that key rides IN the card
 * (`nym`). So a recogniser verifies the signature against the embedded key and needs no directory to trust —
 * the name contains the key (Mazières' self-certifying names; did:key; a Nostr npub). Zooko's triangle
 * resolves: the identifier is secure-and-decentralised because it IS the key, and memorable because each
 * recogniser keeps a LOCAL petname for it. There is no SIN, and no global registry to capture.
 *
 * MONOTONE, LEASED, LINEAGE-LINKED — the same discipline `oracle-substrate` proved. A card carries a
 * monotone `version` (a stale card cannot roll a fresh one back), a `prev` link (the recogniser can follow
 * one face's history), and an `expiry` (a lease read against the LOCAL clock — an unfed card goes stale on
 * its own, since a negative fact cannot be made to arrive). The identity of a card is its CONTENT, never its
 * signature: re-signing the same face with a fresh expiry keeps the same lineage across heartbeats.
 *
 * Pure and isomorphic, like oracle-substrate: this module holds no I/O and no key. The vessel supplies the
 * signer; the caller carries the bytes; the read-open @oracle plane serves the published blob.
 *
 * Design-of-record: lar:///ha.ka.ba/lares/api/pono/persona-circle#the-vault (publication model).
 */
import { canonicalJsonBytes, hex, hexToBytes } from "./crypto.js";
import * as ed25519 from "@noble/ed25519";

/** The domain a card signs over. A signature is meaningless without the domain it was made in. */
export const HANDLE_CARD_DOMAIN = "lar-handle-card/v1" as const;

/**
 * The published face of one handle — PUBLIC data only. Nothing here may reach the vault or another face.
 *
 * `nym` is the handle's verifying key: the identifier IS the key, so the card certifies itself. In the
 * upgraded model this is a scope-exclusive pseudonym `PRF_s(scope)` proven in ZK (persona-circle#the-vault);
 * here it rides as the raw ed25519 verifying key, and the ZK proof binding it to a committed master secret
 * is the owed layer above this one.
 */
export interface HandleCard {
  readonly kind:     typeof HANDLE_CARD_DOMAIN;
  /** The handle's verifying-key hex — the identifier that certifies the card. Recognition checks against this. */
  readonly nym:      string;
  /** The display glamour — a chosen name/mask, never a legal identity. Memorable, never authoritative. */
  readonly glamour:  string;
  /** Monotone counter — a later card supersedes an earlier one; a stale card cannot roll it back. */
  readonly version:  number;
  /** The previous card's id (its content hash), or null at first publication — the face's own lineage. */
  readonly prev:     string | null;
  /** ms epoch — a freshness lease read against the recogniser's LOCAL clock. An unfed card goes stale itself. */
  readonly expiry:   number;
  /** OPTIONAL content-address of the handle's reputation thread (the signed vouches/annotations). */
  readonly standing: string | null;
  /** ed25519 signature over the card's canonical content, by the key in `nym`. */
  readonly sig:      string;
}

/** The content a card signs over — everything but the signature. Canonical, so one face yields one sig. */
export function handleCardBytes(card: Omit<HandleCard, "sig">): Uint8Array {
  return canonicalJsonBytes({
    kind:     card.kind,
    nym:      card.nym,
    glamour:  card.glamour,
    version:  card.version,
    prev:     card.prev,
    standing: card.standing,
    // `expiry` rides OUTSIDE the signed identity, exactly as oracle-substrate keeps it out of the pointer
    // identity: a lease renewal (same face, fresh expiry, new sig) must keep the SAME card identity so the
    // lineage stays stable across heartbeats. Freshness is a separate, locally-checked concern.
  });
}

/** The card's IDENTITY — its content hash, the `prev` target and the recogniser's stable handle for it. */
export function handleCardId(card: Omit<HandleCard, "sig">): Promise<string> {
  return Promise.resolve(hex(handleCardBytes(card)));
}

/** Sign a handle-card. The caller supplies the handle's own signer; this module holds no key. */
export async function signHandleCard(
  parts: Omit<HandleCard, "kind" | "sig">,
  sign: (bytes: Uint8Array) => Promise<string>,
): Promise<HandleCard> {
  const unsigned = { ...parts, kind: HANDLE_CARD_DOMAIN } as Omit<HandleCard, "sig">;
  return { ...unsigned, sig: await sign(handleCardBytes(unsigned)) };
}

/** Why a card failed to verify — a recogniser learns exactly what is wrong rather than a bare "invalid". */
export type CardRejection =
  | "wrong-domain"      // not a handle-card
  | "malformed"         // a field is the wrong shape (nym/sig not hex, etc.)
  | "bad-signature"     // the card was not signed by the key it names — it certifies nothing
  | "expired";          // the lease lapsed against the local clock (only checked when `now` is given)

export interface CardVerdict {
  readonly ok:      boolean;
  readonly nym?:    string;         // the recognised key, on success — the thing a petname points at
  readonly reject?: CardRejection;
}

/**
 * Verify a card certifies ITSELF: the signature must check against the key the card names.
 *
 * This is the whole of recognition, and it needs no registry — a card is trustworthy exactly insofar as the
 * key inside it signed it. Passing `now` additionally checks the freshness lease; omitting it verifies the
 * signature alone (a recogniser may accept a stale-but-signed card as a last-known face, its own call).
 *
 * A rejection NAMES itself. A recogniser that only learns "invalid" cannot tell a forgery from a lapsed
 * lease from a typo, and re-presents blind.
 */
export async function verifyHandleCard(
  card: HandleCard,
  now?: number,
): Promise<CardVerdict> {
  if (card.kind !== HANDLE_CARD_DOMAIN) return { ok: false, reject: "wrong-domain" };
  if (!/^[0-9a-f]{64}$/.test(card.nym) || !/^[0-9a-f]{128}$/.test(card.sig)) {
    return { ok: false, reject: "malformed" };
  }
  // Freshness before the signature: a card whose lease lapsed is stale WHATEVER its signature, and saying so
  // first keeps a recogniser from treating an old face as current merely because the crypto still checks.
  if (now !== undefined && Number.isFinite(card.expiry) && card.expiry <= now) {
    return { ok: false, reject: "expired" };
  }
  const { sig, ...unsigned } = card;
  let ok = false;
  try {
    ok = await ed25519.verifyAsync(hexToBytes(sig), handleCardBytes(unsigned), hexToBytes(card.nym));
  } catch {
    return { ok: false, reject: "malformed" };
  }
  return ok ? { ok: true, nym: card.nym } : { ok: false, reject: "bad-signature" };
}

/**
 * The petname check: is this card the handle I already know?
 *
 * Recognition is TWO steps, and conflating them is the classic error. First the card must certify itself
 * (verifyHandleCard) — a valid signature by the key it names. Then the recogniser asks whether that key is
 * the one their petname points at. A card can be perfectly self-certifying and STILL be a stranger; only the
 * local petname turns a valid key into "the mover who healed Neo-Thracia". The petname lives in the
 * recogniser's own book, never on any wire.
 */
export async function recognizeHandle(
  card: HandleCard,
  expectedNym: string,
  now?: number,
): Promise<boolean> {
  const v = await verifyHandleCard(card, now);
  return v.ok && v.nym === expectedNym;
}
