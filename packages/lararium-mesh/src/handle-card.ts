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
import {
  signDelegationEdge, verifyDelegationEdge, DELEGATION_DOMAIN, type DelegationEdge,
} from "./delegation-edge.js";
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
  /** POSIX ms — a freshness lease read against the recogniser's LOCAL clock. An unfed card goes stale itself.
   *  Deliberately not spelled `epoch`: that word names the mesh's fencing frontier, never a wall-clock. */
  readonly expiry:   number;
  /** OPTIONAL content-address of the handle's reputation thread (the signed vouches/annotations). */
  readonly standing: string | null;
  /**
   * OPTIONAL proof that this face speaks for a FLEET — a delegation edge the persona root signed over this
   * nym. Absent → the card certifies only itself, which stays a complete and honest card; a face that
   * claims no fleet claims nothing false. Present → a recogniser walks nym → root in one extra verify.
   */
  readonly fleetProof: DelegationEdge | null;
  /** ed25519 signature over the card's canonical content, by the key in `nym`. */
  readonly sig:      string;
}


/**
 * The card's IDENTITY content — everything that makes this face THIS face.
 *
 * `expiry` rides OUTSIDE it, exactly as oracle-substrate keeps a lease out of a pointer's identity: a
 * renewal (same face, fresh expiry) must keep the SAME card id so the `prev` lineage stays stable across
 * heartbeats rather than forking on every beat.
 */
export function handleCardIdBytes(card: Omit<HandleCard, "sig" | "expiry">): Uint8Array {
  return canonicalJsonBytes({
    kind:       card.kind,
    nym:        card.nym,
    glamour:    card.glamour,
    version:    card.version,
    prev:       card.prev,
    standing:   card.standing,
    fleetProof: card.fleetProof,
  });
}

/**
 * The content a card SIGNS over — its identity PLUS the lease.
 *
 * IDENTITY AND SIGNATURE ANSWER DIFFERENT QUESTIONS, so they cover different bytes. Leaving `expiry` out of
 * the identity keeps a lineage stable; leaving it out of the SIGNATURE would let anyone extend anyone's
 * lease by editing a number the signer never covered. One function cannot serve both, so two do.
 */
export function handleCardBytes(card: Omit<HandleCard, "sig">): Uint8Array {
  return canonicalJsonBytes({
    identity: hex(handleCardIdBytes(card)),
    expiry:   card.expiry,
  });
}

/** The card's IDENTITY — its content hash, the `prev` target and the recogniser's stable handle for it. */
export function handleCardId(card: Omit<HandleCard, "sig">): Promise<string> {
  return Promise.resolve(hex(handleCardIdBytes(card)));
}

/**
 * Mint the delegation edge — run on the vessel holding the persona ROOT, never on the one publishing.
 * The root signs the nym; the nym then signs the card carrying that signature. No circle: the root covers
 * only the nym-and-epoch, so it may sign before the card exists.
/**
 * The subject a fleet-proof covers — the nym the root vouched for. Named once so the mint and the verify
 * can never disagree about what got signed.
 */
export function fleetProofSubject(nym: string): Record<string, string> {
  return { nym };
}

/** Mint the edge binding a face to its fleet — run where the persona ROOT lives, never where it publishes. */
export function signFleetProof(
  args: { readonly nym: string; readonly rootDid: string; readonly epochCid: string },
  sign: (bytes: Uint8Array) => Promise<string>,
): Promise<DelegationEdge> {
  return signDelegationEdge(
    DELEGATION_DOMAIN.fleetProof, fleetProofSubject(args.nym), args.rootDid, args.epochCid, sign);
}

/**
 * Does this card PROVE it speaks for the fleet it names? One Ed25519 verify beside the card's own.
 *
 * A card carrying NO proof reads false without reading dishonest: an unbound face claims no fleet, so it
 * fails no claim. A caller distinguishes unbound from refuted by checking `fleetProof` for absence.
 */
export function verifyFleetProof(
  card: HandleCard,
  verify: (bytes: Uint8Array, sigHex: string, signerDid: string) => Promise<boolean>,
): Promise<boolean> {
  return verifyDelegationEdge(
    DELEGATION_DOMAIN.fleetProof, fleetProofSubject(card.nym), card.fleetProof, verify);
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
  | "expired"           // the lease lapsed against the local clock (only checked when `now` is given)
  | "wrong-nym"         // the card names a DIFFERENT handle than the one a recogniser tracks — not an update
  | "rollback"          // the card's version sits below one the recogniser already accepted — a replay
  | "lineage-break";    // the card's `prev` fails to link the last card held — an equivocation/fork

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

/**
 * The ANNOUNCE reader rule — accept a fresh card for a Handle already tracked, refuse a rollback or a fork.
 *
 * `verifyHandleCard` certifies ONE card in isolation (self-signed, unexpired). Recognising a handle OVER TIME
 * needs more: an announced Handle republishes its card as it renews the lease, bumps the glamour, or links a
 * new standing thread, and a recogniser must accept the NEWER face while refusing a stale copy that tries to
 * roll the Handle back or a forked lineage that equivocates. This rule carries the SAME discipline
 * `oracle-substrate` proves for its pointer (anti-rollback by `version`, anti-equivocation by `prev`), applied
 * to the card's own monotone fields — so a Handle rides the read-open plane under the identical guarantees.
 *
 * Pass what the recogniser remembers of this Handle:
 *   - `expectedNym`: the key the recogniser's petname points at — a card naming a different key is a stranger,
 *     never an update, however well it certifies itself (the hijack guard).
 *   - `highWaterVersion`: the highest card version already accepted; a lower one reads as a replay/rollback.
 *   - `lastCardId`: the id (content hash) of the last card held; a `prev` that fails to link it flags a fork.
 *   - `now`: the recogniser's LOCAL clock — past `expiry` reads as stale (no global now).
 *
 * First recognition (no card held yet) passes `highWaterVersion`/`lastCardId` undefined; the rule then reduces
 * to self-certification + the nym match. Never throws — an announce arrives from the open network untrusted.
 */
export async function acceptHandleUpdate(
  card: HandleCard,
  opts: {
    readonly expectedNym:       string;
    readonly highWaterVersion?: number;
    readonly lastCardId?:       string;
    readonly now?:              number;
  },
): Promise<CardVerdict> {
  const self = await verifyHandleCard(card, opts.now);
  if (!self.ok) return self;
  if (card.nym !== opts.expectedNym) return { ok: false, reject: "wrong-nym" };

  // The version axis, read against what the recogniser holds. Idempotent replay of the CURRENT card is the
  // norm under gossip/merge, so it must pass — only a card that PURPORTS TO ADVANCE (version above the
  // high-water) is held to the lineage link; a card AT the high-water passes iff it IS the held card.
  if (opts.highWaterVersion !== undefined) {
    if (card.version < opts.highWaterVersion) return { ok: false, reject: "rollback" };
    if (card.version === opts.highWaterVersion) {
      // A different card at the SAME version equivocates; the same card (or an unremembered one) replays clean.
      if (opts.lastCardId !== undefined && (await handleCardId(card)) !== opts.lastCardId) {
        return { ok: false, reject: "lineage-break" };
      }
      return { ok: true, nym: card.nym };
    }
    // version > high-water: an advance MUST link the held card (anti-equivocation).
    if (opts.lastCardId !== undefined && card.prev !== opts.lastCardId) {
      return { ok: false, reject: "lineage-break" };
    }
  }
  return { ok: true, nym: card.nym };
}
