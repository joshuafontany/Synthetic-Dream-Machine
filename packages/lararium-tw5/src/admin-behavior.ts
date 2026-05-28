/**
 * admin-behavior — isomorphic admin island behavior for all platforms.
 *
 * makeAdminBehavior() returns an IslandBehavior that:
 *   - Starts a JobDispatcher subscribed to TW5 wiki change events (local path)
 *     and to the admin CompositeStore (remote/inbox path).
 *   - Routes wiki-scope verbs to the vessel via AdminMsg_DelegateJob /
 *     AdminMsg_JobResult, holding Promise resolvers in a pending delegation map.
 *   - Handles admin:place-job from the vessel (main-thread → island).
 *   - Handles admin:job-result from the vessel (island delegation round-trip).
 *
 * Runs identically in Node worker_threads and browser Web Workers.
 * Node admin island entry (lar-admin-island.ts) and browser admin island entry
 * (browser-admin-island.ts) both import this — no platform fork.
 *
 * Island Sovereignty Law §9 applies: this behavior always runs inside a Worker.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/admin-behavior
 */

import {
  ADMIN_BAG_ID,
  mkAdminDelegateJob,
  type AdminMsg_PlaceJob,
  type AdminMsg_JobResult,
  type BatchMode,
  type JobTiddler,
  type CapabilityVerifier,
} from "@lararium/mesh";
import { placeVmJob } from "./job-vm.js";
import { JobDispatcher, VerbTable } from "./job-dispatcher.js";
import type { IslandContext, IslandBehavior } from "./island-context.js";

export function makeAdminBehavior(verifier?: CapabilityVerifier): IslandBehavior {
  let _dispatcher: JobDispatcher | null = null;

  const _pendingDelegations = new Map<string, {
    resolve: (result: Record<string, unknown>) => void;
    reject:  (err: Error) => void;
  }>();

  function _routeToMain(job: JobTiddler, post: IslandContext["post"]): Promise<Record<string, unknown>> {
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
        routeFn:  (job) => _routeToMain(job, post),
        ...(verifier ? { verifier } : {}),
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
        void post;
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
