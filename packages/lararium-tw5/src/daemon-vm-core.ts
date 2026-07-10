/**
 * daemon-vm-core — the platform-blind daemon-island vessel lifecycle.
 *
 * ONE core both vessels compose (mirror pair 2/5). Subtracts the identical
 * skeleton from open-daemon-vm.ts (node) ⇆ open-browser-daemon-vm.ts (browser):
 * composite wiring, MessageChannel sync, ea-promise + breath watchdog, the delegation
 * loop, manifest delivery, placeVerb/mountMainVerbs/dispose. The platform
 * divergence remains as a two-member host seam (spawnWorker + newSyncChannel);
 * the resolved daemon doc handle is passed in by the caller (the two platforms
 * resolve it with genuinely different strategies — node merge-on-late-arrival,
 * browser find-or-create — so that stays a wrapper concern, not the core's).
 *
 * Node-only capability proxies (authSeam, resolveBinding) compose ON TOP via a
 * second listener on the exposed `worker` handle — they are node-ahead surface,
 * not duplication, so the core stays free of them.
 *
 * Network-adapter wiring routes through mesh (attachMessageChannelSync); the
 * core holds zero @automerge/* imports — same facade law as sovereign-kernel.
 *
 * Meme: lar:///ha.ka.ba/@lararium/tw5/daemon-vm-core
 */

import {
  DAEMON_BAG_ID,
  PERSONA_BAG_ID,
  CompositeStore,
  AutomergeDocStore,
  attachMessageChannelSync,
  awaitIslandMsg,
  mkManifest,
  mkDaemonPlaceVerb,
  mkTelemetryPlaceVerb,
  mkStructurepalaceKapae,
  mkDaemonVerbResult,
  mkDaemonVerifyRequest,
  mkDaemonResolveBindingRequest,
  mkDaemonDeriveSkeletonRequest,
  mkDaemonWorldlineCompareRequest,
  mkDaemonWorldlineTrajectoryRequest,
  mkDaemonEvictResult,
  mkDaemonResidencyOpResult,
  mkTeardown,
  isIslandToVesselMsg,
  type VesselWorkerHandle,
  type Repo,
  type DocHandle,
  type LarDoc,
  type WikiRecipe,
  type AuthVerifierSeam,
  type IslandStorageConfig,
  type IslandMsg_Manifest,
  type IslandGrants,
  type DaemonMsg_DelegateVerb,
  type DaemonMsg_VerifyResult,
  type DaemonMsg_ResolveBindingResult,
  type DaemonMsg_DeriveSkeletonResult,
  type DaemonMsg_WorldlineCompareResult,
  type DaemonMsg_WorldlineTrajectoryResult,
  type WorldlineStubWire,
  type WorldlineEdgeTriple,
  type WorldlineEdgeClose,
  type DaemonMsg_EvictRequest,
  type DaemonMsg_ResidencyOp,
  type DaemonMsg_WikiAlert,
  type BatchMode,
  type IslandMsg_Ea,
  type IslandMsg_TeardownAck,
} from "@lararium/mesh";
import { runLocalVerb } from "./verb-local-dispatch.js";
import type { VerbTable } from "./verb-dispatcher.js";
import type { MoveSkeleton, ConstructiconAxis } from "./form-layer/index.js";

/** The in-VM query-derive result the recall verb round-trips for — the move-skeleton (FULL functor,
 *  structural plane present) + the serialized `{axes, dimension}` basis. `null` = no derivable form
 *  (→ recall fuses content-only). Structurally matches node's FormSearch deriveSkeleton return. */
export interface DaemonDeriveSkeletonResult {
  skeleton: MoveSkeleton;
  basis: { axes: readonly ConstructiconAxis[]; dimension: number };
}

/** Well 1 input the host round-trips to the worker — two handles + the edge-DAG to project from. */
export interface DaemonWorldlineCompareInput {
  a: string;
  b: string;
  opens: readonly WorldlineEdgeTriple[];
  closes?: readonly WorldlineEdgeClose[];
  root?: string;
}

