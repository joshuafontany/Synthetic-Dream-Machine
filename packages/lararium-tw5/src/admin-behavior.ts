/**
 * admin-behavior — isomorphic admin island behavior for all platforms.
 *
 * makeAdminBehavior() returns an IslandBehavior that:
 *   - Starts a VerbDispatcher subscribed to TW5 wiki change events (local path)
 *     and to the admin CompositeStore (remote/signal path).
 *   - Routes wiki-scope verbs to the vessel via AdminMsg_DelegateVerb /
 *     AdminMsg_VerbResult, holding Promise resolvers in a pending delegation map.
 *   - Handles admin:place-verb from the vessel (main-thread → island).
 *   - Handles admin:verb-result from the vessel (island delegation round-trip).
 *
 * Runs identically in Node worker_threads and browser Web Workers.
 *
 * Island Sovereignty Law §9 applies: this behavior always runs inside a Worker.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/admin-behavior
 */

import {
  ADMIN_BAG_ID,
  mkAdminDelegateVerb,
  type AdminMsg_PlaceVerb,
  type AdminMsg_VerbResult,
  type BatchMode,
  type VerbInvocation,
  type CapabilityVerifier,
} from "@lararium/mesh";
import { placeVerbInvocation } from "./verb-vm.js";
import { VerbDispatcher, VerbTable } from "./verb-dispatcher.js";
import type { IslandContext, IslandBehavior } from "./island-context.js";

export function makeAdminBehavior(verifier?: CapabilityVerifier): IslandBehavior {
  let _dispatcher: VerbDispatcher | null = null;

  const _pendingDelegations = new Map<string, {
    resolve: (result: Record<string, unknown>) => void;
    reject:  (err: Error) => void;
  }>();

  function _routeToMain(invocation: VerbInvocation, post: IslandContext["post"]): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      _pendingDelegations.set(invocation.requestId, { resolve, reject });
      post(mkAdminDelegateVerb({
        requestId:   invocation.requestId,
        verb:        invocation.verb,
        args:        invocation.args as Record<string, unknown>,
        requestedBy: invocation.requestedBy,
        ...(invocation.targets?.length ? { targets: [...invocation.targets] } : {}),
        ...(invocation.batchMode       ? { batchMode: String(invocation.batchMode) } : {}),
      }));
    });
  }

  return {
    writeBagId: ADMIN_BAG_ID,

    onEa({ tw5, composite, post }: IslandContext) {
      const registry = new VerbTable();
      _dispatcher = new VerbDispatcher({
        adminVm:  tw5,
        admin:    composite,
        registry,
        routeFn:  (invocation) => _routeToMain(invocation, post),
        ...(verifier ? { verifier } : {}),
      });
      _dispatcher.start();
    },

    onSignal(type: string, raw: unknown, { tw5, post }: IslandContext): boolean {
      if (type === "admin:place-verb") {
        const msg = raw as AdminMsg_PlaceVerb;
        if (tw5) {
          placeVerbInvocation(tw5, {
            verb:        msg.verb,
            args:        msg.args,
            requestedBy: msg.requestedBy,
            ...(msg.targets   ? { targets:    msg.targets              } : {}),
            ...(msg.batchMode ? { batchMode:  msg.batchMode as BatchMode } : {}),
            ...(msg.requestId ? { requestId:  msg.requestId             } : {}),
            ...(msg.fromUri   ? { fromUri:    msg.fromUri               } : {}),
            ...(msg.listenable? { listenable: msg.listenable            } : {}),
          });
        }
        return true;
      }

      if (type === "admin:verb-result") {
        const msg = raw as AdminMsg_VerbResult;
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
