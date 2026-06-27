// @lararium/keyhive — capability layer wrapping @keyhive/keyhive (Ink & Switch concap, pre-alpha).

import type { DeviceDelegationTiddler } from "@lararium/mesh";

export type {
  CapabilityProvider, CapabilityProviderInitOpts,
  DelegateArgs, DelegateResult, VerifyArgs, VerifyResult,
  PeerDID, KeyhiveAccess, EventStoreRef,
} from "./capability-provider.js";

export { KeyhiveProvider, ensureKeyhiveWasm, setKeyhiveWasmBytes } from "./keyhive-provider.js";

export { InMemoryEventStore } from "./event-store.js";
export type { EventStore, EventRecord } from "./event-store.js";

export { DaemonEventStore, capEventTitle } from "./daemon-event-store.js";
export type { DaemonEventStoreOptions } from "./daemon-event-store.js";

export const KEYHIVE_PROBE_VERSION = "0.0.0-alpha.56c";

export { bootDaemonKeyhive } from "./boot-daemon-keyhive.js";
export type { BootDaemonKeyhiveInput, BootDaemonKeyhiveResult } from "./boot-daemon-keyhive.js";

export { resolveOrMintBinding } from "./resolve-binding.js";
export type {
  ResolveBindingArgs, ResolveBindingResult, BindingKind, DocMinter,
} from "./resolve-binding.js";

// makeOperatorDaemonBehavior is NOT re-exported here — it couples to @lararium/tw5
// (makeDaemonBehavior), and dragging tw5's index through the keyhive core index
// would pull tw5's browser-surface into keyhive consumers. It lives on its own
// subpath ("@lararium/keyhive/operator-daemon-behavior") so the keyhive core
// index stays tw5-free; only the daemon worker entries (which need tw5 anyway)
// import it.

export {
  runFoundingCeremony, runDeviceAdmitEdge, runApplyAdmitPayload,
} from "./ceremony-core.js";
export type {
  FoundingCeremonyInput, FoundingCeremonyResult,
  DeviceAdmitEdgeInput,
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
  /** The PINNED signer DID — the joinee's Binding Gate verifies its edge against THIS. */
  readonly signerDid:              string;
  /** The signed root→joinee device-delegation edge (the founder's signer signs the joinee's
   *  vessel key × hearthTrueName) — the joinee's binding, verified at its Binding Gate. No Beelay. */
  readonly deviceEdge:             DeviceDelegationTiddler;
  /** The hearth true-name (engine CID) the joinee binds TO. */
  readonly hearthTrueName:         string;
  /** Founder sentinel oracle IDs — for the founding sentinel dance + the future affiliation layer. */
  readonly personaGroupDocIdHex:    string;
  readonly personaGroupAgentIdHex:  string;
  readonly meshCabalDocIdHex:      string;
  readonly syncUrl:                string | null;
  /**
   * Automerge URL of the genesis island doc on the issuing vessel's Repo.
   * Browser vessels call repo.find(islandDocUrl) over the WebSocket to sync
   * the genesis island (TW5 core blob + sigil tiddlers) without a separate
   * binary delivery. Absent on payloads from older vessels; treated as null.
   */
  readonly islandDocUrl?:          string | null;
}
