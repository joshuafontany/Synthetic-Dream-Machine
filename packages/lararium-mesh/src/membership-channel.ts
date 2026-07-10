/**
 * membership-channel — the STRANGLER-FIG SEAM the WHO-plane ceremony crosses.
 *
 * The membership ceremony (contact-card exchange · join-request · admit · invite) is
 * bidirectional; the transport under it is swappable. This interface is the fig's trunk:
 *   · Impl-1 — file/POST (FileMembershipChannel, node-side): ships the swarm witness NOW.
 *   · Impl-2 — live-WS (over lar-ws-client-adapter): drops in behind THIS SAME interface
 *     later, and the file impl is then retired — the strangler-fig replacement, no swarm
 *     test rewritten. The seam is why the swap costs nothing above it.
 *
 * The channel carries OPAQUE ceremony envelopes — it never interprets the payload (a
 * contact card, an admit payload, an invite token). Routing only: address vessel→vessel
 * (or broadcast to a place), deliver-once per recipient.
 *
 * Platform-blind: no node: imports. The in-memory impl here is the reference + the unit
 * substrate; the file/WS impls live node-side behind this interface.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-place
 */

/** An opaque ceremony payload addressed across the channel, vessel→vessel (or → a place). */
export interface MembershipEnvelope {
  /** The ceremony step this carries — routing metadata only; the channel never reads `payload`. */
  readonly kind: string;             // "contact-card" | "join-request" | "admit" | "invite" | …
  /** The sender's identifier (vessel/handle hex). A sender never receives its own envelopes. */
  readonly from: string;
  /** The recipient's identifier, or "*" to broadcast to every other participant of a place. */
  readonly to: string;
  /** The ceremony-specific body — opaque to the channel (a contact card, admit payload, …). */
  readonly payload: unknown;
}

/** Broadcast address — an envelope every OTHER participant receives once. */
export const MEMBERSHIP_BROADCAST = "*";

/**
 * The membership channel — the swappable seam. `offer` sends toward `env.to`; `poll`
 * drains the envelopes addressed to a recipient (plus broadcasts), each delivered once.
 * A file/POST impl and a live-WS impl both satisfy exactly this; the ceremony above
 * never knows which carries it.
 */
export interface MembershipChannel {
  offer(env: MembershipEnvelope): Promise<void>;
  poll(recipient: string): Promise<readonly MembershipEnvelope[]>;
}

/**
 * The reference channel — an in-process log with a per-recipient cursor (deliver-once).
 * Platform-blind: the unit substrate + the shape the file/WS impls mirror. A recipient
 * never receives its own envelopes; broadcasts reach every other recipient once.
 */
export class InMemoryMembershipChannel implements MembershipChannel {
  private readonly log: MembershipEnvelope[] = [];
  private readonly cursors = new Map<string, number>();

  offer(env: MembershipEnvelope): Promise<void> {
    this.log.push(env);
    return Promise.resolve();
  }

  poll(recipient: string): Promise<readonly MembershipEnvelope[]> {
    const from = this.cursors.get(recipient) ?? 0;
    const out: MembershipEnvelope[] = [];
    for (let i = from; i < this.log.length; i++) {
      const e = this.log[i];
      if (e && e.from !== recipient && (e.to === recipient || e.to === MEMBERSHIP_BROADCAST)) out.push(e);
    }
    this.cursors.set(recipient, this.log.length);   // consume everything seen so far, once
    return Promise.resolve(out);
  }
}
