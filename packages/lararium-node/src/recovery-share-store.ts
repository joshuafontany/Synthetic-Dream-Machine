/**
 * recovery-share-store — persist / load the DEVICE recovery share in the sovereign identity home,
 * SEALED. The device-share is a share of the PersonaGroup root — self-sovereign secret material — so it
 * rides the exact same self-only seal guard as the keyhive archive (CIV-4, archive-seal): it seals
 * through `asSelfSovereignSecret`, and a held/citizen principal's share can NEVER reach this sealer.
 *
 * WHY only the device-share persists here: the recorded-code share leaves as words the citizen writes
 * down (never stored), and the escrow share leaves to a peer (relayed, never held openable). Only the
 * device-share stays on THIS device, at rest — and it dies with the device, which is exactly why it is
 * NEVER the recovery path (recovery rides {recorded-code, escrow}). This store is for normal-life
 * quorum assembly, not for surviving device loss.
 */

import { readFileSync, mkdirSync, chmodSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { RecoveryShare, CustodianTag } from "@lararium/mesh";
import { larIdentityDir } from "./vessel-paths.js";
import { atomicWriteFileSync } from "./fs-atomic.js";
import { resolveSealPolicy, sealArchiveBytes, openArchiveBytes, asSelfSovereignSecret } from "./archive-seal.js";

/** The device recovery-share carrier path. Exported so the vault passphrase-lifecycle surface
 *  (`archive-passphrase`) names the ONE carrier location, never a duplicated magic string. A vessel
 *  wearing several personas splits EACH persona-root independently, so the device-share keys by
 *  handle-index (0 = founding persona, `recovery-device-share.bin`, back-compat; higher indices hang
 *  off `recovery-device-share-h${N}.bin`) — one persona's quorum never reconstructs another's root. */
export function deviceSharePath(handleIndex = 0): string {
  const suffix = handleIndex === 0 ? "" : `-h${handleIndex}`;
  return join(larIdentityDir(), `recovery-device-share${suffix}.bin`);
}

interface StoredShare {
  readonly x: number;
  readonly ys: number[];
  readonly custodian: CustodianTag;
  readonly recoveryEpoch: number;
}

/**
 * Persist the device recovery share SEALED (0o600), crash-safe (temp→rename). The share bytes are
 * branded self-sovereign — the seal accepts them precisely because they belong to THIS vessel's own
 * root; a non-self share would not compile past `asSelfSovereignSecret`.
 */
export function persistRecoveryDeviceShare(share: RecoveryShare, handleIndex = 0): void {
  mkdirSync(larIdentityDir(), { recursive: true });
  const stored: StoredShare = { x: share.bytes.x, ys: [...share.bytes.ys], custodian: share.custodian, recoveryEpoch: share.recoveryEpoch };
  const plain = new TextEncoder().encode(JSON.stringify(stored));
  const path = deviceSharePath(handleIndex);
  atomicWriteFileSync(path, sealArchiveBytes(asSelfSovereignSecret(plain), resolveSealPolicy()));
  try { chmodSync(path, 0o600); } catch { /* best-effort on a non-POSIX fs */ }
}

/**
 * Read the device share back, or null when none has landed. A sealed store with no key source throws
 * LOUD (never a silent null — a half-recovered quorum is worse than a clear failure).
 */
export function loadRecoveryDeviceShare(handleIndex = 0): RecoveryShare | null {
  const path = deviceSharePath(handleIndex);
  if (!existsSync(path)) return null;
  let stored: Uint8Array;
  try { stored = readFileSync(path); } catch { return null; }
  const plain = openArchiveBytes(stored);   // unseal or bare pass-through; throws on sealed-without-key
  const j = JSON.parse(new TextDecoder().decode(plain)) as StoredShare;
  return { bytes: { x: j.x, ys: new Uint8Array(j.ys) }, custodian: j.custodian, recoveryEpoch: j.recoveryEpoch };
}
