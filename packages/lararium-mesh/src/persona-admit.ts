/**
 * persona-admit — the type-blind PERSONA-ADMISSION ceremony: an airgapped, device-to-device capability handoff
 * that admits a PERSONA onto a target vessel, isomorphic to how a hardware wallet moves signing authority.
 *
 * THE RUNG ABOVE DEVICE-ADMIT. `ceremony-core.runDeviceAdmitEdge` admits a DEVICE into a persona-group fleet;
 * this admits a PERSONA onto a VESSEL — one rung up, and TYPE-BLIND: a `PersonaRef` is a prefix + its current
 * key-material, and NOTHING here branches on operator / user / kahu. One code path admits any of them.
 *
 * DUAL-ADMISSION, PER-VESSEL, NEVER-FEDERATES. The ceremony ends with BOTH vessels holding the SAME
 * mutually-signed `JoinRecord`, each written to its OWN per-vessel multitude-view — a conscious hand-composed
 * join, never an automatic sync. This module MINTS and VERIFIES the records; it never writes a store and never
 * touches a wire. The load-bearing invariant lives at the WRITE site (the caller): the admitted-persona list is
 * per-vessel and MUST NOT fleet-sync — a synced "all my faces" record would be almost a global-now-of-the-self,
 * and a captured vessel must spill only the faces actually admitted TO IT. Separation is composed by WHERE a key
 * is admitted, never dissolved by a convenience sync.
 *
 * THE 3-HOP ECDH-SEALED CHOREOGRAPHY (a photographed tabletop stays inert):
 *   1. ENROLL  (B→A, inert)   B mints a FRESH ephemeral X25519 keypair and shows {B_device_id, B_eph_pubkey,
 *                             nonce_B, expiry}. No authority — just a pubkey + a challenge. B keeps the ephemeral
 *                             SECRET on-device; no QR ever carries it.
 *   2. GRANT   (A→B, inert)   A mints a persona→vessel delegation transcript, SIGNS it with A's persona PREFIX
 *                             current op-key (rotate-not-resurrect), then ECDH-SEALS it to B's ephemeral pubkey,
 *                             binding nonce_B + a fresh nonce_A + expiry. Inert: only the LIVE B holding the
 *                             ephemeral secret opens it; nonce-pinned (no replay onto another offer); expiry-bound;
 *                             and even opened it delegates ONLY to B's specific device key. NO key-at-rest, no
 *                             bearer grant — a delegation edge, exactly as device-admit ("no secret crosses").
 *   3. ACK     (B→A, inert)   B decrypts, verifies A's signature against the persona's PREFIX head + that nonce_B
 *                             echoes + expiry + target, accepts, and SIGNS the JoinRecord with B's device key. A
 *                             verifies the ACK → both hold a matching mutually-signed join record. The 3rd hop is
 *                             load-bearing: dropping it would silent-drop the join from A's log (anti-pono).
 *
 * NO-GLOBAL-NOW: every step reads a LOCAL now against a carried expiry; nothing awaits a reachable authority. The
 * prefix-head check reads the caller's LOCAL persona-KEL replica as-of-last-sync. WAX-SEALS-ONLY: the grant is a
 * signature by the persona's own key, never a registrar row. TRACK-CONTRACTS-NEVER-IDENTITIES: a JoinRecord
 * carries key-material + prefixes + nonces only — no name, no email, no device inventory.
 *
 * CRYPTO: X25519 ECDH (ephemeral↔ephemeral) → HKDF-SHA256 → XChaCha20-Poly1305 AEAD for the seal; Ed25519 for the
 * persona-prefix grant signature + the device ACK signature. All @noble, pure-JS, offline, no wasm, no node-gyp.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/persona-admit
 */

import { x25519 } from "@noble/curves/ed25519.js";
import * as ed25519 from "@noble/ed25519";
import { sealToRecipient, openFromSender } from "./sealed-box.js";
import {
  hex, hexToBytes, utf8Bytes, canonicalJsonBytes, webGetRandomValues,
  base64UrlEncode, base64UrlDecode,
} from "./crypto.js";

