/**
 * re-anchoring — the record that a guest's dwelling moved from a HOST to a REALM, and nothing else.
 *
 * A guest dwells WITH a host: a dyad, one edge, and the historically fatal shape — across six surveyed
 * hospitality institutions, one-sided admission always booked the shortfall as RANK. A realm's own ceremony
 * re-anchors that dwelling INTO the realm, and this records THAT it happened.
 *
 * ── WHAT THIS MUST NOT HOLD, AND WHY THE OMISSION IS THE DESIGN ──────────────────────────────────────
 * It carries NO quorum rule, waiting period, franchise, test, method, rite-name, or any other validating
 * predicate. Communities that need shelter already hold their own rites, and a CONFIGURABLE rite is still
 * this stack's rite with someone else's values poured in — the moment a schema ships fields for a ceremony,
 * those fields have specified everyone's ceremony and called it a default.
 *
 * The refusal is stated in the TYPE rather than only here, because a comment gets skimmed and a record of an
 * unspecified ceremony is a strange object: it says something happened that we may not describe. Any later
 * hand will feel the urge to add one validating field. That urge is the failure; this shape is the ward.
 *
 * Prior art, and it is normative: Privacy Pass (RFC 9576 §3.5.1) makes the attestation procedure "a
 * deployment-specific option and outside the scope of the issuance protocol" — the token carries that
 * attestation succeeded and nothing about what made it succeed.
 *
 * ── THE ATTESTORS RIDE PLURAL, AND UN-THRESHOLDED ────────────────────────────────────────────────────
 * One attestor rebuilds the dyad inside a signed wrapper, which is the failure this record exists against.
 * So attestation runs as a SET, unordered, each signing independently — and this module states NO rule about
 * how many suffice. The reader decides, at the reader's own policy.
 *
 * Two standards ship exactly that: RFC 9162 §8.1.6 leaves "the quantity and form of evidence" to "a client's
 * local policy", and W3C VC Data Integrity §2.1.1 gives proof SETS "where the order of proofs does not
 * matter". The threshold family (t-of-n, FROST, BLS aggregation) fails here by construction: it emits ONE
 * signature that verifies only at t, so the sufficiency rule bakes into the cryptography AND the individual
 * attestors vanish. You cannot count what aggregated. A naive list costs bytes and buys the reader's seat.
 *
 * ── ATTESTER ⊥ MINTER ────────────────────────────────────────────────────────────────────────────────
 * The party that ran the rite MUST NOT be the party that mints the record. Privacy Pass documents the price:
 * its joint Attester-and-Issuer deployment reads as the WEAKENED model. Here that runs structurally — the
 * record carries no minter identity at all, so nothing in it can reconstruct who convened what.
 *
 * ── ONE ARTIFACT, FOLDED TWO WAYS ────────────────────────────────────────────────────────────────────
 * An EVENT on write; accrued DEPTH on read. A re-anchoring attested at a position IS the datum depth accrues
 * from, so building them apart would build them twice.
 *
 * Platform-blind: rides ./base-doc + ./crypto only. NO node: imports, no key, no I/O.
 * Meme: lar:///ha.ka.ba/lares/api/pono/re-anchoring-record
 */

import type { LarDoc } from "./base-doc.js";
import { mutableLarRecord, tiddlerText } from "./base-doc.js";
import { canonicalJsonBytes } from "./crypto.js";

/** The domain a re-anchoring signs over — a signature without its domain says nothing. */
export const RE_ANCHORING_DOMAIN = "lar-re-anchoring/v1" as const;

/** The board prefix a record lands under. */
export const RE_ANCHORING_PREFIX = "$:/lar/re-anchoring/";

/**
 * One attestor's mark on a re-anchoring — "I dwell here, and I saw this."
 *
 * It carries no weight, no role, and no rank. An attestor is not a voucher (`cabal-invite` stakes standing)
 * and not a steward (`nexus` acts run quorum-signed). This says only that a party already dwelling witnessed
 * the re-anchoring, and whether that matters belongs to whoever reads.
 */
export interface Attestation {
  /** The attestor's verifying key, as they present it IN THIS REALM. See the pseudonym note on ReAnchoring. */
  readonly attestor: string;
  /** ed25519 over `reAnchoringBytes` — each attestor signs the same subject, independently. */
  readonly sig:      string;
}

