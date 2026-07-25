/**
 * wax-stamp (CIV-5) — the guild's public-plane PROVENANCE keel: does a posted artifact trace to the
 * CURRENT charter, a PAST charter (authentic, just older), or a SPOOF? Provenance of the DATA, never
 * presence of a person — the public-plane DUAL of the private predicate-key (cabal-realm#the-wax-stamp).
 * The membership handshake answers presence, live + peer-to-peer; the wax-stamp answers provenance,
 * public + on the data. Orthogonal.
 *
 * The charter is a pre-rotated, hash-linked, content-addressed EPOCH CHAIN (TUF ≈ KERI): each epoch
 * names its authorizing key-set AND pre-commits a digest of the NEXT epoch's keys — so stealing today's
 * council keys cannot forge tomorrow's charter. It lists KEYS/THRESHOLDS, never a roster. A stamp attests
 * A PAST ("sealed under epoch N"), NEVER "the org endorses this now" — which is what preserves no-global-
 * now: the seal is a frozen causal fact, and present-standing reads live on the SEPARATE handshake.
 *
 * The honest wall, kept lit: "valid trace to lineage L" is a HARD crypto fact (decided here); "L is the
 * legitimate org" is HIGHER-ORDER social acceptance (NOT decided here — a fork yields two internally-valid
 * lineages). Duplicity — two signed inconsistent epochs at one sequence — IS algorithmically detectable.
 */

import * as ed25519 from "@noble/ed25519";
import { sha256HexSync, hexToBytes, canonicalJson } from "./crypto.js";

/** One epoch in the charter's pre-rotated, hash-linked lineage. Content-addressed by `epochCid`. */
export interface CharterEpoch {
  readonly epoch:        number;         // monotonic sequence; genesis = 0
  readonly epochCid:     string;         // content-address of THIS epoch record (its own hash)
  readonly keySetHash:   string;         // digest of the key-set/quorum authorized to seal UNDER this epoch
  readonly nextKeyCommit: string;        // KERI pre-rotation: digest of the NEXT epoch's authorized keys
  readonly prevEpochCid: string | null;  // hash-link to the predecessor (null at genesis)
}

/** A wax-stamp on posted data — inline, island-local, attests A PAST ("sealed under epoch N"). */
export interface WaxStamp {
  readonly artifactHash: string;   // the sealed artifact's content hash
  readonly epochCid:     string;   // the charter epoch this seal cites
  readonly sealedAt:     string;   // an ITC/logical BOUND-PAST (the epoch's t0..t1); never "now"
  readonly signature:    string;   // by a key in the cited epoch's key-set
}

/** current: sealed under the head epoch · past-authentic: under a prev-reachable ancestor · spoof: no trace. */
export type SealVerdict = "CURRENT" | "PAST_AUTHENTIC" | "SPOOF";

/**
 * Verify the charter chain's integrity: monotonic sequence + hash-links + KERI PRE-ROTATION — each
 * epoch's `keySetHash` was pre-committed by its predecessor's `nextKeyCommit`, so a stolen current key
 * cannot forge a valid successor. Genesis (epoch 0) carries no predecessor.
 */
export function verifyCharterChain(chain: readonly CharterEpoch[]): boolean {
  if (chain.length === 0) return false;
  if (chain[0]!.epoch !== 0 || chain[0]!.prevEpochCid !== null) return false;
  for (let i = 1; i < chain.length; i++) {
    const e = chain[i]!, prev = chain[i - 1]!;
    if (e.epoch !== prev.epoch + 1) return false;          // monotonic
    if (e.prevEpochCid !== prev.epochCid) return false;    // hash-linked
    if (e.keySetHash !== prev.nextKeyCommit) return false; // pre-rotation: the predecessor pre-committed these keys
  }
  return true;
}

/**
 * Classify a wax-stamp against the charter chain (HEAD = the last element). `verifySig` is injected —
 * it verifies the stamp's signature against the cited epoch's authorized key-set (Ed25519 today). A
 * broken lineage, an unknown epoch, or a failed signature all read SPOOF; a valid seal under the head
 * reads CURRENT, under an ancestor PAST_AUTHENTIC. What this does NOT decide: whether the lineage itself
 * is "the legitimate org" — that is higher-order social acceptance, never a signature.
 */
