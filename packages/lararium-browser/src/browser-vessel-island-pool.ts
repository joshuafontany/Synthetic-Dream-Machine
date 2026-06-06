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
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-vessel-island-pool
 */

import {
  VesselIslandPoolCore,
  type Repo,
  type IslandMsg_Event,
} from "@lararium/mesh";
import { browserWorkerHandle } from "./worker-handle.js";

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
}

/** Browser island pool: VesselIslandPoolCore configured with a Web Worker host. */
export class BrowserVesselIslandPool extends VesselIslandPoolCore {
  constructor(opts: BrowserVesselIslandPoolOptions) {
    const workerUrl = opts.workerScriptUrl ?? null;
    super({
      host: {
        spawnWorker: () => {
          if (!workerUrl) {
            throw new Error(
              "[browser-vessel-island-pool] cannot mountWiki — no workerScriptUrl set. " +
              "Pass workerScriptUrl when constructing the pool (requires genesis island for TW5 core bytes).",
            );
          }
          return browserWorkerHandle(new Worker(workerUrl, { type: "module" }));
        },
        newSyncChannel: () => {
          const { port1, port2 } = new MessageChannel();
          return { mainPort: port1, syncPort: port2 };
        },
        storage: () => undefined,
        awaitReady: true,
      },
      mainRepo: opts.mainRepo ?? null,
      ...(opts.onWorkerEvent ? { onWorkerEvent: opts.onWorkerEvent } : {}),
    });
  }
}
