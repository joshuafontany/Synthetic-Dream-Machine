/**
 * admin-connector — connect the CLI to a running `lares serve` daemon as an
 * Automerge-repo WebSocket vessel connection, then submit verb-summons tiddlers
 * and await outcomes through the admin doc.
 *
 * Why vessel-not-RPC: verb-summons tiddlers + a CRDT sync channel preserve the
 * web3-only invariant. The CLI looks like any other vessel of the operator's
 * federation; the daemon's VerbDispatcher reacts to the same admin-doc changes
 * it would react to from a TW5 vm widget or a future ReactionEngine.
 *
 * Attach mode only (operator-chosen for B.5): the CLI requires a daemon to
 * be up at the configured port. Ephemeral in-process boot is deferred to a
 * later sprint when contention rules around NodeFS storage are addressed.
 *
 * Share substrate, not sovereignty (lar:///…/mesh/causal-island #substrate-not-
 * sovereignty): the CLI runs as a thin LEAF peer — its `Repo` carries NO storage
 * adapter, so its replica lives only in this process's RAM and syncs from the
 * daemon (the RELAY, which owns the canonical NodeFS replica) over the loopback
 * WS (a real Tier-3 island boundary, guarded by the V3 auth gate). Co-location on
 * one machine stays pono BECAUSE the boundaries hold: separate process, separate
 * replica, own keys. The anti-pattern would collapse these into one heap / Repo /
 * storage dir — the reason in-process boot stays deferred above.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Repo, type AutomergeUrl, type DocHandle } from "@automerge/automerge-repo";
import { WebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import {
  ADMIN_BAG_ID, AutomergeDocStore, CompositeStore,
  summon, SUMMONS_URI_PREFIX, OUTCOME_URI_PREFIX, VERB_RESULT_KEY,
  type LarDoc,
} from "@lararium/mesh";
import { repoRoot } from "@lararium/mesh/node";

export interface AdminVesselHandle {
  readonly repo:      Repo;
  readonly composite: CompositeStore;
  readonly admin:     DocHandle<LarDoc>;
  readonly disconnect: () => Promise<void>;
}

export interface ConnectOptions {
  /** Daemon port (default: LAR_PORT or 8080). */
  readonly port?: number;
  /** Daemon host (default: 127.0.0.1). */
  readonly host?: string;
  /**
   * Override path to social-bootstrap.json. Defaults to the path `lares init`
   * writes (packages/lararium-node/genesis/social-bootstrap.json).
   */
  readonly bootstrapPath?: string;
  /** Connect timeout in ms (default 3000). */
  readonly timeoutMs?: number;
}

function readAdminUrl(bootstrapPath: string): string {
  const raw = readFileSync(bootstrapPath, "utf8");
  const plugin = JSON.parse(raw);
  const inner = JSON.parse(plugin.text);
  const url   = inner?.tiddlers?.[ADMIN_BAG_ID]?.text;
  if (typeof url !== "string") {
    throw new Error(`admin AutomergeUrl missing from ${bootstrapPath}`);
  }
  return url;
}

/** Connect to the daemon, sync the admin doc, return helpers. */
export async function connectAdminVessel(opts: ConnectOptions = {}): Promise<AdminVesselHandle> {
  const port = opts.port ?? Number(process.env["LAR_PORT"] ?? 8080);
  const host = opts.host ?? "127.0.0.1";
  const bootstrap = opts.bootstrapPath ?? join(
    repoRoot, "packages", "lararium-node", "genesis", "social-bootstrap.json",
  );
  const timeout = opts.timeoutMs ?? 3000;
  const adminUrl = readAdminUrl(bootstrap);

  const adapter = new WebSocketClientAdapter(`ws://${host}:${port}/ws`);
  const repo    = new Repo({ network: [adapter] });

  await Promise.race([
    adapter.whenReady(),
    new Promise<never>((_, rej) => setTimeout(
      () => rej(new Error(`could not reach lares daemon at ws://${host}:${port}`)),
      timeout,
    )),
  ]);

  const admin = await repo.find<LarDoc>(adminUrl as AutomergeUrl);
  await admin.whenReady();

  const composite = new CompositeStore();
  composite.addLayer({
    bagId:    ADMIN_BAG_ID,
    store:    new AutomergeDocStore(admin, ADMIN_BAG_ID),
    writable: true,
  });

  const disconnect = async (): Promise<void> => {
    await repo.flush();
    adapter.disconnect();
  };

  return { repo, composite, admin, disconnect };
}

