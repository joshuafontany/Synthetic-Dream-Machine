/**
 * sense-sensorium — the ephemeral sensorium lifecycle (the `docker run --rm` of memory).
 *
 * Each `lares sensorium run|open` mints a rooted scratch sensorium under `<cache>/scratch/sensoriums/<id>/`.
 * Python's corpus pointer pipe owns content, structure, form, worldline, and bands beneath that root. A `run`
 * runs ephemeral-DEFAULT: open → ingest → analyze → DISSOLVE on exit, success OR error. An `open`
 * leaves it live (a durable-until-dissolved instance) for later `query` / `keep` / `dissolve`.
 *
 * Leak-proofing: every instance carries a `sensorium.json` LIFECYCLE record ({id, ephemeral, pid, …}). An
 * ephemeral instance that outlives its run process has leaked, by definition — `reapOrphans` removes
 * every ephemeral instance whose owning pid has died (and every record-less dir), so an interrupted run
 * can never leave scratch behind. `palace-teardown` ALSO enumerates `.sensorium/*` for the nuke path.
 *
 * THE MANIFEST SPLIT (the sheaf-true reader must never misparse the leak-record): the lifecycle record
 * rides `sensorium.json`; Python writes the sensorium declaration at canonical `manifest.json`.
 * Two files carry two jobs;
 * a sensorium reader reads a true sensorium, the reaper reads the leak-record.
 *
 * TypeScript carries lifecycle and read coordination. Python owns the capture pipe.
 *
 * Meme: lar:///ha.ka.ba/lararium/mempalace/genesis-doc#astral-multipalace
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolveMempalaceSpawn, MempalaceClient, resolveHolderCapEnv, resolveCorpusCaptureSpawn } from "@lararium/mempalace";
import { atomicWriteFileSync } from "./fs-atomic.js";
import { scratchSensoriumDir, scratchSensoriumInstanceDir } from "./vessel-paths.js";

/** The LIFECYCLE record stays apart from Python's sensorium declaration. */
const SENSORIUM_RECORD = "sensorium.json";

/** One ephemeral sensorium instance's lifecycle record — leak-proofing + provenance. */
export interface SensoriumLifecycle {
  readonly id: string;
  /** operator-friendly label (defaults to the source basename). */
  readonly name: string;
  /** the source path that was ingested. */
  readonly sourcePath: string;
  readonly createdAt: string;
  /** an EPHEMERAL instance (a `run`) MUST dissolve on exit; a leaked one (live on disk, dead pid) is
   *  reaped. An `open` (or a `keep`-promoted run) reads `ephemeral:false` — durable until dissolved. */
  readonly ephemeral: boolean;
  /** the owning process pid (ephemeral only) — `reapOrphans` spares an ephemeral whose pid still lives. */
  readonly pid?: number;
  /** drawers filed by the ingest stub (0 when the holder was unavailable). */
  readonly drawers?: number;
  /** structure-plane vectors filed by the parse-router (S2): one per file the router could parse
   *  (code · markdown · wikitext · json · toml · memetic-wikitext · prose). 0 ⇒ structure-skipped
   *  (no router / no parser for the corpus's kinds) — the content plane still stands. */
  readonly structures?: number;
  /** bands-plane adaptive lar_ffz cells the multi-scale FFZ holder filed (S1): one per content
   *  chunk, a five-band aperture address (Theme.Arc.Measure.Beat.Pulse) with a reproduced/fragile
   *  repro_grade from the resampling gate (a hardened-math witness — the wiki, not the sensorium,
   *  runs the data→meme promotion). 0 ⇒ bands-skipped (no holder / R / too few vectors) —
   *  the content + structure planes still stand. */
  readonly bands?: number;
  /** form-plane constructions the induction holder surfaced (S3): the corpus's OWN grammar,
   *  induced BLIND over the accumulated structures (TreeMiner + PrefixSpan/BIDE + ΔP, MDL-stopped)
   *  and keyed by structural hash. 0 ⇒ form-skipped (no holder / no structures / nothing that pays
   *  its description-length) — the content + structure + bands planes still stand. */
  readonly forms?: number;
  /** an ingest note (e.g. "ingest-skipped: no corpus capture pipe"). */
  readonly note?: string;
}

