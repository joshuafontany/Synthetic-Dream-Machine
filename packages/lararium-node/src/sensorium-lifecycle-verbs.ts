/**
 * sensorium-lifecycle-verbs — the DURABLE sensorium lifecycle CAPS, run direct over the `manifest.json`
 * declaration (no store holder, no daemon — plain manifest-file I/O + the mesh reducer). The verbs the
 * `lares sense` door and the daemon roster UX both call:
 *
 *   roster · inspect          — READ (out-of-loop; agents free)               HOTL
 *   reconcile · reconcileAll  — re-settle a sensorium against its evidence     HOTL  (+ the gated cadence)
 *   build --ephemeral         — mint a fresh pioneer (agent self-service)      HOTL
 *   promote                   — climb a rung (in-place FIELD-FLIP, active)     HITL  (+ the gated store-swap)
 *   retire --grounds <MUSTIE> — judged tombstone + recorded grounds, NO delete HITL
 *   un-retire                 — move-not-delete restore of the prior state     HOTL
 *   purge                     — the irreversible byte GC (explicit-only)       HITL
 *
 * The graduated state rides the DURABLE manifest here (the reducer + field); the binary `ephemeral`
 * leak-record of the SCRATCH `docker run --rm` tree (sense-sensorium.ts `sensorium.json`) stays its own
 * concern. Identity-preservation: promote/reconcile FLIP the manifest field in place — the dir/cid never
 * move, so recall stays unbroken (F4 field-flip). The alias-indirection store-swap (Sanity hot-swap) and
 * the daemon-loop cadence and the hardening SIGNAL all ship as STABLE GROUND, feature-gated OFF.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/living-grammar-palace#sensorium-lifecycle
 */

import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  nextLifecycle, promoteState, guardHitl,
  isMustieGround, MUSTIE_GROUNDS, type MustieGround,
  LIFECYCLE_GATES_DEFAULT, type LifecycleGates, type LifecycleEvidence,
  type SensoriumLifecycleState, type RetirementRecord,
} from "@lararium/mesh";
import { sensoriumNames, sensoriumDir } from "./vessel-paths.js";
import { readManifest, writeManifest, buildSensoriumManifest, type SensoriumManifest } from "./sensorium.js";
import { atomicWriteFileSync } from "./fs-atomic.js";

/** The default hardening half-life a fresh `build --ephemeral` stamps — a finite value marks a MATURING
 *  pioneer (a later reconcile, once the signal wires, can tenure it). Arbitrary until F6 calibration. */
export const DEFAULT_HARDENING_HALFLIFE = 30 as const;

/** The sensoriums root — `<lararium>/sensoriums` — derived from {@link sensoriumDir} (no extra path import). */
function sensoriaRoot(): string {
  return dirname(sensoriumDir("_"));
}

// ── READ (out-of-loop) ───────────────────────────────────────────────────────────────────────────────

/** One roster row — the lifecycle-relevant facets of a sensorium, read from its manifest. */
export interface LifecycleRow {
  readonly name: string;
  readonly dir: string;
  readonly lifecycle: SensoriumLifecycleState;
  readonly ephemeral: boolean;
  readonly halfLife: number | null | undefined;
  readonly caps: readonly string[];
  readonly created: string;
  /** the MUSTIE grounds — present only on a tombstone row. */
  readonly retiredGrounds?: MustieGround;
}

/** LIST every sensorium standing under `<lararium>/sensoriums`, each with its declared/derived lifecycle. */
export function rosterSensoria(): LifecycleRow[] {
  const rows: LifecycleRow[] = [];
  for (const name of sensoriumNames()) {
    const dir = sensoriumDir(name);
    const m = readManifest(dir);
    if (!m) continue; // a dir without a manifest is not yet a sensorium
    rows.push({
      name, dir,
      lifecycle: m.lifecycle,
      ephemeral: m.ephemeral,
      halfLife: m.persistencePolicy?.halfLife,
      caps: Object.keys(m.has),
      created: m.created,
      ...(m.retirement ? { retiredGrounds: m.retirement.grounds } : {}),
    });
  }
  return rows;
}

