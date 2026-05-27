/**
 * sovereign-island-model — Node.js sovereign island lifecycle kernel.
 *
 * Implements the OTP gen_island behavior pattern for sovereign causal islands:
 *   - generic lifecycle: boot → Repo → CompositeStore → IslandAdaptor → drain → ea → demote
 *   - caller-supplied IslandBehavior: writeBagId + onEa / onSignal / onDemote
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
 *   admin island → ADMIN_BAG_ID  (CRDT write-back, persisted)
 *   wiki island   → BAG_IDS.scratch  (local only, evaporates on teardown)
 *
 * ## VM Pool alignment
 *
 *   Node vessel: Admin island (sovereign island) + Pinned (PrimaryWiki in-process)
 *                + N hot islands (session wikis, LRU-evicted to cold)
 *   Every hot island runs via runSovereignWorker(behavior).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/sovereign-island-model
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
  ENGINE_CORE_ID,
  mkFault,
  isVesselToIslandMsg,
  mkTeardownAck,
  extractTiddlerDeltaFromPatches,
  allTiddlersFromDoc,
  type LarDoc,
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

// ── IslandBehavior — the OTP gen_island callback module ───────────────────

export interface IslandContext {
  wikiUri:   string;
  composite: CompositeStore;
  tw5:       TW5Engine;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handles:   Map<string, DocHandle<any>>;
  post:      (msg: IslandToVesselMsg) => void;
}

/**
 * Caller-supplied behavior module. Parallel to OTP's callback module passed to gen_island.
 *
 * - `writeBagId` — IslandAdaptor write target. Admin: ADMIN_BAG_ID. Wiki: BAG_IDS.scratch.
 * - `onEa`       — called after CompositeStore + IslandAdaptor wired, before ea declaration.
 * - `onSignal`   — called for every non-lifecycle message. Return true if handled.
 * - `onDemote`   — called before drain loop stops and docBytes export.
 */
export interface IslandBehavior {
  writeBagId: string;
  onEa(ctx: IslandContext): void | Promise<void>;
  onSignal(type: string, raw: unknown, ctx: IslandContext): boolean;
  onDemote(ctx: IslandContext): void | Promise<void>;
}

// ── runSovereignisland — the OTP gen_island kernel ────────────────────────

export function runSovereignWorker(behaviorOrFactory: IslandBehavior | ((manifest: IslandMsg_Manifest) => IslandBehavior)): void {
  let behavior: IslandBehavior | null = typeof behaviorOrFactory === "function" ? null : behaviorOrFactory;
  const _resolveBehavior = (msg: IslandMsg_Manifest): IslandBehavior => {
    if (behavior === null) behavior = (behaviorOrFactory as (m: IslandMsg_Manifest) => IslandBehavior)(msg);
    return behavior;
  };
  if (!parentPort) {
    throw new Error("[sovereign-island] parentPort is null — must run as a Worker thread.");
  }
  const _port = parentPort;
  const _post = (msg: IslandToVesselMsg) => _port.postMessage(msg);

  const handler = new IslandKernel(_post);

  let _repo:             Repo | null           = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let _handles:          Map<string, DocHandle<any>> = new Map();
  let _writableHandleId: string | null         = null;
  let _composite:        CompositeStore | null = null;
  let _ctx:              IslandContext | null  = null;

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
      handler.sendFrameAck(_activeWikiUri, crypto.randomUUID());
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

  function _buildStorage(cfg: IslandStorageConfig | undefined): StorageAdapterInterface | undefined {
    if (!cfg || cfg.type === "memory") return undefined;
    if (cfg.type === "nodefs") return new NodeFSStorageAdapter(cfg.dir);
    return undefined;
  }

  // ── Message dispatch ──────────────────────────────────────────────────────

  _port.on("message", (raw: unknown) => {
    if (!isVesselToIslandMsg(raw)) return;

    if (raw.type === "manifest") {
      void _handleManifest(raw as IslandMsg_Manifest & { syncPort?: MessagePort });
      return;
    }

    if (raw.type === "teardown" || raw.type === "demote") {
      void _handleTeardown();
      return;
    }

    // Delegate to behavior — admin handles admin:place-job, admin:job-result, etc.
    if (_ctx && behavior && behavior.onSignal(raw.type, raw, _ctx)) return;
  });

  // ── Manifest (OTP init) ───────────────────────────────────────────────────

  async function _handleManifest(msg: IslandMsg_Manifest): Promise<void> {
    _activeWikiUri = msg.wikiUri;
    const behavior = _resolveBehavior(msg);

    const storageAdapter = _buildStorage(msg.storage);
    _repo = new Repo({
      ...(storageAdapter ? { storage: storageAdapter } : {}),
      network: [new MessageChannelNetworkAdapter(msg.syncPort as unknown as globalThis.MessagePort)],
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

    // §6 — bytes travel via @lararium CRDT; manifest carries only integrity gate.
    const laraiumHandle = _handles.get(BAG_IDS.lararium);
    const blobEntry = (laraiumHandle?.doc() as LarDoc | undefined)?.blobs?.[ENGINE_CORE_ID];
    const coreBytes: Uint8Array | null = blobEntry?.blob ? new Uint8Array(blobEntry.blob) : null;
    if (!coreBytes) {
      _post(mkFault(msg.wikiUri, `island cannot resolve TW5 core bytes — @lararium binding missing or blob absent (ENGINE_CORE_ID=${ENGINE_CORE_ID})`));
      return;
    }

    try {
      await handler.bootTw5(msg.wikiUri, coreBytes, msg.pluginTiddlers);
    } catch {
      return;
    }

    for (const { bagId, handle, writable } of ready) {
      const store = new AutomergeDocStore(handle, bagId);
      store.markSyncComplete();
      _composite.addLayer({ bagId, store, writable, defaultWritable: false });
    }

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
      if (doc) seed.push(...allTiddlersFromDoc(doc as Record<string, unknown>));
    }
    if (seed.length > 0) handler.applyDelta(msg.wikiUri, seed, []);

    for (const { bagId, handle } of ready) _subscribe(bagId, handle);

    _ctx = { wikiUri: msg.wikiUri, composite: _composite, tw5, handles: _handles, post: _post };
    await behavior.onEa(_ctx);

    _startDrain();
    handler.sendEa(msg.wikiUri);
  }

  // ── Teardown (OTP terminate) ──────────────────────────────────────────────

  async function _handleTeardown(): Promise<void> {
    if (_ctx && behavior) await behavior.onDemote(_ctx);
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
