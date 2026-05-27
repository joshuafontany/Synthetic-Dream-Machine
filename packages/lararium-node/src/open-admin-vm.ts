/**
 * openAdminVm — spawn the sovereign admin Worker island.
 *
 * The admin Worker holds its own TW5 VM (full recipe: @lararium + @lares + @admin),
 * its own Repo-in-Worker, its own CompositeStore (CRDT + volatile + projection),
 * and its own JobDispatcher subscribed to the TW5 wiki change event surface.
 *
 * Main-thread responsibilities retained here:
 *   - `adminHandle`  — opened on the main Repo for keyhive event persistence and
 *                      gate-check reads (PERSON_GROUP, MESH_CABAL sentinel tiddlers).
 *   - `composite`    — single-layer admin CompositeStore for cap-event writes via
 *                      AdminEventStore and receipt writes from relay-executed jobs.
 *   - Relay loop     — listens for `admin:relay-job` from Worker, runs main-thread
 *                      handler registry, returns `admin:job-result`.
 *
 * Boot ordering guarantee:
 *   `workerEa` resolves only after the admin Worker sends `ea` — TW5 live, all
 *   CRDT bags synced, drain loop running, JobDispatcher subscribed. `openNodeVessel`
 *   awaits `workerEa` before emitting `"live"`, enforcing the vessel ordering law:
 *   admin island must declare sovereignty before the vessel considers itself live.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/open-admin-vm
 */

import { dirname, join }                                from "path";
import { fileURLToPath }                                from "url";
import { Worker, MessageChannel }                       from "worker_threads";
import type { AutomergeUrl, DocHandle, Repo }           from "@automerge/automerge-repo";
import { MessageChannelNetworkAdapter }                 from "@automerge/automerge-repo-network-messagechannel";
import type { LarDoc }                                  from "@lararium/mesh";
import {
  ADMIN_BAG_ID, BAG_IDS, CompositeStore, AutomergeDocStore, emptyLarDoc,
  mkManifest, mkAdminPlaceJob, mkAdminJobResult,
  isWorkerToMainMsg,
  type BagBinding,
} from "@lararium/mesh";
import type { TW5CoreBootBlob }                         from "@lararium/tw5";
import { runLocalJob }                                  from "./job-local-dispatch.js";
import type { JobHandlerRegistry }                      from "./job-dispatcher.js";
import type { CapabilityVerifier }                      from "@lararium/mesh";
import { waitHandleLocal }                              from "./repo-helpers.js";
import type { WorkerMsg_Ea, AdminMsg_RelayJob }         from "@lararium/mesh";

const __dir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ADMIN_WORKER_URL = new URL("./lar-admin-worker.js", import.meta.url);

export interface AdminVmOptions {
  repo:              Repo;
  adminUrl:          string;
  coreBlob:          TW5CoreBootBlob;
  /** Ordered bag capability tokens for the admin Worker's full recipe. */
  bagBindings:       readonly BagBinding[];
  /** Optional storage dir for the admin Worker's NodeFS Repo. */
  storageDir?:       string;
  /** Override the admin Worker script URL (tests). */
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
   * Resolves when the admin Worker has sent `ea` — TW5 live, bags synced,
   * drain loop running, JobDispatcher subscribed to the wiki change surface.
   * `openNodeVessel` MUST await this before emitting `"live"`.
   */
  workerEa:     Promise<void>;
  /**
   * Wire the main-thread relay registry and verifier.
   * MUST be called before any job can be dispatched — call after keyhive boots,
   * before awaiting workerEa. Relay jobs that arrive without a configured registry
   * are rejected with an error result back to the Worker.
   */
  configureRelay: (registry: JobHandlerRegistry, verifier?: CapabilityVerifier) => void;
  /**
   * Place a volatile job tiddler in the admin Worker's TW5 wiki.
   * Delegates to the admin Worker's internal `placeVmJob` via `admin:place-job` message.
   * The wiki change event fires at the Worker's next tick; JobDispatcher dispatches it.
   */
  placeJob:     (opts: import("./job-inbox-relay.js").JobPlacementRequest) => void;
  /** Terminate the admin Worker and release the main-thread composite. */
  dispose:      () => void;
}

const HANDSHAKE_TIMEOUT_MS = 15_000;

