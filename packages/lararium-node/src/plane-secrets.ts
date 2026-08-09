/**
 * plane-secrets — which planes hold SECRETS whose whole value rests on staying unpublished?
 *
 * A reach credential (a foreign app secret a vessel holds so a human posts outward from their wiki) stops
 * meaning anything the moment it goes world-readable. So its plane floors at CONTRACT, and the tier keystone
 * meets every declaration against that floor — a secrets bag declaring PUBLIC comes straight back down.
 * Publishing one becomes impossible rather than forbidden.
 *
 * THE NAME CARRIES THE PROPERTY, NEVER THE INSTANCE. Credentials arrive first; anything whose bytes lose
 * their meaning on publication belongs here beside them.
 *
 * ── WHY A REGISTRY AND NOT A LABEL, AND HOW THE SEVERITY DIFFERS FROM plane-seal ─────────────────
 * The seal registry exists because a doc claiming //sealed// would claim a LOOSENING — a false claim there
 * opens a blind-transit lane over cleartext, so registration rides strictly as a side-effect of the encrypt
 * path and a doc can never self-label. A doc claiming //secrets// claims a TIGHTENING, which the keystone
 * permits from any source, so the same claim here could not disclose anything.
 *
 * It still rides a registry, for two reasons worth keeping in view. The floor names what the STRUCTURE is,
 * not what a doc says it is, and a floor that read a claim would stop being structural. And a false secrets
 * claim, while it discloses nothing, DENIES — an adversary able to write a plane label could quietly stop a
 * public bag from ever federating, which surfaces as nothing at all rather than as an error.
 *
 * FAIL-CLOSED reads the other way here than in plane-seal, and deliberately: an empty registry answers false,
 * so an unregistered doc floors by its OTHER readings. Nothing is silently protected, and nothing is silently
 * published either — a secrets store that never registers simply never gains the extra floor, which surfaces
 * the moment its bag reads publishable.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/reach-plane#the-vault-reads-as-a-bag
 */

import type { DocumentId } from "@automerge/automerge-repo";

/** The floor's reading: does this doc hold contract-floored secrets? */
export interface ContractSecretsPlane {
  isContractSecretsPlane(documentId: DocumentId): boolean;
}

/** No plane holds secrets — the correct reading while no secrets store stands. */
export const NO_CONTRACT_SECRETS_PLANE: ContractSecretsPlane = {
  isContractSecretsPlane(_documentId: DocumentId): boolean { return false; },
};

/**
 * A LIVE, growable secrets-plane registry. `plane` reads the CURRENT set, so a store registered after a
 * gate closed over the oracle takes its floor immediately; `register` is the only door in.
 *
 * The sole caller is whatever act STANDS a secrets store — the same discipline the sealed registry keeps,
 * so the set records what a creating path did rather than what a doc asserts about itself.
 */
export interface ContractSecretsRegistry {
  /** The reading a floor oracle holds — live over the current set. */
  readonly plane: ContractSecretsPlane;
  /** Record a docId as a secrets plane. Called by the act that stands the store, never by the store itself. */
  register(documentId: DocumentId): void;
  /** How many secrets planes stand (audit / test). */
  readonly size: number;
}

/** Stand a live secrets-plane registry. Empty at birth, so it behaves exactly as `NO_CONTRACT_SECRETS_PLANE`. */
export function makeContractSecretsRegistry(): ContractSecretsRegistry {
  const secrets = new Set<DocumentId>();
  return {
    plane: { isContractSecretsPlane(documentId: DocumentId): boolean { return secrets.has(documentId); } },
    register(documentId: DocumentId): void { secrets.add(documentId); },
    get size(): number { return secrets.size; },
  };
}
