/**
 * verb-caps — the node main-verb plane as a NESTED #has-cap-stack (composable-keel idiom).
 *
 * The four provider-heavy daemon verbs (recall · lar-telemetry · capture · worldline-compare/-trajectory)
 * decompose here into TWO cap families a verb plane HAS:
 *
 *   - PROVIDER caps — one per injected platform impl (mempalace read-client, the form-vector store, the
 *     daemon-VM worker reads, the telemetry writeback). Each cap's `build` simply returns the impl the
 *     platform constructed and passed in; the cap makes the dependency STRUCTURAL. The provider
 *     INTERFACES name EXACTLY the methods the verb bodies call (descriptive of node's real call-set) —
 *     no method exists for a hypothetical future platform.
 *   - VERB-GROUP caps — one per verb family. Each declares `requires`/`optional` over the provider
 *     cap-ids it needs, and `build(resolve)` returns a {@link VerbContribution} that registers its
 *     verb(s) against the resolved providers. Capability-degradation falls out of composition: a
 *     platform that never supplies a provider cap simply never composes the verb that needs it
 *     (`composeVessel` REFUSES a verb cap whose mandatory provider is absent — blind by structure).
 *
 * `composeVerbPlane(stack)` `composeVessel`s the given caps (the NESTED compose), collects each
 * verb-group cap's contribution, and returns ONE merged contribution the host applies to its
 * VerbTable. Platform-blind: this file imports NO node-only module — the node helpers reach these caps
 * ONLY through the injected provider impls.
 *
 * Canon: lar:///ha.ka.ba/lararium/api/composable-keel
 */

import { composeVessel, readStampFilters, hitPassesStampFilters, drawerPassesStampFilters, type CapModule, type StampFilters } from "@lararium/mesh";
import type {
  SparseFormVector,
  WorldlineStubWire,
  WorldlineEdgeTriple,
  WorldlineEdgeClose,
} from "@lararium/mesh";
import { VerbTable } from "./verb-dispatcher.js";
import type {
  DaemonWorldlineCompareInput,
  DaemonWorldlineTrajectoryInput,
  DaemonWorldlineTrajectoryResult,
} from "./daemon-vm-core.js";

// ── the merged registration the host applies to its registry ─────────────────────────────────────

/** A verb-group cap's product: register its verb(s) into the host's VerbTable. The composed plane
 *  merges every group's contribution into one, applied once (synchronously) by the host. */
export type VerbContribution = (registry: VerbTable) => void;

// ── cap-ids — the names the nested #has-cap-stack routes over ─────────────────────────────────────

/** Provider cap-ids — one per injected platform impl. */
export const VERB_PROVIDER = {
  mempalace:  "provider/mempalace",
  formPalace: "provider/formpalace",
  daemonVm:   "provider/daemon-vm",
  telemetry:  "provider/telemetry",
} as const;

/** Verb-group caps share this id prefix so `composeVerbPlane` collects exactly their contributions. */
export const VERB_GROUP_PREFIX = "verb/";

export const VERB_GROUP = {
  recall:    "verb/recall",
  telemetry: "verb/lar-telemetry",
  capture:   "verb/capture",
  worldline: "verb/worldline",
} as const;

// ── PROVIDER interfaces — EXACTLY the node call-set each verb body reaches ─────────────────────────

/** The pooled mempalace READ client face the recall verb drives inside a `withClient` scope (the
 *  three read ops; the verbatim PLACE-memory membrane). */
export interface RecallClient {
  getDrawer(drawerId: string): Promise<Record<string, unknown>>;
  search(args: Record<string, unknown>): Promise<Record<string, unknown>>;
  listDrawers(args: Record<string, unknown>): Promise<Record<string, unknown>>;
}

/** A worldline trajectory stub sourced from the content graph (verbatim_sha + within-handle tick) —
 *  the clean substrate the worldline-trajectory verb ships to the worker. */
export interface RecalledTrajectoryStub {
  readonly verbatimSha: string;
  readonly tickCounter: number;
}

