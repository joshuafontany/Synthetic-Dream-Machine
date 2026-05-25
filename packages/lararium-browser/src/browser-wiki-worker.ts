/**
 * browser-wiki-worker — browser Web Worker entry point for wiki authorities.
 *
 * ## Worker Sovereignty Law — browser binding
 *
 *   This file implements the isomorphic Worker Sovereignty Law for the browser vessel:
 *
 *   1. Worker boots a Repo-in-Worker via the transferred `syncPort` (MessagePort).
 *   2. Worker derives tiddler state from its own CRDT doc — never from main-thread deltas.
 *   3. Worker owns its timing via `requestAnimationFrame` (Chromium/Firefox) with a
 *      `setTimeout(16ms)` fallback for Safari, which has not shipped rAF in Workers.
 *      Incoming CRDT changes accumulate in `_pendingAdded` / `_pendingDeleted`;
 *      the drain callback fires each frame (or frame-equivalent tick).
 *   4. `changeset:ack` fires at the END of each rAF drain — frame-completion signal.
 *   5. `WorkerMsg_Changeset` from main thread — removed. Own Repo-in-Worker CRDT truth only.
 *
 * ## Boot sequence
 *
 *   main                               Worker
 *   ────                               ──────
 *   new Worker(url)                    → thread boots
 *   postMessage(manifest, [syncPort])  → bootTw5 + wire Repo via syncPort
 *                                        await repo.find(docUrl).whenReady()
 *                                        apply initial tiddlers from doc
 *                                        start rAF drain loop
 *                                      ← ea
 *   [CRDT sync flows via syncPort]     → Repo change → rAF accumulator
 *                                      ← changeset:ack (frame signal per rAF drain)
 *                                      ← event (verse-event reaction)
 *   postMessage(teardown)              → cancel handles, export Repo doc bytes
 *                                      ← teardown:ack (docBytes + snapshotTiddlers)
 *   worker.terminate()                 → thread terminates
 *
 * DOM types do not appear in this file (BA-1). `self` is the sole platform surface.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-wiki-worker
 */

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

// ── Handler ───────────────────────────────────────────────────────────────

const handler = new WorkerAuthorityHandler((msg: WorkerToMainMsg) => {
  self.postMessage(msg);
});

// ── Worker-side Repo + tracked doc handle (set on manifest) ─────────────

let _repo:      Repo | null                                = null;
let _docHandle: DocHandle<Record<string, unknown>> | null  = null;

// ── rAF accumulator — Worker-owned timing ─────────────────────────────────

let _pendingAdded:   Record<string, unknown>[] = [];
let _pendingDeleted: string[]                  = [];
let _rafScheduled                              = false;
let _activeWikiUri                             = "";

// Safari does not ship requestAnimationFrame in DedicatedWorkerGlobalScope.
// Fall back to a 16ms setTimeout (≈60fps) so the drain loop runs on all browsers.
const _scheduleFrame: (cb: () => void) => void =
  typeof self.requestAnimationFrame === "function"
    ? (cb) => self.requestAnimationFrame(cb)
    : (cb) => setTimeout(cb, 16);

function _scheduleRafDrain(): void {
  if (_rafScheduled) return;
  _rafScheduled = true;
  _scheduleFrame(() => {
    _rafScheduled = false;
    const added   = _pendingAdded.splice(0);
    const deleted = _pendingDeleted.splice(0);
    if (added.length > 0 || deleted.length > 0) {
      handler.applyDelta(_activeWikiUri, added, deleted);
    }
    // Frame-completion signal — Worker Sovereignty Law §4.
    handler.sendChangesetAck(_activeWikiUri, crypto.randomUUID());
  });
}

// ── Message dispatch ──────────────────────────────────────────────────────

self.addEventListener("message", (e: MessageEvent) => {
  const raw = e.data;
  if (!isMainToWorkerMsg(raw)) return;

  if (raw.type === "manifest") {
    void _handleManifest(raw as WorkerMsg_Manifest);
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
      _scheduleRafDrain();
    }
  });
}

// ── Manifest ──────────────────────────────────────────────────────────────

async function _handleManifest(msg: WorkerMsg_Manifest): Promise<void> {
  _activeWikiUri = msg.wikiUri;

  // 1. Boot TW5 with plugin layer — plugins are prerequisite, not cargo.
  //    Without pluginTiddlers, the island boots hollow (no sigils, no ahu, no pranala).
  try {
    await handler.bootTw5(msg.wikiUri, msg.coreBlob, msg.pluginTiddlers);
  } catch {
    return; // fault already sent by bootTw5
  }

  // 2. Wire Worker-side Repo via the transferred sync port.
  _repo = new Repo({
    network: [new MessageChannelNetworkAdapter(msg.syncPort)],
    sharePolicy: async () => true,
  });

  // 3a. Known doc: find, await sync, seed TW5, subscribe to changes.
  if (msg.docUrl) {
    const handle = await _repo.find<Record<string, unknown>>(msg.docUrl as AnyDocumentId);
    await handle.whenReady();
    _docHandle = handle;

    const doc = handle.doc();
    if (doc) {
      const initial = allTiddlersFromDoc(doc);
      if (initial.length > 0) handler.applyDelta(msg.wikiUri, initial, []);
    }
    _subscribeHandle(handle);
  }
  // 3b. Cold boot: Repo starts empty; doc arrives via sync from main-thread Repo.
  else {
    _repo.on("document", ({ handle: h }: { handle: DocHandle<Record<string, unknown>> }) => {
      void h.whenReady().then(() => {
        _docHandle = h;
        const doc = h.doc();
        if (doc) {
          const initial = allTiddlersFromDoc(doc);
          if (initial.length > 0) handler.applyDelta(msg.wikiUri, initial, []);
        }
        _subscribeHandle(h);
      });
    });
  }

  // 4. Island is live.
  handler.sendEa(msg.wikiUri);
}

// ── Teardown ──────────────────────────────────────────────────────────────

async function _handleTeardown(): Promise<void> {
  const { snapshotTiddlers } = handler.teardown();

  // Export Repo doc bytes for warm re-boot — CRDT truth over tiddler snapshot.
  let docBytes: Uint8Array | undefined;
  try {
    const rawDoc = _docHandle?.doc?.();
    if (rawDoc) docBytes = automergeSave(rawDoc as Parameters<typeof automergeSave>[0]);
  } catch {
    // Export failed — teardown:ack fires without docBytes.
  }
  _docHandle = null;
  _repo      = null;

  // exactOptionalPropertyTypes: only include defined fields.
  const ackOpts: { docBytes?: Uint8Array; snapshotTiddlers?: typeof snapshotTiddlers } = {};
  if (docBytes !== undefined)          ackOpts.docBytes          = docBytes;
  if (snapshotTiddlers.length > 0)     ackOpts.snapshotTiddlers  = snapshotTiddlers;
  self.postMessage(mkTeardownAck(ackOpts));
}
