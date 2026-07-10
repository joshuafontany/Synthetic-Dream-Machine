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
 * Meme: lar:///ha.ka.ba/lararium/tw5/wiki-behavior
 */

import {
  mkWikiVerbResult,
  wikiSlotUri,
  type BatchMode,
  type WikiMsg_PlaceVerb,
  type WikiMsg_DomEvent,
  type Verb,
  type ChangeOrigin,
} from "@lararium/mesh";
import { registerActionReactors, makeTw5Deserializer } from "./action-handler.js";
import { dispatchProjectedEvent } from "./tw5-projection.js";
import { VerbTable } from "./verb-dispatcher.js";
import { composeIsland } from "./island-caps.js";
import { hasEngineWatch, hasRecipeWatch } from "./has-island-watches.js";
import type { IslandCap } from "./island-caps.js";
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
  /**
   * Further #has caps the worker composes onto the wiki island's stack (e.g. the
   * `hasWikiSensorium` perceiver). They fold AFTER the base caps, so the dispatch and
   * projection channels keep signal precedence; teardown mirrors (LIFO).
   */
  caps?: readonly IslandCap[];
}

/** The isomorphic primary-wiki island behavior. */
export function makeWikiBehavior(opts: WikiBehaviorOptions = {}): IslandBehavior {
  let _registry: VerbTable | null = null;

  // #has wiki-dispatch — the ACTION verb registry + the wiki:place-verb channel (the synapse).
  const dispatchCap: IslandCap = {
    name: "wiki-dispatch",
    onEa(ctx: IslandContext) {
      // Residency Model ACTION verb family — ADD / COPY / MOVE / CLEAR / DROP /
      // LOAD reactors wrapping each bag mutation in withEffectRecord (audit).
      const registry = new VerbTable();
      // Native TW5 filetype deserialization for LOAD — resolved lazily through the
      // island's live $tw at action time (post-boot), so LOAD lands every legal TW5
      // filetype via TW5's own registry. The memetic carriers stay on their own path.
      registerActionReactors(registry, {
        composite: ctx.composite,
        tw5: makeTw5Deserializer(ctx.tw5),
      });
      // system-alert — the daemon worker (via main → pool.placeWikiVerb) delivers a
      // reboot-pending notice; the island writes it into its OWN @temp (volatile,
      // self-clearing on reboot). The daemon never reaches into this composite directly.
      registry.register("system-alert", async (args) => {
        const message = typeof args["message"] === "string" ? args["message"] : "A change requires a reboot to apply.";
        const cause   = typeof args["cause"]   === "string" ? args["cause"]   : "";
        // Alert kind selects the (stable, coalescing) alert tiddler. Default stays
        // the reboot-pending title; other kinds (e.g. "disk-ward") get their own.
        const kind    = typeof args["kind"] === "string" && args["kind"] ? args["kind"] : "reboot-pending";
        const title   = kind === "reboot-pending" ? REBOOT_ALERT_TITLE : `$:/temp/lares/alert/${kind}`;
        const origin: ChangeOrigin = { kind: "lares-verb", requestId: `alert-${Date.now()}` };
        await ctx.composite.put(
          {
            tiddler: {
              title,
              text:        message,
              tags:        TW5_ALERT_TAG,   // surfaces in TW5's native alert area
              "alert-kind": kind,
              cause,
              ts:          new Date().toISOString(),
            },
          },
          origin,
          { bag: wikiSlotUri(ctx.recipe.wikiSlug, "temp") },
        );
        return { seeded: true, title: REBOOT_ALERT_TITLE };
      });
      _registry = registry;
      return () => {
        _registry = null;
      };
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
        title:       `lar:///ha.ka.ba/bags/@wiki/verbs/${requestId}`,
        action:      msg.verb,
        args:        msg.args,
        targets:     msg.targets ?? [],
        batchMode:   (msg.batchMode as BatchMode) ?? "single",
        status:      "pending",
        requestedBy: msg.requestedBy,
        requestedAt: new Date().toISOString(),
      };
      void handler(msg.args, {
        daemon: ctx.composite,
        invocation,
        cap:   async () => ({ ok: true, reason: "worker-trust" }),
      }).then((result) => {
        if (msg.requestId) ctx.post(mkWikiVerbResult({ requestId, result }));
      }).catch((err: unknown) => {
        if (msg.requestId) ctx.post(mkWikiVerbResult({ requestId, error: String(err) }));
      });
      return true;
    },
  };

  // #has wiki-projection — the OUT=coalesce render (node disk / browser DOM) composed via the
  // onBoot seam, plus the interactivity RETURN leg (a relayed main-thread DOM event → TW5's
  // native handler path). role = capability ≠ platform: node supplies the disk onBoot, browser
  // the DOM onBoot, the cap stays the same.
  const projectionCap: IslandCap = {
    name: "wiki-projection",
    onEa: (ctx: IslandContext) => opts.onBoot?.(ctx),
    onSignal(type: string, raw: unknown): boolean {
      if (type !== "wiki:dom-event") return false;
      const ev = raw as WikiMsg_DomEvent;
      dispatchProjectedEvent(ev.renderId, ev.eventType, ev.fields);
      return true;
    },
  };

  // The nameless wiki island = a #has cap stack. Order = the original onEa order (dispatch ·
  // projection · engine-watch · recipe-watch); composeIsland's LIFO teardown reproduces the old
  // onHooAnu order (recipe · engine · projection-cleanup · registry-null) exactly. Caller-supplied
  // caps fold at the tail — added capability, never a re-ordering of the base channels.
  return composeIsland([dispatchCap, projectionCap, hasEngineWatch(), hasRecipeWatch(), ...(opts.caps ?? [])]);
}
