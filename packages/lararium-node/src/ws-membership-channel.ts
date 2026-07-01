/**
 * ws-membership-channel — the LIVE-WS impl of the membership seam (MembershipChannel),
 * the strangler-fig replacement for the file/POST impl. Same interface, real sockets;
 * the swarm ceremony above never learns the transport changed.
 *
 * The relay is DUMB — it re-broadcasts each envelope to every OTHER connected client;
 * the client buffers inbound + filters on poll (addressed-to-me OR broadcast, never
 * from-me). Membership envelopes are opaque routing payloads (contact card, admit,
 * invite) — NOT Automerge sync — so this carries NONE of the anti-relay sync gate
 * (the cap-wall); it is a plain message relay.
 *
 * Node-side (the transport branch); the seam + the file impl stay platform-blind.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/cabal-place
 */

import { WebSocketServer, WebSocket, type RawData } from "ws";
import {
  MEMBERSHIP_BROADCAST,
  type MembershipChannel, type MembershipEnvelope,
} from "@lararium/mesh";

const asText = (data: RawData): string => (typeof data === "string" ? data : data.toString());

/** A dumb membership relay — re-broadcasts each envelope to every OTHER connected client. */
export interface MembershipRelay {
  readonly port: number;
  close(): Promise<void>;
}

export function startMembershipRelay(port = 0): Promise<MembershipRelay> {
  return new Promise((resolve) => {
    const wss = new WebSocketServer({ port });
    wss.on("connection", (sock: WebSocket) => {
      sock.on("message", (data: RawData) => {
        const text = asText(data);
        for (const client of wss.clients) {
          if (client !== sock && client.readyState === WebSocket.OPEN) client.send(text);
        }
      });
    });
    wss.on("listening", () => {
      const addr = wss.address();
      const boundPort = typeof addr === "object" && addr ? addr.port : port;
      resolve({ port: boundPort, close: () => new Promise<void>((r) => wss.close(() => r())) });
    });
  });
}

/** Filter predicate — an envelope this recipient should receive (addressed or broadcast, never self). */
function forRecipient(e: MembershipEnvelope, recipient: string): boolean {
  return e.from !== recipient && (e.to === recipient || e.to === MEMBERSHIP_BROADCAST);
}

/**
 * The live-WS membership channel — one connection per vessel. Buffers inbound envelopes;
 * `offer` sends to the relay (which broadcasts); `poll` drains the buffer, filtered +
 * delivered-once. Satisfies the exact same contract as InMemory/File impls.
 */
export class WSMembershipChannel implements MembershipChannel {
  private readonly ws: WebSocket;
  private inbox: MembershipEnvelope[] = [];
  private readonly ready: Promise<void>;

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.on("message", (data: RawData) => {
      this.inbox.push(JSON.parse(asText(data)) as MembershipEnvelope);
    });
    this.ready = new Promise<void>((res, rej) => {
      this.ws.on("open", () => res());
      this.ws.on("error", (err: Error) => rej(err));
    });
  }

  /** Resolve once the socket is open (offer/poll await this). */
  opened(): Promise<void> { return this.ready; }

  async offer(env: MembershipEnvelope): Promise<void> {
    await this.ready;
    this.ws.send(JSON.stringify(env));
  }

  async poll(recipient: string): Promise<readonly MembershipEnvelope[]> {
    await this.ready;
    const out = this.inbox.filter((e) => forRecipient(e, recipient));
    this.inbox = this.inbox.filter((e) => !forRecipient(e, recipient));
    return out;
  }

  close(): void { this.ws.close(); }
}
