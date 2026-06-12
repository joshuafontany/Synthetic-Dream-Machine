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
import {
  ADMIN_BAG_ID, AutomergeDocStore, CompositeStore,
  summon, SUMMONS_URI_PREFIX, OUTCOME_URI_PREFIX, VERB_RESULT_KEY,
  type LarDoc,
} from "@lararium/mesh";
import { larPort, larDataDir, larBootstrapPath } from "./env.js";
import { loadLeafIdentity, LarWSClientAdapter } from "@lararium/node";

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
  /**
   * Operator key + ContactCard directory (the leaf identity). Defaults to the
   * path `lares init` writes (packages/lararium-node/.lararium).
   */
  readonly dataDir?: string;
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
  const port = opts.port ?? larPort();
  const host = opts.host ?? "127.0.0.1";
  // ONE env contract (env.ts): LAR_ROOT/.lararium for data, LAR_ROOT/genesis
  // for bootstrap — an isolated instance (staged harness, second vessel)
  // resolves its own identity + bootstrap from its own root.
  const bootstrap = opts.bootstrapPath ?? larBootstrapPath();
  const timeout = opts.timeoutMs ?? 3000;
  const adminUrl = readAdminUrl(bootstrap);

  // Light leaf identity (cached ContactCard + bare-Ed25519 signer; no keyhive) —
  // the CLI authenticates at the relay's V3 gate as a sovereign peer. The gate
  // runs lar:challenge/auth on the raw socket BEFORE Automerge sync; the leaf
  // signs the gate-bound proof. gatePubKey = the operator's own relay key (the
  // leaf's own verifying key, same operator); the relay's worker recomputes the
  // proof against its own key, failing closed on any mismatch (anti-relay).
  const dataDir  = opts.dataDir ?? larDataDir();
  const identity = await loadLeafIdentity(dataDir);
  const adapter  = new LarWSClientAdapter({
    url:        `ws://${host}:${port}/ws`,
    identity,
    aud:        ADMIN_BAG_ID,
    gatePubKey: identity.peerPubKey,
  });
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
 * Write a verb-summons tiddler to the shared admin CRDT doc, then SUBSCRIBE
 * to admin-doc changes for the durable @admin/outcomes/<requestId> tiddler —
 * its arrival IS the "done" signal (CRDT convergence = result; the change
 * event = the wake). The old 100ms poll loop died 2026-06-11: a busy-wait
 * wearing a web3 coat — the doc already knew how to call back.
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
  const timeoutMs = opts.timeoutMs ?? 10000;

  const summonsRecord = summon({ verb, args, requestedBy, ...(opts.requestId ? { requestId: opts.requestId } : {}) });
  const requestId    = (summonsRecord.tiddler as Record<string, string>)['request-id']!;
  const outcomeTitle = `${OUTCOME_URI_PREFIX}${requestId}`;

  await vessel.composite.put(summonsRecord, { kind: "operator-import", sessionId: `lares-cli-${requestId}` });

  const readOutcome = async (): Promise<SubmitResult | null> => {
    const event = await vessel.composite.get(outcomeTitle);
    if (!event || event.meta?.deleted) return null;
    const fields = event.tiddler as Record<string, string>;
    const status = fields["status"];
    if (status !== "done" && status !== "error") return null;

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
  };

  return await new Promise<SubmitResult>((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => { if (!settled) { settled = true; cleanup(); fn(); } };
    const check = () => {
      void readOutcome().then((r) => { if (r) settle(() => resolve(r)); });
    };
    const onChange = () => check();
    vessel.admin.on("change", onChange);
    const timer = setTimeout(
      () => settle(() => reject(new Error(`verb "${verb}" timed out after ${timeoutMs}ms`))),
      timeoutMs,
    );
    const cleanup = () => { vessel.admin.off("change", onChange); clearTimeout(timer); };
    check();   // the outcome may already exist (idempotent re-submission)
  });
}

// Re-export so verb-facing helpers don't need a separate import path.
export { SUMMONS_URI_PREFIX };
