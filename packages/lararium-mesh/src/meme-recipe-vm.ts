/**
 * MemeRecipeVm — isomorphic interface for a TW5 wiki engine slot in VmPool.
 *
 * Implementations:
 *   DirectMemeRecipeVm  — in-process TW5Engine wrapper (lives in @lararium/tw5)
 *   TW5WorkerProxy      — Worker-backed implementation (lives in @lararium/tw5)
 *
 * Schema: lar:///ha.ka.ba/@lares/api/v0.1/lararium/schema/meme-recipe-vm
 */

import type { MemeProjection, MemeProvider } from "./meme-provider.js";

export interface MemeRecipeVm extends MemeProjection {
  /** VM slot must handle island sync-complete (Scale 4). */
  onSyncComplete(islandId: string): void;
  /** Run a TW5 wikitext filter expression, return matching titles. */
  filterTiddlers(expr: string): Promise<string[]>;
  /**
   * Render a meme URI to its disk format (memetic-wikitext export).
   * Returns null if the URI is not present or is deleted.
   */
  renderMeme(uri: string): Promise<string | null>;
  /** Release resources. Called by VmPool.release(). */
  dispose(): void;
}

/**
 * Boot a MemeRecipeVm slot and wire it to a MemeProvider.
 *
 * @param provider - MemeProvider managing the corpus/wiki doc
 * @param factory  - VM factory function
 * @returns `{ vm, unsubscribe }` — call `unsubscribe()` to detach from provider.
 */
export async function bootMemeRecipeVm(
  provider: MemeProvider,
  factory:  () => MemeRecipeVm,
): Promise<{ vm: MemeRecipeVm; unsubscribe: () => void }> {
  const vm = factory();
  const unsubscribe = provider.addProjection(vm);
  return { vm, unsubscribe };
}
