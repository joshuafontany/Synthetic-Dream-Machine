/**
 * lar-wiki-worker — Node.js wiki Worker entry point.
 *
 * Sovereign wiki island: owns its TW5 VM, full-recipe CompositeStore, and
 * IslandAdaptor. Wiki Workers hold a read-dominant recipe — CRDT bags flow
 * inbound; TW5 session writes (UI state, scratch) land in the volatile layer.
 *
 * ## Worker Sovereignty Law — Node.js binding (full recipe)
 *
 *   1. Worker-side Repo syncs all bound bags via syncPort.
 *   2. TW5 boots with all bags seeded (full recipe in binding order).
 *   3. Volatile MemoryTiddlerStore receives unbagged TW5 saves (UI state,
 *      session scratch). defaultWritable:true so TW5 saves land here.
 *   4. Projection MemoryTiddlerStore holds $:/state/* and $:/HistoryList.
 *      Never persisted — evaporates on teardown. defaultWritable:false.
 *   5. IslandAdaptor wires TW5 ↔ CompositeStore; volatile bag is write target.
 *      CRDT bags remain read-only — wiki Workers do not write back to CRDT.
 *   6. `ea` fires when all bags ready, TW5 seeded, drain loop running.
 *
 * ## Boot sequence
 *
 *   main                                Wiki Worker
 *   ────                                ───────────
 *   new Worker(url)                     → thread boots
 *   postMessage(manifest, [syncPort])   → bootTw5
 *                                         wire Repo via syncPort
 *                                         await all relational handles
 *                                         build CompositeStore (CRDT+volatile+projection)
 *                                         wire IslandAdaptor
 *                                         seed TW5 from all CRDT bags
 *                                         start setInterval drain loop
 *                                       ← ea
 *   [CRDT sync via syncPort]            → Repo change → accumulator
 *                                       ← changeset:ack (drain tick)
 *   postMessage(teardown)               → stop drain loop, export CRDT doc bytes
 *                                       ← teardown:ack (docBytes)
 *   worker.terminate()                  → thread terminates
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/lar-wiki-worker
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
  BAG_IDS,
  isMainToWorkerMsg,
  mkTeardownAck,
  extractTiddlerDeltaFromPatches,
  allTiddlersFromDoc,
  type WorkerMsg_Manifest,
  type WorkerStorageConfig,
} from "@lararium/mesh";
import {
  WorkerAuthorityHandler,
  IslandAdaptor,
  MemoryTiddlerStore,
} from "@lararium/tw5";
import type { WorkerToMainMsg } from "@lararium/mesh";

if (!parentPort) {
  throw new Error("[lar-wiki-worker] parentPort is null — must run as a Worker thread.");
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

// ── Storage adapter factory ───────────────────────────────────────────────

function _buildStorageAdapter(cfg: WorkerStorageConfig | undefined): StorageAdapterInterface | undefined {
  if (!cfg || cfg.type === "memory") return undefined;
  if (cfg.type === "nodefs") return new NodeFSStorageAdapter(cfg.dir);
  return undefined;
}

// ── setInterval drain loop — Worker-owned timing (Node path) ──────────────

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

  // GP-3 "changeset" handler removed. Sovereign islands derive state from their own
  // Repo-in-Worker CRDT doc — never from main-thread oracle deltas.
});

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
    // No syncPort: GP-3 deprecated path — start drain loop with empty composite.
    _startDrainLoop();
    handler.sendEa(msg.wikiUri);
    return;
  }

  const storageAdapter = _buildStorageAdapter(msg.storage);
  _repo = new Repo({
    ...(storageAdapter ? { storage: storageAdapter } : {}),
    network: [new MessageChannelNetworkAdapter(syncPort as unknown as globalThis.MessagePort)],
    sharePolicy: async () => true,
  });

  // ── Build CompositeStore: CRDT bags + volatile + projection ──────────────
  // Layer order (lowest → highest priority):
  //   bound CRDT bags (recipe order) — read-only
  //   volatile MemoryTiddlerStore    — defaultWritable:true (TW5 session saves)
  //   projection MemoryTiddlerStore  — defaultWritable:false ($:/state/*)

  _composite = new CompositeStore();

  const bindings     = msg.bagBindings ?? [];
  const hasCold      = bindings.some(b => b.mode === "cold");
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

  // Add CRDT layers to composite in recipe order — all read-only for wiki Workers.
  for (const { bagId, handle } of readyHandles) {
    const store = new AutomergeDocStore(handle, bagId);
    store.markSyncComplete();
    _composite.addLayer({
      bagId,
      store,
      writable:        false,
      defaultWritable: false,
    });
  }

  // Volatile layer — TW5 session writes (UI state, scratch). Never persisted.
  _composite.addLayer({
    bagId:           "volatile",
    store:           new MemoryTiddlerStore(),
    writable:        true,
    defaultWritable: true,
  });

  // Projection layer — $:/state/*, $:/HistoryList. Never persisted.
  _composite.addLayer({
    bagId:           BAG_IDS.projection,
    store:           new MemoryTiddlerStore(),
    writable:        true,
    defaultWritable: false,
  });

  // ── Wire IslandAdaptor ────────────────────────────────────────────────────
  // Write target = "volatile" — TW5 outbound saves land here, not in any CRDT bag.
  // CRDT bags remain read-only for wiki Workers.

  const tw5 = handler.tw5()!;
  _adaptor = new IslandAdaptor(tw5, _composite, "volatile");
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

  // Cold-mode gossip fallback for legacy/cold bindings.
  if (hasCold || bindings.length === 0) {
    const legacyCold = bindings.length === 0 && !msg.docUrl;
    if (legacyCold || bindings.some(b => b.mode === "cold")) {
      _repo.on("document", ({ handle: h }: { handle: DocHandle<Record<string, unknown>> }) => {
        void h.whenReady().then(() => {
          const coldBagId = bindings.find(b => b.mode === "cold")?.bagId ?? msg.wikiUri;
          _handles.set(coldBagId, h);
          if (_writableHandleId === null) _writableHandleId = coldBagId;
          const doc = h.doc();
          if (doc) {
            const initial = allTiddlersFromDoc(doc as Record<string, unknown>);
            if (initial.length > 0) handler.applyDelta(msg.wikiUri, initial, []);
          }
          _subscribeHandle(coldBagId, h);
        });
      });
    }
  }

  _startDrainLoop();
  handler.sendEa(msg.wikiUri);
}

// ── Teardown ──────────────────────────────────────────────────────────────

async function _handleTeardown(): Promise<void> {
  _stopDrainLoop();
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
  _repo             = null;

  const ackOpts: { docBytes?: Uint8Array } = {};
  if (docBytes !== undefined) ackOpts.docBytes = docBytes;
  _port.postMessage(mkTeardownAck(ackOpts));
}
