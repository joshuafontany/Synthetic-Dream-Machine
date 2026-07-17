/**
 * recovery-keel (node) — the founding-split + recover-readmit flows, composing all three keel layers
 * into the two moments a citizen lives them: FOUNDING (split the root so a lost device is survivable)
 * and RECOVERY (reconstruct from the surviving shares, re-admit a fresh device).
 *
 * The lone-citizen truth: the device-share dies WITH the device, so recovery cannot ride it. A founding
 * split is 2-of-3 {device, recorded-code, escrow-peer} — normal life uses any two, but a drowned device
 * recovers from {recorded-code (the citizen wrote it down) + escrow (a peer relays it)}. Neither of
 * those two parties can recover alone (the escrow peer holds one share; the code is one share) — the
 * recovery quorum IS the impersonation quorum, and it needs both.
 *
 * This is the recovery FLOWS module: the pure atoms (splitRootAtFounding, reconstructAndReadmit) plus
 * the founding-provision that ties them to the identity home (provisionRecoveryAtFounding). The escrow
 * SRP transport + the `lares device-readmit` CLI are the thin wiring that rides on top.
 */

import type { RandomProvider } from "@lararium/mesh";
import {
  splitToShares, assembleQuorum, reconstructFromQuorum, encodeShareBytes,
  type RecoveryShare, type CustodianTag,
} from "@lararium/mesh";
import { runReadmitEdge, type ReadmitEdgeInput } from "@lararium/keyhive";
import type { DeviceAdmitPayload } from "@lararium/keyhive";
import { loadPersonaGroupRootSeed } from "./node-vessel-identity.js";
import { persistRecoveryDeviceShare } from "./recovery-share-store.js";

/** The three shares a founding split produces. Any two DISTINCT custodians recover — so a lost device
 *  (its share gone) still recovers from {recorded-code, escrow-peer}. */
export interface FoundingShares {
  readonly deviceShare:       RecoveryShare;   // sealed on the device (dies with it — never the recovery path)
  readonly recordedCodeShare: RecoveryShare;   // the citizen writes it down (the one external factor)
  readonly escrowShare:       RecoveryShare;   // a peer/kahu holds it (≤1 share, cannot recover alone)
  /** The recorded-code share encoded for transcription (base32-adjacent hex + checksum). */
  readonly recordedCode:      string;
  /** The escrow-peer share encoded for a peer to hold (relayed, never openable into a solo recovery). */
  readonly escrowCarrier:     string;
}

/**
 * Split the PersonaGroup root at founding into a 2-of-3 {device, recorded-code, escrow-peer}. The floor's
 * real job runs HERE, at onboarding: it forces one external factor (the recorded code) to exist before
 * the Handle carries standing — because no crypto recovers a secret from nothing. The caller seals the
 * device-share, surfaces the recorded code for the citizen to write down, and relays the escrow share.
 */
export function splitRootAtFounding(rootSeed: Uint8Array, rng: RandomProvider, recoveryEpoch = 1): FoundingShares {
  const custodians: CustodianTag[] = ["device", "recorded-code", "escrow-peer"];
  const shares = splitToShares(rootSeed, 2, custodians, recoveryEpoch, rng);
  const byTag = (t: CustodianTag): RecoveryShare => shares.find((s) => s.custodian === t)!;
  const recordedCodeShare = byTag("recorded-code");
  const escrowShare = byTag("escrow-peer");
  return {
    deviceShare: byTag("device"),
    recordedCodeShare, escrowShare,
    recordedCode:  encodeShareBytes(recordedCodeShare.bytes),
    escrowCarrier: encodeShareBytes(escrowShare.bytes),
  };
}

/**
 * Reconstruct the root from a recovery quorum (≥ 2 distinct custodians) and re-admit a fresh device. The
 * device-share is ABSENT after device loss; recovery rides {recorded-code, escrow}. The reconstructed
 * root is zeroized the instant re-admission is signed — the reconstruction window kept as narrow as the
 * floor allows (FROST closes it for good later).
 */
export async function reconstructAndReadmit(
  quorumShares: readonly RecoveryShare[],
  readmit: Omit<ReadmitEdgeInput, "reconstructedRoot">,
): Promise<DeviceAdmitPayload> {
  const reconstructedRoot = reconstructFromQuorum(assembleQuorum(quorumShares, 2));
  try {
    return await runReadmitEdge({ ...readmit, reconstructedRoot });
  } finally {
    reconstructedRoot.fill(0);   // close the reconstruction window immediately
  }
}

/**
 * Provision recovery at FOUNDING: split the freshly-minted PersonaGroup root, SEAL the device-share into
 * the identity home, and return the two shares the citizen carries OFF the device — the recorded code
 * (write it down) and the escrow carrier (hand to a peer). The floor's real work runs here, at
 * onboarding: it forces one external factor to exist BEFORE the Handle carries standing, because no
 * crypto recovers a secret from nothing. The root seed is zeroized the instant it is split.
 *
 * Additive — the mint (generateOrLoadPersonaGroupRoot) is untouched; the founding caller invokes this
 * once the root exists, then SURFACES the recorded code to the citizen and relays the escrow carrier.
 */
export async function provisionRecoveryAtFounding(
  dataDir: string,
  rng: RandomProvider,
  recoveryEpoch = 1,
): Promise<{ recordedCode: string; escrowCarrier: string }> {
  const rootSeed = await loadPersonaGroupRootSeed(dataDir);
  try {
    const shares = splitRootAtFounding(rootSeed, rng, recoveryEpoch);
    persistRecoveryDeviceShare(shares.deviceShare);
    return { recordedCode: shares.recordedCode, escrowCarrier: shares.escrowCarrier };
  } finally {
    rootSeed.fill(0);   // the root never lingers after the split
  }
}
