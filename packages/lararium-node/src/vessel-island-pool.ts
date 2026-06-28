/**
 * VesselIslandPool — node host construction over the shared VesselIslandPoolCore.
 *
 * The pool logic (residency wela/anu + pin, LRU, placeWikiVerb, diskMirror,
 * handshakes) lives once in @lararium/mesh `VesselIslandPoolCore`. This file
 * supplies only the node platform host: worker_threads worker spawn, a
 * worker_threads MessageChannel, and per-wiki NodeFS storage. The TW5Engine
 * lives inside the Worker thread; the vessel holds no engine reference
 * (no-VM-on-main-thread).
 *
 * Meme: lar:///ha.ka.ba/@lararium/node/vessel-island-pool
 */

import { join } from "path";
import {
  VesselIslandPoolCore,
  type Repo,
  type IslandMsg_Event,
  type IslandStorageConfig,
} from "@lararium/mesh";
import { nodeNewSyncChannel, nodeSpawnWorker } from "./worker-handle.js";

const HOT_CAP = 4;
const DEFAULT_WORKER_URL = new URL("./node-wiki-island.js", import.meta.url);

export interface VesselIslandPoolOptions {
  /** Compiled island entry script. Defaults to node-wiki-island.js alongside this module. */
  workerScriptUrl?: URL;
  /** Called when an island emits a IslandMsg_Event (RE reaction). */
  onWorkerEvent?: (wikiId: string, msg: IslandMsg_Event) => void;
  /** Called when the island's ea declaration lands — the mailbox drain rides the breath. */
  onEa?: (wikiId: string) => void;
  /** Vessel Automerge Repo — each island's mainPort wires to it for CRDT sync. */
  mainRepo?: Repo;
  /** Root dir for island-owned NodeFS storage partitions; absent = memory-only. */
  storageRoot?: string;
  /** The engine's plugin-tiddler CIDs — every wiki island pulls them by CID from the local CAS. */
  pluginCids?: readonly string[];
  /** Held disk-write capability: canon bag → mirror configs this pool MAY project. */
  diskMirrorGrant?: readonly { bagId: string; mirrorRoot: string; scope: string; perWikiSlug?: boolean; selfCanon?: boolean }[];
  /** Override the mount silence budget in ms (tests). */
  mountSilenceMs?: number;
  /** Override the mount progress-stall budget in ms (default 3x silence). */
  mountStallMs?: number;
  /** Mount failures tolerated per wiki inside the window before the cap trips. */
  maxMountFailures?: number;
  /** The intensity window in ms (OTP MaxR/MaxT discipline). */
  mountFailureWindowMs?: number;
}

/** Node island pool: VesselIslandPoolCore configured with a worker_threads host. */
export class VesselIslandPool extends VesselIslandPoolCore {
  constructor(options: VesselIslandPoolOptions) {
    const workerUrl   = options.workerScriptUrl ?? DEFAULT_WORKER_URL;
    const storageRoot = options.storageRoot ?? null;
    super({
      host: {
        spawnWorker: () => nodeSpawnWorker(workerUrl),
        newSyncChannel: nodeNewSyncChannel,
        storage: (wikiId): IslandStorageConfig | undefined =>
          storageRoot ? { type: "nodefs", dir: join(storageRoot, _sanitizeWikiId(wikiId)) } : undefined,
      },
      mainRepo: options.mainRepo ?? null,
      diskMirrorGrant: options.diskMirrorGrant ?? [],
      hotCap: HOT_CAP,
      ...(options.pluginCids?.length ? { pluginCids: options.pluginCids } : {}),
      ...(options.onWorkerEvent ? { onWorkerEvent: options.onWorkerEvent } : {}),
      ...(options.onEa ? { onEa: options.onEa } : {}),
      ...(options.mountSilenceMs       !== undefined ? { mountSilenceMs:       options.mountSilenceMs }       : {}),
      ...(options.mountStallMs         !== undefined ? { mountStallMs:         options.mountStallMs }         : {}),
      ...(options.maxMountFailures     !== undefined ? { maxMountFailures:     options.maxMountFailures }     : {}),
      ...(options.mountFailureWindowMs !== undefined ? { mountFailureWindowMs: options.mountFailureWindowMs } : {}),
    });
  }
}

/** Convert a lar: URI to a safe filesystem path component. */
function _sanitizeWikiId(wikiId: string): string {
  return wikiId.replace(/^lar:\/\/\//, "").replace(/[^a-zA-Z0-9@._-]/g, "_");
}
