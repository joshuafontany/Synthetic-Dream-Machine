/**
 * LarWSClientAdapter — the V3 peer transport for a sovereign LEAF actor (platform-blind).
 *
 * The stock `WebSocketClientAdapter` opens its socket and immediately speaks Automerge — no seam for
 * a pre-sync handshake. This subclass interposes the lar:challenge → lar:auth → verdict handshake
 * (operator-peer #actor-parity) on the SAME socket the gate authenticates, THEN hands that
 * authenticated socket to the parent's Automerge machinery. It mirrors the server side, where
 * DaemonAuthGate runs the handshake on the raw socket before emitting "connection" to the adapter.
 *
 * Composition, not a fork: the handshake half (`runPeerHandshake`) and the leaf IDENTITY
 * (`LeafIdentity` — bare-Ed25519 signer + cached ContactCard, no keyhive) inject; the transport
 * composes them. One core, every platform that holds a leaf identity reuses it — node CLI, the
 * always-on relay's leaf legs, AND the browser vessel (the global `WebSocket` + automerge's
 * isomorphic `WebSocketClientAdapter` carry it unchanged across the worker/window boundary).
 *
 * Wire-format note: the handshake speaks JSON text frames; Automerge speaks CBOR binary frames. The
 * two never overlap — the handshake completes (a temporary text pump) before the parent's binary
 * `onMessage` attaches and `join()` fires.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/lar-ws-client-adapter
 */

import { WebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
// automerge-repo 2.6's WebSocket adapter types its socket as the DOM WebSocket — a global in both
// Node 22+ and every browser; use that, not isomorphic-ws (keeps this leaf truly platform-blind).
import type { PeerId, PeerMetadata } from "@automerge/automerge-repo";
import { runPeerHandshake } from "./auth-wire.js";
import type { PeerHandshake, LeafIdentity } from "./auth-wire.js";

export interface LarWSClientOptions {
  /** ws:// or wss:// URL of the relay gate. */
  url:        string;
  /** The leaf's light identity — cached ContactCard + bare-Ed25519 signer. */
  identity:   LeafIdentity;
  /** The target bag URI the leaf seeks (the proof's `aud`). */
  aud:        string;
  /**
   * The relay gate's verifying-key hex — the gate-binding the proof commits to. Known out-of-band
   * (anti-relay; NEVER trusted from the wire). For a leaf connecting to its OWN operator's relay
   * this equals the operator verifying key (= `identity.peerPubKey`). The worker recomputes against
   * its own key, so a mismatch fails closed.
   */
  gatePubKey: string;
  /** Optional clock for the proof timestamp (default: now, ISO). */
  now?:       () => string;
}

export class LarWSClientAdapter extends WebSocketClientAdapter {
  readonly #identity:   LeafIdentity;
  readonly #aud:        string;
  readonly #gatePubKey: string;
  readonly #now:        (() => string) | undefined;

  constructor(opts: LarWSClientOptions) {
    super(opts.url);
    this.#identity   = opts.identity;
    this.#aud        = opts.aud;
    this.#gatePubKey = opts.gatePubKey;
    this.#now        = opts.now;
  }

  override connect(peerId: PeerId, peerMetadata?: PeerMetadata): void {
    this.peerId       = peerId;
    this.peerMetadata = peerMetadata ?? {};

    try { console.log(`[lar-leaf] dialing ${this.url} (aud=${this.#aud})`); } catch { /* */ }
    const socket = new WebSocket(this.url);
    socket.binaryType = "arraybuffer";
    this.socket = socket;

    // On open, run the auth handshake FIRST; only on a passing verdict hand the socket to the
    // parent's Automerge flow (binary onMessage + join).
    socket.addEventListener("open", () => { void this.#runHandshake(socket); });
    socket.addEventListener("close", this.onClose);
    socket.addEventListener("error", this.onError);
  }

  async #runHandshake(socket: WebSocket): Promise<void> {
    // Temporary JSON text pump — drains gate handshake frames in arrival order.
    const queue:   unknown[] = [];
    const waiters: Array<(v: unknown) => void> = [];
    const onText = (event: { data: unknown }): void => {
      if (typeof event.data !== "string") return; // ignore any binary during handshake
      let msg: unknown;
      try { msg = JSON.parse(event.data); } catch { return; }
      const w = waiters.shift();
      if (w) w(msg); else queue.push(msg);
    };
    socket.addEventListener("message", onText);

    const handshake: PeerHandshake = {
      recv:        () => (queue.length ? Promise.resolve(queue.shift()) : new Promise((r) => waiters.push(r))),
      send:        (m) => socket.send(JSON.stringify(m)),
      contactCard: this.#identity.contactCard,
      peerPubKey:  this.#identity.peerPubKey,
      gatePubKey:  this.#gatePubKey,
      aud:         this.#aud,
      sign:        this.#identity.sign,
      ...(this.#now ? { now: this.#now } : {}),
    };

    let verdict: { ok: boolean; reason?: string };
    try {
      verdict = await runPeerHandshake(handshake);
    } catch (err) {
      socket.removeEventListener("message", onText);
      try { socket.close(4003, err instanceof Error ? err.message : "handshake error"); } catch { /* closed */ }
      return;
    }

    socket.removeEventListener("message", onText);
    if (!verdict.ok) {
      try { console.log(`[lar-leaf] verdict DENIED: ${verdict.reason ?? "(no reason)"}`); } catch { /* */ }
      try { socket.close(4003, verdict.reason ?? "auth denied"); } catch { /* closed */ }
      return;
    }

    // Authenticated — hand the SAME socket to the parent's Automerge machinery.
    try { console.log("[lar-leaf] verdict OK — crossing open, syncing"); } catch { /* */ }
    socket.addEventListener("message", this.onMessage);
    this.join();
  }
}
