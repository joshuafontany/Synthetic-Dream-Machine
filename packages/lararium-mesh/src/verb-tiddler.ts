/**
 * verb-tiddler — volatile verb invocation protocol for the daemon causal island.
 *
 * Two-tiddler contract:
 *
 *   verbs/<requestId>     VOLATILE scratch tiddler in lararium.local.vm.
 *                         Lives in the daemon TW5 wiki only. Never synced via
 *                         Automerge. Tombstoned by the dispatcher after the
 *                         outcome lands. Local intent lives here, not shared truth.
 *
 *   @daemon/outcomes/<id>  DURABLE outcome tiddler in the Automerge-backed
 *                         daemon bag. Written by the dispatcher on done/error.
 *                         Syncs to all vessels. CRDT convergence here IS the result.
 *                         Shared aftermath lives here.
 *
 * Verb invocation paths:
 *   Local (in-process):   placeVerb() → wiki.addTiddler() → TW5 change event
 *                         → dispatcher runs → outcome to @daemon/outcomes/
 *   Remote (CLI/vessels): vessel writes @daemon/summons/<id> to Automerge →
 *                         IslandAdaptor flows it into TW5 wiki →
 *                         dispatcher translates to volatile invocation → processes →
 *                         outcome to @daemon/outcomes/
 *
 * Batch contract:
 *   One invocation tiddler may carry N targets (tiddler URIs, file paths, edge resource
 *   URIs, or any string the handler interprets). The outcome always carries a
 *   results map. Single-result and atomic verbs use the conventional
 *   "summary" key so all observers read one durable payload grammar.
 *
 * Reaction Engine note (UEFN / kumu):
 *   Each lararium vessel runs its own daemon VM + VerbDispatcher. Invocations are
 *   vessel-local; outcomes sync via CRDT. When the Verse-inspired ReactionEngine
 *   matures, verb invocations become one shape of reaction trigger among many
 *   (event-signal tiddlers, alarm tiddlers, recipe-deltas). VerbReactor signatures
 *   are pure (args, context) → result — already ReactionEngine-compatible.
 *
 * Architecture laws:
 *   - Tiddler-format law: every invocation/outcome is a normal tiddler with lar: URI.
 *   - Web3 law: no HTTP/RPC control plane; verb submission routes through TW5 wiki
 *     events or Automerge sync — never a named server endpoint.
 *   - Causal-island law: each vessel's daemon VM owns its own volatile verb namespace.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/verb-tiddler
 */

import {
  DAEMON_BAG_ID, VOLATILE_VM_PREFIX,
  LARES_VERB_EVENT_TAG, LARES_VERB_TAG,
} from "./lar-uris.js";
import { sha256Hex, canonicalJsonBytes, defaultCryptoProvider, type DigestProvider } from "./crypto.js";
import { formatDigest } from "./agile-digest.js";
import type { LarTiddlerRecord } from "./tiddler-store.js";

// ── URI prefixes ───────────────────────────────────────────────────────────

/** Volatile verb invocation tiddlers — daemon TW5 wiki scratch, never synced. */
export const VERB_URI_PREFIX = `${VOLATILE_VM_PREFIX}verbs/`;

/** Automerge-backed verb summons — remote vessels write here; dispatcher translates
 *  to volatile invocation and tombstones after pickup. */
export const SUMMONS_URI_PREFIX = `${DAEMON_BAG_ID}/summons/`;

/** Durable outcome tiddlers — Automerge-backed, sync to all vessels. */
export const OUTCOME_URI_PREFIX = `${DAEMON_BAG_ID}/outcomes/`;

/** Result map key for single-result (no explicit targets) verbs. */
export const VERB_RESULT_KEY = "summary" as const;

// ── Task / receipt ontology — content-addressed surface ──────────────────────
// The pono attractor: a TASK = a content-addressed invocation
// fact living in a bag; the BAG carries the addressing geometry (its keyhive
// ring); a RECEIPT keys by the task it answers. The live verb/summons/outcome
// path migrates onto this surface per packages/EPIC-TASK-ONTOLOGY.md. Until
// then these compose alongside the running path, not replacing it.

export const TASK_KIND    = "task"    as const;
export const RECEIPT_KIND = "receipt" as const;

/** `lar:///ha.ka.ba/bags/@<bag>/task/<cid>` — a content-addressed task (invocation) fact. */
export function taskUri(bagUri: string, contentId: string): string {
  return `${bagUri}/${TASK_KIND}/${contentId}`;
}

