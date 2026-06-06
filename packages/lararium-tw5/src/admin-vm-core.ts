/**
 * admin-vm-core — the platform-blind admin-island vessel lifecycle.
 *
 * ONE core both vessels compose (mirror pair 2/5). Subtracts the identical
 * skeleton from open-admin-vm.ts (node) ⇆ open-browser-admin-vm.ts (browser):
 * composite wiring, MessageChannel sync, ea-promise + timeout, the delegation
 * loop, manifest delivery, placeVerb/mountMainVerbs/dispose. The platform
 * divergence remains as a two-member host seam (spawnWorker + newSyncChannel);
 * the resolved admin doc handle is passed in by the caller (the two platforms
 * resolve it with genuinely different strategies — node merge-on-late-arrival,
 * browser find-or-create — so that stays a wrapper concern, not the core's).
 *
 * Node-only capability proxies (authSeam, resolveBinding) compose ON TOP via a
 * second listener on the exposed `worker` handle — they are node-ahead surface,
 * not duplication, so the core stays free of them.
 *
 * Network-adapter wiring routes through mesh (attachMessageChannelSync); the
 * core holds zero @automerge/* imports — same facade law as sovereign-kernel.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/admin-vm-core
 */

import {
  ADMIN_BAG_ID,
  CompositeStore,
  AutomergeDocStore,
  attachMessageChannelSync,
  mkManifest,
  mkAdminPlaceVerb,
  mkAdminVerbResult,
  mkAdminVerifyRequest,
  mkAdminResolveBindingRequest,
  isIslandToVesselMsg,
  type Repo,
  type DocHandle,
  type LarDoc,
  type WikiRecipe,
  type CapabilityVerifier,
  type AuthVerifierSeam,
  type IslandStorageConfig,
  type IslandMsg_Manifest,
  type AdminMsg_DelegateVerb,
  type AdminMsg_VerifyResult,
  type AdminMsg_ResolveBindingResult,
  type BatchMode,
} from "@lararium/mesh";
import { runLocalVerb } from "./verb-local-dispatch.js";
import type { VerbTable } from "./verb-dispatcher.js";

const HANDSHAKE_TIMEOUT_MS = 15_000;

/** The MessagePort type, borrowed through the mesh manifest (no DOM-lib dep). */
type VesselMessagePort = IslandMsg_Manifest["syncPort"];

/** Platform handle over a spawned admin-island Worker. */
export interface VesselWorkerHandle {
  post(msg: unknown, transfer?: unknown[]): void;
  listen(onMessage: (raw: unknown) => void): void;
  onError(cb: (err: Error) => void): void;
  terminate(): void;
}

/** The two-member admin-VM host seam — platform divergence as composition. */
export interface AdminVmHost {
  spawnWorker(scriptUrl: URL): VesselWorkerHandle;
  newSyncChannel(): { mainPort: VesselMessagePort; syncPort: VesselMessagePort };
}

export interface AdminVmCoreOptions {
  /** Vessel main Repo — gains the island sync leg. */
  repo:            Repo;
  /** Admin doc handle, already resolved by the platform wrapper. */
  adminHandle:     DocHandle<LarDoc>;
  /** One-recipe model for the admin island. */
  recipe:          WikiRecipe;
  /** Slot URI → AutomergeUrl. */
  resolver:        Readonly<Record<string, string | null>>;
  /** SHA-256 hex of the TW5 core blob. null = pre-CAS. */
  coreHash:        string | null;
  /** Operator authn/z material for in-worker keyhive boot (Stage 1). */
  adminAuth?:      IslandMsg_Manifest["adminAuth"];
  /** Storage config delivered in the manifest (node nodefs; browser omits). */
  storage?:        IslandStorageConfig;
  /** Compiled admin-island Worker script URL. */
  workerScriptUrl: URL;
}

/** Unified placeVerb request — union of node + browser fields. */
export interface VesselPlaceVerbRequest {
  verb:         string;
  args:         Record<string, unknown>;
  requestedBy?: string;
  requestId?:   string;
  targets?:     readonly string[];
  batchMode?:   string;
  fromUri?:     string;
  listenable?:  string;
}

