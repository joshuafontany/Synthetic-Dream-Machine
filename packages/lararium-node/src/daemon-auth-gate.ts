/**
 * daemon-auth-gate — pre-sync WebSocket authentication gate for the daemon doc.
 *
 * Wraps a WebSocketServer as an EventEmitter proxy compatible with
 * NodeWSServerAdapter. The adapter calls .on("connection") and .on("close")
 * and reads .clients — this class satisfies all three without exposing any
 * unauthenticated connections upstream.
 *
 * Auth exchange before Automerge sync:
 *   Server  → lar:challenge  (fresh 32-byte hex nonce)
 *   Client  → lar:auth       (Keyhive ContactCard JSON + nonce echo)
 *   Server  → lar:auth-ok    (emit "connection" to adapter)
 *        OR   lar:auth-denied + ws.close(4003)
 *
 * The gate starts "disarmed" — all connections are rejected with 4503 until
 * arm() is called with the daemon island's AuthVerifierSeam and the daemon bag URL.
 * The host holds no keyhive after Stage 1; the seam proxies each verify to the
 * daemon island, which answers from its in-worker keyhive and returns the peer's
 * Identifier hex for the sharePolicy map. arm() is called once the daemon VM lives.
 *
 * After a peer authenticates:
 *   1. socketToIdentifier WeakMap records socket → identifierHex.
 *   2. The Repo's sharePolicy should call getIdentifierForSocket() to build
 *      PeerId → identifierHex entries when the adapter emits "peer-candidate".
 *
 * Security posture (alpha):
 *   - V3 proof-of-possession (ENFORCED): the gate emits its gate-binding key in
 *     lar:challenge and relays the peer's {nonce, sig, ts} to the keyholder worker,
 *     which verifies the Ed25519 proof (verifyAuthProof) against the card key + the
 *     gate's own key AND folds the result into its verdict (operator-daemon-behavior,
 *     step D). So `verdict.ok` already means capability AND a verified proof; the
 *     gate admits on it directly and stays keyhive-free. A node operator MAY relax
 *     to capability-only with LAR_V3_ALLOW_UNPROVEN=1 (the prior advisory posture).
 *   - ContactCard payload is capped at MAX_CONTACT_CARD_BYTES before TextEncoder.
 *   - Concurrent unauthenticated connections are capped at MAX_PENDING.
 *   - Auth timeout is 5 s (machine-to-machine; no human interaction path).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/daemon-auth-gate
 */

import { EventEmitter }  from "node:events";
import { randomBytes }   from "node:crypto";
import type WebSocket    from "isomorphic-ws";
import type { WebSocketServer as WSSType } from "isomorphic-ws";
import {
  mkLarChallenge, mkLarAuthOk, mkLarAuthDenied, isLarAuthMsg,
  DAEMON_BAG_ID,
} from "@lararium/mesh";
import type { AuthVerifierSeam } from "@lararium/mesh";

const AUTH_TIMEOUT_MS       = 5_000;
const MAX_PENDING           = 50;     // max concurrent unauthenticated connections
const MAX_CONTACT_CARD_BYTES = 64_000; // 64 KB — generous for a self-certifying identity packet
const WS_CLOSE_UNAUTHORIZED  = 4003;
const WS_CLOSE_NOT_READY     = 4503;
const WS_CLOSE_RATE_LIMITED  = 4429;

interface ArmedState {
  seam:        AuthVerifierSeam;
  daemonBagUrl: string;
  /** The gate's verifying-key hex, emitted in lar:challenge as the gate-binding
   *  the peer's V3 proof commits to. Omitted → no gate-binding advertised. */
  gatePubKey?: string;
}

/**
 * EventEmitter proxy that NodeWSServerAdapter accepts in place of a
 * WebSocketServer. Intercepts raw connections, runs the auth exchange,
 * and only forwards authenticated sockets to the adapter.
 */
export class DaemonAuthGate extends EventEmitter {
  /** Mirrors the set of authenticated, live WebSocket connections.
   *  NodeWSServerAdapter reads .clients for keep-alive sweeps. */
  readonly clients: Set<WebSocket> = new Set();

  private armed: ArmedState | null = null;
  private _pending = 0;
  /** socket → Keyhive Identifier hex (set on successful auth). */
  private readonly socketToIdentifier = new WeakMap<WebSocket, string>();

  constructor(realWss: WSSType) {
    super();
    realWss.on("connection", (socket: WebSocket, req: unknown) => {
      void this._handleConnection(socket, req);
    });
    realWss.on("close", () => this.emit("close"));
    realWss.on("error", (e: Error) => this.emit("error", e));
  }

  /**
   * Arm the gate with the daemon island's verify seam and the daemon bag URL.
   * Call once the daemon VM lives (its in-worker keyhive answers verify-proxy
   * queries). Connections arriving before arm() are rejected with 4503.
   */
  arm(seam: AuthVerifierSeam, daemonBagUrl: string = DAEMON_BAG_ID, gatePubKey?: string): void {
    this.armed = { seam, daemonBagUrl, ...(gatePubKey ? { gatePubKey } : {}) };
  }

