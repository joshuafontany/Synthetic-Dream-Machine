/**
 * nexus-client-dial — the vessel's CLIENT dial-out leg (Socket A, cleartext CRDT). Today a node stands
 * only a SERVER adapter (`ListeningWSServerAdapter` behind the `DaemonAuthGate`); NONE dials out. When a
 * peer sync URL rides the config, the live vessel mounts a `LarWSClientAdapter` — carrying the OPERATOR's
 * OWN Ed25519 identity + the peer's gate verifying-key — onto its running Automerge `Repo`, so it DIALS a
 * peer node's `/ws` and syncs. This is the SAME-OPERATOR device path: a second device whose key sits in
 * the founder's PersonaGroup dials in, the peer's gate vouches it `same-operator`, and full private sync
 * breathes both ways (`self-slot-share.ts`, `selfSlotShareDecision`).
 *
 * INERT UNTIL CONFIGURED. `maybeStartNexusClientDial` returns null when no sync URL / gate key rides the
 * config — NO adapter mounts, NO socket opens, the boot behaves EXACTLY as it did before (additive, off by
 * default). The caller gates the whole thing, the same discipline the carriage serve-loop follows.
 *
 * ONE SOCKET, ITS OWN. This client dial rides the Automerge `/ws` relay (Socket A) — the SAME transport the
 * server adapter answers on, cleartext CRDT behind the gate. It NEVER touches the carriage relay (Socket B,
 * ciphertext cad bodies); the two stay two.
 *
 * REAL CRYPTO, NEVER FORGED. The dial carries the operator's OWN leaf identity (its cached ContactCard +
 * bare-Ed25519 signer) and binds its V3 proof-of-possession to the DIALED peer's gate key (known
 * out-of-band, NEVER trusted from the wire — the anti-relay law). An un-admitted key ANERGIZES at the
 * peer's gate and never syncs; the deny is load-bearing, not an incidental transport failure.
 *
 * CLEAN LIFECYCLE. `stop()` disconnects the client adapter (standing down its reconnect loop), so no socket
 * leaks past the vessel's close — folded into the vessel teardown beside the carriage loop's `stop()`.
 *
 * Meme: lar:///ha.ka.ba/lararium/node/nexus-client-dial
 */

import type { Repo } from "@automerge/automerge-repo";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import { LarWSClientAdapter, DAEMON_BAG_ID } from "@lararium/mesh";
import type { LeafIdentity } from "@lararium/mesh";

/** A mounted client dial — the adapter it mounted (for assertion) + a clean stop. */
export interface NexusClientDial {
  /** The mounted client adapter — carries `.anergized` (the peer's refusal, or null). */
  readonly adapter: LarWSClientAdapter;
  /** Disconnect the client adapter + stand down its reconnect loop (idempotent). */
  stop(): void;
}

/** What the dial-out mounts with. */
export interface NexusClientDialConfig {
  /** The running Automerge Repo the client adapter mounts onto (Socket A). */
  readonly repo:       Repo;
  /** The peer node's `/ws` URL (`ws://…/ws` or `wss://…/ws`) this vessel dials. */
  readonly syncUrl:    string;
  /** The DIALED peer's gate verifying-key hex — the gate-binding the V3 proof commits to (out-of-band). */
  readonly gatePubKey: string;
  /** This vessel's OWN leaf identity — cached ContactCard + bare-Ed25519 signer (never a forged one). */
  readonly identity:   LeafIdentity;
  /** The target bag URI the proof seeks (`aud`) — defaults to the daemon bag, the gate's armed audience. */
  readonly aud?:       string;
  /** OPTIONAL: an island/doc URL to `repo.find()` once mounted — pulls the peer's doc across the socket.
   *  Consumes the device-admit payload's `islandDocUrl`. Absent → the vessel syncs only docs it already knows. */
  readonly docUrl?:    string | null;
  /** A log sink for the dial (defaults to a no-op). */
  readonly onLog?:     (line: string) => void;
}

/**
 * Mount the client dial-out onto the running Repo. Adds a `LarWSClientAdapter` to the repo's network
 * subsystem (the adapter dials + runs the V3 handshake on connect), then — when a `docUrl` rides the
 * config — kicks a `repo.find()` to pull the peer's doc across the crossed socket. Returns the mounted
 * dial; `stop()` disconnects it cleanly.
 */
export function startNexusClientDial(cfg: NexusClientDialConfig): NexusClientDial {
  const log = cfg.onLog ?? ((): void => { /* quiet */ });
  const adapter = new LarWSClientAdapter({
    url:        cfg.syncUrl,
    identity:   cfg.identity,
    aud:        cfg.aud ?? DAEMON_BAG_ID,
    gatePubKey: cfg.gatePubKey,
  });
  cfg.repo.networkSubsystem.addNetworkAdapter(adapter);
  log(`nexus dial-out up → ${cfg.syncUrl} (aud=${cfg.aud ?? DAEMON_BAG_ID})`);

  // Pull the peer's named doc, when one rides the config. A denial reads as "never resolved" (the adapter
  // anergizes at the gate), so the find just never settles — never a crash. Fire-and-forget with a caught
  // rejection so a down peer / an un-admitted key never blocks or crashes the boot.
  if (cfg.docUrl) {
    void cfg.repo.find(cfg.docUrl as AutomergeUrl).then(
      () => log(`nexus dial-out synced peer doc ${cfg.docUrl}`),
      (err: unknown) => log(`nexus dial-out could not resolve peer doc ${cfg.docUrl}: ${String(err)}`),
    );
  }

  let stopped = false;
  return {
    adapter,
    stop(): void {
      if (stopped) return;
      stopped = true;
      try { adapter.disconnect(); } catch { /* never connected / already down */ }
      log(`nexus dial-out down → ${cfg.syncUrl}`);
    },
  };
}

/** The resolved dial-out config — a sync URL + a gate key both present, else null (inert). */
export interface NexusClientDialInput {
  readonly repo:        Repo;
  readonly syncUrl?:    string | null;
  readonly gatePubKey?: string | null;
  readonly identity:    LeafIdentity;
  readonly aud?:        string;
  readonly docUrl?:     string | null;
  readonly onLog?:      (line: string) => void;
}

/**
 * The INERT gate: mount the client dial ONLY when BOTH a sync URL and a peer gate key ride the config;
 * otherwise return null — no adapter, no socket, zero behaviour change. A sync URL without a gate key
 * cannot bind the anti-relay proof, so it fails CLOSED to inert (never a gate-less dial).
 */
export function maybeStartNexusClientDial(input: NexusClientDialInput): NexusClientDial | null {
  const syncUrl = input.syncUrl?.trim();
  const gate    = input.gatePubKey?.trim();
  if (!syncUrl) return null;                       // no peer configured → the leaf carries only what it pulls
  if (!gate) {
    input.onLog?.(`nexus dial-out SKIPPED — a sync URL (${syncUrl}) rides the config but no gate key (LAR_JOIN_GATE); a gate-less dial cannot bind the anti-relay proof (fail-closed to inert)`);
    return null;
  }
  return startNexusClientDial({
    repo:       input.repo,
    syncUrl,
    gatePubKey: gate,
    identity:   input.identity,
    ...(input.aud ? { aud: input.aud } : {}),
    ...(input.docUrl ? { docUrl: input.docUrl } : {}),
    ...(input.onLog ? { onLog: input.onLog } : {}),
  });
}
