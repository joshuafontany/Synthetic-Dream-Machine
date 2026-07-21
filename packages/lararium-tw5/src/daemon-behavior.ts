/**
 * daemon-behavior — isomorphic daemon island behavior for all platforms.
 *
 * makeDaemonBehavior() returns an IslandBehavior that:
 *   - Starts a VerbDispatcher subscribed to TW5 wiki change events (local path)
 *     and to the daemon CompositeStore (remote/signal path).
 *   - Routes wiki-scope verbs to the vessel via DaemonMsg_DelegateVerb /
 *     DaemonMsg_VerbResult, holding Promise resolvers in a pending delegation map.
 *   - Handles daemon:place-verb from the vessel (main-thread → island).
 *   - Handles daemon:verb-result from the vessel (island delegation round-trip).
 *
 * Runs identically in Node worker_threads and browser Web Workers.
 *
 * Island Sovereignty Law §9 applies: this behavior always runs inside a Worker.
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/daemon-behavior
 */

import {
  mkDaemonDelegateVerb,
  mkDaemonVerifyResult,
  mkDaemonResolveBindingResult,
  mkDaemonDeriveSkeletonResult,
  mkDaemonWorldlineCompareResult,
  mkDaemonWorldlineTrajectoryResult,
  type DaemonMsg_PlaceVerb,
  type DaemonMsg_VerbResult,
  type DaemonMsg_VerifyRequest,
  type DaemonMsg_ResolveBindingRequest,
  type DaemonMsg_DeriveSkeletonRequest,
  type DaemonMsg_WorldlineCompareRequest,
  type DaemonMsg_WorldlineTrajectoryRequest,
  type AuthProofWire,
  type DeviceDelegationTiddler,
  type PeerClass,
  type BatchMode,
  type Verb,
  type CapabilityVerifier,
  type CaptureEngine,
  type CapturePost,
  LARES_VERB_ARGS_WIRE_FIELD,
} from "@lararium/mesh";
import { placeVerb } from "./verb-vm.js";
import { composeIsland } from "./island-caps.js";
import { hasEngineWatch, hasProjection } from "./has-island-watches.js";
import { hasCapture } from "./has-capture.js";
import { VerbDispatcher, VerbTable } from "./verb-dispatcher.js";
import type { IslandCap } from "./island-caps.js";
import type { IslandContext, IslandBehavior } from "./island-context.js";

export interface DaemonBehaviorOptions {
  /** A ready verifier (e.g. tests, or a host-provided one). */
  verifier?: CapabilityVerifier;
  /**
   * Projection mount seam — the @daemon INHERITS the wiki's render cap (hasProjection). When the worker
   * entry supplies onBoot (mountProjection), the @daemon becomes a surfaceable wiki like any other: the user
   * pins it to render, the same path any wiki takes (it's the same TW5 VM under the hood). Absent → the cap
   * stays inert (the @daemon runs headless, its historical resting state). role = capability ≠ platform.
   */
  onBoot?: (ctx: IslandContext) => (() => void) | undefined;
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
   * has no keyhive after Stage 1, so it posts `daemon:verify-request` and the
   * daemon worker answers here. Opaque by design — peer verification needs
   * `receiveContactCard` (a @lararium/keyhive method, not in mesh), so the
   * platform entry supplies this closing over the booted keyhive; tw5 stays
   * keyhive-free.
   */
  verifyPeer?: (cardBytes: Uint8Array, bagUrl: string, access: "read" | "admin", proof?: AuthProofWire, edge?: DeviceDelegationTiddler)
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
   * reactors command main via `ctx.post` (daemon:evict-request). Absent → no data-plane.
   */
  wireWorkerVerbs?: (registry: VerbTable, ctx: IslandContext) => void;
  /**
   * The telemetry capture SINK (node: makeNodeCaptureEngine wired to the palace). Every @daemon
   * ALWAYS carries the capture cap (idempotent — tending the bound operator's session-capture is a
   * daemon duty); this seam, when wired, makes it LIVE. Absent → the cap stays inert (sink not
   * wired, a valid resting state). The two-loop config (servo + derive) lives inside the engine the
   * vessel builds. role = capability ≠ platform — tw5 never imports the node sink.
   */
  makeCaptureEngine?: (post: CapturePost, ctx: IslandContext) => CaptureEngine;
  /** the capture cap's server tick (ms); default 50. */
  captureTickMs?: number;
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