/** `lar:///ha.ka.ba/bags/@<bag>/receipt/<task-cid>` — the receipt keyed by the task it answers (UCAN `ran`). */
export function receiptUri(bagUri: string, taskContentId: string): string {
  return `${bagUri}/${RECEIPT_KIND}/${taskContentId}`;
}

/**
 * taskContentId — the change-hash content-address of a task's identity tuple
 * `{subject, command, args, nonce}` (UCAN ontology: subject = the bag/resource
 * URI, command = the verb). Empty nonce → idempotent identity; a random nonce →
 * a fresh task. sha256 over canonical JSON — our native content-address; an
 * IPFS-CID projection at the peer boundary stays a later option (C). Async per
 * crypto law (routes through the platform CryptoProvider).
 *
 * The id rides ALGORITHM-TAGGED (`sha256:<hex>`), so a task identity carries its own
 * digest scheme and stays agile. The tag lives WITHIN the final URI path segment
 * (`…/receipt/sha256:<hex>`) — `larRoot` reads only the three-term root, so the deep
 * colon never touches the arity law; the same tuple still yields one deterministic id.
 */
export async function taskContentId(
  parts: { subject: string; command: string; args: Readonly<Record<string, unknown>>; nonce?: string },
  provider: DigestProvider = defaultCryptoProvider,
): Promise<string> {
  const canonical = { subject: parts.subject, command: parts.command, args: parts.args, nonce: parts.nonce ?? "" };
  return formatDigest("sha256", await sha256Hex(canonicalJsonBytes(canonical), provider));
}

// ── Verb invocation shape ──────────────────────────────────────────────────

export type VerbStatus = "pending" | "running" | "done" | "error";

/**
 * Batch execution mode.
 *   best-effort — each target runs independently; outcome has per-target results.
 *   atomic       — all targets succeed or none; outcome has single ok/error.
 */
export type BatchMode = "best-effort" | "atomic";

/** Parsed verb invocation tiddler. Fields are string-typed (tiddler field law). */
export interface Verb {
  readonly requestId:   string;
  readonly title:       string;
  /** The verb-name — the action to enact. (Wire/tiddler field stays "verb"; parseVerb maps it here, avoiding Verb.verb recursion.) */
  readonly action:      string;
  /** Structured args — deserialized from JSON field. */
  readonly args:        Readonly<Record<string, unknown>>;
  /**
   * Generic target list. Each string is interpreted by the handler:
   *   - tiddler URI:   "lar:///ha.ka.ba/..."
   *   - file path:     "/abs/path/to/file.mem" or "relative/path"
   *   - internet URI:  "https://..."
   *   - any other id the handler understands
   * Empty list = no targets (args-only verb).
   */
  readonly targets:     readonly string[];
  readonly batchMode:   BatchMode;
  readonly status:      VerbStatus;
  readonly requestedBy: string;
  readonly requestedAt: string;
  /** Source device instance URI — Verse `fromUri` (papalohe edge origin). */
  readonly fromUri?:    string;
  /** Verse event name that triggered dispatch — maps to `reaction:listenable` payload.listenable. */
  readonly listenable?: string;
  /**
   * Audience / executor (UCAN `aud`, PROVISIONAL). When present, narrows the task to
   * ONE named vessel — the mint-once / addressed shape (run here, exactly once). When
   * absent, the holding bag's keyhive ring carries the addressing (any capable peer
   * in the ring may claim). Bag = the default geometry; `aud` = the narrowing.
   */
  readonly aud?:        string;
}

// ── Outcome shape ──────────────────────────────────────────────────────────

export interface VerbTargetResult {
  readonly ok:      boolean;
  readonly output?: Record<string, unknown>;
  readonly error?:  string;
}

export interface OutcomeRecord extends LarTiddlerRecord {
  readonly tiddler: {
    readonly title:          string;
    readonly "request-id":   string;
    readonly verb:           string;
    readonly status:         "done" | "error";
    readonly "requested-by": string;
    readonly "completed-at": string;
    readonly cause:          string;
    readonly tags:           string;
    // JSON map of { targetOrSummaryKey → VerbTargetResult }
    readonly results?:       string;
    readonly "error-message"?: string;
    [k: string]: unknown;
  };
}

