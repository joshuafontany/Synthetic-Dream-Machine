/**
 * openBrowserAdminVm — browser host wrapper over the shared admin-VM core.
 *
 * The lifecycle lives in @lararium/tw5 `openAdminVmCore` — ONE core both
 * vessels compose. This file supplies the browser platform pieces:
 *   - spawnWorker  : Web Worker (type: module) (.addEventListener / .postMessage)
 *   - newSyncChannel: global MessageChannel
 *   - adminHandle  : find-or-create strategy
 *
 * The browser vessel does not yet wire the node-ahead capability proxies
 * (authSeam, resolveBinding); when it needs them they compose the same way —
 * a second listener on the core's exposed worker handle.
 *
 * Boot ordering: workerEa resolves only after the admin island sends "ea".
 * openBrowserVessel awaits it before emitting "live".
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/open-browser-admin-vm
 */

import {
  emptyLarDoc,
  type Repo, type AutomergeUrl, type LarDoc,
  type WikiRecipe,
  type IslandMsg_Manifest,
  type IslandGrants,
} from "@lararium/mesh";
import {
  openAdminVmCore,
  VerbTable,
  type AdminVmHost,
  type AdminVmCore,
} from "@lararium/tw5";
import { browserNewSyncChannel, browserSpawnWorker } from "./worker-handle.js";

export interface BrowserAdminVmOptions {
  repo:             Repo;
  adminUrl:         string;
  /** SHA-256 hex of TW5 core blob. null = pre-CAS path. */
  coreHash:         string | null;
  /** CIDs of the engine's plugin-tiddler blobs — the worker pulls them by CID from OPFS. */
  pluginCids?:      readonly string[];
  /** Canonical one-recipe model for the admin island. */
  recipe:           WikiRecipe;
  /** Typed structural capabilities (engine doc, @admin bag, @lares, @catalog access). */
  grants:           IslandGrants;
  /**
   * Operator authn/z material delivered to the admin island for in-worker
   * keyhive boot (Stage 1) — seed + sentinel hexes + bags to register.
   */
  adminAuth?:       IslandMsg_Manifest["adminAuth"];
  /** URL of the compiled browser admin island Worker script. */
  workerScriptUrl:  URL;
}

export { VerbTable };
export type { VerbTable as BrowserVerbTable };
export type { VerbReactor } from "@lararium/tw5";

export interface BrowserVerbPlacementRequest {
  verb:         string;
  args:         Record<string, unknown>;
  requestedBy?: string;
  requestId?:   string;
  fromUri?:     string;
  listenable?:  string;
}

export async function openBrowserAdminVm(
  opts: BrowserAdminVmOptions,
): Promise<AdminVmCore> {
  const { repo, adminUrl, coreHash, pluginCids, recipe, grants, adminAuth, workerScriptUrl } = opts;

  // ── Admin doc handle (browser strategy: find-or-create) ────────────────────
  const adminHandle = await (async () => {
    try {
      // automerge-repo 2.6: find() rejects on unavailable → caught below.
      return await repo.find<LarDoc>(adminUrl as AutomergeUrl);
    } catch {
      return repo.create<LarDoc>(emptyLarDoc());
    }
  })();

  const host: AdminVmHost = {
    newSyncChannel: browserNewSyncChannel,
    spawnWorker:    browserSpawnWorker,
  };

  // The wrapper IS the seam — host pieces + find-or-create adminHandle; the lifecycle and the
  // whole result surface (AdminVmCore) live once in the core. Return it directly, no re-spread.
  return openAdminVmCore(host, {
    repo, adminHandle, recipe, grants, coreHash,
    ...(pluginCids?.length ? { pluginCids } : {}),
    ...(adminAuth ? { adminAuth } : {}),
    workerScriptUrl,
  });
}
