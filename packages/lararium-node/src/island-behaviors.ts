/**
 * island-behaviors — OTP callback modules for sovereign island types.
 *
 * Each export is an IslandBehavior: the domain-specific half of the OTP
 * gen_island pair. sovereign-island-model.ts owns the lifecycle plumbing;
 * behaviors own what distinguishes one island type from another.
 *
 * ## Wiki island — null behavior
 *   Read-dominant: CRDT bags flow in, TW5 session writes land in scratch.
 *   No JobDispatcher, no relay protocol. writeBagId = BAG_IDS.scratch.
 *
 * ## Wiki island with disk projection — extends null behavior
 *   Starts a LarDiskProjector inside the island, subscribing to TW5 wiki
 *   change events directly. renderFn calls exportMemeText(ctx.tw5, uri).
 *   Receives diskMirrors from manifest (serializable BagMirrorConfig).
 *
 * ## Wiki island with dispatch — handles wiki:place-job messages
 *   No kumu device surface (that belongs to admin island). Handles explicit
 *   wiki-scope jobs placed by the vessel. Direct inline dispatch (no
 *   JobDispatcher subscription) → wiki:job-result posted back.
 *   Cap verification: stubbed (job arrived from vessel = pre-authorized).
 *
 * ## Admin island — dispatch behavior
 *   Owns the kumu device / Reaction Engine surface (TW5 wiki change events).
 *   JobDispatcher subscribes to TW5 wiki events; wiki-scope verbs relay to
 *   vessel via AdminMsg_DelegateJob / AdminMsg_JobResult.
 *   writeBagId = ADMIN_BAG_ID (CRDT write-back, persisted).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/island-behaviors
 */

import {
  BAG_IDS,
  mkWikiJobResult,
  type BatchMode,
  type WikiMsg_PlaceJob,
  type IslandMsg_Manifest,
} from "@lararium/mesh";
import { placeVmJob, exportMemeText } from "@lararium/tw5";
import { LarDiskProjector } from "./disk-projector.js";
import { namedBagMirror } from "./bag-paths.js";
import { makePromoteReactor } from "./promote-handler.js";
import type { IslandBehavior, IslandContext } from "@lararium/tw5";

// ── Primary Wiki island behavior — disk projection + wiki dispatch ────────

/**
 * IslandBehavior for the primary wiki island: disk write-back + wiki-scope job dispatch.
 *
 *   onEa     — start LarDiskProjector (if diskMirrors present) + build VerbTable
 *   onSignal — handle wiki:place-job inline dispatch
 *   onDemote — stop projector, clear registry
 */
export function makeWikiPrimaryBehavior(manifest: IslandMsg_Manifest): IslandBehavior {
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

