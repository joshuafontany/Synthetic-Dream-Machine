/**
 * vessel-identity-core — the platform-blind Ed25519 keypair lifecycle.
 *
 * The generate-or-load-then-persist skeleton repeats across every vessel identity:
 * the node device key, the node PersonaGroup root, the browser device key. It
 * collapses here. Each platform supplies two seams —
 *
 *   · KeypairCrypto — how this runtime mints + hex-encodes an Ed25519 pair
 *     (node generateKeyPairSync; browser WebCrypto subtle),
 *   · KeypairStore  — how this runtime persists ONE keypair slot
 *     (node 0o600 file in the wipe-zone-sibling dir; browser IndexedDB),
 *
 * and keeps its OWN platform law on top (node: KERI pre-rotation, git-hint file
 * naming, ContactCard custody; browser: IDB store names). The core owns only the
 * shared SHAPE + the control flow — never the platform secrets handling.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/vessel-identity-core
 */

import { hexToBytes } from "./crypto.js";

/** A persisted Ed25519 keypair, hex-encoded. The signingKey never syncs. */
export interface PersistedKeypair {
  /** Hex-encoded 32-byte Ed25519 verifying (public) key. Input to did:key. */
  verifyingKey: string;
  /** Hex-encoded 32-byte Ed25519 private seed. Local signing only. */
  signingKey: string;
}

/** How a runtime persists one keypair (a single named slot). */
export interface KeypairStore {
  /** Load the persisted keypair, or undefined when the slot is empty. */
  load(): Promise<PersistedKeypair | undefined>;
  /** Persist a freshly minted keypair into the slot. */
  save(keypair: PersistedKeypair): Promise<void>;
}

/** How a runtime mints a fresh Ed25519 keypair, hex-encoded. */
export interface KeypairCrypto {
  generate(): Promise<PersistedKeypair>;
}

/**
 * The generate-or-load skeleton: returns the verifying key and whether THIS call
 * minted a fresh pair (`created`). On a fresh mint the keypair persists through the
 * store BEFORE returning — so a caller layering an inception commitment (KERI
 * pre-rotation) runs strictly AFTER the key reaches durable storage.
 */
export async function generateOrLoadKeypair(
  store: KeypairStore,
  crypto: KeypairCrypto,
): Promise<{ verifyingKey: string; created: boolean }> {
  const existing = await store.load();
  if (existing) return { verifyingKey: existing.verifyingKey, created: false };
  const fresh = await crypto.generate();
  await store.save(fresh);
  return { verifyingKey: fresh.verifyingKey, created: true };
}

/**
 * Decode a hex signing key into the 32-byte Ed25519 seed. Validates the
 * 64-hex-char (32-byte) length first — a malformed slot throws rather than
 * yielding a short seed. Rides the canonical `hexToBytes`.
 */
export function signingSeedFromHex(signingKeyHex: string): Uint8Array {
  if (signingKeyHex.length !== 64) {
    throw new TypeError(
      `signing seed: expected 64 hex chars (32 bytes), got ${signingKeyHex.length}`,
    );
  }
  return hexToBytes(signingKeyHex);
}
