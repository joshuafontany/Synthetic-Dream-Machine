/**
 * sovereign-kernel — the platform-blind OTP gen_island lifecycle.
 *
 * ONE kernel both vessels run. Node and browser do NOT each implement a
 * lifecycle; they each COMPOSE this one flow with a small host shore. The shore
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
 *     temp        (MemoryTiddlerStore, volatile)
 *     draft       (CRDT, high-churn drafts)
 *     @<wikiSlug>  (CRDT, operator's edits)
 *     libraryBags[]  (CRDT, optional content libraries — @lares persona +
 *                     @lararium corpus ride here, resolved island-side from @catalog)
 *     @oracle      (CRDT, required — the universal floor: engine core + grammar + bag-oracle)
 *
 *   Write routing happens via the in-wiki cascade
 *   (`lar:///ha.ka.ba/lararium/config/bag-paths`), not by behavior config.
 *
 * ## The host shore (composition, not adaptation)
 *
 *   IslandHostShore carries the platform divergence as DATA + resolver fns:
 *     - post     : transport out (node parentPort.postMessage / browser self.postMessage)
 *     - listen   : transport in  (node parentPort.on / browser self.addEventListener)
 *     - storage  : Repo storage adapter for this manifest (nodefs / IndexedDB / memory)
 *     - ready?   : optional IoC handshake (browser posts mkReady; node omits)
 *
 *   Same isomorphic flow; different pieces resolved. role ≠ platform.
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/sovereign-kernel
 */

