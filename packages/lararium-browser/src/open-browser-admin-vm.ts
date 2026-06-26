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
  type Repo, type AutomergeUrl, type DocHandle, type LarDoc,
  type CompositeStore, type WikiRecipe,
  type AuthVerifierSeam,
  type IslandMsg_Manifest,
  type IslandGrants,
} from "@lararium/mesh";
import {
  openAdminVmCore,
  VerbTable,
  type AdminVmHost,
} from "@lararium/tw5";
import { browserWorkerHandle } from "./worker-handle.js";

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

export interface BrowserAdminVmResult {
  /** Live admin doc handle — for keyhive gate reads and cap-event writes. */
  adminHandle:    DocHandle<LarDoc>;
  /** Single-layer CompositeStore backed by adminHandle. */
  composite:      CompositeStore;
  /**
   * Resolves when the admin island sends "ea" — TW5 live, bags synced,
   * drain loop running, VerbDispatcher subscribed. Vessel awaits this before "live".
   */
  workerEa:       Promise<void>;
  /**
   * Wire the vessel delegation registry and verifier.
   * Call after keyhive boots, before awaiting workerEa.
   * Jobs arriving before registry is set are rejected.
   */
  mountMainVerbs: (registry: VerbTable) => void;
  /** Place a volatile job in the admin island's TW5 wiki. */
  placeVerb:       (opts: BrowserVerbPlacementRequest) => void;
  /**
   * Host-side inbound-peer verifier (path b) — proxies verify() to the island's
   * keyhive. Symmetric with the node vessel; the browser island already answers.
   */
  authSeam:       AuthVerifierSeam;
  /**
   * Resolve (or mint+delegate) the operator's @personal/@draft binding pair for
   * a recipe fingerprint — runs island-side where keyhive lives.
   */
  resolveBinding: (
    fingerprint: string,
    recipeTrace: { wikiDocId: string; libraryBagDocIds: readonly string[] },
  ) => Promise<{ personalUrl: string; draftUrl: string; workingUrl: string }>;
  /** Bind the pool eviction MECHANISM (sovereign-worker): the worker commands evict via
   *  admin:evict-request; main routes it to the pool. Set after the pool exists. */
  onEvictRequest: (fn: (bagId: string) => Promise<void>) => void;
  /** Bind the residency-op MECHANISM: the worker commands pin/unpin/register-cold; main
   *  routes to the residency mechanism. Set after the manager/pool exists. */
  onResidencyOp: (fn: (op: "pin" | "unpin" | "register-cold", bagId: string, reason?: string) => Promise<void>) => void;
  /** Bind the wiki-alert DELIVERY: the worker named a wiki whose pending change needs a
   *  reboot; main places a `system-alert` verb into that wiki's live island. */
  onWikiAlert: (fn: (wikiSlug: string, message: string, cause?: string) => void) => void;
  /** Terminate the admin island Worker. */
  dispose:        () => void;
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
): Promise<BrowserAdminVmResult> {
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
    newSyncChannel: () => {
      const { port1, port2 } = new MessageChannel();
      return { mainPort: port1, syncPort: port2 };
    },
    spawnWorker: (url) => browserWorkerHandle(new Worker(url, { type: "module" })),
  };

  const core = openAdminVmCore(host, {
    repo, adminHandle, recipe, grants, coreHash,
    ...(pluginCids?.length ? { pluginCids } : {}),
    ...(adminAuth ? { adminAuth } : {}),
    workerScriptUrl,
  });

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
