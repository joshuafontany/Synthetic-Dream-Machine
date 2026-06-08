/**
 * leaf-identity — the LIGHT sovereign identity a short-lived leaf actor carries.
 *
 * A one-shot `lares` CLI run (or an AI-agent turn) acts as a sovereign peer
 * WITHOUT booting keyhive (operator-peer #actor-parity OP-AP5, meme
 * lar:///ha.ka.ba/@lararium/v0.1/mesh/operator-peer). It holds only:
 *   - the operator Ed25519 seed → a bare signer (no keyhive), and
 *   - the cached ContactCard JSON minted once at `lares init`.
 * With these it presents a self-certifying identity and signs the V3
 * proof-of-possession at the peer-boundary gate. The full keyhive engine boots
 * once on the always-on RELAY, which verifies leaf proofs in its keyholder worker.
 *
 * The ContactCard carries no expiry/nonce — re-presented forever; proof freshness
 * rides the per-challenge nonce + timestamp, never the cached card.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/leaf-identity
 */

import { ed25519SignerFromSeed } from "@lararium/mesh";
import { loadOperatorSigningSeed, loadOperatorVerifyingKey, loadOperatorCard } from "./operator-key.js";

export interface LeafIdentity {
  /** The cached self-certifying ContactCard JSON, re-presented each handshake. */
  contactCard: string;
  /** The operator verifying-key hex — the leaf's claimed identity (the relay's
   *  keyhive derives the same key as the suffix of the card-resolved Identifier). */
  peerPubKey:  string;
  /** Bare-Ed25519 signer over the operator seed → hex. No keyhive. */
  sign:        (bytes: Uint8Array) => Promise<string>;
}

/**
 * Load the operator's light leaf identity from disk (seed + cached card). Throws
 * when either artifact is absent — the caller must run `lares init` first (it
 * generates the keypair and mints + caches the ContactCard).
 */
export async function loadLeafIdentity(dataDir: string): Promise<LeafIdentity> {
  const [seed, peerPubKey, contactCard] = await Promise.all([
    loadOperatorSigningSeed(dataDir),
    loadOperatorVerifyingKey(dataDir),
    loadOperatorCard(dataDir),
  ]);
  return { contactCard, peerPubKey, sign: ed25519SignerFromSeed(seed) };
}