/** Well 3 + Well 4 input the host round-trips to the worker — a handle's turns (form-vectors shipped). */
export interface DaemonWorldlineTrajectoryInput {
  handle: string;
  stubs: readonly WorldlineStubWire[];
  joinForm?: boolean;
  includeNull?: boolean;
  seed?: number;
  window?: number;
}

/** The in-VM trajectory read result — the worldline-ordered path (+ optional null baseline). Plain
 *  objects (the worker computed; the host relays). `unknown` to keep the core free of the mesh
 *  WorldlineTrajectory type detail — the verb shapes the response. */
export interface DaemonWorldlineTrajectoryResult {
  trajectory: unknown;
  nullBaseline?: unknown;
}

// The ea watchdog budget — a SILENCE window, not a mount deadline.
// The mounting island emits breath (sovereign-kernel:
// stage marks + a steady interval); each breath re-arms this timer, so a
// long live mount never reads dead — silence alone times out, and the
// rejection names the last breath heard (readiness reads local). A fixed
// deadline cannot bound this: a fed store's mount
// scales with stored docs and disk latency; 120s stays as the silence
// budget — tightening it reads as a later knob, never a correctness cut.
const EA_SILENCE_TIMEOUT_MS = 120_000;

// The progress-stall budget — bounds breathing-without-advancing (the
// embedded-systems timer-kick anti-pattern: an interval breath proves the
// event loop turns, not that mount advances). Fresh (phase, progress)
// evidence restarts this clock; frozen evidence spends it down even while
// breaths keep re-arming the silence window.
const EA_STALL_TIMEOUT_MS = 3 * EA_SILENCE_TIMEOUT_MS;

/** The MessagePort type, borrowed through the mesh manifest (no DOM-lib dep). */
type VesselMessagePort = IslandMsg_Manifest["syncPort"];

/** The two-member daemon-VM host seam — platform divergence as composition. */
export interface DaemonVmHost {
  spawnWorker(scriptUrl: URL): VesselWorkerHandle;
  newSyncChannel(): { mainPort: VesselMessagePort; syncPort: VesselMessagePort };
}

export interface DaemonVmCoreOptions {
  /** Vessel main Repo — gains the island sync leg. */
  repo:            Repo;
  /** Daemon doc handle, already resolved by the platform wrapper. */
  daemonHandle:     DocHandle<LarDoc>;
  /** Persona (@persona PersonaGroup) doc handle, resolved by the platform wrapper the same way.
   *  The ONE daemon VM tends BOTH bags — @daemon (sovereign) + @persona (veiled identity). */
  personaHandle:    DocHandle<LarDoc>;
  /** One-recipe model for the daemon island. */
  recipe:          WikiRecipe;
  /** Typed structural capabilities (engine doc, @daemon bag, @lares, @catalog access). */
  grants:          IslandGrants;
  /** SHA-256 hex of the TW5 core blob. null = pre-CAS. */
  coreHash:        string | null;
  /** CIDs of the engine's plugin-tiddler blobs — the worker pulls them by CID from its
   *  local CAS (the breath path). Absent → the worker reads blobs off the @oracle doc. */
  pluginCids?:     readonly string[];
  /** Operator authn/z material for in-worker keyhive boot (Stage 1). */
  daemonAuth?:      IslandMsg_Manifest["daemonAuth"];
  /** Storage config delivered in the manifest (node nodefs; browser omits). */
  storage?:        IslandStorageConfig;
  /** Compiled daemon-island Worker script URL. */
  workerScriptUrl: URL;
  /** Override the ea silence budget in ms (tests). */
  eaSilenceMs?:    number;
  /** Override the ea progress-stall budget in ms (default 3x silence). */
  eaStallMs?:      number;
}

/** Unified placeVerb request — union of node + browser fields. */
export interface VesselPlaceVerbRequest {
  verb:         string;
  args:         Record<string, unknown>;
  requestedBy?: string;
  requestId?:   string;
  targets?:     readonly string[];
  batchMode?:   string;
  fromUri?:     string;
  listenable?:  string;
}

