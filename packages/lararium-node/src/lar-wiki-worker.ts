/**
 * lar-wiki-worker — Node.js wiki Worker entry point.
 *
 * ## Worker Sovereignty Law — Node.js binding
 *
 *   This file implements the isomorphic Worker Sovereignty Law for the Node vessel:
 *
 *   1. Worker boots a Repo-in-Worker via the transferred `syncPort` (MessagePort from worker_threads).
 *   2. Worker derives tiddler state from its own CRDT doc — never from main-thread oracle deltas.
 *   3. Worker owns its timing via `setInterval` (rAF unavailable in Node worker_threads).
 *      Incoming CRDT changes accumulate; the interval drains them each tick.
 *   4. `changeset:ack` fires at each drain tick — frame-completion signal.
 *   5. `WorkerMsg_Changeset` from main thread — removed. Sovereign islands derive state
 *      from their own Repo-in-Worker CRDT doc only (ea condition 3: own truth).
 *
 * ## Boot sequence
 *
 *   main                                Worker
 *   ────                                ──────
 *   new Worker(url)                     → thread boots
 *   postMessage(manifest, [syncPort])   → bootTw5 + wire Repo via syncPort
 *                                         await repo.find(docUrl).whenReady()
 *                                         start setInterval drain loop
 *                                       ← ea
 *   [CRDT sync via syncPort]            → Repo change → accumulator
 *                                       ← changeset:ack (drain tick signal)
 *   postMessage(teardown)               → cancel handles, export Repo doc bytes
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
import { WorkerAuthorityHandler } from "@lararium/tw5";
import {
  isMainToWorkerMsg,
  mkTeardownAck,
  extractTiddlerDeltaFromPatches,
  allTiddlersFromDoc,
} from "@lararium/mesh";
import type { WorkerToMainMsg, WorkerMsg_Manifest, WorkerStorageConfig } from "@lararium/mesh";

if (!parentPort) {
  throw new Error("[lar-wiki-worker] parentPort is null — must run as a Worker thread.");
}

const _port = parentPort;

// ── Handler ───────────────────────────────────────────────────────────────

const handler = new WorkerAuthorityHandler((msg: WorkerToMainMsg) => {
  _port.postMessage(msg);
});

// ── Worker-side Repo + multi-doc handle map (Sprint 2) ───────────────────
// _handles: bagId → DocHandle, keyed in bagBindings order.
// _writableHandleId: first writable bagId, used for teardown docBytes export.

let _repo:              Repo | null                                        = null;
let _handles:           Map<string, DocHandle<Record<string, unknown>>>    = new Map();
let _writableHandleId:  string | null                                      = null;

// ── Storage adapter factory ───────────────────────────────────────────────

function _buildStorageAdapter(cfg: WorkerStorageConfig | undefined): StorageAdapterInterface | undefined {
  if (!cfg || cfg.type === "memory") return undefined;
  if (cfg.type === "nodefs") return new NodeFSStorageAdapter(cfg.dir);
  // idb is browser-only — cannot reach here in Node worker.
  return undefined;
}

// ── setInterval accumulator — Worker-owned timing (Node path) ─────────────
// Node worker_threads does not provide requestAnimationFrame.
// A 16ms interval approximates 60fps frame cadence.

const FRAME_INTERVAL_MS = 16;

let _pendingAdded:    Record<string, unknown>[] = [];
let _pendingDeleted:  string[]                  = [];
let _intervalHandle:  ReturnType<typeof setInterval> | null = null;
let _activeWikiUri                              = "";

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
  // Do not keep the process alive solely for the drain loop.
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
    void bagId; // reserved for Sprint 3 priority-ordered merge
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
  // Repo-in-Worker CRDT doc — never from main-thread oracle deltas. See ea doctrine:
  // lar:///ha.ka.ba/@lares/v0.1/api/pono/ea (condition 3: own truth).
});

// ── Manifest ──────────────────────────────────────────────────────────────

async function _handleManifest(msg: WorkerMsg_Manifest & { syncPort?: MessagePort }): Promise<void> {
  _activeWikiUri = msg.wikiUri;

  try {
    await handler.bootTw5(msg.wikiUri, msg.coreBlob, msg.pluginTiddlers);
  } catch {
    return;
  }

  // Wire Worker-side Repo if syncPort transferred.
  const syncPort = msg.syncPort;
  if (syncPort) {
    const storageAdapter = _buildStorageAdapter(msg.storage);
    _repo = new Repo({
      ...(storageAdapter ? { storage: storageAdapter } : {}),
      network: [new MessageChannelNetworkAdapter(syncPort as unknown as globalThis.MessagePort)],
      sharePolicy: async () => true,
    });

    const bindings = msg.bagBindings ?? [];
    const hasCold  = bindings.some(b => b.mode === "cold");

    // Await all relational handles in recipe order, then seed TW5 once with all bags.
    const readyHandles: Array<{ bagId: string; handle: DocHandle<Record<string, unknown>> }> = [];
    for (const binding of bindings) {
      if (binding.mode !== "relational") continue;
      const handle = await _repo.find<Record<string, unknown>>(binding.docUrl as AnyDocumentId);
      await handle.whenReady();
      _handles.set(binding.bagId, handle);
      readyHandles.push({ bagId: binding.bagId, handle });
      if (binding.writable && _writableHandleId === null) _writableHandleId = binding.bagId;
    }

    // Seed TW5 from all ready bags in recipe order.
    const initialAdded: Record<string, unknown>[] = [];
    for (const { handle } of readyHandles) {
      const doc = handle.doc();
      if (doc) initialAdded.push(...allTiddlersFromDoc(doc as Record<string, unknown>));
    }
    if (initialAdded.length > 0) handler.applyDelta(msg.wikiUri, initialAdded, []);

    // Subscribe each handle for live change events.
    for (const { bagId, handle } of readyHandles) {
      _subscribeHandle(bagId, handle);
    }

    // Cold-mode fallback: doc arrives via gossip from the relay Repo.
    if (hasCold || bindings.length === 0) {
      // Shim: handle legacy docUrl cold-boot path (no bagBindings cold entries yet in Sprint 1→2).
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
  }
  // No syncPort: GP-3 deprecated path — NodeVmManager sends changesets directly.
  // The setInterval drain loop still runs so changeset batches apply at tick cadence.

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
  _repo             = null;

  const ackOpts: { docBytes?: Uint8Array } = {};
  if (docBytes !== undefined) ackOpts.docBytes = docBytes;
  _port.postMessage(mkTeardownAck(ackOpts));
}
