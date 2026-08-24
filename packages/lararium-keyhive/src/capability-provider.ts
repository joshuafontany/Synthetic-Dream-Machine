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
 * WHAT THIS GATE ANSWERS, AND WHAT IT DOES NOT.
 *
 * This interface carries Keyhive's binary access gate — `read` or `admin`, cryptographic, one Keyhive
 * Document per Lararium bag URL. That is the whole of what any code here checks.
 *
 * The ACCESS axis — `pull · read · edit · admin`, a 1:1 lexical mirror of Keyhive's native verbs — is
 * a MODEL and not a second gate. `CapabilityAccess` admits two values at every call site in this tree,
 * so nothing narrows an action by verb today. Naming the axis here as a checked tier would promise a
 * reader a gate they could then fail to find. The model stands at
 * lar:///ha.ka.ba/lares/api/pono/causal-islands, where a reader meets it as doctrine.
 *
 * Not rungs even in the model: `promote`/`propose` (ceremony), `sync` (pull-at-scale),
 * `revoke` (an admin op).
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
  /**
   * OPTIONAL prior-identity Archive bytes (from a previous `exportArchive()`). When present, the provider
   * RESTORES the whole keyhive identity from it — prekey SECRETS + the stable contact card — instead of
   * generating fresh prekeys. A joinee MUST restore from its archive so membership sealed to its earlier
   * card still decrypts after a reboot (keyhive prekeys generate per-init otherwise). Raw secret material:
   * the caller persists it ENCRYPTED-AT-REST.
   */
  readonly archiveBytes?: Uint8Array;
}

/** Lightweight reference shape so this file doesn't depend on event-store.ts.
 *  Real implementations import EventStore from event-store.ts directly. The optional `island` scope
 *  (CIV-3) rides each record; `list(islandId)` fetches one island's slice + cross-cutting (CIV-2b). */
export interface EventStoreRef {
  put(rec: { hash: string; variant: string; bytes: Uint8Array; island?: string }): Promise<void>;
  list(islandId?: string): Promise<readonly { hash: string; variant: string; bytes: Uint8Array; island?: string }[]>;
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

  /** Replay events from the event store back into Keyhive's in-memory state. Called once at
   *  boot. Torn-tolerant: `skipped` counts cap-events a corrupt record forced past (they
   *  degrade a membership slice, never down the boot). CIV-2 boot-flatness: pass `selfIslands`
   *  (the vessel's own sentinel doc-ids) to load only the self slice + cross-cutting events
   *  eagerly; held/foreign islands defer (`deferred`) to lazy first-access. Absent → all eager
   *  (the N=1 daemon default). */
  hydrateFromEventStore(selfIslands?: readonly string[]): Promise<{ ingested: number; skipped: number; deferred: number }>;

  /** CIV-2b — the lazy island-materialization kernel: hydrate ONE deferred foreign island's events into
   *  memory on first access. Boot loads the self slice eagerly (CIV-2) and DEFERS every held/foreign
   *  island; this pulls just that island's own deferred events (CIV-3 per-island `list`) and ingests them.
   *  Noops when the island is already resident (self slice, N=1 default, or a prior materialization) — so
   *  it stays cheap and idempotent to re-call. Called automatically at each island-access shore. */
  materializeIsland(islandId: string): Promise<{ ingested: number; skipped: number }>;

  /** Tear down. Frees WASM resources. */
  dispose(): Promise<void>;
}
