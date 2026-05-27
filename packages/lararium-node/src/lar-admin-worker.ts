/**
 * lar-admin-worker — Node.js admin Worker entry point.
 *
 * Sovereign admin island: owns its TW5 VM, full-recipe CompositeStore, and
 * IslandAdaptor. The JobDispatcher runs here, subscribed to the TW5 wiki
 * change event surface — the kumu device law. Jobs enter via the wiki event
 * tick; receipts write back to the admin CRDT via the Worker-side Repo.
 *
 * ## Worker Sovereignty Law — admin binding
 *
 *   1. Worker-side Repo syncs the admin + lararium + lares bags via syncPort.
 *   2. TW5 boots with all three bags seeded (full recipe for admin work).
 *   3. Volatile MemoryTiddlerStore receives unbagged writes (volatile job
 *      tiddlers, session scratch). Projection MemoryTiddlerStore holds $:/state/*.
 *   4. IslandAdaptor wires TW5 ↔ CompositeStore; admin CRDT bag is the write target.
 *   5. JobDispatcher subscribes to wiki change events — the tick surface.
 *   6. Wiki-scope jobs relay to main thread via AdminMsg_RelayJob; Worker
 *      awaits AdminMsg_JobResult before writing receipt.
 *   7. ea fires when all bags ready, TW5 seeded, drain loop running.
 *
 * ## Boot sequence
 *
 *   main                                Admin Worker
 *   ────                                ────────────
 *   new Worker(url)                     → thread boots
 *   postMessage(manifest, [syncPort])   → bootTw5
 *                                         wire Repo via syncPort
 *                                         await all relational handles
 *                                         build CompositeStore (CRDT+volatile+projection)
 *                                         wire IslandAdaptor
 *                                         wire JobDispatcher on wiki change events
 *                                         start setInterval drain loop
 *                                       ← ea
 *   postMessage(admin:place-job)        → placeVmJob → wiki change event → dispatch
 *                                       ← admin:relay-job  (wiki-scope verb)
 *   postMessage(admin:job-result)       → resolve relay → writeVmJobReceipt
 *   postMessage(teardown)               → stop drain loop, export doc bytes
 *                                       ← teardown:ack
 *   worker.terminate()                  → thread terminates
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/lar-admin-worker
 */

import { parentPort, MessagePort } from "worker_threads";
import { Repo } from "@automerge/automerge-repo";
import type { DocHandle, AnyDocumentId, StorageAdapterInterface } from "@automerge/automerge-repo";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import { save as automergeSave } from "@automerge/automerge";
import {
  CompositeStore,
  AutomergeDocStore,
  ADMIN_BAG_ID,
  BAG_IDS,
  isMainToWorkerMsg,
  mkTeardownAck,
  allTiddlersFromDoc,
  extractTiddlerDeltaFromPatches,
  mkAdminRelayJob,
  type WorkerMsg_Manifest,
  type WorkerStorageConfig,
  type BagBinding,
  type AdminMsg_PlaceJob,
  type AdminMsg_JobResult,
  type BatchMode,
  type JobTiddler,
} from "@lararium/mesh";
import {
  WorkerAuthorityHandler,
  IslandAdaptor,
  MemoryTiddlerStore,
  dispatchVmJobLifecycle,
  placeVmJob,
  writeVmJobReceipt,
} from "@lararium/tw5";
import type { WorkerToMainMsg } from "@lararium/mesh";
import { JobDispatcher, JobHandlerRegistry } from "./job-dispatcher.js";

if (!parentPort) {
  throw new Error("[lar-admin-worker] parentPort is null — must run as a Worker thread.");
}

const _port = parentPort;

// ── Handler ───────────────────────────────────────────────────────────────

const handler = new WorkerAuthorityHandler((msg: WorkerToMainMsg) => {
  _port.postMessage(msg);
});

// ── Worker-side Repo + bag handle map ─────────────────────────────────────

let _repo:             Repo | null                                        = null;
let _handles:          Map<string, DocHandle<Record<string, unknown>>>    = new Map();
let _writableHandleId: string | null                                      = null;
let _composite:        CompositeStore | null                              = null;
let _adaptor:          IslandAdaptor | null                               = null;
let _dispatcher:       JobDispatcher | null                               = null;

// ── Pending relay map — requestId → { resolve, reject } ──────────────────
// Admin Worker posts AdminMsg_RelayJob for wiki-scope jobs; main thread
// executes and returns AdminMsg_JobResult. This map holds the Promise resolvers.

const _pendingRelays = new Map<string, {
  resolve: (result: Record<string, unknown>) => void;
  reject:  (err: Error)                       => void;
}>();

// ── Storage adapter factory ───────────────────────────────────────────────

function _buildStorageAdapter(cfg: WorkerStorageConfig | undefined): StorageAdapterInterface | undefined {
  if (!cfg || cfg.type === "memory") return undefined;
  if (cfg.type === "nodefs") return new NodeFSStorageAdapter(cfg.dir);
  return undefined;
}

