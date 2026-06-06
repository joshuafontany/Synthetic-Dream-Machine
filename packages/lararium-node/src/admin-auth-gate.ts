/**
 * admin-auth-gate — pre-sync WebSocket authentication gate for the admin doc.
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
 * arm() is called with the admin island's AuthVerifierSeam and the admin bag URL.
 * The host holds no keyhive after Stage 1; the seam proxies each verify to the
 * admin island, which answers from its in-worker keyhive and returns the peer's
 * Identifier hex for the sharePolicy map. arm() is called once the admin VM lives.
 *
 * After a peer authenticates:
 *   1. socketToIdentifier WeakMap records socket → identifierHex.
 *   2. The Repo's sharePolicy should call getIdentifierForSocket() to build
 *      PeerId → identifierHex entries when the adapter emits "peer-candidate".
 *
 * Security posture (alpha):
 *   - Nonce signature verification is stubbed (TODO L.2). Full challenge-response:
 *     sig = Ed25519Sign(identityPrivKey, nonce_bytes || serverStaticPubKey_bytes).
 *   - ContactCard payload is capped at MAX_CONTACT_CARD_BYTES before TextEncoder.
 *   - Concurrent unauthenticated connections are capped at MAX_PENDING.
 *   - Auth timeout is 5 s (machine-to-machine; no human interaction path).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/admin-auth-gate
 */

import { EventEmitter }  from "node:events";
import { randomBytes }   from "node:crypto";
import type WebSocket    from "isomorphic-ws";
import type { WebSocketServer as WSSType } from "isomorphic-ws";
import {
  mkLarChallenge, mkLarAuthOk, mkLarAuthDenied, isLarAuthMsg,
  ADMIN_BAG_ID,
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
  adminBagUrl: string;
}

/**
 * EventEmitter proxy that NodeWSServerAdapter accepts in place of a
 * WebSocketServer. Intercepts raw connections, runs the auth exchange,
 * and only forwards authenticated sockets to the adapter.
 */
export class AdminAuthGate extends EventEmitter {
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
   * Arm the gate with the admin island's verify seam and the admin bag URL.
   * Call once the admin VM lives (its in-worker keyhive answers verify-proxy
   * queries). Connections arriving before arm() are rejected with 4503.
   */
  arm(seam: AuthVerifierSeam, adminBagUrl: string = ADMIN_BAG_ID): void {
    this.armed = { seam, adminBagUrl };
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
    const { seam, adminBagUrl } = this.armed;

    const nonce = randomBytes(32).toString("hex");
    this._send(socket, mkLarChallenge(nonce));

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

          // TODO(L.2): verify parsed.sig = Ed25519Sign(identityPrivKey, nonce_bytes || serverStaticPubKey_bytes)
          // Alpha: ContactCard self-certification + accessForDoc is the primary gate.

          const cardBytes = new TextEncoder().encode(parsed.contactCard);
          // Path (b): host has no keyhive — proxy to the admin island, which
          // does receiveContactCard + verify in-worker and returns the verdict
          // plus the peer's Identifier hex for the sharePolicy map.
          const verdict = await seam.verify(cardBytes, adminBagUrl, "admin");

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
