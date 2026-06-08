/**
 * auth-wire — vessel-to-vessel pre-sync authentication protocol.
 *
 * These messages flow over a raw WebSocket BEFORE the Automerge sync handshake
 * begins. The exchange establishes the connecting vessel's Keyhive identity and
 * proves it holds cap=admin on the target document.
 *
 * Wire sequence (gate initiates):
 *   Gate → Peer  : LarChallengeMsg  (fresh nonce)
 *   Peer → Gate  : LarAuthMsg       (Keyhive ContactCard + nonce echo)
 *   Gate → Peer  : LarAuthOkMsg     (auth passed — Automerge join may proceed)
 *              OR      LarAuthDeniedMsg  (ws.close(4003) follows immediately)
 *
 * Alpha note: nonce signature verification (replay protection) is stubbed — the
 * ContactCard's self-certifying `signature()` plus `accessForDoc` provides the
 * primary gate. Full challenge-response signature verification lands in S9.6.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/auth-wire
 */

import { canonicalJsonBytes } from "./crypto.js";

export const AUTH_WIRE_VERSION = "1" as const;
export type AuthWireVersion = typeof AUTH_WIRE_VERSION;

/** Gate → Peer: start of auth exchange. */
export interface LarChallengeMsg {
  type:    "lar:challenge";
  nonce:   string; // 32-byte hex, gate-generated per connection
  version: AuthWireVersion;
}

/** Peer → Gate: identity assertion. */
export interface LarAuthMsg {
  type:        "lar:auth";
  contactCard: string; // Keyhive ContactCard.toJson() — self-certifying identity packet
  nonce:       string; // echo of gate nonce
  /**
   * Ed25519 signature (hex) over authProofBytes({nonce, gatePubKey, peerPubKey, aud, ts})
   * — the V3 proof-of-possession (project_verification_placement). Alpha posture still
   * accepts a nonce echo until the gate flips enforcement; buildAuthResponse produces the
   * real signature.
   */
  sig:         string;
  /** Peer timestamp the signature commits to (the verifier recomputes the proof with it). */
  ts?:         string;
  version:     AuthWireVersion;
}

/** Gate → Peer: auth passed, Automerge join may proceed. */
export interface LarAuthOkMsg {
  type:    "lar:auth-ok";
  version: AuthWireVersion;
}

/** Gate → Peer: auth failed, ws.close(4003) follows immediately. */
export interface LarAuthDeniedMsg {
  type:    "lar:auth-denied";
  reason:  string;
  version: AuthWireVersion;
}

export type LarAuthWireMsg =
  | LarChallengeMsg
  | LarAuthMsg
  | LarAuthOkMsg
  | LarAuthDeniedMsg;

// ── Type guards ───────────────────────────────────────────────────────────────

export function isLarChallengeMsg(v: unknown): v is LarChallengeMsg {
  return (
    typeof v === "object" && v !== null &&
    (v as Record<string, unknown>)["type"] === "lar:challenge" &&
    typeof (v as Record<string, unknown>)["nonce"] === "string"
  );
}

export function isLarAuthMsg(v: unknown): v is LarAuthMsg {
  return (
    typeof v === "object" && v !== null &&
    (v as Record<string, unknown>)["type"] === "lar:auth" &&
    typeof (v as Record<string, unknown>)["contactCard"] === "string" &&
    typeof (v as Record<string, unknown>)["nonce"] === "string"
  );
}

export function isLarAuthOkMsg(v: unknown): v is LarAuthOkMsg {
  return (
    typeof v === "object" && v !== null &&
    (v as Record<string, unknown>)["type"] === "lar:auth-ok"
  );
}

export function isLarAuthDeniedMsg(v: unknown): v is LarAuthDeniedMsg {
  return (
    typeof v === "object" && v !== null &&
    (v as Record<string, unknown>)["type"] === "lar:auth-denied"
  );
}

// ── Constructors ──────────────────────────────────────────────────────────────

export function mkLarChallenge(nonce: string): LarChallengeMsg {
  return { type: "lar:challenge", nonce, version: AUTH_WIRE_VERSION };
}

export function mkLarAuth(
  contactCard: string,
  nonce: string,
  sig: string,
): LarAuthMsg {
  return { type: "lar:auth", contactCard, nonce, sig, version: AUTH_WIRE_VERSION };
}

export function mkLarAuthOk(): LarAuthOkMsg {
  return { type: "lar:auth-ok", version: AUTH_WIRE_VERSION };
}

export function mkLarAuthDenied(reason: string): LarAuthDeniedMsg {
  return { type: "lar:auth-denied", reason, version: AUTH_WIRE_VERSION };
}

// ── Proof-of-possession (V3 — challenge-response) ───────────────────────────

/**
 * authProofBytes — the canonical bytes a connecting peer signs to PROVE it HOLDS
 * its identity's private key (V3, see project_verification_placement). The proof
 * binds, in one signature: the gate `nonce` (freshness), the GATE's own pubkey
 * (the GATE-BINDING — the load-bearing field; signing only the nonce stays
 * relayable, so a malicious gate could replay the proof to a different gate;
 * WebAuthn, the FIDO formal proof, and Keyhive Notebook §05 all require binding
 * the gate identity), the peer's claimed pubkey, the target bag `aud`, and a
 * timestamp (bounds the replay window). The verifier — the keyholder worker —
 * checks the Ed25519 signature against the ContactCard's verifying key.
 *
 * Canonical JSON (stable key order) so sign and verify produce identical bytes.
 * NEVER sign the nonce alone.
 *
 * NOT YET WIRED (impl spike surfaced 2026-06-07): the peer signer (the CLI/
 * admin-connector holds no seed today) and the worker-side Ed25519 verify against
 * the card key. This helper LOCKS the canonical what-to-sign; the sign/verify
 * plumbing is the next focused build.
 */
