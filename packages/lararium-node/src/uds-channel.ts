/**
 * uds-channel — the co-located fast path of the lares↔lararium binding.
 *
 * The daemon already holds the WARM daemon replica and the worker VerbDispatcher.
 * A co-located `lares` CLI never needed its own leaf replica + sync-on-connect (the
 * ~3s/command tax) — it only needs to hand the daemon a capability-bearing
 * invocation and await the receipt. This Unix-domain socket carries exactly that:
 * the CLI writes one invocation line, the daemon writes the summons into its warm
 * daemon doc (the SAME tiddler the worker reacts to from a WS peer), awaits the
 * durable @daemon/outcomes/<id> receipt, and returns it over the socket.
 *
 *   transport  = this socket (kernel-local, authority-agnostic)
 *   authority  = the invocation's requestedBy → the worker's verify-then-delegate
 *   record     = the CRDT outcome tiddler (unchanged — idempotent, re-queryable)
 *
 * Auth (v1): socket perms 0600 (owner-only) gate PRESENCE — only the operator's own
 * uid opens it; the requestedBy did rides the summons for cap-derivation. A signed
 * Ed25519 proof over the socket is the federation/attenuation hardening (follow-on);
 * the WS path keeps the full V3 gate for genuine remote peers.
 * See lar:///ha.ka.ba/lararium/api/lares-lararium-binding.
 */

import { createServer, type Server } from "node:net";
import { existsSync, unlinkSync, chmodSync } from "node:fs";
import type { DocHandle } from "@automerge/automerge-repo";
import {
  DAEMON_BAG_ID, AutomergeDocStore, CompositeStore,
  summon, OUTCOME_URI_PREFIX, type LarDoc,
} from "@lararium/mesh";
// The adaptive-timeout SERVO (fail on a GRADIENT, never a cliff): a per-verb wait that GROWS with the
// observed durations and clamps FLOOR..CEIL. The machine-code work stays Python; this is the
// coordinator's PATIENCE, servo'd so a long-but-honest verb (a big-session capture, a refresh queued
// behind a capture pass) is never false-killed the way a fixed 30s cliff killed them.
import { adaptiveTimeoutMs, recordMineDuration } from "@lararium/mempalace";

export interface UdsChannelOptions {
  /** The daemon's warm daemon doc handle (result.daemon.daemonHandle). */
  readonly daemonHandle: DocHandle<LarDoc>;
  /** Socket path — both sides agree on <dataDir>/lares.sock via the env contract. */
  readonly socketPath: string;
  /** Per-verb await budget (default 30s — recall cold-starts chromadb). */
  readonly timeoutMs?: number;
  readonly onLog?: (line: string) => void;
}

interface Invocation {
  verb: string;
  args?: Record<string, unknown>;
  requestedBy: string;
  requestId?: string;
}

export interface UdsChannel { close: () => void; }

