/**
 * daemon-behavior — isomorphic admin island behavior for all platforms.
 *
 * makeDaemonBehavior() returns an IslandBehavior that:
 *   - Starts a VerbDispatcher subscribed to TW5 wiki change events (local path)
 *     and to the admin CompositeStore (remote/signal path).
 *   - Routes wiki-scope verbs to the vessel via DaemonMsg_DelegateVerb /
 *     DaemonMsg_VerbResult, holding Promise resolvers in a pending delegation map.
 *   - Handles admin:place-verb from the vessel (main-thread → island).
 *   - Handles admin:verb-result from the vessel (island delegation round-trip).
 *
 * Runs identically in Node worker_threads and browser Web Workers.
 *
 * Island Sovereignty Law §9 applies: this behavior always runs inside a Worker.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/daemon-behavior
 */

import {
  mkDaemonDelegateVerb,
  mkDaemonVerifyResult,
  mkDaemonResolveBindingResult,
  type DaemonMsg_PlaceVerb,
  type DaemonMsg_VerbResult,
  type DaemonMsg_VerifyRequest,
  type DaemonMsg_ResolveBindingRequest,
  type AuthProofWire,
  type BatchMode,
  type Verb,
  type CapabilityVerifier,
} from "@lararium/mesh";
import { placeVerb } from "./verb-vm.js";
import { composeIsland } from "./island-caps.js";
import { hasEngineWatch } from "./has-island-watches.js";
import { VerbDispatcher, VerbTable } from "./verb-dispatcher.js";
import type { IslandCap } from "./island-caps.js";
import type { IslandContext, IslandBehavior } from "./island-context.js";

export interface DaemonBehaviorOptions {
  /** A ready verifier (e.g. tests, or a host-provided one). */
  verifier?: CapabilityVerifier;
  /**
   * Async verifier source resolved in `onEa` with the live IslandContext —
   * the isomorphic-vessel Stage-1 hook. Platform worker entries pass a factory
   * that calls `bootDaemonKeyhive` over `ctx.composite` (keeping keyhive out of
   * @lararium/tw5). Takes precedence over `verifier`. A throw here (gate failure)
   * propagates out of `onEa` → the island kernel posts `fault`, so the vessel
   * never goes live with an unauthorized identity.
   */
  verifierFactory?: (ctx: IslandContext) => Promise<CapabilityVerifier>;
  /**
   * Inbound-peer verification for the host's AuthVerifierSeam (path b). The host
   * has no keyhive after Stage 1, so it posts `admin:verify-request` and the
   * admin worker answers here. Opaque by design — peer verification needs
   * `receiveContactCard` (a @lararium/keyhive method, not in mesh), so the
   * platform entry supplies this closing over the booted keyhive; tw5 stays
   * keyhive-free.
   */
  verifyPeer?: (cardBytes: Uint8Array, bagUrl: string, access: "read" | "admin", proof?: AuthProofWire)
    => Promise<{ ok: boolean; identifier?: string; reason?: string; proofVerified?: boolean }>;
  /**
   * Resolve (or mint+delegate) the @personal/@draft binding pair island-side —
   * the mint needs keyhive + the island Repo. The platform entry supplies this
   * closing over the booted keyhive; it calls `resolveOrMintBinding` with
   * `ctx.repo` + `ctx.composite`. Opaque so tw5 stays keyhive-free.
   */
  resolveBinding?: (
    ctx: IslandContext,
    fingerprint: string,
    recipeTrace: { wikiDocId: string; libraryBagDocIds: readonly string[] },
  ) => Promise<{ personalUrl: string; draftUrl: string; workingUrl: string }>;
  /**
   * Sovereign-worker data-plane: register the residency / wiki / where / resolve
   * reactors into the worker's VerbDispatcher, in-worker, over the IslandContext.
   * Called in `onEa` before dispatch starts; the reactors inherit verify-then-delegate.
   * The platform entry supplies it (closing over the reactor factories); pool-touching
   * reactors command main via `ctx.post` (admin:evict-request). Absent → no data-plane.
   */
  wireWorkerVerbs?: (registry: VerbTable, ctx: IslandContext) => void;
}

