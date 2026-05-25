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
 *   5. `WorkerMsg_Changeset` from main thread is handled as a deprecated GP-3 fallback
 *      while NodeVmManager completes its migration to Repo-in-Worker.
 *
 * ## Deprecation intent
 *
 *   NodeVmManager's GP-3 oracle path (`_subscribeDocChanges`, `routeChangeset`,
 *   `changesetQueue`) is marked @deprecated. Once NodeVmManager wires a MessageChannel
 *   per slot and sends `docUrl` in the promote message, the GP-3 changeset path here
 *   becomes unreachable and can be removed.
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
 *                                       ← teardown:ack (docBytes + snapshotTiddlers)
 *   worker.terminate()                  → thread terminates
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/lar-wiki-worker
 */

import { parentPort, MessagePort } from "worker_threads";
import { Repo } from "@automerge/automerge-repo";
import type { DocHandle, AnyDocumentId } from "@automerge/automerge-repo";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";
import { save as automergeSave } from "@automerge/automerge";
import { WorkerAuthorityHandler } from "@lararium/tw5";
import {
  isMainToWorkerMsg,
  mkTeardownAck,
  extractTiddlerDeltaFromPatches,
  allTiddlersFromDoc,
} from "@lararium/mesh";
import type { WorkerToMainMsg, WorkerMsg_Manifest } from "@lararium/mesh";

if (!parentPort) {
  throw new Error("[lar-wiki-worker] parentPort is null — must run as a Worker thread.");
}

const _port = parentPort;

// ── Handler ───────────────────────────────────────────────────────────────

const handler = new WorkerAuthorityHandler((msg: WorkerToMainMsg) => {
  _port.postMessage(msg);
});

// ── Worker-side Repo + tracked doc handle ─────────────────────────────────

let _repo:      Repo | null                                = null;
let _docHandle: DocHandle<Record<string, unknown>> | null  = null;

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

function _subscribeHandle(handle: DocHandle<Record<string, unknown>>): void {
  handle.on("change", ({ doc, patches }: DocChangePayload) => {
    const delta = extractTiddlerDeltaFromPatches(doc, patches);
    if (delta.added.length > 0 || delta.deleted.length > 0) {
      _pendingAdded.push(...delta.added);
      _pendingDeleted.push(...delta.deleted);
    }
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

  // @deprecated GP-3 fallback: main-thread oracle delta (NodeVmManager pre-migration).
  // Repo-in-Worker path never reaches here — CRDT sync flows via syncPort.
  if (raw.type === "changeset") {
    _pendingAdded.push(...(raw.added as Record<string, unknown>[]));
    _pendingDeleted.push(...(raw.deleted as string[]));
  }
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
    _repo = new Repo({
      network: [new MessageChannelNetworkAdapter(syncPort as unknown as globalThis.MessagePort)],
      sharePolicy: async () => true,
    });

    if (msg.docUrl) {
      const handle = await _repo.find<Record<string, unknown>>(msg.docUrl as AnyDocumentId);
      await handle.whenReady();
      _docHandle = handle;

      const doc = handle.doc();
      if (doc) {
        const initial = allTiddlersFromDoc(doc as Record<string, unknown>);
        if (initial.length > 0) handler.applyDelta(msg.wikiUri, initial, []);
      }
      _subscribeHandle(handle);
    } else {
      _repo.on("document", ({ handle: h }: { handle: DocHandle<Record<string, unknown>> }) => {
        void h.whenReady().then(() => {
          _docHandle = h;
          const doc  = h.doc();
          if (doc) {
            const initial = allTiddlersFromDoc(doc as Record<string, unknown>);
            if (initial.length > 0) handler.applyDelta(msg.wikiUri, initial, []);
          }
          _subscribeHandle(h);
        });
      });
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
  const { snapshotTiddlers } = handler.teardown();

  let docBytes: Uint8Array | undefined;
  try {
    const rawDoc = _docHandle?.doc?.();
    if (rawDoc) docBytes = automergeSave(rawDoc as Parameters<typeof automergeSave>[0]);
  } catch {
    // Export failed — teardown:ack fires without docBytes.
  }
  _docHandle = null;
  _repo      = null;

  const ackOpts: { docBytes?: Uint8Array; snapshotTiddlers?: typeof snapshotTiddlers } = {};
  if (docBytes !== undefined)       ackOpts.docBytes         = docBytes;
  if (snapshotTiddlers.length > 0)  ackOpts.snapshotTiddlers = snapshotTiddlers;
  _port.postMessage(mkTeardownAck(ackOpts));
}
