/**
 * openDaemonVm — node host wrapper over the shared admin-VM core.
 *
 * The lifecycle lives in @lararium/tw5 `openDaemonVmCore` — ONE core both
 * vessels compose. This file supplies the node platform pieces:
 *   - spawnWorker  : worker_threads Worker (.on / .postMessage)
 *   - newSyncChannel: worker_threads MessageChannel
 *   - daemonHandle  : waitHandleLocal (merge-on-late-arrival strategy)
 *   - recipe       : built here from libraryBags; storage = nodefs dir
 *
 * Node-ahead capability proxies (authSeam verify-proxy, resolveBinding) compose
 * on top via a second listener on the core's exposed worker handle — they are
 * node-only surface the browser has not built yet, not duplication.
 *
 * Boot ordering: `workerEa` resolves only after the admin island sends `ea`.
 * `openNodeVessel` awaits it before emitting `"live"`.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/open-daemon-vm
 */

import { join }                                          from "path";
import {
  type Repo, type AutomergeUrl, type LarDoc,
  type WikiRecipe,
  type IslandMsg_Manifest,
  type IslandGrants,
} from "@lararium/mesh";
import {
  openDaemonVmCore,
  type DaemonVmHost,
  type DaemonVmCore,
} from "@lararium/tw5";
import { resolveBootDoc } from "./repo-helpers.js";
import { nodeNewSyncChannel, nodeSpawnWorker } from "./worker-handle.js";

const DEFAULT_ADMIN_WORKER_URL = new URL("./node-daemon-island.js", import.meta.url);

export interface DaemonVmOptions {
  repo:              Repo;
  daemonUrl:          string;
  /**
   * SHA-256 hex of the TW5 core blob (`LarDoc.blobs[ENGINE_CORE_ID]`).
   * null = pre-CAS. The admin island reads bytes from the @lararium CRDT doc.
   */
  coreHash:          string | null;
  /** Typed structural capabilities: @lararium engine, @daemon bag, @lares,
   *  @catalog access. Library bags resolve island-side from @catalog. */
  grants:            IslandGrants;
  /** Optional canon bag URIs for the admin recipe. Empty by default. */
  libraryBags?:        readonly string[];
  /**
   * Operator authn/z material delivered to the admin island so it boots keyhive
   * in-worker (Stage 1). Seed + sentinel hexes + the bags to register. The seed
   * crossing the worker boundary is the deliberate custody boundary.
   */
  daemonAuth?:        IslandMsg_Manifest["daemonAuth"];
  /** Optional storage dir for the admin island's NodeFS Repo. */
  storageDir?:       string;
  /** Override the admin island script URL (tests). */
  workerScriptUrl?:  URL;
}

export async function openDaemonVm(opts: DaemonVmOptions): Promise<DaemonVmCore> {
  const { repo, daemonUrl, coreHash, grants, libraryBags, daemonAuth, storageDir, workerScriptUrl } = opts;

  // ── Daemon doc handle (node strategy: merge-on-late-arrival) ────────────────
  const daemonHandle = await resolveBootDoc<LarDoc>(
    repo, daemonUrl as AutomergeUrl,
    { tideline: "hearth-private", label: "@daemon" },
  );

  // The admin holds NO standing system-bag mount: it reaches a deep target bag
  // by ACCESS per residency action (ephemeral mount, released after — the
  // edit/action split, wiki-layer-ontology#write-law; the interim write-facet
  // mount retired 2026-06-16). The admin's own composite stays its recipe alone.
  const recipe: WikiRecipe = {
    wikiSlug: "daemon",
    ...(libraryBags?.length ? { libraryBags } : {}),
  };
  const storage = storageDir
    ? { type: "nodefs" as const, dir: join(storageDir, "daemon") }
    : undefined;

  const host: DaemonVmHost = {
    newSyncChannel: nodeNewSyncChannel,
    spawnWorker:    nodeSpawnWorker,
  };

  // The wrapper IS the seam — host pieces + recipe/storage + merge-on-arrival daemonHandle;
  // the lifecycle and the whole result surface (DaemonVmCore) live once in the core.
  return openDaemonVmCore(host, {
    repo, daemonHandle, recipe, grants, coreHash,
    ...(daemonAuth ? { daemonAuth } : {}),
    ...(storage   ? { storage }   : {}),
    workerScriptUrl: workerScriptUrl ?? DEFAULT_ADMIN_WORKER_URL,
  });
}