// ── Domains — a signature / a key-derivation is meaningless without the domain it was made in ──────────────
export const PERSONA_ENROLL_DOMAIN = "lar-persona-enroll/v1" as const;
export const PERSONA_GRANT_DOMAIN  = "lar-persona-grant/v1" as const;
export const PERSONA_SEALED_DOMAIN = "lar-persona-sealed-grant/v1" as const;
export const PERSONA_JOIN_DOMAIN   = "lar-persona-join/v1" as const;
/**
 * The HKDF `info` string — domain-separates THIS seal's key-derivation from every other X25519 use.
 * `/v2` names the salt widening: the shared `sealed-box` primitive binds the pubkey PAIR ahead of the two
 * challenges (a strict superset of the prior salt), so a v1 and a v2 peer derive different keys and fail closed
 * rather than mis-open. The version carries that break in the open, never as a mystery.
 */
const HKDF_INFO = utf8Bytes("lar-persona-admit/v2/grant-seal");
/** A nonce (challenge) rides 16 bytes; the AEAD nonce rides XChaCha's 24. */
const CHALLENGE_LEN = 16;
const NYM_RE = /^[0-9a-f]{64}$/;

/** A signer over raw bytes → an ed25519 signature hex (the `ed25519SignerFromSeed` shape; the module holds no key). */
export type AdmitSigner = (bytes: Uint8Array) => Promise<string>;

/**
 * A persona reference — TYPE-BLIND. The stable identifier PREFIX (the persona-KEL AID) plus its CURRENT
 * op-key (the head at that prefix). Sign/verify runs against `verifyingKey`, which the open step re-binds to
 * the prefix head (rotate-not-resurrect); a persona that rotated its key still admits under the NEW head.
 */
export interface PersonaRef {
  /** The persona's KEL identifier prefix (AID) — the identity that persists across key rotations. */
  readonly prefix: string;
  /** The persona's CURRENT op-key at that prefix (ed25519 verifying-key hex) — the key the grant signs under. */
  readonly verifyingKey: string;
}

// ── QR#1 — the enrollment offer (B → A), inert ────────────────────────────────────────────────────────────

/** The offer B shows: a target-vessel id + a fresh ephemeral X25519 pubkey + a challenge. Carries NO authority. */
export interface EnrollmentOffer {
  readonly kind:            typeof PERSONA_ENROLL_DOMAIN;
  /** B's device verifying-key hex — the vessel the persona is admitted TO, and the key B's ACK signs under. */
  readonly targetVesselId:  string;
  /** B's FRESH ephemeral X25519 public key (hex) — the ECDH seal target; its secret NEVER leaves B. */
  readonly ephemeralPubkey: string;
  /** A fresh challenge B pins the session to (hex) — the grant must echo it, so a grant cannot replay onto another offer. */
  readonly nonceB:          string;
  /** Epoch-ms validity bound — an offer past this is stale (no global now; read against a local clock). */
  readonly expiry:          number;
}

/** B's on-device SECRET for the session — the ephemeral X25519 secret + the challenge it pinned. NEVER leaves B. */
export interface EnrollmentSecret {
  readonly ephemeralSecret: Uint8Array;
  readonly targetVesselId:  string;
  readonly nonceB:          string;
  readonly expiry:          number;
}

/**
 * B mints an enrollment offer: a fresh ephemeral X25519 keypair (the secret kept on-device) + a challenge. The
 * offer is INERT — a photograph reveals only a public key and a challenge, granting nothing. `targetVesselId` is
 * B's device verifying key (the ACK-sig key); a malformed one throws BEFORE minting (fail-closed).
 */
export function mintEnrollmentOffer(args: {
  readonly targetVesselId: string;
  readonly expiryMs?:      number;   // default 10 minutes — a tabletop hand-off window
  readonly now?:           number;
}): { offer: EnrollmentOffer; secret: EnrollmentSecret } {
  const targetVesselId = args.targetVesselId.toLowerCase();
  if (!NYM_RE.test(targetVesselId)) {
    throw new Error("persona-admit: targetVesselId MUST be a 64-hex ed25519 device verifying key");
  }
  const ephemeralSecret = x25519.utils.randomSecretKey();
  const ephemeralPubkey = hex(x25519.getPublicKey(ephemeralSecret));
  const nonceB = hex(webGetRandomValues(new Uint8Array(CHALLENGE_LEN)));
  const expiry = (args.now ?? Date.now()) + (args.expiryMs ?? 10 * 60_000);
  const offer: EnrollmentOffer = { kind: PERSONA_ENROLL_DOMAIN, targetVesselId, ephemeralPubkey, nonceB, expiry };
  return { offer, secret: { ephemeralSecret, targetVesselId, nonceB, expiry } };
}

