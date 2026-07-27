/**
 * authenticated-membership-relay — the LIVE-WS `MembershipChannel` transport with REAL Ed25519 auth, so the
 * cas-wire member gate reads a PROVEN peer identity, never a self-asserted one.
 *
 * WHY AUTH BINDS TO THE ENVELOPE `from`. cas-wire's `carrierShareDecision` gates the sealed-body carry on the
 * requester's peer id (the envelope `from`). A DUMB re-broadcast relay lets a peer CLAIM any `from`, so a stranger
 * could name a member's id and be served the ciphertext. Carry ⊥ read bounds that (a stranger reads nothing without
 * the read-cap), but the member lane's carry-restriction wants a PROVEN id. This relay closes that: a connecting
 * peer proves it HOLDS its verifying key (an Ed25519 proof-of-possession — the SAME challenge/sign/verify the
 * DaemonAuthGate runs, reused here, never weakened), and the relay then STAMPS every envelope's `from` with that
 * proven key. A forged `from` cannot cross — a peer speaks only AS the key it proved.
 *
 * NOT A SEPARATE TRUST ROOT. This reuses `mkLarChallenge` + `verifyAuthProof` (the DaemonAuthGate's own
 * proof-of-possession primitives) — isomorphism-by-composition, not a weakening: the automerge-coupled DaemonAuthGate
 * stays the automerge relay's gate; this stands the SAME Ed25519 mechanism for the membership transport. The relay
 * holds NO read-cap and reads NO ciphertext — it moves opaque envelopes (want-block / cas-block / cas-mu) that ride
 * ciphertext + verify-cap only (carry ⊥ read ⊥ contract; verify-cap ⊥ read-cap), so a compromised relay leaks nothing.
 *
 * NO-GLOBAL-NOW: a peer's membership + Kapae status the cas-wire gate reads is a local replica as-of-last-sync — this
 * transport proves WHO a peer is, never adjudicates membership (that stays the cas-wire gate's local read).
 *
 * Node-side (the transport branch); the `MembershipChannel` shore + the file impl stay platform-blind.
 * Meme: lar:///ha.ka.ba/lararium/node/authenticated-membership-relay
 */

import { WebSocketServer, WebSocket, type RawData } from "ws";
import * as ed from "@noble/ed25519";
import {
  hex, verifyAuthProof, authProofBytes, ed25519SignerFromSeed, webGetRandomValues,
  MEMBERSHIP_BROADCAST,
  type MembershipChannel, type MembershipEnvelope,
} from "@lararium/mesh";

const asText = (data: RawData): string => (typeof data === "string" ? data : data.toString());
/** The audience tag the membership proof-of-possession binds to — distinct from the daemon-bag audience. */
const MEMBERSHIP_AUD = "lar-membership-relay/v1" as const;

/** The wire frames over the socket: the auth handshake, then opaque envelope carriage. */
type RelayFrame =
  | { readonly t: "challenge"; readonly nonce: string; readonly gatePubKey: string }
  | { readonly t: "auth";      readonly peerPubKey: string; readonly ts: string; readonly sig: string }
  | { readonly t: "auth-ok" }
  | { readonly t: "env";       readonly env: MembershipEnvelope };

/** A running authenticated membership relay — the WS server + its bound port. */
export interface AuthenticatedMembershipRelay {
  readonly port: number;
  close(): Promise<void>;
}

/**
 * The relay's SNIFF observer — the RE-SHARE leg. `onEnvelope` fires for every PROVEN, `from`-stamped envelope the
 * relay carries, so a composing layer (carriage-relay) can pick the `cas-have` announces and learn `cid → holder`
 * FROM THE WIRE into its bag-tracker. `onLeave` fires when a proven socket drops, so the tracker PRUNES that holder
 * (an offline holder never lingers). The relay stays AGNOSTIC to the cas vocabulary — it just surfaces the proven
 * envelopes + departures; the tracker stays a HINT (a member re-verifies every fetched byte). Absent → no sniff.
 */
export interface RelayAnnounceObserver {
  readonly onEnvelope?: (env: MembershipEnvelope) => void;
  readonly onLeave?:    (from: string) => void;
}

