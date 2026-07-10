/**
 * island-recipe — one-model assembly for sovereign islands.
 *
 * Canonical assembly:
 *   1) `expandRecipe(recipe)` → ordered slot URIs (top of array = highest priority)
 *   2) addLayer for each slot in cascade order (bottom-up): @oracle floor first, @temp last
 *   3) @temp slot uses a MemoryTiddlerStore; all other slots use AutomergeDocStore
 *   4) IslandAdaptor projection registers
 *   5) initial replay + sync complete + synchronous flushNalu so the wiki carries
 *      its seed state before behavior.onEa runs
 *
 * Node and browser sovereign workers both call this helper so recipe behavior
 * stays one shape across platforms.
 */

import {
  CompositeStore,
  AutomergeDocStore,
  expandRecipe,
  wikiBagUri,
  wikiSlotUri,
  type LarDoc,
  type DocHandle,
  type WikiRecipe,
  type SlotUri,
} from "@lararium/mesh";
import { IslandAdaptor } from "./island-adaptor.js";
import { MemoryTiddlerStore } from "./memory-store.js";
import type { TW5Engine } from "./tw5-vm.js";

export interface RecipeReadyBinding {
  /** Slot URI from the expanded recipe. */
  slot: SlotUri;
  handle: DocHandle<LarDoc>;
}

export interface BuildIslandRecipeInput {
  tw5: TW5Engine;
  composite: CompositeStore;
  recipe: WikiRecipe;
  /** Resolved CRDT handles keyed by slot URI. @temp has no entry. */
  ready: readonly RecipeReadyBinding[];
}

/**
 * Build the sovereign island recipe and return the adaptor.
 *
 * Cascade layering: walks `expandRecipe()` in reverse so the lowest-priority
 * slot (@oracle, the floor) registers first via `addLayer`. CompositeStore's
 * "first wins" read order matches the slot array's top-first orientation.
 */
export function buildIslandRecipe(input: BuildIslandRecipeInput): {
  adaptor: IslandAdaptor;
  stores: Array<{ slot: SlotUri; store: AutomergeDocStore | MemoryTiddlerStore }>;
} {
  const { tw5, composite, recipe, ready } = input;

  const handleBySlot = new Map(ready.map((r) => [r.slot, r.handle]));
  const slots        = expandRecipe(recipe);
  const tempSlot     = wikiSlotUri(recipe.wikiSlug, "temp");
  const workingSlot  = wikiSlotUri(recipe.wikiSlug, "working");
  const stores: Array<{ slot: SlotUri; store: AutomergeDocStore | MemoryTiddlerStore }> = [];

  // Bottom-up addLayer order. Slot at index slots.length-1 (@oracle, the floor) lands first.
  let tempStore: MemoryTiddlerStore | null = null;
  for (let i = slots.length - 1; i >= 0; i--) {
    const slot = slots[i]!;
    if (slot === tempSlot) {
      tempStore = new MemoryTiddlerStore();
      composite.addLayer({ bagId: slot, store: tempStore, writable: true, defaultWritable: true });
      stores.push({ slot, store: tempStore });
      continue;
    }
    const handle = handleBySlot.get(slot);
    if (!handle) continue; // CRDT slot not provided — skip (cold or unmapped)
    const store = new AutomergeDocStore(handle, slot);
    // All CRDT slots accept writes; the in-wiki bag-paths cascade decides routing
    // (lar:///ha.ka.ba/@lararium/config/bag-paths). Ceremony writes pass an explicit `bag` field
    // to override the cascade and write to canonical slots.
    composite.addLayer({ bagId: slot, store, writable: true, defaultWritable: false });
    stores.push({ slot, store });
  }

  // Per-wiki cascade reference — the default `lar:///ha.ka.ba/@lararium/config/bag-paths`
  // reads this value via `{lar:///ha.ka.ba/@lararium/config/current-wiki-bag}` to
  // resolve `lar:` writes to the wiki's live WRITE LAYER. An operator content wiki
  // points at its per-wiki working slot (`wikis/@{slug}/working`, the saved live
  // layer projecting to disk wikis/@{slug}); its bags/@{slug} canon rides below as
  // read-only, published only by a promotion MOVE (wiki-layer-ontology#shore-law).
  // A grant-less mount — @daemon itself, a control plane with no working/canon
  // split — has no working layer, so it falls back to its OWN bag (wikiBagUri(slug)
  // = @daemon, granted), keeping a writable default path instead of throwing.
  // Volatile (lives in the per-wiki temp), set once at boot, shadows any fallback
  // by priority. The bag-paths cascade reads these to route by prefix to the wiki's
  // OWN per-wiki live layers — the address tells the truth (no global slot names).
  if (tempStore) {
    const writeLayer = handleBySlot.has(workingSlot) ? workingSlot : wikiBagUri(recipe.wikiSlug);
    const slug = recipe.wikiSlug;
    const configSeed: Record<string, string> = {
      "lar:///ha.ka.ba/@lararium/config/current-wiki-bag":      writeLayer,
      "lar:///ha.ka.ba/@lararium/config/current-wiki-temp":     wikiSlotUri(slug, "temp"),
      "lar:///ha.ka.ba/@lararium/config/current-wiki-draft":    wikiSlotUri(slug, "draft"),
      "lar:///ha.ka.ba/@lararium/config/current-wiki-personal": wikiSlotUri(slug, "personal"),
    };
    for (const [title, text] of Object.entries(configSeed)) {
      void tempStore.put({ tiddler: { title, text } }, { kind: "canon-hydrate", receipt: "recipe-boot" });
    }
  }

  const adaptor = new IslandAdaptor(tw5, composite, recipe.wikiSlug);
  composite.addProjection(adaptor);

  // Drive existing CRDT state through the projection bus → adaptor → nalu engine.
  for (const { store } of stores) {
    if (store instanceof AutomergeDocStore) {
      store.emitInitialReplay();
      store.markSyncComplete();
    }
  }

  // Synchronously drain so the wiki carries its seed before behavior.onEa runs.
  const lares = (tw5.$tw as { lares?: { flushNalu?: (budget?: number) => void } }).lares;
  lares?.flushNalu?.(Number.MAX_SAFE_INTEGER);

  return { adaptor, stores };
}
