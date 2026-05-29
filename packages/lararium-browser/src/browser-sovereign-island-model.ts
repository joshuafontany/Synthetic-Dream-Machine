/**
 * browser-sovereign-island-model — browser Web Worker sovereign lifecycle kernel.
 *
 * Browser-platform parallel to sovereign-island-model.ts (Node). Identical
 * structure; platform deltas:
 *   - drain loop: requestAnimationFrame (setTimeout 16ms fallback for Safari)
 *   - message I/O: self.postMessage / self.addEventListener
 *   - storage: IndexedDBStorageAdapter keyed by wikiUri — island owns its persistence
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
import type { DocHandle, AutomergeUrl } from "@automerge/automerge-repo";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import {
  CompositeStore,
  AutomergeDocStore,
  BAG_IDS,
  ENGINE_CORE_ID,
  mkFault,
  isVesselToIslandMsg,
  mkTeardownAck,
  extractTiddlerDeltaFromPatches,
  allTiddlersFromDoc,
  type LarDoc,
  type IslandMsg_Manifest,
} from "@lararium/mesh";
import {
  IslandKernel,
  IslandAdaptor,
  MemoryTiddlerStore,
} from "@lararium/tw5";
import type { IslandToVesselMsg } from "@lararium/mesh";
import type { IslandContext, IslandBehavior } from "@lararium/tw5";

// ── runBrowserSovereignWorker — the browser gen_island kernel ────────────

export function runBrowserSovereignWorker(behavior: IslandBehavior): void {
  const _post = (msg: IslandToVesselMsg) => self.postMessage(msg);
  const handler = new IslandKernel(_post);

  let _repo:             Repo | null                        = null;
  let _handles:          Map<string, DocHandle<LarDoc>>     = new Map();
  let _writableHandleId: string | null                      = null;
  let _composite:        CompositeStore | null              = null;
  let _ctx:              IslandContext | null               = null;

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

  function _subscribe(_bagId: string, handle: DocHandle<LarDoc>): void {
    handle.on("change", ({ doc, patches }: DocChangePayload) => {
      const delta = extractTiddlerDeltaFromPatches(doc, patches);
      if (delta.added.length > 0 || delta.deleted.length > 0) {
        _pendingAdded.push(...delta.added);
        _pendingDeleted.push(...delta.deleted);
        _scheduleDrain();
      }
    });
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

    // Island owns its own IndexedDB partition keyed by its identity URI.
    _repo = new Repo({
      storage:     new IndexedDBStorageAdapter(msg.wikiUri),
      network:     [new MessageChannelNetworkAdapter(msg.syncPort)],
      sharePolicy: async () => true,
    });

    _composite = new CompositeStore();

    const bindings = msg.bagBindings ?? [];
    const ready: Array<{ bagId: string; handle: DocHandle<LarDoc>; writable: boolean }> = [];

    for (const binding of bindings) {
      if (binding.mode !== "relational") continue;
      const handle = await _repo.find<LarDoc>(binding.docUrl as AutomergeUrl);
      await handle.whenReady();
      _handles.set(binding.bagId, handle);
      ready.push({ bagId: binding.bagId, handle, writable: binding.writable });
      if (binding.writable && _writableHandleId === null) _writableHandleId = binding.bagId;
    }

    // §6 — bytes travel via @lararium CRDT; manifest carries only integrity gate.
    const laraiumHandle = _handles.get(BAG_IDS.lararium);
    const laraiumDoc    = laraiumHandle?.doc();
    const blobEntry     = laraiumDoc?.blobs?.[ENGINE_CORE_ID];
    const coreBytes: Uint8Array | null = blobEntry?.blob ? new Uint8Array(blobEntry.blob) : null;
    if (!coreBytes) {
      _post(mkFault(msg.wikiUri, `island cannot resolve TW5 core bytes — @lararium binding missing or blob absent (ENGINE_CORE_ID=${ENGINE_CORE_ID})`));
      return;
    }

    // §6b — plugin tiddlers travel via @lararium CRDT blob store (application/json blobs).
    const pluginTiddlers: Record<string, unknown>[] = [];
    const blobs = laraiumDoc?.blobs ?? {};
    for (const [id, entry] of Object.entries(blobs)) {
      if (id === ENGINE_CORE_ID) continue;
      const mime = (entry as unknown as Record<string, unknown>)["mimeType"];
      if (mime !== "application/json") continue;
      const blobBytes = (entry as unknown as Record<string, unknown>)["blob"];
      if (!blobBytes) continue;
      try {
        const json = JSON.parse(new TextDecoder().decode(new Uint8Array(blobBytes as Uint8Array))) as Record<string, unknown>;
        pluginTiddlers.push(json);
      } catch { /* malformed blob — skip */ }
    }
    if (!pluginTiddlers.length) {
      _post(mkFault(msg.wikiUri, "island cannot load plugin tiddlers — no application/json blobs in @lararium CRDT doc"));
      return;
    }

    try {
      await handler.bootTw5(msg.wikiUri, coreBytes, pluginTiddlers);
    } catch {
      return;
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

    _handles.clear();
    _writableHandleId = null;
    _composite        = null;
    _ctx              = null;
    _repo             = null;

    self.postMessage(mkTeardownAck());
  }
}
