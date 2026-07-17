/**
 * recovery-share — the recovery keel's TYPE layer: it makes "a single party reconstructs the identity"
 * inexpressible. The impersonation-quorum invariant (Camenisch-Lysyanskaya: the recovery quorum IS the
 * impersonation quorum) becomes a compiler error, not a policy promise — a subpoenaed escrow host
 * breaks a promise, never a type. Mirrors the SelfSovereignSecret brand (archive-seal): the reconstructed
 * re-admission authority has exactly ONE door, gated on a Quorum that a lone custodian cannot construct.
 *
 * A share is one point on the GF(256) polynomial (shamir-gf256), TAGGED with WHO holds it. Recovery
 * reconstructs the PersonaGroup-root seed ONLY from a Quorum — shares from ≥ threshold points AND ≥ 2
 * DISTINCT custodians. The escrow-peer / kahu node holds a `RecoveryShare<"escrow-peer">`: one share,
 * one custodian — it can never type-construct a Quorum alone, so it can never reach reconstruction.
 */

import { splitSecret, combineSecret, type ShareBytes } from "./shamir-gf256.js";
import { sha256BytesSync, hex, hexToBytes } from "./crypto.js";
import type { RandomProvider } from "./crypto.js";

/** WHO holds a share — the distinct-custodian rule reads this. A quorum needs ≥ 2 distinct tags. */
export type CustodianTag = "device" | "recorded-code" | "guardian" | "escrow-peer";

/** One share of the recovery secret, bound to its custodian + the refresh generation it belongs to. */
export interface RecoveryShare {
  readonly bytes:         ShareBytes;
  readonly custodian:     CustodianTag;
  readonly recoveryEpoch: number;      // §4 refresh generation — mixed epochs never combine
}

/** A quorum — the ONLY value `reconstructFromQuorum` accepts, minted ONLY by `assembleQuorum`. A bare
 *  RecoveryShare[] does not satisfy it, so no code path reconstructs without passing the quorum gate. */
export type Quorum = readonly RecoveryShare[] & { readonly __quorum: unique symbol };

/** The reconstructed re-admission authority (the PersonaGroup-root seed). The ONLY brander is
 *  `reconstructFromQuorum`; the re-admission minter accepts only this brand (never bare bytes). */
export type ReadmissionSecret = Uint8Array & { readonly __quorumReconstructed: unique symbol };

/**
 * Split a recovery secret (the PersonaGroup-root seed) into shares, one per custodian. The custodian
 * list names WHO gets each share; its length is the share count, and threshold ≤ it. The recorded code
 * is simply the "recorded-code" custodian's share — a share, never a vault key.
 */
export function splitToShares(
  secret: Uint8Array,
  threshold: number,
  custodians: readonly CustodianTag[],
  recoveryEpoch: number,
  rng: RandomProvider,
): RecoveryShare[] {
  if (custodians.length < 2) throw new Error("recovery: a recovery split needs ≥ 2 custodians (no solo quorum)");
  const raw = splitSecret(secret, threshold, custodians.length, rng);
  return raw.map((bytes, i) => ({ bytes, custodian: custodians[i]!, recoveryEpoch }));
}

/**
 * Gather shares into a Quorum — the impersonation-quorum guard, at the type wall. THROWS unless:
 *   • count ≥ threshold,
 *   • the shares come from ≥ 2 DISTINCT custodians (a single-custodian set — one escrow, one peer —
 *     can NEVER become a Quorum: the honeypot is unrepresentable),
 *   • all shares share one recoveryEpoch (a refresh retires old shares),
 *   • x-coordinates are distinct (a degenerate polynomial).
 */
export function assembleQuorum(shares: readonly RecoveryShare[], threshold: number): Quorum {
  if (shares.length < threshold) throw new Error("recovery: below threshold");
  if (new Set(shares.map((s) => s.custodian)).size < 2) {
    throw new Error("recovery: single-custodian quorum forbidden (the recovery quorum IS the impersonation quorum)");
  }
  if (new Set(shares.map((s) => s.recoveryEpoch)).size !== 1) throw new Error("recovery: mixed-epoch shares (stale share)");
  const xs = shares.map((s) => s.bytes.x);
  if (new Set(xs).size !== xs.length) throw new Error("recovery: duplicate share x-coordinate");
  return shares as unknown as Quorum;
}

/** The ONLY door to a ReadmissionSecret. Takes a Quorum — a bare RecoveryShare[] will not compile. The
 *  caller MUST zeroize the returned bytes immediately after signing the re-admit edge (the window bound). */
export function reconstructFromQuorum(q: Quorum): ReadmissionSecret {
  return combineSecret(q.map((s) => s.bytes)) as ReadmissionSecret;
}

// ── Share serialization — the recorded code is a share encoded for human transcription ──────────────
// Floor: hex(x ‖ ys ‖ sha256(x‖ys)[0:2]). The 2-byte checksum catches a transcription slip BEFORE a
// doomed reconstruct (a wrong share silently interpolates garbage — Shamir carries no validity check).
// The SLIP39/BIP39 wordlist encoding for spoken recall is a named deferred nicety.

/** Encode a share's bytes for recording (the recorded-code custodian writes this down). */
export function encodeShareBytes(bytes: ShareBytes): string {
  const payload = new Uint8Array(1 + bytes.ys.length);
  payload[0] = bytes.x;
  payload.set(bytes.ys, 1);
  const checksum = sha256BytesSync(payload).subarray(0, 2);
  const framed = new Uint8Array(payload.length + 2);
  framed.set(payload, 0);
  framed.set(checksum, payload.length);
  return hex(framed);
}

/** Decode a recorded share; THROWS on a checksum mismatch (a transcription slip caught early). */
export function decodeShareBytes(encoded: string): ShareBytes {
  const framed = hexToBytes(encoded);
  if (framed.length < 4) throw new Error("recovery: encoded share too short");
  const payload = framed.subarray(0, framed.length - 2);
  const checksum = framed.subarray(framed.length - 2);
  const expect = sha256BytesSync(payload).subarray(0, 2);
  if (checksum[0] !== expect[0] || checksum[1] !== expect[1]) {
    throw new Error("recovery: share checksum mismatch (transcription error — re-enter the code)");
  }
  return { x: payload[0]!, ys: payload.subarray(1) };
}
