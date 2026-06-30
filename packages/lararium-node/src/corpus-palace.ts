/**
 * corpus-palace — the ephemeral astral MULTIPALACE lifecycle (the `docker run --rm` of memory).
 *
 * Each `lares corpus run|open` mints a SCRATCH mempalace instance under `~/.lares/.corpus/<id>/`
 * (a 4th palace shape, the SAME ChromaDB machinery as the durable organs, just sweepable). A `run`
 * is ephemeral-DEFAULT: open → ingest → analyze → DISSOLVE on exit, success OR error. An `open`
 * leaves it live (a durable-until-dissolved instance) for later `query` / `keep` / `dissolve`.
 *
 * Leak-proofing: every instance carries a `manifest.json` ({id, ephemeral, pid, …}). An ephemeral
 * instance that outlives its run process is, by definition, leaked — `reapOrphans` removes every
 * ephemeral instance whose owning pid is dead (and every manifest-less dir), so an interrupted run
 * can never leave scratch behind. `palace-teardown` ALSO enumerates `.corpus/*` for the nuke path.
 *
 * The deep ingest (bands / structure / form caps) lands in S1–S3; THIS sprint wires the lifecycle +
 * the store + a THIN, graceful ingest seam (a best-effort `mempalace mine` into the scratch dir).
 *
 * Meme: lar:///ha.ka.ba/@lararium/mempalace/genesis-doc#astral-multipalace
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolveMempalaceSpawn, MempalaceClient } from "@lararium/mempalace";
import { atomicWriteFileSync } from "./fs-atomic.js";
import { larCorpusDir, corpusInstanceDir } from "./vessel-paths.js";

const MANIFEST = "manifest.json";

/** One ephemeral corpus-palace instance's on-disk manifest — the leak-proofing + provenance record. */
export interface CorpusManifest {
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
  /** drawers filed by the ingest stub (0 when the sidecar was unavailable). */
  readonly drawers?: number;
  /** an ingest note (e.g. "ingest-skipped: no python sidecar"). */
  readonly note?: string;
}

