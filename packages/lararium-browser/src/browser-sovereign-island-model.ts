/**
 * browser-sovereign-island-model — browser Web Worker sovereign lifecycle kernel.
 *
 * Browser-platform parallel to sovereign-island-model.ts (Node). Identical
 * structure; platform deltas:
 *   - drain loop: requestAnimationFrame (setTimeout 16ms fallback for Safari)
 *   - message I/O: self.postMessage / self.addEventListener
 *   - storage: IndexedDBStorageAdapter keyed by wikiUri — island owns its persistence
 *
 * ## Recipe law — slot expansion (same as Node model, top wins)
 *
 *   lar:///ha.ka.ba/@temp        (volatile MemoryTiddlerStore per-island)
 *   lar:///ha.ka.ba/@draft       (CRDT, drafts)
 *   lar:///ha.ka.ba/@<wikiSlug>  (CRDT, wiki identity)
 *   canon bags                   (CRDT, optional)
 *   lar:///ha.ka.ba/@lares       (CRDT)
 *   lar:///ha.ka.ba/@lararium    (CRDT)
 *
 *   Write routing happens via the in-wiki bag-paths cascade.
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
  BAG_IDS,
  ENGINE_CORE_ID,
  TEMP_BAG,
  expandRecipe,
  mkFault,
  mkReady,
  isVesselToIslandMsg,
  mkTeardownAck,
  type LarDoc,
  type IslandMsg_Manifest,
  type SlotUri,
} from "@lararium/mesh";
import {
  IslandKernel,
  buildIslandRecipe,
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
  let _activeWikiUri                                        = "";

  // Live CRDT patches flow through AutomergeDocStore.handle.on("change") →
  // MemeProvider → IslandAdaptor → $tw.lares.enqueueNalu. The wiki's
  // nalu-engine startup module owns the drain (one wiki.transact() per frame
  // across all bags). No worker-side rAF loop, no _pendingAdded array, no
  // raw handle subscription.

  // ── Message dispatch ──────────────────────────────────────────────────────

  self.addEventListener("message", (e: MessageEvent) => {
    const raw = e.data;
    if (!isVesselToIslandMsg(raw)) return;

    if (raw.type === "manifest") {
      void _handleManifest(raw as IslandMsg_Manifest);
      return;
    }

    if (raw.type === "teardown" || raw.type === "hooanu") {
      void _handleTeardown();
      return;
    }

    if (_ctx && behavior.onSignal(raw.type, raw, _ctx)) return;
  });

  // Inversion of control: signal the vessel that this Worker's message handler
  // is registered and WASM has finished loading (top-level await in ES module
  // Workers completes before this line). Vessel MUST NOT send manifest until
  // it receives this "ready" signal.
  self.postMessage(mkReady());

  // ── Manifest (OTP init) ───────────────────────────────────────────────────

  async function _handleManifest(msg: IslandMsg_Manifest): Promise<void> {
    _activeWikiUri = msg.wikiUri;
    try {
      await _doManifest(msg);
    } catch (err) {
      _post(mkFault(msg.wikiUri, `manifest handler threw: ${String(err)}`));
    }
  }

  async function _doManifest(msg: IslandMsg_Manifest): Promise<void> {
    // Island owns its own IndexedDB partition keyed by its identity URI.
    _repo = new Repo({
      storage:     new IndexedDBStorageAdapter(msg.wikiUri),
      network:     [new MessageChannelNetworkAdapter(msg.syncPort)],
      sharePolicy: async () => true,
    });

    _composite = new CompositeStore();

    // Walk expandRecipe() and resolve each CRDT slot's doc handle via the
    // manifest's resolver. @temp has no CRDT handle.
    const slots = expandRecipe(msg.recipe);
    const ready: Array<{ slot: SlotUri; handle: DocHandle<LarDoc> }> = [];

    for (const slot of slots) {
      if (slot === TEMP_BAG) continue;
      const docUrl = msg.resolver[slot];
      if (!docUrl) continue;
      // allowableStates: doc arrives via syncPort after connect — not yet "ready" at find() time.
      const handle = await _repo.find<LarDoc>(
        docUrl as AutomergeUrl,
        { allowableStates: ["ready", "unavailable"] },
      );
      await handle.whenReady();
      _handles.set(slot, handle);
      ready.push({ slot, handle });
    }
    void _writableHandleId; // reserved for future M-bags writable-rotation work

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
    } catch (err) {
      const stack = err instanceof Error ? (err.stack ?? String(err)) : String(err);
      _post(mkFault(msg.wikiUri, `bootTw5 threw: ${stack}`));
      return;
    }

    const tw5 = handler.tw5()!;
    // One recipe model — buildIslandRecipe walks expandRecipe(msg.recipe),
    // wires @temp + every resolved CRDT slot, registers the adaptor, drains
    // initial replay synchronously through the in-wiki nalu engine.
    buildIslandRecipe({
      tw5,
      composite: _composite,
      recipe: msg.recipe,
      ready,
    });

    _ctx = { wikiUri: msg.wikiUri, composite: _composite, tw5, handles: _handles, post: _post };
    await behavior.onEa(_ctx);

    handler.sendEa(msg.wikiUri);
  }

  // ── Demote (OTP terminate) ────────────────────────────────────────────────

  async function _handleTeardown(): Promise<void> {
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
