/**
 * carriage-serve-loop — the vessel's SERVE side of the carriage: it dials a carriage relay over an authenticated
 * WS channel and answers members' `want-block`s on a clean poll interval, so a sealed @cad body crosses hearth to
 * hearth. This closes the LIVE-WIRE: a member over the relay carries a sealed ciphertext; a stranger draws Mu.
 *
 * INERT UNTIL CONFIGURED. The vessel starts NO loop when no relay URL rides the config — the caller gates the whole
 * thing, so an unconfigured boot opens zero carriage socket and changes zero behaviour (additive, off by default).
 *
 * CARRY ⊥ READ. The loop serves CIPHERTEXT + the void ONLY, gated by `serveCasWire`'s `memberCarryShareDecision`
 * (a proven MEMBER over a provably-sealed plane carries; a STRANGER / non-member / Kapae'd draws byte-identical Mu).
 * The read-cap NEVER rides this seam — it arrives via the keyring at admission, on the private lane.
 *
 * CLEAN LIFECYCLE. The connect runs fire-and-forget with a caught rejection (a down relay never blocks or crashes
 * the boot); once `auth-ok` lands, an interval polls. `stop()` latches the loop shut, clears the timer, and closes
 * the live channel — NON-BLOCKING, so a stop mid-handshake never hangs on a slow / half-open relay. A connect that
 * lands AFTER stop reads the latched flag and closes its own fresh channel (the stopped-guard below), so no timer /
 * socket survives teardown either way. A poll never overlaps itself (a slow serve turn holds the next tick off).
 *
 * TWO SOCKETS STAY TWO. This channel (Socket B, ciphertext) SEPARATES from the vessel's Automerge `/ws` relay
 * (Socket A, cleartext CRDT behind the DaemonAuthGate) — the two never cross.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/carriage-serve-loop
 */

import { AuthenticatedWSMembershipChannel } from "./authenticated-membership-relay.js";
import { serveCasWire, type CasWireServerDeps } from "./cas-wire.js";

/** The default poll cadence — a member's want-block waits at most this long for a serve turn. */
const DEFAULT_POLL_INTERVAL_MS = 200;

/** A running carriage serve-loop — the vessel's answer side over the relay. */
export interface CarriageServeLoop {
  /** Latch the loop shut: clear the timer + close the channel (idempotent, awaits the pending connect). */
  stop(): Promise<void>;
}

/** What the serve-loop dials with + answers over. */
export interface CarriageServeLoopConfig {
  /** The carriage relay URL (`ws://<host>:<port>`) — the vessel dials it and proves possession of `operatorSeed`. */
  readonly relayUrl:        string;
  /** The vessel's 32-byte Ed25519 seed — its PROVEN key stamps every envelope it offers. */
  readonly operatorSeed:    Uint8Array;
  /** This vessel's own membership address (its verifying-key hex) — the addr members want-block against. */
  readonly serverAddr:      string;
  /** The cas-wire serve deps (cadDir + the seal / membership / antigen / fedGate rings) — the carry-lane gate. */
  readonly deps:            CasWireServerDeps;
  /** The poll cadence in ms (default 200). */
  readonly pollIntervalMs?: number;
  /** A log sink for connect / serve faults (defaults to a no-op). */
  readonly onLog?:          (line: string) => void;
}

/**
 * Start the carriage serve-loop. Dials the relay, completes the proof-of-possession handshake, then polls
 * `serveCasWire` on an interval. Returns immediately (the connect is async); `stop()` tears it down cleanly.
 */
export function startCarriageServeLoop(cfg: CarriageServeLoopConfig): CarriageServeLoop {
  const interval = cfg.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const log = cfg.onLog ?? ((): void => { /* quiet */ });

  let stopped = false;
  let running = false;   // one serve turn at a time — a slow turn holds the next tick off (no overlap)
  let timer: ReturnType<typeof setInterval> | null = null;
  let channel: AuthenticatedWSMembershipChannel | null = null;

  const tick = (): void => {
    if (stopped || running || !channel) return;
    running = true;
    const ch = channel;
    void serveCasWire(ch, cfg.serverAddr, cfg.deps)
      .catch((err: unknown) => { log(`serve turn faulted: ${String(err)}`); })
      .finally(() => { running = false; });
  };

  // Dial + latch the channel once auth-ok lands. A down relay REJECTS → caught, logged, no loop stands, boot unblocked.
  // A connect that lands after stop() reads `stopped` and closes its own channel — no leak, no matter the order.
  void AuthenticatedWSMembershipChannel
    .connect(cfg.relayUrl, cfg.operatorSeed)
    .then((ch) => {
      if (stopped) { ch.close(); return; }   // stopped mid-connect → close the fresh channel, never start a timer
      channel = ch;
      timer = setInterval(tick, interval);
      log(`carriage serve-loop up over ${cfg.relayUrl} (serverAddr ${cfg.serverAddr})`);
    })
    .catch((err: unknown) => { log(`carriage connect failed (${cfg.relayUrl}): ${String(err)} — no loop stands`); });

  return {
    async stop(): Promise<void> {
      stopped = true;                                    // a still-pending connect will close its own channel on land
      if (timer) { clearInterval(timer); timer = null; }
      channel?.close();                                  // close the LIVE channel (null when the handshake never landed)
      channel = null;
    },
  };
}
