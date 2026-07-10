import type {
  CapabilityAccess,
  CapabilityPresenter,
  CapabilityVerifyArgs,
  CapabilityVerifyResult,
  CapabilityVerifier,
} from "@lararium/mesh";

/**
 * CapabilityProvider — narrow interface over Keyhive's pre-alpha API.
 *
 * Two-tier policy:
 *   * Tier 1 (this interface) — Keyhive's binary access gate. read or admin.
 *     Cryptographic. Per-bag (one Keyhive Document per Lararium bag URL).
 *   * Tier 2 (application layer) — the ACCESS axis, a 1:1 lexical mirror of
 *     Keyhive's native verbs (pull, read, edit, admin), checked AFTER Keyhive's
 *     admin proof verifies. Lives in residency action handlers and friends, not
 *     here. Not rungs: `promote`/`propose`
 *     (no consumer), `sync` (pull-at-scale), `revoke` (an admin operation). See
 *     the 3-axis model in causal-island.ts + lar:///ha.ka.ba/lares/api/pono/causal-islands.
 *
 * The interface is provider-shaped so implementations can swap:
 *   * KeyhiveProvider — wraps @keyhive/keyhive WASM
 *   * NoopProvider (test) — always-allows, no crypto
 *   * Future: a Beelay-shaped provider when upstream stabilizes
 */

/** Keyhive's binary access enum. Mirrors what `Access.tryFromString` accepts. */
export type KeyhiveAccess = CapabilityAccess;

/** Opaque identifier for a peer — typically the hex-encoded Identifier bytes. */
export type PeerDID = CapabilityPresenter;

export interface CapabilityProviderInitOpts {
  /** 32-byte ed25519 seed. Matches node-vessel-identity.ts shape so the operator's
   *  existing identity feeds straight in. */
  readonly seed:        Uint8Array;
  /** Where Keyhive events get persisted. */
  readonly eventStore:  EventStoreRef;
}

/** Lightweight reference shape so this file doesn't depend on event-store.ts.
 *  Real implementations import EventStore from event-store.ts directly. */
export interface EventStoreRef {
  put(rec: { hash: string; variant: string; bytes: Uint8Array }): Promise<void>;
  list(): Promise<readonly { hash: string; variant: string; bytes: Uint8Array }[]>;
}

export interface DelegateArgs {
  readonly audience:  PeerDID;
  readonly bagUrl:    string;
  readonly access:    KeyhiveAccess;
}

export type VerifyArgs = CapabilityVerifyArgs;

export interface DelegateResult {
  /** Stable id we use to refer to this delegation later (e.g. for revocation). */
  readonly delegationId: string;
  /** Serialized event(s) the audience peer needs to ingest to see the
   *  delegation. Ship these bytes over the federation transport. */
  readonly bytes:        Uint8Array;
}

export type VerifyResult = CapabilityVerifyResult;

export interface CapabilityProvider extends CapabilityVerifier {
  init(opts: CapabilityProviderInitOpts): Promise<void>;
  whoami(): Promise<PeerDID>;

  /** Identity exchange — a contact card carries the prekeys + identity proof
   *  another peer needs to make this peer the audience of a delegation. */
  contactCard(): Promise<Uint8Array>;
  receiveContactCard(bytes: Uint8Array): Promise<{ id: PeerDID }>;

  /** Tell the provider about a bag URL. The provider mints a Keyhive
   *  Document for the bag (or looks up one already minted). */
  registerBag(bagUrl: string): Promise<{ docId: string }>;

  delegate(args: DelegateArgs): Promise<DelegateResult>;
  revoke(delegationId: string): Promise<{ bytes: Uint8Array }>;
  verify(args: VerifyArgs): Promise<VerifyResult>;

  /** Replay events from the event store back into Keyhive's in-memory
   *  state. Called once at boot. */
  hydrateFromEventStore(): Promise<{ ingested: number }>;

  /** Tear down. Frees WASM resources. */
  dispose(): Promise<void>;
}