// ── setInterval drain loop ────────────────────────────────────────────────

const FRAME_INTERVAL_MS = 16;

let _pendingAdded:   Record<string, unknown>[] = [];
let _pendingDeleted: string[]                  = [];
let _intervalHandle: ReturnType<typeof setInterval> | null = null;
let _activeWikiUri                             = "";

function _startDrainLoop(): void {
  if (_intervalHandle !== null) return;
  _intervalHandle = setInterval(() => {
    const added   = _pendingAdded.splice(0);
    const deleted = _pendingDeleted.splice(0);
    if (added.length > 0 || deleted.length > 0) {
      handler.applyDelta(_activeWikiUri, added, deleted);
    }
    handler.sendChangesetAck(_activeWikiUri, crypto.randomUUID());
  }, FRAME_INTERVAL_MS);
  if (typeof _intervalHandle === "object" && _intervalHandle !== null && "unref" in _intervalHandle) {
    (_intervalHandle as { unref(): void }).unref();
  }
}

function _stopDrainLoop(): void {
  if (_intervalHandle !== null) {
    clearInterval(_intervalHandle);
    _intervalHandle = null;
  }
}

// ── Change-event payload shape ────────────────────────────────────────────

type DocChangePayload = {
  doc:     Record<string, unknown>;
  patches: ReadonlyArray<{ path: ReadonlyArray<string | number> }>;
};

function _subscribeHandle(bagId: string, handle: DocHandle<Record<string, unknown>>): void {
  handle.on("change", ({ doc, patches }: DocChangePayload) => {
    const delta = extractTiddlerDeltaFromPatches(doc, patches);
    if (delta.added.length > 0 || delta.deleted.length > 0) {
      _pendingAdded.push(...delta.added);
      _pendingDeleted.push(...delta.deleted);
    }
    void bagId;
  });
}

// ── Message dispatch ──────────────────────────────────────────────────────

_port.on("message", (raw: unknown) => {
  if (!isMainToWorkerMsg(raw)) return;

  if (raw.type === "manifest") {
    void _handleManifest(raw as WorkerMsg_Manifest & { syncPort?: MessagePort });
    return;
  }

  if (raw.type === "teardown" || raw.type === "demote") {
    void _handleTeardown();
    return;
  }

  if (raw.type === "admin:place-job") {
    _handlePlaceJob(raw as AdminMsg_PlaceJob);
    return;
  }

  if (raw.type === "admin:job-result") {
    _handleJobResult(raw as AdminMsg_JobResult);
    return;
  }
});

// ── PlaceJob — main thread places a job into the admin TW5 wiki ──────────

function _handlePlaceJob(msg: AdminMsg_PlaceJob): void {
  const tw5 = handler.tw5();
  if (!tw5) {
    console.warn("[lar-admin-worker] admin:place-job received before TW5 ready — dropped");
    return;
  }
  placeVmJob(tw5, {
    verb:        msg.verb,
    args:        msg.args,
    requestedBy: msg.requestedBy,
    ...(msg.targets   ? { targets:   msg.targets   } : {}),
    ...(msg.batchMode ? { batchMode: msg.batchMode as BatchMode } : {}),
    ...(msg.requestId ? { requestId: msg.requestId } : {}),
  });
}

// ── JobResult — main thread returns relay execution result ────────────────

function _handleJobResult(msg: AdminMsg_JobResult): void {
  const pending = _pendingRelays.get(msg.requestId);
  if (!pending) return;
  _pendingRelays.delete(msg.requestId);
  if (msg.error) {
    pending.reject(new Error(msg.error));
  } else {
    pending.resolve(msg.result ?? {});
  }
}

// ── Relay function — post AdminMsg_RelayJob and await AdminMsg_JobResult ──

function _relayToMain(job: JobTiddler): Promise<Record<string, unknown>> {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    _pendingRelays.set(job.requestId, { resolve, reject });
    _port.postMessage(mkAdminRelayJob({
      requestId:   job.requestId,
      verb:        job.verb,
      args:        job.args as Record<string, unknown>,
      requestedBy: job.requestedBy,
      ...(job.targets?.length ? { targets: [...job.targets] } : {}),
      ...(job.batchMode       ? { batchMode: String(job.batchMode) } : {}),
    }));
  });
}

// ── Manifest ──────────────────────────────────────────────────────────────

