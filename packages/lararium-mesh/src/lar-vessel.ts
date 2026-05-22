import type { LarTiddlerStore } from "./tiddler-store.js";
import type { MemeProjection } from "./meme-provider.js";
import type { IdentitySlot } from "./identity-slot.js";
import { OpenIdentitySlot } from "./identity-slot.js";

/**
 * KeyhiveSlot — opaque optional handle for the Keyhive three-layer stack.
 *
 * Typed minimally; fills in as keyhive_wasm API stabilizes (pre-alpha).
 * Layer 1: convergent capabilities (concap tokens, Ed25519 delegation chains)
 * Layer 2: Group CRDT (coordination-free membership + revocation)
 * Layer 3: BeeKEM (binary tree DH key agreement, BLAKE3 ratchet, causal order only)
 */
export interface KeyhiveSlot {
  verifyCapability(documentId: string, ability: string): Promise<boolean>;
  addMember(publicKey: Uint8Array): Promise<void>;
  removeMember(publicKey: Uint8Array): Promise<void>;
  deriveApplicationSecret(): Promise<Uint8Array>;
}

/**
 * LarVesselCapabilities — I/O surfaces this local runtime vessel can perform.
 *
 * These declare hostful capability, not authority. No vessel holds content truth.
 * Node, browser, worker, and device vessels participate symmetrically; receipt
 * law, not process role, decides whether a local effect may write.
 */
export interface LarVesselCapabilities {
  diskAccess:            boolean;
  corsHop:               boolean;
  persistentRelay:       boolean;
  broadcastChannel:      boolean;
  /**
   * May write non-idempotent local reaction effects (e.g. generated summary tiddlers).
   * This flag advertises a hostful surface only; callers still need an authority
   * receipt and idempotency key before writing effects.
   */
  hostfulReactions:      boolean;
}

export const LAR_VESSEL_CAPABILITIES_NONE: LarVesselCapabilities = {
  diskAccess: false, corsHop: false, persistentRelay: false,
  broadcastChannel: false, hostfulReactions: false,
};

export const LAR_VESSEL_CAPABILITIES_NODE: LarVesselCapabilities = {
  diskAccess: true, corsHop: true, persistentRelay: true,
  broadcastChannel: false, hostfulReactions: true,
};

export const LAR_VESSEL_CAPABILITIES_BROWSER: LarVesselCapabilities = {
  diskAccess: false, corsHop: false, persistentRelay: false,
  broadcastChannel: true, hostfulReactions: false,
};

/**
 * LarVesselOptions — construction args for a LarVessel.
 *
 * `store` holds the full composite store (system → corpus:* → wiki → draft).
 * Factories build the CompositeStore and call markSyncComplete() on the writable
 * AutomergeDocStore layers before constructing the vessel.
 */
export interface LarVesselOptions<TVm = unknown> {
  vesselId?:     string;
  /** Full doc stack — CompositeStore(system → corpus:* → wiki → draft) from the factory. */
  store:         LarTiddlerStore;
  vmPool?:       TVm | null;
  capabilities?: Partial<LarVesselCapabilities>;
  identity?:     IdentitySlot;
  /** Pre-alpha placeholder — fills in as keyhive_wasm API stabilizes. */
  keyhive?:      KeyhiveSlot;
}

/**
 * LarVessel — the one local runtime vessel class for browser, Node, worker, and device.
 *
 * Relay and browser vessels are symmetric participants. The Repo's storage/network
 * adapters and `capabilities` preset encode environmental differences — not subclasses.
 *
 * `store` holds the full composite stack. Factories own the Automerge DocHandles;
 * LarVessel receives only the assembled LarTiddlerStore interface.
 */
export class LarVessel<TVm = unknown> {
  readonly vesselId:     string;
  /** Full doc stack — CompositeStore(system → corpus:* → wiki → draft). */
  readonly store:        LarTiddlerStore;
  readonly capabilities: LarVesselCapabilities;
  readonly identity:     IdentitySlot;
  readonly keyhive:      KeyhiveSlot | undefined;

  private _vmPool: TVm | null;

  constructor(opts: LarVesselOptions<TVm>) {
    if (!opts.vesselId) throw new Error("LarVessel requires opts.vesselId");
    this.vesselId     = opts.vesselId;
    this.store        = opts.store;
    this.capabilities = { ...LAR_VESSEL_CAPABILITIES_NONE, ...opts.capabilities };
    this.identity     = opts.identity ?? new OpenIdentitySlot(opts.vesselId);
    this.keyhive      = opts.keyhive;
    this._vmPool      = opts.vmPool ?? null;
  }

  get vmPool(): TVm | null { return this._vmPool; }

  attachVmPool(pool: TVm): void {
    this._vmPool = pool;
  }

  get ready(): boolean { return this._vmPool !== null; }

  /** Subscribe a projection to the full composite store. */
  addProjection(p: MemeProjection): () => void {
    return this.store.subscribe((change) => p.onUriChanged(change));
  }

  dispose(): void {
    this._vmPool = null;
  }
}