export function startUdsChannel(opts: UdsChannelOptions): UdsChannel {
  const { daemonHandle, socketPath } = opts;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const log = opts.onLog ?? (() => { /* quiet */ });

  // Stale-socket cleanup — bind fails on a leftover path (daemon crash / restart).
  try { if (existsSync(socketPath)) unlinkSync(socketPath); } catch { /* ignore */ }

  // One writable composite over the warm daemon handle — same shape the CLI leaf
  // builds, but against the daemon's own replica (no Repo, no sync).
  const composite = new CompositeStore();
  composite.addLayer({
    bagId:    DAEMON_BAG_ID,
    store:    new AutomergeDocStore(daemonHandle, DAEMON_BAG_ID),
    writable: true,
  });

  // Write the summons into the warm daemon doc; await the durable outcome via the
  // doc's own change event (the worker dispatches + writes it back). Mirrors the
  // CLI submitVerb body — minus the network.
  const runVerb = async (inv: Invocation): Promise<Record<string, unknown>> => {
    const summonsRecord = summon({
      verb:        inv.verb,
      args:        inv.args ?? {},
      requestedBy: inv.requestedBy,
      ...(inv.requestId ? { requestId: inv.requestId } : {}),
    });
    const requestId    = (summonsRecord.tiddler as Record<string, string>)["request-id"]!;
    const outcomeTitle = `${OUTCOME_URI_PREFIX}${requestId}`;

    await composite.put(summonsRecord, { kind: "operator-import", sessionId: `lares-uds-${requestId}` });

    const readOutcome = async (): Promise<Record<string, unknown> | null> => {
      const event = await composite.get(outcomeTitle);
      if (!event || event.meta?.deleted) return null;
      const fields = event.tiddler as Record<string, string>;
      const status = fields["status"];
      if (status !== "done" && status !== "error") return null;
      let results: unknown;
      if (typeof fields["results"] === "string" && fields["results"].length > 0) {
        try { results = JSON.parse(fields["results"]); } catch { /* malformed — leave */ }
      }
      return {
        status, requestId,
        ...(results !== undefined ? { results } : {}),
        ...(fields["error-message"] !== undefined ? { errorMessage: fields["error-message"] } : {}),
      };
    };

    return await new Promise<Record<string, unknown>>((resolve, reject) => {
      let settled = false;
      const t0 = Date.now();
      const settle = (fn: () => void) => { if (!settled) { settled = true; cleanup(); fn(); } };
      // Only a COMPLETION teaches the servo (a timeout/hang never records → can't drag the EWMA to CEIL).
      const check = () => { void readOutcome().then((r) => { if (r) settle(() => { recordMineDuration(inv.verb, Date.now() - t0); resolve(r); }); }); };
      const onChange = () => check();
      daemonHandle.on("change", onChange);
      // Fail on a GRADIENT: the wait grows with this verb's learned durations (EWMA·K, clamped
      // FLOOR..CEIL) — headroom for an honest long verb, while a real hang still dies within CEIL. The
      // caller's own budget acts as a floor (never wait LESS than asked).
      const budget = Math.max(timeoutMs, adaptiveTimeoutMs(inv.verb));
      const timer = setTimeout(() => settle(() => reject(new Error(`verb "${inv.verb}" timed out after ${budget}ms (adaptive)`))), budget);
      const cleanup = () => { daemonHandle.off("change", onChange); clearTimeout(timer); };
      check(); // the outcome may already exist (idempotent re-submission)
    });
  };

  const server: Server = createServer((sock) => {
    let buf = "";
    sock.setEncoding("utf8");
    const fail = (msg: string) => { try { sock.end(JSON.stringify({ status: "error", errorMessage: msg }) + "\n"); } catch { /* gone */ } };
    sock.on("data", (chunk: string) => {
      buf += chunk;
      const nl = buf.indexOf("\n");
      if (nl === -1) return;          // one invocation per connection, line-delimited
      const line = buf.slice(0, nl);
      buf = "";
      let inv: Invocation;
      try { inv = JSON.parse(line) as Invocation; } catch { return fail("bad invocation json"); }
      if (!inv.verb || !inv.requestedBy) return fail("verb + requestedBy required");
      runVerb(inv).then(
        (outcome) => { try { sock.end(JSON.stringify(outcome) + "\n"); } catch { /* gone */ } },
        (err)     => fail(err instanceof Error ? err.message : String(err)),
      );
    });
    sock.on("error", () => { /* client vanished mid-call — nothing to do */ });
  });

  server.on("error", (e) => log(`uds error: ${e instanceof Error ? e.message : String(e)}`));
  server.listen(socketPath, () => {
    try { chmodSync(socketPath, 0o600); } catch { /* best effort — perms gate presence */ }
    log(`uds verb-channel on ${socketPath} (perms 0600)`);
  });

  return {
    close: () => {
      try { server.close(); } catch { /* ignore */ }
      try { if (existsSync(socketPath)) unlinkSync(socketPath); } catch { /* ignore */ }
    },
  };
}
