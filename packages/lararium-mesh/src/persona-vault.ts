/**
 * persona-vault — the aggregate persona identity store + the lifted control flow over it (platform-blind).
 *
 * PLURALITY PONO at the identity layer (canon: lar:///ha.ka.ba/lares/api/pono/persona-circle): a human
 * contains multitudes, so a vessel HOLDS a SET of PersonaGroup-roots — one per persona the operator wears,
 * keyed by handle-index (the `handle'` the persona-HD scheme derives). Each index names a DISTINCT
 * quorum-identity: its own root, its own device-delegation edge, its own recovery split, its own veiled
 * Handle. The vessel WEARS one at a time (signs/acts as it) and MAY switch — "put on a mask".
 *
 * The vault VENDS the existing per-index KeypairStore (vessel-identity-core) — it never reinvents keypair
 * persistence. It aggregates the four shores a multi-persona vessel needs:
 *   · rootSlot(handleIndex) — the KeypairStore for ONE persona-root (the operator-root that signs edges),
 *   · selector              — which persona the vessel currently wears,
 *   · anchors               — the veiled-Handle sentinel anchors (public),
 *   · recovery              — the sealed device recovery-share store (null when a vessel provisions none).
 * plus roster reads (listRoots / hasRoot) over the store's OWN explicit record — never a dir-scan pattern.
 *
 * CUSTODY BY TYPE, not by index-count: EACH root is the VESSEL'S OWN sovereign secret (crypto.generate,
 * never a held/citizen principal's), so N roots widen the self-surface, never a custodial honeypot. The
 * seal that protects secret material at rest lives in the platform adapter — the core never sees it.
 *
 * ROOT-ON-FOUNDER: `generateOrLoadPersonaRoot` mints the operator-root, a FOUNDER-ONLY caller contract.
 * A joining vessel NEVER calls it — it receives the founder's public DID + a signed edge at admit, so its
 * vault holds anchors at its admitted index while listRoots() reads empty.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/persona-vault
 */

import {
  generateOrLoadKeypair,
  signingSeedFromHex,
  type KeypairStore,
  type KeypairCrypto,
} from "./vessel-identity-core.js";
import type { AnchorStore } from "./anchor-store.js";
import type { RecoveryShareStore } from "./recovery-keel-core.js";

/** How a runtime persists WHICH persona the vessel currently wears (one pointer, never a root). */
export interface ActivePersonaStore {
  /** The worn handle-index, or undefined when the vessel wears none yet (no inference from an empty home). */
  load(): Promise<number | undefined>;
  /** Persist the worn handle-index — moves only the pointer, never a root. */
  save(handleIndex: number): Promise<void>;
}

/**
 * The aggregate persona identity store. A platform supplies the four shores + the roster reads; the core
 * runs the lifecycle over them. `recovery` reads null when the vessel provisions no device recovery-share.
 */
export interface PersonaVault {
  /** The KeypairStore for ONE persona-root — the vault vends the existing per-index slot, never a new one. */
  rootSlot(handleIndex: number): KeypairStore;
  /** The persona-root roster — every handle-index this vessel HOLDS a root for, ascending, from the
   *  store's OWN explicit record (never a regex dir-scan). A joinee reads []. */
  listRoots(): Promise<number[]>;
  /** True when this vessel HOLDS a persona-root at `handleIndex` — the custody-by-type read. */
  hasRoot(handleIndex: number): Promise<boolean>;
  /** The active-persona selector — which persona the vessel currently wears. */
  readonly selector: ActivePersonaStore;
  /** The veiled-Handle sentinel anchors, keyed by handle-index. */
  readonly anchors: AnchorStore;
  /** The sealed device recovery-share store, or null when the vessel provisions no recovery. */
  readonly recovery: RecoveryShareStore | null;
}

/** A persona-root's public face + whether THIS call minted it. */
export interface PersonaRoot {
  /** Hex-encoded 32-byte Ed25519 verifying key — the operator-root DID peers pin (`0x`+hex). */
  verifyingKey: string;
  /** True when this call minted a fresh root; false when it loaded an existing one. */
  created: boolean;
}

/** The SLIP-0010 hardened-index ceiling — the persona-HD scheme derives handles below it. */
export const HANDLE_INDEX_CEILING = 0x80000000;

/**
 * Validate a persona handle-index — the `handle'` the persona-HD scheme derives. The bound mirrors the
 * SLIP-0010 hardened-index ceiling, the same space persona-identity allocates handles in, so the storage
 * layer never keys outside the derivation's range.
 */
export function assertHandleIndex(handleIndex: number): void {
  if (!Number.isSafeInteger(handleIndex) || handleIndex < 0 || handleIndex >= HANDLE_INDEX_CEILING) {
    throw new RangeError(
      `[persona-vault] handle-index out of range: ${handleIndex} (expected 0 ≤ n < 0x80000000)`,
    );
  }
}

/**
 * generateOrLoadPersonaRoot — mint or load the PersonaGroup-root at `handleIndex` (the operator-root
 * delegation capability). FOUNDER-ONLY: a joining vessel NEVER calls this; it receives the founder's
 * public DID + a signed delegation edge at admit instead.
 *
 * Idempotent per index: loads an existing root, mints one only on first call for that index. A fresh mint
 * persists through the slot BEFORE returning (so any layer keying off the root runs strictly AFTER it
 * reaches durable storage), and the slot's save records the index into the roster — the founding persona
 * becomes an EXPLICIT written record, never inferred. Keeps the root's stricter load-time verifyingKey
 * guard (it is the more pin-worthy identity). Returns only the public verifyingKey; the signing seed
 * surfaces via `loadPersonaRootSeed`.
 */
