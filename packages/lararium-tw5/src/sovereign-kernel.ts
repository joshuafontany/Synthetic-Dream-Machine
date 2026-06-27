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
 *   caller-supplied IslandBehavior: onEa / onSignal / onHooAnu
 *
 * ## Recipe law — one model across all wikis
 *
 *   Manifest carries `recipe: WikiRecipe + grants: IslandGrants`. Structural
 *   slots arrive as typed grants; the bag-oracle resolves from the @oracle doc's
 *   well-known tiddlers (protocol-invariant plane); library bags resolve from
 *   @catalog ONLY (boot = first reconcile — the same path recipe-watch walks
 *   live). `buildIslandRecipe()` lays the stack:
 *
 *     @temp        (MemoryTiddlerStore, volatile)
 *     @draft       (CRDT, high-churn drafts)
 *     @<wikiSlug>  (CRDT, operator's edits)
 *     libraryBags[]  (CRDT, optional content libraries — @lares persona +
 *                     @lararium corpus ride here, resolved island-side from @catalog)
 *     @oracle      (CRDT, required — the universal floor: engine core + grammar + bag-oracle)
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
  ENGINE_CORE_ID,
  TEMP_BAG,
  DRAFT_BAG,
  WORKING_BAG,
  PERSONAL_BAG,
  LARES_BAG,
  LARARIUM_BAG,
  ORACLE_BAG,
  tiddlerText,
  wikiBagUri,
  expandRecipe,
  mkBreath,
  mkFault,
  isVesselToIslandMsg,
  mkTeardownAck,
  makeIslandRepo,
  sha256HexBytesSync,
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
import { makeCatalogAccessor } from "./catalog-accessor.js";
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
  /**
   * Resolve content-addressed bytes by CID (sha256 hex) from the platform's LOCAL CAS
   * (browser OPFS · node FS). The breath path: the worker PULLS its TW5 engine + plugin
   * tiddlers by CID, never CRDT-syncing a 2.3 MB blob doc over the port. Returns null
   * when the CID is absent. Omitted → the kernel falls back to reading @oracle-doc blobs.
   */
  resolveByCid?(cid: string): Promise<Uint8Array | null>;
}

// ── runSovereignKernel — the OTP gen_island kernel ──────────────────────────

// The mount-breath interval. While a manifest mounts, the island emits a
// breath this often (plus a stage mark before each long stretch) so the
// vessel's watchdog re-arms on breath and silence alone reads dead.
const BREATH_INTERVAL_MS = 1_000;

