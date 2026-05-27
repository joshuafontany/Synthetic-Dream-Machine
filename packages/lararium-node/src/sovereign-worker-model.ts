/**
 * sovereign-worker-model — Node.js sovereign Worker lifecycle kernel.
 *
 * Implements the OTP GenServer behavior pattern for Worker threads:
 *   - generic lifecycle: boot → Repo → CompositeStore → IslandAdaptor → drain → ea → teardown
 *   - caller-supplied WorkerBehavior: writeBagId + onReady / onMessage / onTeardown
 *
 * ## Recipe law — sub-surface layers
 *
 * The model always appends three layers BELOW the caller's CRDT bags, idempotent:
 *
 *   bagBindings (CRDT, recipe order)
 *   └── draft CRDT (if present in bindings as BAG_IDS.draft)       ← syncs to peers
 *   └── scratch MemoryTiddlerStore  (defaultWritable:true)          ← local VM only
 *   └── projection MemoryTiddlerStore (defaultWritable:false)       ← $:/state/*
 *
 * `behavior.writeBagId` selects which bag IslandAdaptor routes TW5 outbound saves to:
 *   admin Worker → ADMIN_BAG_ID  (CRDT write-back, persisted)
 *   wiki Worker  → BAG_IDS.scratch  (local only, evaporates on teardown)
 *
 * ## VM Pool alignment
 *
 *   Node vessel: Admin Worker (sovereign island) + Pinned (PrimaryWiki in-process)
 *                + N hot Workers (session wikis, LRU-evicted to cold)
 *   Every hot Worker runs via runSovereignWorker(behavior).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/sovereign-worker-model
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
import type { TW5Engine } from "@lararium/tw5";

// ── WorkerBehavior — the OTP callback module ──────────────────────────────

export interface WorkerContext {
  wikiUri:   string;
  composite: CompositeStore;
  tw5:       TW5Engine;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handles:   Map<string, DocHandle<any>>;
  post:      (msg: WorkerToMainMsg) => void;
}

/**
 * Caller-supplied behavior module. Parallel to OTP's callback module passed to gen_server.
 *
 * - `writeBagId`  — IslandAdaptor write target. Admin: ADMIN_BAG_ID. Wiki: BAG_IDS.scratch.
 * - `onReady`     — called after CompositeStore + IslandAdaptor wired, before ea.
 * - `onMessage`   — called for every non-lifecycle message. Return true if handled.
 * - `onTeardown`  — called before drain loop stops and docBytes export.
 */
export interface WorkerBehavior {
  writeBagId:  string;
  onReady(ctx: WorkerContext): void | Promise<void>;
  onMessage(type: string, raw: unknown, ctx: WorkerContext): boolean;
  onTeardown(ctx: WorkerContext): void | Promise<void>;
}

// ── runSovereignWorker — the OTP gen_server ───────────────────────────────

