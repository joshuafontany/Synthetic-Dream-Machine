/**
 * IslandAccumulator — frame-aligned CRDT patch buffer for the Verse mesh.
 *
 * Sits between MemeProvider (Automerge patch fan-out) and the TW5 wiki.
 * Buffers live crdt-remote changes that arrive after the initial sync replay
 * completes; the render loop (rAF browser / setInterval Node) drains the
 * queue into one wiki.transact() per frame.
 *
 * Responsibility split:
 *   IslandAdaptor — initial replay buffering + onSyncComplete batch flush
 *                   + non-CRDT immediate apply + outbound saveTiddler/deleteTiddler (async, no callbacks)
 *   IslandAccumulator — live crdt-remote buffering + frame-aligned drain
 *
 * Platform-agnostic: no requestAnimationFrame import. The render loop in
 * startRenderLoop() from tw5-camera.ts (browser) or a setInterval caller (Node)
 * drives flushAll() on IslandAdaptor.
 *
 * Spec: lar:///ha.ka.ba/@lares/api/v0.1/lararium/island-accumulator
 */

import type { LarTiddlerChange } from "./tiddler-store.js";
import type { MemeProjection } from "./meme-provider.js";

export class IslandAccumulator implements MemeProjection {
  private readonly _queue: LarTiddlerChange[] = [];
  private _syncReady = false;

  /**
   * MemeProjection.onSyncComplete — marks the initial replay as settled.
   * Only after this fires does the accumulator start buffering live changes.
   * Before it fires, IslandAdaptor owns the initial-replay buffer + batch flush.
   */
  onSyncComplete(_islandId = "automerge"): void {
    this._syncReady = true;
  }

  /**
   * MemeProjection.onUriChanged — buffers live crdt-remote changes.
   *
   * Skips:
   *   - changes that arrive before initial sync completes (IslandAdaptor handles those)
   *   - non-CRDT origins (canon-hydrate, lares-job, tw-local — IslandAdaptor
   *     applies those immediately via _applyChange)
   */
  onUriChanged(change: LarTiddlerChange): void {
    if (!this._syncReady) return;
    if (change.origin.kind !== "crdt-remote") return;
    this._queue.push(change);
  }

  /** Drain up to `budget` changes from the queue. Caller applies the returned batch. */
  drain(budget = 200): LarTiddlerChange[] {
    if (this._queue.length === 0) return [];
    return this._queue.splice(0, budget);
  }

  /** Number of changes waiting in the queue. */
  get pending(): number {
    return this._queue.length;
  }

  /** True after the initial sync replay settled — accumulator now accepts live changes. */
  get syncReady(): boolean {
    return this._syncReady;
  }
}