export function authProofBytes(parts: {
  nonce:       string;  // gate-issued, single-use, short-TTL
  gatePubKey:  string;  // the gate's verifying key (hex) — the gate-binding
  peerPubKey:  string;  // the connecting peer's claimed identity (hex)
  aud:         string;  // the target bag URI the peer seeks
  ts:          string;  // ISO timestamp — bounds the replay window
}): Uint8Array {
  return canonicalJsonBytes({
    v:          AUTH_WIRE_VERSION,
    nonce:      parts.nonce,
    gatePubKey: parts.gatePubKey,
    peerPubKey: parts.peerPubKey,
    aud:        parts.aud,
    ts:         parts.ts,
  });
}

/**
 * buildAuthResponse — the PEER half of V3 proof-of-possession: given the
 * challenge parts + the peer's contactCard + a `sign` fn (Ed25519 over bytes →
 * hex), produce the signed `lar:auth`. The signature commits to the GATE-BOUND
 * proof (authProofBytes), so a relay cannot replay it to a different gate.
 *
 * `sign` stays injected — no keyhive dep enters mesh. The CLI/peer sources it from
 * the operator signer (Signer.trySign / memorySignerFromBytes over the operator
 * seed). Pairs with authProofBytes (the gate's what-to-sign).
 *
 * NOT YET WIRED (V3 integration, planned 2026-06-07): the peer handshake does
 * not exist yet (no live mkLarAuth caller) — the CLI must boot a keyhive/signer
 * and run challenge→response before Automerge sync; the gate must add gatePubKey
 * to lar:challenge and verify this sig via the worker seam.
 */
export async function buildAuthResponse(parts: {
  contactCard: string;
  nonce:       string;
  gatePubKey:  string;
  peerPubKey:  string;
  aud:         string;
  ts:          string;
  sign:        (bytes: Uint8Array) => Promise<string> | string;
}): Promise<LarAuthMsg> {
  const proof = authProofBytes({
    nonce:      parts.nonce,
    gatePubKey: parts.gatePubKey,
    peerPubKey: parts.peerPubKey,
    aud:        parts.aud,
    ts:         parts.ts,
  });
  const sig = await parts.sign(proof);
  return {
    type:        "lar:auth",
    contactCard: parts.contactCard,
    nonce:       parts.nonce,
    sig,
    ts:          parts.ts,
    version:     AUTH_WIRE_VERSION,
  };
}

/**
 * PeerHandshake — the seam the platform-blind handshake composes over. NOT an
 * adapter tower: a small data descriptor + injected functions. The TRANSPORT
 * (recv/send) injects per platform (node isomorphic-ws · browser WebSocket); the
 * IDENTITY (contactCard/peerPubKey/sign) injects from the isomorphic keyhive
 * provider + operator signer. One core, composed everywhere — no per-vessel fork.
 */
export interface PeerHandshake {
  /** Await the next wire message (the platform WS message, promisified). */
  recv:        () => Promise<unknown>;
  /** Send a wire message (the platform WS send + JSON encode). */
  send:        (msg: LarAuthMsg) => void;
  /** This peer's self-certifying ContactCard JSON. */
  contactCard: string;
  /** This peer's verifying-key hex (its claimed identity). */
  peerPubKey:  string;
  /** The gate's verifying-key hex (the gate-binding the proof commits to). */
  gatePubKey:  string;
  /** The target bag URI the peer seeks. */
  aud:         string;
  /** Ed25519 sign over bytes → hex (operator signer / Signer.trySign). */
  sign:        (bytes: Uint8Array) => Promise<string> | string;
  /** Clock for the response timestamp (default: now, ISO). */
  now?:        () => string;
}

/**
 * runPeerHandshake — the platform-blind peer half of V3, lifted ABOVE any
 * vessel: receive lar:challenge → sign the gate-bound proof → send lar:auth →
 * await the verdict. Node, browser, and the CLI all compose this one flow with
 * their own transport + the shared keyhive identity. Resolves the auth verdict;
 * the caller proceeds to Automerge sync only on `{ ok: true }`.
 */
export async function runPeerHandshake(h: PeerHandshake): Promise<{ ok: boolean; reason?: string }> {
  const challenge = await h.recv();
  if (!isLarChallengeMsg(challenge)) return { ok: false, reason: "expected lar:challenge" };
  const auth = await buildAuthResponse({
    contactCard: h.contactCard,
    nonce:       challenge.nonce,
    gatePubKey:  h.gatePubKey,
    peerPubKey:  h.peerPubKey,
    aud:         h.aud,
    ts:          (h.now ?? (() => new Date().toISOString()))(),
    sign:        h.sign,
  });
  h.send(auth);
  const verdict = await h.recv();
  if (isLarAuthOkMsg(verdict))     return { ok: true };
  if (isLarAuthDeniedMsg(verdict)) return { ok: false, reason: verdict.reason };
  return { ok: false, reason: "unexpected message after lar:auth" };
}
