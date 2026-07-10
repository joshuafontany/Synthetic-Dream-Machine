/**
 * BrowserVesselIslandPool — browser host construction over VesselIslandPoolCore.
 *
 * The pool logic (residency, mount/unmount handshakes, placeWikiVerb, event
 * routing) lives once in @lararium/mesh `VesselIslandPoolCore`. This file
 * supplies only the browser platform host: Web Worker spawn, a global
 * MessageChannel, and the ES-module worker's "ready" (WASM-load) handshake.
 * Browser inherits the residency model by subtraction; `pinned` is honored the
 * moment a finite hotCap creates eviction pressure.
 *
 * No storage seam: each browser island owns its IndexedDB partition keyed by
 * its wiki URI (set inside the island kernel), so the host returns undefined.
 *
 * Meme: lar:///ha.ka.ba/lararium/browser/browser-vessel-island-pool
 */

import {
  VesselIslandPoolCore,
  type Repo,
  type IslandMsg_Event,
} from "@lararium/mesh";
import { browserNewSyncChannel, browserSpawnWorker } from "./worker-handle.js";

export interface BrowserVesselIslandPoolOptions {
  /**
   * URL of the compiled browser-wiki-worker entry script. Optional at
   * construction; required before mountWiki (a placeholder pool may predate the
   * genesis island that supplies TW5 core bytes).
   */
  workerScriptUrl?: URL;
  /** Vessel Automerge Repo — each island's mainPort wires to it for CRDT sync. */
  mainRepo?: Repo;
  /** Called when an island emits a verse-event reaction. */
  onWorkerEvent?: (id: string, msg: IslandMsg_Event) => void;
  /** The engine's plugin-tiddler CIDs — every wiki island pulls them by CID from the local
   *  CAS (the breath path), the same set the daemon island gets. Constant per genesis. */
  pluginCids?: readonly string[];
}

/** Browser island pool: VesselIslandPoolCore configured with a Web Worker host. */
export class BrowserVesselIslandPool extends VesselIslandPoolCore {
  constructor(opts: BrowserVesselIslandPoolOptions) {
    const workerUrl = opts.workerScriptUrl ?? null;
    super({
      ...(opts.pluginCids?.length ? { pluginCids: opts.pluginCids } : {}),
      host: {
        spawnWorker: () => {
          if (!workerUrl) {
            throw new Error(
              "[browser-vessel-island-pool] cannot mountWiki — no workerScriptUrl set. " +
              "Pass workerScriptUrl when constructing the pool (requires genesis island for TW5 core bytes).",
            );
          }
          return browserSpawnWorker(workerUrl);
        },
        newSyncChannel: browserNewSyncChannel,
        storage: () => undefined,
        awaitReady: true,
      },
      mainRepo: opts.mainRepo ?? null,
      ...(opts.onWorkerEvent ? { onWorkerEvent: opts.onWorkerEvent } : {}),
    });
  }
}
