/**
 * worker-behaviors — OTP callback modules for sovereign Worker types.
 *
 * Each export is an IslandBehavior: the domain-specific half of the OTP
 * gen_island pair. sovereign-worker-model.ts owns the lifecycle plumbing;
 * behaviors own what distinguishes one Worker type from another.
 *
 * ## Wiki Worker — null behavior
 *   Read-dominant: CRDT bags flow in, TW5 session writes land in scratch.
 *   No JobDispatcher, no relay protocol. writeBagId = BAG_IDS.scratch.
 *
 * ## Wiki Worker with disk projection — extends null behavior
 *   Starts a LarDiskProjector inside the Worker, subscribing to TW5 wiki
 *   change events directly. renderFn calls exportMemeText(ctx.tw5, uri).
 *   Receives diskMirrors from manifest (serializable BagMirrorConfig).
 *
 * ## Wiki Worker with dispatch — handles wiki:place-job messages
 *   No kumu device surface (that belongs to admin Worker). Handles explicit
 *   wiki-scope jobs placed by the main thread. Direct inline dispatch (no
 *   JobDispatcher subscription) → wiki:job-result posted back.
 *   Cap verification: stubbed (job arrived from main thread = pre-authorized).
 *
 * ## Admin Worker — dispatch behavior
 *   Owns the kumu device / Reaction Engine surface (TW5 wiki change events).
 *   JobDispatcher subscribes to TW5 wiki events; wiki-scope verbs relay to
 *   main thread via AdminMsg_DelegateJob / AdminMsg_JobResult.
 *   writeBagId = ADMIN_BAG_ID (CRDT write-back, persisted).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/worker-behaviors
 */

import {
  BAG_IDS,
  ADMIN_BAG_ID,
  mkAdminDelegateJob,
  mkWikiJobResult,
  type AdminMsg_PlaceJob,
  type AdminMsg_JobResult,
  type BatchMode,
  type JobTiddler,
  type WikiMsg_PlaceJob,
  type WorkerMsg_Manifest,
} from "@lararium/mesh";
import { placeVmJob, exportMemeText } from "@lararium/tw5";
import { JobDispatcher, VerbTable } from "./job-dispatcher.js";
import { LarDiskProjector } from "./disk-projector.js";
import { namedBagMirror } from "./bag-paths.js";
import { makePromoteReactor } from "./promote-handler.js";
import type { IslandBehavior, IslandContext } from "./sovereign-worker-model.js";

// ── Primary Wiki Worker behavior — disk projection + wiki dispatch ────────

/**
 * IslandBehavior for the primary wiki Worker: disk write-back + wiki-scope job dispatch.
 *
 *   onEa     — start LarDiskProjector (if diskMirrors present) + build VerbTable
 *   onSignal — handle wiki:place-job inline dispatch
 *   onDemote — stop projector, clear registry
 */
