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
 *   main thread via AdminMsg_RelayJob / AdminMsg_JobResult.
 *   writeBagId = ADMIN_BAG_ID (CRDT write-back, persisted).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/worker-behaviors
 */

import {
  BAG_IDS,
  ADMIN_BAG_ID,
  mkAdminRelayJob,
  mkWikiJobResult,
  type AdminMsg_PlaceJob,
  type AdminMsg_JobResult,
  type BatchMode,
  type JobTiddler,
  type WikiMsg_PlaceJob,
  type WorkerMsg_Manifest,
} from "@lararium/mesh";
import { placeVmJob, exportMemeText } from "@lararium/tw5";
import { JobDispatcher, JobHandlerRegistry } from "./job-dispatcher.js";
import { LarDiskProjector } from "./disk-projector.js";
import { namedBagMirror } from "./bag-paths.js";
import { createPromoteHandler } from "./promote-handler.js";
import type { WorkerBehavior, WorkerContext } from "./sovereign-worker-model.js";

// ── Wiki Worker behavior — null object (OTP: no-op callback module) ───────

export const WikiBehavior: WorkerBehavior = {
  writeBagId:  BAG_IDS.scratch,
  onReady:     () => {},
  onMessage:   () => false,
  onTeardown:  () => {},
};

// ── Wiki Worker with disk projection ─────────────────────────────────────

/**
 * Behavior for the primary wiki Worker when disk projection is required.
 *
 * Constructs a LarDiskProjector from the manifest's `diskMirrors` field and
 * starts it inside the Worker, subscribing to TW5 wiki change events directly.
 * The renderFn calls exportMemeText(ctx.tw5, uri) — no main-thread round-trip.
 *
 * Pass the manifest message so the behavior can read `diskMirrors` at `onReady` time.
 */
export function makeWikiDiskBehavior(manifest: WorkerMsg_Manifest): WorkerBehavior {
  let _stopProjector: (() => void) | null = null;

  return {
    writeBagId: BAG_IDS.scratch,

    onReady(ctx: WorkerContext) {
      const mirrorDefs = manifest.diskMirrors;
      if (!mirrorDefs?.length) return;

      const mirrors = mirrorDefs.map(({ bagId, mirrorRoot, scope }) =>
        namedBagMirror(bagId, scope, mirrorRoot),
      );

      const projector = new LarDiskProjector(
        mirrors,
        (uri) => { try { return Promise.resolve(exportMemeText(ctx.tw5, uri)); } catch { return Promise.resolve(null); } },
      );
      _stopProjector = projector.start(ctx.tw5);
    },

    onMessage: () => false,

    onTeardown() {
      _stopProjector?.();
      _stopProjector = null;
    },
  };
}

// ── Wiki Worker with dispatch — wiki:place-job handler ────────────────────

/**
 * Behavior for wiki Workers that handle explicit wiki-scope jobs from the main thread.
 *
 * Registers a job handler registry (including promote) and dispatches
 * wiki:place-job messages inline — no JobDispatcher subscription needed
 * (wiki Workers have no kumu device surface / TW5 event job inbox).
 *
 * Cap verification is stubbed: the job arrived via WorkerMsg protocol from
 * the main thread, which is the trust boundary. Pre-authorization is assumed.
 *
 * Results are posted back via wiki:job-result when requestId is present.
 */
export function makeWikiDispatchBehavior(): WorkerBehavior {
  let _registry: JobHandlerRegistry | null = null;

  return {
    writeBagId: BAG_IDS.scratch,

    onReady(ctx: WorkerContext) {
      _registry = new JobHandlerRegistry();
      _registry.register("promote", createPromoteHandler({
        composite: ctx.composite,
        tw5:       ctx.tw5,
      }));
    },

    onMessage(type: string, raw: unknown, ctx: WorkerContext): boolean {
      if (type !== "wiki:place-job") return false;
      if (!_registry) return false;
      const msg = raw as WikiMsg_PlaceJob;
      const requestId = msg.requestId ?? crypto.randomUUID();
      const handler = _registry.get(msg.verb);
      if (!handler) {
        if (msg.requestId) {
          ctx.post(mkWikiJobResult({ requestId, error: `no handler for "${msg.verb}"` }));
        }
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

    onTeardown() {
      _registry = null;
    },
  };
}

// ── Primary Wiki Worker behavior — disk projection + wiki dispatch ────────

/**
 * Combined behavior for the primary wiki Worker.
 *
 * Merges makeWikiDiskBehavior + makeWikiDispatchBehavior into one:
 *   onReady   — start disk projector (if diskMirrors present) + build job registry
 *   onMessage — handle wiki:place-job inline dispatch
 *   onTeardown — stop projector
 *
 * Use this behavior when the primary wiki Worker needs both disk write-back
 * and wiki-scope job handling (promote, etc.).
 */
export function makeWikiPrimaryBehavior(manifest: WorkerMsg_Manifest): WorkerBehavior {
  let _stopProjector: (() => void) | null = null;
  let _registry: JobHandlerRegistry | null = null;

  return {
    writeBagId: BAG_IDS.scratch,

    onReady(ctx: WorkerContext) {
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
      _registry = new JobHandlerRegistry();
      _registry.register("promote", createPromoteHandler({
        composite: ctx.composite,
        tw5:       ctx.tw5,
      }));
    },

    onMessage(type: string, raw: unknown, ctx: WorkerContext): boolean {
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

    onTeardown() {
      _stopProjector?.();
      _stopProjector = null;
      _registry = null;
    },
  };
}

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