export function concludeVerb(opts: {
  requestId:     string;
  verb:          string;
  status:        "done" | "error";
  requestedBy:   string;
  cause:         string;
  batchMode:     BatchMode;
  results?:      Record<string, VerbTargetResult>;
  errorMessage?: string;
  authority?:    string;
}): LarTiddlerRecord {
  const title = `${OUTCOME_URI_PREFIX}${opts.requestId}`;
  const base = {
    title,
    tags:            LARES_VERB_EVENT_TAG,
    "request-id":    opts.requestId,
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

export function isVerbTitle(title: string): boolean {
  return title.startsWith(VERB_URI_PREFIX);
}

/** Build a volatile verb invocation tiddler for wiki.addTiddler() (local path). */
export function buildVerb(opts: {
  verb:        string;
  args:        Record<string, unknown>;
  requestedBy: string;
  targets?:    string[];
  batchMode?:  BatchMode;
  requestId?:  string;
  fromUri?:    string;
  listenable?: string;
  aud?:        string;
}): Record<string, unknown> {
  const requestId = opts.requestId ?? newRequestId();
  const title     = `${VERB_URI_PREFIX}${requestId}`;
  return {
    title,
    tags:            LARES_VERB_TAG,
    verb:            opts.verb,
    args:            JSON.stringify(opts.args),
    targets:         JSON.stringify(opts.targets ?? []),
    "batch-mode":    opts.batchMode ?? "best-effort",
    "request-id":    requestId,
    status:          "pending",
    "requested-by":  opts.requestedBy,
    "requested-at":  new Date().toISOString(),
    ...(opts.fromUri    !== undefined && { "from-uri":   opts.fromUri }),
    ...(opts.listenable !== undefined && { listenable:   opts.listenable }),
    ...(opts.aud        !== undefined && { aud:          opts.aud }),
  };
}

/** Build an Automerge verb-summons record for remote vessel submission. */
export function summon(opts: {
  verb:        string;
  args:        Record<string, unknown>;
  requestedBy: string;
  targets?:    string[];
  batchMode?:  BatchMode;
  requestId?:  string;
  authority?:  string;
  fromUri?:    string;
  listenable?: string;
  aud?:        string;
}): LarTiddlerRecord {
  const requestId = opts.requestId ?? newRequestId();
  const title     = `${SUMMONS_URI_PREFIX}${requestId}`;
  return {
    tiddler: {
      title,
      tags:            LARES_VERB_TAG,
      verb:            opts.verb,
      args:            JSON.stringify(opts.args),
      targets:         JSON.stringify(opts.targets ?? []),
      "batch-mode":    opts.batchMode ?? "best-effort",
      "request-id":    requestId,
      status:          "pending",
      "requested-by":  opts.requestedBy,
      "requested-at":  new Date().toISOString(),
      ...(opts.fromUri    !== undefined && { "from-uri":   opts.fromUri }),
      ...(opts.listenable !== undefined && { listenable:   opts.listenable }),
      ...(opts.aud        !== undefined && { aud:          opts.aud }),
    },
    meta: { authority: opts.authority ?? "lares-cli" },
  };
}

/** Parse a flat tiddler field bag (from wiki.getTiddler().fields or
 *  record.tiddler) into a Verb. Returns null when the shape doesn't match. */
export function parseVerb(fields: Record<string, unknown>): Verb | null {
  const title = typeof fields["title"] === "string" ? fields["title"] : null;
  if (!title) return null;
  if (!title.startsWith(VERB_URI_PREFIX) && !title.startsWith(SUMMONS_URI_PREFIX)) return null;

  const tag = fields["tags"];
  const tagsStr = Array.isArray(tag) ? tag.join(" ") : (typeof tag === "string" ? tag : "");
  if (!tagsStr.includes(LARES_VERB_TAG)) return null;

  const verb        = typeof fields["verb"]          === "string" ? fields["verb"]          : null;
  const requestId   = typeof fields["request-id"]    === "string" ? fields["request-id"]    : null;
  const status      = fields["status"];
  const requestedBy = typeof fields["requested-by"]  === "string" ? fields["requested-by"]  : "";
  const requestedAt = typeof fields["requested-at"]  === "string" ? fields["requested-at"]  : "";
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

  const fromUri    = typeof fields["from-uri"]   === "string" ? fields["from-uri"]   : undefined;
  const listenable = typeof fields["listenable"] === "string" ? fields["listenable"] : undefined;
  const aud        = typeof fields["aud"]        === "string" ? fields["aud"]        : undefined;

  return {
    requestId, title, action: verb, args, targets, batchMode, status, requestedBy, requestedAt,
    ...(fromUri    !== undefined && { fromUri }),
    ...(listenable !== undefined && { listenable }),
    ...(aud        !== undefined && { aud }),
  };
}

export function buildRunningPatch(): Record<string, string> {
  return { status: "running", "started-at": new Date().toISOString() };
}
