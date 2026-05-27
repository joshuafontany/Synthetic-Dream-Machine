/**
 * JobDispatcher — admin-VM job dispatcher for the lararium causal island.
 *
 * Subscription model (dual-path):
 *
 *   LOCAL path  — in-process callers use placeJob(wiki, fields) to write a
 *                 volatile tiddler at lararium.local.vm/jobs/<id> directly to
 *                 the admin TW5 wiki. The dispatcher watches wiki change events
 *                 and picks these up immediately. This is the vessel-local rite.
 *
 *   REMOTE path — external vessels write a job-inbox tiddler at
 *                 @admin/jobs/<id> to the Automerge doc. IslandAdaptor flows it
 *                 into the TW5 wiki. The dispatcher's Automerge subscriber sees
 *                 the inbox change, calls placeJob() to create the volatile job,
 *                 then tombstones the inbox tiddler. The inbox is edge transport,
 *                 not durable coordination state.
 *
 * Receipt flow: handler result → buildJobReceiptTiddler → admin composite store
 *   → IslandAdaptor.saveTiddler → @admin/receipts/<id> in Automerge → syncs.
 *   Durable shared meaning begins at the receipt, not at the inbox.
 *
 * Admin-only law: ONLY the admin VM runs a JobDispatcher. Pinned wiki and
 *   warm/cold wikis are content surfaces — they do not dispatch. Jobs that
 *   affect other wikis are handled by handlers that reach into those wikis.
 *
 * Federation model (each vessel is its own identity-and-runtime unit):
 *   Every lararium vessel — Node, browser, UE5.6+, Android, Mudlet-LUA — runs
 *   its own admin VM + JobDispatcher. Jobs are vessel-local scratch. Receipts
 *   sync to all vessels via Automerge. Vessels coordinate through shared
 *   receipt space, not through shared job queues.
 *
 * Forward note — kumu / UEFN ReactionEngine:
 *   When the Verse-inspired ReactionEngine lands, this dispatcher generalises.
 *   Each causal island (vessel) runs its own ReactionEngine instance. Job
 *   tiddlers become one shape of reaction trigger alongside signal-tiddlers,
 *   alarm-tiddlers, and recipe-deltas. kumu UEFN devices map to vessels whose
 *   dispatchers handle device-native job types (e.g. "uefn:spawn-actor",
 *   "kumu:update-map"). The VerbTable shape (pure (args, context) →
 *   result) is already ReactionEngine-friendly — no refactor needed at that
 *   boundary. Wire the kumu / UEFN device vessel identity here when ready.
 *
 * Architecture laws:
 *   - TW5 vm primacy: handlers may invoke vm action-widgets (B.4).
 *   - Web3 law: no HTTP/RPC control plane. Coordination is TW5 wiki events + CRDT sync.
 *   - Capability hooks: ctx.cap is bound per-job to requestedBy DID. S7
 *     keyhive verification lands here without handler changes.
 */

import {
  type JobTiddler, type CompositeStore,
  type CapabilityVerifier,
  parseJobTiddler,
  JOB_URI_PREFIX,
} from "@lararium/mesh";
import { dispatchVmJobLifecycle, placeVmJob, type TW5Engine } from "@lararium/tw5";
import { relayJobInboxChange } from "./job-inbox-relay.js";
import type { JobPlacementRequest } from "./job-inbox-relay.js";
import { runLocalJob } from "./job-local-dispatch.js";

export interface JobContext {
  readonly admin:   CompositeStore;
  /** The parsed job tiddler — handlers may read targets, batchMode, args. */
  readonly job:     JobTiddler;
  readonly cap:     (access: import("@lararium/mesh").CapabilityAccess, bagUrl: string) => Promise<import("@lararium/mesh").CapabilityVerifyResult>;
}

/** VerbReactor shape: pure function over (args, context) → result map. */
export type VerbReactor = (
  args:    Readonly<Record<string, unknown>>,
  context: JobContext,
) => Promise<Record<string, unknown>>;

export class VerbTable {
  private readonly handlers = new Map<string, VerbReactor>();

  register(verbName: string, handler: VerbReactor): void {
    if (this.handlers.has(verbName)) {
      throw new Error(`[job-dispatcher] duplicate handler for "${verbName}"`);
    }
    this.handlers.set(verbName, handler);
  }

  get(verbName: string): VerbReactor | undefined { return this.handlers.get(verbName); }
  has(verbName: string): boolean { return this.handlers.has(verbName); }
  list(): readonly string[] { return [...this.handlers.keys()].sort(); }
}

export interface JobDispatcherOptions {
  /** Admin TW5 engine — local job tiddlers are written to and watched on its wiki. */
  readonly adminVm:  TW5Engine;
  /** Admin composite store — receipts and inbox tombstones go here. */
  readonly admin:    CompositeStore;
  readonly registry: VerbTable;
  readonly verifier?: CapabilityVerifier;
  /**
   * Called when a verb is not in the local registry (cross-island relay).
   * The admin Worker uses this to delegate wiki-scope jobs to the main thread.
   * If absent, unregistered verbs throw "no handler registered".
   */
  readonly relayFn?: (job: JobTiddler) => Promise<Record<string, unknown>>;
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
        dispatchVmJobLifecycle(
          this.opts.adminVm,
          this.opts.admin,
          job,
          () => {
            if (this.opts.registry.has(job.verb)) {
              return runLocalJob(job, {
                admin: this.opts.admin,
                registry: this.opts.registry,
                ...(this.opts.verifier ? { verifier: this.opts.verifier } : {}),
              });
            }
            if (this.opts.relayFn) return this.opts.relayFn(job);
            return Promise.reject(new Error(`no handler registered for "${job.verb}"`));
          },
        ).catch((err) => {
          console.error("[job-dispatcher] local handler crashed:", err);
        }).finally(() => this.inFlight.delete(job.requestId));
      }
    };
    wiki.addEventListener("change", onWikiChange);
    this.unsubWiki = () => wiki.removeEventListener("change", onWikiChange);

    // ── REMOTE path: watch Automerge inbox (@admin/jobs/<id>) ──────────────
    // External vessels (CLI, browser, future device vessels) write here.
    // We translate to a volatile local job and tombstone the inbox tiddler.
    this.unsubAutomerge = this.opts.admin.subscribe((change) => {
      relayJobInboxChange(change, {
        admin: this.opts.admin,
        isInFlight: (requestId) => this.inFlight.has(requestId),
        placeJob: (job) => { this.placeJob(job); },
      }).catch((err) => {
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
  placeJob(opts: JobPlacementRequest): string {
    return placeVmJob(this.opts.adminVm, opts);
  }
}
