/**
 * charter-reserve-store — the node adapter for the charter reserve keel: it SEALS the operator's "mine"
 * share at rest and records the PUBLIC reserve state. The reserve seed NEVER reaches this store (it never
 * reaches disk at all) — the vessel keeps only ONE Shamir share of it (custodian "device"), sealed exactly
 * like the recovery keel's device-share, so an at-rest read of the vessel reveals a single share → nothing.
 *
 * Two carriers, both in the sovereign identity home (`larIdentityDir`, outside every substrate wipe):
 *   · the SEALED "mine" share (`charter-reserve-mine-share.bin`) — self-sovereign secret material, sealed
 *     through the same `asSelfSovereignSecret` wall the recovery device-share rides,
 *   · the PUBLIC reserve state (`charter-reserve-state.json`) — the pre-rotation commit + guardian labels +
 *     a sealed-share flag. It carries NO seed and NO share bytes, so `reserve show` reads it freely.
 */

import { readFileSync, existsSync, mkdirSync, chmodSync } from "node:fs";
import { join } from "node:path";
import type { RecoveryShare, CustodianTag } from "@lararium/mesh";
import { larIdentityDir } from "./vessel-paths.js";
import { atomicWriteFileSync } from "./fs-atomic.js";
import { resolveSealPolicy, sealArchiveBytes, openArchiveBytes, asSelfSovereignSecret } from "./archive-seal.js";

/** The sealed "mine"-share carrier — the ONE share of the reserve seed the vessel holds at rest. */
export function reserveMineSharePath(): string {
  return join(larIdentityDir(), "charter-reserve-mine-share.bin");
}

/** The public reserve-state carrier — the pre-rotation commit + guardian labels, no secret material. */
export function reserveStatePath(): string {
  return join(larIdentityDir(), "charter-reserve-state.json");
}

interface StoredShare {
  readonly x:             number;
  readonly ys:            number[];
  readonly custodian:     CustodianTag;
  readonly recoveryEpoch: number;
}

/**
 * Seal the operator's "mine" share (0o600, crash-safe temp→rename). The share bytes brand self-sovereign —
 * the seal accepts them because they belong to THIS vessel's own reserve; a non-self share never compiles
 * past `asSelfSovereignSecret`. The SEED never lands here — only this one share of it.
 */
export function sealReserveMineShare(share: RecoveryShare): void {
  mkdirSync(larIdentityDir(), { recursive: true });
  const stored: StoredShare = {
    x: share.bytes.x, ys: [...share.bytes.ys], custodian: share.custodian, recoveryEpoch: share.recoveryEpoch,
  };
  const plain = new TextEncoder().encode(JSON.stringify(stored));
  const path = reserveMineSharePath();
  atomicWriteFileSync(path, sealArchiveBytes(asSelfSovereignSecret(plain), resolveSealPolicy()));
  try { chmodSync(path, 0o600); } catch { /* best-effort on a non-POSIX fs */ }
}

/**
 * Read the sealed "mine" share back, or null when none has landed. A sealed store with no key source
 * throws LOUD (never a silent null — a half-assembled recovery quorum fails worse than a clear error).
 */
export function loadReserveMineShare(): RecoveryShare | null {
  const path = reserveMineSharePath();
  if (!existsSync(path)) return null;
  let sealed: Uint8Array;
  try { sealed = readFileSync(path); } catch { return null; }
  const plain = openArchiveBytes(sealed);   // unseal or bare pass-through; throws on sealed-without-key
  const j = JSON.parse(new TextDecoder().decode(plain)) as StoredShare;
  return { bytes: { x: j.x, ys: new Uint8Array(j.ys) }, custodian: j.custodian, recoveryEpoch: j.recoveryEpoch };
}

/** The PUBLIC reserve state — the pre-rotation commit + guardian labels. Carries NO seed, NO share bytes. */
export interface CharterReserveState {
  readonly reserveEpoch:    number;
  readonly nextKeyCommit:   string;
  readonly threshold:       number;
  readonly kahuCount:       number;
  readonly guardianA:       string | null;
  readonly guardianB:       string | null;
  readonly mineShareSealed: boolean;
  readonly issuedAt:        string;
}

/** Record the public reserve state (0o600). No secret material rides in this file. */
export function writeCharterReserveState(state: CharterReserveState): void {
  mkdirSync(larIdentityDir(), { recursive: true });
  const path = reserveStatePath();
  atomicWriteFileSync(path, JSON.stringify(state, null, 2));
  try { chmodSync(path, 0o600); } catch { /* best-effort on a non-POSIX fs */ }
}

/** Read the public reserve state, or null when none has landed / a torn file reads back. */
export function readCharterReserveState(): CharterReserveState | null {
  const path = reserveStatePath();
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")) as CharterReserveState; } catch { return null; }
}
