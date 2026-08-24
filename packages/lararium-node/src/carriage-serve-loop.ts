/**
 * carriage-serve-loop — the vessel's SERVE side of the carriage: it dials a carriage relay over an authenticated
 * WS channel and answers members' `want-block`s on a clean poll interval, so a sealed cad body crosses hearth to
 * hearth. This closes the LIVE-WIRE: a member over the relay carries a sealed ciphertext; a stranger draws Mu.
 *
 * INERT UNTIL CONFIGURED. The vessel starts NO loop when no relay URL rides the config — the caller gates the whole
 * thing, so an unconfigured boot opens zero carriage socket and changes zero behaviour (additive, off by default).
 *
 * CARRY ⊥ READ. The loop serves CIPHERTEXT + the void ONLY, gated by `serveCasWire`'s `carrierShareDecision`
 * (a proven MEMBER over a provably-sealed plane carries; a STRANGER / non-member / Kapae'd draws byte-identical Mu).
 * The read-cap NEVER rides this shore — it arrives via the keyring at admission, on the private lane.
 *
 * CLEAN LIFECYCLE. The connect runs fire-and-forget with a caught rejection (a down relay never blocks or crashes
 * the boot); once `auth-ok` lands, an interval polls. `stop()` latches the loop shut, clears the timer, and closes
 * the live channel — NON-BLOCKING, so a stop mid-handshake never hangs on a slow / half-open relay. A connect that
 * lands AFTER stop reads the latched flag and closes its own fresh channel (the stopped-guard below), so no timer /
 * socket survives teardown either way. A poll never overlaps itself (a slow serve turn holds the next tick off).
 *
 * HEAL — the RECONNECTING dialer (the immune keel's heal-after-drop tooth). A relay that drops mid-serve, a
 * partition, a restarted crossroads: the channel's `onClose` fires, the loop clears its poll timer and RE-DIALS on
 * a backoff until the relay answers again. A RE-connect (never the first) fires `onReconnect`, so the vessel
 * RE-FOLDS the board it read as-of-its-last-sync (a peer's bans/admits that landed during the gap). The first
 * dial fires no re-fold — it stood on a fresh read already. `stop()` latches every timer shut so no re-dial
 * outlives teardown. A relay down at boot retries on the backoff, unblocked, off-thread (boot never waits on it).
 *
 * TWO SOCKETS STAY TWO. This channel (Socket B, ciphertext) SEPARATES from the vessel's Automerge `/ws` relay
 * (Socket A, cleartext CRDT behind the DaemonAuthGate) — the two never cross.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/carriage-serve-loop
 */

import { MEMBERSHIP_BROADCAST } from "@lararium/mesh";
import { AuthenticatedWSMembershipChannel } from "./authenticated-membership-relay.js";
import { serveCasWire, CAS_HAVE, type CasWireServerDeps } from "./cas-wire.js";

/** The default poll cadence — a member's want-block waits at most this long for a serve turn. */
const DEFAULT_POLL_INTERVAL_MS = 200;
/** The default backoff before a re-dial after a drop / a failed connect — bounds a flapping relay's retry rate. */
const DEFAULT_RECONNECT_DELAY_MS = 500;

/** A running carriage serve-loop — the vessel's answer side over the relay. */
export interface CarriageServeLoop {
  /** Latch the loop shut: clear the timer + close the channel (idempotent, awaits the pending connect). */
  stop(): Promise<void>;
  /** RE-SHARE: broadcast a `cas-have(cid)` over the LIVE channel for each cid, so the relay's bag-tracker re-learns
   *  this holder (after a prune / reconnect). Best-effort — a down channel offers nothing. Returns the count offered. */
  announce(cids: Iterable<string>): Promise<number>;
}

/** What the serve-loop dials with + answers over. */
export interface CarriageServeLoopConfig {
  /** The carriage relay URL (`ws://<host>:<port>`) — the vessel dials it and proves possession of `vesselSeed`. */
  readonly relayUrl:        string;
  /** The vessel's 32-byte Ed25519 seed — its PROVEN key stamps every envelope it offers. */
  readonly vesselSeed:    Uint8Array;
  /** This vessel's own membership address (its verifying-key hex) — the addr members want-block against. */
  readonly serverAddr:      string;
  /** The cas-wire serve deps (cadDir + the seal / membership / antigen / fedGate rings) — the carry-lane gate. */
  readonly deps:            CasWireServerDeps;
  /** The poll cadence in ms (default 200). */
  readonly pollIntervalMs?: number;
  /** Backoff before a re-dial after a drop / a failed connect (default 500). */
  readonly reconnectDelayMs?: number;
  /** Fired after a RE-connect completes (NEVER on the first connect) — the vessel re-folds its board here (HEAL). */
  readonly onReconnect?:    () => void | Promise<void>;
  /** A log sink for connect / serve faults (defaults to a no-op). */
  readonly onLog?:          (line: string) => void;
}

