/**
 * sovereign-kernel — the platform-blind OTP gen_island lifecycle.
 *
 * ONE kernel both vessels run. Node and browser do NOT each implement a
 * lifecycle; they each COMPOSE this one flow with a small host seam. The seam
 * is what *remains* after subtracting the identical skeleton from the two prior
 * mirror files (sovereign-island-model.ts ⇆ browser-sovereign-island-model.ts):
 * a data descriptor of four capability-pieces, not an OO platform interface.
 *
 *   generic lifecycle: boot → Repo → CompositeStore → IslandAdaptor → ea → demote
 *   caller-supplied IslandBehavior: onEa / onSignal / onDemote
 *
 * ## Recipe law — one model across all wikis
 *
 *   Manifest carries `recipe: WikiRecipe + resolver: { slot → docUrl }`.
 *   The kernel walks `expandRecipe(recipe)`, resolves each CRDT slot's doc
 *   handle, then `buildIslandRecipe()` lays the composite stack:
 *
 *     @temp        (MemoryTiddlerStore, volatile)
 *     @draft       (CRDT, high-churn drafts)
 *     @<wikiSlug>  (CRDT, operator's edits)
 *     libraryBags[]  (CRDT, optional content libraries)
 *     @lares       (CRDT, required personality)
 *     @lararium    (CRDT, required system / engine core)
 *
 *   Write routing happens via the in-wiki cascade
 *   (`lar:///ha.ka.ba/@lararium/config/bag-paths`), not by behavior config.
 *
 * ## The host seam (composition, not adaptation)
 *
 *   IslandHostSeam carries the platform divergence as DATA + resolver fns:
 *     - post     : transport out (node parentPort.postMessage / browser self.postMessage)
 *     - listen   : transport in  (node parentPort.on / browser self.addEventListener)
 *     - storage  : Repo storage adapter for this manifest (nodefs / IndexedDB / memory)
 *     - ready?   : optional IoC handshake (browser posts mkReady; node omits)
 *
 *   Same isomorphic flow; different pieces resolved. role ≠ platform.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/sovereign-kernel
 */

import {
  CompositeStore,
  BAG_IDS,
  CATALOG_DOC_URI,
  ENGINE_CORE_ID,
  TEMP_BAG,
  expandRecipe,
  mkFault,
  isVesselToIslandMsg,
  mkTeardownAck,
  makeIslandRepo,
  type Repo,
  type DocHandle,
  type AutomergeUrl,
  type StorageAdapterInterface,
  type LarDoc,
  type IslandMsg_Manifest,
  type IslandToVesselMsg,
  type SlotUri,
} from "@lararium/mesh";
import { IslandKernel } from "./island-kernel.js";
import { buildIslandRecipe } from "./island-recipe.js";
import type { IslandContext, IslandBehavior } from "./island-context.js";

// ── The host seam — platform divergence as composition ──────────────────────

export interface IslandHostSeam {
  /** Transport out: post a message to the vessel. */
  post(msg: IslandToVesselMsg): void;
  /** Transport in: register the inbound message listener. */
  listen(onMessage: (raw: unknown) => void): void;
  /** Build the Repo storage adapter for this manifest (undefined = in-memory). */
  storage(msg: IslandMsg_Manifest): StorageAdapterInterface | undefined;
  /** Optional IoC handshake fired after the listener registers (browser mkReady). */
  ready?(): void;
}

// ── runSovereignKernel — the OTP gen_island kernel ──────────────────────────

export function runSovereignKernel(
  host: IslandHostSeam,
  behaviorOrFactory: IslandBehavior | ((manifest: IslandMsg_Manifest) => IslandBehavior),
): void {
  const _post = (msg: IslandToVesselMsg) => host.post(msg);
  const handler = new IslandKernel(_post);

  // Factory form: when a manifest-keyed factory is passed, the behavior resolves
  // lazily on first manifest — so the admin entry can read manifest.adminAuth
  // (the operator seed) at construction time.
  let behavior: IslandBehavior | null = typeof behaviorOrFactory === "function" ? null : behaviorOrFactory;
  const _resolveBehavior = (msg: IslandMsg_Manifest): IslandBehavior => {
    if (behavior === null) behavior = (behaviorOrFactory as (m: IslandMsg_Manifest) => IslandBehavior)(msg);
    return behavior;
  };

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

  // ── Message dispatch ──────────────────────────────────────────────────────

  host.listen((raw: unknown) => {
    if (!isVesselToIslandMsg(raw)) return;

    if (raw.type === "manifest") {
      void _handleManifest(raw as IslandMsg_Manifest);
      return;
    }

    if (raw.type === "teardown" || raw.type === "hooanu") {
      void _handleTeardown();
      return;
    }

    // Delegate to behavior — admin handles admin:place-verb, admin:verb-result, etc.
    if (_ctx && behavior && behavior.onSignal(raw.type, raw, _ctx)) return;
  });

  // Inversion of control: signal the vessel that this worker's message handler
  // is registered (browser also waits on WASM top-level await). The vessel MUST
  // NOT send a manifest until it receives this "ready" signal. Node omits it.
  host.ready?.();

  // ── Manifest (OTP init) ───────────────────────────────────────────────────

  async function _handleManifest(msg: IslandMsg_Manifest): Promise<void> {
    _activeWikiUri = msg.wikiUri;
    void _activeWikiUri;
    // Any throw during init (incl. a behavior.onEa gate failure, e.g.
    // bootAdminKeyhive Gate A/B/C) posts fault so the vessel times out cleanly
    // instead of hanging without an ea.
    try {
      await _doManifest(msg);
    } catch (err) {
      _post(mkFault(msg.wikiUri, `manifest handler threw: ${String(err)}`));
    }
  }

  async function _doManifest(msg: IslandMsg_Manifest): Promise<void> {
    const behavior = _resolveBehavior(msg);

    // Repo construction + network wiring is a CRDT concern owned by mesh; the
    // kernel composes it through the facade and stays @automerge-free.
    const storageAdapter = host.storage(msg);
    _repo = makeIslandRepo({ ...(storageAdapter ? { storage: storageAdapter } : {}), syncPort: msg.syncPort });

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
      // allowableStates: doc may arrive via syncPort after connect — not yet
      // "ready" at find() time.
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

    // §6b — plugin tiddlers travel via @lararium CRDT blob store (application/json
    // blobs). Islands read and apply them here — no manifest field needed.
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

    // Isomorphic base: lift the @catalog registry URL out of the resolver (access
    // entry, NOT a load slot — @catalog is absent from expandRecipe). Worker
    // behaviors build a CatalogAccessor over it to reach any registered bag.
    const catalogUrl = msg.resolver[CATALOG_DOC_URI] ?? null;
    _ctx = { wikiUri: msg.wikiUri, composite: _composite, tw5, handles: _handles, post: _post, repo: _repo!, catalogUrl };
    await behavior.onEa(_ctx);

    handler.sendEa(msg.wikiUri);
  }

  // ── Teardown / Demote (OTP terminate) ──────────────────────────────────────

  async function _handleTeardown(): Promise<void> {
    if (_ctx && behavior) await behavior.onDemote(_ctx);
    handler.teardown();

    _handles.clear();
    _writableHandleId = null;
    _composite        = null;
    _ctx              = null;
    _repo             = null;

    host.post(mkTeardownAck());
  }
}
