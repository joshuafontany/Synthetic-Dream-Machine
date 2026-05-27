/**
 * browser-sovereign-worker-model — browser Web Worker sovereign lifecycle kernel.
 *
 * Browser-platform parallel to sovereign-worker-model.ts (Node). Identical
 * structure; platform deltas:
 *   - drain loop: requestAnimationFrame (setTimeout 16ms fallback for Safari)
 *   - message I/O: self.postMessage / self.addEventListener
 *   - storage: IndexedDBStorageAdapter
 *
 * ## Recipe law — sub-surface layers (same as Node model)
 *
 *   bagBindings (CRDT, recipe order)
 *   └── scratch MemoryTiddlerStore  (defaultWritable:true)          ← local VM only
 *   └── projection MemoryTiddlerStore (defaultWritable:false)       ← $:/state/*
 *
 * ## VM Pool alignment
 *
 *   Browser vessel: Admin Worker (sovereign island) + Pinned (primary wiki)
 *                   + N hot Workers (session wikis, LRU-evicted to cold)
 *   Every hot Worker runs via runBrowserSovereignWorker(behavior).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-sovereign-worker-model
 */

import { Repo } from "@automerge/automerge-repo";
import type { DocHandle, AnyDocumentId, StorageAdapterInterface } from "@automerge/automerge-repo";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
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
import type { TW5Engine } from "@lararium/tw5";

// ── WorkerBehavior — shared interface (mirrors Node sovereign-worker-model) ─

export interface BrowserWorkerContext {
  wikiUri:   string;
  composite: CompositeStore;
  tw5:       TW5Engine;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handles:   Map<string, DocHandle<any>>;
  post:      (msg: WorkerToMainMsg) => void;
}

export interface BrowserWorkerBehavior {
  writeBagId:  string;
  onReady(ctx: BrowserWorkerContext): void | Promise<void>;
  onMessage(type: string, raw: unknown, ctx: BrowserWorkerContext): boolean;
  onTeardown(ctx: BrowserWorkerContext): void | Promise<void>;
}

// ── runBrowserSovereignWorker — the browser gen_server ───────────────────