/**
 * A dwelling re-anchored from a host to a realm.
 *
 * THE POSITION, NEVER AN INSTANT. `epoch` roots the record on a walkable chain, so two replicas holding that
 * chain order two records identically without either reading a clock. A wall clock in a merge-relevant
 * predicate makes convergence non-deterministic — and a device clock reads freely settable by its user and
 * more freely by its operator, where skew arrives on purpose as a testing feature.
 *
 * THE ATTESTOR-PLURALITY TENSION, carried in the open. RFC 9576 §6.2 documents that "increasing the number of
 * required attestation procedures could decrease the overall anonymity set size" — so as the attestor count
 * rises, the intersection of realms whose dwellers would jointly attest NARROWS, and the record begins naming
 * the person by naming who vouched. The dyad cure and the no-global-identifier cure pull against each other.
 * The candidate shape (operator-seated, unresolved): carry `attestor` as a PER-REALM pseudonym rather than a
 * stable key, so a realm reads "these dwell here" without the record naming keys that surface elsewhere.
 */
export interface ReAnchoring {
  readonly kind:      typeof RE_ANCHORING_DOMAIN;
  /** The party whose dwelling re-anchored — as they present in this realm. */
  readonly dweller:   string;
  /** The realm the dwelling re-anchored INTO. */
  readonly realm:     string;
  /** The epoch this record roots on. An ORDER, never an instant. */
  readonly epoch:     string;
  /**
   * The parties already dwelling who witnessed it — unordered, independently signed, and carrying NO rule
   * about how many suffice. A single-element set is representable and reads as the dyad it is; refusing it
   * here would bake a threshold this layer must not hold.
   */
  readonly attestors: readonly Attestation[];
}

/**
 * The bytes every attestor signs — the dweller, the realm, and the position, bound together.
 *
 * The attestations are NOT in the signed subject: each attestor signs the re-anchoring itself, so a set can
 * grow after the fact without invalidating what already signed, and no attestor's mark depends on who else
 * marked. That independence is what keeps the set un-thresholded rather than a quorum in disguise.
 */
export function reAnchoringBytes(r: Pick<ReAnchoring, "kind" | "dweller" | "realm" | "epoch">): Uint8Array {
  return canonicalJsonBytes({ kind: r.kind, dweller: r.dweller, realm: r.realm, epoch: r.epoch });
}

/** Mint one attestor's mark. The caller supplies the signer; this module holds no key. */
export async function signAttestation(
  subject: Pick<ReAnchoring, "kind" | "dweller" | "realm" | "epoch">,
  attestor: string,
  sign: (bytes: Uint8Array) => Promise<string>,
): Promise<Attestation> {
  return { attestor, sig: await sign(reAnchoringBytes(subject)) };
}

/**
 * The key one record rides under — dweller and realm and epoch together.
 *
 * Keyed this way, a re-anchoring at a LATER epoch lands beside its predecessor rather than overwriting it, so
 * a dwelling that lapsed and re-anchored again reads as two acts rather than one edited state. The board
 * holds acts; the fold holds depth.
 */
export function reAnchoringKey(dweller: string, realm: string, epoch: string): string {
  return `${RE_ANCHORING_PREFIX}${realm}/${dweller}/${epoch}`;
}

/** Land a record on a board draft. Call INSIDE a `handle.change()` callback. */
export function writeReAnchoring(draft: LarDoc, r: ReAnchoring): void {
  const key = reAnchoringKey(r.dweller, r.realm, r.epoch);
  draft.tiddlers[key] = mutableLarRecord(key, { text: JSON.stringify(r) }, r.epoch);
}

/** A parsed payload reads as a record only at the exact FLOOR shape — extra fields drop. */
function coerceRecord(parsed: unknown): ReAnchoring | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const p = parsed as Record<string, unknown>;
  if (p["kind"] !== RE_ANCHORING_DOMAIN) return null;
  if (typeof p["dweller"] !== "string" || p["dweller"].length === 0) return null;
  if (typeof p["realm"] !== "string" || p["realm"].length === 0) return null;
  if (typeof p["epoch"] !== "string" || p["epoch"].length === 0) return null;
  if (!Array.isArray(p["attestors"])) return null;
  const attestors: Attestation[] = [];
  for (const a of p["attestors"] as unknown[]) {
    if (typeof a !== "object" || a === null) continue;               // a torn mark drops; the record stands
    const m = a as Record<string, unknown>;
    if (typeof m["attestor"] !== "string" || m["attestor"].length === 0) continue;
    if (typeof m["sig"] !== "string" || m["sig"].length === 0) continue;
    attestors.push({ attestor: m["attestor"], sig: m["sig"] });
  }
  return {
    kind: RE_ANCHORING_DOMAIN, dweller: p["dweller"], realm: p["realm"],
    epoch: p["epoch"], attestors,
  };
}