// ── QR#2 — the sealed grant (A → B), ECDH-sealed, inert ────────────────────────────────────────────────────

/** The SIGNED delegation transcript — a persona→vessel grant. A's persona-prefix key signs its canonical bytes. */
export interface GrantTranscript {
  readonly kind:           typeof PERSONA_GRANT_DOMAIN;
  readonly personaRef:     PersonaRef;
  /** The delegate — B's device verifying key (the vessel the persona is admitted TO). */
  readonly targetVesselId: string;
  readonly nonceB:         string;   // echoes the offer — binds this grant to THIS enrollment
  readonly nonceA:         string;   // fresh — A's own anti-replay
  readonly expiry:         number;   // grant validity (epoch-ms)
  /**
   * OPTIONAL — a lowercase-hex sha256 that COMMITS the persona signature to a sibling payload the grant CARRIES
   * out-of-band (the STAGE-2 convergence-keyring envelope: a read-key gating who reads every sealed body). The
   * digest rides IN the signed transcript, so a substituted / stripped sibling breaks the binding at the receiver;
   * mesh stays decoupled from the node convergence secret — only this opaque digest string crosses. Omitted →
   * the grant commits to no sibling, and the receiver installs none (a fragment arriving unbound is an injection).
   */
  readonly keyringSealDigest?: string;
}

/** The sealed grant QR#2 carries: A's ephemeral pubkey + the AEAD frame + the sealed {transcript, grantSig}. */
export interface SealedGrant {
  readonly kind:                  typeof PERSONA_SEALED_DOMAIN;
  /** A's ephemeral X25519 public key (hex) — B needs it to complete the ECDH. */
  readonly senderEphemeralPubkey: string;
  /** The XChaCha20-Poly1305 nonce (hex, 24 bytes). */
  readonly aeadNonce:             string;
  /** nonce_A in the CLEAR — B needs it for the HKDF salt BEFORE decrypt; re-verified against the signed transcript. */
  readonly nonceA:                string;
  /** The grant expiry in the CLEAR — a stale grant is refused before any decrypt; re-verified against the transcript. */
  readonly expiry:                number;
  /** The sealed ciphertext of canonical({ transcript, grantSig }) — base64url (the dominant field, kept dense so
   *  the grant carriage fits a single static QR at ECC H; a payload past that ceiling rides the reserved bc-ur leg). */
  readonly ciphertext:            string;
}

/** A's private memo of the grant it sent — kept to verify B's ACK later (never shown, never a QR). */
export interface SentGrantMemo {
  readonly transcript: GrantTranscript;
  readonly grantSig:   string;
}

/**
 * The session challenges this seal salts with, order fixed (B then A) — appended after the pubkey pair the shared
 * `sealed-box` primitive always binds. They pin the derivation to THIS enrollment, so even a repeated ephemeral key
 * derives a fresh seal key.
 */
function grantSaltParts(nonceB: string, nonceA: string): readonly Uint8Array[] {
  return [hexToBytes(nonceB), hexToBytes(nonceA)];
}

/**
 * A mints the grant: verify the offer is in-date, build a persona→vessel delegation transcript, SIGN it with the
 * persona's PREFIX current op-key, then ECDH-SEAL {transcript, grantSig} to B's ephemeral pubkey. INERT: sealed to
 * B's ephemeral key (only the live B opens it), nonce-pinned to the offer, expiry-bound, and target-bound to B's
 * device key. `personaSigner` MUST sign under `personaRef.verifyingKey` (the current op-key); the open step
 * re-binds that key to the prefix head. NO persona seed crosses — the grant is a delegation, not a key-at-rest.
 */