export function runBrowserSovereignWorker(behavior: BrowserWorkerBehavior): void {
  const _post = (msg: WorkerToMainMsg) => self.postMessage(msg);
  const handler = new WorkerAuthorityHandler(_post);

  let _repo:             Repo | null            = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let _handles:          Map<string, DocHandle<any>> = new Map();
  let _writableHandleId: string | null          = null;
  let _composite:        CompositeStore | null  = null;
  let _ctx:              BrowserWorkerContext | null = null;

  // ── rAF drain loop ────────────────────────────────────────────────────────
  // Safari does not ship requestAnimationFrame in DedicatedWorkerGlobalScope.

  let _pendingAdded:   Record<string, unknown>[] = [];
  let _pendingDeleted: string[]                  = [];
  let _rafScheduled                              = false;
  let _tornDown                                  = false;
  let _activeWikiUri                             = "";

  const _scheduleFrame: (cb: () => void) => void =
    typeof self.requestAnimationFrame === "function"
      ? (cb) => self.requestAnimationFrame(cb)
      : (cb) => setTimeout(cb, 16);

  function _scheduleDrain(): void {
    if (_rafScheduled || _tornDown) return;
    _rafScheduled = true;
    _scheduleFrame(() => {
      _rafScheduled = false;
      if (_tornDown) return;
      const added   = _pendingAdded.splice(0);
      const deleted = _pendingDeleted.splice(0);
      if (added.length > 0 || deleted.length > 0) {
        handler.applyDelta(_activeWikiUri, added, deleted);
      }
      handler.sendChangesetAck(_activeWikiUri, crypto.randomUUID());
    });
  }

  // ── Handle subscription ───────────────────────────────────────────────────

  type DocChangePayload = {
    doc:     Record<string, unknown>;
    patches: ReadonlyArray<{ path: ReadonlyArray<string | number> }>;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function _subscribe(bagId: string, handle: DocHandle<any>): void {
    handle.on("change", ({ doc, patches }: DocChangePayload) => {
      const delta = extractTiddlerDeltaFromPatches(doc, patches);
      if (delta.added.length > 0 || delta.deleted.length > 0) {
        _pendingAdded.push(...delta.added);
        _pendingDeleted.push(...delta.deleted);
        _scheduleDrain();
      }
      void bagId;
    });
  }

  // ── Storage ───────────────────────────────────────────────────────────────

  function _buildStorage(cfg: WorkerStorageConfig | undefined): StorageAdapterInterface | undefined {
    if (!cfg || cfg.type === "memory") return undefined;
    if (cfg.type === "idb") return new IndexedDBStorageAdapter(cfg.dbName);
    return undefined;
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

    if (_ctx && behavior.onMessage(raw.type, raw, _ctx)) return;
  });

  // ── Manifest (OTP init) ───────────────────────────────────────────────────

  async function _handleManifest(msg: WorkerMsg_Manifest): Promise<void> {
    _activeWikiUri = msg.wikiUri;

    try {
      await handler.bootTw5(msg.wikiUri, msg.coreBlob, msg.pluginTiddlers);
    } catch {
      return;
    }

    const storageAdapter = _buildStorage(msg.storage);
    _repo = new Repo({
      ...(storageAdapter ? { storage: storageAdapter } : {}),
      network: [new MessageChannelNetworkAdapter(msg.syncPort)],
      sharePolicy: async () => true,
    });

    _composite = new CompositeStore();

    const bindings = msg.bagBindings ?? [];
    const hasCold  = bindings.some(b => b.mode === "cold");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ready: Array<{ bagId: string; handle: DocHandle<any>; writable: boolean }> = [];

    for (const binding of bindings) {
      if (binding.mode !== "relational") continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await _repo.find<any>(binding.docUrl as AnyDocumentId);
      await handle.whenReady();
      _handles.set(binding.bagId, handle);
      ready.push({ bagId: binding.bagId, handle, writable: binding.writable });
      if (binding.writable && _writableHandleId === null) _writableHandleId = binding.bagId;
    }

    for (const { bagId, handle, writable } of ready) {
      const store = new AutomergeDocStore(handle, bagId);
      store.markSyncComplete();
      _composite.addLayer({ bagId, store, writable, defaultWritable: false });
    }

    // Sub-surface layers — always present, below all CRDT bags.
    _composite.addLayer({
      bagId: BAG_IDS.scratch, store: new MemoryTiddlerStore(),
      writable: true, defaultWritable: true,
    });
    _composite.addLayer({
      bagId: BAG_IDS.projection, store: new MemoryTiddlerStore(),
      writable: true, defaultWritable: false,
    });

    const tw5 = handler.tw5()!;
    const adaptor = new IslandAdaptor(tw5, _composite, behavior.writeBagId);
    _composite.addProjection(adaptor);

    const seed: Record<string, unknown>[] = [];
    for (const { handle } of ready) {
      const doc = handle.doc();
      if (doc) seed.push(...allTiddlersFromDoc(doc));
    }
    if (seed.length > 0) handler.applyDelta(msg.wikiUri, seed, []);

    for (const { bagId, handle } of ready) _subscribe(bagId, handle);

    if (hasCold || bindings.length === 0) {
      _repo.on("document", ({ handle: h }: { handle: DocHandle<Record<string, unknown>> }) => {
        void h.whenReady().then(() => {
          const coldBagId = bindings.find(b => b.mode === "cold")?.bagId ?? msg.wikiUri;
          _handles.set(coldBagId, h);
          if (_writableHandleId === null) _writableHandleId = coldBagId;
          const doc = h.doc();
          if (doc) {
            const init = allTiddlersFromDoc(doc);
            if (init.length > 0) handler.applyDelta(msg.wikiUri, init, []);
          }
          _subscribe(coldBagId, h);
        });
      });
    }

    _ctx = { wikiUri: msg.wikiUri, composite: _composite, tw5, handles: _handles, post: _post };
    await behavior.onReady(_ctx);

    handler.sendEa(msg.wikiUri);
  }

  // ── Teardown (OTP terminate) ──────────────────────────────────────────────

  async function _handleTeardown(): Promise<void> {
    _tornDown = true;
    if (_ctx) await behavior.onTeardown(_ctx);
    handler.teardown();

    let docBytes: Uint8Array | undefined;
    try {
      const h = _writableHandleId ? _handles.get(_writableHandleId) : undefined;
      const raw = h?.doc?.();
      if (raw) docBytes = automergeSave(raw as Parameters<typeof automergeSave>[0]);
    } catch { /* export failed */ }

    _handles.clear();
    _writableHandleId = null;
    _composite        = null;
    _ctx              = null;
    _repo             = null;

    const ackOpts: { docBytes?: Uint8Array } = {};
    if (docBytes !== undefined) ackOpts.docBytes = docBytes;
    self.postMessage(mkTeardownAck(ackOpts));
  }
}
