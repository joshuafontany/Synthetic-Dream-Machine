/**
 * persona-identity — the persona master-seed lifecycle + the two-key atom.
 *
 * Doctrine (canon: lar:///ha.ka.ba/@lares/api/pono/persona-circle, #the-atom +
 * #composition):
 *
 *   The base atom carries TWO keys, a real two-axis substrate ≠ sovereignty:
 *     · vessel-key       — the device/substrate identity. DEVICE-MINTED on its
 *                          own device, the private half never leaving
 *                          (vessel-identity-core). It is NEVER derived from the
 *                          persona seed — deriving it would be the Model-A
 *                          copy-the-key antipattern that dissolves per-device
 *                          revocation (Veilid/SSB).
 *     · veiled-user-key  — the sovereign pseudonym presented through the veil.
 *                          The persona side: it AND the whole persona
 *                          constellation derive from ONE seed via ed25519
 *                          HD-derivation, all-hardened paths (persona-hd,
 *                          SLIP-0010 — structurally immune to the xpub-linkage
 *                          trap). Recover the seed → re-derive the constellation.
 *
 * This file carries the persona master-seed lifecycle (one seed per human, may
 * live on several of the human's own devices), the path convention naming the
 * persona tree, the veiled-user-key derivation, and the two-key atom assembly
 * (pairing the DEVICE-MINTED vessel verifyingKey — passed in, never derived —
 * with the derived veiled-user verifyingKey).
 *
 * Platform-blind: rides ./persona-hd + ./crypto only. NO node: imports. The
 * randomness arrives through an injected `randomBytes` seam (platform supplies
 * globalThis.crypto.getRandomValues) — NEVER a hardcoded crypto source.
 *
 * DEFER (a later cut — NOT built here): advanced seed CUSTODY + RECOVERY (DKMS,
 * social/trustee recovery, rotation-under-unlinkability). This cut carries the
 * basic lifecycle + derivation + atom assembly only.
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/persona-identity
 */

import { derivePersonaKeypair } from "./persona-hd.js";

/** The persona master-seed length in bytes (a fresh 32-byte ed25519-HD seed). */
export const PERSONA_SEED_BYTES = 32;

/**
 * The persona-tree path convention — a BIP44-like ALL-HARDENED two-level tree
 * over the master seed: `m / handle' / context'`.
 *
 *   · handleIndex  (handle')  — selects the handle-Circle / PersonaGroup (the
 *                               "Known Handle with multiple vessels"). Two
 *                               distinct handles share NO derived key material —
 *                               unlinkable-by-construction at the key layer.
 *   · contextIndex (context') — selects the binding WITHIN that handle-Circle
 *                               (the vessel~veil context-self).
 *
 * SLIP-0010 ed25519 admits ONLY hardened derivation, so every level hardens
 * internally (persona-hd.deriveHardenedChild). This is the convention, not a
 * registry — callers own their own index allocation.
 */
export const PERSONA_PATH_DEPTH = 2;

/** A persona derivation path: the RAW [handleIndex, contextIndex] indices. */
export interface PersonaPath {
  /** handle' — selects the handle-Circle / PersonaGroup. */
  handleIndex: number;
  /** context' — selects the vessel~veil binding within the handle-Circle. */
  contextIndex: number;
}

/** Build the RAW path tuple for `derivePersonaKeypair` from a PersonaPath. */
export function personaPathIndices(handleIndex: number, contextIndex: number): readonly number[] {
  return [handleIndex, contextIndex];
}

/**
 * How a runtime persists the human's ONE persona master seed.
 *
 * Distinct from KeypairStore (vessel-identity-core): that slot holds a
 * device-minted vessel keypair; THIS slot holds the human's constellation root,
 * one per human (which may live on several of the human's own devices).
 */
export interface PersonaSeedStore {
  /** Load the persisted seed, or undefined when the slot is empty. */
  load(): Promise<Uint8Array | undefined>;
  /** Persist a freshly generated seed into the slot. */
  save(seed: Uint8Array): Promise<void>;
}

/**
 * generateOrLoadPersonaSeed — the persona master-seed lifecycle.
 *
 * Loads the existing seed; failing that, generates a fresh 32-byte seed through
 * the injected `randomBytes` seam, PERSISTS it BEFORE returning (mirroring
 * generateOrLoadKeypair's persist-before-return control flow, so any layer
 * keying off the seed runs strictly AFTER it reaches durable storage), and
 * reports whether THIS call minted it (`created`).
 *
 * `randomBytes` MUST source platform CSPRNG bytes (the platform supplies
 * globalThis.crypto.getRandomValues) — the seam never hardcodes a crypto source.
 */
export async function generateOrLoadPersonaSeed(
  store: PersonaSeedStore,
  randomBytes: (n: number) => Uint8Array,
): Promise<{ seed: Uint8Array; created: boolean }> {
  const existing = await store.load();
  if (existing) return { seed: existing, created: false };
  const fresh = randomBytes(PERSONA_SEED_BYTES);
  if (fresh.length !== PERSONA_SEED_BYTES) {
    throw new TypeError(
      `generateOrLoadPersonaSeed: randomBytes must return ${PERSONA_SEED_BYTES} bytes, got ${fresh.length}`,
    );
  }
  await store.save(fresh);
  return { seed: fresh, created: true };
}

/**
 * deriveVeiledUserKey — derive the veiled-user (persona) keypair at a path.
 *
 * Wraps `derivePersonaKeypair(seed, [handleIndex, contextIndex])` along the
 * all-hardened `m / handle' / context'` convention. Returns hex strings matching
 * the repo's PersistedKeypair convention (signingKey = 32-byte private seed,
 * verifyingKey = bare 32-byte ed25519 public key).
 */
export async function deriveVeiledUserKey(
  seed: Uint8Array,
  handleIndex: number,
  contextIndex: number,
): Promise<{ signingKey: string; verifyingKey: string }> {
  return derivePersonaKeypair(seed, personaPathIndices(handleIndex, contextIndex));
}

/**
 * The two PUBLIC keys of a `vessel~veil` binding (canon #the-atom).
 *
 * The two halves NEVER co-surface as secrets — this carries only the public
 * verifying keys, the pair an observer of one join may see.
 */
export interface TwoKeyAtom {
  /** The device-minted vessel verifying key (substrate identity). */
  vesselVerifyingKey: string;
  /** The derived veiled-user verifying key (persona / sovereignty). */
  veiledUserVerifyingKey: string;
}

/**
 * assembleTwoKeyAtom — pair the DEVICE-MINTED vessel verifyingKey (passed in,
 * NEVER derived from the seed — the Model-A guard) with the derived veiled-user
 * verifyingKey at the named persona path.
 *
 * The vessel key passes straight through unchanged; only the veiled-user key
 * descends from the seed.
 */
export async function assembleTwoKeyAtom(
  vesselVerifyingKey: string,
  seed: Uint8Array,
  handleIndex: number,
  contextIndex: number,
): Promise<TwoKeyAtom> {
  const veiled = await deriveVeiledUserKey(seed, handleIndex, contextIndex);
  return {
    vesselVerifyingKey,
    veiledUserVerifyingKey: veiled.verifyingKey,
  };
}