/** INSPECT one sensorium — its row plus the full manifest facets (caps, coupling, apertures, retirement). */
export function inspectSensorium(name: string): (LifecycleRow & {
  readonly seat: string;
  readonly has: SensoriumManifest["has"];
  readonly coupling: SensoriumManifest["coupling"];
  readonly apertures?: SensoriumManifest["apertures"];
  readonly persistencePolicy?: SensoriumManifest["persistencePolicy"];
  readonly retirement?: RetirementRecord;
}) | null {
  const dir = sensoriumDir(name);
  const m = readManifest(dir);
  if (!m) return null;
  return {
    name, dir,
    lifecycle: m.lifecycle,
    ephemeral: m.ephemeral,
    halfLife: m.persistencePolicy?.halfLife,
    caps: Object.keys(m.has),
    created: m.created,
    ...(m.retirement ? { retiredGrounds: m.retirement.grounds } : {}),
    seat: "read", // inspect is a read (HOTL)
    has: m.has,
    coupling: m.coupling,
    ...(m.apertures ? { apertures: m.apertures } : {}),
    ...(m.persistencePolicy ? { persistencePolicy: m.persistencePolicy } : {}),
    ...(m.retirement ? { retirement: m.retirement } : {}),
  };
}

// ── RECONCILE (on-demand; + the gated daemon-loop cadence) ─────────────────────────────────────────────

/** The outcome of one reconcile — legible-intent: what the pass read and whether it moved the state. */
export interface ReconcileResult {
  readonly name: string;
  readonly from: SensoriumLifecycleState;
  readonly to: SensoriumLifecycleState;
  readonly changed: boolean;
}

/**
 * Re-settle ONE sensorium against its evidence: read the manifest, run the pure reducer, write ONLY on
 * change (atomic). Idempotent — a second reconcile over unchanged evidence writes nothing (converges).
 * The hardening SIGNAL gate: OFF (default) forces `survivorAge` to 0, so a reconcile never promotes (the
 * unwired-signal ground); ON lets the passed evidence tenure a stage. On-demand first (F5).
 */
export function reconcileSensorium(
  dir: string, evidence: LifecycleEvidence = {}, gates: LifecycleGates = LIFECYCLE_GATES_DEFAULT,
): ReconcileResult {
  const m = readManifest(dir);
  if (!m) throw new Error(`no sensorium manifest at ${dir}`);
  const ev: LifecycleEvidence = gates.hardeningSignalWired ? evidence : { ...evidence, survivorAge: 0 };
  const to = nextLifecycle(m.lifecycle, ev);
  const changed = to !== m.lifecycle;
  if (changed) writeManifest(dir, { ...m, lifecycle: to });
  return { name: m.sensorium, from: m.lifecycle, to, changed };
}

/** Reconcile EVERY sensorium once — the cadence BODY (the k8s-style sweep the loop would run). */
export function reconcileAllSensoria(
  evidence: LifecycleEvidence = {}, gates: LifecycleGates = LIFECYCLE_GATES_DEFAULT,
): ReconcileResult[] {
  return sensoriumNames()
    .map((n) => sensoriumDir(n))
    .filter((d) => readManifest(d) !== null)
    .map((d) => reconcileSensorium(d, evidence, gates));
}

/**
 * The daemon-loop CADENCE — the onHooAnu k8s-style continuous-reconcile path, FEATURE-GATED OFF (F5).
 * OFF (default) → a no-op ({ran:false}); reconcile stays on-demand only. ON → it reconciles every
 * sensorium (the loop body). There and unused: the plumbing stands now, the flip is one gate.
 */
export function runReconcileCadence(gates: LifecycleGates = LIFECYCLE_GATES_DEFAULT): { ran: boolean; results: ReconcileResult[] } {
  if (!gates.daemonLoopReconcile) return { ran: false, results: [] };
  return { ran: true, results: reconcileAllSensoria({}, gates) };
}

// ── BUILD (on-loop, agent self-service) ────────────────────────────────────────────────────────────────

/** The outcome of a build — a fresh pioneer, or a LOUD refusal on name-collision. */
export interface BuildResult {
  readonly name: string;
  readonly dir: string;
  readonly lifecycle: SensoriumLifecycleState;
  readonly created: string;
}

