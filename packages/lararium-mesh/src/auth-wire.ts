/**
 * auth-wire — vessel-to-vessel pre-sync authentication protocol.
 *
 * These messages flow over a raw WebSocket BEFORE the Automerge sync handshake
 * begins. The exchange establishes the connecting vessel's Keyhive identity and
 * proves it holds cap=admin on the target document.
 *
 * Wire sequence (server initiates):
 *   Server → Client  : LarChallengeMsg  (fresh nonce)
 *   Client → Server  : LarAuthMsg       (Keyhive ContactCard + nonce echo)
 *   Server → Client  : LarAuthOkMsg     (auth passed — Automerge join may proceed)
 *              OR      LarAuthDeniedMsg  (ws.close(4003) follows immediately)
 *
 * Alpha note: nonce signature verification (replay protection) is stubbed — the
 * ContactCard's self-certifying `signature()` plus `accessForDoc` provides the
 * primary gate. Full challenge-response signature verification lands in S9.6.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/auth-wire
 */

export const AUTH_WIRE_VERSION = "1" as const;
export type AuthWireVersion = typeof AUTH_WIRE_VERSION;

/** Server → Client: start of auth exchange. */
export interface LarChallengeMsg {
  type:    "lar:challenge";
  nonce:   string; // 32-byte hex, server-generated per connection
  version: AuthWireVersion;
}

/** Client → Server: identity assertion. */
export interface LarAuthMsg {
  type:        "lar:auth";
  contactCard: string; // Keyhive ContactCard.toJson() — self-certifying identity packet
  nonce:       string; // echo of server nonce
  /** Alpha stub: echo of nonce hex. S9.6 replaces with Ed25519(nonce_bytes, identityKey). */
  sig:         string;
  version:     AuthWireVersion;
}

/** Server → Client: auth passed, Automerge join may proceed. */
export interface LarAuthOkMsg {
  type:    "lar:auth-ok";
  version: AuthWireVersion;
}

/** Server → Client: auth failed, ws.close(4003) follows immediately. */
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