/** mempalace provider — the verbatim PLACE-memory reach (read-client scope + the trajectory-stub
 *  source). The impl owns the pooled sidecar + the `orderHandleTurnsToStubs` ordering, node-side. */
export interface MempalaceProvider {
  /** Run `fn` against a warm pooled read-client (the `withMempalace` scope). */
  withClient<T>(fn: (client: RecallClient) => Promise<T>): Promise<T>;
  /** A handle's content-graph turns, ordered into worldline stubs (the live worldline-trajectory
   *  source path). The impl wraps `withMempalace(client.turnsForHandle) → orderHandleTurnsToStubs`. */
  turnsForHandleStubs(handle: string, opts: { wing?: string }): Promise<readonly RecalledTrajectoryStub[]>;
}

/** form-palace provider — the living-grammar FORM-vector store. The impl OWNS the lazy singleton
 *  form holder (ref-counted per canonical dir), so BOTH the dual recall fuse and the worldline form
 *  pre-fetch share ONE process, never a second. */
export interface FormPalaceProvider {
  /** Read one turn's move-space position by its verbatim_sha (the worldline-trajectory pre-fetch). A
   *  miss/fault resolves null (the worker keeps the turn's TIME slot, form null). Lazily opens + shares
   *  the singleton holder with {@link multiRecall}. */
  getForm(sha: string): Promise<SparseFormVector | null>;
  /** The dual/multi recall fuse: the injected CONTENT leg (the recall verb's read-client search) +
   *  the FORM leg (the singleton holder + the in-VM markers-derive, degrading to [] on fault) fused by
   *  reciprocal rank on the verbatim_sha. The impl carries the makeFormSearch + multiGraphRecall body
   *  verbatim node-side; the verb body keeps its arg-coercion and passes the assembled args. */
  multiRecall(
    legs: { contentSearch: (a: Record<string, unknown>) => Promise<Record<string, unknown>> },
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
}

/** A spirit's worldline edges derived from a transcript (the worldline-compare edge-DAG source). */
export interface SubagentEdgePair {
  readonly spawn: WorldlineEdgeTriple;
  readonly handback: WorldlineEdgeClose;
}

/** daemon-VM provider — the sovereign-worker reads + the capture FEED. The host supplies only the
 *  EXTERNAL data the worker can't reach (transcript edges, form-vector bytes); all COMPUTE is the
 *  worker's. The impl proxies to the live `DaemonVmCore`. */
export interface DaemonVerbProvider {
  /** Send one source-stream pointer to the serialized Python capture holder. `sensoriumRoot` addresses a
   *  specific sensorium's holder (absent → the memory default). */
  captureSource(input: { surface: "claude" | "codex" | "copilot" | "copilot-vscode"; pointer: string; wing: string; room?: string; sessionId?: string; sensoriumRoot?: string }): Promise<Record<string, unknown>>;
  /** Re-pave the in-tree mempalace projection over the content plane, THROUGH the same serialized Python
   *  capture holder — so a refresh queues between capture passes and never races the live writer.
   *  `sensoriumRoot` addresses a specific sensorium (absent → the memory default). */
  refreshMempalace(input: { query?: string; k?: number; allStrata?: boolean; sensoriumRoot?: string }): Promise<Record<string, unknown>>;
  /** REWIND (kapae) one turn's .structurepalace tally + salience down-weight, IN the @daemon (warm holder).
   *  Fire-and-forget — the convergence twin of the CLI-side worldline KG valid-close. */
  placeStructurepalaceKapae(turnKey: string, ended?: string): void;
  /** Derive a session transcript's spawn/handback edges (worldline-compare's edge-DAG source). */
  subagentEdges(transcript: string): readonly SubagentEdgePair[];
  /** Well 1 — the concurrent-capable causal verdict between two handles, IN the daemon VM. */
  worldlineCompare(input: DaemonWorldlineCompareInput): Promise<{ order: string }>;
  /** Well 3 + Well 4 — a handle's worldline-ordered form-vector path (+ optional null baseline). */
  worldlineTrajectory(input: DaemonWorldlineTrajectoryInput): Promise<DaemonWorldlineTrajectoryResult>;
}

/** telemetry provider — the lar_* writeback membrane. The impl owns the whole writeback +
 *  TelemetryUnavailable→Error translation node-side (the class is node-only), returning the verb's
 *  exact `{ wing, ...result }` shape. */
export interface TelemetryProvider {
  /** Project lar_* readings back onto a wing's drawers. Throws the verb's "lar-telemetry unavailable:"
   *  Error when the writeback path is down; returns `{ wing, drawers, framed, applied, bands }`. */
  writeback(wing: string, opts: { limit?: number }): Record<string, unknown>;
}

// ── PROVIDER caps — each `build` returns the injected impl (the dependency made structural) ────────

export function mempalaceProviderCap(impl: MempalaceProvider): CapModule {
  return { id: VERB_PROVIDER.mempalace, build: () => impl };
}
export function formPalaceProviderCap(impl: FormPalaceProvider): CapModule {
  return { id: VERB_PROVIDER.formPalace, build: () => impl };
}
export function daemonVerbProviderCap(impl: DaemonVerbProvider): CapModule {
  return { id: VERB_PROVIDER.daemonVm, build: () => impl };
}
export function telemetryProviderCap(impl: TelemetryProvider): CapModule {
  return { id: VERB_PROVIDER.telemetry, build: () => impl };
}

// ── VERB-GROUP caps — declare the providers they route, register their verb(s) over the resolved impls ─

/** Search-path stamp filtering: OVERFETCH the semantic search (×5, floor 25, cap 100 — the
 *  sidecar's own limit ceiling), post-filter each hit ({@link hitPassesStampFilters}: exact
 *  source-derived surface/agent + the sovereign gradient re-read for voice/band/drift — the
 *  search wire carries no drawer metadata and no turn key to join on), then cut to the caller's
 *  limit. Honest counts ride out: `scanned` (pre-filter) + `matched` (post-filter, pre-cut). */
async function filteredSearch(
  client: RecallClient,
  filters: StampFilters,
  a: { query: string; wing?: string | undefined; limit?: number | undefined },
): Promise<Record<string, unknown>> {
  const limit = a.limit !== undefined && Number.isFinite(a.limit) ? Math.max(1, a.limit) : 5;
  const fetchLimit = Math.min(100, Math.max(25, limit * 5));
  const res = await client.search({ query: a.query, ...(a.wing !== undefined ? { wing: a.wing } : {}), limit: fetchLimit });
  const all = Array.isArray(res["results"]) ? (res["results"] as Array<Record<string, unknown>>) : [];
  const matched = all.filter((h) => hitPassesStampFilters(filters, h));
  return {
    mode: "search",
    ...res,
    results: matched.slice(0, limit),
    filters: filters as unknown as Record<string, unknown>,
    scanned: all.length,
    matched: matched.length,
  };
}

/** List-path stamp filtering: page the drawer list (wing-scoped when given) and keep the drawers
 *  whose stamped `lar_*` metadata passes ({@link drawerPassesStampFilters} — exact, per-drawer).
 *  Pages the whole scope, so a caller SHOULD pass the narrowest wing it knows (the drawersWhere
 *  discipline). Honest counts: `scanned` + `matched` ride out beside the cut list. */
async function filteredList(
  client: RecallClient,
  filters: StampFilters,
  a: { wing?: string | undefined; limit?: number | undefined },
): Promise<Record<string, unknown>> {
  const limit = a.limit !== undefined && Number.isFinite(a.limit) ? Math.max(1, a.limit) : 20;
  const pageSize = 200;
  const kept: Array<Record<string, unknown>> = [];
  let scanned = 0;
  let matched = 0;
  for (let offset = 0; ; offset += pageSize) {
    const page = await client.listDrawers({ ...(a.wing !== undefined ? { wing: a.wing } : {}), limit: pageSize, offset });
    const drawers = Array.isArray(page["drawers"]) ? (page["drawers"] as Array<Record<string, unknown>>) : [];
    scanned += drawers.length;
    for (const d of drawers) {
      const meta = (d["metadata"] as Record<string, unknown> | undefined) ?? {};
      if (!drawerPassesStampFilters(filters, meta)) continue;
      matched += 1;
      if (kept.length < limit) kept.push(d);
    }
    const count = typeof page["count"] === "number" ? (page["count"] as number) : drawers.length;
    const total = typeof page["total"] === "number" ? (page["total"] as number) : scanned;
    if (count < pageSize || offset + count >= total) break;
  }
  return {
    mode: "list",
    drawers: kept,
    total: matched,
    filters: filters as unknown as Record<string, unknown>,
    scanned,
    matched,
  };
}

/** recall — the mempalace READ membrane (semantic-search | list | get | multi-graph fuse). Requires
 *  the mempalace read-client + the form store (the dual fuse). */
export function recallVerbCap(): CapModule {
  return {
    id: VERB_GROUP.recall,
    requires: [VERB_PROVIDER.mempalace, VERB_PROVIDER.formPalace],
    build: (resolve) => {
      const mp   = resolve<MempalaceProvider>(VERB_PROVIDER.mempalace);
      const form = resolve<FormPalaceProvider>(VERB_PROVIDER.formPalace);
      return (registry: VerbTable) => {
        registry.register("recall", async (args) => {
          const drawerId = typeof args["drawer"] === "string" ? (args["drawer"] as string) : "";
          const query    = typeof args["query"]  === "string" ? (args["query"]  as string) : "";
          const wing     = typeof args["wing"]   === "string" ? (args["wing"]   as string) : undefined;
          const limitRaw = args["limit"];
          const limit    = typeof limitRaw === "number" ? limitRaw : typeof limitRaw === "string" ? Number(limitRaw) : undefined;
          // Multi-graph recall (P4): N-ary fuse the CONTENT (verbatim mempalace) + FORM (.formpalace) +
          // later graphs by reciprocal rank fusion on the verbatim_sha. Opt-in (`dual`/`multi`) — the FORM
          // leg routes by query shape (bearing → structured where-filter · markers → vector · keywords →
          // where-or-defer). The `dual` arg name stays accepted for callers; `multi` reads the same.
          const dual         = args["dual"] === true || args["dual"] === "true"
                            || args["multi"] === true || args["multi"] === "true";
          const register     = typeof args["register"]     === "string" ? (args["register"]     as string) : undefined;
          const grammarLayer = typeof args["grammarLayer"] === "string" ? (args["grammarLayer"] as string)
                             : typeof args["grammar_layer"] === "string" ? (args["grammar_layer"] as string) : undefined;
          const fwRaw        = args["formWeight"];
          const formWeight   = typeof fwRaw === "number" ? fwRaw : typeof fwRaw === "string" ? Number(fwRaw) : undefined;
          // P6 — the paragraph-scale aperture: a 0..20 grain or a band name ("paragraph"). Off when absent.
          const agRaw        = args["apertureGrain"] ?? args["aperture_grain"] ?? args["aperture"];
          const apertureGrain = typeof agRaw === "number" || typeof agRaw === "string" ? agRaw : undefined;
          const awRaw        = args["apertureWidth"] ?? args["aperture_width"];
          const apertureWidth = typeof awRaw === "number" ? awRaw : typeof awRaw === "string" && awRaw !== "" ? Number(awRaw) : undefined;
          // STAMP FILTERS (voice · band · agent · surface · drift) — compose with the semantic
          // query (post-filter, honest counts) or the list (exact lar_* metadata). Throws on an
          // invalid band; the multi fuse re-shapes hits, so filters + dual refuse loud (never a
          // silent drop) until the fuse learns them.
          const filters = readStampFilters(args);
          if (filters && dual) throw new Error("recall: stamp filters (--voice/--band/--agent/--surface/--drift) do not yet compose with --multi");
          // The addressed sensorium (from `lares sense <sensorium> recall`) — picks that sensorium's recall
          // holder up the cap ladder (absent → the memory default).
          const sensoriumRoot = typeof args["sensoriumRoot"] === "string" ? (args["sensoriumRoot"] as string) : undefined;
          // Warm pooled sidecar (started once, reused, self-healing) — recall stays sub-second after the
          // first cold start; this makes recall-into-wake fast.
          return mp.withClient(async (client) => {
            if (drawerId) return { mode: "drawer", drawer: await client.getDrawer(drawerId) };
            if (filters && query) return filteredSearch(client, filters, { query, wing, limit });
            if (filters) return filteredList(client, filters, { wing, limit });
            if (dual && query) {
              // The form-leg construction (markers→vector derive IN the @daemon VM, content-only
              // degradation on fault) + the RRF fuse ride the form provider's multiRecall impl, verbatim;
              // the body keeps the arg-coercion and hands the content leg + the assembled args across.
              const res = await form.multiRecall(
                { contentSearch: (a) => client.search({ ...a, ...(sensoriumRoot ? { sensoriumRoot } : {}) }) },
                {
                  query,
                  ...(wing          !== undefined ? { wing } : {}),
                  ...(limit         !== undefined ? { limit } : {}),
                  ...(register      !== undefined ? { register } : {}),
                  ...(grammarLayer  !== undefined ? { grammarLayer } : {}),
                  ...(formWeight    !== undefined ? { formWeight } : {}),
                  ...(apertureGrain !== undefined ? { apertureGrain } : {}),
                  ...(apertureWidth !== undefined ? { apertureWidth } : {}),
                },
              );
              return { mode: "multi", ...res };
            }
            if (query)    return { mode: "search", ...(await client.search({ query, ...(wing !== undefined ? { wing } : {}), ...(limit !== undefined ? { limit } : {}), ...(sensoriumRoot ? { sensoriumRoot } : {}) })) };
            return { mode: "list", ...(await client.listDrawers({ ...(wing !== undefined ? { wing } : {}), ...(limit !== undefined ? { limit } : {}) })) };
          });
        });
      };
    },
  };
}

/** lar-telemetry — the mempalace WRITE membrane (the lar_* gradient writeback). Requires the
 *  telemetry writeback provider. */
export function telemetryVerbCap(): CapModule {
  return {
    id: VERB_GROUP.telemetry,
    requires: [VERB_PROVIDER.telemetry],
    build: (resolve) => {
      const telemetry = resolve<TelemetryProvider>(VERB_PROVIDER.telemetry);
      return (registry: VerbTable) => {
        registry.register("lar-telemetry", async (args) => {
          const wing = typeof args["wing"] === "string" ? (args["wing"] as string) : "";
          if (!wing) throw new Error("args.wing is required");
          const limitRaw = args["limit"];
          const limit    = typeof limitRaw === "number" ? limitRaw : typeof limitRaw === "string" ? Number(limitRaw) : undefined;
          // The writeback + TelemetryUnavailable→Error translation + the `{ wing, ...r }` shape ride the
          // provider impl node-side (TelemetryUnavailable is a node class); the error string is preserved.
          return telemetry.writeback(wing, limit !== undefined ? { limit } : {});
        });
      };
    },
  };
}

/** capture — submit ONE transcript source stream to the Python-owned capture holder. */
export function captureVerbCap(): CapModule {
  return {
    id: VERB_GROUP.capture,
    requires: [VERB_PROVIDER.daemonVm],
    build: (resolve) => {
      const daemon = resolve<DaemonVerbProvider>(VERB_PROVIDER.daemonVm);
      return (registry: VerbTable) => {
        registry.register("capture", async (args) => {
          const surface = typeof args["surface"] === "string" ? args["surface"] : "";
          const pointer = typeof args["pointer"] === "string" ? args["pointer"] : "";
          const wing = typeof args["wing"] === "string" ? args["wing"] : "";
          const room = typeof args["room"] === "string" ? args["room"] : undefined;
          const sessionId = typeof args["sessionId"] === "string" && args["sessionId"] ? args["sessionId"] : undefined;
          if (surface !== "claude" && surface !== "codex" && surface !== "copilot" && surface !== "copilot-vscode") {
            throw new Error("capture: args.surface must be claude|codex|copilot|copilot-vscode");
          }
          if (!pointer || !wing) throw new Error("capture: args.pointer + args.wing (non-empty strings) required");
          const sensoriumRoot = typeof args["sensoriumRoot"] === "string" ? (args["sensoriumRoot"] as string) : undefined;
          return await daemon.captureSource({ surface, pointer, wing, ...(room ? { room } : {}), ...(sessionId ? { sessionId } : {}), ...(sensoriumRoot ? { sensoriumRoot } : {}) });
        });
        registry.register("refresh", async (args) => {
          // Re-pave the mempalace projection over the content plane, serialized on the capture holder's
          // pipe (rides between capture passes — no race with the live writer).
          const query = typeof args["query"] === "string" ? (args["query"] as string) : undefined;
          const k = typeof args["k"] === "number" ? (args["k"] as number) : undefined;
          const allStrata = args["allStrata"] === true;
          const sensoriumRoot = typeof args["sensoriumRoot"] === "string" ? (args["sensoriumRoot"] as string) : undefined;
          return await daemon.refreshMempalace({
            ...(query ? { query } : {}),
            ...(k !== undefined ? { k } : {}),
            ...(allStrata ? { allStrata } : {}),
            ...(sensoriumRoot ? { sensoriumRoot } : {}),
          });
        });
        registry.register("structurepalace-kapae", async (args) => {
          // REWIND one turn's .structurepalace tally (+ salience down-weight) — the convergence twin of the
          // CLI-side worldline KG valid-close. Fire-and-forget through the @daemon's warm holder.
          const turnKey = typeof args["turnKey"] === "string" ? (args["turnKey"] as string) : "";
          if (!turnKey) throw new Error("structurepalace-kapae: args.turnKey (non-empty string) required");
          const ended = typeof args["ended"] === "string" && args["ended"] ? (args["ended"] as string) : undefined;
          daemon.placeStructurepalaceKapae(turnKey, ended);
          return { ok: true, kapae: true, turnKey };
        });
      };
    },
  };
}

/** worldline — the PERMAINAN SUBSTRATE reads (worldline-compare + worldline-trajectory). Requires the
 *  daemon-VM provider (all compute is the worker's) + the mempalace source + the form store (the
 *  trajectory's live turn source + the form pre-fetch). */
export function worldlineVerbCap(): CapModule {
  return {
    id: VERB_GROUP.worldline,
    requires: [VERB_PROVIDER.daemonVm, VERB_PROVIDER.mempalace, VERB_PROVIDER.formPalace],
    build: (resolve) => {
      const daemon = resolve<DaemonVerbProvider>(VERB_PROVIDER.daemonVm);
      const mp     = resolve<MempalaceProvider>(VERB_PROVIDER.mempalace);
      const form   = resolve<FormPalaceProvider>(VERB_PROVIDER.formPalace);
      return (registry: VerbTable) => {
        // worldline-compare (Well 1, ITC LIVE-READ): two handles → the concurrent-capable causal verdict.
        // The host derives the edge-DAG from a session `transcript` (deriveSubagentEdges, via the provider)
        // and ships it; the WORKER projects the registry + runs the ITC tree-leq.
        registry.register("worldline-compare", async (args) => {
          const a = typeof args["a"] === "string" ? (args["a"] as string) : "";
          const b = typeof args["b"] === "string" ? (args["b"] as string) : "";
          if (!a || !b) throw new Error("worldline-compare: args.a + args.b (handles) required");
          const transcript = typeof args["transcript"] === "string" ? (args["transcript"] as string) : "";
          const spirits = transcript ? daemon.subagentEdges(transcript) : [];
          const opens = spirits.map((s) => s.spawn);
          const closes = spirits.map((s) => s.handback);
          try {
            return await daemon.worldlineCompare({ a, b, opens, closes });
          } catch (err) {
            throw new Error(`worldline-compare: ${err instanceof Error ? err.message : String(err)} (supply a transcript that names both handles)`);
          }
        });

        // worldline-trajectory (Well 3 + Well 4, THE CORE): a handle → its worldline-ordered form-vector
        // path through move-space, and optionally a null baseline (shuffled order). When the caller passes
        // no `stubs`, this sources them live from the content mempalace (turnsForHandleStubs) and feeds the
        // worker those; an explicit `stubs` arg still overrides (tests / a transcript-driven probe).
        registry.register("worldline-trajectory", async (args) => {
          const handle = typeof args["handle"] === "string" ? (args["handle"] as string) : "";
          if (!handle) throw new Error("worldline-trajectory: args.handle required");
          const wing = typeof args["wing"] === "string" ? (args["wing"] as string) : undefined;
          const rawStubs = Array.isArray(args["stubs"]) ? (args["stubs"] as unknown[]) : null;
          // No explicit stubs → SOURCE FROM THE LIVE CONTENT GRAPH (the production path). A handle with no
          // drawers yields [] → an empty trajectory (graceful). The pooled read-client stays warm.
          const baseStubs: readonly RecalledTrajectoryStub[] = rawStubs === null
            ? await mp.turnsForHandleStubs(handle, wing !== undefined ? { wing } : {})
            : rawStubs
                .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
                .map((s, i) => ({
                  verbatimSha: typeof s["verbatimSha"] === "string" ? (s["verbatimSha"] as string) : String(s["verbatimSha"] ?? ""),
                  tickCounter: typeof s["tickCounter"] === "number" ? (s["tickCounter"] as number) : i,
                }))
                .filter((s) => s.verbatimSha);
          const joinForm = args["joinForm"] !== false && args["joinForm"] !== "false";
          // Pre-fetch each unique turn's move-space position from the form store (a miss/fault → null);
          // the form provider owns the holder (REUSED with the recall form leg — one process).
          const formByKey = new Map<string, SparseFormVector | null>();
          if (joinForm && baseStubs.length) {
            await Promise.all(
              [...new Set(baseStubs.map((s) => s.verbatimSha))].map(async (sha) => {
                formByKey.set(sha, await form.getForm(sha));
              }),
            );
          }
          const stubs: WorldlineStubWire[] = baseStubs.map((s) => ({
            verbatimSha: s.verbatimSha,
            tickCounter: s.tickCounter,
            ...(joinForm ? { formVector: formByKey.get(s.verbatimSha) ?? null } : {}),
          }));
          const includeNull = args["null"] === true || args["null"] === "true";
          const seed = typeof args["seed"] === "number" ? (args["seed"] as number) : undefined;
          const windowRaw = args["window"];
          const window = typeof windowRaw === "number" ? windowRaw : typeof windowRaw === "string" && windowRaw !== "" ? Number(windowRaw) : undefined;
          const result = await daemon.worldlineTrajectory({
            handle, stubs, joinForm, includeNull,
            ...(seed   !== undefined ? { seed }   : {}),
            ...(window !== undefined ? { window } : {}),
          });
          if (!includeNull) return { trajectory: result.trajectory };
          return { trajectory: result.trajectory, nullBaseline: result.nullBaseline };
        });
      };
    },
  };
}

// ── the nested compose — wire the stack, merge every verb-group contribution into one ─────────────

/**
 * Compose the verb plane from its #has-cap-stack (provider caps + verb-group caps). `composeVessel`
 * topologically wires the caps — building each provider, then each verb-group cap with a POLA resolver
 * reaching only its declared providers, REFUSING the boot if a verb's mandatory provider is absent.
 * Collects every verb-group cap's {@link VerbContribution} (by the `verb/` id prefix) and returns ONE
 * merged contribution the host applies synchronously to its VerbTable.
 */
export async function composeVerbPlane(stack: readonly CapModule[]): Promise<VerbContribution> {
  const vessel = await composeVessel(stack);
  const contributions = vessel.order
    .filter((id) => id.startsWith(VERB_GROUP_PREFIX))
    .map((id) => vessel.get<VerbContribution>(id))
    .filter((c): c is VerbContribution => typeof c === "function");
  return (registry) => {
    for (const c of contributions) c(registry);
  };
}
