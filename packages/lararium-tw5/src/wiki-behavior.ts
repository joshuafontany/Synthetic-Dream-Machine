/**
 * wiki-behavior — the shared primary-wiki island behavior (isomorphic).
 *
 * Both vessels ran a wiki behavior: node's `makeWikiPrimaryBehavior` carried the
 * full surface (ACTION verb registry + wiki:place-verb dispatch + disk
 * projection), while the browser ran a stub whose onSignal returned false. This
 * holds the shared behavior ONCE: the ACTION verb registry + the full
 * wiki:place-verb dispatch. Platform side-effects (node disk projection, which
 * needs fs) compose IN via the `onBoot` capability hook — node supplies it,
 * browser supplies none. No fs, no node coupling here.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/wiki-behavior
 */

import {
  mkWikiVerbResult,
  type BatchMode,
  type WikiMsg_PlaceVerb,
  type Verb,
} from "@lararium/mesh";
import { registerActionReactors } from "./action-handler.js";
import { VerbTable } from "./verb-dispatcher.js";
import type { IslandBehavior, IslandContext } from "./island-context.js";

export interface WikiBehaviorOptions {
  /**
   * Platform side-effects to start on ea (e.g. node disk projection). Returns a
   * cleanup run on demote, or undefined for none. Browser supplies nothing —
   * the disk projector is a node-held capability (fs), composed in, not forked.
   */
  onBoot?: (ctx: IslandContext) => (() => void) | undefined;
}

/** The isomorphic primary-wiki island behavior. */
export function makeWikiBehavior(opts: WikiBehaviorOptions = {}): IslandBehavior {
  let _registry: VerbTable | null = null;
  let _cleanup: (() => void) | undefined;

  return {
    onEa(ctx: IslandContext) {
      // Residency Model ACTION verb family — ADD / COPY / MOVE / CLEAR / DROP /
      // LOAD reactors wrapping each bag mutation in withEffectRecord (audit).
      _registry = new VerbTable();
      registerActionReactors(_registry, { composite: ctx.composite });
      _cleanup = opts.onBoot?.(ctx);
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
      const invocation: Verb = {
        requestId,
        title:       `lar:///ha.ka.ba/@wiki/verbs/${requestId}`,
        action:      msg.verb,
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
      _cleanup?.();
      _cleanup = undefined;
      _registry = null;
    },
  };
}
