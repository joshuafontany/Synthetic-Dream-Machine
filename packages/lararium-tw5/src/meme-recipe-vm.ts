/**
 * meme-recipe-vm — MemeRecipeVm interface + DirectMemeRecipeVm implementation.
 *
 * DirectMemeRecipeVm — in-process TW5Engine wrapper (no Worker overhead).
 * TW5WorkerProxy     — Worker-backed implementation; lives in tw5-worker-proxy.ts.
 *                      Platform supplies the workerFactory at construction time.
 *
 * Schema: lar:///ha.ka.ba/@lares/api/v0.1/lararium/schema/meme-recipe-vm
 */

import type { LarTiddlerChange } from "@lararium/mesh";
import type { MemeRecipeVm, MemeProvider } from "@lararium/mesh";
export type { MemeRecipeVm } from "@lararium/mesh";
import type { TW5Engine } from "./tw5-vm.js";
import { exportMemeText } from "./meme-write.js";

// ---------------------------------------------------------------------------
// DirectMemeRecipeVm — in-process TW5Engine wrapper
// ---------------------------------------------------------------------------

export class DirectMemeRecipeVm implements MemeRecipeVm {
  private readonly bagByTitle = new Map<string, string>();

  /**
   * @param vm       - The TW5Engine instance this VM slot wraps.
   * @param bagStack - Optional ordered bag IDs (lowest → highest priority).
   *                   When supplied, `onUriChanged` only loads tiddlers from
   *                   these bags into the engine — giving the VM a recipe-scoped
   *                   view of the corpus.  Tombstones always pass through so
   *                   deletions from any bag are honoured.
   *                   When omitted, all tiddlers pass through (full composite view).
   */
  constructor(
    private readonly vm: TW5Engine,
    private readonly bagStack?: readonly string[],
  ) {}

  /** Full TW5Engine instance — available for admin/debug surfaces only. */
  get tw5(): TW5Engine { return this.vm; }

  onUriChanged(change: LarTiddlerChange): void {
    // Tombstones always pass through — honour deletions regardless of bag origin.
    if (!change.record || change.record.meta?.deleted) {
      this.bagByTitle.delete(change.title);
      this.vm.$tw.wiki.deleteTiddler(change.title);
      return;
    }
    // If a bagStack was configured, gate additions/updates to those bags only.
    if (this.bagStack && this.bagStack.length > 0) {
      const bag = change.bag;
      // Skip if the originating bag falls outside the configured stack.
      // Changes without bag context pass through defensively.
      if (bag && !this.bagStack.includes(bag)) return;

      // Priority-correct conflict resolution (TW5 Bags/Recipes law: highest-priority wins).
      // If the wiki already holds a version of this title from a higher-priority bag,
      // the incoming lower-priority update MUST NOT overwrite it.
      // bagStack ordering: index 0 = lowest, length-1 = highest.
      if (bag) {
        const existingBag = this.bagByTitle.get(change.title);
        if (existingBag && existingBag !== bag) {
          const incomingIdx = this.bagStack.indexOf(bag);
          const existingIdx = this.bagStack.indexOf(existingBag);
          // Both bags are in our stack; skip if the existing version wins.
          if (existingIdx > incomingIdx) return;
        }
      }
    }
    if (change.bag) this.bagByTitle.set(change.title, change.bag);
    this.vm.$tw.wiki.addTiddler(new this.vm.$tw.Tiddler(change.record.tiddler));
  }

  onSyncComplete(_islandId: string): void {
    // No-op in direct mode — VM is always live.
    // Worker proxy will flush its pending render queue here.
  }

  async filterTiddlers(expr: string): Promise<string[]> {
    return this.vm.$tw.wiki.filterTiddlers(expr);
  }

  async renderMeme(uri: string): Promise<string | null> {
    try {
      const text = exportMemeText(this.vm, uri);
      return text || null;
    } catch {
      return null;
    }
  }

  dispose(): void {
    this.vm.dispose?.();
  }
}

// ---------------------------------------------------------------------------
// bootMemeRecipeVm — cold-start a VM slot wired to a MemeProvider
// ---------------------------------------------------------------------------

/**
 * Boot a MemeRecipeVm slot and wire it to a MemeProvider.
 *
 * The provider drives all incremental updates (Scale 1–4). No bulk
 * `loadRecords` call — the VM receives deltas as CRDT patches arrive.
 *
 * @param provider   - MemeProvider instance managing the corpus/wiki doc
 * @param factory    - VM factory; pass `() => new DirectMemeRecipeVm(ltw)` or
 *                     a TW5WorkerProxy factory for Worker isolation (Sprint 6).
 * @returns `{ vm, unsubscribe }` — call `unsubscribe()` to detach the VM from the provider.
 */
export async function bootMemeRecipeVm(
  provider: MemeProvider,
  factory:  () => MemeRecipeVm,
): Promise<{ vm: MemeRecipeVm; unsubscribe: () => void }> {
  const vm = factory();
  const unsubscribe = provider.addProjection(vm);
  return { vm, unsubscribe };
}
