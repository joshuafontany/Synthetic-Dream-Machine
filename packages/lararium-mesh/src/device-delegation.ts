/**
 * device-delegation — the signed capability edge that binds a vessel to its operator.
 *
 * Under capability-is-identity (lar:///ha.ka.ba/@lares/v0.1/api/pono/lararium-identity
 * #capability-and-petnames), the DELEGATION EDGE *is* the relationship and the capability:
 * the operator root signs "Operator O delegates to Device D"; any peer verifies it offline
 * (zero network calls). The signed record reifies the user×vessel bond — the key is the
 * node, the delegation is the relationship. S7.1 (CAPABILITY-LAYER, Plane 0→1).
 *
 * Canonical proof string (the exact bytes signed / recomputed):
 *   device-delegation|{operatorDid}|{deviceDid}|{deviceVerifyingKey}|{issuedAt}
 *
 * Trust rides the SIGNATURE, never a doc's write-ACL (the confused-deputy guard): an
 * unsigned or bad-signature edge fails loud with a reason, never falls through to ambient
 * trust. Reuses the mesh's bare-Ed25519 surface (@noble/ed25519 v3 async + ./crypto hex).
 *
 * SECURITY-CRITICAL · greenfield — awaiting an adversarial verification pass (a verify bug
 * = forgeable delegations, the Matrix-S&P / confused-deputy class). Tamper + forgery +
 * did↔key-binding rejection are covered in tests/device-delegation.test.ts.
 */

import * as ed25519 from "@noble/ed25519";
import { hex, hexToBytes } from "./crypto.js";

const enc = new TextEncoder();
const RAW_HEX_64  = /^[0-9a-fA-F]{64}$/;
const SIG_HEX_128 = /^[0-9a-fA-F]{128}$/;

/** "0x" + raw 32-byte Ed25519 verifying-key hex. */
export type LarDid = string;

export interface DeviceDelegationTiddler {
  readonly kind:                "device-delegation";
  /** "0x"+hex — the operator root that SIGNED this edge; the verifier checks against it. */
  readonly operatorDid:         LarDid;
  /** "0x"+hex — the delegate vessel. */
  readonly deviceDid:           LarDid;
  /** raw 32-byte Ed25519 verifying-key hex (64) of the delegate vessel. */
  readonly deviceVerifyingKey:  string;
  /** ISO-8601 issue instant the signature commits to (caller-supplied — no clock here). */
  readonly issuedAt:            string;
  /** Ed25519 signature hex (128) over the canonical proof string, by the operator root. */
  readonly signature:           string;
}

const didFromVerifyingKey = (vkHex: string): LarDid => `0x${vkHex}`;
const verifyingKeyFromDid = (did: LarDid): string => (did.startsWith("0x") ? did.slice(2) : did);

/** The exact bytes the operator signs and the verifier recomputes. */
function delegationProofBytes(
  d: Pick<DeviceDelegationTiddler, "operatorDid" | "deviceDid" | "deviceVerifyingKey" | "issuedAt">,
): Uint8Array {
  return enc.encode(
    `device-delegation|${d.operatorDid}|${d.deviceDid}|${d.deviceVerifyingKey}|${d.issuedAt}`,
  );
}

/**
 * Mint a signed device-delegation edge. The operator's 32-byte seed signs; the operatorDid
 * derives from that same seed, so the edge always self-attributes to its signer. `issuedAt`
 * is caller-supplied (keeps this pure + testable; no ambient clock).
 */
export async function buildDeviceDelegation(args: {
  operatorSeed:       Uint8Array; // operator root 32-byte Ed25519 seed (the signer)
  deviceVerifyingKey: string;     // raw Ed25519 verifying-key hex (64) of the delegate vessel
  issuedAt:           string;     // ISO-8601
}): Promise<DeviceDelegationTiddler> {
  if (!RAW_HEX_64.test(args.deviceVerifyingKey)) {
    throw new Error("[device-delegation] deviceVerifyingKey must be 32-byte hex (64 chars)");
  }
  const operatorDid = didFromVerifyingKey(hex(await ed25519.getPublicKeyAsync(args.operatorSeed)));
  const deviceDid   = didFromVerifyingKey(args.deviceVerifyingKey);
  const fields = {
    operatorDid,
    deviceDid,
    deviceVerifyingKey: args.deviceVerifyingKey,
    issuedAt:           args.issuedAt,
  };
  const signature = hex(await ed25519.signAsync(delegationProofBytes(fields), args.operatorSeed));
  return { kind: "device-delegation", ...fields, signature };
}

/**
 * Verify a device-delegation edge offline. Checks shape, the did↔key binding, and the
 * operator's signature over the recomputed canonical bytes. NEVER throws on bad input —
 * fails loud with a reason (the confused-deputy guard).
 *
 * CONSERVATIVE-CALLER LAW (mirrors verifyAuthProof): a clear result proves only that
 * `operatorDid` SIGNED this edge — it does NOT decide whether that operator is TRUSTED.
 * The caller MUST pin the expected operator root (compare `operatorDid` to the known
 * operator / PersonGroup root) before honoring the delegation; otherwise an attacker mints
 * a self-consistent edge under their own operatorDid and it "verifies" against itself.
 */
export async function verifyDeviceDelegation(
  d: DeviceDelegationTiddler,
): Promise<{ ok: boolean; reason?: string }> {
  if (d.kind !== "device-delegation")          return { ok: false, reason: "not a device-delegation" };
  if (!SIG_HEX_128.test(d.signature))          return { ok: false, reason: "signature not 64-byte hex" };
  if (!RAW_HEX_64.test(d.deviceVerifyingKey))  return { ok: false, reason: "deviceVerifyingKey not 32-byte hex" };
  const operatorVk = verifyingKeyFromDid(d.operatorDid);
  if (!RAW_HEX_64.test(operatorVk))            return { ok: false, reason: "operatorDid not 0x+32-byte hex" };
  // did↔key binding: the deviceDid MUST be the 0x-form of its own verifying key.
  if (d.deviceDid !== didFromVerifyingKey(d.deviceVerifyingKey)) {
    return { ok: false, reason: "deviceDid does not match deviceVerifyingKey" };
  }
  try {
    const ok = await ed25519.verifyAsync(
      hexToBytes(d.signature),
      delegationProofBytes(d),
      hexToBytes(operatorVk),
    );
    return ok ? { ok: true } : { ok: false, reason: "signature mismatch" };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "ed25519 verify threw" };
  }
}