/**
 * MINT a fresh EPHEMERAL sensorium (a pioneer): make the dir, write a `lifecycle:"pioneer"` manifest with
 * a finite hardening half-life (a maturing pioneer). REFUSES LOUD on a name-collision — a build never
 * clobbers an existing sensorium (cattle-not-pets, but never silently over another's bytes). The planes
 * fill on a later pour; this mints the declaration.
 */
export function buildEphemeralSensorium(name: string, opts: { halfLife?: number } = {}): BuildResult {
  if (sensoriumNames().includes(name)) {
    throw new Error(`build refuses: a sensorium named '${name}' already stands (name-collision) — pick a fresh name or retire the existing one.`);
  }
  const dir = sensoriumDir(name);
  mkdirSync(dir, { recursive: true });
  const lar = `lar:///ha.ka.ba/lararium/sensorium/${name}`;
  const m = buildSensoriumManifest(dir, {
    sensorium: name,
    lar,
    caps: {},
    ephemeral: true,
    lifecycle: "pioneer",
    persistencePolicy: { halfLife: opts.halfLife ?? DEFAULT_HARDENING_HALFLIFE },
  });
  writeManifest(dir, m);
  return { name, dir, lifecycle: m.lifecycle, created: m.created };
}

// ── the alias-indirection store (Sanity hot-swap) — the gated store-swap promote's plumbing ────────────

/** `<lararium>/sensoriums/.aliases.json` — a name → underlying-dir map. Empty/absent until a store-swap runs. */
function aliasStorePath(): string {
  return join(sensoriaRoot(), ".aliases.json");
}

