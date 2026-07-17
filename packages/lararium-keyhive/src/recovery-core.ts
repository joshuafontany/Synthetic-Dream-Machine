/**
 * recovery-core — device RE-ADMISSION (the recovery keel's layer 3, Readmit): the admit ceremony with
 * the signer SWAPPED. A citizen's device drowns; the recovery quorum reconstructs the PersonaGroup root
 * (mesh: reconstructFromQuorum → ReadmissionSecret), and THAT signs a fresh vessel's edge through the
 * UNCHANGED runDeviceAdmitEdge. The Handle + earned standing carry forward, the fresh device is admitted,
 * the OLD key retires (revokeSentinelMember, caller-side). No new interface — isomorphism by composition;
 * the only difference from a founding admit is WHO holds the pen, and that it can only be a quorum.
 *
 * The type does the guarding: `runReadmitEdge` accepts ONLY a `ReadmissionSecret` (branded by
 * reconstructFromQuorum), so a re-admit edge cannot be minted from a bare seed — recovery MUST pass the
 * quorum gate. The resulting payload is byte-identical to an admit payload, so the joinee verifies it at
 * the SAME Binding Gate against the SAME pinned root (the reconstructed root == the original root).
 */

import type { ReadmissionSecret } from "@lararium/mesh";
import { runDeviceAdmitEdge, type DeviceAdmitEdgeInput } from "./ceremony-core.js";
import type { DeviceAdmitPayload } from "./index.js";

/** Re-admission input — the admit-edge input, but the signer is the quorum-RECONSTRUCTED root, never a
 *  live-held seed. Only the branded `ReadmissionSecret` reaches the signer. */
export interface ReadmitEdgeInput extends Omit<DeviceAdmitEdgeInput, "signerSeed"> {
  /** The PersonaGroup root, RECONSTRUCTED from a recovery Quorum (mesh: reconstructFromQuorum). The
   *  brand is the gate: re-admission cannot be minted from a bare Uint8Array. */
  readonly reconstructedRoot: ReadmissionSecret;
}

/**
 * Sign a fresh device's re-admit edge with the quorum-reconstructed root. Returns the SAME
 * device-admit/v1 payload the founding admit produces (the `#admit=` carriage) — the joinee applies it
 * via the unchanged runApplyAdmitPayload, and the edge verifies against the pinned root because the
 * reconstructed root equals the original.
 *
 * The caller MUST zeroize `reconstructedRoot` immediately after this returns — the reconstruction window
 * is the honest bound the floor accepts (FROST/TSS closes it later; the seed then never assembles).
 */
export async function runReadmitEdge(input: ReadmitEdgeInput): Promise<DeviceAdmitPayload> {
  const { reconstructedRoot, ...rest } = input;
  return runDeviceAdmitEdge({ ...rest, signerSeed: reconstructedRoot });
}
