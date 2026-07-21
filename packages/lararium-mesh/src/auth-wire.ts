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
 * Alpha note: V3 proof-of-possession — ENFORCED end to end. The platform-blind
 * halves (`authProofBytes` · `buildAuthResponse` · `verifyAuthProof` ·
 * `runPeerHandshake` · `ed25519SignerFromSeed`) compose the full path: the gate
 * emits its gate-binding key in lar:challenge and relays {nonce, sig, ts} to the
 * keyholder worker, which checks the Ed25519 proof against the card key + its own
 * key and folds the result into admission (step D). The peer transport
 * (LarWSClientAdapter, node) sources a real proof from the light leaf identity
 * (bare-Ed25519 signer + cached ContactCard). A node operator MAY relax to
 * capability-only with LAR_V3_ALLOW_UNPROVEN=1. See `project_verification_placement`,
 * `operator-peer` #actor-parity. Live two-vessel smoke test remains the open verify.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/auth-wire
 */

import * as ed25519 from "@noble/ed25519";
import { canonicalJsonBytes, hex, hexToBytes } from "./crypto.js";
import type { DeviceDelegationTiddler } from "./device-delegation.js";

export const AUTH_WIRE_VERSION = "1" as const;
export type AuthWireVersion = typeof AUTH_WIRE_VERSION;

/** Gate → Peer: start of auth exchange. */
export interface LarChallengeMsg {
  type:    "lar:challenge";
  nonce:   string; // 32-byte hex, gate-generated per connection
  /**
   * The gate's verifying-key hex — the gate-binding the peer's proof commits to
   * (the verifier recomputes with its OWN key, so a relay to a different gate
   * fails). Optional for back-compat: a gate armed without it omits the field;
   * once the peer transport (C) + enforcement flip (D) land it becomes load-bearing.
   */
  gatePubKey?: string;
  version: AuthWireVersion;
}

/**
 * AuthProofWire — the V3 proof material a gate relays from the peer's `lar:auth`
 * to the keyholder worker (the only verifier). Deliberately carries NO pubkeys:
 * the worker supplies `gatePubKey` (its own verifying key) and `peerPubKey` (the
 * ContactCard-derived suffix) from TRUSTED sources, never the wire (see
 * verifyAuthProof's conservative-caller law). Only freshness/replay material crosses.
 */