/** Read the alias map (name → dir). Absent/garbled reads {} — a name with no alias resolves to its own dir. */
export function readSensoriumAliases(): Record<string, string> {
  try {
    const raw = JSON.parse(readFileSync(aliasStorePath(), "utf8"));
    return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Resolve a sensorium NAME to the dir it currently points at — the alias if one is set, else its own dir
 *  (Sanity hot-swap: the codebase references the stable NAME; the underlying store swaps behind it). */
export function resolveSensoriumTarget(name: string): string {
  return readSensoriumAliases()[name] ?? sensoriumDir(name);
}

function writeSensoriumAlias(name: string, targetDir: string): void {
  const aliases = readSensoriumAliases();
  aliases[name] = targetDir;
  atomicWriteFileSync(aliasStorePath(), JSON.stringify(aliases, null, 2) + "\n");
}

// ── PROMOTE (in-loop, human) — the active FIELD-FLIP + the gated store-swap ────────────────────────────

/** The outcome of a promote — the rung climbed (or the alias re-pointed), the mode names which path ran. */
export interface PromoteResult {
  readonly name: string;
  readonly from: string;
  readonly to: string;
  readonly mode: "field-flip" | "store-swap";
  readonly changed: boolean;
}

/**
 * PROMOTE a sensorium. The ACTIVE path (F4) is the in-place FIELD-FLIP: climb one rung (pioneer →
 * hardening → durable) by flipping the manifest `lifecycle` field — the dir/cid never move, recall stays
 * unbroken (identity-preserving). The store-swap path (Sanity alias re-point) ships as STABLE GROUND,
 * FEATURE-GATED OFF: `--store-swap <target>` runs only when `LifecycleGates.storeSwapPromote` is flipped.
 */
export function promoteSensorium(
  name: string, opts: { storeSwapTarget?: string } = {}, gates: LifecycleGates = LIFECYCLE_GATES_DEFAULT,
): PromoteResult {
  const dir = sensoriumDir(name);
  const m = readManifest(dir);
  if (!m) throw new Error(`promote: no sensorium named '${name}'`);

  if (opts.storeSwapTarget) {
    if (!gates.storeSwapPromote) {
      throw new Error("promote --store-swap is gated OFF (there and unused) — the active promote is the in-place field-flip. Flip LifecycleGates.storeSwapPromote to enable the alias re-point.");
    }
    const targetDir = sensoriumDir(opts.storeSwapTarget);
    if (!readManifest(targetDir)) throw new Error(`store-swap target '${opts.storeSwapTarget}' has no manifest`);
    writeSensoriumAlias(name, targetDir);
    return { name, from: "alias", to: opts.storeSwapTarget, mode: "store-swap", changed: true };
  }

  const to = promoteState(m.lifecycle);
  const changed = to !== m.lifecycle;
  if (changed) writeManifest(dir, { ...m, lifecycle: to });
  return { name, from: m.lifecycle, to, mode: "field-flip", changed };
}

// ── RETIRE / UN-RETIRE (judged; move-not-delete) ───────────────────────────────────────────────────────

/** The outcome of a retire — the recorded grounds + the state that un-retire restores. */
export interface RetireResult {
  readonly name: string;
  readonly to: "tombstone";
  readonly grounds: MustieGround;
  readonly priorState: SensoriumLifecycleState;
  readonly already: boolean;
}

/**
 * RETIRE a sensorium — a JUDGED deaccession: flip `lifecycle` to tombstone and RECORD the MUSTIE grounds
 * + the prior state (un-retire restores it). REFUSES LOUD without a valid ground. NO byte-delete rides a
 * retire — the dir and planes stay; only the explicit HITL `purge` GCs. Idempotent on an already-tombstoned
 * sensorium (keeps the first grounds).
 */
export function retireSensorium(name: string, grounds: unknown): RetireResult {
  if (!isMustieGround(grounds)) {
    throw new Error(`retire refuses without a MUSTIE ground — one of: ${MUSTIE_GROUNDS.join(" · ")} (got ${JSON.stringify(grounds)}). A retire is judged, never silent.`);
  }
  const dir = sensoriumDir(name);
  const m = readManifest(dir);
  if (!m) throw new Error(`retire: no sensorium named '${name}'`);
  if (m.lifecycle === "tombstone") {
    const r = m.retirement;
    return { name, to: "tombstone", grounds: r?.grounds ?? grounds, priorState: r?.priorState ?? "durable", already: true };
  }
  const retirement: RetirementRecord = { grounds, retiredAt: new Date().toISOString(), priorState: m.lifecycle };
  writeManifest(dir, { ...m, lifecycle: "tombstone", retirement });
  return { name, to: "tombstone", grounds, priorState: m.lifecycle, already: false };
}

/** The outcome of an un-retire — the restored state (move-not-delete). */
export interface UnRetireResult {
  readonly name: string;
  readonly from: SensoriumLifecycleState;
  readonly to: SensoriumLifecycleState;
  readonly restored: boolean;
}

/**
 * UN-RETIRE — the designed RE-ENTRY (the Ironies-of-Automation cure): restore a tombstoned sensorium to
 * the state it stood at before the retire (recorded in the retirement record), dropping the record. Pure
 * move-not-delete — the bytes never left. A non-tombstone sensorium is a no-op ({restored:false}).
 */
export function unRetireSensorium(name: string): UnRetireResult {
  const dir = sensoriumDir(name);
  const m = readManifest(dir);
  if (!m) throw new Error(`un-retire: no sensorium named '${name}'`);
  if (m.lifecycle !== "tombstone") {
    return { name, from: m.lifecycle, to: m.lifecycle, restored: false };
  }
  const to = m.retirement?.priorState ?? "durable";
  const { retirement: _dropped, ...rest } = m;
  writeManifest(dir, { ...rest, lifecycle: to });
  return { name, from: "tombstone", to, restored: true };
}

// ── PURGE (the irreversible byte GC — HITL, explicit-only) ─────────────────────────────────────────────

/** The outcome of a purge — the bytes reclaimed. */
export interface PurgeResult {
  readonly name: string;
  readonly purged: boolean;
}

/**
 * PURGE — the irreversible byte GC (F3, explicit-only, NO auto-reclaim). Seated HITL: it needs an
 * operator-approval capability ({@link guardHitl}). REFUSES a live sensorium — only a TOMBSTONE GCs, so a
 * purge always follows a judged retire (never a silent delete of standing bytes). This is the one verb
 * that removes bytes; every other lifecycle verb moves-not-deletes.
 */
export function purgeSensorium(name: string, approval?: unknown): PurgeResult {
  guardHitl("purge", approval);
  const dir = sensoriumDir(name);
  const m = readManifest(dir);
  if (!m) throw new Error(`purge: no sensorium named '${name}'`);
  if (m.lifecycle !== "tombstone") {
    throw new Error(`purge refuses '${name}': only a TOMBSTONE sensorium GCs (retire it first). Explicit-only, no auto-reclaim.`);
  }
  rmSync(dir, { recursive: true, force: true });
  return { name, purged: true };
}