export interface SubmitOptions {
  /** Polling interval in ms (default 100). */
  readonly pollMs?:   number;
  /** Total timeout in ms (default 10000). */
  readonly timeoutMs?: number;
  /**
   * Content-addressed request id (V1). For an idempotent/declarative verb the
   * caller passes `taskContentId({subject, command, args, nonce:""})` so a
   * re-issued identical change collapses to the same id — the dispatcher's
   * outcome-keyed dedup then gives exactly-once EFFECT. Omit → fresh `newRequestId()`.
   */
  readonly requestId?: string;
}

export interface SubmitTargetResult {
  readonly ok:      boolean;
  readonly output?: Record<string, unknown>;
  readonly error?:  string;
}

export interface SubmitResult {
  readonly status:       "done" | "error";
  readonly results?:     Record<string, SubmitTargetResult>;
  readonly errorMessage?: string;
  readonly requestId:    string;
}

export function summaryOutput(result: SubmitResult): Record<string, unknown> | undefined {
  return result.results?.[VERB_RESULT_KEY]?.output;
}

/**
 * Write a verb-summons tiddler to the shared admin CRDT doc, then poll for
 * the durable @admin/outcomes/<requestId> tiddler — its appearance IS the
 * "done" signal (CRDT convergence = result).
 *
 * Summons tiddler is fire-and-forget; the dispatcher tombstones it.
 * CLI never tombstones; a CLI crash leaves no namespace residue.
 */
export async function submitVerb(
  vessel:      AdminVesselHandle,
  verb:        string,
  args:        Record<string, unknown>,
  requestedBy: string,
  opts:        SubmitOptions = {},
): Promise<SubmitResult> {
  const pollMs    = opts.pollMs    ?? 100;
  const timeoutMs = opts.timeoutMs ?? 10000;

  const summonsRecord = summon({ verb, args, requestedBy, ...(opts.requestId ? { requestId: opts.requestId } : {}) });
  const requestId    = (summonsRecord.tiddler as Record<string, string>)['request-id']!;
  const outcomeTitle = `${OUTCOME_URI_PREFIX}${requestId}`;

  await vessel.composite.put(summonsRecord, { kind: "operator-import", sessionId: `lares-cli-${requestId}` });

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, pollMs));
    const event = await vessel.composite.get(outcomeTitle);
    if (!event || event.meta?.deleted) continue;
    const fields = event.tiddler as Record<string, string>;
    const status = fields["status"];
    if (status !== "done" && status !== "error") continue;

    let results: Record<string, SubmitTargetResult> | undefined;
    if (typeof fields["results"] === "string" && fields["results"].length > 0) {
      try {
        const parsed = JSON.parse(fields["results"]);
        if (parsed && typeof parsed === "object") {
          results = parsed as Record<string, SubmitTargetResult>;
        }
      } catch {
        /* malformed — leave undefined */
      }
    }
    const errorMessage = fields["error-message"];
    return {
      status:    status as "done" | "error",
      requestId,
      ...(results      !== undefined && { results }),
      ...(errorMessage !== undefined && { errorMessage }),
    };
  }

  throw new Error(`verb "${verb}" timed out after ${timeoutMs}ms`);
}

// Re-export so verb-facing helpers don't need a separate import path.
export { SUMMONS_URI_PREFIX };