export async function sealPersonaGrant(args: {
  readonly offer:         EnrollmentOffer;
  readonly personaRef:    PersonaRef;
  readonly personaSigner: AdmitSigner;   // signs under personaRef.verifyingKey (the persona-prefix op-key)
  /**
   * OPTIONAL commitment — a lowercase-hex sha256 over an out-of-band sibling payload the caller CARRIES with this
   * grant (the convergence-keyring envelope). Folded INTO the transcript BEFORE signing, so the persona signature
   * covers it; a receiver that opens the grant then binds the arriving sibling to this digest. Omitted → no commit.
   */
  readonly keyringSealDigest?: string;
  readonly expiryMs?:     number;        // default: inherit the offer's remaining window (capped by it)
  readonly now?:          number;
}): Promise<{ sealed: SealedGrant; sent: SentGrantMemo }> {
  const { offer, personaRef } = args;
  const now = args.now ?? Date.now();
  if (offer.kind !== PERSONA_ENROLL_DOMAIN) throw new Error("persona-admit: not an enrollment offer");
  if (!NYM_RE.test(offer.targetVesselId.toLowerCase())) throw new Error("persona-admit: offer targetVesselId malformed");
  if (offer.expiry <= now) throw new Error("persona-admit: enrollment offer has expired");
  if (!NYM_RE.test(personaRef.verifyingKey.toLowerCase())) throw new Error("persona-admit: personaRef.verifyingKey must be 64-hex");
  if (!personaRef.prefix) throw new Error("persona-admit: personaRef.prefix required");

  const nonceA = hex(webGetRandomValues(new Uint8Array(CHALLENGE_LEN)));
  // The grant NEVER outlives the offer — cap the grant expiry by the offer's (a stale offer can't be re-opened late).
  const expiry = Math.min(offer.expiry, now + (args.expiryMs ?? 10 * 60_000));
  const transcript: GrantTranscript = {
    kind:           PERSONA_GRANT_DOMAIN,
    personaRef:     { prefix: personaRef.prefix, verifyingKey: personaRef.verifyingKey.toLowerCase() },
    targetVesselId: offer.targetVesselId.toLowerCase(),
    nonceB:         offer.nonceB,
    nonceA,
    expiry,
    // Fold the sibling commitment in BEFORE signing when present; omit it otherwise, so a keyring-free grant keeps
    // the exact canonical byte-image it always signed (canonicalJson sorts keys, so placement here is immaterial).
    ...(args.keyringSealDigest ? { keyringSealDigest: args.keyringSealDigest.toLowerCase() } : {}),
  };
  const grantSig = await args.personaSigner(canonicalJsonBytes(transcript));

  // ECDH-seal to B's ephemeral pubkey with A's OWN fresh ephemeral (ephemeral↔ephemeral — no static A key rides).
  const box = sealToRecipient({
    recipientPub: hexToBytes(offer.ephemeralPubkey),
    plaintext:    canonicalJsonBytes({ transcript, grantSig }),
    info:         HKDF_INFO,
    extraSalt:    grantSaltParts(offer.nonceB, nonceA),
  });

  const sealed: SealedGrant = {
    kind: PERSONA_SEALED_DOMAIN,
    senderEphemeralPubkey: hex(box.senderEphemeralPub),
    aeadNonce: hex(box.aeadNonce),
    nonceA,
    expiry,
    ciphertext: base64UrlEncode(box.ciphertext),   // base64url — the dense encoding that keeps the grant a single QR
  };
  return { sealed, sent: { transcript, grantSig } };
}

// ── B opens the grant ─────────────────────────────────────────────────────────────────────────────────────

/** The accepted grant B holds after opening + verifying QR#2 — the delegation, ready to ACK + write per-vessel. */
export interface AcceptedGrant {
  readonly transcript: GrantTranscript;
  readonly grantSig:   string;
  /** The persona-prefix head op-key the grant verified against (rotate-not-resurrect proof). */
  readonly headOpKey:  string;
}

export type GrantVerdict =
  | { readonly ok: true;  readonly accepted: AcceptedGrant }
  | { readonly ok: false; readonly reason: string };

/**
 * B opens the sealed grant: complete the ECDH with the on-device ephemeral secret, decrypt, then verify —
 *   · A's grant signature against the persona PREFIX HEAD op-key (ruling: rotate-not-resurrect; the caller's
 *     `resolveHeadOpKey` reads the LOCAL persona-KEL replica). A grant signed by a SUPERSEDED key rejects.
 *   · the transcript's `verifyingKey` IS that live head (a grant naming a stale key rejects),
 *   · nonce_B echoes B's own offer (binds to THIS enrollment — no cross-offer replay),
 *   · nonce_A + expiry match the cleartext frame (the cleartext that keyed the seal cannot lie about the signed body),
 *   · the grant is in-date and targets B's own vessel.
 * FAIL-CLOSED at every shore: a decrypt failure (wrong key / tamper / a photograph opened without the ephemeral
 * secret) returns `{ ok:false }`, never a throw — the grant DID NOT ARRIVE.
 */