  /**
   * Look up the Keyhive Identifier hex for an authenticated socket.
   * Call this (deferred by one microtask) from a "peer-candidate" listener
   * on the NetworkAdapter to populate the PeerId → identifierHex map used
   * by sharePolicy.
   */
  getIdentifierForSocket(socket: WebSocket): string | undefined {
    return this.socketToIdentifier.get(socket);
  }

  private async _handleConnection(socket: WebSocket, req: unknown): Promise<void> {
    if (!this.armed) {
      this._deny(socket, WS_CLOSE_NOT_READY, "vessel not ready");
      return;
    }

    if (this._pending >= MAX_PENDING) {
      this._deny(socket, WS_CLOSE_RATE_LIMITED, "too many pending auth connections");
      return;
    }

    this._pending++;
    const { seam, daemonBagUrl, gatePubKey } = this.armed;

    const nonce = randomBytes(32).toString("hex");
    this._send(socket, mkLarChallenge(nonce, gatePubKey));

    const result = await new Promise<
      { ok: true; identHex: string } | { ok: false; reason: string }
    >((resolve) => {
      const timer = setTimeout(
        () => { socket.off("close", onClose); resolve({ ok: false, reason: "auth timeout" }); },
        AUTH_TIMEOUT_MS,
      );

      const onClose = () => {
        clearTimeout(timer);
        socket.off("message", onMessage);
        resolve({ ok: false, reason: "connection closed before auth" });
      };

      const onMessage = async (raw: Buffer | ArrayBuffer | Buffer[]) => {
        clearTimeout(timer);
        socket.off("close", onClose);
        try {
          const text = Buffer.isBuffer(raw)
            ? raw.toString("utf8")
            : Array.isArray(raw)
              ? Buffer.concat(raw).toString("utf8")
              : Buffer.from(raw as ArrayBuffer).toString("utf8");

          const parsed = JSON.parse(text) as unknown;
          if (!isLarAuthMsg(parsed)) {
            resolve({ ok: false, reason: "expected lar:auth message" });
            return;
          }

          if (parsed.nonce !== nonce) {
            resolve({ ok: false, reason: "nonce mismatch" });
            return;
          }

          if (parsed.contactCard.length > MAX_CONTACT_CARD_BYTES) {
            resolve({ ok: false, reason: "contactCard payload too large" });
            return;
          }

          const cardBytes = new TextEncoder().encode(parsed.contactCard);

          // V3 proof relay: carry the peer's signed proof material to the keyholder
          // worker (the only verifier — project_verification_placement). The gate
          // holds no keyhive, so it forwards {nonce, sig, ts} and the worker checks
          // the Ed25519 signature against the card-derived key + this gate's own key.
          const proof = parsed.sig && parsed.ts
            ? { nonce, sig: parsed.sig, ts: parsed.ts }
            : undefined;

          // Path (b): host has no keyhive — proxy to the daemon island, which
          // does receiveContactCard + verify in-worker and returns the verdict
          // plus the peer's Identifier hex for the sharePolicy map.
          const verdict = await seam.verify(cardBytes, daemonBagUrl, "admin", proof);

          // ENFORCEMENT (V3 step D): the keyholder worker already folded the proof
          // check into `verdict.ok` (it returns ok only on capability AND a verified
          // proof; LAR_V3_ALLOW_UNPROVEN=1 relaxes it worker-side). The gate admits
          // on the verdict directly — it never re-decides policy, staying a relay.
          if (!verdict.ok || !verdict.identifier) {
            resolve({ ok: false, reason: verdict.reason ?? (verdict.ok ? "verify-proxy returned no identifier" : "insufficient capability") });
          } else {
            resolve({ ok: true, identHex: verdict.identifier });
          }
        } catch (err) {
          resolve({
            ok:     false,
            reason: err instanceof Error ? err.message : String(err),
          });
        }
      };

      socket.once("close", onClose);
      socket.once("message", onMessage);
    });

    this._pending--;

    if (!result.ok) {
      this._send(socket, mkLarAuthDenied(result.reason));
      this._deny(socket, WS_CLOSE_UNAUTHORIZED, result.reason);
      return;
    }

    this.socketToIdentifier.set(socket, result.identHex);
    this._send(socket, mkLarAuthOk());
    this.clients.add(socket);
    socket.once("close", () => this.clients.delete(socket));

    // Hand the authenticated socket to NodeWSServerAdapter.
    this.emit("connection", socket, req);
  }

  private _send(socket: WebSocket, msg: object): void {
    try { socket.send(JSON.stringify(msg)); } catch { /* socket may have closed */ }
  }

  private _deny(socket: WebSocket, code: number, reason: string): void {
    try { socket.close(code, reason); } catch { /* already closed */ }
  }
}
