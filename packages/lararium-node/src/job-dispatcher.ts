/**
 * JobDispatcher — admin-VM job dispatcher for the lararium causal island.
 *
 * Subscription model (dual-path):
 *
 *   LOCAL path  — in-process callers use placeJob(wiki, fields) to write a
 *                 volatile tiddler at lararium.local.vm/jobs/<id> directly to
 *                 the admin TW5 wiki. The dispatcher watches wiki change events
 *                 and picks these up immediately.
 *
 *   REMOTE path — external peers (CLI, browser, future device peers) write a
 *                 job-inbox tiddler at @admin/jobs/<id> to the Automerge doc.
 *                 IslandAdaptor flows it into the TW5 wiki. The dispatcher's
 *                 Automerge subscriber sees the inbox change, calls placeJob()
 *                 to create the volatile job, then tombstones the inbox tiddler.
 *
 * Receipt flow: handler result → buildJobReceiptTiddler → admin composite store
 *   → IslandAdaptor.saveTiddler → @admin/receipts/<id> in Automerge → syncs.
 *
 * Admin-only law: ONLY the admin VM runs a JobDispatcher. Pinned wiki and
 *   warm/cold wikis are content surfaces — they do not dispatch. Jobs that
 *   affect other wikis are handled by handlers that reach into those wikis.
 *
 * Federation model (each peer is its own identity):
 *   Every lararium peer — Node, browser, UE5.6+, Android, Mudlet-LUA — runs
 *   its own admin VM + JobDispatcher. Jobs are peer-local scratch. Receipts
 *   sync to all peers via Automerge. Peers coordinate through shared receipt
 *   space, not through shared job queues.
 *
 * Forward note — kumu / UEFN ReactionEngine:
 *   When the Verse-inspired ReactionEngine lands, this dispatcher generalises.
 *   Each causal island (peer) runs its own ReactionEngine instance. Job
 *   tiddlers become one shape of reaction trigger alongside signal-tiddlers,
 *   alarm-tiddlers, and recipe-deltas. kumu UEFN devices map to peers whose
 *   dispatchers handle device-native job types (e.g. "uefn:spawn-actor",
 *   "kumu:update-map"). The handler registry shape (pure (args, context) →
 *   result) is already ReactionEngine-friendly — no refactor needed at that
 *   boundary. Wire the kumu / UEFN device peer identity here when ready.
 *
 * Architecture laws:
 *   - TW5 vm primacy: handlers may invoke vm action-widgets (B.4).
 *   - Web3 law: no HTTP/RPC. Coordination is TW5 wiki events + CRDT sync.
 *   - Capability hooks: ctx.cap is bound per-job to requestedBy DID. S7
 *     keyhive verification lands here without handler changes.
 */

import type { LarTiddlerChange, ChangeOrigin } from "@lararium/mesh";
import {
  type JobTiddler, type CompositeStore,
  type CapabilityVerifier, type CapabilityVerifyResult, type CapabilityAccess,
  parseJobTiddler, buildRunningPatch,
  buildJobReceiptTiddler, JOB_RESULT_KEY,
  ADMIN_BAG_ID, JOB_INBOX_URI_PREFIX, JOB_URI_PREFIX,
  buildJobTiddler,
} from "@lararium/mesh";
import type { TW5Engine } from "@lararium/tw5";

/** Curried verify closure — pre-bound to the requesting peer's DID. */
export type CapVerify = (access: CapabilityAccess, bagUrl: string) => Promise<CapabilityVerifyResult>;

export interface JobContext {
  readonly admin:   CompositeStore;
  /** The parsed job tiddler — handlers may read targets, batchMode, args. */
  readonly job:     JobTiddler;
  readonly cap:     CapVerify;
}

/** Handler shape: pure function over (args, context) → result map. */
export type JobHandler = (
  args:    Readonly<Record<string, unknown>>,
  context: JobContext,
) => Promise<Record<string, unknown>>;

export class JobHandlerRegistry {
  private readonly handlers = new Map<string, JobHandler>();

  register(verbName: string, handler: JobHandler): void {
    if (this.handlers.has(verbName)) {
      throw new Error(`[job-dispatcher] duplicate handler for "${verbName}"`);
    }
    this.handlers.set(verbName, handler);
  }

  get(verbName: string): JobHandler | undefined { return this.handlers.get(verbName); }
  has(verbName: string): boolean { return this.handlers.has(verbName); }
  list(): readonly string[] { return [...this.handlers.keys()].sort(); }
}

export interface JobDispatcherOptions {
  /** Admin TW5 engine — local job tiddlers are written to and watched on its wiki. */
  readonly adminVm:  TW5Engine;
  /** Admin composite store — receipts and inbox tombstones go here. */
  readonly admin:    CompositeStore;
  readonly registry: JobHandlerRegistry;
  readonly verifier?: CapabilityVerifier;
}

export class JobDispatcher {
  private unsubWiki:      (() => void) | null = null;
  private unsubAutomerge: (() => void) | null = null;
  private readonly inFlight = new Set<string>();

  constructor(private readonly opts: JobDispatcherOptions) {}