/**
 * Start an authenticated membership relay. Each connecting socket runs the Ed25519 proof-of-possession: the relay
 * challenges (fresh nonce + its own gate key), the peer signs `authProofBytes`, the relay `verifyAuthProof`s it and
 * binds socket → proven key. Thereafter it re-broadcasts each peer's envelopes — but STAMPS `from` with the proven
 * key (a forged `from` never crosses). An un-authenticated / mis-proving socket is closed, never relayed.
 *
 * @param gateSeed the relay's 32-byte Ed25519 seed — its gate key rides the challenge as the proof-binding.
 */
export function startAuthenticatedMembershipRelay(
  gateSeed: Uint8Array,
  port = 0,
  observer?: RelayAnnounceObserver,
): Promise<AuthenticatedMembershipRelay> {
  return (async () => {
    const gatePubKey = hex(await ed.getPublicKeyAsync(gateSeed));
    return await new Promise<AuthenticatedMembershipRelay>((resolve) => {
      const wss = new WebSocketServer({ port });
      const proven = new WeakMap<WebSocket, string>();   // socket → its PROVEN verifying key (the only `from` it may send)
      // A socket latches its auth attempt SYNCHRONOUSLY. `proven` only fills after an async verify, so gating on it
      // alone would let concurrent `auth` frames all pass and the last-verified proof win the binding. One attempt
      // per socket, decided once — a peer that wants a different key opens a different connection.
      const authLatched = new WeakSet<WebSocket>();

      wss.on("connection", (sock: WebSocket) => {
        const nonce = hex(webGetRandomValues(new Uint8Array(32)));
        const send = (f: RelayFrame) => { try { sock.send(JSON.stringify(f)); } catch { /* closed */ } };
        send({ t: "challenge", nonce, gatePubKey });

        // On departure, surface the proven holder so the tracker PRUNES it (an offline holder never lingers). Fires
        // only for a socket that reached auth-ok (a proven key), so an un-authenticated flap prunes nothing.
        sock.on("close", () => { const k = proven.get(sock); if (k) observer?.onLeave?.(k); });

        sock.on("message", (data: RawData) => {
          let frame: RelayFrame;
          try { frame = JSON.parse(asText(data)) as RelayFrame; } catch { return; }

          if (frame.t === "auth" && !authLatched.has(sock)) {
            authLatched.add(sock);   // latch BEFORE the await — a second auth frame on this socket never races in
            void (async () => {
              // `now` rides REQUIRED here: it enforces the same freshness window the daemon leg enforces, so a proof
              // harvested off one connection cannot be presented later on another. The per-socket nonce already
              // bounds replay within a connection; the window bounds it ACROSS connections too.
              const v = await verifyAuthProof({
                nonce, gatePubKey, peerPubKey: frame.peerPubKey, aud: MEMBERSHIP_AUD, ts: frame.ts, sig: frame.sig,
                now: Date.now(),
              });
              if (!v.ok) { try { sock.close(4003, v.reason ?? "auth failed"); } catch { /* closed */ } return; }
              proven.set(sock, frame.peerPubKey.toLowerCase());   // this socket speaks ONLY as this proven key
              send({ t: "auth-ok" });
            })();
            return;
          }

          if (frame.t === "env") {
            const provenKey = proven.get(sock);
            if (!provenKey) { try { sock.close(4003, "envelope before auth"); } catch { /* closed */ } return; }
            // STAMP `from` with the proven key — a forged `from` is overwritten, never trusted. The relay never
            // reads the opaque payload (ciphertext + verify-cap only ride it).
            const stamped: MembershipEnvelope = { ...frame.env, from: provenKey };
            // Surface the PROVEN-stamped envelope to the sniff observer (the carriage picks `cas-have` announces
            // into its bag-tracker). The relay itself stays agnostic — it forwards + surfaces, never interprets.
            observer?.onEnvelope?.(stamped);
            const out = JSON.stringify({ t: "env", env: stamped } satisfies RelayFrame);
            for (const client of wss.clients) {
              if (client !== sock && client.readyState === WebSocket.OPEN && proven.has(client)) client.send(out);
            }
          }
        });
      });

      wss.on("listening", () => {
        const addr = wss.address();
        const boundPort = typeof addr === "object" && addr ? addr.port : port;
        resolve({ port: boundPort, close: () => new Promise<void>((r) => wss.close(() => r())) });
      });
    });
  })();
}

