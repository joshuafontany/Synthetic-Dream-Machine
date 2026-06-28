/**
 * IslandKernel — isomorphic sovereign island TW5 lifecycle manager.
 *
 * Owns the TW5Engine lifecycle (boot → live → teardown) inside an island runtime realm.
 * Platform-neutral: callers supply a `postFn` that routes the v1 IslandToVesselMsg envelope to
 * the vessel via parentPort (Node) or self.postMessage (browser).
 *
 * ## Island Sovereignty Law — this class's role
 *
 *   This handler owns TW5 only. It does NOT own Automerge WASM, CryptoKeys, or
 *   the Repo-in-island sync port. Those belong to the vessel entry file.
 *
 *   Entry file orchestration pattern (all vessels):
 *     1. `await handler.bootTw5(wikiUri, coreBlob, pluginTiddlers)` — boots TW5, wires verse events,
 *         installs the in-wiki nalu engine ($tw.lares.enqueueNalu)
 *     2. entry file: wire Repo with syncPort, await Repo ready
 *     3. `buildIslandRecipe(...)` — composite layers + IslandAdaptor projection +
 *         initial replay through the wiki's nalu engine
 *     4. `handler.sendEa(wikiUri)` — signal vessel: island is live
 *     5. live CRDT patches: AutomergeDocStore → MemeProvider → IslandAdaptor →
 *         $tw.lares.enqueueNalu → one wiki.transact() per frame
 *     6. on teardown: `handler.teardown()` — dispose TW5
 *
 * ## What this class owns
 *
 *   TW5Engine    — full TiddlyWiki kernel, in-memory.
 *   live handles — verse-event listeners; cancelled in order on teardown.
 *
 * ## What this class does NOT own
 *
 *   I/O binding     — parentPort / self: stays in vessel entrypoints.
 *   Automerge WASM  — never loaded in this thread. Island-side Repo lives in the entry file.
 *   CryptoKey       — stays in vessel (GP-4).
 *   syncPort        — MessagePort for Repo sync; consumed by the entry file.
 *   nalu drain      — lives inside the wiki as a TW5 startup module (nalu-engine).
 *
 * Meme: lar:///ha.ka.ba/@lararium/tw5/island-kernel
 */

import { TW5Engine } from "./tw5-vm.js";
import type {
  IslandToVesselMsg,
  IslandMsg_Event,
} from "@lararium/mesh";
import {
  mkEa,
  mkFault,
  ISLAND_PROTOCOL_VERSION,
} from "@lararium/mesh";

export class IslandKernel {
  private _tw5:        TW5Engine | null = null;
  private _wikiUri:    string | null    = null;
  private readonly _liveHandles         = new Set<{ cancel(): void }>();
  private readonly _post:               (msg: IslandToVesselMsg) => void;

  constructor(postFn: (msg: IslandToVesselMsg) => void) {
    this._post = postFn;
  }

  // ── Island Sovereignty Law — orchestration API ──────────────────────────

  /**
   * Boot the TW5Engine. Does NOT send `ea` — the entry file sends it after the
   * island-side Repo is synced and the recipe (including initial replay through
   * the nalu engine) has assembled.
   *
   * `preloadedTiddlers` carries the plugin layer (sigils, ahu, pranala, nalu-engine).
   * Applied during boot so the in-wiki nalu engine + reaction-router are live from
   * first frame. Passed directly to TW5Engine.boot.
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
        handleVerseEvent: (uri: string, listenable: string, verb?: string, fromUri?: string) => {
          this._post({
            schema_version: ISLAND_PROTOCOL_VERSION,
            type: "event",
            wikiUri: this._wikiUri!,
            listenable,
            payload: {
              uri,
              ...(verb    !== undefined && { verb }),
              ...(fromUri !== undefined && { fromUri }),
            },
          } satisfies IslandMsg_Event);
        },
      }),
    });
  }

  /**
   * Return the live TW5Engine, or null if not yet booted / already torn down.
   * Entry files use this to pass the engine to IslandAdaptor / buildIslandRecipe.
   */
  tw5(): TW5Engine | null {
    return this._tw5;
  }

  /** Send `ea` — call after Repo sync complete and the island recipe has assembled. */
  sendEa(wikiUri: string): void {
    this._post(mkEa(wikiUri));
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