/** Mint a fresh, sortable-ish sensorium id. */
export function newSensoriumId(): string {
  return `s-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
}

function sensoriumRecordPath(dir: string): string {
  return join(dir, SENSORIUM_RECORD);
}

function readSensoriumRecord(dir: string): SensoriumLifecycle | null {
  try {
    const m = JSON.parse(readFileSync(sensoriumRecordPath(dir), "utf8")) as SensoriumLifecycle;
    return typeof m?.id === "string" ? m : null;
  } catch {
    return null;
  }
}

function writeSensoriumRecord(dir: string, m: SensoriumLifecycle): void {
  atomicWriteFileSync(sensoriumRecordPath(dir), JSON.stringify(m, null, 2) + "\n");
}

/** Is a pid still alive? (signal 0 = existence probe). EPERM ⇒ alive-but-not-ours. */
function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Every child dir of the sensorium root (instance candidates), absolute. */
function instanceDirs(): string[] {
  const root = scratchSensoriumDir();
  if (!existsSync(root)) return [];
  let ents: string[];
  try { ents = readdirSync(root); } catch { return []; }
  return ents
    .map((e) => join(root, e))
    .filter((p) => { try { return statSync(p).isDirectory(); } catch { return false; } });
}

/** The live sensorium instances (valid lifecycle record), newest first. */
export function listSensoria(): SensoriumLifecycle[] {
  return instanceDirs()
    .map(readSensoriumRecord)
    .filter((m): m is SensoriumLifecycle => m !== null)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// ── the ingest shore (THIN for S0; the deep bands/structure/form caps land S1–S3) ──────────────────

/** The pluggable Python-owned pointer ingest leg. */
export type SensoriumIngest = (args: { sourcePath: string; sensoriumRoot: string; ephemeral?: boolean }) => { drawers: number; structures: number; bands: number; forms: number; note: string };

/** The structure plane lives in a chroma sub-palace under the sensorium instance dir — so a
 *  `dissolve` (rmSync of the instance dir) sweeps it too; no separate teardown registration. */
export function sensoriumStructurePath(sensoriumRoot: string): string {
  return join(sensoriumRoot, "structure");
}

/** The bands plane's adaptive lar_ffz cells NDJSON, written under the sensorium instance dir (swept
 *  on dissolve with everything else). One line per content chunk: {id?, lar_ffz, repro_grade, cells}. */
export function sensoriumBandsCellsPath(sensoriumRoot: string): string {
  return join(sensoriumRoot, "bands-cells.ndjson");
}

/** The FORM plane's constructicon NDJSON — the corpus's OWN induced grammar, written under the
 *  sensorium instance dir (swept on dissolve with everything else). One line per surfaced template:
 *  {struct_hash, origin, seq, support, ...} (form_induction.py #the-form-induction, S3). */
export function sensoriumFormConstructiconPath(sensoriumRoot: string): string {
  return join(sensoriumRoot, "form-constructicon.ndjson");
}

/** Invoke the rooted Python capture pipe and retain only its lifecycle summary. */
export const defaultSensoriumIngest: SensoriumIngest = ({ sourcePath, sensoriumRoot, ephemeral = false }) => {
  const { python, script, submoduleRoot, scriptPresent } = resolveCorpusCaptureSpawn();
  if (!python || !scriptPresent) return { drawers: 0, structures: 0, bands: 0, forms: 0, note: "ingest-skipped: no corpus capture pipe (lares vessel stand --install)" };
  if (!existsSync(sourcePath)) return { drawers: 0, structures: 0, bands: 0, forms: 0, note: `ingest-skipped: source absent (${sourcePath})` };
  try {
    const env = { ...process.env, PYTHONPATH: submoduleRoot + (process.env["PYTHONPATH"] ? `:${process.env["PYTHONPATH"]}` : ""), ...resolveHolderCapEnv(python) };
    const out = execFileSync(python, [script, "--sensorium", sensoriumRoot, "--source", sourcePath, "--wing", "wing_corpus", ...(ephemeral ? ["--ephemeral"] : [])], {
      cwd: submoduleRoot, env, maxBuffer: 1 << 30, encoding: "utf8", timeout: 300_000,
    });
    const lines = out.trim().split(/\r?\n/).filter((value) => value.trim().startsWith("{"));
    const line = lines[lines.length - 1];
    const summary = JSON.parse(line ?? "{}") as Partial<{ drawers: number; structures: number; bands: number; forms: number; note: string }>;
    return { drawers: Number(summary.drawers ?? 0), structures: Number(summary.structures ?? 0),
      bands: Number(summary.bands ?? 0), forms: Number(summary.forms ?? 0),
      note: summary.note ?? "capture-skipped: no corpus summary" };
  } catch (e) {
    return { drawers: 0, structures: 0, bands: 0, forms: 0, note: `ingest-skipped: corpus capture fault (${(e as Error).message.slice(0, 120)})` };
  }
};

export interface OpenSensoriumOptions {
  readonly sourcePath: string;
  readonly name?: string;
  /** ephemeral (a `run`, dissolves on exit) vs durable (an `open`, stays live). Default false (open). */
  readonly ephemeral?: boolean;
  /** test/override shore: the ingest leg (defaults to {@link defaultSensoriumIngest}). */
  readonly ingest?: SensoriumIngest;
}

export interface OpenSensoriumResult {
  readonly id: string;
  readonly dir: string;
  readonly manifest: SensoriumLifecycle;
}

/** Spin up a scratch sensorium sensorium, ingest its pointer, write lifecycle state, leave it LIVE. */
export function openSensorium(opts: OpenSensoriumOptions): OpenSensoriumResult {
  const id = newSensoriumId();
  const dir = scratchSensoriumInstanceDir(id);
  mkdirSync(dir, { recursive: true });
  // Python runs from the mempalace submodule root; an absolute source pointer keeps the caller's cwd out of capture.
  const sourcePath = resolve(opts.sourcePath);
  const name = opts.name ?? (opts.sourcePath.replace(/[/\\]+$/, "").split(/[/\\]/).pop() || id);
  const ephemeral = opts.ephemeral ?? false;
  const ingest = opts.ingest ?? defaultSensoriumIngest;
  const { drawers, structures, bands, forms, note } = ingest({ sourcePath, sensoriumRoot: dir, ephemeral });
  const manifest: SensoriumLifecycle = {
    id, name, sourcePath, createdAt: new Date().toISOString(),
    ephemeral, ...(ephemeral ? { pid: process.pid } : {}), drawers, structures, bands, forms, note,
  };
  writeSensoriumRecord(dir, manifest);
  return { id, dir, manifest };
}

// ── query (read leg) ──────────────────────────────────────────────────────────────────────────────

/** The pluggable search leg — query a scratch palace dir (defaults to the read-only holder client). */
export type SensoriumSearch = (args: { sensoriumRoot: string; query: string; limit: number }) => Promise<{ hits: Array<Record<string, unknown>>; note?: string }>;

export const defaultSensoriumSearch: SensoriumSearch = async ({ sensoriumRoot, query, limit }) => {
  const { python, submoduleRoot, holderPresent } = resolveMempalaceSpawn();
  if (!python || !holderPresent) return { hits: [], note: "query-skipped: no python holder" };
  const client = new MempalaceClient({ submoduleRoot, palacePath: join(sensoriumRoot, "content"), python });
  try {
    const res = await client.search({ query, limit });
    return { hits: (res.results ?? []) as Array<Record<string, unknown>> };
  } catch (e) {
    return { hits: [], note: `query-error: ${(e as Error).message.slice(0, 120)}` };
  } finally {
    try { await client.stop(); } catch { /* best effort */ }
  }
};

export interface QuerySensoriumResult {
  readonly id: string;
  readonly found: boolean;
  readonly hits: Array<Record<string, unknown>>;
  readonly note?: string;
}

/** Query one live sensorium by id. A gone/unknown id ⇒ {found:false}. */
export async function querySensorium(
  id: string, keywords: string, search: SensoriumSearch = defaultSensoriumSearch, limit = 5,
): Promise<QuerySensoriumResult> {
  const dir = scratchSensoriumInstanceDir(id);
  if (!existsSync(dir) || readSensoriumRecord(dir) === null) return { id, found: false, hits: [] };
  const { hits, note } = await search({ sensoriumRoot: dir, query: keywords, limit });
  return { id, found: true, hits, ...(note ? { note } : {}) };
}

// ── promotion + dissolution (idempotent) ────────────────────────────────────────────────────────

export interface KeepResult { readonly id: string; readonly kept: boolean; readonly existed: boolean; }

/** Ask Python's rooted manifest cap to move one sensorium from ephemeral to durable. */
function setSensoriumEphemeral(dir: string, ephemeral: boolean): void {
  const manifestPath = join(dir, "manifest.json");
  if (!existsSync(manifestPath)) return;
  const { python, script, submoduleRoot, scriptPresent } = resolveCorpusCaptureSpawn();
  if (!python || !scriptPresent) return;
  const env = { ...process.env, PYTHONPATH: submoduleRoot + (process.env["PYTHONPATH"] ? `:${process.env["PYTHONPATH"]}` : ""), ...resolveHolderCapEnv(python) };
  execFileSync(python, [script, "--sensorium", dir, "--set-ephemeral", String(ephemeral)], {
    cwd: submoduleRoot, env, maxBuffer: 1 << 20, encoding: "utf8", timeout: 30_000,
  });
}

/** Promote an ephemeral sensorium to durable (ephemeral:false, pid dropped). */
export function keepSensorium(id: string): KeepResult {
  const dir = scratchSensoriumInstanceDir(id);
  const m = existsSync(dir) ? readSensoriumRecord(dir) : null;
  if (m === null) return { id, kept: false, existed: false };
  const { pid: _pid, ...rest } = m;
  writeSensoriumRecord(dir, { ...rest, ephemeral: false });
  try {
    setSensoriumEphemeral(dir, false);
  } catch { /* the lifecycle record still carries the promotion */ }
  return { id, kept: true, existed: true };
}

export interface DissolveResult { readonly id: string; readonly dissolved: boolean; readonly existed: boolean; }

/** Dissolve one sensorium by id — idempotent: an already-gone instance returns {dissolved:false, existed:false}. */
export function dissolveSensorium(id: string): DissolveResult {
  const dir = scratchSensoriumInstanceDir(id);
  const existed = existsSync(dir);
  if (existed) rmSync(dir, { recursive: true, force: true });
  return { id, dissolved: existed, existed };
}

/** Dissolve EVERY live sensorium instance. Returns the dissolved ids. */
export function dissolveAllSensoria(): string[] {
  const ids = listSensoria().map((m) => m.id);
  for (const id of ids) dissolveSensorium(id);
  return ids;
}

/** A leaked scratch dir — a reap candidate (record-less, or an ephemeral whose owner pid is dead). */
export function listOrphans(): string[] {
  const orphans: string[] = [];
  for (const dir of instanceDirs()) {
    const m = readSensoriumRecord(dir);
    if (m === null) { orphans.push(dir); continue; }          // corrupt / interrupted mid-mint
    if (!m.ephemeral) continue;                                // durable — never an orphan
    if (m.pid !== undefined && pidAlive(m.pid)) continue;      // a live run owns it — spare it
    orphans.push(dir);                                         // ephemeral, owner gone ⇒ leaked
  }
  return orphans;
}

/** Reap leaked scratch (manifest-less dirs + ephemerals whose owner pid is dead). Returns reaped dirs. */
export function reapOrphans(): string[] {
  const reaped = listOrphans();
  for (const dir of reaped) {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
  return reaped;
}

// ── run (the ephemeral default) ─────────────────────────────────────────────────────────────────

export interface RunSensoriumOptions extends Omit<OpenSensoriumOptions, "ephemeral"> {
  /** an optional analysis query run against the fresh sensorium before dissolution. */
  readonly analysis?: string;
  /** --keep: retain the sensorium (promote to durable) instead of dissolving on exit. Default false. */
  readonly keep?: boolean;
  /** test/override shore: the search leg (defaults to {@link defaultSensoriumSearch}). */
  readonly search?: SensoriumSearch;
}

export interface RunSensoriumResult {
  readonly id: string;
  readonly drawers: number;
  /** structure-plane vectors the parse-router filed (S2); 0 ⇒ structure-skipped. */
  readonly structures: number;
  /** bands-plane adaptive lar_ffz cells the multi-scale FFZ holder filed (S1); 0 ⇒ bands-skipped. */
  readonly bands: number;
  /** form-plane constructions the induction holder surfaced (S3); 0 ⇒ form-skipped. */
  readonly forms: number;
  readonly note?: string;
  readonly analysis?: QuerySensoriumResult;
  /** true ⇒ dissolved on exit (the --rm default); false ⇒ kept (landed durable). */
  readonly dissolved: boolean;
}

/**
 * The `docker run --rm` gesture: open an EPHEMERAL sensorium, (optionally) analyze it, then DISSOLVE on
 * exit — success OR error (the try/finally guarantee). `--keep` lands it durable instead. A hard
 * interrupt (SIGINT/crash) between open and the finally hits the process-exit guard wired
 * here, so the scratch never leaks even on a kill.
 */
export async function runSensorium(opts: RunSensoriumOptions): Promise<RunSensoriumResult> {
  const { id, dir, manifest } = openSensorium({
    sourcePath: opts.sourcePath, ephemeral: true,
    ...(opts.name !== undefined ? { name: opts.name } : {}),
    ...(opts.ingest !== undefined ? { ingest: opts.ingest } : {}),
  });

  // Hard-interrupt guard: a synchronous sweep on process exit removes the scratch if the run never
  // reached its finally (SIGINT / uncaught). Idempotent with the finally below + dissolveSensorium.
  let dissolved = false;
  const guard = (): void => { if (!dissolved && existsSync(dir) && (readSensoriumRecord(dir)?.ephemeral ?? true)) { try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ } } };
  const onSignal = (sig: NodeJS.Signals): void => { guard(); process.exit(sig === "SIGINT" ? 130 : 143); };
  process.once("exit", guard);
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  try {
    const analysis = opts.analysis ? await querySensorium(id, opts.analysis, opts.search ?? defaultSensoriumSearch) : undefined;
    if (opts.keep) {
      keepSensorium(id);
      dissolved = false;
      return { id, drawers: manifest.drawers ?? 0, structures: manifest.structures ?? 0, bands: manifest.bands ?? 0, forms: manifest.forms ?? 0, ...(manifest.note ? { note: manifest.note } : {}), ...(analysis ? { analysis } : {}), dissolved: false };
    }
    return { id, drawers: manifest.drawers ?? 0, structures: manifest.structures ?? 0, bands: manifest.bands ?? 0, forms: manifest.forms ?? 0, ...(manifest.note ? { note: manifest.note } : {}), ...(analysis ? { analysis } : {}), dissolved: true };
  } finally {
    if (!opts.keep) { dissolveSensorium(id); dissolved = true; }
    process.removeListener("exit", guard);
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
  }
}

/** Resolve a sensorium-teardown target list — every `.sensorium/*` instance dir — for `palace-teardown`. */
export function sensoriumTeardownDirs(): string[] {
  return instanceDirs();
}
