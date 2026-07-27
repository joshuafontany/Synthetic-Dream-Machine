/**
 * recovery-keel (node) — the founding-split + recover-readmit flows, wired to node shores.
 *
 * The recovery FLOWS live in @lararium/mesh (recovery-keel-core) — platform-blind, over the crypto
 * primitives already in mesh. THIS adapter binds them to the two node-only edges the core cannot hold:
 *   · the KEYHIVE re-admit edge-signer (`runReadmitEdge`) — injected because keyhive DEPENDS ON mesh, so
 *     mesh importing keyhive would cycle; the core reconstructs the branded root and hands it here.
 *   · the FS-backed PersonaVault — supplies the root seed to split + the sealed device-share store.
 *
 * The lone-citizen truth stands unchanged: a founding split is 2-of-3 {device, recorded-code, escrow-peer};
 * a drowned device (its share gone) recovers from {recorded-code, escrow}. Neither party recovers alone —
 * the recovery quorum IS the impersonation quorum (recovery-share enforces it at the TYPE wall).
 */

import type { RandomProvider, ReadmissionSecret } from "@lararium/mesh";
import {
  reconstructAndReadmit as coreReconstructAndReadmit,
  provisionRecoveryAtFounding as coreProvisionRecoveryAtFounding,
  provisionRecoveryCardsAtFounding as coreProvisionRecoveryCardsAtFounding,
  type RecoveryShare, type GuardianCard, type RecoveryCardsAtFounding,
} from "@lararium/mesh";
import { runReadmitEdge, type ReadmitEdgeInput } from "@lararium/keyhive";
import type { DeviceAdmitPayload } from "@lararium/keyhive";
import { makeNodeFsPersonaVault } from "./node-vessel-identity.js";

// splitRootAtFounding + FoundingShares are pure crypto flow — re-exported straight from the core.
export { splitRootAtFounding, type FoundingShares } from "@lararium/mesh";

/**
 * Reconstruct the root from a recovery quorum (≥ 2 distinct custodians) and re-admit a fresh device. Binds
 * the keyhive edge-signer to the core flow: the core reconstructs the branded ReadmissionSecret, this
 * wrapper signs the re-admit edge with it, and the core zeroizes it the instant this returns. The device-
 * share is ABSENT after device loss; recovery rides {recorded-code, escrow}.
 */
export async function reconstructAndReadmit(
  quorumShares: readonly RecoveryShare[],
  readmit: Omit<ReadmitEdgeInput, "reconstructedRoot">,
): Promise<DeviceAdmitPayload> {
  return coreReconstructAndReadmit(
    quorumShares,
    readmit,
    (reconstructedRoot: ReadmissionSecret, r) => runReadmitEdge({ ...r, reconstructedRoot }),
  );
}

/**
 * Provision recovery at FOUNDING: split the freshly-minted PersonaGroup root at `handleIndex`, SEAL the
 * device-share into the identity home (through the vault's sealed recovery store), and return the two
 * shares the citizen carries OFF the device — the recorded code (write it down) and the escrow carrier
 * (hand to a peer). The floor's real work runs here, because no crypto recovers a secret from nothing.
 *
 * PER-PERSONA: a vessel wearing several personas provisions recovery per persona-root. (POLICY fork
 * surfaced to the operator: whether N personas on ONE disk constitute distinct-enough custodians is NOT
 * decided here; the shore splits so either resolution stands.)
 */
export async function provisionRecoveryAtFounding(
  _dataDir: string,
  rng: RandomProvider,
  recoveryEpoch = 1,
  handleIndex = 0,
): Promise<{ recordedCode: string; escrowCarrier: string }> {
  return coreProvisionRecoveryAtFounding(await makeNodeFsPersonaVault(), rng, recoveryEpoch, handleIndex);
}

export type { GuardianCard, RecoveryCardsAtFounding } from "@lararium/mesh";

/**
 * Provision identity recovery at founding as the SHARED guardian cards — the pattern-integrity twin of the
 * charter reserve's card ceremony. Binds the node FS PersonaVault to the core flow: the PersonaGroup root
 * splits 2-of-3 into "Recovery-card mine + guardian-A/B", the "mine" (device) share seals into the identity
 * home, and the three cards return for the operator to place BY HAND (web3-pure). The two guardian cards
 * recover the identity WITHOUT the operator, IDENTICAL in shape to the reserve. Recovery rides the existing
 * `reconstructAndReadmit` — the reconstruct-to-readmit semantics stay unchanged (canon).
 */
export async function provisionRecoveryCardsAtFounding(
  _dataDir: string,
  guardianA: string | null,
  guardianB: string | null,
  rng: RandomProvider,
  recoveryEpoch = 1,
  handleIndex = 0,
): Promise<RecoveryCardsAtFounding> {
  return coreProvisionRecoveryCardsAtFounding(
    await makeNodeFsPersonaVault(), guardianA, guardianB, rng, recoveryEpoch, handleIndex,
  );
}
