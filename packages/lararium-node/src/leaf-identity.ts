/**
 * leaf-identity — the LIGHT sovereign identity a short-lived leaf actor carries.
 *
 * A one-shot `lares` CLI run (or an AI-agent turn) acts as a sovereign peer
 * WITHOUT booting keyhive (operator-peer #actor-parity OP-AP5, meme
 * lar:///ha.ka.ba/lararium/mesh/operator-peer). It holds only:
 *   - the operator Ed25519 seed → a bare signer (no keyhive), and
 *   - the cached ContactCard JSON minted once at `lares vessel found`.
 * With these it presents a self-certifying identity and signs the V3
 * proof-of-possession at the peer-boundary gate. The full keyhive engine boots
 * once on the always-on RELAY, which verifies leaf proofs in its keyholder worker.
 *
 * The ContactCard carries no expiry/nonce — re-presented forever; proof freshness
 * rides the per-challenge nonce + timestamp, never the cached card.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/leaf-identity
 */

import { ed25519SignerFromSeed } from "@lararium/mesh";
import type { LeafIdentity } from "@lararium/mesh";
import { loadVesselSigningSeed, loadVesselVerifyingKey, loadVesselCard } from "./node-vessel-identity.js";

// LeafIdentity lifted to platform-blind mesh (both vessels + the isomorphic adapter share it);
// re-exported here for node consumers.
export type { LeafIdentity } from "@lararium/mesh";

/**
 * Load the operator's light leaf identity from disk (seed + cached card). Throws
 * when either artifact is absent — the caller must run `lares vessel found` first (it
 * generates the keypair and mints + caches the ContactCard).
 */
export async function loadLeafIdentity(dataDir: string): Promise<LeafIdentity> {
  const [seed, peerPubKey, contactCard] = await Promise.all([
    loadVesselSigningSeed(dataDir),
    loadVesselVerifyingKey(dataDir),
    loadVesselCard(dataDir),
  ]);
  return { contactCard, peerPubKey, sign: ed25519SignerFromSeed(seed) };
}
