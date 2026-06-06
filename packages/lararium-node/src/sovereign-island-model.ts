/**
 * sovereign-island-model — Node.js host seam for the sovereign island kernel.
 *
 * The lifecycle itself lives in @lararium/tw5 `runSovereignKernel` — ONE flow
 * both vessels compose. This file supplies only the node platform pieces:
 *   - transport : worker_threads parentPort (.postMessage / .on("message"))
 *   - storage   : NodeFSStorageAdapter (driven by manifest IslandStorageConfig)
 *                 or in-memory when no storage config is present
 *   - ready     : omitted — the node worker has no WASM-load handshake
 *
 * Divergence is COMPOSITION (which pieces the seam resolves), not an OO
 * platform interface. See feedback_isomorphism_by_composition.
 *
 * ## VM Pool alignment
 *
 *   Node vessel: Admin island (sovereign island) + Pinned (PrimaryWiki in-process)
 *                + N hot islands (session wikis, LRU-evicted to cold).
 *   Every hot island runs via runSovereignWorker(behavior).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/sovereign-island-model
 */

import { parentPort } from "worker_threads";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import {
  runSovereignKernel,
  type IslandHostSeam,
} from "@lararium/tw5";
import type {
  StorageAdapterInterface,
  IslandMsg_Manifest,
  IslandStorageConfig,
  IslandToVesselMsg,
} from "@lararium/mesh";
import type { IslandBehavior } from "@lararium/tw5";

function _buildStorage(cfg: IslandStorageConfig | undefined): StorageAdapterInterface | undefined {
  if (!cfg || cfg.type === "memory") return undefined;
  if (cfg.type === "nodefs") return new NodeFSStorageAdapter(cfg.dir);
  return undefined;
}

// ── runSovereignWorker — node host seam over the shared kernel ──────────────

export function runSovereignWorker(
  behaviorOrFactory: IslandBehavior | ((manifest: IslandMsg_Manifest) => IslandBehavior),
): void {
  if (!parentPort) {
    throw new Error("[sovereign-island] parentPort is null — must run as a Worker thread.");
  }
  const port = parentPort;

  const host: IslandHostSeam = {
    post:    (msg: IslandToVesselMsg) => port.postMessage(msg),
    listen:  (onMessage) => port.on("message", onMessage),
    storage: (msg) => _buildStorage(msg.storage),
  };

  runSovereignKernel(host, behaviorOrFactory);
}