export interface DaemonVmCore {
  daemonHandle:    DocHandle<LarDoc>;
  composite:      CompositeStore;
  workerEa:       Promise<void>;
  mountMainVerbs: (registry: VerbTable) => void;
  placeVerb:      (opts: VesselPlaceVerbRequest) => void;
  /** FEED one captured turn to the @daemon's telemetry capture cap (the nalu). Fire-and-forget.
   *  `frontier` (optional) carries the turn-DAG fork-frontier so a same-session fork derives a
   *  distinct handle; absent on a non-forked turn. */
  placeTelemetry: (turnText: string, sourceFile: string, frontier?: readonly string[], turnKey?: string, chunkIndex?: number) => void;
  /** REWIND (kapae) one turn's .structurepalace tally + salience down-weight, IN the daemon island (it owns
   *  the warm holder). Fire-and-forget — the convergence twin of the CLI-side KG valid-close. */
  placeStructurepalaceKapae: (turnKey: string, ended?: string) => void;
  /**
   * Derive a recall query's move-skeleton IN the daemon VM (the recall twin of placeTelemetry) —
   * round-trips the query string through the island's `$tw.lares.deriveQuerySkeletonVm` so the
   * markers→vector recall runs the SAME Move→Vec functor capture runs (full grammar + live basis,
   * structural plane present). Resolves `null` when the query carries no derivable move-form.
   */
  deriveSkeleton: (query: string) => Promise<DaemonDeriveSkeletonResult | null>;
  /**
   * Well 1 (the ITC LIVE-READ) — answer the concurrent-capable causal verdict between two handles IN
   * the daemon VM. Round-trips the edge-DAG (host-derived from a transcript) + the two handles through
   * the island's `$tw.lares.worldlineCompareVm`; the worker projects the registry + runs the ITC
   * tree-leq. Rejects (the worker's error) on an unknown handle — the verb wraps the helpful message.
   */
  worldlineCompare: (input: DaemonWorldlineCompareInput) => Promise<{ order: string }>;
  /**
   * Well 3 (THE CORE) + Well 4 (NULL-READY) — a handle's worldline-ordered form-vector path IN the
   * daemon VM. Round-trips the captured turns (form-vectors the host pre-fetched from the form store
   * shipped on the stubs) through `$tw.lares.worldlineTrajectoryVm`; the worker orders + joins +
   * (optionally) shuffles. Total — empty stubs resolve an empty trajectory.
   */
  worldlineTrajectory: (input: DaemonWorldlineTrajectoryInput) => Promise<DaemonWorldlineTrajectoryResult>;
  /**
   * Host-side inbound-peer verifier (path b) — proxies verify() to the island's
   * keyhive via daemon:verify-request/result. Common to both vessels.
   */
  authSeam:       AuthVerifierSeam;
  /**
   * Resolve (or mint+delegate) the operator's @personal/@draft binding pair for
   * a recipe fingerprint — runs island-side where keyhive lives. Common surface.
   */
  resolveBinding: (
    fingerprint: string,
    recipeTrace: { wikiDocId: string; libraryBagDocIds: readonly string[] },
  ) => Promise<{ personalUrl: string; draftUrl: string; workingUrl: string }>;
  /**
   * GRACEFUL shutdown — post a teardown to the daemon island and AWAIT its
   * teardown:ack (the island flushes its in-flight Automerge docs + capture state
   * before acking), then terminate. Budgeted: if the worker is jammed (e.g. a
   * keyhive WASM reconverge holding the event loop) the ack never arrives, the
   * await times out, and we terminate anyway — but the vessel has already flushed
   * its own main-replica floor by then (flush-then-force, never force-before-flush).
   * Use on a signal-driven shutdown; `dispose()` stays the hard, no-flush kill.
   */
  shutdown:       (budgetMs?: number) => Promise<void>;
  dispose:        () => void;
  /** Exposed so platform wrappers compose any further capability on top. */
  worker:         VesselWorkerHandle;
  /**
   * Register the pool's eviction MECHANISM (sovereign-worker model): the daemon worker
   * owns residency POLICY and commands an evict via daemon:evict-request; main routes it
   * here to the pool (the worker holds a capability to the pool, not the pool). Set
   * AFTER the pool exists (post makePool). Absent → evict-requests fail closed.
   */
  onEvictRequest: (fn: (bagId: string) => Promise<void>) => void;
  /**
   * Register the residency-op MECHANISM: the worker commands pin/unpin/register-cold
   * (daemon:residency-op, keyhive-gated policy); main routes here to the BagResidencyManager
   * (which stays at the resource). Set after the manager exists. Absent → fail closed.
   */
  onResidencyOp: (fn: (op: "pin" | "unpin" | "register-cold", bagId: string, reason?: string) => Promise<void>) => void;
  /**
   * Register the wiki-alert DELIVERY: the worker decided a change needs a reboot to
   * apply (daemon:wiki-alert) and names the affected wiki; main routes here to place a
   * `system-alert` verb into that wiki's live island (skip if not mounted). Set after
   * the pool exists. Fire-and-forget; absent → alerts silently dropped.
   */
  onWikiAlert: (fn: (wikiSlug: string, message: string, cause?: string, kind?: string) => void) => void;
}

