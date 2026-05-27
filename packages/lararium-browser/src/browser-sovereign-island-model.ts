/**
 * browser-sovereign-island-model — browser Web Worker sovereign lifecycle kernel.
 *
 * Browser-platform parallel to sovereign-island-model.ts (Node). Identical
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
 *   Browser vessel: Admin island (sovereign island) + Pinned (primary wiki)
 *                   + N hot islands (session wikis, LRU-evicted to cold)
 *   Every hot island runs via runBrowserSovereignWorker(behavior).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/browser-sovereign-island-model
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
  isVesselToIslandMsg,
  mkTeardownAck,
  extractTiddlerDeltaFromPatches,
  allTiddlersFromDoc,
  type IslandMsg_Manifest,
  type IslandStorageConfig,
} from "@lararium/mesh";
import {
  IslandKernel,
  IslandAdaptor,
  MemoryTiddlerStore,
} from "@lararium/tw5";
import type { IslandToVesselMsg } from "@lararium/mesh";
import type { TW5Engine } from "@lararium/tw5";

// ── BrowserIslandBehavior — gen_island callback module (browser) ──────────

export interface BrowserIslandContext {
  wikiUri:   string;
  composite: CompositeStore;
  tw5:       TW5Engine;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handles:   Map<string, DocHandle<any>>;
  post:      (msg: IslandToVesselMsg) => void;
}

export interface BrowserIslandBehavior {
  writeBagId: string;
  onEa(ctx: BrowserIslandContext): void | Promise<void>;
  onSignal(type: string, raw: unknown, ctx: BrowserIslandContext): boolean;
  onDemote(ctx: BrowserIslandContext): void | Promise<void>;
}

// ── runBrowserSovereignisland — the browser gen_island kernel ────────────

export function runBrowserSovereignWorker(behavior: BrowserIslandBehavior): void {
  const _post = (msg: IslandToVesselMsg) => self.postMessage(msg);
  const handler = new IslandKernel(_post);

  let _repo:             Repo | null            = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let _handles:          Map<string, DocHandle<any>> = new Map();
  let _writableHandleId: string | null          = null;
  let _composite:        CompositeStore | null  = null;
  let _ctx:              BrowserIslandContext | null = null;

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
      handler.sendFrameAck(_activeWikiUri, crypto.randomUUID());
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

  function _buildStorage(cfg: IslandStorageConfig | undefined): StorageAdapterInterface | undefined {
    if (!cfg || cfg.type === "memory") return undefined;
    if (cfg.type === "idb") return new IndexedDBStorageAdapter(cfg.dbName);
    return undefined;
  }

  // ── Message dispatch ──────────────────────────────────────────────────────

  self.addEventListener("message", (e: MessageEvent) => {
    const raw = e.data;
    if (!isVesselToIslandMsg(raw)) return;

    if (raw.type === "manifest") {
      void _handleManifest(raw as IslandMsg_Manifest);
      return;
    }

    if (raw.type === "teardown" || raw.type === "demote") {
      void _handleTeardown();
      return;
    }

    if (_ctx && behavior.onSignal(raw.type, raw, _ctx)) return;
  });

  // ── Manifest (OTP init) ───────────────────────────────────────────────────

  async function _handleManifest(msg: IslandMsg_Manifest): Promise<void> {
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

    _ctx = { wikiUri: msg.wikiUri, composite: _composite, tw5, handles: _handles, post: _post };
    await behavior.onEa(_ctx);

    handler.sendEa(msg.wikiUri);
  }

  // ── Demote (OTP terminate) ────────────────────────────────────────────────

  async function _handleTeardown(): Promise<void> {
    _tornDown = true;
    if (_ctx) await behavior.onDemote(_ctx);
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