export async function openPersonaGrant(args: {
  readonly sealed:           SealedGrant;
  readonly secret:           EnrollmentSecret;
  /** Resolve the CURRENT op-key at a persona prefix off the LOCAL KEL replica (null when unknown/unsynced → deny). */
  readonly resolveHeadOpKey: (prefix: string) => Promise<string | null> | string | null;
  readonly now?:             number;
}): Promise<GrantVerdict> {
  const { sealed, secret } = args;
  const now = args.now ?? Date.now();
  if (sealed.kind !== PERSONA_SEALED_DOMAIN) return { ok: false, reason: "not a sealed persona grant" };
  if (sealed.expiry <= now || secret.expiry <= now) return { ok: false, reason: "grant or enrollment expired" };

  // Complete the ECDH with B's on-device ephemeral secret + decrypt. A wrong key / tamper / a photographed QR
  // opened without the ephemeral secret all fail the AEAD here — the one gate a captured tabletop cannot pass.
  let body: { transcript: GrantTranscript; grantSig: string };
  const DECRYPT_REFUSED = "decrypt-failed — the sealed grant did not open (wrong session, tampered, or a photograph without the ephemeral secret)";
  try {
    const plaintext = openFromSender({
      recipientSecret:    secret.ephemeralSecret,
      senderEphemeralPub: hexToBytes(sealed.senderEphemeralPubkey),
      aeadNonce:          hexToBytes(sealed.aeadNonce),
      ciphertext:         base64UrlDecode(sealed.ciphertext),
      info:               HKDF_INFO,
      extraSalt:          grantSaltParts(secret.nonceB, sealed.nonceA),
    });
    if (!plaintext) return { ok: false, reason: DECRYPT_REFUSED };   // the box withheld — one reason for every cause
    body = JSON.parse(new TextDecoder().decode(plaintext)) as { transcript: GrantTranscript; grantSig: string };
  } catch {
    return { ok: false, reason: DECRYPT_REFUSED };   // a malformed carriage draws the SAME refusal
  }

  const t = body?.transcript;
  if (!t || t.kind !== PERSONA_GRANT_DOMAIN) return { ok: false, reason: "malformed grant transcript" };
  // The cleartext that keyed the seal MUST match the signed body — else a mangled frame could mis-key silently.
  if (t.nonceA !== sealed.nonceA || t.expiry !== sealed.expiry) return { ok: false, reason: "grant frame does not match the signed transcript" };
  if (t.nonceB !== secret.nonceB) return { ok: false, reason: "nonce_B does not echo this enrollment (replayed grant)" };
  if (t.targetVesselId.toLowerCase() !== secret.targetVesselId.toLowerCase()) return { ok: false, reason: "grant targets a different vessel" };
  if (t.expiry <= now) return { ok: false, reason: "grant expired" };

  // Ruling: verify against the persona PREFIX HEAD (rotate-not-resurrect). The transcript's op-key MUST be the
  // live head, and the signature MUST verify against it — a grant off a superseded key is refused.
  const head = await args.resolveHeadOpKey(t.personaRef.prefix);
  if (!head) return { ok: false, reason: "persona prefix has no resolvable KEL head (unknown/unsynced) — cannot verify the grant" };
  if (head.toLowerCase() !== t.personaRef.verifyingKey.toLowerCase()) {
    return { ok: false, reason: "grant op-key is not the persona prefix head (a rotated/superseded key cannot admit)" };
  }
  let sigOk = false;
  try { sigOk = await ed25519.verifyAsync(hexToBytes(body.grantSig), canonicalJsonBytes(t), hexToBytes(head)); }
  catch { sigOk = false; }
  if (!sigOk) return { ok: false, reason: "grant signature does not verify against the persona prefix head" };

  return { ok: true, accepted: { transcript: t, grantSig: body.grantSig, headOpKey: head.toLowerCase() } };
}

// ── QR#3 — the ACK (B → A), inert ──────────────────────────────────────────────────────────────────────────

/** The mutually-signed join record BOTH vessels hold at the end — the per-vessel multitude-view entry. */
export interface JoinRecord {
  readonly kind:           typeof PERSONA_JOIN_DOMAIN;
  readonly personaRef:     PersonaRef;
  readonly targetVesselId: string;   // B — the vessel the persona was admitted to
  readonly granterKey:     string;   // A's persona op-key that signed the grant (= personaRef.verifyingKey)
  readonly nonceA:         string;
  readonly nonceB:         string;
  readonly expiry:         number;
  readonly grantSig:       string;   // A's signature over the grant transcript — proves A granted
}

