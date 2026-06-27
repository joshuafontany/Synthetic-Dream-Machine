/**
 * has-island-watches — the shared drift-watch caps a TW5 VM causal island composes.
 *
 * Both the daemon and wiki islands ran `startEngineWatch` in onEa and stopped it in onHooAnu; the
 * wiki island also ran `startRecipeWatch`. These extract those into `#has` caps so a nameless
 * island stacks them like any other component — the watch is a capability, not a behavior-class
 * member. Each cap's onEa returns the watch's stop fn, which composeIsland registers as a LIFO
 * teardown.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/island-caps
 */

import { startEngineWatch } from "./engine-watch.js";
import { startRecipeWatch } from "./recipe-watch.js";
import type { IslandCap } from "./island-caps.js";

/** `#has` engine-epoch drift watch — self-writes the engine-waiting alert when a new genesis
 *  merges into the live @lararium doc under this running island (alert-only; reboot adopts). */
export function hasEngineWatch(): IslandCap {
  return { name: "engine-watch", onEa: (ctx) => startEngineWatch(ctx) };
}

/** `#has` recipe/composition watch — applies recipe membership + oracle moves live, no reboot. */
export function hasRecipeWatch(): IslandCap {
  return { name: "recipe-watch", onEa: (ctx) => startRecipeWatch(ctx) };
}
