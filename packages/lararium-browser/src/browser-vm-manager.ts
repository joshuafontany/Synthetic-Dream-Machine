/**
 * BrowserVmManager — browser-vessel implementation of BrowserAuthorityPool.
 *
 * ## Worker Sovereignty Law — main-thread side
 *
 *   For each wiki authority the main thread:
 *     1. Spawns a dedicated Web Worker (browser-wiki-worker.ts).
 *     2. Creates a MessageChannel. Keeps `mainPort`; transfers `syncPort` to the Worker.
 *     3. Optionally connects `mainPort` to the main-thread Automerge Repo via
 *        `MessageChannelNetworkAdapter` so the Worker-side Repo syncs automatically.
 *     4. Delivers `manifest` with `syncPort`, `docUrl`, `coreBlob`, `coreHash`.
 *     5. Awaits `ea` — island declares sovereignty; island is live.
 *
 *   Island isolation is structural: each Worker owns its own dedicated realm and
 *   MessagePort. The routing Map `_slots` enforces that no message reaches the
 *   wrong Worker — the boundary is a data structure, not a convention.
 *
 * ## BrowserAuthorityPool surface
 *
 *   `acquire`   — spawn + manifest; returns BrowserAuthorityLease.
 *   `preWarm`   — spawn + manifest without returning a lease.
 *   `evict`     — GP-5 teardown; returns doc bytes for persistence.
 *   `disposeAll`— evict all slots.
 *   `has`       — slot existence check.
 *   `inspect`   — live phase snapshot (diagnostics).
 *
 * ## BrowserAuthorityLease — push-first design intent
 *
 *   `filterTiddlers` and `renderMeme` survive as pull RPCs for S3 compatibility.
 *   They are annotated @deprecated — the push projection path (S4) will replace them.
 *   Request-response uses a `_pending` Map keyed by correlation UUID; the Worker
 *   echoes the UUID in an `rpc:reply` event. Protocol extension deferred to S4.
 *
 *   For now both methods return `[]` / `null` — stubs that compile but do not yet
 *   cross the Worker boundary. Named stubs surface the gap rather than hiding it.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-vm-manager
 */

import { Repo } from "@automerge/automerge-repo";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";
import {
  isWorkerToMainMsg,
  mkManifest,
  mkTeardown,
  WORKER_PROTOCOL_VERSION,
} from "@lararium/mesh";
import type {
  WorkerMsg_Ea,
  WorkerMsg_TeardownAck,
  WorkerMsg_Event,
  WorkerToMainMsg,
} from "@lararium/mesh";
import type {
  BrowserAuthorityPool,
  BrowserAuthorityId,
  BrowserAuthorityBootParams,
  BrowserAuthorityReceipt,
  BrowserAuthorityLease,
  BrowserAuthorityPhase,
  BrowserProjectionSnapshot,
  BrowserAuthorityDebugStats,
} from "@lararium/mesh";

// ── Slot ──────────────────────────────────────────────────────────────────

interface BrowserSlot {
  worker:      Worker;
  mainPort:    MessagePort;
  mainRepo:    Repo | null;
  phase:       BrowserAuthorityPhase;
  bootedAt:    number | null;
  lastLeaseAt: number | null;
  lastReleaseAt: number | null;
  /** Callback for verse-event reactions forwarded to the caller. */
  onEvent:     ((msg: WorkerMsg_Event) => void) | null;
}

// ── Handshake helpers ──────────────────────────────────────────────────────

const HANDSHAKE_TIMEOUT_MS = 10_000;

function _awaitWorkerMsg<T extends WorkerToMainMsg>(
  worker: Worker,
  type:   T["type"],
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`[browser-vm-manager] timeout waiting for ${type}`)),
      HANDSHAKE_TIMEOUT_MS,
    );
    const onMsg = (e: MessageEvent) => {
      if (!isWorkerToMainMsg(e.data) || e.data.type !== type) return;
      clearTimeout(timer);
      worker.removeEventListener("message", onMsg);
      resolve(e.data as T);
    };
    worker.addEventListener("message", onMsg);
  });
}

function _receipt(
  id:          BrowserAuthorityId,
  operation:   BrowserAuthorityReceipt["operation"],
  ok:          boolean,
  startMs:     number,
  phase:       BrowserAuthorityPhase,
  error?:      string,
): BrowserAuthorityReceipt {
  const base: BrowserAuthorityReceipt = {
    authorityId: id,
    operation,
    ok,
    durationMs:  Date.now() - startMs,
    resultPhase: phase,
    at:          Date.now(),
  };
  if (error !== undefined) base.error = error;
  return base;
}

// ── BrowserVmManager ──────────────────────────────────────────────────────

export interface BrowserVmManagerOptions {
  /** URL of the compiled browser-wiki-worker entry script. */
  workerScriptUrl: URL;
  /**
   * Optional main-thread Automerge Repo. When provided, each slot wires
   * `mainPort` to this Repo via `MessageChannelNetworkAdapter` so the
   * Worker-side Repo syncs the wiki doc automatically.
   *
   * When absent (e.g. tests), the Worker-side Repo starts empty and
   * receives only explicit doc bytes from `BrowserAuthorityBootParams.snapshots`.
   */
  mainRepo?: Repo;
  /** Called when a Worker emits a verse-event reaction. */
  onWorkerEvent?: (id: BrowserAuthorityId, msg: WorkerMsg_Event) => void;
}