export interface AdminVmCore {
  adminHandle:    DocHandle<LarDoc>;
  composite:      CompositeStore;
  workerEa:       Promise<void>;
  mountMainVerbs: (registry: VerbTable, verifier?: CapabilityVerifier) => void;
  placeVerb:      (opts: VesselPlaceVerbRequest) => void;
  /**
   * Host-side inbound-peer verifier (path b) — proxies verify() to the island's
   * keyhive via admin:verify-request/result. Common to both vessels.
   */
  authSeam:       AuthVerifierSeam;
  /**
   * Resolve (or mint+delegate) the operator's @personal/@draft binding pair for
   * a recipe fingerprint — runs island-side where keyhive lives. Common surface.
   */
  resolveBinding: (
    fingerprint: string,
    recipeTrace: { wikiDocId: string; canonBagDocIds: readonly string[] },
  ) => Promise<{ personalUrl: string; draftUrl: string }>;
  dispose:        () => void;
  /** Exposed so platform wrappers compose any further capability on top. */
  worker:         VesselWorkerHandle;
}

export function openAdminVmCore(host: AdminVmHost, opts: AdminVmCoreOptions): AdminVmCore {
  const { repo, adminHandle, recipe, resolver, coreHash, adminAuth, storage, workerScriptUrl } = opts;

  // Mutable delegation config — set via mountMainVerbs() after keyhive boots.
  let _registry: VerbTable | null          = null;
  let _verifier: CapabilityVerifier | null = null;

  // ── Vessel composite (cap-event + receipt writes) ──────────────────────────
  const composite  = new CompositeStore();
  const adminStore = new AutomergeDocStore(adminHandle, ADMIN_BAG_ID);
  composite.addLayer({ bagId: ADMIN_BAG_ID, store: adminStore, writable: true });
  adminStore.markSyncComplete();

  // ── MessageChannel — island ↔ vessel Repo sync (wiring owned by mesh) ───────
  const { mainPort, syncPort } = host.newSyncChannel();
  attachMessageChannelSync(repo, mainPort);

  // ── Spawn admin island ─────────────────────────────────────────────────────
  const worker = host.spawnWorker(workerScriptUrl);

  // ── askIsland — ONE request/reply correlation primitive ─────────────────────
  // Both vessel→island capability proxies (verify, resolveBinding) compose on
  // this single piece instead of hand-rolling a pending-map each.
  let _askSeq = 0;
  const _pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  function askIsland<T>(prefix: string, makeMsg: (requestId: string) => unknown): Promise<T> {
    const requestId = `${prefix}-${++_askSeq}`;
    return new Promise<T>((resolve, reject) => {
      _pending.set(requestId, { resolve: resolve as (v: unknown) => void, reject });
      worker.post(makeMsg(requestId));
    });
  }
  function settleAsk(requestId: string, value: unknown, error?: string): void {
    const p = _pending.get(requestId);
    if (!p) return;
    _pending.delete(requestId);
    if (error) p.reject(new Error(error));
    else p.resolve(value);
  }

  // ── workerEa Promise ────────────────────────────────────────────────────────
  let _resolve!: () => void;
  let _reject!:  (err: Error) => void;
  const workerEa = new Promise<void>((res, rej) => { _resolve = res; _reject = rej; });
  const eaTimer = setTimeout(
    () => _reject(new Error("[openAdminVm] admin island ea timeout")),
    HANDSHAKE_TIMEOUT_MS,
  );

  // ── Delegation loop + island message routing ────────────────────────────────
  worker.listen((raw: unknown) => {
    if (!isIslandToVesselMsg(raw)) return;

    if (raw.type === "ea") {
      clearTimeout(eaTimer);
      _resolve();
      return;
    }

    if (raw.type === "fault") {
      clearTimeout(eaTimer);
      _reject(new Error(`[openAdminVm] admin island fault: ${(raw as { error: string }).error}`));
      return;
    }

    if (raw.type === "admin:verify-result") {
      const msg = raw as AdminMsg_VerifyResult;
      settleAsk(msg.requestId, {
        ok: msg.ok,
        ...(msg.identifier ? { identifier: msg.identifier } : {}),
        ...(msg.reason ? { reason: msg.reason } : {}),
      });
      return;
    }

    if (raw.type === "admin:resolve-binding-result") {
      const msg = raw as AdminMsg_ResolveBindingResult;
      if (msg.error) settleAsk(msg.requestId, undefined, msg.error);
      else if (msg.personalUrl && msg.draftUrl) settleAsk(msg.requestId, { personalUrl: msg.personalUrl, draftUrl: msg.draftUrl });
      else settleAsk(msg.requestId, undefined, "resolve-binding-result missing urls");
      return;
    }

    if (raw.type === "admin:delegate-verb") {
      const msg = raw as AdminMsg_DelegateVerb;
      if (!_registry) {
        worker.post(mkAdminVerbResult({
          requestId: msg.requestId,
          error: `[openAdminVm] delegate-verb received before mountMainVerbs — verb="${msg.verb}" dropped`,
        }));
        return;
      }
      const invocationLike = {
        title:       `${ADMIN_BAG_ID}/delegate/${msg.requestId}`,
        requestId:   msg.requestId,
        verb:        msg.verb,
        args:        msg.args,
        requestedBy: msg.requestedBy,
        requestedAt: new Date().toISOString(),
        targets:     msg.targets ?? [],
        batchMode:   (msg.batchMode ?? "best-effort") as BatchMode,
        status:      "pending" as const,
      };
      runLocalVerb(invocationLike, {
        admin:    composite,
        registry: _registry,
        ...(_verifier ? { verifier: _verifier } : {}),
      }).then((result) => {
        worker.post(mkAdminVerbResult({ requestId: msg.requestId, result }));
      }).catch((err: unknown) => {
        worker.post(mkAdminVerbResult({
          requestId: msg.requestId,
          error: err instanceof Error ? err.message : String(err),
        }));
      });
      return;
    }
  });

  worker.onError((err) => {
    clearTimeout(eaTimer);
    _reject(err);
  });

  // ── Deliver manifest ────────────────────────────────────────────────────────
  const manifestMsg = mkManifest(ADMIN_BAG_ID, syncPort, recipe, resolver, coreHash, {
    ...(storage   ? { storage }   : {}),
    ...(adminAuth ? { adminAuth } : {}),
  });
  worker.post(manifestMsg, [syncPort]);

  return {
    adminHandle,
    composite,
    workerEa,
    worker,
    mountMainVerbs: (registry: VerbTable, verifier?: CapabilityVerifier) => {
      _registry = registry;
      _verifier = verifier ?? null;
    },
    authSeam: {
      verify: (cardBytes, bagUrl, access) =>
        askIsland("verify", (requestId) => mkAdminVerifyRequest({ requestId, cardBytes, bagUrl, access })),
    },
    resolveBinding: (fingerprint, recipeTrace) =>
      askIsland("binding", (requestId) => mkAdminResolveBindingRequest({ requestId, fingerprint, recipeTrace })),
    placeVerb: (o: VesselPlaceVerbRequest) => {
      worker.post(mkAdminPlaceVerb({
        verb:        o.verb,
        args:        o.args,
        requestedBy: o.requestedBy ?? "vessel",
        ...(o.targets?.length ? { targets: [...o.targets] } : {}),
        ...(o.batchMode       ? { batchMode: String(o.batchMode) } : {}),
        ...(o.requestId       ? { requestId: o.requestId } : {}),
        ...(o.fromUri         ? { fromUri: o.fromUri } : {}),
        ...(o.listenable      ? { listenable: o.listenable } : {}),
      }));
    },
    dispose: () => {
      clearTimeout(eaTimer);
      worker.terminate();
    },
  };
}
