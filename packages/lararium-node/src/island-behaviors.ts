/**
 * island-behaviors — OTP callback modules for sovereign island types.
 *
 * Each export is an IslandBehavior: the domain-specific half of the OTP
 * gen_island pair. sovereign-island-model.ts owns the lifecycle plumbing;
 * behaviors own what distinguishes one island type from another.
 *
 * Under the one-recipe model, write routing happens via the in-wiki cascade
 * (`lar:///ha.ka.ba/@lararium/config/bag-paths`) — behaviors no longer carry
 * a writeBagId.
 *
 * ## Wiki island — disk projection + wiki-scope verb dispatch
 *   onEa     — start LarDiskProjector (if diskMirrors present) + build VerbTable
 *   onSignal — handle wiki:place-verb inline dispatch
 *   onDemote — stop projector, clear registry
 *
 * ## Admin island — dispatch behavior (lives in @lararium/tw5/admin-behavior)
 *   Owns the kumu device / Reaction Engine surface (TW5 wiki change events).
 *   VerbDispatcher subscribes to TW5 wiki events; wiki-scope verbs relay to
 *   vessel via AdminMsg_DelegateVerb / AdminMsg_VerbResult.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/island-behaviors
 */

import {
  mkWikiVerbResult,
  type BatchMode,
  type WikiMsg_PlaceVerb,
  type IslandMsg_Manifest,
  type VerbInvocation,
} from "@lararium/mesh";
import { placeVerbInvocation, exportMemeText, VerbTable } from "@lararium/tw5";
import { LarDiskProjector } from "./disk-projector.js";
import { namedBagMirror } from "./bag-paths.js";
import type { IslandBehavior, IslandContext } from "@lararium/tw5";

// ── Primary Wiki island behavior — disk projection + wiki dispatch ────────

/**
 * IslandBehavior for the primary wiki island: disk write-back + wiki-scope verb dispatch.
 *
 *   onEa     — start LarDiskProjector (if diskMirrors present) + build VerbTable
 *   onSignal — handle wiki:place-verb inline dispatch
 *   onDemote — stop projector, clear registry
 */
export function makeWikiPrimaryBehavior(manifest: IslandMsg_Manifest): IslandBehavior {
  let _stopProjector: (() => void) | null = null;
  let _registry: VerbTable | null = null;

  return {
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

      // Wiki-scope dispatch — empty until Sprint 5 lands the ACTION verb
      // handler family (ADD / COPY / MOVE / CLEAR / DROP / LOAD) under the
      // Residency Model. See packages/EPIC-RESIDENCY-MODEL.md Sprint 5.
      _registry = new VerbTable();
    },

    onSignal(type: string, raw: unknown, ctx: IslandContext): boolean {
      if (type !== "wiki:place-verb") return false;
      if (!_registry) return false;
      const msg = raw as WikiMsg_PlaceVerb;
      const requestId = msg.requestId ?? crypto.randomUUID();
      const handler = _registry.get(msg.verb);
      if (!handler) {
        if (msg.requestId) ctx.post(mkWikiVerbResult({ requestId, error: `no handler for "${msg.verb}"` }));
        return true;
      }
      const invocation: VerbInvocation = {
        requestId,
        title:       `lar:///ha.ka.ba/@wiki/verbs/${requestId}`,
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
        invocation,
        cap:   async () => ({ ok: true, reason: "worker-trust" }),
      }).then((result) => {
        if (msg.requestId) ctx.post(mkWikiVerbResult({ requestId, result }));
      }).catch((err: unknown) => {
        if (msg.requestId) ctx.post(mkWikiVerbResult({ requestId, error: String(err) }));
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
