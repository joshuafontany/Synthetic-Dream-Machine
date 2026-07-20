/**
 * recovery-keel-core — the founding-split + recover-readmit FLOWS (platform-blind).
 *
 * The lone-citizen truth: the device-share dies WITH the device, so recovery cannot ride it. A founding
 * split is 2-of-3 {device, recorded-code, escrow-peer} — normal life uses any two, but a drowned device
 * recovers from {recorded-code (the citizen wrote it down) + escrow (a peer relays it)}. Neither party
 * recovers alone: the recovery quorum IS the impersonation quorum, and it needs both (recovery-share
 * enforces this at the TYPE wall — a single-custodian set can never construct a Quorum).
 *
 * The crypto primitives already sit in mesh (recovery-share: splitToShares / assembleQuorum /
 * reconstructFromQuorum / encodeShareBytes). Only the FLOW lifts here, over two injected seams:
 *   · the PersonaVault — supplies the root seed to split + the sealed device-share store,
 *   · the readmit runner — the keyhive edge-signing step, injected because keyhive DEPENDS ON mesh
 *     (mesh importing keyhive would cycle). The core reconstructs the branded ReadmissionSecret and hands
 *     it to the runner; the platform binds the concrete `runReadmitEdge`. Dependency inversion keeps the
 *     recovery flow keyhive-blind while the branded secret stays the one door into re-admission.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/recovery-keel-core
 */

import type { RandomProvider } from "./crypto.js";
import {
  splitToShares, assembleQuorum, reconstructFromQuorum, encodeShareBytes,
  type RecoveryShare, type CustodianTag, type ReadmissionSecret,
} from "./recovery-share.js";
import { assertHandleIndex, loadPersonaRootSeed, type PersonaVault } from "./persona-vault.js";

/**
 * How a runtime persists the DEVICE recovery-share, keyed by handle-index (one persona's quorum never
 * reconstructs another's root). The device-share is share material of the PersonaGroup root — self-only
 * secret — so the platform SEALS it at rest; the seal lives in the adapter, never in this core seam.
 */
export interface RecoveryShareStore {
  /** Read the device-share for ONE persona, or null when none has landed. */
  load(handleIndex: number): RecoveryShare | null;
  /** Persist (sealed) the device-share for ONE persona. */
  save(handleIndex: number, share: RecoveryShare): void;
}

/** The three shares a founding split produces. Any two DISTINCT custodians recover — so a lost device
 *  (its share gone) still recovers from {recorded-code, escrow-peer}. */
export interface FoundingShares {
  readonly deviceShare:       RecoveryShare;   // sealed on the device (dies with it — never the recovery path)
  readonly recordedCodeShare: RecoveryShare;   // the citizen writes it down (the one external factor)
  readonly escrowShare:       RecoveryShare;   // a peer/kahu holds it (≤1 share, cannot recover alone)
  /** The recorded-code share encoded for transcription (hex payload + checksum). */
  readonly recordedCode:      string;
  /** The escrow-peer share encoded for a peer to hold (relayed, never openable into a solo recovery). */
  readonly escrowCarrier:     string;
}

/**
 * Split the PersonaGroup root at founding into a 2-of-3 {device, recorded-code, escrow-peer}. The floor's
 * real job runs HERE, at onboarding: it forces one external factor (the recorded code) to exist before the
 * Handle carries standing — because no crypto recovers a secret from nothing. The caller seals the
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
 * Reconstruct the root from a recovery quorum (≥ 2 distinct custodians) and re-admit a fresh device via the
 * INJECTED runner. The device-share is ABSENT after device loss; recovery rides {recorded-code, escrow}.
 * The reconstructed root zeroizes the instant re-admission returns — the reconstruction window kept as
 * narrow as the floor allows.
 *
 * `runReadmit` receives the branded ReadmissionSecret (never a bare Uint8Array) — the type gate the
 * platform's keyhive edge-signer already demands. The core stays keyhive-blind; the adapter binds it.
 */
export async function reconstructAndReadmit<Readmit, Payload>(
  quorumShares: readonly RecoveryShare[],
  readmit: Readmit,
  runReadmit: (reconstructedRoot: ReadmissionSecret, readmit: Readmit) => Promise<Payload>,
): Promise<Payload> {
  const reconstructedRoot = reconstructFromQuorum(assembleQuorum(quorumShares, 2));
  try {
    return await runReadmit(reconstructedRoot, readmit);
  } finally {
    reconstructedRoot.fill(0);   // close the reconstruction window immediately
  }
}

/**
 * Provision recovery at FOUNDING: split the freshly-minted PersonaGroup root at `handleIndex`, SEAL the
 * device-share into the vault's recovery store, and return the two shares the citizen carries OFF the
 * device — the recorded code (write it down) and the escrow carrier (hand to a peer). The floor's real
 * work runs here, because no crypto recovers a secret from nothing. The root seed zeroizes the instant it
 * is split.
 *
 * PER-PERSONA: a vessel wearing several personas provisions recovery per persona — each root splits into
 * its own 2-of-3 quorum and seals its own device-share, keyed by handle-index. (POLICY fork surfaced to
 * the operator: whether N personas on ONE disk constitute distinct-enough custodians for a real quorum is
 * NOT decided here; this splits the seam so either resolution stands.)
 */
export async function provisionRecoveryAtFounding(
  vault: PersonaVault,
  rng: RandomProvider,
  recoveryEpoch = 1,
  handleIndex = 0,
): Promise<{ recordedCode: string; escrowCarrier: string }> {
  assertHandleIndex(handleIndex);
  if (!vault.recovery) {
    throw new Error("[recovery-keel-core] this vault provisions no recovery store — cannot seal a device-share");
  }
  const rootSeed = await loadPersonaRootSeed(vault, handleIndex);
  try {
    const shares = splitRootAtFounding(rootSeed, rng, recoveryEpoch);
    vault.recovery.save(handleIndex, shares.deviceShare);
    return { recordedCode: shares.recordedCode, escrowCarrier: shares.escrowCarrier };
  } finally {
    rootSeed.fill(0);   // the root never lingers after the split
  }
}