  // The daemon island is a nameless cap stack: #has engine-watch + #has daemon-dispatch (the
  // VerbDispatcher + the daemon:* signal family). The dispatch cap below holds what once was the
  // whole behavior, minus the engine-watch (now its own shared cap).
  const dispatchCap: IslandCap = {
    name: "daemon-dispatch",
    async onEa(ctx: IslandContext) {
      const { tw5, composite, post } = ctx;
      // Resolve the verifier: the async factory (bootDaemonKeyhive over the daemon
      // composite) wins; else a ready verifier; else none (delegated-verb path).
      const verifier = opts.verifierFactory ? await opts.verifierFactory(ctx) : opts.verifier;
      const registry = new VerbTable();
      // Sovereign-worker: the data-plane reactors register HERE, in-worker, over the
      // IslandContext (ctx.composite/ctx.repo) — so they ride the dispatcher's
      // verify-then-delegate gate FOR FREE (the gate the old main-thread jobRegistry
      // lacked). Pool-touching reactors command main via ctx.post (daemon:evict-request).
      opts.wireWorkerVerbs?.(registry, ctx);
      _dispatcher = new VerbDispatcher({
        daemonVm:  tw5,
        daemon:    composite,
        registry,
        routeFn:  (invocation) => _routeToMain(invocation, post),
        ...(verifier ? { verifier } : {}),
      });
      _dispatcher.start();
      // The @daemon's OWN verb OUT-path (the twin of the pool island-kernel's wiring):
      // a projected switcher click writes a verb-carrying summon tiddler, whose
      // reaction-router fires a tm-verse-event. Forward it to main as an IslandMsg_Event
      // — main's daemon-vm listener routes it to placeVerb (verify-then-delegate → the
      // main registry, e.g. wiki-switch). Without this, @daemon-origin verbs never leave
      // the worker (projection frames reach main, but verse-events had no bridge).
      const cancelVerse = tw5.onVerseEvent({
        handleVerseEvent: (uri: string, listenable: string, verb?: string, fromUri?: string, args?: Record<string, unknown>) => {
          // The reaction-router already gates on the `lares-dispatch` marker, so ONLY a
          // genuine summon reaches here (the verb machinery's own invocation/outcome
          // writes never carry the marker → router-inert, the marker alone gating this
          // bridge, no URI-prefix allowlist). The structured args ride
          // the GP-2-flat island wire as ONE `verb-args` JSON string; main re-parses.
          post({
            schema_version: 1,
            type:           "event",
            wikiUri:        ctx.wikiUri,
            listenable,
            payload: {
              uri,
              ...(verb    !== undefined ? { verb }    : {}),
              ...(fromUri !== undefined ? { fromUri } : {}),
              ...(args    !== undefined ? { [LARES_VERB_ARGS_WIRE_FIELD]: JSON.stringify(args) } : {}),
            },
          });
        },
      });
      return () => {
        cancelVerse();
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
        const answer: Promise<{ ok: boolean; identifier?: string; reason?: string; proofVerified?: boolean; peerClass?: PeerClass }> = opts.verifyPeer
          ? opts.verifyPeer(msg.cardBytes, msg.bagUrl, msg.access, msg.proof, msg.edge)
          : Promise.resolve({ ok: false, reason: "no verifyPeer configured" });
        answer
          .then((r) => post(mkDaemonVerifyResult({
            requestId: msg.requestId, ok: r.ok,
            ...(r.identifier ? { identifier: r.identifier } : {}),
            ...(r.reason ? { reason: r.reason } : {}),
            ...(r.proofVerified !== undefined ? { proofVerified: r.proofVerified } : {}),
            // Forward the self-slot class VERBATIM — the worker owns the classification (only it holds
            // the cap-verify + the pinned-root edge check). The host fails closed on an absent class.
            ...(r.peerClass !== undefined ? { peerClass: r.peerClass } : {}),
          })))
          .catch((err: unknown) => post(mkDaemonVerifyResult({
            requestId: msg.requestId, ok: false, reason: err instanceof Error ? err.message : String(err),
          })));
        return true;
      }

      if (type === "daemon:derive-skeleton-request") {
        // The recall twin of the telemetry capture: derive the query's move-skeleton IN this island's
        // TW5 VM, against the full self-hosted grammar + the LIVE grammar-cache basis — the SAME
        // Move→Vec functor capture runs. The in-VM fn lives on $tw.lares (query-derive-vm startup);
        // we reach it across ctx.tw5.$tw, identical to the capture annotate path. One runtime, no
        // node-side fallback. Plugin absent / parse fault → a graceful null (→ recall fuses content-only).
        const msg = raw as DaemonMsg_DeriveSkeletonRequest;
        try {
          const $tw = (tw5 as { $tw?: { lares?: { deriveQuerySkeletonVm?: (q: string) => { skeleton: unknown; basis: unknown } | null } } } | undefined)?.$tw;
          const fn = $tw?.lares?.deriveQuerySkeletonVm;
          if (!fn) {
            console.warn("[daemon-behavior] $tw.lares.deriveQuerySkeletonVm absent (plugin not loaded) — recall degrades to content-only (drop-honesty)");
            post(mkDaemonDeriveSkeletonResult({ requestId: msg.requestId }));
          } else {
            const d = fn(msg.query);
            post(mkDaemonDeriveSkeletonResult(
              d ? { requestId: msg.requestId, skeleton: d.skeleton, basis: d.basis } : { requestId: msg.requestId },
            ));
          }
        } catch (err) {
          post(mkDaemonDeriveSkeletonResult({ requestId: msg.requestId, error: err instanceof Error ? err.message : String(err) }));
        }
        return true;
      }

      if (type === "daemon:worldline-compare-request") {
        // Well 1, the ITC LIVE-READ — homed in THIS island VM (the cap-stack lifts whole, no
        // coordinator carve-out). The in-VM fn projects the registry from the carried edge-DAG +
        // answers the causal verdict; an unknown handle throws → a graceful `error` across the wire.
        const msg = raw as DaemonMsg_WorldlineCompareRequest;
        try {
          const $tw = (tw5 as { $tw?: { lares?: { worldlineCompareVm?: (i: { a: string; b: string; opens: unknown; closes?: unknown; root?: string }) => { order: string } } } } | undefined)?.$tw;
          const fn = $tw?.lares?.worldlineCompareVm;
          if (!fn) {
            console.warn("[daemon-behavior] $tw.lares.worldlineCompareVm absent (plugin not loaded) — worldline-compare unavailable");
            post(mkDaemonWorldlineCompareResult({ requestId: msg.requestId, error: "worldlineCompareVm absent (plugin not loaded)" }));
          } else {
            const r = fn({
              a: msg.a, b: msg.b, opens: msg.opens,
              ...(msg.closes !== undefined ? { closes: msg.closes } : {}),
              ...(msg.root   !== undefined ? { root: msg.root }     : {}),
            });
            post(mkDaemonWorldlineCompareResult({ requestId: msg.requestId, order: r.order }));
          }
        } catch (err) {
          post(mkDaemonWorldlineCompareResult({ requestId: msg.requestId, error: err instanceof Error ? err.message : String(err) }));
        }
        return true;
      }

      if (type === "daemon:worldline-trajectory-request") {
        // Well 3 (THE CORE) + Well 4 (NULL-READY) — homed in THIS island VM. The in-VM fn orders the
        // handle's turns, joins the form-vectors the host shipped, and optionally rides the null
        // shuffle. Total (empty stubs → empty trajectory); a fault degrades to an `error`.
        const msg = raw as DaemonMsg_WorldlineTrajectoryRequest;
        try {
          const $tw = (tw5 as { $tw?: { lares?: { worldlineTrajectoryVm?: (i: { handle: string; stubs: unknown; joinForm?: boolean; includeNull?: boolean; seed?: number; window?: number }) => { trajectory: unknown; nullBaseline?: unknown } } } } | undefined)?.$tw;
          const fn = $tw?.lares?.worldlineTrajectoryVm;
          if (!fn) {
            console.warn("[daemon-behavior] $tw.lares.worldlineTrajectoryVm absent (plugin not loaded) — worldline-trajectory unavailable");
            post(mkDaemonWorldlineTrajectoryResult({ requestId: msg.requestId, error: "worldlineTrajectoryVm absent (plugin not loaded)" }));
          } else {
            const r = fn({
              handle: msg.handle, stubs: msg.stubs,
              ...(msg.joinForm    !== undefined ? { joinForm: msg.joinForm }       : {}),
              ...(msg.includeNull !== undefined ? { includeNull: msg.includeNull } : {}),
              ...(msg.seed        !== undefined ? { seed: msg.seed }               : {}),
              ...(msg.window      !== undefined ? { window: msg.window }           : {}),
            });
            post(mkDaemonWorldlineTrajectoryResult({
              requestId: msg.requestId,
              trajectory: r.trajectory,
              ...(r.nullBaseline !== undefined ? { nullBaseline: r.nullBaseline } : {}),
            }));
          }
        } catch (err) {
          post(mkDaemonWorldlineTrajectoryResult({ requestId: msg.requestId, error: err instanceof Error ? err.message : String(err) }));
        }
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

  // The @daemon's #has stack: dispatch (AUTHORITY plane) + engine-watch + the IDEMPOTENT capture
  // cap (FLOW plane — the bound operator's session-capture duty). dispatch onEa runs first (LIFO
  // teardown stops it last); the capture cap tears down first (final flush, then dispose). The
  // capture cap stays a DISTINCT #has unit — it never gates authz; the master cut holds at the cap
  // seam, not the worker. Inert when no sink is wired (makeCaptureEngine absent) — every @daemon
  // carries the cap; whether it breathes depends on a wired sink + feed.
  return composeIsland([
    dispatchCap,
    // Inherit the wiki's render cap — inert until a worker entry wires onBoot (mountProjection), at which
    // point the @daemon surfaces like any pinned wiki (same VM, same path).
    hasProjection(opts.onBoot),
    hasEngineWatch(),
    hasCapture({
      ...(opts.makeCaptureEngine ? { makeEngine: opts.makeCaptureEngine } : {}),
      ...(opts.captureTickMs !== undefined ? { tickMs: opts.captureTickMs } : {}),
    }),
  ]);
}