export function classifySeal(
  stamp: WaxStamp,
  chain: readonly CharterEpoch[],
  verifySig: (stamp: WaxStamp, epoch: CharterEpoch) => boolean,
): SealVerdict {
  if (!verifyCharterChain(chain)) return "SPOOF";                        // a broken lineage attests nothing
  const idx = chain.findIndex((e) => e.epochCid === stamp.epochCid);
  if (idx < 0) return "SPOOF";                                           // cites no epoch in the lineage
  if (!verifySig(stamp, chain[idx]!)) return "SPOOF";                    // signature does not verify vs that epoch
  return idx === chain.length - 1 ? "CURRENT" : "PAST_AUTHENTIC";
}

/**
 * Detect DUPLICITY across two claimed lineages: two epoch records at the SAME sequence with DIFFERENT
 * CIDs = proof-of-misbehavior (a controller signed inconsistent history). Returns the offending epoch
 * number, or null. This is algorithmically decidable; the LEGITIMACY of a fork is not (never auto-arbitrate).
 */
export function detectDuplicity(a: readonly CharterEpoch[], b: readonly CharterEpoch[]): number | null {
  const byEpoch = new Map(a.map((e) => [e.epoch, e.epochCid]));
  for (const e of b) {
    const other = byEpoch.get(e.epoch);
    if (other !== undefined && other !== e.epochCid) return e.epoch;
  }
  return null;
}

// ── The minter + the Ed25519 verify (the crypto floor the classifier's injected verifySig rides) ────

/** The canonical bytes a wax-stamp signs — the artifact bound to its epoch + a bound-past (strict `|`). */
export function waxStampProofBytes(artifactHash: string, epochCid: string, sealedAt: string): Uint8Array {
  return new TextEncoder().encode(`lar-wax-stamp/v1|${artifactHash}|${epochCid}|${sealedAt}`);
}

/** A single-key key-set digest — the floor's keySetHash for an epoch with one authorized signer. A
 *  k-of-n key-set is a Merkle/sorted-hash of the members (a later cut); the classifier is agnostic. */
export function singleKeySetHash(signerKeyHex: string): string {
  return sha256HexSync(signerKeyHex);
}

// ── The pre-rotated charter-epoch CHAIN minter (KERI): seat genesis, pre-commit next, rotate on reveal ──

/**
 * The k-of-n charter key-set digest — the CURRENT authorized quorum an epoch binds in `keySetHash`, and
 * the value a predecessor pre-commits in `nextKeyCommit`. Extends `singleKeySetHash`'s single-signer floor
 * into the k-of-n cut (the flagged 'later cut'): it folds the sorted, de-duped keys AND the threshold, so
 * the digest is order-blind and a reorder or a threshold change forges no match. One-way — a reader
 * recomputes it from a PRESENTED key-set to test authorization; it recovers no key from the digest.
 */
export function charterKeySetHash(keys: readonly string[], threshold: number): string {
  const norm = [...new Set(keys.map((k) => k.toLowerCase()))].sort();
  return sha256HexSync(canonicalJson({ keys: norm, threshold }));
}

/** The authority fields an epoch's content-address binds — everything but the derived `epochCid` itself. */
export type CharterEpochFields = Omit<CharterEpoch, "epochCid">;

/**
 * The content-address of a charter epoch — a hash BINDING the epoch's authority fields (its sequence, its
 * authorized key-set digest, its pre-rotation commitment, its predecessor link). A single bit-flip in any
 * bound field yields a different cid, so the `epochCid` the next epoch hash-links against is tamper-evident.
 */
export function charterEpochCidOf(fields: CharterEpochFields): string {
  return `epoch${fields.epoch}-${sha256HexSync(canonicalJson({
    epoch: fields.epoch, keySetHash: fields.keySetHash,
    nextKeyCommit: fields.nextKeyCommit, prevEpochCid: fields.prevEpochCid,
  }))}`;
}

/** Seal one charter epoch from its authority fields, deriving the content-address over them. */
export function mintCharterEpoch(fields: CharterEpochFields): CharterEpoch {
  return { ...fields, epochCid: charterEpochCidOf(fields) };
}

