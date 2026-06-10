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
  TEMP_BAG,
  type BatchMode,
  type WikiMsg_PlaceVerb,
  type Verb,
  type ChangeOrigin,
} from "@lararium/mesh";
import { registerActionReactors } from "./action-handler.js";
import { VerbTable } from "./verb-dispatcher.js";
import { startEngineWatch } from "./engine-watch.js";
import { startRecipeWatch } from "./recipe-watch.js";
import type { IslandBehavior, IslandContext } from "./island-context.js";

/** The reboot-pending alert tiddler title. Tagged `$:/tags/Alert` so TW5's NATIVE
 *  alert area renders it (no custom banner needed). Stable title = one coalesced
 *  alert, not a pile. Volatile (@temp) → self-clearing on reboot, which is exactly
 *  what applies the pending change; the operator may also dismiss it (TW5's close
 *  button deletes the tiddler). */
export const REBOOT_ALERT_TITLE = "$:/temp/lares/alert/reboot-pending";
/** TW5's built-in alert tag — tiddlers carrying it surface in the alerts area. */
const TW5_ALERT_TAG = "$:/tags/Alert";

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
  let _engineWatchStop: (() => void) | undefined;
  let _recipeWatchStop: (() => void) | undefined;

  return {
    async onEa(ctx: IslandContext) {
      // Residency Model ACTION verb family — ADD / COPY / MOVE / CLEAR / DROP /
      // LOAD reactors wrapping each bag mutation in withEffectRecord (audit).
      _registry = new VerbTable();
      registerActionReactors(_registry, { composite: ctx.composite });
      // system-alert — the admin worker (via main → pool.placeWikiVerb) delivers a
      // reboot-pending notice; the island writes it into its OWN @temp (volatile,
      // self-clearing on reboot). The admin never reaches into this composite directly.
      _registry.register("system-alert", async (args) => {
        const message = typeof args["message"] === "string" ? args["message"] : "A change requires a reboot to apply.";
        const cause   = typeof args["cause"]   === "string" ? args["cause"]   : "";
        const origin: ChangeOrigin = { kind: "lares-verb", requestId: `alert-${Date.now()}` };
        await ctx.composite.put(
          {
            tiddler: {
              title:       REBOOT_ALERT_TITLE,
              text:        message,
              tags:        TW5_ALERT_TAG,   // surfaces in TW5's native alert area
              "alert-kind": "reboot-pending",
              cause,
              ts:          new Date().toISOString(),
            },
          },
          origin,
          { bag: TEMP_BAG },
        );
        return { seeded: true, title: REBOOT_ALERT_TITLE };
      });
      _cleanup = opts.onBoot?.(ctx);
      // Engine-epoch drift detection — when a new genesis merges into the live
      // @lararium doc under this running island, self-write the engine-waiting
      // alert (alert-only; the reboot that adopts it also clears it via @temp).
      _engineWatchStop = startEngineWatch(ctx);
      // Composition-class live reconcile — recipe membership + oracle moves
      // apply without a reboot; the reboot alert stays the fallback.
      _recipeWatchStop = await startRecipeWatch(ctx);
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
      _recipeWatchStop?.();
      _recipeWatchStop = undefined;
      _engineWatchStop?.();
      _engineWatchStop = undefined;
      _cleanup?.();
      _cleanup = undefined;
      _registry = null;
    },
  };
}
