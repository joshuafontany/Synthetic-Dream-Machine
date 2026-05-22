/**
 * job-tiddler — volatile VM job protocol for the admin causal island.
 *
 * Two-tiddler contract:
 *
 *   jobs/<requestId>      VOLATILE scratch tiddler in lararium.local.vm.
 *                         Lives in the admin TW5 wiki only. Never synced via
 *                         Automerge. Tombstoned by the dispatcher after the
 *                         receipt lands. Local intent lives here, not shared truth.
 *
 *   @admin/receipts/<id>  DURABLE receipt tiddler in the Automerge-backed
 *                         admin bag. Written by the dispatcher on done/error.
 *                         Syncs to all peers. Polling this is the "done"
 *                         signal for any observer. Shared aftermath lives here.
 *
 * Job submission paths:
 *   Local (in-process):   placeJob() → wiki.addTiddler() → TW5 change event
 *                         → dispatcher runs → receipt to @admin/receipts/
 *   Remote (CLI/vessels): vessel writes @admin/jobs/<id> to Automerge inbox →
 *                         IslandAdaptor flows it into TW5 wiki →
 *                         dispatcher translates to volatile job → processes →
 *                         receipt to @admin/receipts/
 *
 * Batch contract:
 *   One job tiddler may carry N targets (tiddler URIs, file paths, edge resource
 *   URIs, or any string the handler interprets). The receipt always carries a
 *   results map. Single-result and atomic jobs use the conventional
 *   "summary" key so all observers read one durable payload grammar.
 *
 * Forward note (UEFN / kumu ReactionEngine):
 *   Each lararium vessel — Node, browser, UE5.6+, Android, Mudlet-LUA — runs
 *   its own admin VM + dispatcher. Jobs are peer-local; receipts sync.
 *   When the Verse-inspired ReactionEngine lands, this dispatcher pattern
 *   federates across causal-island bounds: each island runs its own handler
 *   registry, job tiddlers become one shape of reaction trigger among many
 *   (signal-tiddlers, alarm-tiddlers, recipe-deltas …), and kumu UEFN devices
 *   map to peers whose dispatchers handle device-native job types.
 *   Keep handler signatures pure (args, context) → result for easy federation.
 *
 * Architecture laws:
 *   - Tiddler-format law: every job/receipt is a normal tiddler with lar: URI.
 *   - Web3 law: no HTTP/RPC control plane; job submission routes through TW5 wiki
 *     events or Automerge sync — never a named server endpoint.
 *   - Causal-island law: each vessel's admin VM owns its own volatile job namespace.
 */

import {
  ADMIN_BAG_ID, VOLATILE_VM_PREFIX,
  LARES_JOB_EVENT_TAG, LARES_JOB_TAG,
} from "./lar-uris.js";
import type { LarTiddlerRecord } from "./tiddler-store.js";

// ── URI prefixes ───────────────────────────────────────────────────────────

/** Volatile job tiddlers — admin TW5 wiki scratch, never synced. */
export const JOB_URI_PREFIX = `${VOLATILE_VM_PREFIX}jobs/`;

/** Automerge-backed job inbox — remote peers write here; dispatcher translates
 *  to volatile and tombstones after pickup. */
export const JOB_INBOX_URI_PREFIX = `${ADMIN_BAG_ID}/jobs/`;

/** Durable receipt tiddlers — Automerge-backed, sync to all peers. */
export const JOB_RECEIPT_URI_PREFIX = `${ADMIN_BAG_ID}/receipts/`;

/** Result map key for single-result (no explicit targets) jobs. */
export const JOB_RESULT_KEY = "summary" as const;

// ── Job shape ──────────────────────────────────────────────────────────────

export type JobStatus = "pending" | "running" | "done" | "error";

/**
 * Batch execution mode.
 *   best-effort — each target runs independently; receipt has per-target results.
 *   atomic       — all targets succeed or none; receipt has single ok/error.
 */
export type BatchMode = "best-effort" | "atomic";

/** Parsed job tiddler. Fields are string-typed (tiddler field law). */
export interface JobTiddler {
  readonly requestId:   string;
  readonly title:       string;
  readonly verb:        string;
  /** Structured args — deserialized from JSON field. */
  readonly args:        Readonly<Record<string, unknown>>;
  /**
   * Generic target list. Each string is interpreted by the handler:
   *   - tiddler URI:   "lar:///ha.ka.ba/..."
   *   - file path:     "/abs/path/to/file.md" or "relative/path"
   *   - internet URI:  "https://..."
   *   - any other id the handler understands
   * Empty list = no targets (args-only job).
   */
  readonly targets:     readonly string[];
  readonly batchMode:   BatchMode;
  readonly status:      JobStatus;
  readonly requestedBy: string;
  readonly requestedAt: string;
}

// ── Receipt shape ──────────────────────────────────────────────────────────

export interface JobTargetResult {
  readonly ok:      boolean;
  readonly output?: Record<string, unknown>;
  readonly error?:  string;
}

export interface JobReceiptRecord extends LarTiddlerRecord {
  readonly tiddler: {
    readonly title:         string;
    readonly "request-id":  string;
    readonly verb:          string;
    readonly status:        "done" | "error";
    readonly "requested-by": string;
    readonly "completed-at": string;
    readonly cause:         string;
    readonly tags:          string;
    // JSON map of { targetOrSummaryKey → JobTargetResult }
    readonly results?:      string;
    readonly "error-message"?: string;
    [k: string]: unknown;
  };
}