import {
  CompositeStore,
  ENGINE_CORE_ID,
  LARES_BAG,
  LARARIUM_BAG,
  ORACLE_BAG,
  CROSSROADS_BAG,
  tiddlerText,
  wikiBagUri,
  wikiSlotUri,
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
import { installLazyResolver } from "./lazy-resolver.js";
import type { IslandContext, IslandBehavior } from "./island-context.js";

// ── The host shore — platform divergence as composition ──────────────────────

export interface IslandHostShore {
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
  host: IslandHostShore,
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
  let _lazyUnsub: (() => void) | null   = null;
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

  // ── Slot resolution — silence-measured wait, fault loudly, never hang ──────
  //
  // Partition-as-normal-state: a doc that has not yet arrived over syncPort
  // gets a bounded wait; a doc that never arrives produces a LOUD fault the
  // vessel can read, never a mute hang the vessel must guess at by timeout.
  //
  // Silence is MEASURED on the syncPort (monotonic, suspend-blind), never
  // inferred from a fixed wall deadline: during a fresh-corpus boot both the
  // vessel main thread and this island wedge for whole seconds in synchronous
  // automerge/keyhive work, so a bare 8s `Promise.race` faulted a LIVE sync
  // whose response sat queued behind the wedge (personal never
  // "arrived" while its doc sat on disk the whole time).
  // The vessel-host ea-wait carries the same law; this is its island-side twin:
  //   - the budget clocks port-silence, re-armed by ANY inbound sync traffic
  //     (a busy peer mid-corpus-sync reads live, not absent);
  //   - a verdict defers one turn so queued port messages land first;
  //   - a hard cap keeps the loud-fault law when traffic flows forever without
  //     the doc (the vessel's mount stall budget backstops far above it).
  const SLOT_SILENCE_TIMEOUT_MS = 8_000;
  const SLOT_READY_HARD_CAP_MS  = 60_000;
  const SLOT_POLL_MS            = 250;
  const mono = (): number => performance.now();
  const defer = (): Promise<void> =>
    new Promise((res) => (typeof setImmediate === "function" ? setImmediate(res) : setTimeout(res, 0)));
  let _lastSyncHeardAt = mono();
  const _markSyncHeard = (): void => { _lastSyncHeardAt = mono(); };

  async function _resolveSlot(
    repo: Repo,
    docUrl: string,
    slot: string,
    wikiUri: string,
  ): Promise<DocHandle<LarDoc> | null> {
    const started = mono();
    // automerge-repo 2.6: find() resolves only when READY and REJECTS on an
    // unavailable VERDICT (the peer answered "don't have") — a genuine miss,
    // distinct from not-yet-arrived. undefined = still pending.
    let outcome: DocHandle<LarDoc> | null | undefined;
    void repo.find<LarDoc>(docUrl as AutomergeUrl).then(
      (h) => { outcome = h; },
      ()  => { outcome = null; },
    );
    // The silence budget clocks from max(last inbound message, THIS find's start):
    // slots that resolve from the island's own storage partition move no port
    // traffic, so quiet accrued BEFORE this find says nothing about this doc's
    // request (draft faulted at 756ms elapsed under 9240ms of stale
    // pre-find silence when the big bags loaded locally).
    const silence = (): number => mono() - Math.max(_lastSyncHeardAt, started);
    for (;;) {
      await new Promise((res) => setTimeout(res, SLOT_POLL_MS));
      if (outcome !== undefined) break;
      if (silence() < SLOT_SILENCE_TIMEOUT_MS && mono() - started < SLOT_READY_HARD_CAP_MS) continue;
      // Verdict deferral: queued port messages get one turn to land and move
      // _lastSyncHeardAt (or settle the find) before the fault fires.
      await defer();
      if (outcome !== undefined) break;
      const finalSilent = silence();
      if (finalSilent < SLOT_SILENCE_TIMEOUT_MS && mono() - started < SLOT_READY_HARD_CAP_MS) continue;
      _post(mkFault(wikiUri,
        `slot ${slot} unavailable — doc ${docUrl} never arrived over syncPort ` +
        `(${Math.round(finalSilent)}ms port-silence, ${Math.round(mono() - started)}ms elapsed; ` +
        `silence budget ${SLOT_SILENCE_TIMEOUT_MS}ms, hard cap ${SLOT_READY_HARD_CAP_MS}ms)`));
      return null;
    }
    if (outcome) return outcome;
    _post(mkFault(wikiUri, `slot ${slot} unavailable — the peer answered WITHOUT doc ${docUrl} (unavailable verdict, not a timeout)`));
    return null;
  }

  async function _doManifest(
    msg: IslandMsg_Manifest,
    tick: (next?: string) => void = () => {},
  ): Promise<void> {
    const behavior = _resolveBehavior(msg);

    // Repo construction + network wiring is a CRDT concern owned by mesh; the
    // kernel composes it through the facade and stays @automerge-free.
    //
    // The silence clock taps the syncPort FIRST (same tick — no message can slip
    // between listeners): every inbound sync message marks the peer live, so the
    // slot wait measures true port-silence, never a wall deadline over a busy peer.
    _lastSyncHeardAt = mono();
    const tapPort = msg.syncPort as unknown as {
      addEventListener?: (t: string, h: () => void) => void;
      on?: (t: string, h: () => void) => void;
    };
    // Node worker_threads ports speak EventEmitter, browser ports EventTarget;
    // tap whichever face the platform holds (both coexist with the adapter's own).
    if (typeof tapPort.addEventListener === "function") tapPort.addEventListener("message", _markSyncHeard);
    else tapPort.on?.("message", _markSyncHeard);
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
    const slug = msg.recipe.wikiSlug;
    const slotUrl = async (slot: SlotUri): Promise<string | null> => {
      if (slot === wikiSlotUri(slug, "draft"))    return msg.grants.draftUrl    ?? null;
      if (slot === wikiSlotUri(slug, "working"))  return msg.grants.workingUrl  ?? null;
      if (slot === wikiSlotUri(slug, "personal")) return msg.grants.personalUrl ?? null;
      if (slot === wikiBagUri(slug))              return msg.grants.wikiUrl ?? null;
      if (slot === ORACLE_BAG)                 return msg.grants.islandUrl;
      // System bags (@lares, @lararium) resolve from the @oracle doc's well-known
      // tiddlers — the system plane the island already holds. User library
      // bags fall through to @catalog.
      if (slot === LARES_BAG)                    return tiddlerText(laraiumHandle.doc()?.tiddlers?.[LARES_BAG]) ?? null;
      if (slot === LARARIUM_BAG)                 return tiddlerText(laraiumHandle.doc()?.tiddlers?.[LARARIUM_BAG]) ?? null;
      // @crossroads — the PUBLIC oracle plane; its pointer rides @oracle (public infra), resolved the same
      // well-known-tiddler way as the system bags. Public bags in turn resolve FROM @crossroads.
      if (slot === CROSSROADS_BAG)               return tiddlerText(laraiumHandle.doc()?.tiddlers?.[CROSSROADS_BAG]) ?? null;
      return catalog ? await catalog.urlOf(slot) : null;   // user library bags
    };

    const slots = expandRecipe(msg.recipe);
    const ready: Array<{ slot: SlotUri; handle: DocHandle<LarDoc> }> = [];

    for (const slot of slots) {
      if (slot === wikiSlotUri(slug, "temp")) continue;
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
    // The CID plane: the kernel, plugin blobs, and every large blob ride the local CAS,
    // pulled by CID (host.resolveByCid) — immutable bytes fetched by content-address +
    // verified by rehash, off the sync port. The CRDT plane carries no bytes. A missing
    // resolver, a missing coreHash, or a CAS miss faults the boot.
    // The booted engine version rides the SAME genesis blob entry the post-boot
    // engine-watch later compares against (blobs[ENGINE_CORE_ID].version on the
    // oracle doc). Sourcing it here — not a hardcoded "" — arms the anti-rollback
    // check: a later genesis pointing at a LOWER version reads as BACKWARD instead
    // of being silently presented as an upgrade (an empty booted-version made every
    // incoming version sort as newer).
    const coreVersion = String(laraiumHandle.doc()?.blobs?.[ENGINE_CORE_ID]?.version ?? "");
    const pluginTiddlers: Record<string, unknown>[] = [];

    if (!host.resolveByCid || !msg.coreHash) {
      _post(mkFault(msg.wikiUri, `island cannot resolve the TW5 core — the CID plane needs a local CAS resolver and a coreHash`));
      return;
    }
    const coreBytes = await host.resolveByCid(msg.coreHash);
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
    // wires temp + every resolved CRDT slot, registers the adaptor, and ARMS
    // the seed replay on the paced nalu rail (progressive-boot: no synchronous
    // unbounded flush). The seed then drains frame-by-frame off the critical
    // path, so this thread keeps breathing while the corpus streams in.
    tick("recipe");
    buildIslandRecipe({
      tw5,
      composite: _composite,
      recipe: msg.recipe,
      ready,
    });
    // Await the hydration checkpoint before arming behavior — onEa still observes a
    // fully-resident seed (the invariant), but the drain paced the loop instead of
    // blocking it. Resolves at once on a wiki-less path (no hydration begun).
    await (tw5 as unknown as { lares?: { whenSeedDrained?: () => Promise<void> } })
      .lares?.whenSeedDrained?.();

    // Isomorphic base: the @catalog grant rides into ctx (access entry, NOT a
    // load slot — @catalog is absent from expandRecipe). Worker behaviors build
    // a CatalogAccessor over it to reach any registered bag; recipe-watch keeps
    // reconciling the SAME path boot just walked.
    // The CID plane the kernel already pulls engine/plugin bytes from, lifted to
    // behaviors: a residency handler resolves a carrier body a verb rode by reference.
    _ctx = { wikiUri: msg.wikiUri, composite: _composite, tw5, handles: _handles, post: _post, repo: _repo!, catalogUrl, oracleUrl: msg.grants.islandUrl, engine, recipe: msg.recipe, ...(host.resolveByCid ? { resolveByCid: host.resolveByCid } : {}) };
    // Read-side skinny-handle rehydration: answer TW5's own `lazyLoad` event (fired when
    // `getTiddlerText` meets a bodyless `_is_skinny` tiddler) by pulling the body from the corpus
    // CAS through the SAME resolveByCid shore the kernel already rides for engine/plugin blobs. The
    // splice runs through the guarded nalu rail, so a rehydrated body never echoes back to the CRDT
    // (content-resolution.mem #tw5-shore). Off when the island exposes no CAS resolver.
    if (host.resolveByCid) _lazyUnsub = installLazyResolver(tw5, host.resolveByCid);
    tick("behavior");
    await behavior.onEa(_ctx);

    handler.sendEa(msg.wikiUri);
  }

  // ── Teardown / Demote (OTP terminate) ──────────────────────────────────────

  async function _handleTeardown(): Promise<void> {
    _lazyUnsub?.();
    _lazyUnsub = null;
    if (_ctx && behavior) await behavior.onHooAnu(_ctx);
    handler.teardown();

    // DURABLE FLUSH before ack — persist this island's in-flight Automerge docs
    // (e.g. working) to its own storage so a graceful shutdown NEVER desyncs an
    // actively-written doc. Automerge-repo persists on a debounced timer; a bare
    // worker.terminate() (or SIGKILL) before that timer fires loses the write — the
    // "working never arrived over syncPort" gap. flush() resolves once the bytes
    // are durable. We await it BEFORE posting teardown:ack, so the vessel's
    // disposeAll() handshake only completes after every island's write is on disk
    // (flush-then-force; the vessel's force-timer is the only escape if THIS jams).
    if (_repo) {
      try { await _repo.flush(); }
      catch (err) { console.warn(`[sovereign-kernel] teardown flush failed: ${String(err)}`); }
    }

    _handles.clear();
    _composite = null;
    _ctx       = null;
    _repo      = null;

    host.post(mkTeardownAck());
  }
}
