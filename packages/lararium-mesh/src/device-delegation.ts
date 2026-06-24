/**
 * device-delegation — the signed capability edge that binds a vessel to its operator.
 *
 * Under capability-is-identity (lar:///ha.ka.ba/@lares/v0.1/api/pono/lararium-identity
 * #capability-and-petnames), the DELEGATION EDGE *is* the relationship and the capability:
 * the operator root signs "Operator O delegates to Device D at place P", and any peer
 * verifies it offline against a PINNED operator root. S7.1 (CAPABILITY-LAYER, Plane 0→1).
 *
 * The edge is a STANDING MEMBERSHIP grant (long-lived, revocable), NOT a per-use proof:
 * per-use replay defense (nonce + short exp + seen-cache) rides a separate INVOCATION
 * (the UCAN delegation/invocation split) — a follow-on, not this module. Revocation rides
 * the CRDT membership graph (observed-remove) + a backstop edge-id blocklist + the epoch
 * hammer for re-founding — wiring concerns, noted at the verify site.
 *
 * Canonical signed string (domain + version tagged for separation; every field strict-
 * charset so no `|` can shift a boundary):
 *   lar-device-delegation/v1|{operatorDid}|{deviceDid}|{deviceVerifyingKey}|{placeId}|{issuedAt}|{expiresAt}
 *
 * Trust rides the SIGNATURE + the PINNED root, never a doc's write-ACL (confused-deputy
 * guard). Hardened against the verification swarm's kue (2026-06-24): never throws on
 * untrusted input · mandatory operator-root pin · exp/freshness · canonical lowercase DIDs
 * · strict ZIP215-off verify · domain/version separation. Reuses the mesh's bare-Ed25519
 * surface (@noble/ed25519 v3 + ./crypto hex).
 */

import * as ed25519 from "@noble/ed25519";
import { hex, hexToBytes } from "./crypto.js";

export const DEVICE_DELEGATION_DOMAIN = "lar-device-delegation/v1" as const;

/** Clock drift tolerance for the freshness window (matches the V3 auth-proof posture / UCAN ±60s). */
export const DELEGATION_CLOCK_DRIFT_MS = 60_000;

const DID_RE  = /^0x[0-9a-f]{64}$/;       // "0x" + raw 32-byte Ed25519 verifying-key hex, lowercase
const VK_RE   = /^[0-9a-f]{64}$/;          // raw 32-byte verifying-key hex, lowercase
const SIG_RE  = /^[0-9a-f]{128}$/;         // 64-byte Ed25519 signature hex, lowercase
const ISO_RE  = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const PLACE_RE = /^[A-Za-z0-9._:/@-]*$/;   // CID / lar:-name safe; no `|`, no whitespace; "" allowed (place-agnostic)

/** "0x" + raw 32-byte Ed25519 verifying-key hex (lowercase). */
export type LarDid = string;

export interface DeviceDelegationTiddler {
  readonly kind:                "device-delegation";
  /** "0x"+hex — the operator root that SIGNED this edge; the verifier checks against it AND the pin. */
  readonly operatorDid:         LarDid;
  /** "0x"+hex — the delegate vessel (MUST equal "0x"+deviceVerifyingKey). */
  readonly deviceDid:           LarDid;
  /** raw 32-byte Ed25519 verifying-key hex (64, lowercase) of the delegate vessel. */
  readonly deviceVerifyingKey:  string;
  /** the place this edge is bound to — the hearth's public true-name (genesis CID), or "" if place-agnostic. */
  readonly placeId:             string;
  /** ISO-8601 issue instant (caller-supplied; no ambient clock). */
  readonly issuedAt:            string;
  /** ISO-8601 expiry instant — bounds the replay window even absent synchronous revocation. */
  readonly expiresAt:           string;
  /** Ed25519 signature hex (128) over the canonical proof string, by the operator root. */
  readonly signature:           string;
}

const didFromVerifyingKey = (vkHex: string): LarDid => `0x${vkHex}`;
const verifyingKeyFromDid = (did: string): string => (did.startsWith("0x") ? did.slice(2) : did);

type ProofFields = Pick<
  DeviceDelegationTiddler,
  "operatorDid" | "deviceDid" | "deviceVerifyingKey" | "placeId" | "issuedAt" | "expiresAt"
>;

function delegationProofBytes(d: ProofFields): Uint8Array {
  return new TextEncoder().encode(
    `${DEVICE_DELEGATION_DOMAIN}|${d.operatorDid}|${d.deviceDid}|${d.deviceVerifyingKey}|${d.placeId}|${d.issuedAt}|${d.expiresAt}`,
  );
}

/**
 * Field hygiene shared by build (throws — controlled minter) and verify (returns reason —
 * untrusted CRDT input). Strict-charset on EVERY field closes delimiter injection entirely
 * (no field can carry `|`) and honors verify's "never throws" contract via typeof guards.
 */