export class BrowserVmManager implements BrowserAuthorityPool {
  private readonly _slots      = new Map<BrowserAuthorityId, BrowserSlot>();
  private readonly _workerUrl: URL;
  private readonly _mainRepo:  Repo | null;
  private readonly _onWorkerEvent: ((id: BrowserAuthorityId, msg: WorkerMsg_Event) => void) | null;

  constructor(opts: BrowserVmManagerOptions) {
    this._workerUrl     = opts.workerScriptUrl;
    this._mainRepo      = opts.mainRepo ?? null;
    this._onWorkerEvent = opts.onWorkerEvent ?? null;
  }

  // ── BrowserAuthorityPool ─────────────────────────────────────────────────

  async acquire(
    id:     BrowserAuthorityId,
    params: BrowserAuthorityBootParams,
  ): Promise<{ receipt: BrowserAuthorityReceipt; lease: BrowserAuthorityLease }> {
    const start = Date.now();
    let slot = this._slots.get(id);

    if (!slot || slot.phase === "disposed") {
      try {
        slot = await this._spawnAndBoot(id, params);
      } catch (err) {
        return {
          receipt: _receipt(id, "acquire", false, start, "disposed", String(err)),
          lease:   this._stubLease(id),
        };
      }
    }

    slot.phase       = "leased";
    slot.lastLeaseAt = Date.now();
    return {
      receipt: _receipt(id, "acquire", true, start, "leased"),
      lease:   this._makeLease(id, slot),
    };
  }

  async preWarm(
    id:     BrowserAuthorityId,
    params: BrowserAuthorityBootParams,
  ): Promise<BrowserAuthorityReceipt> {
    const start = Date.now();
    try {
      await this._spawnAndBoot(id, params);
      return _receipt(id, "preWarm", true, start, "idle");
    } catch (err) {
      return _receipt(id, "preWarm", false, start, "disposed", String(err));
    }
  }

  async evict(id: BrowserAuthorityId): Promise<{
    receipt:   BrowserAuthorityReceipt;
    snapshots: Array<{ bagId: string; bytes: Uint8Array }>;
  }> {
    const start = Date.now();
    const slot  = this._slots.get(id);
    if (!slot || slot.phase === "disposed") {
      return {
        receipt:   _receipt(id, "evict", true, start, "disposed"),
        snapshots: [],
      };
    }

    slot.phase = "disposing";

    let docBytes: Uint8Array | undefined;
    try {
      const ackPromise = _awaitWorkerMsg<WorkerMsg_TeardownAck>(slot.worker, "teardown:ack");
      slot.worker.postMessage(mkTeardown());
      const ack = await ackPromise;
      docBytes  = ack.docBytes;
    } catch {
      // Teardown timed out — terminate anyway.
    }

    // mainRepo network adapter cleanup is handled by Repo disposal; no per-adapter teardown API.
    slot.mainPort.close();
    slot.worker.terminate();
    slot.phase = "disposed";
    this._slots.delete(id);

    // Wrap docBytes as a single-bag snapshot keyed by the authority id.
    const snapshots: Array<{ bagId: string; bytes: Uint8Array }> =
      docBytes ? [{ bagId: id, bytes: docBytes }] : [];

    return {
      receipt:   _receipt(id, "evict", true, start, "disposed"),
      snapshots,
    };
  }

