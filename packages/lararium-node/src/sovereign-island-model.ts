/**
 * sovereign-island-model — Node.js host seam for the sovereign island kernel.
 *
 * The lifecycle itself lives in @lararium/tw5 `runSovereignKernel` — ONE flow
 * both vessels compose. This file supplies only the node platform pieces:
 *   - transport : worker_threads parentPort (.postMessage / .on("message"))
 *   - storage   : DurableNodeFSStorageAdapter (crash-atomic; driven by manifest IslandStorageConfig)
 *                 or in-memory when no storage config is present
 *   - ready     : omitted — the node worker has no WASM-load handshake
 *
 * Divergence is COMPOSITION (which pieces the seam resolves), not an OO
 * platform interface. See feedback_isomorphism_by_composition.
 *
 * ## VM Pool alignment
 *
 *   Node vessel: Daemon island (sovereign island) + Pinned (PrimaryWiki in-process)
 *                + N hot islands (session wikis, LRU-evicted to cold).
 *   Every hot island runs via runSovereignWorker(behavior).
 *
 * Meme: lar:///ha.ka.ba/lararium/node/sovereign-island-model
 */

import { parentPort } from "worker_threads";
import { join } from "node:path";
import { DurableNodeFSStorageAdapter } from "./durable-storage-adapter.js";
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
import { casDirFromIslandStorageDir, readCasBlobFromFs } from "./node-cas.js";

function _buildStorage(cfg: IslandStorageConfig | undefined): StorageAdapterInterface | undefined {
  if (!cfg || cfg.type === "memory") return undefined;
  if (cfg.type === "nodefs") return new DurableNodeFSStorageAdapter(cfg.dir);
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

  // The fs CAS dir — captured from the manifest storage dir when the kernel builds the repo
  // (host.storage runs before resolveByCid). Engine + plugin bytes ride this local CID plane,
  // pulled by content-address off the sync port — the nodefs face of the worker CAS. A
  // memory-storage island carries no CAS dir; resolveByCid yields null and the kernel faults
  // (the CID plane is required).
  let casDir: string | null = null;

  // The CORPUS CAS dir — where the operator gesture stages oversized carrier bodies (whole
  // books) that ride LOAD/INGEST verbs BY REFERENCE, never inline. Read from the inherited
  // env (LAR_CAS, else <LAR_ROOT>/cas) so the fs-less worker resolves the SAME dir the CLI
  // stager wrote — process-shared filesystem, no IPC. The `wake` gesture exports LAR_CAS =
  // larCasDir() when it spawns the daemon, so this stays deterministic across the two processes.
  // Distinct from the runtime `casDir` (engine/plugin bytes under <storage>/cas, wiped on reset):
  // the corpus CAS is repo-relative and persistent.
  const corpusCasDir: string | null =
    process.env["LAR_CAS"] ?? (process.env["LAR_ROOT"] ? join(process.env["LAR_ROOT"], "cas") : null);

  const host: IslandHostSeam = {
    post:    (msg: IslandToVesselMsg) => port.postMessage(msg),
    listen:  (onMessage) => port.on("message", onMessage),
    storage: (msg) => {
      if (msg.storage?.type === "nodefs") casDir = casDirFromIslandStorageDir(msg.storage.dir);
      return _buildStorage(msg.storage);
    },
    // Resolve by content-address: the runtime CID plane first (engine/plugin bytes), then the
    // corpus CAS (staged carrier bodies). The caller re-verifies cid==hash(bytes), so a two-dir
    // lookup never widens trust.
    resolveByCid: async (cid) => {
      const runtime = casDir ? readCasBlobFromFs(cid, casDir) : null;
      if (runtime) return runtime;
      return corpusCasDir ? readCasBlobFromFs(cid, corpusCasDir) : null;
    },
  };

  runSovereignKernel(host, behaviorOrFactory);
}