/**
 * Seat the GENESIS epoch (sequence 0, no predecessor) from the founding key-set + a PRE-ROTATION
 * commitment to the NEXT epoch's keys. The commitment rides in from OFFLINE custody of the next key-set
 * (KERI pre-rotation), so stealing today's council keys forges no valid successor. An empty commitment
 * leaves rotation UNARMED — `rotateCharterEpoch` then refuses, since nothing stands pre-committed to verify
 * a reveal against.
 */
export function genesisCharterEpoch(keys: readonly string[], threshold: number, nextKeyCommit: string): CharterEpoch {
  return mintCharterEpoch({
    epoch:         0,
    keySetHash:    charterKeySetHash(keys, threshold),
    nextKeyCommit,
    prevEpochCid:  null,
  });
}

/** A rotation attempt's outcome — the advanced epoch, or a fail-closed REFUSAL naming the mismatch. */
export type RotateResult =
  | { readonly ok: true;  readonly epoch: CharterEpoch }
  | { readonly ok: false; readonly reason: string };

/**
 * Advance the chain: REVEAL the pre-committed next key-set and seat it as the new head. FAILS CLOSED three
 * ways — an unarmed head (empty `nextKeyCommit`) refuses; a revealed key-set whose digest does not match
 * the head's `nextKeyCommit` refuses (the reveal was forged, lost, or the wrong threshold); and the caller
 * MUST supply the FOLLOWING commitment so the new head stays pre-rotated. The minted epoch hash-links to
 * `head.epochCid`, so `verifyCharterChain` walks an unbroken, pre-rotated lineage through it.
 */
export function rotateCharterEpoch(
  head:              CharterEpoch,
  revealedKeys:      readonly string[],
  revealedThreshold: number,
  nextKeyCommit:     string,
): RotateResult {
  if (head.nextKeyCommit.length === 0) {
    return { ok: false, reason: "rotation unarmed — the head epoch pre-committed no next key-set" };
  }
  const revealedHash = charterKeySetHash(revealedKeys, revealedThreshold);
  if (revealedHash !== head.nextKeyCommit) {
    return { ok: false, reason: "reveal mismatch — the revealed key-set does not match the head's pre-committed digest" };
  }
  return {
    ok: true,
    epoch: mintCharterEpoch({
      epoch:        head.epoch + 1,
      keySetHash:   revealedHash,
      nextKeyCommit,
      prevEpochCid: head.epochCid,
    }),
  };
}

/** Mint a wax-stamp: sign the artifact under a key authorized by the cited epoch. `sign` yields a hex
 *  Ed25519 signature over `waxStampProofBytes`; the caller supplies a key that hashes into keySetHash. */
export async function mintWaxStamp(input: {
  readonly artifactHash: string;
  readonly epoch: CharterEpoch;
  readonly sealedAt: string;
  readonly sign: (bytes: Uint8Array) => Promise<string>;
}): Promise<WaxStamp> {
  const signature = await input.sign(waxStampProofBytes(input.artifactHash, input.epoch.epochCid, input.sealedAt));
  return { artifactHash: input.artifactHash, epochCid: input.epoch.epochCid, sealedAt: input.sealedAt, signature };
}

/**
 * Verify a wax-stamp's Ed25519 signature against a signer key that the cited epoch AUTHORIZES. Two gates:
 * the signer must hash into the epoch's `keySetHash` (authorized by THIS epoch), AND the signature must
 * verify over the canonical bytes. Compose this into `classifySeal`'s injected `verifySig` (pre-await it
 * per stamp, since classifySeal is synchronous). A reader needs only the PUBLIC charter + the signer key
 * carried on the stamp — never a roster.
 */
export async function verifyWaxStampSig(
  stamp: WaxStamp,
  epoch: CharterEpoch,
  signerKeyHex: string,
  keyInSet: (signerKeyHex: string, keySetHash: string) => boolean = (k, h) => singleKeySetHash(k) === h,
): Promise<boolean> {
  if (!keyInSet(signerKeyHex, epoch.keySetHash)) return false;      // the signer is not authorized by this epoch
  const msg = waxStampProofBytes(stamp.artifactHash, stamp.epochCid, stamp.sealedAt);
  try { return await ed25519.verifyAsync(hexToBytes(stamp.signature), msg, hexToBytes(signerKeyHex)); }
  catch { return false; }
}