export function makeDaemonBehavior(opts: DaemonBehaviorOptions = {}): IslandBehavior {
  let _dispatcher: VerbDispatcher | null = null;

  const _pendingDelegations = new Map<string, {
    resolve: (result: Record<string, unknown>) => void;
    reject:  (err: Error) => void;
  }>();

  function _routeToMain(invocation: Verb, post: IslandContext["post"]): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      _pendingDelegations.set(invocation.requestId, { resolve, reject });
      post(mkDaemonDelegateVerb({
        requestId:   invocation.requestId,
        verb:        invocation.action,
        args:        invocation.args as Record<string, unknown>,
        requestedBy: invocation.requestedBy,
        ...(invocation.targets?.length ? { targets: [...invocation.targets] } : {}),
        ...(invocation.batchMode       ? { batchMode: String(invocation.batchMode) } : {}),
      }));
    });
  }

  // The admin island is a nameless cap stack: #has engine-watch + #has admin-dispatch (the
  // VerbDispatcher + the admin:* signal family). The dispatch cap below holds what once was the
  // whole behavior, minus the engine-watch (now its own shared cap).
  const dispatchCap: IslandCap = {
    name: "admin-dispatch",
    async onEa(ctx: IslandContext) {
      const { tw5, composite, post } = ctx;
      // Resolve the verifier: the async factory (bootDaemonKeyhive over the admin
      // composite) wins; else a ready verifier; else none (delegated-verb path).
      const verifier = opts.verifierFactory ? await opts.verifierFactory(ctx) : opts.verifier;
      const registry = new VerbTable();
      // Sovereign-worker: the data-plane reactors register HERE, in-worker, over the
      // IslandContext (ctx.composite/ctx.repo) — so they ride the dispatcher's
      // verify-then-delegate gate FOR FREE (the gate the old main-thread jobRegistry
      // lacked). Pool-touching reactors command main via ctx.post (admin:evict-request).
      opts.wireWorkerVerbs?.(registry, ctx);
      _dispatcher = new VerbDispatcher({
        daemonVm:  tw5,
        admin:    composite,
        registry,
        routeFn:  (invocation) => _routeToMain(invocation, post),
        ...(verifier ? { verifier } : {}),
      });
      _dispatcher.start();
      return () => {
        _dispatcher?.stop();
        _dispatcher = null;
      };
    },

    onSignal(type: string, raw: unknown, ctx: IslandContext): boolean {
      const { tw5, post } = ctx;
      if (type === "daemon:place-verb") {
        const msg = raw as DaemonMsg_PlaceVerb;
        if (tw5) {
          placeVerb(tw5, {
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

      if (type === "daemon:verb-result") {
        const msg = raw as DaemonMsg_VerbResult;
        const pending = _pendingDelegations.get(msg.requestId);
        if (pending) {
          _pendingDelegations.delete(msg.requestId);
          if (msg.error) pending.reject(new Error(msg.error));
          else           pending.resolve(msg.result ?? {});
        }
        void post;
        return true;
      }

      if (type === "daemon:verify-request") {
        const msg = raw as DaemonMsg_VerifyRequest;
        const answer: Promise<{ ok: boolean; identifier?: string; reason?: string; proofVerified?: boolean }> = opts.verifyPeer
          ? opts.verifyPeer(msg.cardBytes, msg.bagUrl, msg.access, msg.proof)
          : Promise.resolve({ ok: false, reason: "no verifyPeer configured" });
        answer
          .then((r) => post(mkDaemonVerifyResult({
            requestId: msg.requestId, ok: r.ok,
            ...(r.identifier ? { identifier: r.identifier } : {}),
            ...(r.reason ? { reason: r.reason } : {}),
            ...(r.proofVerified !== undefined ? { proofVerified: r.proofVerified } : {}),
          })))
          .catch((err: unknown) => post(mkDaemonVerifyResult({
            requestId: msg.requestId, ok: false, reason: err instanceof Error ? err.message : String(err),
          })));
        return true;
      }

      if (type === "daemon:resolve-binding-request") {
        const msg = raw as DaemonMsg_ResolveBindingRequest;
        if (!opts.resolveBinding) {
          post(mkDaemonResolveBindingResult({ requestId: msg.requestId, error: "no resolveBinding configured" }));
        } else {
          opts.resolveBinding(ctx, msg.fingerprint, msg.recipeTrace)
            .then((r) => post(mkDaemonResolveBindingResult({
              requestId: msg.requestId, personalUrl: r.personalUrl, draftUrl: r.draftUrl, workingUrl: r.workingUrl,
            })))
            .catch((err: unknown) => post(mkDaemonResolveBindingResult({
              requestId: msg.requestId, error: err instanceof Error ? err.message : String(err),
            })));
        }
        return true;
      }

      return false;
    },
  };

  // Order = the original onEa order (dispatcher started, THEN engine-watch); composeIsland's LIFO
  // teardown then reproduces the old onHooAnu (engine-watch stopped, THEN dispatcher) exactly.
  return composeIsland([dispatchCap, hasEngineWatch()]);
}
