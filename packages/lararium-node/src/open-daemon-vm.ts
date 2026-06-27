/**
 * openAdminVm — node host wrapper over the shared admin-VM core.
 *
 * The lifecycle lives in @lararium/tw5 `openAdminVmCore` — ONE core both
 * vessels compose. This file supplies the node platform pieces:
 *   - spawnWorker  : worker_threads Worker (.on / .postMessage)
 *   - newSyncChannel: worker_threads MessageChannel
 *   - adminHandle  : waitHandleLocal (merge-on-late-arrival strategy)
 *   - recipe       : built here from libraryBags; storage = nodefs dir
 *
 * Node-ahead capability proxies (authSeam verify-proxy, resolveBinding) compose
 * on top via a second listener on the core's exposed worker handle — they are
 * node-only surface the browser has not built yet, not duplication.
 *
 * Boot ordering: `workerEa` resolves only after the admin island sends `ea`.
 * `openNodeVessel` awaits it before emitting `"live"`.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/open-admin-vm
 */

import { join }                                          from "path";
import {
  type Repo, type AutomergeUrl, type LarDoc,
  type WikiRecipe,
  type IslandMsg_Manifest,
  type IslandGrants,
} from "@lararium/mesh";
import {
  openAdminVmCore,
  type AdminVmHost,
  type AdminVmCore,
} from "@lararium/tw5";
import { resolveBootDoc } from "./repo-helpers.js";
import { nodeNewSyncChannel, nodeSpawnWorker } from "./worker-handle.js";

const DEFAULT_ADMIN_WORKER_URL = new URL("./node-admin-island.js", import.meta.url);

export interface AdminVmOptions {
  repo:              Repo;
  adminUrl:          string;
  /**
   * SHA-256 hex of the TW5 core blob (`LarDoc.blobs[ENGINE_CORE_ID]`).
   * null = pre-CAS. The admin island reads bytes from the @lararium CRDT doc.
   */
  coreHash:          string | null;
  /** Typed structural capabilities: @lararium engine, @admin bag, @lares,
   *  @catalog access. Library bags resolve island-side from @catalog. */
  grants:            IslandGrants;
  /** Optional canon bag URIs for the admin recipe. Empty by default. */
  libraryBags?:        readonly string[];
  /**
   * Operator authn/z material delivered to the admin island so it boots keyhive
   * in-worker (Stage 1). Seed + sentinel hexes + the bags to register. The seed
   * crossing the worker boundary is the deliberate custody boundary.
   */
  adminAuth?:        IslandMsg_Manifest["adminAuth"];
  /** Optional storage dir for the admin island's NodeFS Repo. */
  storageDir?:       string;
  /** Override the admin island script URL (tests). */
  workerScriptUrl?:  URL;
}

export async function openAdminVm(opts: AdminVmOptions): Promise<AdminVmCore> {
  const { repo, adminUrl, coreHash, grants, libraryBags, adminAuth, storageDir, workerScriptUrl } = opts;

  // ── Admin doc handle (node strategy: merge-on-late-arrival) ────────────────
  const adminHandle = await resolveBootDoc<LarDoc>(
    repo, adminUrl as AutomergeUrl,
    { tideline: "hearth-private", label: "@admin" },
  );

  // The admin holds NO standing system-bag mount: it reaches a deep target bag
  // by ACCESS per residency action (ephemeral mount, released after — the
  // edit/action split, wiki-layer-ontology#write-law; the interim write-facet
  // mount retired 2026-06-16). The admin's own composite stays its recipe alone.
  const recipe: WikiRecipe = {
    wikiSlug: "admin",
    ...(libraryBags?.length ? { libraryBags } : {}),
  };
  const storage = storageDir
    ? { type: "nodefs" as const, dir: join(storageDir, "admin") }
    : undefined;

  const host: AdminVmHost = {
    newSyncChannel: nodeNewSyncChannel,
    spawnWorker:    nodeSpawnWorker,
  };

  // The wrapper IS the seam — host pieces + recipe/storage + merge-on-arrival adminHandle;
  // the lifecycle and the whole result surface (AdminVmCore) live once in the core.
  return openAdminVmCore(host, {
    repo, adminHandle, recipe, grants, coreHash,
    ...(adminAuth ? { adminAuth } : {}),
    ...(storage   ? { storage }   : {}),
    workerScriptUrl: workerScriptUrl ?? DEFAULT_ADMIN_WORKER_URL,
  });
}
