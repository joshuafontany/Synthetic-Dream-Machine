/**
 * openBrowserAdminVm — spawn the sovereign browser admin island.
 *
 * Browser platform counterpart of openAdminVm (Node). Platform surface swapped:
 *   Node:    import { Worker } from "worker_threads"; worker.on("message", ...)
 *   Browser: new Worker(url, { type: "module" }); worker.addEventListener(...)
 *
 * All message types, manifest protocol, delegation loop, and workerEa semantics
 * are identical to the Node path — they live in @lararium/mesh (isomorphic).
 *
 * Boot ordering guarantee:
 *   workerEa resolves only after the admin island sends "ea" — TW5 live, all
 *   CRDT bags synced, drain loop running, VerbDispatcher subscribed.
 *   openBrowserVessel awaits workerEa before emitting "live".
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/open-browser-admin-vm
 */

import { Repo }                              from "@automerge/automerge-repo";
import type { AutomergeUrl, DocHandle }      from "@automerge/automerge-repo";
import { MessageChannelNetworkAdapter }      from "@automerge/automerge-repo-network-messagechannel";
import {
  ADMIN_BAG_ID, CompositeStore, AutomergeDocStore, emptyLarDoc,
  mkManifest, mkAdminPlaceVerb, mkAdminVerbResult,
  isIslandToVesselMsg,
  type BagBinding, type LarDoc, type CapabilityVerifier,
} from "@lararium/mesh";
import type { AdminMsg_DelegateVerb, IslandMsg_Ea } from "@lararium/mesh";
import { runLocalVerb, VerbTable } from "@lararium/tw5";
export type { VerbReactor } from "@lararium/tw5";

// ── Types re-used from open-admin-vm (Node) ───────────────────────────────────

export interface BrowserAdminVmOptions {
  repo:             Repo;
  adminUrl:         string;
  /** SHA-256 hex of TW5 core blob. null = pre-CAS path. */
  coreHash:         string | null;
  /** Ordered bag capability tokens for the admin island's full recipe. */
  bagBindings:      readonly BagBinding[];
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
  mountMainVerbs: (registry: VerbTable, verifier?: CapabilityVerifier) => void;
  /** Place a volatile job in the admin island's TW5 wiki. */
  placeVerb:       (opts: BrowserVerbPlacementRequest) => void;
  /** Terminate the admin island Worker. */
  dispose:        () => void;
}

export { VerbTable };
export type { VerbTable as BrowserVerbTable };

export interface BrowserVerbPlacementRequest {
  verb:         string;
  args:         Record<string, unknown>;
  requestedBy?: string;
  requestId?:   string;
  fromUri?:     string;
  listenable?:  string;
}

const HANDSHAKE_TIMEOUT_MS = 15_000;

export async function openBrowserAdminVm(
  opts: BrowserAdminVmOptions,
): Promise<BrowserAdminVmResult> {
  const { repo, adminUrl, coreHash, bagBindings, workerScriptUrl } = opts;

  let _registry: VerbTable | null = null;
  let _verifier: CapabilityVerifier | null = null;

  // ── Admin doc handle (keyhive + gate reads) ──────────────────────────────
  const adminHandle = await (async () => {
    try {
      const h = await repo.find<LarDoc>(adminUrl as AutomergeUrl, {
        allowableStates: ["ready", "unavailable"],
      });
      if (h.isUnavailable()) return repo.create<LarDoc>(emptyLarDoc());
      return h;
    } catch {
      return repo.create<LarDoc>(emptyLarDoc());
    }
  })();

  // ── Vessel composite (cap-event + receipt writes) ────────────────────────
  const composite  = new CompositeStore();
  const adminStore = new AutomergeDocStore(adminHandle, ADMIN_BAG_ID);
  composite.addLayer({ bagId: ADMIN_BAG_ID, store: adminStore, writable: true });
  adminStore.markSyncComplete();

  // ── MessageChannel — island ↔ vessel Repo sync ───────────────────────────
  const { port1: mainPort, port2: syncPort } = new MessageChannel();
  repo.networkSubsystem.addNetworkAdapter(new MessageChannelNetworkAdapter(mainPort));

  // ── Spawn admin Worker ────────────────────────────────────────────────────
  const worker = new Worker(workerScriptUrl, { type: "module" });
  worker.addEventListener("error", (e) =>
    console.error("[open-browser-admin-vm] worker error:", e.message),
  );

  // ── workerEa Promise ──────────────────────────────────────────────────────
  let _resolve!: () => void;
  let _reject!:  (err: Error) => void;
  const workerEa = new Promise<void>((res, rej) => { _resolve = res; _reject = rej; });

  const eaTimer = setTimeout(
    () => _reject(new Error("[open-browser-admin-vm] admin island ea timeout")),
    HANDSHAKE_TIMEOUT_MS,
  );

  // ── Message routing ───────────────────────────────────────────────────────
  worker.addEventListener("message", (e: MessageEvent) => {
    const raw = e.data as unknown;
    if (!isIslandToVesselMsg(raw)) return;

    if (raw.type === "ea") {
      clearTimeout(eaTimer);
      _resolve();
      return;
    }

    if (raw.type === "fault") {
      clearTimeout(eaTimer);
      _reject(new Error(`[open-browser-admin-vm] admin island fault: ${(raw as { error: string }).error}`));
      return;
    }

    if (raw.type === "admin:delegate-verb") {
      const msg = raw as AdminMsg_DelegateVerb;
      if (!_registry) {
        worker.postMessage(mkAdminVerbResult({
          requestId: msg.requestId,
          error: `[open-browser-admin-vm] delegate-job received before mountMainVerbs — verb="${msg.verb}" dropped`,
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
        batchMode:   (msg.batchMode ?? "best-effort") as import("@lararium/mesh").BatchMode,
        status:      "pending" as const,
      };
      runLocalVerb(invocationLike, {
        admin:    composite,
        registry: _registry,
        ...(_verifier ? { verifier: _verifier } : {}),
      }).then((result) => {
        worker.postMessage(mkAdminVerbResult({ requestId: msg.requestId, result }));
      }).catch((err: unknown) => {
        worker.postMessage(mkAdminVerbResult({
          requestId: msg.requestId,
          error: err instanceof Error ? err.message : String(err),
        }));
      });
    }
  });

  // ── Deliver manifest ──────────────────────────────────────────────────────
  const manifestMsg = mkManifest(ADMIN_BAG_ID, syncPort, coreHash, { bagBindings });
  worker.postMessage(manifestMsg, [syncPort]);

  return {
    adminHandle,
    composite,
    workerEa,
    mountMainVerbs: (registry, verifier?) => {
      _registry = registry;
      _verifier = verifier ?? null;
    },
    placeVerb: (jobOpts) => {
      worker.postMessage(mkAdminPlaceVerb({
        verb:        jobOpts.verb,
        args:        jobOpts.args,
        requestedBy: jobOpts.requestedBy ?? "browser-vessel",
        ...(jobOpts.requestId  ? { requestId:  jobOpts.requestId  } : {}),
        ...(jobOpts.fromUri    ? { fromUri:    jobOpts.fromUri    } : {}),
        ...(jobOpts.listenable ? { listenable: jobOpts.listenable } : {}),
      }));
    },
    dispose: () => {
      clearTimeout(eaTimer);
      void worker.terminate();
    },
  };
}
