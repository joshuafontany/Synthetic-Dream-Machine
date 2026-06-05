/**
 * sovereign-island-model — Node.js sovereign island lifecycle kernel.
 *
 * Implements the OTP gen_island pattern for sovereign causal islands:
 *   - generic lifecycle: boot → Repo → CompositeStore → IslandAdaptor → ea → demote
 *   - caller-supplied IslandBehavior: onEa / onSignal / onDemote
 *
 * ## Recipe law — one model across all wikis
 *
 *   Manifest carries `recipe: WikiRecipe + resolver: { slot → docUrl }`.
 *   The worker walks `expandRecipe(recipe)` and resolves each CRDT slot's
 *   doc handle, then `buildIslandRecipe()` lays the composite stack:
 *
 *     @temp        (MemoryTiddlerStore, volatile)
 *     @draft       (CRDT, high-churn drafts)
 *     @<wikiSlug>  (CRDT, operator's edits)
 *     canonBags[]  (CRDT, optional content libraries)
 *     @lares       (CRDT, required personality)
 *     @lararium    (CRDT, required system / engine core)
 *
 *   Write routing happens via the in-wiki cascade
 *   (`lar:///ha.ka.ba/@lararium/config/bag-paths`), not by behavior config.
 *
 * ## VM Pool alignment
 *
 *   Node vessel: Admin island (sovereign island) + Pinned (PrimaryWiki in-process)
 *                + N hot islands (session wikis, LRU-evicted to cold).
 *   Every hot island runs via runSovereignWorker(behavior).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/node/sovereign-island-model
 */

import { parentPort, MessagePort } from "worker_threads";
import { Repo } from "@automerge/automerge-repo";
import type { DocHandle, AutomergeUrl, StorageAdapterInterface } from "@automerge/automerge-repo";
import { MessageChannelNetworkAdapter } from "@automerge/automerge-repo-network-messagechannel";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import {
  CompositeStore,
  BAG_IDS,
  ENGINE_CORE_ID,
  TEMP_BAG,
  expandRecipe,
  mkFault,
  isVesselToIslandMsg,
  mkTeardownAck,
  type LarDoc,
  type IslandMsg_Manifest,
  type IslandStorageConfig,
  type SlotUri,
} from "@lararium/mesh";
import {
  IslandKernel,
  buildIslandRecipe,
} from "@lararium/tw5";
import type { IslandToVesselMsg } from "@lararium/mesh";
import type { IslandContext, IslandBehavior } from "@lararium/tw5";

// ── runSovereignWorker — the OTP gen_island kernel ────────────────────────

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

  let _repo:             Repo | null                    = null;
  let _handles:          Map<string, DocHandle<LarDoc>> = new Map();
  let _writableHandleId: string | null         = null;
  let _composite:        CompositeStore | null = null;
  let _ctx:              IslandContext | null  = null;
  let _activeWikiUri                           = "";

  // Live CRDT patches flow through AutomergeDocStore.handle.on("change") →
  // MemeProvider → IslandAdaptor → $tw.lares.enqueueNalu. The wiki's
  // nalu-engine startup module owns the drain (one wiki.transact() per frame
  // across all bags). No worker-side drain loop, no _pendingAdded array, no
  // raw handle subscription.

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

    if (raw.type === "teardown" || raw.type === "hooanu") {
      void _handleTeardown();
      return;
    }

    // Delegate to behavior — admin handles admin:place-verb, admin:verb-result, etc.
    if (_ctx && behavior && behavior.onSignal(raw.type, raw, _ctx)) return;
  });

  // ── Manifest (OTP init) ───────────────────────────────────────────────────

  async function _handleManifest(msg: IslandMsg_Manifest): Promise<void> {
    _activeWikiUri = msg.wikiUri;
    // Isomorphic with the browser kernel: any throw during init (incl. a
    // behavior.onEa gate failure, e.g. bootAdminKeyhive Gate A/B/C) posts fault
    // so the vessel times out cleanly instead of hanging without an ea.
    try {
      await _doManifest(msg);
    } catch (err) {
      _post(mkFault(msg.wikiUri, `manifest handler threw: ${String(err)}`));
    }
  }

  async function _doManifest(msg: IslandMsg_Manifest): Promise<void> {
    const behavior = _resolveBehavior(msg);

    const storageAdapter = _buildStorage(msg.storage);
    _repo = new Repo({
      ...(storageAdapter ? { storage: storageAdapter } : {}),
      network: [new MessageChannelNetworkAdapter(msg.syncPort as unknown as globalThis.MessagePort)],
      sharePolicy: async () => true,
    });

    _composite = new CompositeStore();

    // Walk expandRecipe() and resolve each CRDT slot's doc handle via the
    // manifest's resolver. @temp has no CRDT handle — buildIslandRecipe wires
    // a MemoryTiddlerStore for it.
    const slots = expandRecipe(msg.recipe);
    const ready: Array<{ slot: SlotUri; handle: DocHandle<LarDoc> }> = [];

    for (const slot of slots) {
      if (slot === TEMP_BAG) continue;
      const docUrl = msg.resolver[slot];
      if (!docUrl) continue;
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
    const blobEntry = laraiumDoc?.blobs?.[ENGINE_CORE_ID];
    const coreBytes: Uint8Array | null = blobEntry?.blob ? new Uint8Array(blobEntry.blob) : null;
    if (!coreBytes) {
      _post(mkFault(msg.wikiUri, `island cannot resolve TW5 core bytes — @lararium binding missing or blob absent (ENGINE_CORE_ID=${ENGINE_CORE_ID})`));
      return;
    }

    // §6b — plugin tiddlers travel via @lararium CRDT blob store (application/json blobs).
    // Islands read and apply them here — no manifest field needed.
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

  // ── Teardown (OTP terminate) ──────────────────────────────────────────────

  async function _handleTeardown(): Promise<void> {
    if (_ctx && behavior) await behavior.onDemote(_ctx);
    handler.teardown();

    _handles.clear();
    _writableHandleId = null;
    _composite        = null;
    _ctx              = null;
    _repo             = null;

    _port.postMessage(mkTeardownAck());
  }
}
