/**
 * openBrowserDaemonVm — browser host wrapper over the shared daemon-VM core.
 *
 * The lifecycle lives in @lararium/tw5 `openDaemonVmCore` — ONE core both
 * vessels compose. This file supplies the browser platform pieces:
 *   - spawnWorker  : Web Worker (type: module) (.addEventListener / .postMessage)
 *   - newSyncChannel: global MessageChannel
 *   - daemonHandle  : find-or-create strategy
 *
 * The browser vessel does not yet wire the node-ahead capability proxies
 * (authShore, resolveBinding); when it needs them they compose the same way —
 * a second listener on the core's exposed worker handle.
 *
 * Boot ordering: workerEa resolves only after the daemon island sends "ea".
 * openBrowserVessel awaits it before emitting "live".
 *
 * Meme: lar:///ha.ka.ba/lararium/browser/open-browser-daemon-vm
 */

import {
  emptyLarDoc,
  type Repo, type AutomergeUrl, type LarDoc,
  type WikiRecipe,
  type IslandMsg_Manifest,
  type IslandGrants,
} from "@lararium/mesh";
import {
  openDaemonVmCore,
  VerbTable,
  type DaemonVmHost,
  type DaemonVmCore,
} from "@lararium/tw5";
import { browserNewSyncChannel, browserSpawnWorker } from "./worker-handle.js";

export interface BrowserDaemonVmOptions {
  repo:             Repo;
  daemonUrl:         string;
  /** @persona (PersonaGroup veiled-identity) doc URL — resolved alongside the daemon doc. */
  personaUrl:        string;
  /** SHA-256 hex of TW5 core blob. null = pre-CAS path. */
  coreHash:         string | null;
  /** CIDs of the engine's plugin-tiddler blobs — the worker pulls them by CID from OPFS. */
  pluginCids?:      readonly string[];
  /** Canonical one-recipe model for the daemon island. */
  recipe:           WikiRecipe;
  /** Typed structural capabilities (engine doc, @daemon bag, @lares, @catalog access). */
  grants:           IslandGrants;
  /**
   * Operator authn/z material delivered to the daemon island for in-worker
   * keyhive boot (Stage 1) — seed + sentinel hexes + bags to register.
   */
  daemonAuth?:       IslandMsg_Manifest["daemonAuth"];
  /** URL of the compiled browser daemon island Worker script. */
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

export async function openBrowserDaemonVm(
  opts: BrowserDaemonVmOptions,
): Promise<DaemonVmCore> {
  const { repo, daemonUrl, personaUrl, coreHash, pluginCids, recipe, grants, daemonAuth, workerScriptUrl } = opts;

  // ── Daemon doc handle (browser strategy: find-or-create) ────────────────────
  const daemonHandle = await (async () => {
    try {
      // automerge-repo 2.6: find() rejects on unavailable → caught below.
      return await repo.find<LarDoc>(daemonUrl as AutomergeUrl);
    } catch {
      return repo.create<LarDoc>(emptyLarDoc());
    }
  })();
  // ── Persona doc handle (same find-or-create) — the one VM tends both bags ────
  const personaHandle = await (async () => {
    try {
      return await repo.find<LarDoc>(personaUrl as AutomergeUrl);
    } catch {
      return repo.create<LarDoc>(emptyLarDoc());
    }
  })();

  const host: DaemonVmHost = {
    newSyncChannel: browserNewSyncChannel,
    spawnWorker:    browserSpawnWorker,
  };

  // The wrapper IS the shore — host pieces + find-or-create daemonHandle; the lifecycle and the
  // whole result surface (DaemonVmCore) live once in the core. Return it directly, no re-spread.
  return openDaemonVmCore(host, {
    repo, daemonHandle, personaHandle, recipe, grants, coreHash,
    ...(pluginCids?.length ? { pluginCids } : {}),
    ...(daemonAuth ? { daemonAuth } : {}),
    workerScriptUrl,
  });
}
