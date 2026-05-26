// @lararium/keyhive — capability layer wrapping @keyhive/keyhive (Ink & Switch concap, pre-alpha).

export type {
  CapabilityProvider, CapabilityProviderInitOpts,
  DelegateArgs, DelegateResult, VerifyArgs, VerifyResult,
  PeerDID, KeyhiveAccess, EventStoreRef,
} from "./capability-provider.js";

export { KeyhiveProvider } from "./keyhive-provider.js";

export { InMemoryEventStore } from "./event-store.js";
export type { EventStore, EventRecord } from "./event-store.js";

export { AdminEventStore, capEventTitle } from "./admin-event-store.js";
export type { AdminEventStoreOptions } from "./admin-event-store.js";

export const KEYHIVE_PROBE_VERSION = "0.0.0-alpha.56c";

export {
  runFoundingCeremony, runDeviceAdmitCore, runApplyAdmitPayload,
} from "./ceremony-core.js";
export type {
  FoundingCeremonyInput, FoundingCeremonyResult,
  DeviceAdmitCoreInput,
  ApplyAdmitInput, ApplyAdmitResult,
} from "./ceremony-core.js";

/**
 * DeviceAdmitPayload — isomorphic wire type for the same-operator vessel
 * admission ceremony. Produced by a Node vessel's `runDeviceAdmit`; consumed
 * by any vessel's init path (Node, browser, mobile) via `runInitFromAdmitPayload`.
 *
 * Exported here rather than from @lararium/node so browser and mobile vessels
 * can import this type without taking a Node dependency.
 */
export interface DeviceAdmitPayload {
  readonly kind:                   "device-admit/v1";
  readonly personGroupDocIdHex:    string;
  readonly personGroupAgentIdHex:  string;
  readonly meshCabalDocIdHex:      string;
  readonly capEvents:              ReadonlyArray<{ variant: string; bytes: string }>;
  readonly syncUrl:                string | null;
}