/** QR#3 carries the join record + B's device signature over it (B accepted). */
export interface JoinAck {
  readonly joinRecord: JoinRecord;
  readonly ackSig:     string;   // B's device-key signature over canonical(joinRecord)
}

/** Canonicalize the join record for signing/verifying — the ONE byte-image both the ACK and its verify hash. */
function joinRecordBytes(rec: JoinRecord): Uint8Array {
  return canonicalJsonBytes(rec);
}

/**
 * B builds + signs the ACK: assemble the JoinRecord from the accepted grant and sign it with B's DEVICE key. The
 * ACK is INERT — a signature over a public record; a photograph reveals only that B accepted, and its bindings
 * (personaRef + target + nonces) make it un-replayable onto a different join.
 */
export async function mintJoinAck(args: {
  readonly accepted:     AcceptedGrant;
  readonly secret:       EnrollmentSecret;
  readonly deviceSigner: AdmitSigner;   // signs under secret.targetVesselId (B's device key)
}): Promise<{ ack: JoinAck; joinRecord: JoinRecord }> {
  const t = args.accepted.transcript;
  const joinRecord: JoinRecord = {
    kind:           PERSONA_JOIN_DOMAIN,
    personaRef:     t.personaRef,
    targetVesselId: t.targetVesselId,
    granterKey:     t.personaRef.verifyingKey,
    nonceA:         t.nonceA,
    nonceB:         t.nonceB,
    expiry:         t.expiry,
    grantSig:       args.accepted.grantSig,
  };
  const ackSig = await args.deviceSigner(joinRecordBytes(joinRecord));
  return { ack: { joinRecord, ackSig }, joinRecord };
}

export type AckVerdict =
  | { readonly ok: true;  readonly joinRecord: JoinRecord }
  | { readonly ok: false; readonly reason: string };

/**
 * A verifies B's ACK: the join record MUST echo the grant A actually sent (`sent` memo — personaRef, target,
 * both nonces, expiry, grantSig), and B's device signature MUST verify over it against B's device key
 * (`targetVesselId`). On success A holds the SAME mutually-signed JoinRecord B holds — the dual-admission is
 * composed. A's caller then writes it to A's OWN per-vessel multitude-view (never fleet-synced).
 *
 * FAIL-CLOSED: any mismatch against the sent memo, or a bad ACK signature, refuses — A never records a join it
 * did not grant, and never one B did not sign.
 */
export async function verifyJoinAck(args: {
  readonly ack:  JoinAck;
  readonly sent: SentGrantMemo;
  readonly now?: number;
}): Promise<AckVerdict> {
  const { ack, sent } = args;
  const rec = ack?.joinRecord;
  if (!rec || rec.kind !== PERSONA_JOIN_DOMAIN) return { ok: false, reason: "malformed join record" };
  const t = sent.transcript;
  // Echo-check the join record against the grant A actually sent — a forged/altered join never records.
  if (rec.personaRef.prefix !== t.personaRef.prefix || rec.personaRef.verifyingKey.toLowerCase() !== t.personaRef.verifyingKey.toLowerCase())
    return { ok: false, reason: "join record names a different persona than the sent grant" };
  if (rec.targetVesselId.toLowerCase() !== t.targetVesselId.toLowerCase()) return { ok: false, reason: "join record targets a different vessel" };
  if (rec.nonceA !== t.nonceA || rec.nonceB !== t.nonceB) return { ok: false, reason: "join record nonces do not echo the sent grant" };
  if (rec.expiry !== t.expiry) return { ok: false, reason: "join record expiry does not match the sent grant" };
  if (rec.grantSig !== sent.grantSig) return { ok: false, reason: "join record carries a different grant signature" };
  if (rec.granterKey.toLowerCase() !== t.personaRef.verifyingKey.toLowerCase()) return { ok: false, reason: "join record granterKey mismatch" };

  let sigOk = false;
  try { sigOk = await ed25519.verifyAsync(hexToBytes(ack.ackSig), joinRecordBytes(rec), hexToBytes(rec.targetVesselId)); }
  catch { sigOk = false; }
  if (!sigOk) return { ok: false, reason: "ACK signature does not verify against B's device key" };

  return { ok: true, joinRecord: rec };
}