/**
 * Start the carriage serve-loop. Dials the relay, completes the proof-of-possession handshake, then polls
 * `serveCasWire` on an interval. Returns immediately (the connect is async); `stop()` tears it down cleanly.
 */
export function startCarriageServeLoop(cfg: CarriageServeLoopConfig): CarriageServeLoop {
  const interval       = cfg.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const reconnectDelay = cfg.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS;
  const log = cfg.onLog ?? ((): void => { /* quiet */ });

  let stopped = false;
  let running = false;   // one serve turn at a time — a slow turn holds the next tick off (no overlap)
  let timer:          ReturnType<typeof setInterval>  | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout>   | null = null;
  let channel: AuthenticatedWSMembershipChannel | null = null;
  let dials = 0;   // the first dial stands the loop; every dial past it is a RE-connect (fires onReconnect)

  const tick = (): void => {
    if (stopped || running || !channel) return;
    running = true;
    const ch = channel;
    void serveCasWire(ch, cfg.serverAddr, cfg.deps)
      .catch((err: unknown) => { log(`serve turn faulted: ${String(err)}`); })
      .finally(() => { running = false; });
  };

  const scheduleRedial = (): void => {
    if (stopped || reconnectTimer) return;              // one pending re-dial at a time; never past stop()
    reconnectTimer = setTimeout(() => { reconnectTimer = null; void dial(); }, reconnectDelay);
    reconnectTimer.unref?.();                           // a pending re-dial never keeps the process alive
  };

  // The live channel dropped (a relay restart / partition): clear the poll timer, drop the dead channel, and
  // schedule a re-dial. `stop()` sets `stopped` BEFORE it closes the channel, so a teardown-triggered close
  // reads `stopped` here and never reschedules — no re-dial outlives teardown.
  const onDrop = (): void => {
    if (timer) { clearInterval(timer); timer = null; }
    channel = null;
    if (!stopped) { log(`carriage channel dropped over ${cfg.relayUrl} — re-dialing`); scheduleRedial(); }
  };

  // Dial + latch the channel once auth-ok lands. A down relay / a pre-auth close REJECTS → caught, logged, and
  // RE-DIALED on a backoff (boot never blocks — the retry runs off-thread). A connect that lands after stop()
  // reads `stopped` and closes its own channel — no leak, no matter the order. A RE-connect fires onReconnect.
  const dial = async (): Promise<void> => {
    if (stopped) return;
    const attempt = ++dials;
    try {
      const ch = await AuthenticatedWSMembershipChannel.connect(cfg.relayUrl, cfg.vesselSeed, { onClose: onDrop });
      if (stopped) { ch.close(); return; }              // stopped mid-connect → close the fresh channel, no timer
      channel = ch;
      timer = setInterval(tick, interval);
      if (attempt === 1) {
        log(`carriage serve-loop up over ${cfg.relayUrl} (serverAddr ${cfg.serverAddr})`);
      } else {
        log(`carriage serve-loop RE-connected over ${cfg.relayUrl} (attempt ${attempt}) — re-folding the board`);
        try { await cfg.onReconnect?.(); } catch (err) { log(`onReconnect faulted: ${String(err)}`); }
      }
    } catch (err) {
      if (stopped) return;
      log(`carriage connect failed (${cfg.relayUrl}): ${String(err)} — retrying in ${reconnectDelay}ms`);
      scheduleRedial();
    }
  };

  void dial();

  return {
    async stop(): Promise<void> {
      stopped = true;                                    // a still-pending connect will close its own channel on land
      if (timer)          { clearInterval(timer);   timer = null; }
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      channel?.close();                                  // close the LIVE channel (null when the handshake never landed)
      channel = null;
    },
    async announce(cids: Iterable<string>): Promise<number> {
      const ch = channel;
      if (!ch || stopped) return 0;                      // down / torn-down → nothing to announce over (best-effort)
      let n = 0;
      for (const cid of cids) {
        await ch.offer({ kind: CAS_HAVE, from: cfg.serverAddr, to: MEMBERSHIP_BROADCAST, payload: { cid } });
        n += 1;
      }
      return n;
    },
  };
}