/**
 * Every well-formed record a board carries. A torn or foreign tiddler drops in silence.
 *
 * NO COMPLETENESS CLAIM RIDES HERE, and none may ride downstream. Under no-global-now a replica reads only
 * as-of-its-last-sync, so a record WITHHELD and a record merely UNSYNCED generate identically. That
 * equivalence does load-bearing work: a party who declines to attest performs no detectable act, because
 * nobody can tell their absence from ordinary partition. Every trust network that survived hostile pressure
 * kept exactly that discretion. So no read here, and nothing built on one, may report a count as TOTAL, a set
 * as COMPLETE, or a board as current "as of epoch N".
 */
export function reAnchoringsFromBoard(doc: LarDoc | undefined | null): ReAnchoring[] {
  const tiddlers = doc?.tiddlers;
  if (!tiddlers) return [];
  const out: ReAnchoring[] = [];
  for (const record of Object.values(tiddlers)) {
    // The KIND check in the coercer does the filtering, never the key — a record misfiled under any title
    // still reads as itself, and a foreign tiddler wearing this prefix never reads as one of ours.
    const text = tiddlerText(record);
    if (text === null) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { continue; }   // a torn payload drops — withhold, never forge
    const r = coerceRecord(parsed);
    if (r !== null) out.push(r);
  }
  return out;
}

/**
 * Verify one record's attestations, dropping every mark that fails — and NEVER deciding whether enough stand.
 *
 * The count comes back so a reader may apply its OWN policy; this layer states none. That split is the whole
 * design: RFC 9162 §8.1.6 leaves "the quantity and form of evidence" to "a client's local policy", and a
 * sufficiency rule written here would become a quorum nobody chose.
 *
 * A mark that fails its signature DROPS rather than throwing: a forged attestation must never make a
 * re-anchoring read stronger, and a torn one must never make it unreadable.
 */
export async function verifiedAttestors(
  r: ReAnchoring,
  verify: (bytes: Uint8Array, sigHex: string, signerDid: string) => Promise<boolean>,
): Promise<string[]> {
  const bytes = reAnchoringBytes(r);
  const verdicts = await Promise.all(
    r.attestors.map((a) => verify(bytes, a.sig, a.attestor).catch(() => false)),
  );
  const held: string[] = [];
  for (let i = 0; i < r.attestors.length; i++) if (verdicts[i]) held.push(r.attestors[i]!.attestor);
  return [...new Set(held)];                      // one attestor marking twice counts once
}

/**
 * Fold a board into the re-anchorings ONE dweller holds in ONE realm, verified, in chain order.
 *
 * The fold answers "does this one hold, and since when" and NEVER "who holds" — the caller names the dweller,
 * so this reads no membership list because none exists to read. There is no roster to seize, no list to
 * delete, and no count presentable as a total.
 *
 * `epochOrder` arrives INJECTED and REQUIRED, exactly as the kāpae fold takes it: this module holds no chain
 * and must not. An unknown epoch ranks below every known one, so a record rooting on a chain the reader
 * cannot walk never outranks one it can — fail-closed. A reader holding no chain says so with `noChainHeld`
 * rather than by omitting an argument nobody sees.
 */
export async function dwellingHistory(
  doc: LarDoc | undefined | null,
  dweller: string,
  realm: string,
  verify: (bytes: Uint8Array, sigHex: string, signerDid: string) => Promise<boolean>,
  epochOrder: (epochCid: string) => number | null,
): Promise<{ epoch: string; attestors: string[] }[]> {
  const mine = reAnchoringsFromBoard(doc).filter((r) => r.dweller === dweller && r.realm === realm);
  const out: { epoch: string; attestors: string[] }[] = [];
  for (const r of mine) {
    const attestors = await verifiedAttestors(r, verify);
    if (attestors.length > 0) out.push({ epoch: r.epoch, attestors });   // an unattested record deposits nothing
  }
  return out.sort((a, b) => (epochOrder(a.epoch) ?? -1) - (epochOrder(b.epoch) ?? -1));
}