export function runSovereignWorker(behaviorOrFactory: WorkerBehavior | ((manifest: WorkerMsg_Manifest) => WorkerBehavior)): void {
  let behavior: WorkerBehavior | null = typeof behaviorOrFactory === "function" ? null : behaviorOrFactory;
  const _resolveBehavior = (msg: WorkerMsg_Manifest): WorkerBehavior => {
    if (behavior === null) behavior = (behaviorOrFactory as (m: WorkerMsg_Manifest) => WorkerBehavior)(msg);
    return behavior;
  };
  if (!parentPort) {
    throw new Error("[sovereign-worker] parentPort is null — must run as a Worker thread.");
  }
  const _port = parentPort;
  const _post = (msg: WorkerToMainMsg) => _port.postMessage(msg);

  const handler = new WorkerAuthorityHandler(_post);

  let _repo:             Repo | null           = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let _handles:          Map<string, DocHandle<any>> = new Map();
  let _writableHandleId: string | null         = null;
  let _composite:        CompositeStore | null = null;
  let _ctx:              WorkerContext | null  = null;

  // ── Drain loop ────────────────────────────────────────────────────────────

  const FRAME_MS = 16;
  let _pendingAdded:   Record<string, unknown>[] = [];
  let _pendingDeleted: string[]                  = [];
  let _interval:       ReturnType<typeof setInterval> | null = null;
  let _activeWikiUri   = "";

  function _startDrain(): void {
    if (_interval !== null) return;
    _interval = setInterval(() => {
      const added   = _pendingAdded.splice(0);
      const deleted = _pendingDeleted.splice(0);
      if (added.length > 0 || deleted.length > 0) {
        handler.applyDelta(_activeWikiUri, added, deleted);
      }
      handler.sendChangesetAck(_activeWikiUri, crypto.randomUUID());
    }, FRAME_MS);
    if (typeof _interval === "object" && _interval !== null && "unref" in _interval) {
      (_interval as { unref(): void }).unref();
    }
  }

  function _stopDrain(): void {
    if (_interval !== null) { clearInterval(_interval); _interval = null; }
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
      }
      void bagId;
    });
  }

  // ── Storage ───────────────────────────────────────────────────────────────

  function _buildStorage(cfg: WorkerStorageConfig | undefined): StorageAdapterInterface | undefined {
    if (!cfg || cfg.type === "memory") return undefined;
    if (cfg.type === "nodefs") return new NodeFSStorageAdapter(cfg.dir);
    return undefined;
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

    // Delegate to behavior — admin handles admin:place-job, admin:job-result, etc.
    if (_ctx && behavior && behavior.onMessage(raw.type, raw, _ctx)) return;
  });

  // ── Manifest (OTP init) ───────────────────────────────────────────────────

  async function _handleManifest(msg: WorkerMsg_Manifest & { syncPort?: MessagePort }): Promise<void> {
    _activeWikiUri = msg.wikiUri;
    const behavior = _resolveBehavior(msg);

    try {
      await handler.bootTw5(msg.wikiUri, msg.coreBlob, msg.pluginTiddlers);
    } catch {
      return;
    }

    const syncPort = msg.syncPort;
    if (!syncPort) {
      // GP-3 deprecated path — no Repo, no composite, just TW5.
      _startDrain();
      handler.sendEa(msg.wikiUri);
      return;
    }

    const storageAdapter = _buildStorage(msg.storage);
    _repo = new Repo({
      ...(storageAdapter ? { storage: storageAdapter } : {}),
      network: [new MessageChannelNetworkAdapter(syncPort as unknown as globalThis.MessagePort)],
      sharePolicy: async () => true,
    });

    // ── Build CompositeStore ──────────────────────────────────────────────
    // CRDT layers (recipe order) → scratch → projection.
    // Sub-surface layers always appended — idempotent, not in bagBindings.

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

    // ── IslandAdaptor — behavior declares its write target ────────────────
    const tw5 = handler.tw5()!;
    const adaptor = new IslandAdaptor(tw5, _composite, behavior.writeBagId);
    _composite.addProjection(adaptor);

    // ── Seed TW5 from all CRDT bags ───────────────────────────────────────
    const seed: Record<string, unknown>[] = [];
    for (const { handle } of ready) {
      const doc = handle.doc();
      if (doc) seed.push(...allTiddlersFromDoc(doc as Record<string, unknown>));
    }
    if (seed.length > 0) handler.applyDelta(msg.wikiUri, seed, []);

    for (const { bagId, handle } of ready) _subscribe(bagId, handle);

    // Cold-mode gossip fallback.
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
              const init = allTiddlersFromDoc(doc as Record<string, unknown>);
              if (init.length > 0) handler.applyDelta(msg.wikiUri, init, []);
            }
            _subscribe(coldBagId, h);
          });
        });
      }
    }

    // ── Build context, call behavior.onReady ─────────────────────────────
    _ctx = { wikiUri: msg.wikiUri, composite: _composite, tw5, handles: _handles, post: _post };
    await behavior.onReady(_ctx);

    _startDrain();
    handler.sendEa(msg.wikiUri);
  }

  // ── Teardown (OTP terminate) ──────────────────────────────────────────────

  async function _handleTeardown(): Promise<void> {
    if (_ctx && behavior) await behavior.onTeardown(_ctx);
    _stopDrain();
    handler.teardown();

    let docBytes: Uint8Array | undefined;
    try {
      const h = _writableHandleId ? _handles.get(_writableHandleId) : undefined;
      const raw = h?.doc?.();
      if (raw) docBytes = automergeSave(raw as Parameters<typeof automergeSave>[0]);
    } catch { /* export failed — teardown:ack fires without docBytes */ }

    _handles.clear();
    _writableHandleId = null;
    _composite        = null;
    _ctx              = null;
    _repo             = null;

    const ackOpts: { docBytes?: Uint8Array } = {};
    if (docBytes !== undefined) ackOpts.docBytes = docBytes;
    _port.postMessage(mkTeardownAck(ackOpts));
  }
}
