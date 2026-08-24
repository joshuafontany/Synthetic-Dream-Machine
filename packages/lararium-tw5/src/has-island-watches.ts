/**
 * has-island-watches — the shared drift-watch caps a TW5 VM causal island composes.
 *
 * Both the daemon and wiki islands ran `startEngineWatch` in onEa and stopped it in onHooAnu; the
 * wiki island also ran `startRecipeWatch`. These extract those into `#has` caps so a nameless
 * island stacks them like any other component — the watch is a capability, not a behavior-class
 * member. Each cap's onEa returns the watch's stop fn, which composeIsland registers as a LIFO
 * teardown.
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/island-caps
 */

import { startEngineWatch } from "./engine-watch.js";
import { startRecipeWatch } from "./recipe-watch.js";
import { dispatchProjectedEvent, dispatchProjectedInput } from "./tw5-projection.js";
import type { IslandCap } from "./island-caps.js";
import type { IslandContext } from "./island-context.js";
import { boundedDomInputValue, type WikiMsg_DomEvent, type WikiMsg_DomInput } from "@lararium/mesh";

/** `#has` engine-epoch drift watch — self-writes the engine-waiting alert when a new genesis
 *  merges into the live lararium doc under this running island (alert-only; reboot adopts). */
export function hasEngineWatch(): IslandCap {
  return { name: "engine-watch", onEa: (ctx) => startEngineWatch(ctx) };
}

/** `#has` recipe/composition watch — applies recipe membership + oracle moves live, no reboot. */
export function hasRecipeWatch(): IslandCap {
  return { name: "recipe-watch", onEa: (ctx) => startRecipeWatch(ctx) };
}

/**
 * `#has` wiki-projection — the OUT=coalesce render (the `onBoot` shore mounts it: node disk / browser DOM)
 * plus the interactivity RETURN leg (a relayed main-thread DOM event → TW5's native handler). ANY TW5 VM
 * island composes this to become surfaceable — the @daemon inherits the SAME cap the pinned wiki carries, so
 * "pin the daemon" and "pin any wiki" ride one path (it's all the same VM under the hood). role = capability
 * ≠ platform: the caller's onBoot supplies the disk or DOM mount; the cap stays the same.
 */
export function hasProjection(onBoot?: (ctx: IslandContext) => (() => void) | undefined): IslandCap {
  return {
    name: "wiki-projection",
    onEa: (ctx) => onBoot?.(ctx),
    onSignal(type: string, raw: unknown): boolean {
      if (type === "wiki:dom-event") {
        const ev = raw as WikiMsg_DomEvent;
        dispatchProjectedEvent(ev.renderId, ev.eventType, ev.fields);
        return true;
      }
      // The TEXT leg rides its OWN kind, so the click path above keeps its primitives-only allowlist
      // legible. The bound re-reads here as well as at the island door: this cap CLAIMS the message
      // (returns true) either way, so a refused value ends as a drop rather than falling through to a
      // cap that never expected text.
      if (type === "wiki:dom-input") {
        const ev = raw as WikiMsg_DomInput;
        const value = boundedDomInputValue(ev.value);
        if (value !== null) dispatchProjectedInput(ev.renderId, ev.eventType, value);
        return true;
      }
      return false;
    },
  };
}