export function runSovereignKernel(
  host: IslandHostSeam,
  behaviorOrFactory: IslandBehavior | ((manifest: IslandMsg_Manifest) => IslandBehavior),
  opts?: { breathEveryMs?: number },
): void {
  const breathEveryMs = opts?.breathEveryMs ?? BREATH_INTERVAL_MS;
  const _post = (msg: IslandToVesselMsg) => host.post(msg);
  const handler = new IslandKernel(_post);

  // Factory form: when a manifest-keyed factory is passed, the behavior resolves
  // lazily on first manifest — so the daemon entry can read manifest.daemonAuth
  // (the operator seed) at construction time.
  let behavior: IslandBehavior | null = typeof behaviorOrFactory === "function" ? null : behaviorOrFactory;
  const _resolveBehavior = (msg: IslandMsg_Manifest): IslandBehavior => {
    if (behavior === null) behavior = (behaviorOrFactory as (m: IslandMsg_Manifest) => IslandBehavior)(msg);
    return behavior;
  };

  let _repo:      Repo | null                    = null;
  let _handles:   Map<string, DocHandle<LarDoc>> = new Map();
  let _composite: CompositeStore | null = null;
  let _ctx:       IslandContext | null  = null;
  let _activeWikiUri                    = "";

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

    // Delegate to behavior — daemon handles daemon:place-verb, daemon:verb-result, etc.
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
    // The ea-breath law: the island breathes while it mounts — one breath at
    // receipt, a stage mark before each long stretch, and a steady interval
    // between awaits. Settle (ea or fault) ends the breathing. The interval
    // breath repeats the LAST evidence (alive); only tick() advances the
    // progress counter (advancing) — the vessel's stall budget judges the gap
    // (progress-kick over timer-kick).
    let _phase    = "manifest";
    let _progress = 0;
    const breathe = (): void => {
      _post(mkBreath(msg.wikiUri, _phase, _progress));
    };
    const tick = (next?: string): void => {
      if (next) _phase = next;
      _progress++;
      breathe();
    };
    breathe();
    const breathTimer = setInterval(() => breathe(), breathEveryMs);
    // Any throw during init (incl. a behavior.onEa gate failure, e.g.
    // bootDaemonKeyhive Gate A/B/C) posts fault so the vessel times out cleanly
    // instead of hanging without an ea.
    try {
      await _doManifest(msg, tick);
    } catch (err) {
      _post(mkFault(msg.wikiUri, `manifest handler threw: ${String(err)}`));
    } finally {
      clearInterval(breathTimer);
    }
  }

  // ── Slot resolution — wait with a deadline, fault loudly, never hang ───────
  //
  // Partition-as-normal-state: a doc that has not yet arrived over syncPort
  // gets a bounded wait; a doc that never arrives produces a LOUD fault the
  // vessel can read, never a mute hang the vessel must guess at by timeout.
  const SLOT_READY_TIMEOUT_MS = 8_000;

  async function _resolveSlot(
    repo: Repo,
    docUrl: string,
    slot: string,
    wikiUri: string,
  ): Promise<DocHandle<LarDoc> | null> {
    // automerge-repo 2.6: find() resolves only when READY and REJECTS on
    // unavailable (allowableStates + isUnavailable retired). Race the find
    // against a bounded timeout; fault if the doc never arrives over syncPort.
    const handle = await Promise.race([
      repo.find<LarDoc>(docUrl as AutomergeUrl).catch(() => null),
      new Promise<null>((res) => setTimeout(() => res(null), SLOT_READY_TIMEOUT_MS)),
    ]);
    if (handle) return handle;
    _post(mkFault(wikiUri, `slot ${slot} unavailable — doc ${docUrl} never arrived over syncPort (${SLOT_READY_TIMEOUT_MS}ms)`));
    return null;
  }

  async function _doManifest(
    msg: IslandMsg_Manifest,
    tick: (next?: string) => void = () => {},
  ): Promise<void> {
    const behavior = _resolveBehavior(msg);

    // Repo construction + network wiring is a CRDT concern owned by mesh; the
    // kernel composes it through the facade and stays @automerge-free.
    const storageAdapter = host.storage(msg);
    _repo = makeIslandRepo({ ...(storageAdapter ? { storage: storageAdapter } : {}), syncPort: msg.syncPort });

    _composite = new CompositeStore();

    // §6 — bytes travel via @lararium CRDT; manifest carries only integrity gate.
    // The engine grant resolves FIRST (engine bytes precede TW5 boot).
    tick("slots");
    const laraiumHandle = await _resolveSlot(_repo, msg.grants.islandUrl, ORACLE_BAG, msg.wikiUri);
    if (!laraiumHandle) return;
    _handles.set(ORACLE_BAG, laraiumHandle);

    // @catalog ACCESS (never layered) — the island resolves library bags from
    // the user registry ITSELF: boot runs the same resolution path recipe-watch
    // runs live (boot = first reconcile).
    const catalogUrl = msg.grants.catalogUrl ?? null;
    const catalog    = catalogUrl ? makeCatalogAccessor(_repo, catalogUrl) : null;

    // Three oracle planes, three authorities: system bags (@lares, @lararium)
    // resolve from the @oracle doc's well-known tiddlers — the system plane the
    // island already holds; user library bags resolve from @catalog; public bags
    // will resolve from @crossroads. Structural instance slots arrive as typed
    // grants.
    const slotUrl = async (slot: SlotUri): Promise<string | null> => {
      if (slot === DRAFT_BAG)                    return msg.grants.draftUrl    ?? null;
      if (slot === WORKING_BAG)                  return msg.grants.workingUrl  ?? null;
      if (slot === PERSONAL_BAG)                 return msg.grants.personalUrl ?? null;
      if (slot === wikiBagUri(msg.recipe.wikiSlug)) return msg.grants.wikiUrl ?? null;
      if (slot === ORACLE_BAG)                 return msg.grants.islandUrl;
      // System bags (@lares, @lararium) resolve from the @oracle doc's well-known
      // tiddlers — the system plane the island already holds (operator ruling
      // 2026-06-16). User library bags fall through to @catalog.
      if (slot === LARES_BAG)                    return tiddlerText(laraiumHandle.doc()?.tiddlers?.[LARES_BAG]) ?? null;
      if (slot === LARARIUM_BAG)                 return tiddlerText(laraiumHandle.doc()?.tiddlers?.[LARARIUM_BAG]) ?? null;
      return catalog ? await catalog.urlOf(slot) : null;   // user library bags
    };

    const slots = expandRecipe(msg.recipe);
    const ready: Array<{ slot: SlotUri; handle: DocHandle<LarDoc> }> = [];

    for (const slot of slots) {
      if (slot === TEMP_BAG) continue;
      if (slot === ORACLE_BAG) { ready.push({ slot, handle: laraiumHandle }); continue; }
      const docUrl = await slotUrl(slot);
      if (!docUrl) continue;   // ungranted/unregistered slot — in-memory or absent
      const handle = await _resolveSlot(_repo, docUrl, slot, msg.wikiUri);
      if (!handle) return;     // fault already posted
      _handles.set(slot, handle);
      ready.push({ slot, handle });
      tick();                  // one slot resolved — real progress evidence
    }

    // ── Resolve the TW5 engine + plugin tiddlers ──────────────────────────────
    // PREFERRED (the breath path): content-addressed pull from the platform's LOCAL CAS
    // (host.resolveByCid) — immutable bytes fetched by CID + verified by rehash, NEVER
    // CRDT-synced through the port. FALLBACK: read the blobs off the @oracle doc
    // (node / pre-CAS) when the host supplies no CAS resolver.
    let coreBytes: Uint8Array | null = null;
    let coreVersion = "";
    const pluginTiddlers: Record<string, unknown>[] = [];

    if (host.resolveByCid && msg.coreHash) {
      coreBytes = await host.resolveByCid(msg.coreHash);
      if (!coreBytes) {
        _post(mkFault(msg.wikiUri, `island cannot resolve TW5 core by CID ${msg.coreHash.slice(0, 12)}… from the local CAS`));
        return;
      }
      for (const cid of msg.pluginCids ?? []) {
        const bytes = await host.resolveByCid(cid);
        if (!bytes) {
          _post(mkFault(msg.wikiUri, `island cannot resolve plugin tiddler by CID ${cid.slice(0, 12)}… from the local CAS`));
          return;
        }
        try {
          pluginTiddlers.push(JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>);
        } catch { /* malformed — skip */ }
      }
    } else {
      const laraiumDoc = laraiumHandle.doc();
      const blobEntry  = laraiumDoc?.blobs?.[ENGINE_CORE_ID];
      coreBytes   = blobEntry?.blob ? new Uint8Array(blobEntry.blob) : null;
      coreVersion = String(blobEntry?.version ?? "");
      if (!coreBytes) {
        _post(mkFault(msg.wikiUri, `island cannot resolve TW5 core bytes — @lararium binding missing or blob absent (ENGINE_CORE_ID=${ENGINE_CORE_ID})`));
        return;
      }
      const blobs = laraiumDoc?.blobs ?? {};
      for (const [id, entry] of Object.entries(blobs)) {
        if (id === ENGINE_CORE_ID) continue;
        const mime = (entry as unknown as Record<string, unknown>)["mimeType"];
        if (mime !== "application/json") continue;
        const blobBytes = (entry as unknown as Record<string, unknown>)["blob"];
        if (!blobBytes) continue;
        try {
          pluginTiddlers.push(JSON.parse(new TextDecoder().decode(new Uint8Array(blobBytes as Uint8Array))) as Record<string, unknown>);
        } catch { /* malformed blob — skip */ }
      }
    }

    // §6 integrity gate, enforced: the manifest's coreHash names the engine the vessel
    // intends; the kernel hashes the bytes it actually eval's. A mismatch faults before
    // boot — the island never runs an engine it cannot witness. (Free on the CAS path:
    // the CID IS the hash.)
    const engineSha = sha256HexBytesSync(coreBytes);
    if (msg.coreHash && msg.coreHash !== engineSha) {
      _post(mkFault(msg.wikiUri, `TW5 core integrity gate failed — manifest coreHash=${msg.coreHash.slice(0, 12)}… vs eval'd bytes sha256=${engineSha.slice(0, 12)}…`));
      return;
    }
    const engine = { sha256: engineSha, version: coreVersion };

    if (!pluginTiddlers.length) {
      _post(mkFault(msg.wikiUri, "island cannot load plugin tiddlers — none resolved (CAS by CID, or @lararium blobs)"));
      return;
    }

    tick("tw5-boot");
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
    // initial replay synchronously through the in-wiki nalu engine. The replay
    // blocks this thread (no interval breath fires), so the stage mark lands
    // first — the watchdog's window restarts right before the long stretch.
    tick("recipe");
    buildIslandRecipe({
      tw5,
      composite: _composite,
      recipe: msg.recipe,
      ready,
    });

    // Isomorphic base: the @catalog grant rides into ctx (access entry, NOT a
    // load slot — @catalog is absent from expandRecipe). Worker behaviors build
    // a CatalogAccessor over it to reach any registered bag; recipe-watch keeps
    // reconciling the SAME path boot just walked.
    _ctx = { wikiUri: msg.wikiUri, composite: _composite, tw5, handles: _handles, post: _post, repo: _repo!, catalogUrl, oracleUrl: msg.grants.islandUrl, engine, recipe: msg.recipe };
    tick("behavior");
    await behavior.onEa(_ctx);

    handler.sendEa(msg.wikiUri);
  }

  // ── Teardown / Demote (OTP terminate) ──────────────────────────────────────

  async function _handleTeardown(): Promise<void> {
    if (_ctx && behavior) await behavior.onHooAnu(_ctx);
    handler.teardown();

    _handles.clear();
    _composite = null;
    _ctx       = null;
    _repo      = null;

    host.post(mkTeardownAck());
  }
}