export function makeWikiPrimaryBehavior(manifest: WorkerMsg_Manifest): IslandBehavior {
  let _stopProjector: (() => void) | null = null;
  let _registry: VerbTable | null = null;

  return {
    writeBagId: BAG_IDS.scratch,

    onEa(ctx: IslandContext) {
      // Disk projection
      const mirrorDefs = manifest.diskMirrors;
      if (mirrorDefs?.length) {
        const mirrors = mirrorDefs.map(({ bagId, mirrorRoot, scope }) =>
          namedBagMirror(bagId, scope, mirrorRoot),
        );
        const projector = new LarDiskProjector(
          mirrors,
          (uri) => { try { return Promise.resolve(exportMemeText(ctx.tw5, uri)); } catch { return Promise.resolve(null); } },
        );
        _stopProjector = projector.start(ctx.tw5);
      }

      // Wiki-scope dispatch
      _registry = new VerbTable();
      _registry.register("promote", makePromoteReactor({
        composite: ctx.composite,
        tw5:       ctx.tw5,
      }));
    },

    onSignal(type: string, raw: unknown, ctx: IslandContext): boolean {
      if (type !== "wiki:place-job") return false;
      if (!_registry) return false;
      const msg = raw as WikiMsg_PlaceJob;
      const requestId = msg.requestId ?? crypto.randomUUID();
      const handler = _registry.get(msg.verb);
      if (!handler) {
        if (msg.requestId) ctx.post(mkWikiJobResult({ requestId, error: `no handler for "${msg.verb}"` }));
        return true;
      }
      const job: JobTiddler = {
        requestId,
        title:       `lar:///ha.ka.ba/@wiki/jobs/${requestId}`,
        verb:        msg.verb,
        args:        msg.args,
        targets:     msg.targets ?? [],
        batchMode:   (msg.batchMode as BatchMode) ?? "single",
        status:      "pending",
        requestedBy: msg.requestedBy,
        requestedAt: new Date().toISOString(),
      };
      void handler(msg.args, {
        admin: ctx.composite,
        job,
        cap: async () => ({ ok: true, reason: "worker-trust" }),
      }).then((result) => {
        if (msg.requestId) ctx.post(mkWikiJobResult({ requestId, result }));
      }).catch((err: unknown) => {
        if (msg.requestId) ctx.post(mkWikiJobResult({ requestId, error: String(err) }));
      });
      return true;
    },

    onDemote() {
      _stopProjector?.();
      _stopProjector = null;
      _registry = null;
    },
  };
}

// ── Admin Worker behavior — dispatch + relay ──────────────────────────────

export function makeAdminBehavior(): IslandBehavior {
  let _dispatcher: JobDispatcher | null = null;

  // Pending delegation map — requestId → { resolve, reject }.
  // Admin Worker posts AdminMsg_RelayJob for wiki-scope verbs; main thread
  // executes and returns AdminMsg_JobResult. This map holds the Promise resolvers.
  const _pendingDelegations = new Map<string, {
    resolve: (result: Record<string, unknown>) => void;
    reject:  (err: Error) => void;
  }>();

  function _delegateToMain(job: JobTiddler, post: IslandContext["post"]): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      _pendingDelegations.set(job.requestId, { resolve, reject });
      post(mkAdminDelegateJob({
        requestId:   job.requestId,
        verb:        job.verb,
        args:        job.args as Record<string, unknown>,
        requestedBy: job.requestedBy,
        ...(job.targets?.length ? { targets: [...job.targets] } : {}),
        ...(job.batchMode       ? { batchMode: String(job.batchMode) } : {}),
      }));
    });
  }

  return {
    writeBagId: ADMIN_BAG_ID,

    onEa({ tw5, composite, post }: IslandContext) {
      const registry = new VerbTable();
      _dispatcher = new JobDispatcher({
        adminVm:  tw5,
        admin:    composite,
        registry,
        relayFn:  (job) => _delegateToMain(job, post),
      });
      _dispatcher.start();
    },

    onSignal(type: string, raw: unknown, { tw5, post }: IslandContext): boolean {
      if (type === "admin:place-job") {
        const msg = raw as AdminMsg_PlaceJob;
        if (tw5) {
          placeVmJob(tw5, {
            verb:        msg.verb,
            args:        msg.args,
            requestedBy: msg.requestedBy,
            ...(msg.targets   ? { targets:   msg.targets   } : {}),
            ...(msg.batchMode ? { batchMode: msg.batchMode as BatchMode } : {}),
            ...(msg.requestId ? { requestId: msg.requestId } : {}),
          });
        }
        return true;
      }

      if (type === "admin:job-result") {
        const msg = raw as AdminMsg_JobResult;
        const pending = _pendingDelegations.get(msg.requestId);
        if (pending) {
          _pendingDelegations.delete(msg.requestId);
          if (msg.error) pending.reject(new Error(msg.error));
          else           pending.resolve(msg.result ?? {});
        }
        void post; // post available if needed for future acks
        return true;
      }

      return false;
    },

    onDemote() {
      _dispatcher?.stop();
      _dispatcher = null;
    },
  };
}