  async disposeAll(): Promise<BrowserAuthorityReceipt[]> {
    const results = await Promise.allSettled(
      [...this._slots.keys()].map((id) => this.evict(id).then(({ receipt }) => receipt)),
    );
    return results.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : _receipt("unknown", "dispose", false, Date.now(), "disposed", String(r.reason)),
    );
  }

  has(id: BrowserAuthorityId): boolean {
    const slot = this._slots.get(id);
    return !!slot && slot.phase !== "disposed";
  }

  inspect(): Array<{ id: BrowserAuthorityId; phase: BrowserAuthorityPhase }> {
    return [...this._slots.entries()].map(([id, slot]) => ({ id, phase: slot.phase }));
  }

  get size(): number { return this._slots.size; }

  // ── Private — spawn + boot ────────────────────────────────────────────────

  private async _spawnAndBoot(
    id:     BrowserAuthorityId,
    params: BrowserAuthorityBootParams,
  ): Promise<BrowserSlot> {
    // 1. Spawn Worker.
    const worker = new Worker(this._workerUrl, { type: "module" });
    worker.addEventListener("error", (e) => {
      console.error(`[browser-vm-manager] Worker error (${id}):`, e.message);
    });

    // 2. Create MessageChannel — main keeps port1, Worker receives port2 (syncPort).
    const { port1: mainPort, port2: syncPort } = new MessageChannel();

    // 3. Optionally wire mainPort to the main-thread Repo for CRDT sync.
    let slotRepo: Repo | null = null;
    if (this._mainRepo) {
      const adapter = new MessageChannelNetworkAdapter(mainPort);
      this._mainRepo.networkSubsystem.addNetworkAdapter(adapter);
      slotRepo = this._mainRepo;
    }

    const slot: BrowserSlot = {
      worker,
      mainPort,
      mainRepo:      slotRepo,
      phase:         "spawned",
      bootedAt:      null,
      lastLeaseAt:   null,
      lastReleaseAt: null,
      onEvent:       null,
    };
    this._slots.set(id, slot);

    // 4. Wire main-thread message listener for Worker → main messages.
    worker.addEventListener("message", (e: MessageEvent) => {
      if (!isWorkerToMainMsg(e.data)) return;
      const msg = e.data as WorkerToMainMsg;
      if (msg.type === "event" && this._onWorkerEvent) {
        this._onWorkerEvent(id, msg as WorkerMsg_Event);
      }
      if (msg.type === "fault") {
        console.error(`[browser-vm-manager] Worker fault (${id}): ${(msg as { error: string }).error}`);
        slot.phase = "disposed";
      }
    });

    // 5. Derive docUrl and coreHash from params.
    //    docUrl: use params.docUrl when provided so the Worker-side Repo calls
    //    repo.find(docUrl).whenReady() instead of waiting for gossip sync (Gap 4 fix).
    //    null = cold boot — Worker accepts whatever the mainRepo syncs via the port.
    const docUrl:   string | null = params.docUrl ?? null;
    const coreHash: string | null = null;

    // 6. Deliver manifest — transfer syncPort + coreBlob buffer to the sovereign island.
    //    pluginTiddlers, bagStack, recipeUri cross the boundary so the island can think
    //    from first breath (ea condition 3 — own truth from boot, not from a later delta).
    slot.phase = "booting";
    const manifestMsg = mkManifest(id, params.coreBlob, syncPort, docUrl, coreHash, {
      pluginTiddlers: params.pluginTiddlers,
      bagStack:       params.bagStack,
      recipeUri:      params.recipeUri,
    });
    const transferList: Transferable[] = [syncPort];
    if (params.coreBlob.buffer.byteLength > 0) transferList.push(params.coreBlob.buffer);
    worker.postMessage(manifestMsg, transferList);

    // 8. Await ea — Worker declares sovereignty; island is live.
    await _awaitWorkerMsg<WorkerMsg_Ea>(worker, "ea");

    slot.phase    = "live";
    slot.bootedAt = Date.now();
    return slot;
  }

  // ── Private — lease factory ───────────────────────────────────────────────

  private _makeLease(id: BrowserAuthorityId, slot: BrowserSlot): BrowserAuthorityLease {
    return {
      authorityId: id,
      get phase()        { return slot.phase; },
      get capabilities() { return _liveCapabilities(); },

      // @deprecated push-projection (S4) will replace these pull RPCs.
      filterTiddlers: async (_expr: string): Promise<string[]> => {
        // Stub — RPC extension deferred to S4 projection channel.
        return [];
      },
      renderMeme: async (_uri: string): Promise<string | null> => {
        // Stub — RPC extension deferred to S4 projection channel.
        return null;
      },
      projectionSnapshot: async (): Promise<BrowserProjectionSnapshot> => {
        return {
          authorityId: id,
          payload:     {},
          heads:       [],
          producedAt:  Date.now(),
        };
      },
      exportSnapshots: async (): Promise<Array<{ bagId: string; bytes: Uint8Array }>> => {
        return [];
      },
      debugStats: async (): Promise<BrowserAuthorityDebugStats> => ({
        authorityId:    id,
        phase:          slot.phase,
        bootDurationMs: slot.bootedAt != null ? slot.bootedAt - (slot.lastLeaseAt ?? slot.bootedAt) : null,
        lastLeaseAt:    slot.lastLeaseAt,
        lastReleaseAt:  slot.lastReleaseAt,
        heapBytes:      null,
      }),
      release: () => {
        slot.phase        = "idle";
        slot.lastReleaseAt = Date.now();
      },
    };
  }

  private _stubLease(id: BrowserAuthorityId): BrowserAuthorityLease {
    return {
      authorityId:        id,
      phase:              "disposed",
      capabilities:       _noCapabilities(),
      filterTiddlers:     async () => [],
      renderMeme:         async () => null,
      projectionSnapshot: async () => ({ authorityId: id, payload: {}, heads: [], producedAt: Date.now() }),
      exportSnapshots:    async () => [],
      debugStats:         async () => ({ authorityId: id, phase: "disposed", bootDurationMs: null, lastLeaseAt: null, lastReleaseAt: null, heapBytes: null }),
      release:            () => {},
    };
  }
}

// ── Capability helpers ────────────────────────────────────────────────────

import {
  BROWSER_AUTHORITY_CAPABILITIES_LIVE,
  BROWSER_AUTHORITY_CAPABILITIES_NONE,
} from "@lararium/mesh";

function _liveCapabilities() { return { ...BROWSER_AUTHORITY_CAPABILITIES_LIVE }; }
function _noCapabilities()   { return { ...BROWSER_AUTHORITY_CAPABILITIES_NONE }; }