export async function openAdminVm(opts: AdminVmOptions): Promise<AdminVmResult> {
  const { repo, adminUrl, coreBlob, bagBindings, storageDir, workerScriptUrl } = opts;

  // Mutable relay config — set via configureRelay() after keyhive boots.
  let _relayRegistry: JobHandlerRegistry | null = null;
  let _verifier:      CapabilityVerifier | null  = null;

  // ── Main-thread admin handle (keyhive + gate reads) ───────────────────────
  const adminHandle = await waitHandleLocal<LarDoc>(
    repo, adminUrl as AutomergeUrl,
    () => repo.create<LarDoc>(emptyLarDoc()),
  );

  // ── Main-thread composite (cap-event + relay receipt writes) ──────────────
  const composite = new CompositeStore();
  const adminStore = new AutomergeDocStore(adminHandle, ADMIN_BAG_ID);
  composite.addLayer({ bagId: ADMIN_BAG_ID, store: adminStore, writable: true });
  adminStore.markSyncComplete();

  // ── Spawn admin Worker ────────────────────────────────────────────────────
  const { port1: mainPort, port2: syncPort } = new MessageChannel();

  const adapter = new MessageChannelNetworkAdapter(mainPort as unknown as globalThis.MessagePort);
  repo.networkSubsystem.addNetworkAdapter(adapter);

  const workerUrl = workerScriptUrl ?? DEFAULT_ADMIN_WORKER_URL;
  const worker    = new Worker(workerUrl);

  // ── workerEa Promise ──────────────────────────────────────────────────────
  let _eaResolve!:  () => void;
  let _eaReject!:   (err: Error) => void;
  const workerEa = new Promise<void>((resolve, reject) => {
    _eaResolve = resolve;
    _eaReject  = reject;
  });

  const eaTimer = setTimeout(
    () => _eaReject(new Error("[openAdminVm] admin Worker ea timeout")),
    HANDSHAKE_TIMEOUT_MS,
  );

  // ── Relay loop + Worker message routing ───────────────────────────────────
  worker.on("message", (raw: unknown) => {
    if (!isWorkerToMainMsg(raw)) return;

    if (raw.type === "ea") {
      clearTimeout(eaTimer);
      _eaResolve();
      return;
    }

    if (raw.type === "fault") {
      clearTimeout(eaTimer);
      _eaReject(new Error(`[openAdminVm] admin Worker fault: ${(raw as { error: string }).error}`));
      return;
    }

    if (raw.type === "admin:relay-job") {
      const msg = raw as AdminMsg_RelayJob;
      if (!_relayRegistry) {
        worker.postMessage(mkAdminJobResult({
          requestId: msg.requestId,
          error: `[openAdminVm] relay-job received before configureRelay — verb="${msg.verb}" dropped`,
        }));
        return;
      }
      // Build a minimal JobTiddler-like object for runLocalJob.
      const jobLike = {
        title:       `${ADMIN_BAG_ID}/relay/${msg.requestId}`,
        requestId:   msg.requestId,
        verb:        msg.verb,
        args:        msg.args,
        requestedBy: msg.requestedBy,
        requestedAt: new Date().toISOString(),
        targets:     msg.targets ?? [],
        batchMode:   (msg.batchMode ?? "best-effort") as import("@lararium/mesh").BatchMode,
        status:      "pending" as const,
      };
      runLocalJob(jobLike, {
        admin:    composite,
        registry: _relayRegistry,
        ...(_verifier ? { verifier: _verifier } : {}),
      }).then((result) => {
        worker.postMessage(mkAdminJobResult({ requestId: msg.requestId, result }));
      }).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        worker.postMessage(mkAdminJobResult({ requestId: msg.requestId, error: message }));
      });
      return;
    }
  });

  worker.on("error", (err) => {
    console.error("[openAdminVm] admin Worker error:", err);
    clearTimeout(eaTimer);
    _eaReject(err);
  });

  // ── Deliver manifest to admin Worker ──────────────────────────────────────
  const storage = storageDir
    ? { type: "nodefs" as const, dir: join(storageDir, "admin") }
    : undefined;

  const manifestMsg = mkManifest(
    ADMIN_BAG_ID,
    coreBlob.bytes,
    syncPort as unknown as globalThis.MessagePort,
    coreBlob.sha256 ?? null,
    { bagBindings, ...(storage ? { storage } : {}) },
  );
  worker.postMessage(manifestMsg, [syncPort as unknown as ArrayBuffer]);

  // ── Return result — caller awaits workerEa before emit("live") ────────────
  return {
    adminHandle,
    composite,
    workerEa,
    configureRelay: (registry: JobHandlerRegistry, verifier?: CapabilityVerifier) => {
      _relayRegistry = registry;
      _verifier      = verifier ?? null;
    },
    placeJob: (jobOpts) => {
      worker.postMessage(mkAdminPlaceJob({
        verb:        jobOpts.verb,
        args:        jobOpts.args,
        requestedBy: jobOpts.requestedBy,
        ...(jobOpts.targets?.length ? { targets: [...jobOpts.targets] } : {}),
        ...(jobOpts.batchMode       ? { batchMode: String(jobOpts.batchMode) } : {}),
        ...(jobOpts.requestId       ? { requestId: jobOpts.requestId } : {}),
      }));
    },
    dispose: () => {
      clearTimeout(eaTimer);
      void worker.terminate();
    },
  };
}
