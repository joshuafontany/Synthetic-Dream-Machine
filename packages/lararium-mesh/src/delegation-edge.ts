/**
 * delegation-edge — ONE primitive for "a signer vouched for this subject, at this epoch".
 *
 * The shape kept re-appearing under different names. A fleet-proof binds a published face to the persona
 * root that speaks for it; a dyad-binding binds a vessel×veil relationship into a fleet. Both carry a
 * signer, an epoch, and a signature over a canonical subject — the same act, twice named, with two
 * byte-builders and two verify paths that could drift apart without anyone noticing.
 *
 * They differ in exactly one thing: WHAT the signature covers. So the subject rides as a caller-supplied
 * record and a DOMAIN separates the uses, which keeps an edge minted for one purpose from verifying at
 * another. One primitive, many bindings, no drift.
 *
 * WHAT AN EDGE DECLINES TO CARRY stays as load-bearing as what it holds. No member list, no device key,
 * no roster — a verifier learns that the named signer vouched for this subject and nothing else, because
 * nothing else was ever put in. The privacy rests on absence rather than on a proof system, which keeps
 * the whole instrument one signature-verify wide.
 *
 * THE EPOCH ORDERS IT, NEVER A TIMESTAMP. A binding roots on a content-addressed epoch, walkable from a
 * local replica; a wall-clock reading would assert a global instant that a causal island cannot hold.
 *
 * Platform-blind: rides ./crypto only. NO node: imports.
 * Meme: lar:///ha.ka.ba/lararium/mesh/attestation-plane
 */

import { canonicalJsonBytes } from "./crypto.js";

/** A signer's vouch for one subject, at one epoch. The only delegation shape this stack mints. */
export interface DelegationEdge {
  /** "0x"+hex or raw hex — the key that signed, and all a verifier needs beside the edge itself. */
  readonly signer: string;
  /** The epoch this vouch roots on. An ORDER, never an instant. */
  readonly epoch:  string;
  /** ed25519 over `delegationBytes(domain, subject, signer, epoch)`, by `signer`. */
  readonly sig:    string;
}

/**
 * The bytes an edge signs.
 *
 * `domain` separates the uses so an edge minted to bind a face cannot verify as one binding a device —
 * the same reason the antigen and the members board sign under distinct domains. `subject` names exactly
 * what this vouch covers, so an edge cannot lift off one subject and land on another.
 */
export function delegationBytes(
  domain: string,
  subject: Readonly<Record<string, string>>,
  signer: string,
  epoch: string,
): Uint8Array {
  return canonicalJsonBytes({ kind: domain, subject, signer, epoch });
}

/** Mint an edge — run where the signing key lives, never on the vessel that will present it. */
export async function signDelegationEdge(
  domain: string,
  subject: Readonly<Record<string, string>>,
  signer: string,
  epoch: string,
  sign: (bytes: Uint8Array) => Promise<string>,
): Promise<DelegationEdge> {
  return { signer, epoch, sig: await sign(delegationBytes(domain, subject, signer, epoch)) };
}

/**
 * Does this edge hold? One verify, offline — no lookup, no clock, no pairing.
 *
 * An ABSENT edge reads false without reading dishonest: a subject that claims no binding fails no claim.
 * A caller separates "unbound" from "refuted" by checking for the edge itself.
 */
export async function verifyDelegationEdge(
  domain: string,
  subject: Readonly<Record<string, string>>,
  edge: DelegationEdge | null | undefined,
  verify: (bytes: Uint8Array, sigHex: string, signerDid: string) => Promise<boolean>,
): Promise<boolean> {
  if (!edge?.signer || !edge.sig || !edge.epoch) return false;
  return verify(delegationBytes(domain, subject, edge.signer, edge.epoch), edge.sig, edge.signer)
    .catch(() => false);
}

/** The domains this stack mints edges under. A new use adds a string here, never a second primitive. */
export const DELEGATION_DOMAIN = {
  /** A published face ← the persona root that speaks for its fleet. */
  fleetProof:  "lar-fleet-proof/v1",
  /** A vessel×veil relationship ← the group root that gathered it. */
  dyadBinding: "lar-dyad-binding/v1",
} as const;