export interface AuthProofWire {
  nonce: string;
  sig:   string;
  ts:    string;
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
  /**
   * OPTIONAL device-delegation edge. A peer the operator device-admitted carries the
   * signed root→device edge so the gate can admit it on the operator's-own-device path even
   * absent a cap=admin grant. Untrusted CRDT input — the worker verifies it against the PINNED
   * hearth root (verifyDeviceDelegation); a peer that sends none behaves exactly as before.
   */
  edge?:       DeviceDelegationTiddler;
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

export function mkLarChallenge(nonce: string, gatePubKey?: string): LarChallengeMsg {
  return {
    type: "lar:challenge", nonce,
    ...(gatePubKey ? { gatePubKey } : {}),
    version: AUTH_WIRE_VERSION,
  };
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
 * This helper LOCKS the canonical what-to-sign; both halves compose over it — the
 * peer signs via buildAuthResponse (run by runPeerHandshake, live in
 * lar-ws-client-adapter) and the gate/worker verifies via verifyAuthProof
 * (daemon-auth-gate + operator-daemon-behavior). The local CLI speaks the daemon's
 * sock, gated by 0600 presence; the peer proof rides the WS relay surface.
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
 * AUTH_PROOF_TTL_MS — the freshness window (half-width) a proof's `ts` must fall
 * within of the verifier's clock. Bounds the replay window once the gate nonce
 * rotates (DPoP `iat` / Beelay timestamp discipline). 60 s allows machine clock
 * skew on a machine-to-machine path with no human interaction.
 */
export const AUTH_PROOF_TTL_MS = 60_000;

/**
 * ed25519SignerFromSeed — a bare-Ed25519 signer (32-byte seed → `sign(bytes)=>hex`)
 * for the LIGHT leaf-identity path (operator-peer #actor-parity OP-AP5): a
 * short-lived leaf signs the V3 proof with NO keyhive. Pairs with
 * `buildAuthResponse`/`runPeerHandshake`'s injected `sign`. A signature this
 * produces verifies identically to one from `KH.Signer.memorySignerFromBytes(seed)`
 * against the same verifying key (the @keyhive signer wraps the same key material).
 */
export function ed25519SignerFromSeed(seed: Uint8Array): (bytes: Uint8Array) => Promise<string> {
  return async (bytes) => hex(await ed25519.signAsync(bytes, seed));
}

/**
 * verifyAuthProof — the VERIFIER half of V3 proof-of-possession: the counterpart
 * to `buildAuthResponse`. Recompute the gate-bound proof (authProofBytes) and
 * check the peer's Ed25519 signature against its claimed verifying key.
 *
 * CONSERVATIVE-CALLER LAW: this helper checks a signature over the bytes handed to
 * it — it does NOT decide what to trust. The keyholder worker (the only place
 * that holds the peer's real key and the gate's own key) MUST pass TRUSTED values,
 * never wire-claimed ones: `gatePubKey` = the verifier's OWN verifying key (so the
 * proof only clears if the peer signed for THIS gate — anti-relay), `peerPubKey` =
 * the verifying-key suffix of the ContactCard-derived Identifier (so the proof only
 * clears for the card actually presented). `nonce` = the gate-issued challenge value
 * the verifier remembers. If a peer signed for a different gate or claimed a key it
 * does not hold, the recomputed bytes diverge and the signature fails. NEVER feed
 * this the `peerPubKey`/`gatePubKey` a peer asserts on the wire.
 *
 * `now` opt-in: pass the verifier clock (ms) to enforce the freshness window; omit
 * to check the signature alone (pure-crypto unit tests). Uses `verifyAsync`, which
 * needs no global hash injection (@noble/ed25519 v3).
 */
export async function verifyAuthProof(parts: {
  nonce:       string;
  gatePubKey:  string;
  peerPubKey:  string;  // raw ed25519 verifying-key hex (64 chars) — the key the sig verifies against
  aud:         string;
  ts:          string;
  sig:         string;  // ed25519 signature hex (128 chars)
  now?:        number;  // verifier clock (ms); omit to skip the freshness window
  ttlMs?:      number;  // freshness half-width (default AUTH_PROOF_TTL_MS)
}): Promise<{ ok: boolean; reason?: string }> {
  // Shape guards — reject malformed key/sig material before touching crypto.
  if (!/^[0-9a-fA-F]{64}$/.test(parts.peerPubKey))  return { ok: false, reason: "peerPubKey not 32-byte hex" };
  if (!/^[0-9a-fA-F]{128}$/.test(parts.sig))        return { ok: false, reason: "sig not 64-byte hex" };

  // Freshness — bounded replay window once the nonce rotates.
  if (parts.now !== undefined) {
    const tsMs = Date.parse(parts.ts);
    if (Number.isNaN(tsMs)) return { ok: false, reason: "ts not a valid timestamp" };
    const ttl = parts.ttlMs ?? AUTH_PROOF_TTL_MS;
    if (Math.abs(parts.now - tsMs) > ttl) return { ok: false, reason: "proof outside freshness window" };
  }

  const proof = authProofBytes({
    nonce:      parts.nonce,
    gatePubKey: parts.gatePubKey,
    peerPubKey: parts.peerPubKey,
    aud:        parts.aud,
    ts:         parts.ts,
  });
  let ok = false;
  try {
    ok = await ed25519.verifyAsync(hexToBytes(parts.sig), proof, hexToBytes(parts.peerPubKey));
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "ed25519 verify threw" };
  }
  return ok ? { ok: true } : { ok: false, reason: "signature mismatch" };
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
 * V3 integration runs live: runPeerHandshake (lar-ws-client-adapter) boots the
 * signer and runs challenge→response before Automerge sync; the gate
 * (daemon-auth-gate) issues gatePubKey on lar:challenge and verifies this sig via
 * the worker seam (verifyAuthProof).
 */
export async function buildAuthResponse(parts: {
  contactCard: string;
  nonce:       string;
  gatePubKey:  string;
  peerPubKey:  string;
  aud:         string;
  ts:          string;
  sign:        (bytes: Uint8Array) => Promise<string> | string;
  /** OPTIONAL device-delegation edge ridden alongside the proof. */
  edge?:       DeviceDelegationTiddler;
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
    ...(parts.edge ? { edge: parts.edge } : {}),
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
  /** OPTIONAL device-delegation edge — a device-admitted leaf rides its edge to the gate. */
  edge?:       DeviceDelegationTiddler;
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
    ...(h.edge ? { edge: h.edge } : {}),
  });
  h.send(auth);
  const verdict = await h.recv();
  if (isLarAuthOkMsg(verdict))     return { ok: true };
  if (isLarAuthDeniedMsg(verdict)) return { ok: false, reason: verdict.reason };
  return { ok: false, reason: "unexpected message after lar:auth" };
}

/**
 * LeafIdentity — the LIGHT sovereign identity a leaf actor carries to the peer gate: a cached
 * self-certifying ContactCard + a bare-Ed25519 signer (no keyhive). Platform-blind: the node loads
 * it from disk (`loadLeafIdentity`), the browser builds it from its operatorSeed + founding card.
 * Lifted here (from node) so both vessels — and the isomorphic LarWSClientAdapter — share one core.
 */
export interface LeafIdentity {
  /** The cached self-certifying ContactCard JSON, re-presented each handshake. */
  contactCard: string;
  /** The operator verifying-key hex — the leaf's claimed identity. */
  peerPubKey:  string;
  /** Bare-Ed25519 signer over the operator seed → hex. No keyhive. */
  sign:        (bytes: Uint8Array) => Promise<string>;
  /** OPTIONAL device-delegation edge — a device-admitted leaf presents its edge to admit. */
  edge?:       DeviceDelegationTiddler;
}
