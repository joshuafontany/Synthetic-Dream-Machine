/**
 * island-recipe — one recipe model for sovereign islands.
 *
 * Canonical assembly order:
 *   1) CRDT relational bags from manifest bagBindings
 *   2) scratch MemoryTiddlerStore (default writable)
 *   3) projection MemoryTiddlerStore (non-default writable)
 *   4) IslandAdaptor projection
 *   5) initial replay + sync complete signals per CRDT bag
 *
 * Node and browser sovereign workers both call this helper so recipe behavior
 * stays aligned as one model.
 */

import {
  CompositeStore,
  AutomergeDocStore,
  BAG_IDS,
  type LarDoc,
  type DocHandle,
} from "@lararium/mesh";
import { IslandAdaptor } from "./island-adaptor.js";
import { MemoryTiddlerStore } from "./memory-store.js";
import type { TW5Engine } from "./tw5-vm.js";

export interface RecipeReadyBinding {
  bagId: string;
  handle: DocHandle<LarDoc>;
  writable: boolean;
}

export interface BuildIslandRecipeInput {
  tw5: TW5Engine;
  composite: CompositeStore;
  writeBagId: string;
  ready: readonly RecipeReadyBinding[];
}

/**
 * Build the sovereign island recipe and return the adaptor plus CRDT stores.
 */
export function buildIslandRecipe(input: BuildIslandRecipeInput): {
  adaptor: IslandAdaptor;
  stores: Array<{ bagId: string; store: AutomergeDocStore }>;
} {
  const { tw5, composite, writeBagId, ready } = input;

  const stores: Array<{ bagId: string; store: AutomergeDocStore }> = [];
  for (const { bagId, handle, writable } of ready) {
    const store = new AutomergeDocStore(handle, bagId);
    composite.addLayer({ bagId, store, writable, defaultWritable: false });
    stores.push({ bagId, store });
  }

  composite.addLayer({
    bagId: BAG_IDS.scratch,
    store: new MemoryTiddlerStore(),
    writable: true,
    defaultWritable: true,
  });
  composite.addLayer({
    bagId: BAG_IDS.projection,
    store: new MemoryTiddlerStore(),
    writable: true,
    defaultWritable: false,
  });

  const adaptor = new IslandAdaptor(tw5, composite, writeBagId);
  composite.addProjection(adaptor);

  for (const { store } of stores) {
    store.emitInitialReplay();
    store.markSyncComplete();
  }

  // Drain the initial replay synchronously so the wiki carries its seed state
  // before behavior.onEa runs. Live patches after this point land on the
  // frame-aligned drain owned by the nalu engine.
  const lares = (tw5.$tw as { lares?: { flushNalu?: (budget?: number) => void } }).lares;
  lares?.flushNalu?.(Number.MAX_SAFE_INTEGER);

  return { adaptor, stores };
}