/** Mint a fresh, sortable-ish corpus id. */
export function newCorpusId(): string {
  return `c-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
}

function manifestPath(dir: string): string {
  return join(dir, MANIFEST);
}

function readManifest(dir: string): CorpusManifest | null {
  try {
    const m = JSON.parse(readFileSync(manifestPath(dir), "utf8")) as CorpusManifest;
    return typeof m?.id === "string" ? m : null;
  } catch {
    return null;
  }
}

function writeManifest(dir: string, m: CorpusManifest): void {
  atomicWriteFileSync(manifestPath(dir), JSON.stringify(m, null, 2) + "\n");
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

/** Every child dir of the corpus root (instance candidates), absolute. */
function instanceDirs(): string[] {
  const root = larCorpusDir();
  if (!existsSync(root)) return [];
  let ents: string[];
  try { ents = readdirSync(root); } catch { return []; }
  return ents
    .map((e) => join(root, e))
    .filter((p) => { try { return statSync(p).isDirectory(); } catch { return false; } });
}

/** The live corpus instances (valid manifest), newest first. */
export function listCorpora(): CorpusManifest[] {
  return instanceDirs()
    .map(readManifest)
    .filter((m): m is CorpusManifest => m !== null)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// ── the ingest seam (THIN for S0; the deep bands/structure/form caps land S1–S3) ──────────────────

/** The pluggable ingest leg — chunk + content-embed the source into the scratch palace dir. */
export type CorpusIngest = (args: { sourcePath: string; palaceDir: string }) => { drawers: number; note: string };

/**
 * The default ingest stub: a best-effort `mempalace mine <path> --palace <scratch>` (the existing
 * drawer path), parsing the "Drawers filed: N" tally. GRACEFUL by construction — a missing python
 * sidecar / a mine fault never sinks the run; the corpus stays a live (if empty) store and the note
 * records why. The deep analysis (bands · structure · form) is the documented S1–S3 seam.
 */
export const defaultCorpusIngest: CorpusIngest = ({ sourcePath, palaceDir }) => {
  const { python, sidecarPresent } = resolveMempalaceSpawn();
  if (!python || !sidecarPresent) return { drawers: 0, note: "ingest-skipped: no python sidecar (lares wake --install)" };
  if (!existsSync(sourcePath)) return { drawers: 0, note: `ingest-skipped: source absent (${sourcePath})` };
  try {
    const exe = process.platform === "win32" ? "mempalace.exe" : "mempalace";
    // `--mode projects` is the code/docs miner (the thin S0 stub); the bands/structure/form caps
    // refine this into the deep analysis in S1–S3.
    const out = execFileSync(exe, ["--palace", palaceDir, "mine", sourcePath, "--mode", "projects"], {
      maxBuffer: 1 << 30, encoding: "utf8", timeout: 180_000,
    });
    const drawers = Number(/Drawers filed:\s*(\d+)/.exec(out)?.[1] ?? 0);
    return { drawers, note: `mined ${sourcePath} → ${drawers} drawers` };
  } catch (e) {
    return { drawers: 0, note: `ingest-skipped: mine fault (${(e as Error).message.slice(0, 120)})` };
  }
};

export interface OpenCorpusOptions {
  readonly sourcePath: string;
  readonly name?: string;
  /** ephemeral (a `run`, dissolves on exit) vs durable (an `open`, stays live). Default false (open). */
  readonly ephemeral?: boolean;
  /** test/override seam: the ingest leg (defaults to {@link defaultCorpusIngest}). */
  readonly ingest?: CorpusIngest;
}

export interface OpenCorpusResult {
  readonly id: string;
  readonly dir: string;
  readonly manifest: CorpusManifest;
}

/** Spin up a scratch corpus-palace, ingest the source, write the manifest, leave it LIVE. */
export function openCorpus(opts: OpenCorpusOptions): OpenCorpusResult {
  const id = newCorpusId();
  const dir = corpusInstanceDir(id);
  mkdirSync(dir, { recursive: true });
  const name = opts.name ?? (opts.sourcePath.replace(/[/\\]+$/, "").split(/[/\\]/).pop() || id);
  const ephemeral = opts.ephemeral ?? false;
  const ingest = opts.ingest ?? defaultCorpusIngest;
  const { drawers, note } = ingest({ sourcePath: opts.sourcePath, palaceDir: dir });
  const manifest: CorpusManifest = {
    id, name, sourcePath: opts.sourcePath, createdAt: new Date().toISOString(),
    ephemeral, ...(ephemeral ? { pid: process.pid } : {}), drawers, note,
  };
  writeManifest(dir, manifest);
  return { id, dir, manifest };
}

// ── query (read leg) ──────────────────────────────────────────────────────────────────────────────

/** The pluggable search leg — query a scratch palace dir (defaults to the read-only sidecar client). */
export type CorpusSearch = (args: { palaceDir: string; query: string; limit: number }) => Promise<{ hits: Array<Record<string, unknown>>; note?: string }>;

export const defaultCorpusSearch: CorpusSearch = async ({ palaceDir, query, limit }) => {
  const { python, submoduleRoot, sidecarPresent } = resolveMempalaceSpawn();
  if (!python || !sidecarPresent) return { hits: [], note: "query-skipped: no python sidecar" };
  const client = new MempalaceClient({ submoduleRoot, palacePath: palaceDir, python });
  try {
    const res = await client.search({ query, limit });
    return { hits: (res.results ?? []) as Array<Record<string, unknown>> };
  } catch (e) {
    return { hits: [], note: `query-error: ${(e as Error).message.slice(0, 120)}` };
  } finally {
    try { await client.stop(); } catch { /* best effort */ }
  }
};

export interface QueryCorpusResult {
  readonly id: string;
  readonly found: boolean;
  readonly hits: Array<Record<string, unknown>>;
  readonly note?: string;
}

/** Query one live corpus by id. A gone/unknown id ⇒ {found:false}. */
export async function queryCorpus(
  id: string, keywords: string, search: CorpusSearch = defaultCorpusSearch, limit = 5,
): Promise<QueryCorpusResult> {
  const dir = corpusInstanceDir(id);
  if (!existsSync(dir) || readManifest(dir) === null) return { id, found: false, hits: [] };
  const { hits, note } = await search({ palaceDir: dir, query: keywords, limit });
  return { id, found: true, hits, ...(note ? { note } : {}) };
}

// ── promotion + dissolution (idempotent) ────────────────────────────────────────────────────────

export interface KeepResult { readonly id: string; readonly kept: boolean; readonly existed: boolean; }

/** Promote an ephemeral corpus to durable (ephemeral:false, pid dropped) — it survives exit now. */
export function keepCorpus(id: string): KeepResult {
  const dir = corpusInstanceDir(id);
  const m = existsSync(dir) ? readManifest(dir) : null;
  if (m === null) return { id, kept: false, existed: false };
  const { pid: _pid, ...rest } = m;
  writeManifest(dir, { ...rest, ephemeral: false });
  return { id, kept: true, existed: true };
}

export interface DissolveResult { readonly id: string; readonly dissolved: boolean; readonly existed: boolean; }

/** Dissolve one corpus by id — idempotent: an already-gone instance returns {dissolved:false, existed:false}. */
export function dissolveCorpus(id: string): DissolveResult {
  const dir = corpusInstanceDir(id);
  const existed = existsSync(dir);
  if (existed) rmSync(dir, { recursive: true, force: true });
  return { id, dissolved: existed, existed };
}

/** Dissolve EVERY live corpus instance. Returns the dissolved ids. */
export function dissolveAll(): string[] {
  const ids = listCorpora().map((m) => m.id);
  for (const id of ids) dissolveCorpus(id);
  return ids;
}

/** A leaked scratch dir — a reap candidate (manifest-less, or an ephemeral whose owner pid is dead). */
export function listOrphans(): string[] {
  const orphans: string[] = [];
  for (const dir of instanceDirs()) {
    const m = readManifest(dir);
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

export interface RunCorpusOptions extends Omit<OpenCorpusOptions, "ephemeral"> {
  /** an optional analysis query run against the fresh corpus before dissolution. */
  readonly analysis?: string;
  /** --keep: land the corpus (promote to durable) instead of dissolving on exit. Default false. */
  readonly keep?: boolean;
  /** test/override seam: the search leg (defaults to {@link defaultCorpusSearch}). */
  readonly search?: CorpusSearch;
}

export interface RunCorpusResult {
  readonly id: string;
  readonly drawers: number;
  readonly note?: string;
  readonly analysis?: QueryCorpusResult;
  /** true ⇒ dissolved on exit (the --rm default); false ⇒ kept (landed durable). */
  readonly dissolved: boolean;
}

/**
 * The `docker run --rm` gesture: open an EPHEMERAL corpus, (optionally) analyze it, then DISSOLVE on
 * exit — success OR error (the try/finally guarantee). `--keep` lands it durable instead. A hard
 * interrupt (SIGINT/crash) between open and the finally is caught by the process-exit guard wired
 * here, so the scratch never leaks even on a kill.
 */
export async function runCorpus(opts: RunCorpusOptions): Promise<RunCorpusResult> {
  const { id, dir, manifest } = openCorpus({
    sourcePath: opts.sourcePath, ephemeral: true,
    ...(opts.name !== undefined ? { name: opts.name } : {}),
    ...(opts.ingest !== undefined ? { ingest: opts.ingest } : {}),
  });

  // Hard-interrupt guard: a synchronous sweep on process exit removes the scratch if the run never
  // reached its finally (SIGINT / uncaught). Idempotent with the finally below + dissolveCorpus.
  let dissolved = false;
  const guard = (): void => { if (!dissolved && existsSync(dir) && (readManifest(dir)?.ephemeral ?? true)) { try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ } } };
  const onSignal = (sig: NodeJS.Signals): void => { guard(); process.exit(sig === "SIGINT" ? 130 : 143); };
  process.once("exit", guard);
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  try {
    const analysis = opts.analysis ? await queryCorpus(id, opts.analysis, opts.search ?? defaultCorpusSearch) : undefined;
    if (opts.keep) {
      keepCorpus(id);
      dissolved = false;
      return { id, drawers: manifest.drawers ?? 0, ...(manifest.note ? { note: manifest.note } : {}), ...(analysis ? { analysis } : {}), dissolved: false };
    }
    return { id, drawers: manifest.drawers ?? 0, ...(manifest.note ? { note: manifest.note } : {}), ...(analysis ? { analysis } : {}), dissolved: true };
  } finally {
    if (!opts.keep) { dissolveCorpus(id); dissolved = true; }
    process.removeListener("exit", guard);
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
  }
}

/** Resolve a corpus-teardown target list — every `.corpus/*` instance dir — for `palace-teardown`. */
export function corpusTeardownDirs(): string[] {
  return instanceDirs();
}