export function buildJobReceiptTiddler(opts: {
  requestId:    string;
  verb:         string;
  status:       "done" | "error";
  requestedBy:  string;
  cause:        string;
  batchMode:    BatchMode;
  results?:     Record<string, JobTargetResult>;
  errorMessage?: string;
  authority?:   string;
}): LarTiddlerRecord {
  const title = `${JOB_RECEIPT_URI_PREFIX}${opts.requestId}`;
  const base = {
    title,
    tags:            LARES_JOB_EVENT_TAG,
    "request-id":   opts.requestId,
    verb:            opts.verb,
    status:          opts.status,
    "requested-by":  opts.requestedBy,
    "completed-at":  new Date().toISOString(),
    cause:           opts.cause,
  };
  return {
    tiddler: {
      ...base,
      results: JSON.stringify(opts.results ?? {}),
      ...(opts.errorMessage !== undefined && { "error-message": opts.errorMessage }),
    },
    meta: { authority: opts.authority ?? "lares-dispatcher" },
  };
}

// ── Builders ───────────────────────────────────────────────────────────────

export function newRequestId(): string {
  const ms = Date.now().toString(32).padStart(9, "0");
  let rand = "";
  for (let i = 0; i < 8; i++) rand += Math.floor(Math.random() * 32).toString(32);
  return `${ms}-${rand}`;
}

export function isJobTitle(title: string): boolean {
  return title.startsWith(JOB_URI_PREFIX);
}

/** Build a volatile job tiddler for wiki.addTiddler() (local path). */
export function buildJobTiddler(opts: {
  verb:        string;
  args:        Record<string, unknown>;
  requestedBy: string;
  targets?:    string[];
  batchMode?:  BatchMode;
  requestId?:  string;
}): Record<string, unknown> {
  const requestId = opts.requestId ?? newRequestId();
  const title     = `${JOB_URI_PREFIX}${requestId}`;
  return {
    title,
    tags:            LARES_JOB_TAG,
    verb:            opts.verb,
    args:            JSON.stringify(opts.args),
    targets:         JSON.stringify(opts.targets ?? []),
    "batch-mode":    opts.batchMode ?? "best-effort",
    "request-id":   requestId,
    status:          "pending",
    "requested-by":  opts.requestedBy,
    "requested-at":  new Date().toISOString(),
  };
}

/** Build an Automerge-inbox job record for remote peer submission. */
export function buildJobInboxRecord(opts: {
  verb:        string;
  args:        Record<string, unknown>;
  requestedBy: string;
  targets?:    string[];
  batchMode?:  BatchMode;
  requestId?:  string;
  authority?:  string;
}): LarTiddlerRecord {
  const requestId = opts.requestId ?? newRequestId();
  const title     = `${JOB_INBOX_URI_PREFIX}${requestId}`;
  return {
    tiddler: {
      title,
      tags:            LARES_JOB_TAG,
      verb:            opts.verb,
      args:            JSON.stringify(opts.args),
      targets:         JSON.stringify(opts.targets ?? []),
      "batch-mode":    opts.batchMode ?? "best-effort",
      "request-id":   requestId,
      status:          "pending",
      "requested-by":  opts.requestedBy,
      "requested-at":  new Date().toISOString(),
    },
    meta: { authority: opts.authority ?? "lares-cli" },
  };
}

/** Parse a flat tiddler field bag (from wiki.getTiddler().fields or
 *  record.tiddler) into a JobTiddler. Returns null when the shape doesn't match. */
export function parseJobTiddler(fields: Record<string, unknown>): JobTiddler | null {
  const title = typeof fields["title"] === "string" ? fields["title"] : null;
  if (!title) return null;
  if (!title.startsWith(JOB_URI_PREFIX) && !title.startsWith(JOB_INBOX_URI_PREFIX)) return null;

  const tag = fields["tags"];
  const tagsStr = Array.isArray(tag) ? tag.join(" ") : (typeof tag === "string" ? tag : "");
  if (!tagsStr.includes(LARES_JOB_TAG)) return null;

  const verb        = typeof fields["verb"]          === "string" ? fields["verb"]          : null;
  const requestId   = typeof fields["request-id"]   === "string" ? fields["request-id"]   : null;
  const status      = fields["status"];
  const requestedBy = typeof fields["requested-by"] === "string" ? fields["requested-by"] : "";
  const requestedAt = typeof fields["requested-at"] === "string" ? fields["requested-at"] : "";
  const batchMode   = fields["batch-mode"] === "atomic" ? "atomic" as const : "best-effort" as const;

  if (!verb || !requestId) return null;
  if (status !== "pending" && status !== "running" && status !== "done" && status !== "error") return null;

  let args: Record<string, unknown> = {};
  const argsRaw = typeof fields["args"] === "string" ? fields["args"] : "{}";
  try { args = JSON.parse(argsRaw); } catch { /* treat as empty */ }

  let targets: string[] = [];
  const targetsRaw = typeof fields["targets"] === "string" ? fields["targets"] : "[]";
  try {
    const parsed = JSON.parse(targetsRaw);
    if (Array.isArray(parsed)) targets = parsed.filter((t): t is string => typeof t === "string");
  } catch { /* treat as empty */ }

  return { requestId, title, verb, args, targets, batchMode, status, requestedBy, requestedAt };
}

export function buildRunningPatch(): Record<string, string> {
  return { status: "running", "started-at": new Date().toISOString() };
}
