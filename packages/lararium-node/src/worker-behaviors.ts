/**
 * worker-behaviors — OTP callback modules for sovereign Worker types.
 *
 * Each export is a WorkerBehavior: the domain-specific half of the OTP
 * GenServer pair. sovereign-worker-model.ts owns the lifecycle plumbing;
 * behaviors own what distinguishes one Worker type from another.
 *
 * ## Wiki Worker — null behavior
 *   Read-dominant: CRDT bags flow in, TW5 session writes land in scratch.
 *   No JobDispatcher, no relay protocol. writeBagId = BAG_IDS.scratch.
 *
 * ## Admin Worker — dispatch behavior
 *   Owns the kumu device / Reaction Engine surface (TW5 wiki change events).
 *   JobDispatcher subscribes to TW5 wiki events; wiki-scope verbs relay to
 *   main thread via AdminMsg_RelayJob / AdminMsg_JobResult.
 *   writeBagId = ADMIN_BAG_ID (CRDT write-back, persisted).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/worker-behaviors
 */

import {
  BAG_IDS,
  ADMIN_BAG_ID,
  mkAdminRelayJob,
  type AdminMsg_PlaceJob,
  type AdminMsg_JobResult,
  type BatchMode,
  type JobTiddler,
} from "@lararium/mesh";
import { placeVmJob } from "@lararium/tw5";
import { JobDispatcher, JobHandlerRegistry } from "./job-dispatcher.js";
import type { WorkerBehavior, WorkerContext } from "./sovereign-worker-model.js";

// ── Wiki Worker behavior — null object (OTP: no-op callback module) ───────

export const WikiBehavior: WorkerBehavior = {
  writeBagId:  BAG_IDS.scratch,
  onReady:     () => {},
  onMessage:   () => false,
  onTeardown:  () => {},
};

// ── Admin Worker behavior — dispatch + relay ──────────────────────────────

export function makeAdminBehavior(): WorkerBehavior {
  let _dispatcher: JobDispatcher | null = null;

  // Pending relay map — requestId → { resolve, reject }.
  // Admin Worker posts AdminMsg_RelayJob for wiki-scope verbs; main thread
  // executes and returns AdminMsg_JobResult. This map holds the Promise resolvers.
  const _pendingRelays = new Map<string, {
    resolve: (result: Record<string, unknown>) => void;
    reject:  (err: Error) => void;
  }>();

  function _relayToMain(job: JobTiddler, post: WorkerContext["post"]): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      _pendingRelays.set(job.requestId, { resolve, reject });
      post(mkAdminRelayJob({
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

    onReady({ tw5, composite, post }: WorkerContext) {
      const registry = new JobHandlerRegistry();
      _dispatcher = new JobDispatcher({
        adminVm:  tw5,
        admin:    composite,
        registry,
        relayFn:  (job) => _relayToMain(job, post),
      });
      _dispatcher.start();
    },

    onMessage(type: string, raw: unknown, { tw5, post }: WorkerContext): boolean {
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
        const pending = _pendingRelays.get(msg.requestId);
        if (pending) {
          _pendingRelays.delete(msg.requestId);
          if (msg.error) pending.reject(new Error(msg.error));
          else           pending.resolve(msg.result ?? {});
        }
        void post; // post available if needed for future acks
        return true;
      }

      return false;
    },

    onTeardown() {
      _dispatcher?.stop();
      _dispatcher = null;
    },
  };
}