/** An envelope this recipient should receive (addressed or broadcast, never self) — deliver-once on poll. */
function forRecipient(e: MembershipEnvelope, recipient: string): boolean {
  return e.from !== recipient && (e.to === recipient || e.to === MEMBERSHIP_BROADCAST);
}

/**
 * The authenticated live-WS membership channel — one connection per vessel, gated by proof-of-possession. On
 * `connect` it completes the Ed25519 handshake (signs the relay's challenge with `peerSeed`), so every envelope it
 * offers rides its PROVEN key as `from`. Satisfies the exact `MembershipChannel` contract (offer/poll, deliver-once)
 * — cas-wire's `serveCasWire` / `fetchSealedCidOverWire` run over it UNCHANGED.
 */
export class AuthenticatedWSMembershipChannel implements MembershipChannel {
  // The inbox is a STABLE array both the socket message handler (push) and poll (splice) share — NEVER reassigned,
  // so a poll that drains it empty before a response arrives cannot orphan the handler's later pushes.
  private constructor(private readonly ws: WebSocket, private readonly inbox: MembershipEnvelope[]) {}

  /**
   * Connect + complete the proof-of-possession handshake. Resolves once the relay returns `auth-ok`.
   *
   * `onClose` fires when a LIVE (post-auth-ok) channel's socket drops — the shore a reconnecting dialer watches
   * to re-dial + re-fold its board (a Herm's HEAL tooth). A drop BEFORE auth-ok rejects the pending connect
   * instead, so a dialer reschedules on it too (never hangs a half-open dial). Both settle exactly once.
   */
  static connect(
    url: string,
    peerSeed: Uint8Array,
    opts?: { readonly onClose?: () => void },
  ): Promise<AuthenticatedWSMembershipChannel> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const inbox: MembershipEnvelope[] = [];
      let channel: AuthenticatedWSMembershipChannel | null = null;
      let settled = false;   // the connect promise settles ONCE; the post-settle close routes to onClose
      ws.on("error", (err: Error) => { if (!settled) { settled = true; reject(err); } });
      ws.on("close", () => { if (!settled) { settled = true; reject(new Error("socket closed before auth-ok")); } else opts?.onClose?.(); });
      ws.on("message", (data: RawData) => {
        let frame: RelayFrame;
        try { frame = JSON.parse(asText(data)) as RelayFrame; } catch { return; }
        if (frame.t === "challenge") {
          void (async () => {
            const peerPubKey = hex(await ed.getPublicKeyAsync(peerSeed));
            const ts = new Date().toISOString();
            const sig = await ed25519SignerFromSeed(peerSeed)(
              authProofBytes({ nonce: frame.nonce, gatePubKey: frame.gatePubKey, peerPubKey, aud: MEMBERSHIP_AUD, ts }),
            );
            ws.send(JSON.stringify({ t: "auth", peerPubKey, ts, sig } satisfies RelayFrame));
          })();
        } else if (frame.t === "auth-ok") {
          settled = true;
          channel = new AuthenticatedWSMembershipChannel(ws, inbox);
          resolve(channel);
        } else if (frame.t === "env") {
          inbox.push(frame.env);
        }
      });
    });
  }

  async offer(env: MembershipEnvelope): Promise<void> {
    // The relay STAMPS `from` with this channel's proven key regardless — a caller cannot spoof another id.
    this.ws.send(JSON.stringify({ t: "env", env } satisfies RelayFrame));
  }

  async poll(recipient: string): Promise<readonly MembershipEnvelope[]> {
    // Extract the delivered-once envelopes for this recipient + REMOVE them in place (splice), keeping the shared
    // inbox array identity so the socket handler's later pushes always land where the next poll reads.
    const out: MembershipEnvelope[] = [];
    for (let i = 0; i < this.inbox.length; ) {
      if (forRecipient(this.inbox[i]!, recipient)) { out.push(this.inbox[i]!); this.inbox.splice(i, 1); }
      else i++;
    }
    return out;
  }

  close(): void { this.ws.close(); }
}
