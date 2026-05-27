/**
 * IslandKernel — isomorphic sovereign island TW5 lifecycle manager.
 *
 * Owns the TW5Engine lifecycle (boot → live → teardown) inside a Worker realm.
 * Platform-neutral: callers supply a `postFn` that routes WorkerToMainMsg to
 * the main thread via parentPort (Node) or self.postMessage (browser).
 *
 * ## Worker Sovereignty Law — this class's role
 *
 *   This handler owns TW5 only. It does NOT own Automerge WASM, CryptoKeys, or
 *   the Repo-in-Worker sync port. Those belong to the vessel entry file.
 *
 *   Entry file orchestration pattern (all vessels):
 *     1. `await handler.bootTw5(wikiUri, coreBlob)`  — boots TW5, wires verse events
 *     2. entry file: wire Repo with syncPort, await Repo ready, extract initial tiddlers
 *     3. `handler.applyDelta(wikiUri, initialTiddlers, [])`  — seed TW5 from CRDT doc
 *     4. `handler.sendEa(wikiUri)`  — signal main thread: island is live
 *     5. on Repo change: `handler.applyDelta(wikiUri, added, deleted)` at rAF boundary
 *     6. on teardown: `handler.teardown()`  — dispose TW5
 *
 * ## What this class owns
 *
 *   TW5Engine   — full TiddlyWiki kernel, in-memory.
 *   live handles — verse-event listeners; cancelled in order on teardown.
 *
 * ## What this class does NOT own
 *
 *   I/O binding     — parentPort / self: stays in vessel entrypoints.
 *   Automerge WASM  — never loaded in this thread. Worker-side Repo lives in the entry file.
 *   CryptoKey       — stays in main thread (GP-4).
 *   syncPort        — MessagePort for Repo sync; consumed by the entry file.
 *   IslandAdaptor   — no CompositeStore in Worker; CRDT feed comes from the Worker-side Repo.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/island-kernel
 */

import { TW5Engine } from "./tw5-vm.js";
import type {
  WorkerToMainMsg,
  WorkerMsg_Event,
} from "@lararium/mesh";
import {
  mkEa,
  mkChangesetAck,
  mkFault,
  WORKER_PROTOCOL_VERSION,
} from "@lararium/mesh";

export class IslandKernel {
  private _tw5:        TW5Engine | null = null;
  private _wikiUri:    string | null    = null;
  private readonly _liveHandles         = new Set<{ cancel(): void }>();
  private readonly _post:               (msg: WorkerToMainMsg) => void;

  constructor(postFn: (msg: WorkerToMainMsg) => void) {
    this._post = postFn;
  }

  // ── Worker Sovereignty Law — orchestration API ──────────────────────────

  /**
   * Boot the TW5Engine. Does NOT send `ea` — the entry file sends it after the
   * Worker-side Repo is synced and initial tiddlers applied.
   *
   * `preloadedTiddlers` carries the plugin layer (sigils, ahu, pranala, etc.).
   * These are prerequisite — applied during boot so the CRDT truth layer can use
   * them from first frame. An island booted without plugin tiddlers fails ea
   * condition 3 (own truth) silently. Passed directly to TW5Engine.boot.
   *
   * Throws (and sends fault) if `coreBlob` carries zero bytes.
   */
  async bootTw5(
    wikiUri:          string,
    coreBlob:         Uint8Array,
    preloadedTiddlers?: readonly Record<string, unknown>[],
  ): Promise<void> {
    this._wikiUri = wikiUri;
    if (coreBlob.byteLength === 0) {
      this._postFault(wikiUri, "manifest rejected: coreBlob carries zero bytes — authority cannot boot without a TW5 engine");
      throw new Error("zero-byte coreBlob");
    }
    this._tw5 = new TW5Engine();
    const tiddlers = preloadedTiddlers?.length ? (preloadedTiddlers as Array<Record<string, unknown>>) : undefined;
    await this._tw5.boot(coreBlob, tiddlers);

    this._liveHandles.add({
      cancel: this._tw5.onVerseEvent({
        handleVerseEvent: (uri: string, listenable: string) => {
          this._post({
            schema_version: WORKER_PROTOCOL_VERSION,
            type: "event",
            wikiUri: this._wikiUri!,
            listenable,
            payload: { uri },
          } satisfies WorkerMsg_Event);
        },
      }),
    });
  }

  /**
   * Apply a tiddler add/delete delta to TW5 (from Worker-side Repo change events).
   *
   * Entry files call this at rAF / setInterval drain — not on every incoming message.
   * The Worker owns the timing; this method is synchronous and cheap.
   */
  applyDelta(
    wikiUri: string,
    added:   readonly Record<string, unknown>[],
    deleted: readonly string[],
    _bagId?: string,
  ): void {
    if (!this._tw5) return;
    const wiki    = this._tw5.$tw.wiki;
    const Tiddler = this._tw5.$tw.Tiddler;
    for (const fields of added) {
      const title = fields["title"];
      if (typeof title !== "string") continue;
      wiki.addTiddler(new Tiddler(fields as Record<string, unknown>));
    }
    for (const title of deleted) {
      wiki.deleteTiddler(title);
    }
    void wikiUri; // wikiUri reserved for future multi-wiki Worker support
  }

  /**
   * Return the live TW5Engine, or null if not yet booted / already torn down.
   * Admin Worker entry files use this to pass the engine to IslandAdaptor and JobDispatcher.
   * Wiki Workers should not need direct engine access — use applyDelta + sendEa instead.
   */
  tw5(): TW5Engine | null {
    return this._tw5;
  }

  /** Send `promote:ack` — call after Repo sync complete and initial tiddlers applied. */
  sendEa(wikiUri: string): void {
    this._post(mkEa(wikiUri));
  }

  /**
   * Send `changeset:ack` — frame-completion signal (Worker Sovereignty Law §4).
   * Entry files call this at the END of each rAF / setInterval drain cycle.
   * `frameId` is a Worker-generated UUID; it does NOT correlate with a main-thread batch.
   */
  sendChangesetAck(wikiUri: string, frameId: string): void {
    this._post(mkChangesetAck(wikiUri, frameId));
  }

  /**
   * Tear down the TW5Engine and all live handles.
   */
  teardown(): void {
    for (const h of this._liveHandles) h.cancel();
    this._liveHandles.clear();
    this._tw5?.dispose();
    this._tw5 = null;
  }

  private _postFault(uri: string, err: unknown): void {
    this._post(mkFault(uri, String(err)));
  }
}