function fieldError(d: Partial<DeviceDelegationTiddler>): string | null {
  if (d.kind !== "device-delegation")                            return "not a device-delegation";
  if (typeof d.operatorDid !== "string" || !DID_RE.test(d.operatorDid))                 return "operatorDid not 0x+32-byte lowercase hex";
  if (typeof d.deviceVerifyingKey !== "string" || !VK_RE.test(d.deviceVerifyingKey))    return "deviceVerifyingKey not 32-byte lowercase hex";
  if (typeof d.deviceDid !== "string" || d.deviceDid !== didFromVerifyingKey(d.deviceVerifyingKey)) return "deviceDid not bound to deviceVerifyingKey";
  if (typeof d.placeId !== "string" || !PLACE_RE.test(d.placeId))                       return "placeId has illegal characters";
  if (typeof d.issuedAt !== "string" || !ISO_RE.test(d.issuedAt))                       return "issuedAt not strict ISO-8601";
  if (typeof d.expiresAt !== "string" || !ISO_RE.test(d.expiresAt))                     return "expiresAt not strict ISO-8601";
  if (typeof d.signature !== "string" || !SIG_RE.test(d.signature))                     return "signature not 64-byte lowercase hex";
  return null;
}

/**
 * Mint a signed device-delegation edge. The operator's 32-byte seed signs; operatorDid
 * derives from that same seed (self-attribution). `issuedAt`/`expiresAt`/`placeId` are
 * caller-supplied (pure, no ambient clock). Throws on malformed inputs — it is the
 * controlled minter, never fed untrusted data.
 */
export async function buildDeviceDelegation(args: {
  operatorSeed:       Uint8Array; // operator root 32-byte Ed25519 seed (the signer)
  deviceVerifyingKey: string;     // raw Ed25519 verifying-key hex (64, lowercase) of the delegate
  placeId:            string;     // hearth true-name (genesis CID), or "" if place-agnostic
  issuedAt:           string;     // ISO-8601
  expiresAt:          string;     // ISO-8601 — bound the validity window (generous is fine; bounded matters)
}): Promise<DeviceDelegationTiddler> {
  const operatorDid = didFromVerifyingKey(hex(await ed25519.getPublicKeyAsync(args.operatorSeed)));
  const fields: ProofFields = {
    operatorDid,
    deviceDid:          didFromVerifyingKey(args.deviceVerifyingKey),
    deviceVerifyingKey: args.deviceVerifyingKey,
    placeId:            args.placeId,
    issuedAt:           args.issuedAt,
    expiresAt:          args.expiresAt,
  };
  const candidate = { kind: "device-delegation" as const, ...fields, signature: "0".repeat(128) };
  const err = fieldError(candidate);
  if (err) throw new Error(`[device-delegation] cannot mint: ${err}`);
  const signature = hex(await ed25519.signAsync(delegationProofBytes(fields), args.operatorSeed));
  return { ...candidate, signature };
}

/**
 * Verify a device-delegation edge offline. NEVER throws on bad input (returns {ok,reason}).
 *
 * MANDATORY PIN: `expectedOperatorDid` is the trusted operator root the edge MUST chain to.
 * A clear result proves the edge was signed by THAT root for THIS delegate — designation
 * carries authority, no ambient fallback. (verify proving only "someone signed" was the
 * confused-deputy bait the verification swarm flagged; the pin is now a required argument.)
 *
 * Freshness: pass `opts.now` (verifier clock, ms) to enforce the [issuedAt-drift, expiresAt]
 * window; omit it to check the signature alone (pure-crypto tests). Strict RFC8032 verify
 * (`zip215:false`) → strongly-binding signatures (exclusive ownership; safe to key dedup on
 * canonical content, never on the malleable signature bytes).
 */
export async function verifyDeviceDelegation(
  edge: DeviceDelegationTiddler,
  expectedOperatorDid: string,
  opts?: { now?: number; driftMs?: number },
): Promise<{ ok: boolean; reason?: string }> {
  const err = fieldError(edge);
  if (err) return { ok: false, reason: err };

  // PIN — the edge's operator MUST be the trusted root (compare canonical key bytes).
  if (typeof expectedOperatorDid !== "string" || !DID_RE.test(expectedOperatorDid)) {
    return { ok: false, reason: "expectedOperatorDid not 0x+32-byte lowercase hex" };
  }
  if (edge.operatorDid !== expectedOperatorDid) {
    return { ok: false, reason: "operator is not the pinned root" };
  }

  // Freshness — bound replay even without synchronous revocation.
  if (opts?.now !== undefined) {
    const drift   = opts.driftMs ?? DELEGATION_CLOCK_DRIFT_MS;
    const issued  = Date.parse(edge.issuedAt);
    const expires = Date.parse(edge.expiresAt);
    if (Number.isNaN(issued) || Number.isNaN(expires)) return { ok: false, reason: "unparseable time bounds" };
    if (expires <= issued)              return { ok: false, reason: "expiresAt not after issuedAt" };
    if (opts.now > expires + drift)     return { ok: false, reason: "delegation expired" };
    if (opts.now < issued - drift)      return { ok: false, reason: "delegation not yet valid" };
  }

  try {
    const ok = await ed25519.verifyAsync(
      hexToBytes(edge.signature),
      delegationProofBytes(edge),
      hexToBytes(verifyingKeyFromDid(edge.operatorDid)),
      { zip215: false },
    );
    return ok ? { ok: true } : { ok: false, reason: "signature mismatch" };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "ed25519 verify threw" };
  }
}