  start(): void {
    if (this.unsubWiki) return;

    // ── LOCAL path: watch TW5 wiki change events ────────────────────────────
    const wiki = this.opts.adminVm.$tw.wiki;
    const onWikiChange = (changedTiddlers: Record<string, { deleted?: boolean }>) => {
      for (const title of Object.keys(changedTiddlers)) {
        if (!title.startsWith(JOB_URI_PREFIX)) continue;
        if (changedTiddlers[title]?.deleted) continue;
        const tw5Tiddler = wiki.getTiddler(title) as { fields: Record<string, unknown> } | undefined;
        if (!tw5Tiddler) continue;
        const job = parseJobTiddler(tw5Tiddler.fields);
        if (!job || job.status !== "pending" || this.inFlight.has(job.requestId)) continue;
        this.inFlight.add(job.requestId);
        this.dispatchLocal(job).catch((err) => {
          console.error("[job-dispatcher] local handler crashed:", err);
        }).finally(() => this.inFlight.delete(job.requestId));
      }
    };
    wiki.addEventListener("change", onWikiChange);
    this.unsubWiki = () => wiki.removeEventListener("change", onWikiChange);

    // ── REMOTE path: watch Automerge inbox (@admin/jobs/<id>) ──────────────
    // External peers (CLI, browser, future device peers) write here.
    // We translate to a volatile local job and tombstone the inbox tiddler.
    this.unsubAutomerge = this.opts.admin.subscribe((change) => {
      this.onInboxChange(change).catch((err) => {
        console.error("[job-dispatcher] inbox relay crashed:", err);
      });
    });

    console.log(`[job-dispatcher] live — handlers: ${this.opts.registry.list().join(", ") || "(none)"}`);
  }

  stop(): void {
    this.unsubWiki?.(); this.unsubWiki = null;
    this.unsubAutomerge?.(); this.unsubAutomerge = null;
  }

  /**
   * Place a volatile job tiddler in the admin TW5 wiki.
   * The wiki change event fires and the local dispatch path picks it up.
   * This is the pono path for all in-process callers.
   */
  placeJob(opts: {
    verb:        string;
    args:        Record<string, unknown>;
    requestedBy: string;
    targets?:    string[];
    batchMode?:  "best-effort" | "atomic";
    requestId?:  string;
  }): string {
    const fields = buildJobTiddler(opts);
    const Tiddler = this.opts.adminVm.$tw.Tiddler;
    this.opts.adminVm.$tw.wiki.addTiddler(new Tiddler(fields));
    return fields["request-id"] as string;
  }

  // ── Remote inbox relay ──────────────────────────────────────────────────

  private async onInboxChange(change: LarTiddlerChange): Promise<void> {
    if (!change.record) return;
    if (!change.record.tiddler.title.startsWith(JOB_INBOX_URI_PREFIX)) return;
    if (change.origin.kind === "lares-job") return;
    const job = parseJobTiddler(change.record.tiddler as Record<string, unknown>);
    if (!job || job.status !== "pending") return;
    if (this.inFlight.has(job.requestId)) return;
    // Tombstone the inbox tiddler — job is now the volatile local copy.
    const origin: ChangeOrigin = { kind: "lares-job", requestId: job.requestId };
    await this.opts.admin.tombstone(change.record.tiddler.title, origin);
    // Relay to local path via placeJob.
    this.placeJob({
      verb:        job.verb,
      args:        job.args as Record<string, unknown>,
      requestedBy: job.requestedBy,
      targets:     [...job.targets],
      batchMode:   job.batchMode,
      requestId:   job.requestId,
    });
  }

  // ── Local dispatch ───────────────────────────────────────────────────────

  private async dispatchLocal(job: JobTiddler): Promise<void> {
    const origin: ChangeOrigin = { kind: "lares-job", requestId: job.requestId };
    const handler = this.opts.registry.get(job.verb);

    if (!handler) {
      await this.writeReceipt({ job, status: "error", errorMessage: `no handler registered for "${job.verb}"`, origin });
      this.removeLocalJob(job.title);
      return;
    }

    // Mark running in the volatile wiki tiddler (visible to admin VM observers).
    this.patchLocalJob(job.title, buildRunningPatch());

    const verifier = this.opts.verifier;
    const cap: CapVerify = verifier
      ? (access, bagUrl) => verifier.verify({ presenter: job.requestedBy, bagUrl, access })
      : async () => ({ ok: true, reason: "no-verifier" });

    try {
      const result = await handler(job.args, { admin: this.opts.admin, job, cap });
      await this.writeReceipt({ job, status: "done", result, origin });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.writeReceipt({ job, status: "error", errorMessage: message, origin });
    }

    this.removeLocalJob(job.title);
  }

  private patchLocalJob(title: string, patch: Record<string, string>): void {
    const wiki = this.opts.adminVm.$tw.wiki;
    const existing = wiki.getTiddler(title) as { fields: Record<string, unknown> } | undefined;
    if (!existing) return;
    const Tiddler = this.opts.adminVm.$tw.Tiddler;
    wiki.addTiddler(new Tiddler({ ...existing.fields, ...patch }));
  }

  private removeLocalJob(title: string): void {
    this.opts.adminVm.$tw.wiki.deleteTiddler(title);
  }

  private async writeReceipt(opts: {
    job:           JobTiddler;
    status:        "done" | "error";
    result?:       Record<string, unknown>;
    errorMessage?: string;
    origin:        ChangeOrigin;
  }): Promise<void> {
    const receipt = buildJobReceiptTiddler({
      requestId:    opts.job.requestId,
      verb:         opts.job.verb,
      status:       opts.status,
      requestedBy:  opts.job.requestedBy,
      cause:        opts.job.title,
      batchMode:    opts.job.batchMode,
      results: {
        [JOB_RESULT_KEY]: {
          ok: opts.status === "done",
          ...(opts.result       !== undefined && { output: opts.result }),
          ...(opts.errorMessage !== undefined && { error: opts.errorMessage }),
        },
      },
      ...(opts.errorMessage !== undefined && { errorMessage: opts.errorMessage }),
    });
    await this.opts.admin.put(receipt, opts.origin, { bag: ADMIN_BAG_ID });
  }
}
