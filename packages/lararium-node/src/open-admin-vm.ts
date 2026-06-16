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
import { Worker, MessageChannel }                        from "worker_threads";
import {
  emptyLarDoc,
  type Repo, type AutomergeUrl, type DocHandle, type LarDoc,
  type CompositeStore, type WikiRecipe,
  type AuthVerifierSeam,
  type IslandMsg_Manifest,
  type IslandGrants,
} from "@lararium/mesh";
import {
  openAdminVmCore,
  type AdminVmHost,
  type VerbTable, type SummonsRequest,
} from "@lararium/tw5";
import { waitHandleLocal } from "./repo-helpers.js";
import { nodeWorkerHandle } from "./worker-handle.js";

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

export interface AdminVmResult {
  /** Live admin doc handle on the main Repo — for keyhive and gate-check reads. */
  adminHandle:  DocHandle<LarDoc>;
  /**
   * Single-layer CompositeStore backed by the main Repo's admin handle.
   * Used by AdminEventStore (cap-event writes) and relay receipt writes.
   */
  composite:    CompositeStore;
  /**
   * Resolves when the admin island has sent `ea` — TW5 live, bags synced,
   * drain loop running, VerbDispatcher subscribed to the wiki change surface.
   * `openNodeVessel` MUST await this before emitting `"live"`.
   */
  workerEa:     Promise<void>;
  /**
   * Wire the vessel delegation registry and verifier.
   * MUST be called before any job can be dispatched — call after keyhive boots,
   * before awaiting workerEa. Relay jobs that arrive without a configured registry
   * are rejected with an error result back to the island.
   */
  mountMainVerbs: (registry: VerbTable) => void;
  /**
   * Place a volatile job tiddler in the admin island's TW5 wiki.
   * Delegates to the admin island's internal `placeVerb` via `admin:place-verb` message.
   * The wiki change event fires at the island's next tick; VerbDispatcher dispatches it.
   */
  placeVerb:    (opts: SummonsRequest) => void;
  /**
   * Host-side inbound-peer verifier (path b). Proxies `verify()` to the admin
   * island's keyhive via admin:verify-request/result. The WS AdminAuthGate arms
   * with this once keyhive lives in-island (Stage 5); unused until then.
   */
  authSeam:     AuthVerifierSeam;
  /**
   * Resolve (or mint+delegate) the operator's @personal/@draft binding pair for
   * a recipe fingerprint — runs island-side where keyhive lives. The vessel
   * factory calls this between admin `workerEa` and the primary wiki mount.
   */
  resolveBinding: (
    fingerprint: string,
    recipeTrace: { wikiDocId: string; libraryBagDocIds: readonly string[] },
  ) => Promise<{ personalUrl: string; draftUrl: string }>;
  /**
   * Bind the pool eviction MECHANISM (sovereign-worker): the admin worker owns
   * residency POLICY and commands an evict via admin:evict-request; this routes it to
   * the main-thread pool. The vessel factory calls it after the pool exists.
   */
  onEvictRequest: (fn: (bagId: string) => Promise<void>) => void;
  /**
   * Bind the residency-op MECHANISM (sovereign-worker): the worker commands
   * pin/unpin/register-cold (keyhive-gated); main routes to the BagResidencyManager.
   */
  onResidencyOp: (fn: (op: "pin" | "unpin" | "register-cold", bagId: string, reason?: string) => Promise<void>) => void;
  /**
   * Bind the wiki-alert DELIVERY: the worker named a wiki whose pending change needs a
   * reboot; main places a `system-alert` verb into that wiki's live island (skip if
   * unmounted). Call after the pool exists.
   */
  onWikiAlert:  (fn: (wikiSlug: string, message: string, cause?: string, kind?: string) => void) => void;
  /** Terminate the admin island and release the vessel composite. */
  dispose:      () => void;
}

export async function openAdminVm(opts: AdminVmOptions): Promise<AdminVmResult> {
  const { repo, adminUrl, coreHash, grants, libraryBags, adminAuth, storageDir, workerScriptUrl } = opts;

  // ── Admin doc handle (node strategy: merge-on-late-arrival) ────────────────
  const adminHandle = await waitHandleLocal<LarDoc>(
    repo, adminUrl as AutomergeUrl,
    () => repo.create<LarDoc>(emptyLarDoc()),
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
    newSyncChannel: () => {
      const { port1, port2 } = new MessageChannel();
      return {
        mainPort: port1 as unknown as IslandMsg_Manifest["syncPort"],
        syncPort: port2 as unknown as IslandMsg_Manifest["syncPort"],
      };
    },
    spawnWorker: (url) => nodeWorkerHandle(new Worker(url)),
  };

  const core = openAdminVmCore(host, {
    repo, adminHandle, recipe, grants, coreHash,
    ...(adminAuth ? { adminAuth } : {}),
    ...(storage   ? { storage }   : {}),
    workerScriptUrl: workerScriptUrl ?? DEFAULT_ADMIN_WORKER_URL,
  });

  // authSeam + resolveBinding now ride the shared core's askIsland primitive.
  return {
    adminHandle:    core.adminHandle,
    composite:      core.composite,
    workerEa:       core.workerEa,
    mountMainVerbs: core.mountMainVerbs,
    placeVerb:      core.placeVerb,
    authSeam:       core.authSeam,
    resolveBinding: core.resolveBinding,
    onEvictRequest: core.onEvictRequest,
    onResidencyOp:  core.onResidencyOp,
    onWikiAlert:    core.onWikiAlert,
    dispose:        core.dispose,
  };
}
