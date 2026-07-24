/**
 * carriage-relay — the CARRIAGE capability as a live, registrable service: the authenticated membership relay
 * (Socket B, ciphertext envelopes) PLUS the DHT-free `cid → holders` bag-tracker, composed into one startable unit.
 *
 * WHAT IT CARRIES, WHAT IT NEVER HOLDS. The carriage relay moves opaque ciphertext envelopes (want-block / cas-block
 * / cas-mu) that ride verify-cap only, stamps each envelope's `from` with the sender's PROVEN Ed25519 key, and holds
 * the bag-tracker HINT index (cids + holder handles, secret-free). It carries NO read-cap, reads NO plaintext, keeps
 * NO charter / keyring / roster — a compromised carriage leaks nothing (carry ⊥ read ⊥ contract). It stands from a
 * 32-byte gate seed + a bound port and nothing else, so a bare hearth stands one with a single call.
 *
 * TWO SOCKETS STAY TWO. This carriage (Socket B) SEPARATES from the Automerge `/ws` doc relay (Socket A, cleartext
 * CRDT behind the DaemonAuthGate) — cleartext CRDT never routes through here, so carry ⊥ read holds at the transport.
 *
 * ISOMORPHISM BY COMPOSITION. It re-uses `startAuthenticatedMembershipRelay` (the proven Ed25519 proof-of-possession
 * transport) and `makeBagTracker` (the discovery index) VERBATIM — it re-derives no gate, no crypto, no index.
 *
 * NO-GLOBAL-NOW: the bag-tracker reads "holders as the relay last heard", never a global truth; a member re-verifies
 * every fetched byte itself (`verifyCiphertextCid`), so the tracker stays a hint, never an authority on the bytes.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/carriage-relay
 */

import * as ed from "@noble/ed25519";
import { hex, type MembershipEnvelope } from "@lararium/mesh";
import {
  startAuthenticatedMembershipRelay,
  type AuthenticatedMembershipRelay,
} from "./authenticated-membership-relay.js";
import { CAS_HAVE } from "./cas-wire.js";
import { makeBagTracker, type BagTracker } from "./bag-tracker.js";

/** A running carriage relay — the authenticated transport, its bound port, and the DHT-free discovery index. */
export interface CarriageRelay {
  /** The bound port the members dial (`ws://<host>:<port>`). */
  readonly port: number;
  /** The relay's gate verifying-key hex — a dialing hearth binds its proof-of-possession to THIS key (out-of-band,
   *  never trusted from the wire). An operator hands it to a hearth alongside the `ws://` URL so it dials the RIGHT
   *  crossroads. STABLE across restarts because the gate seed is (the Herm's own key / a configured seed). */
  readonly gatePubKey: string;
  /** The `cid → holders` hint index the Nexus discovers sealed bodies through (secret-free, plaintext-blind). */
  readonly tracker: BagTracker;
  /** Tear the transport down (closes the WS server + every peer socket). */
  close(): Promise<void>;
}

/**
 * Resolve the relay's gate seed the way a vessel boot does: a configured 32-byte hex seed when one rides the config,
 * else the vessel's OWN identity seed. Deterministic in BOTH arms — the same inputs yield the same gate key across
 * restarts, so a family's hearths keep dialing the same crossroads (NEVER a fresh random per boot). The one seam the
 * boot's relay-standing gate reads for its seed.
 */
export function resolveRelayGateSeed(operatorSeed: Uint8Array, seedHex?: string | null): Uint8Array {
  return seedHex && seedHex.length > 0 ? Uint8Array.from(Buffer.from(seedHex, "hex")) : operatorSeed;
}

/**
 * Stand a carriage relay: the authenticated membership transport bound to `port` (0 → an OS-assigned free port),
 * plus an empty bag-tracker. The gate seed binds the proof-of-possession challenge (a peer proves it holds its key
 * before any envelope crosses); it grants NO read-cap and names NO roster — the member gate lives on the cas-wire
 * SERVE side (in the vessels), never here.
 */
export function startCarriageRelay(cfg: { gateSeed: Uint8Array; port?: number }): Promise<CarriageRelay> {
  return (async (): Promise<CarriageRelay> => {
    const tracker = makeBagTracker();
    // Per-holder cid set — so a DEPARTED holder's every announced cid prunes at once (the tracker forgets by
    // {cid, holder}, holding no holder→cids reverse index; this sniff-local map supplies it, tracker unchanged).
    const heldByHolder = new Map<string, Set<string>>();

    // The RE-SHARE sniff: a PROVEN peer's `cas-have(cid)` announce lands `cid → holder` in the bag-tracker FROM
    // THE WIRE (the leg that stood empty). A departure prunes every cid that holder announced. The tracker stays
    // a HINT — a member re-verifies `verifyCiphertextCid` on the fetched bytes, so a stale/hostile hint is caught.
    const relay: AuthenticatedMembershipRelay = await startAuthenticatedMembershipRelay(cfg.gateSeed, cfg.port ?? 0, {
      onEnvelope: (env: MembershipEnvelope) => {
        if (env.kind !== CAS_HAVE) return;                                  // only the announce leg feeds discovery
        const cid = typeof (env.payload as { cid?: unknown })?.cid === "string" ? (env.payload as { cid: string }).cid : "";
        if (!cid) return;
        tracker.note(cid, env.from);                                        // env.from is the relay-PROVEN key (never spoofable)
        let held = heldByHolder.get(env.from);
        if (!held) { held = new Set<string>(); heldByHolder.set(env.from, held); }
        held.add(cid);
      },
      onLeave: (from: string) => {
        const held = heldByHolder.get(from);
        if (!held) return;
        for (const cid of held) tracker.forget(cid, from);                  // prune every cid this holder announced
        heldByHolder.delete(from);
      },
    });
    const gatePubKey = hex(await ed.getPublicKeyAsync(cfg.gateSeed));
    return {
      port: relay.port,
      gatePubKey,
      tracker,
      close: () => relay.close(),
    };
  })();
}
