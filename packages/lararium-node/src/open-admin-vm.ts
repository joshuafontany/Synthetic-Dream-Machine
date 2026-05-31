/**
 * openAdminVm — spawn the sovereign admin island.
 *
 * The admin island holds its own TW5 VM (full recipe: @lararium + @lares + @admin),
 * its own Repo-in-island, its own CompositeStore (CRDT + volatile + projection),
 * and its own VerbDispatcher subscribed to the TW5 wiki change event surface.
 *
 * Vessel responsibilities retained here:
 *   - `adminHandle`  — opened on the main Repo for keyhive event persistence and
 *                      gate-check reads (PERSON_GROUP, MESH_CABAL sentinel tiddlers).
 *   - `composite`    — single-layer admin CompositeStore for cap-event writes via
 *                      AdminEventStore and receipt writes from delegated jobs.
 *   - Delegation loop — listens for `admin:delegate-verb` from island, runs vessel
 *                      handler registry, returns `admin:verb-result`.
 *
 * Boot ordering guarantee:
 *   `workerEa` resolves only after the admin island sends `ea` — TW5 live, all
 *   CRDT bags synced, drain loop running, VerbDispatcher subscribed. `openNodeVessel`
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
  LARARIUM_BAG, LARES_BAG,
  mkManifest, mkAdminPlaceVerb, mkAdminVerbResult,
  isIslandToVesselMsg,
  type WikiRecipe,
} from "@lararium/mesh";
import { runLocalVerb }                                 from "@lararium/tw5";
import type { VerbTable }                               from "@lararium/tw5";
import type { CapabilityVerifier }                      from "@lararium/mesh";
import { waitHandleLocal }                              from "./repo-helpers.js";
import type { IslandMsg_Ea, AdminMsg_DelegateVerb }      from "@lararium/mesh";

const __dir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ADMIN_WORKER_URL = new URL("./lar-admin-island.js", import.meta.url);

export interface AdminVmOptions {
  repo:              Repo;
  adminUrl:          string;
  /**
   * SHA-256 hex of the TW5 core blob (`LarDoc.blobs[ENGINE_CORE_ID]`).
   * null = pre-CAS. The admin island reads bytes from the @lararium CRDT doc.
   */
  coreHash:          string | null;
  /** AutomergeUrl resolver: slot URI → doc URL. Carries @lararium / @lares /
   *  @admin (and any canon bags the operator mounts). */
  resolver:          Readonly<Record<string, string | null>>;
  /** Optional canon bag URIs for the admin recipe. Empty by default. */
  canonBags?:        readonly string[];
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
  mountMainVerbs: (registry: VerbTable, verifier?: CapabilityVerifier) => void;
  /**
   * Place a volatile job tiddler in the admin island's TW5 wiki.
   * Delegates to the admin island's internal `placeVerbInvocation` via `admin:place-verb` message.
   * The wiki change event fires at the island's next tick; VerbDispatcher dispatches it.
   */
  placeVerb:    (opts: import("@lararium/tw5").VerbSignalRequest) => void;
  /** Terminate the admin island and release the vessel composite. */
  dispose:      () => void;
}

const HANDSHAKE_TIMEOUT_MS = 15_000;

export async function openAdminVm(opts: AdminVmOptions): Promise<AdminVmResult> {
  const { repo, adminUrl, coreHash, resolver, canonBags, storageDir, workerScriptUrl } = opts;
  void adminUrl;

  // Mutable delegation config — set via mountMainVerbs() after keyhive boots.
  let _delegationRegistry: VerbTable | null = null;
  let _verifier:      CapabilityVerifier | null  = null;

  // ── Vessel admin handle (keyhive + gate reads) ───────────────────────
  const adminHandle = await waitHandleLocal<LarDoc>(
    repo, adminUrl as AutomergeUrl,
    () => repo.create<LarDoc>(emptyLarDoc()),
  );

  // ── Vessel composite (cap-event + relay receipt writes) ──────────────
  const composite = new CompositeStore();
  const adminStore = new AutomergeDocStore(adminHandle, ADMIN_BAG_ID);
  composite.addLayer({ bagId: ADMIN_BAG_ID, store: adminStore, writable: true });
  adminStore.markSyncComplete();

  // ── Spawn admin island ────────────────────────────────────────────────────
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
    () => _eaReject(new Error("[openAdminVm] admin island ea timeout")),
    HANDSHAKE_TIMEOUT_MS,
  );

  // ── Relay loop + island message routing ───────────────────────────────────
  worker.on("message", (raw: unknown) => {
    if (!isIslandToVesselMsg(raw)) return;

    if (raw.type === "ea") {
      clearTimeout(eaTimer);
      _eaResolve();
      return;
    }

    if (raw.type === "fault") {
      clearTimeout(eaTimer);
      _eaReject(new Error(`[openAdminVm] admin island fault: ${(raw as { error: string }).error}`));
      return;
    }

    if (raw.type === "admin:delegate-verb") {
      const msg = raw as AdminMsg_DelegateVerb;
      if (!_delegationRegistry) {
        worker.postMessage(mkAdminVerbResult({
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
        batchMode:   (msg.batchMode ?? "best-effort") as import("@lararium/mesh").BatchMode,
        status:      "pending" as const,
      };
      runLocalVerb(invocationLike, {
        admin:    composite,
        registry: _delegationRegistry,
        ...(_verifier ? { verifier: _verifier } : {}),
      }).then((result) => {
        worker.postMessage(mkAdminVerbResult({ requestId: msg.requestId, result }));
      }).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        worker.postMessage(mkAdminVerbResult({ requestId: msg.requestId, error: message }));
      });
      return;
    }
  });

  worker.on("error", (err) => {
    console.error("[openAdminVm] admin island error:", err);
    clearTimeout(eaTimer);
    _eaReject(err);
  });

  // ── Deliver manifest to admin island ──────────────────────────────────────
  const storage = storageDir
    ? { type: "nodefs" as const, dir: join(storageDir, "admin") }
    : undefined;

  const recipe: WikiRecipe = {
    wikiSlug: "admin",
    ...(canonBags?.length ? { canonBags } : {}),
  };
  void LARARIUM_BAG; void LARES_BAG; // marker — caller's resolver must include these
  const manifestMsg = mkManifest(
    ADMIN_BAG_ID,
    syncPort as unknown as globalThis.MessagePort,
    recipe,
    resolver,
    coreHash,
    storage ? { storage } : undefined,
  );
  worker.postMessage(manifestMsg, [syncPort as unknown as ArrayBuffer]);

  // ── Return result — caller awaits workerEa before emit("live") ────────────
  return {
    adminHandle,
    composite,
    workerEa,
    mountMainVerbs: (registry: VerbTable, verifier?: CapabilityVerifier) => {
      _delegationRegistry = registry;
      _verifier      = verifier ?? null;
    },
    placeVerb: (verbOpts) => {
      worker.postMessage(mkAdminPlaceVerb({
        verb:        verbOpts.verb,
        args:        verbOpts.args,
        requestedBy: verbOpts.requestedBy,
        ...(verbOpts.targets?.length ? { targets: [...verbOpts.targets] } : {}),
        ...(verbOpts.batchMode       ? { batchMode: String(verbOpts.batchMode) } : {}),
        ...(verbOpts.requestId       ? { requestId: verbOpts.requestId } : {}),
      }));
    },
    dispose: () => {
      clearTimeout(eaTimer);
      void worker.terminate();
    },
  };
}