async function _handleManifest(msg: WorkerMsg_Manifest & { syncPort?: MessagePort }): Promise<void> {
  _activeWikiUri = msg.wikiUri;

  try {
    await handler.bootTw5(msg.wikiUri, msg.coreBlob, msg.pluginTiddlers);
  } catch {
    return;
  }

  const syncPort = msg.syncPort;
  if (!syncPort) {
    console.error("[lar-admin-worker] manifest missing syncPort — admin Worker cannot sync bags");
    return;
  }

  const storageAdapter = _buildStorageAdapter(msg.storage);
  _repo = new Repo({
    ...(storageAdapter ? { storage: storageAdapter } : {}),
    network: [new MessageChannelNetworkAdapter(syncPort as unknown as globalThis.MessagePort)],
    sharePolicy: async () => true,
  });

  // ── Build CompositeStore: CRDT bags + volatile + projection ─────────────
  // Layer order (lowest → highest priority):
  //   @lararium (island corpus)  — read-only CRDT
  //   @lares (personality)       — read-only CRDT
  //   @admin (operator infra)    — writable CRDT, defaultWritable:false
  //   volatile MemoryTiddlerStore — defaultWritable:true (volatile job tiddlers)
  //   projection MemoryTiddlerStore — defaultWritable:false ($:/state/*)

  _composite = new CompositeStore();

  // Await all relational bindings in bagBindings order.
  const bindings = msg.bagBindings ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const readyHandles: Array<{ bagId: string; handle: DocHandle<any>; writable: boolean }> = [];

  for (const binding of bindings) {
    if (binding.mode !== "relational") continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle = await _repo.find<any>(binding.docUrl as AnyDocumentId);
    await handle.whenReady();
    _handles.set(binding.bagId, handle);
    readyHandles.push({ bagId: binding.bagId, handle, writable: binding.writable });
    if (binding.writable && _writableHandleId === null) _writableHandleId = binding.bagId;
  }

  // Add CRDT layers to composite in recipe order.
  for (const { bagId, handle, writable } of readyHandles) {
    const store = new AutomergeDocStore(handle, bagId);
    const isAdmin = bagId === ADMIN_BAG_ID;
    // Admin CRDT store: mark sync complete (doc is already local via main Repo + sync).
    if (isAdmin) store.markSyncComplete();
    _composite.addLayer({
      bagId,
      store,
      writable,
      defaultWritable: false,
    });
  }

  // Volatile layer — session-local writes (placeVmJob writes land here).
  // defaultWritable:true so unbagged TW5 saves (job tiddlers, session scratch) land here.
  _composite.addLayer({
    bagId:           "volatile",
    store:           new MemoryTiddlerStore(),
    writable:        true,
    defaultWritable: true,
  });

  // Projection layer — runtime state ($:/state/*, $:/HistoryList) never persisted.
  _composite.addLayer({
    bagId:           BAG_IDS.projection,
    store:           new MemoryTiddlerStore(),
    writable:        true,
    defaultWritable: false,
  });

  // ── Wire IslandAdaptor ────────────────────────────────────────────────────
  // IslandAdaptor(tw5, composite, writeBagId) — outbound writes target admin CRDT.
  // composite.addProjection wires inbound CRDT changes → TW5 wiki.

  const tw5 = handler.tw5()!;
  _adaptor = new IslandAdaptor(tw5, _composite, ADMIN_BAG_ID);
  _composite.addProjection(_adaptor);

  // ── Seed TW5 from all CRDT bags ──────────────────────────────────────────
  const initialAdded: Record<string, unknown>[] = [];
  for (const { handle } of readyHandles) {
    const doc = handle.doc();
    if (doc) initialAdded.push(...allTiddlersFromDoc(doc as Record<string, unknown>));
  }
  if (initialAdded.length > 0) handler.applyDelta(msg.wikiUri, initialAdded, []);

  // ── Subscribe handles for live change events ──────────────────────────────
  for (const { bagId, handle } of readyHandles) {
    _subscribeHandle(bagId, handle);
  }

  // ── Wire JobDispatcher on admin TW5 wiki change surface ──────────────────
  // Empty local registry — all verbs relay to main thread.
  // The TW5 wiki change event IS the tick surface; kumu devices register here.
  const adminRegistry = new JobHandlerRegistry();
  _dispatcher = new JobDispatcher({
    adminVm:  tw5,
    admin:    _composite,
    registry: adminRegistry,
    relayFn:  _relayToMain,
  });
  _dispatcher.start();

  _startDrainLoop();
  handler.sendEa(msg.wikiUri);
}

// ── Teardown ──────────────────────────────────────────────────────────────

async function _handleTeardown(): Promise<void> {
  _stopDrainLoop();
  _dispatcher?.stop();
  handler.teardown();

  let docBytes: Uint8Array | undefined;
  try {
    const primaryHandle = _writableHandleId ? _handles.get(_writableHandleId) : undefined;
    const rawDoc = primaryHandle?.doc?.();
    if (rawDoc) docBytes = automergeSave(rawDoc as Parameters<typeof automergeSave>[0]);
  } catch {
    // Export failed — teardown:ack fires without docBytes.
  }

  _handles.clear();
  _writableHandleId = null;
  _composite        = null;
  _adaptor          = null;
  _dispatcher       = null;
  _repo             = null;

  const ackOpts: { docBytes?: Uint8Array } = {};
  if (docBytes !== undefined) ackOpts.docBytes = docBytes;
  _port.postMessage(mkTeardownAck(ackOpts));
}