export async function generateOrLoadPersonaRoot(
  vault: PersonaVault,
  crypto: KeypairCrypto,
  handleIndex = 0,
): Promise<PersonaRoot> {
  assertHandleIndex(handleIndex);
  const slot = vault.rootSlot(handleIndex);
  const existing = await slot.load();
  if (existing) {
    if (existing.verifyingKey.length !== 64) {
      throw new Error(`[persona-vault] malformed verifyingKey at persona-root h${handleIndex}`);
    }
    return { verifyingKey: existing.verifyingKey, created: false };
  }
  const fresh = await crypto.generate();
  await slot.save(fresh);
  return { verifyingKey: fresh.verifyingKey, created: true };
}

/**
 * loadPersonaRootSeed — load the PersonaGroup-root 32-byte Ed25519 SIGNING seed at `handleIndex`
 * (founder-only). The founding ceremony signs device-delegation edges with this seed; recovery splits it.
 *
 * SECURITY: the returned bytes ARE the operator-root private key — the most sensitive secret on the vessel
 * (it authorizes PersonaGroup membership). The caller MUST NOT log it, persist it elsewhere, or cross a
 * trust boundary with it. Throws when the slot is empty — mint via `generateOrLoadPersonaRoot` first
 * (founding only; a joinee never holds this).
 */
export async function loadPersonaRootSeed(vault: PersonaVault, handleIndex = 0): Promise<Uint8Array> {
  assertHandleIndex(handleIndex);
  const existing = await vault.rootSlot(handleIndex).load();
  if (!existing) {
    throw new Error(
      `[persona-vault] no persona-root at h${handleIndex} — mint it via the founding ceremony first ` +
      `(founder-only; a joining vessel never holds the root seed)`,
    );
  }
  if (existing.signingKey.length !== 64) {
    throw new Error(`[persona-vault] malformed signingKey at persona-root h${handleIndex}`);
  }
  return signingSeedFromHex(existing.signingKey);
}

/**
 * loadPersonaRootVerifyingKey — read the PersonaGroup-root's PUBLIC verifying key at `handleIndex`
 * WITHOUT minting. The persona root names the HUMAN; the vessel key names the PLACE. A caller that
 * wants to SHOW which human a vessel delegates through reads this one — never `generateOrLoadPersonaRoot`,
 * which would stand a sovereign key up as a side effect of a read.
 *
 * Returns undefined when this vessel holds no root at that index — a joinee holds none (it carries the
 * founder's public DID plus a signed edge instead), and a vessel before founding holds none either.
 */
export async function loadPersonaRootVerifyingKey(
  vault: PersonaVault,
  handleIndex = 0,
): Promise<string | undefined> {
  assertHandleIndex(handleIndex);
  const existing = await vault.rootSlot(handleIndex).load();
  if (!existing) return undefined;
  if (existing.verifyingKey.length !== 64) {
    throw new Error(`[persona-vault] malformed verifyingKey at persona-root h${handleIndex}`);
  }
  return existing.verifyingKey;
}

/**
 * listPersonaRoots — the persona ROSTER, ascending: every handle-index this vessel HOLDS a root for. A
 * one-persona vessel returns `[0]`; a multitude-of-one returns `[0, 1, …]`; a joinee returns `[]`. Reads
 * the store's OWN explicit record — no dir-scan.
 */
export async function listPersonaRoots(vault: PersonaVault): Promise<number[]> {
  return vault.listRoots();
}

/**
 * personaRootExists — true when this vessel HOLDS a persona-root at `handleIndex` (founder-side custody).
 * A joinee holds none — it wears its admitted persona through the anchors/edge, not a root.
 */
export async function personaRootExists(vault: PersonaVault, handleIndex: number): Promise<boolean> {
  assertHandleIndex(handleIndex);
  return vault.hasRoot(handleIndex);
}

/**
 * wearPersona — set the active handle-index ("put on a mask"). The CUSTODY-BY-TYPE wall, in mask form:
 * wearing REQUIRES that this vessel HOLD that persona-root — you cannot sign AS a persona whose sovereign
 * secret you do not carry. The guard reads uniformly across every index (no founding special-case). Only
 * the selector pointer moves; the root never does.
 */
export async function wearPersona(vault: PersonaVault, handleIndex: number): Promise<void> {
  assertHandleIndex(handleIndex);
  if (!(await vault.hasRoot(handleIndex))) {
    throw new Error(
      `[persona-vault] cannot wear persona h${handleIndex} — no persona-root held for it ` +
      `(custody-by-type: sign only as a persona whose sovereign secret this vessel carries)`,
    );
  }
  await vault.selector.save(handleIndex);
}

/**
 * loadActivePersona — which persona the vessel currently WEARS, or undefined when it wears none yet. No
 * inference from an empty home: an absent selector reads undefined (the caller decides any default), never
 * a silently-assumed founding index.
 */
export async function loadActivePersona(vault: PersonaVault): Promise<number | undefined> {
  return vault.selector.load();
}

// generateOrLoadKeypair rides the same skeleton one layer down (the device key). Re-exported for adapters
// that build both a device-key store and a persona vault from the same shores.
export { generateOrLoadKeypair };