export function openDaemonVmCore(host: DaemonVmHost, opts: DaemonVmCoreOptions): DaemonVmCore {
  const { repo, daemonHandle, personaHandle, recipe, grants, coreHash, pluginCids, daemonAuth, storage, workerScriptUrl } = opts;

  // Mutable delegation config — set via mountMainVerbs(). The worker gates routed
  // verbs (verify-then-delegate); main trusts the channel, so no main-side verifier.
  let _registry: VerbTable | null = null;
  // Pool eviction mechanism — set via onEvictRequest() after the pool exists.
  let _evictHandler: ((bagId: string) => Promise<void>) | null = null;
  // Residency-op mechanism — set via onResidencyOp() after the manager exists.
  let _residencyHandler: ((op: "pin" | "unpin" | "register-cold", bagId: string, reason?: string) => Promise<void>) | null = null;
  // Wiki-alert delivery — set via onWikiAlert() after the pool exists.
  let _wikiAlertHandler: ((wikiSlug: string, message: string, cause?: string, kind?: string) => void) | null = null;

  // ── Vessel composite (cap-event + receipt writes) ──────────────────────────
  const composite  = new CompositeStore();
  const daemonStore = new AutomergeDocStore(daemonHandle, DAEMON_BAG_ID);
  composite.addLayer({ bagId: DAEMON_BAG_ID, store: daemonStore, writable: true });
  daemonStore.markSyncComplete();
  // @persona — the operator's veiled-identity bag, tended by the SAME VM (one VM, two bags).
  const personaStore = new AutomergeDocStore(personaHandle, PERSONA_BAG_ID);
  composite.addLayer({ bagId: PERSONA_BAG_ID, store: personaStore, writable: true });
  personaStore.markSyncComplete();

  // ── MessageChannel — island ↔ vessel Repo sync (wiring owned by mesh) ───────
  const { mainPort, syncPort } = host.newSyncChannel();
  attachMessageChannelSync(repo, mainPort);

  // ── Spawn daemon island ─────────────────────────────────────────────────────
  const worker = host.spawnWorker(workerScriptUrl);

  // ── askIsland — ONE request/reply correlation primitive ─────────────────────
  // Both vessel→island capability proxies (verify, resolveBinding) compose on
  // this single piece instead of hand-rolling a pending-map each.
  let _askSeq = 0;
  const _pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  function askIsland<T>(prefix: string, makeMsg: (requestId: string) => unknown): Promise<T> {
    const requestId = `${prefix}-${++_askSeq}`;
    return new Promise<T>((resolve, reject) => {
      _pending.set(requestId, { resolve: resolve as (v: unknown) => void, reject });
      worker.post(makeMsg(requestId));
    });
  }
  function settleAsk(requestId: string, value: unknown, error?: string): void {
    const p = _pending.get(requestId);
    if (!p) return;
    _pending.delete(requestId);
    if (error) p.reject(new Error(error));
    else p.resolve(value);
  }

  // ── workerEa — the ea-wait rides the shared hull (one-hull law, step 1) ─────
  // awaitIslandMsg carries the whole breath watchdog: re-arm on breath, stall
  // budget on frozen (phase, progress), silence alone times out, fault rejects
  // immediately. No bespoke daemon timer survives — the daemon VM and the island
  // pool now share ONE watchdog mechanism (vessel-host).
  const silenceMs = opts.eaSilenceMs ?? EA_SILENCE_TIMEOUT_MS;
  const stallMs   = opts.eaStallMs   ?? (opts.eaSilenceMs !== undefined ? 3 * opts.eaSilenceMs : EA_STALL_TIMEOUT_MS);
  const workerEa: Promise<void> = awaitIslandMsg<IslandMsg_Ea>({
    expectedType:    "ea",
    timeoutMs:       silenceMs,
    progressStallMs: stallMs,
    resetOnTypes:    ["breath"],
    rejectOnTypes:   ["fault"],
    subscribe:       (h) => worker.listen(h),
    subscribeError:  (h) => worker.onError(h),
  }).then(() => undefined);
  // Settle-safety: a dispose() mid-boot leaves the silence timer to fire after
  // the worker dies; this no-op handler keeps that late rejection from going
  // unhandled while real awaiters still receive it.
  workerEa.catch(() => {});

  // ── Delegation loop + island message routing ────────────────────────────────
  // breath/ea/fault ride the awaitIslandMsg subscription above; this listener
  // carries only the live daemon surfaces.
  worker.listen((raw: unknown) => {
    if (!isIslandToVesselMsg(raw)) return;

    // Surface island FAULTS on the main console (the worker's own console doesn't bubble). The
    // Awake signal (ea) rides workerEa → the vessel's "live" phase, and breath rides the
    // awaitIslandMsg subscription — neither needs a console echo.
    if (raw.type === "fault") {
      console.error(`[daemon-island:fault] ${JSON.stringify(raw).slice(0, 240)}`);
    }

    if (raw.type === "daemon:verify-result") {
      const msg = raw as DaemonMsg_VerifyResult;
      settleAsk(msg.requestId, {
        ok: msg.ok,
        ...(msg.identifier ? { identifier: msg.identifier } : {}),
        ...(msg.reason ? { reason: msg.reason } : {}),
        ...(msg.proofVerified !== undefined ? { proofVerified: msg.proofVerified } : {}),
      });
      return;
    }

    if (raw.type === "daemon:resolve-binding-result") {
      const msg = raw as DaemonMsg_ResolveBindingResult;
      if (msg.error) settleAsk(msg.requestId, undefined, msg.error);
      else if (msg.personalUrl && msg.draftUrl && msg.workingUrl) settleAsk(msg.requestId, { personalUrl: msg.personalUrl, draftUrl: msg.draftUrl, workingUrl: msg.workingUrl });
      else settleAsk(msg.requestId, undefined, "resolve-binding-result missing urls");
      return;
    }

    if (raw.type === "daemon:derive-skeleton-result") {
      const msg = raw as DaemonMsg_DeriveSkeletonResult;
      if (msg.error) settleAsk(msg.requestId, undefined, msg.error);
      // skeleton+basis both present → the derivation; both absent → a graceful null (content-only).
      else settleAsk(
        msg.requestId,
        msg.skeleton !== undefined && msg.basis !== undefined ? { skeleton: msg.skeleton, basis: msg.basis } : null,
      );
      return;
    }

    if (raw.type === "daemon:worldline-compare-result") {
      const msg = raw as DaemonMsg_WorldlineCompareResult;
      if (msg.error) settleAsk(msg.requestId, undefined, msg.error);
      else settleAsk(msg.requestId, { order: msg.order });
      return;
    }

    if (raw.type === "daemon:worldline-trajectory-result") {
      const msg = raw as DaemonMsg_WorldlineTrajectoryResult;
      if (msg.error) settleAsk(msg.requestId, undefined, msg.error);
      else settleAsk(
        msg.requestId,
        { trajectory: msg.trajectory, ...(msg.nullBaseline !== undefined ? { nullBaseline: msg.nullBaseline } : {}) },
      );
      return;
    }

    if (raw.type === "daemon:evict-request") {
      // Sovereign-worker: the worker decided (policy, keyhive-gated); main executes the
      // mechanism (pool teardown). Route to the injected pool handler; ack regardless.
      const msg = raw as DaemonMsg_EvictRequest;
      const run = _evictHandler
        ? _evictHandler(msg.bagId)
        : Promise.reject(new Error("no evict handler bound (pool not ready)"));
      run
        .then(() => worker.post(mkDaemonEvictResult({ requestId: msg.requestId, ok: true })))
        .catch((err: unknown) => worker.post(mkDaemonEvictResult({
          requestId: msg.requestId, ok: false, error: err instanceof Error ? err.message : String(err),
        })));
      return;
    }

    if (raw.type === "daemon:residency-op") {
      // Sovereign-worker: the worker's residency verb (pin/unpin/register-cold) granted
      // policy; main executes the mechanism on the BagResidencyManager. Ack regardless.
      const msg = raw as DaemonMsg_ResidencyOp;
      const run = _residencyHandler
        ? _residencyHandler(msg.op, msg.bagId, msg.reason)
        : Promise.reject(new Error("no residency handler bound (manager not ready)"));
      run
        .then(() => worker.post(mkDaemonResidencyOpResult({ requestId: msg.requestId, ok: true })))
        .catch((err: unknown) => worker.post(mkDaemonResidencyOpResult({
          requestId: msg.requestId, ok: false, error: err instanceof Error ? err.message : String(err),
        })));
      return;
    }

    if (raw.type === "daemon:wiki-alert") {
      // Sovereign-worker: the worker decided a change needs a reboot to apply and named
      // the affected wiki; main delivers the alert into that wiki's live island (the
      // handler skips unmounted ones). Fire-and-forget — no result back to the worker.
      const msg = raw as DaemonMsg_WikiAlert;
      _wikiAlertHandler?.(msg.wikiSlug, msg.message, msg.cause, msg.kind);
      return;
    }

    if (raw.type === "daemon:delegate-verb") {
      const msg = raw as DaemonMsg_DelegateVerb;
      if (!_registry) {
        worker.post(mkDaemonVerbResult({
          requestId: msg.requestId,
          error: `[openDaemonVm] delegate-verb received before mountMainVerbs — verb="${msg.verb}" dropped`,
        }));
        return;
      }
      const invocationLike = {
        title:       `${DAEMON_BAG_ID}/delegate/${msg.requestId}`,
        requestId:   msg.requestId,
        action:      msg.verb,
        args:        msg.args,
        requestedBy: msg.requestedBy,
        requestedAt: new Date().toISOString(),
        targets:     msg.targets ?? [],
        batchMode:   (msg.batchMode ?? "best-effort") as BatchMode,
        status:      "pending" as const,
      };
      runLocalVerb(invocationLike, {
        daemon:   composite,
        registry: _registry,
      }).then((result) => {
        worker.post(mkDaemonVerbResult({ requestId: msg.requestId, result }));
      }).catch((err: unknown) => {
        worker.post(mkDaemonVerbResult({
          requestId: msg.requestId,
          error: err instanceof Error ? err.message : String(err),
        }));
      });
      return;
    }
  });

  // ── Deliver manifest, AFTER the worker's ready IoC ──────────────────────────────
  // The browser kernel posts mkReady only AFTER its message listener registers (late —
  // after the worker shim's keyhive base64-WASM init + chain import). Posting the manifest
  // before that delivers it to the worker's event loop while no listener exists → it's
  // DROPPED, and the kernel then waits forever (no breath, no fault). So wait for ready,
  // then post; node omits ready → a short timeout proceeds. Deferred (not awaited) so the
  // synchronous return holds — workerEa resolves once the worker boots off this manifest.
  const manifestMsg = mkManifest(DAEMON_BAG_ID, syncPort, recipe, grants, coreHash, {
    ...(storage   ? { storage }   : {}),
    ...(daemonAuth ? { daemonAuth } : {}),
    ...(pluginCids?.length ? { pluginCids } : {}),
  });
  void new Promise<void>((resolve) => {
    let settled = false;
    const finish = (): void => { if (!settled) { settled = true; resolve(); } };
    worker.listen((raw: unknown) => { if (isIslandToVesselMsg(raw) && raw.type === "ready") finish(); });
    setTimeout(finish, 1500);
  }).then(() => { worker.post(manifestMsg, [syncPort]); });

  return {
    daemonHandle,
    composite,
    workerEa,
    worker,
    mountMainVerbs: (registry: VerbTable) => {
      _registry = registry;
    },
    authSeam: {
      verify: (cardBytes, bagUrl, access, proof, edge) =>
        askIsland("verify", (requestId) => mkDaemonVerifyRequest({
          requestId, cardBytes, bagUrl, access,
          ...(proof ? { proof } : {}),
          ...(edge ? { edge } : {}),
        })),
    },
    resolveBinding: (fingerprint, recipeTrace) =>
      askIsland("binding", (requestId) => mkDaemonResolveBindingRequest({ requestId, fingerprint, recipeTrace })),
    placeVerb: (o: VesselPlaceVerbRequest) => {
      worker.post(mkDaemonPlaceVerb({
        verb:        o.verb,
        args:        o.args,
        requestedBy: o.requestedBy ?? "vessel",
        ...(o.targets?.length ? { targets: [...o.targets] } : {}),
        ...(o.batchMode       ? { batchMode: String(o.batchMode) } : {}),
        ...(o.requestId       ? { requestId: o.requestId } : {}),
        ...(o.fromUri         ? { fromUri: o.fromUri } : {}),
        ...(o.listenable      ? { listenable: o.listenable } : {}),
      }));
    },
    placeTelemetry: (turnText: string, sourceFile: string, frontier?: readonly string[], turnKey?: string, chunkIndex?: number) => {
      worker.post(mkTelemetryPlaceVerb({ turnText, sourceFile, ...(frontier && frontier.length ? { frontier } : {}), ...(turnKey ? { turnKey } : {}), ...(chunkIndex !== undefined ? { chunkIndex } : {}) }));
    },
    placeStructurepalaceKapae: (turnKey: string, ended?: string) => {
      worker.post(mkStructurepalaceKapae({ turnKey, ...(ended ? { ended } : {}) }));
    },
    deriveSkeleton: (query: string) =>
      askIsland<DaemonDeriveSkeletonResult | null>("derive", (requestId) => mkDaemonDeriveSkeletonRequest({ requestId, query })),
    worldlineCompare: (input: DaemonWorldlineCompareInput) =>
      askIsland<{ order: string }>("wl-cmp", (requestId) => mkDaemonWorldlineCompareRequest({
        requestId, a: input.a, b: input.b, opens: input.opens,
        ...(input.closes !== undefined ? { closes: input.closes } : {}),
        ...(input.root   !== undefined ? { root: input.root }     : {}),
      })),
    worldlineTrajectory: (input: DaemonWorldlineTrajectoryInput) =>
      askIsland<DaemonWorldlineTrajectoryResult>("wl-traj", (requestId) => mkDaemonWorldlineTrajectoryRequest({
        requestId, handle: input.handle, stubs: input.stubs,
        ...(input.joinForm    !== undefined ? { joinForm: input.joinForm }       : {}),
        ...(input.includeNull !== undefined ? { includeNull: input.includeNull } : {}),
        ...(input.seed        !== undefined ? { seed: input.seed }               : {}),
        ...(input.window      !== undefined ? { window: input.window }           : {}),
      })),
    onEvictRequest: (fn: (bagId: string) => Promise<void>) => {
      _evictHandler = fn;
    },
    onResidencyOp: (fn: (op: "pin" | "unpin" | "register-cold", bagId: string, reason?: string) => Promise<void>) => {
      _residencyHandler = fn;
    },
    onWikiAlert: (fn: (wikiSlug: string, message: string, cause?: string) => void) => {
      _wikiAlertHandler = fn;
    },
    shutdown: async (budgetMs = 10_000): Promise<void> => {
      // Post teardown, await the island's teardown:ack (it flushes its docs +
      // capture state before acking). On timeout (jammed worker) terminate anyway.
      try {
        await awaitIslandMsg<IslandMsg_TeardownAck>({
          expectedType:   "teardown:ack",
          timeoutMs:      budgetMs,
          subscribe:      (h) => worker.listen(h),
          subscribeError: (h) => worker.onError(h),
          send:           () => worker.post(mkTeardown()),
        });
      } catch (err) {
        console.warn(`[daemon-vm] graceful shutdown ack failed — ${String(err)}; terminating anyway`);
      }
      worker.terminate();
    },
    dispose: () => {
      worker.terminate();
    },
  };
}
