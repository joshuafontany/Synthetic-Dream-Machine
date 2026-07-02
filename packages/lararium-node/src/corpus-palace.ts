/**
 * corpus-palace — the ephemeral astral MULTIPALACE lifecycle (the `docker run --rm` of memory).
 *
 * Each `lares corpus run|open` mints a SCRATCH mempalace instance under `~/.lares/.corpus/<id>/`
 * (a 4th palace shape, the SAME ChromaDB machinery as the durable organs, just sweepable). A `run`
 * is ephemeral-DEFAULT: open → ingest → analyze → DISSOLVE on exit, success OR error. An `open`
 * leaves it live (a durable-until-dissolved instance) for later `query` / `keep` / `dissolve`.
 *
 * Leak-proofing: every instance carries a `corpus.json` LIFECYCLE record ({id, ephemeral, pid, …}). An
 * ephemeral instance that outlives its run process is, by definition, leaked — `reapOrphans` removes
 * every ephemeral instance whose owning pid is dead (and every record-less dir), so an interrupted run
 * can never leave scratch behind. `palace-teardown` ALSO enumerates `.corpus/*` for the nuke path.
 *
 * THE MANIFEST SPLIT (the sheaf-true reader must never misparse the leak-record): the lifecycle record
 * rides `corpus.json`, and the instance ALSO stamps a REAL {@link SensoriumManifest} at the canonical
 * `manifest.json` (`ephemeral:true`) — so the corpus dir IS a sheaf-true ephemeral sensorium (the
 * compose_palace instantiated transiently: content ← the scratch chroma at the dir root, structure ←
 * the parse-router sub-palace when it stood, bands ← the on-read aperture grain). Two files, two jobs;
 * a sensorium reader reads a true sensorium, the reaper reads the leak-record.
 *
 * The deep ingest (bands / structure / form caps) lands in S1–S3; THIS sprint wires the lifecycle +
 * the store + a THIN, graceful ingest seam (a best-effort `mempalace mine` into the scratch dir).
 *
 * Meme: lar:///ha.ka.ba/@lararium/mempalace/genesis-doc#astral-multipalace
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolveMempalaceSpawn, MempalaceClient, resolveStructureRouterSpawn, resolveBandsSidecarSpawn, resolveComputeCapEnv, resolveFormInductionSpawn } from "@lararium/mempalace";
import { atomicWriteFileSync } from "./fs-atomic.js";
import { larCorpusDir, corpusInstanceDir, resolveMempalaceExe } from "./vessel-paths.js";
import { buildSensoriumManifest, readManifest as readSensoriumManifest, writeManifest as writeSensoriumManifest } from "./sensorium.js";

/** The LIFECYCLE record filename — the leak-proofing/provenance record ({id, ephemeral, pid, …}). Held
 *  OFF `manifest.json` so the sheaf-true sensorium reader never misparses it (the corpus dir's
 *  `manifest.json` carries a REAL {@link SensoriumManifest} instead). */
const CORPUS_RECORD = "corpus.json";

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
  /** structure-plane vectors filed by the parse-router (S2): one per file the router could parse
   *  (code · markdown · wikitext · json · toml · memetic-wikitext · prose). 0 ⇒ structure-skipped
   *  (no router / no parser for the corpus's kinds) — the content plane still stands. */
  readonly structures?: number;
  /** bands-plane adaptive lar_ffz cells the multi-scale FFZ sidecar filed (S1): one per content
   *  chunk, a five-band aperture address (Theme.Arc.Measure.Beat.Pulse) with a Canon/Provisional
   *  register from the resampling gate. 0 ⇒ bands-skipped (no sidecar / R / too few vectors) —
   *  the content + structure planes still stand. */
  readonly bands?: number;
  /** form-plane constructions the induction sidecar surfaced (S3): the corpus's OWN grammar,
   *  induced BLIND over the accumulated structures (TreeMiner + PrefixSpan/BIDE + ΔP, MDL-stopped)
   *  and keyed by structural hash. 0 ⇒ form-skipped (no sidecar / no structures / nothing that pays
   *  its description-length) — the content + structure + bands planes still stand. */
  readonly forms?: number;
  /** an ingest note (e.g. "ingest-skipped: no python sidecar"). */
  readonly note?: string;
}

/** Mint a fresh, sortable-ish corpus id. */
export function newCorpusId(): string {
  return `c-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
}

function corpusRecordPath(dir: string): string {
  return join(dir, CORPUS_RECORD);
}

function readCorpusRecord(dir: string): CorpusManifest | null {
  try {
    const m = JSON.parse(readFileSync(corpusRecordPath(dir), "utf8")) as CorpusManifest;
    return typeof m?.id === "string" ? m : null;
  } catch {
    return null;
  }
}

function writeCorpusRecord(dir: string, m: CorpusManifest): void {
  atomicWriteFileSync(corpusRecordPath(dir), JSON.stringify(m, null, 2) + "\n");
}

/**
 * Stamp the corpus dir's REAL {@link SensoriumManifest} (`ephemeral:true`) — the compose_palace
 * instantiated transiently. content ← the scratch chroma the mine wrote at the dir root (engine
 * `mempalace`; the self-dir cap serializes as `"."`), structure ← the parse-router sub-palace when it
 * actually stood (`structures > 0`; engine `structurepalace`), bands ← the on-read aperture grain (base cap,
 * no bytes). This is what a sheaf-true reader sees — never the leak-record. Best-effort: a stamp fault
 * never sinks the ingest (the leak-record + planes already stand).
 */
function stampCorpusSensorium(dir: string, structures: number): void {
  try {
    writeSensoriumManifest(dir, buildSensoriumManifest(dir, {
      sensorium: "corpus",
      lar: "lar:///ha.ka.ba/@lares/api/lares/corpus#astral-multipalace",
      caps: {
        content: { absDir: dir, engine: "mempalace" },
        ...(structures > 0 ? { structure: { absDir: corpusStructureDir(dir), engine: "structurepalace" } } : {}),
      },
      bands: { grain: "aperture", computed: "sidecar" },
      ephemeral: true,
    }));
  } catch { /* best effort — the leak-record + planes already stand */ }
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

/** The live corpus instances (valid lifecycle record), newest first. */
export function listCorpora(): CorpusManifest[] {
  return instanceDirs()
    .map(readCorpusRecord)
    .filter((m): m is CorpusManifest => m !== null)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// ── the ingest seam (THIN for S0; the deep bands/structure/form caps land S1–S3) ──────────────────

/** The pluggable ingest leg — chunk + content-embed the source into the scratch palace dir,
 *  (S2) push each file through the structure parse-router into a structure plane under the dir,
 *  and (S1) run the multi-scale FFZ bands sidecar over the corpus cohesion signal → adaptive
 *  lar_ffz cells. */
export type CorpusIngest = (args: { sourcePath: string; palaceDir: string }) => { drawers: number; structures: number; bands: number; forms: number; note: string };

/** The structure plane lives in a chroma sub-palace under the corpus instance dir — so a
 *  `dissolve` (rmSync of the instance dir) sweeps it too; no separate teardown registration. */
export function corpusStructureDir(palaceDir: string): string {
  return join(palaceDir, "structure");
}

/** The bands plane's adaptive lar_ffz cells NDJSON, written under the corpus instance dir (swept
 *  on dissolve with everything else). One line per content chunk: {id?, lar_ffz, register, cells}. */
export function corpusBandsCellsPath(palaceDir: string): string {
  return join(palaceDir, "bands-cells.ndjson");
}

/** The FORM plane's constructicon NDJSON — the corpus's OWN induced grammar, written under the
 *  corpus instance dir (swept on dissolve with everything else). One line per surfaced template:
 *  {struct_hash, origin, seq, support, ...} (form_induction.py #the-form-induction, S3). */
export function corpusFormConstructiconPath(palaceDir: string): string {
  return join(palaceDir, "form-constructicon.ndjson");
}

/** The resolved spawn inputs a batch sidecar needs (the shared shape the corpus legs destructure). */
type BatchSidecarSpawn = { python: string | null; script: string; submoduleRoot: string; scriptPresent: boolean };

/** The outcome of a batch-sidecar run: streamed JSON lines (last = summary), or a non-run reason. */
type BatchSidecarRun =
  | { readonly ok: true; readonly lines: string[] }
  | { readonly ok: false; readonly reason: "absent" }
  | { readonly ok: false; readonly reason: "fault"; readonly message: string };

/**
 * Run a batch corpus sidecar (`execFileSync`) and return the JSON lines it streamed (the LAST is the
 * authoritative summary, the preceding lines the plane's payload). The ONE membrane the three legs
 * (structure · bands · form) share: the PYTHONPATH + optional-GPU-compute-cap env, the `1<<30`
 * maxBuffer, the caller's timeout, and the `startsWith("{")` line filter. Each leg supplies its spawn,
 * argv, and timeout, and OWNS the parse of the returned lines + its own skip-note wording.
 */
function runBatchSidecar(spawn: BatchSidecarSpawn, argv: readonly string[], timeoutMs: number): BatchSidecarRun {
  const { python, script, submoduleRoot, scriptPresent } = spawn;
  if (!python || !scriptPresent) return { ok: false, reason: "absent" };
  try {
    const env = { ...process.env, PYTHONPATH: submoduleRoot + (process.env["PYTHONPATH"] ? `:${process.env["PYTHONPATH"]}` : ""), ...resolveComputeCapEnv(python) };
    const out = execFileSync(python, [script, ...argv], {
      cwd: submoduleRoot, env, maxBuffer: 1 << 30, encoding: "utf8", timeout: timeoutMs,
    });
    const lines = out.trim().split(/\r?\n/).filter((l) => l.trim().startsWith("{"));
    return { ok: true, lines };
  } catch (e) {
    return { ok: false, reason: "fault", message: (e as Error).message };
  }
}

/**
 * The FORM leg (S3): run `form_induction.py induce --structure <corpus>/structure` — an OFFLINE
 * BATCH over the accumulated STRUCTURE forest → TreeMiner + PrefixSpan/BIDE + ΔP-association →
 * MDL-selected constructicon, keyed by structural hash (the corpus's OWN grammar, induced blind,
 * the LLM naming LAST). GRACEFUL: no sidecar / no python / no structure store / too few
 * structures ⇒ `forms:0` (form-skipped), the content · structure · bands planes UNAFFECTED.
 * Returns the constructicon size + a note fragment. Runs AFTER the structure router (it reads the
 * trees the router filed), and never re-parses.
 */
function runFormInduction(palaceDir: string): { forms: number; note: string } {
  // The sidecar streams NDJSON template lines then a final JSON summary; the LAST JSON line is
  // authoritative, the preceding lines are the constructicon templates we persist.
  const r = runBatchSidecar(resolveFormInductionSpawn(), ["induce", "--structure", corpusStructureDir(palaceDir)], 300_000);
  if (!r.ok) return { forms: 0, note: r.reason === "absent" ? "form-skipped: no sidecar/python" : `form-skipped: sidecar fault (${r.message.slice(0, 100)})` };
  if (r.lines.length === 0) return { forms: 0, note: "form-skipped: no sidecar output" };
  const summary = JSON.parse(r.lines[r.lines.length - 1] as string) as { forms?: number; note?: string };
  const formLines = r.lines.slice(0, -1);
  if (formLines.length > 0) {
    try { writeFileSync(corpusFormConstructiconPath(palaceDir), formLines.join("\n") + "\n"); } catch { /* best effort */ }
  }
  const forms = Number(summary.forms ?? 0);
  return { forms, note: summary.note ? `${summary.note}` : `form: ${forms} constructions` };
}

/**
 * The BANDS leg (S1): run `bands_sidecar.py analyze --palace <dir>` over the corpus content
 * embeddings (read back from the scratch palace chroma) → the multi-scale FFZ stack (MODWT-MRA
 * spine · EWT/ssqueezepy servo · ecp/ruptures divisive tree · resampling-consensus gate) → the
 * adaptive lar_ffz cells, captured to {@link corpusBandsCellsPath}. GRACEFUL: no sidecar / no
 * python / no chroma / too few vectors ⇒ `bands:0` (bands-skipped), the content + structure
 * planes UNAFFECTED. Returns the cell count + a note fragment. Runs AFTER the content mine (it
 * reads the stored nomic vectors the mine wrote), and never re-embeds.
 */
function runBandsSidecar(palaceDir: string): { bands: number; note: string } {
  // The sidecar streams NDJSON cells then a final JSON summary; the LAST JSON line is
  // authoritative, the preceding cell lines are the adaptive lar_ffz stamps we persist.
  const r = runBatchSidecar(resolveBandsSidecarSpawn(), ["analyze", "--palace", palaceDir], 300_000);
  if (!r.ok) return { bands: 0, note: r.reason === "absent" ? "bands-skipped: no sidecar/python" : `bands-skipped: sidecar fault (${r.message.slice(0, 100)})` };
  if (r.lines.length === 0) return { bands: 0, note: "bands-skipped: no sidecar output" };
  const summary = JSON.parse(r.lines[r.lines.length - 1] as string) as { cells?: number; note?: string };
  const cellLines = r.lines.slice(0, -1);
  if (cellLines.length > 0) {
    try { writeFileSync(corpusBandsCellsPath(palaceDir), cellLines.join("\n") + "\n"); } catch { /* best effort */ }
  }
  const bands = Number(summary.cells ?? 0);
  return { bands, note: summary.note ? `bands: ${summary.note}` : `bands: ${bands} cells` };
}

/**
 * The STRUCTURE leg (S2): run `structure_router.py ingest` to parse each source file (tree-sitter
 * for code/markdown/wikitext/json/toml · the sigil parser for memetic-wikitext · a constituency
 * tier for prose) → the structurepalace content-free encoder → a structure chroma-palace under the corpus
 * dir. GRACEFUL: no router / no python / a kind with no parser ⇒ `structures:0` (structure-skipped),
 * the content plane unaffected. Returns the structure-vector count + a note fragment.
 */
function runStructureRouter(sourcePath: string, palaceDir: string): { structures: number; note: string } {
  const r = runBatchSidecar(resolveStructureRouterSpawn(), ["ingest", "--path", sourcePath, "--palace", corpusStructureDir(palaceDir)], 180_000);
  if (!r.ok) return { structures: 0, note: r.reason === "absent" ? "structure-skipped: no router/python" : `structure-skipped: router fault (${r.message.slice(0, 100)})` };
  // The router prints a one-line JSON summary; the last JSON line is authoritative.
  const lastLine = r.lines[r.lines.length - 1] ?? "{}";
  const summary = JSON.parse(lastLine) as { structures?: number; parsed?: number; skipped?: number };
  const structures = Number(summary.structures ?? 0);
  return { structures, note: `structure: ${structures} vectors (${summary.skipped ?? 0} skipped)` };
}

/**
 * The default ingest leg: a best-effort `mempalace mine <path> --palace <scratch>` (the CONTENT
 * plane, parsing the "Drawers filed: N" tally) PLUS the S2 structure parse-router (the STRUCTURE
 * plane). GRACEFUL by construction — a missing python sidecar / a mine fault / no parser never
 * sinks the run; the corpus stays a live store and the note records why. The bands · form caps are
 * the documented S1 · S3 seam.
 */
export const defaultCorpusIngest: CorpusIngest = ({ sourcePath, palaceDir }) => {
  const { python, sidecarPresent } = resolveMempalaceSpawn();
  if (!python || !sidecarPresent) return { drawers: 0, structures: 0, bands: 0, forms: 0, note: "ingest-skipped: no python sidecar (lares wake --install)" };
  if (!existsSync(sourcePath)) return { drawers: 0, structures: 0, bands: 0, forms: 0, note: `ingest-skipped: source absent (${sourcePath})` };
  // STRUCTURE plane (S2) — independent of the content mine; runs even if the mine faults.
  const struct = runStructureRouter(sourcePath, palaceDir);
  // FORM plane (S3) — the offline BATCH induction over the accumulated structures the router just
  // filed; independent of the content mine, so it stands even if the mine faults. `structures:0`
  // (no trees to mine) ⇒ form gracefully skips.
  const form = struct.structures > 0 ? runFormInduction(palaceDir) : { forms: 0, note: "form-skipped: no structures" };
  try {
    const exe = resolveMempalaceExe();
    // The OPTIONAL GPU compute cap: on a card, this hands the content embedder the CUDA lib path
    // + `MEMPALACE_EMBEDDING_DEVICE=auto` (cuda-if-present); on the QA box it adds only the device
    // hint and the embedder falls to CPU. Composed when present, graceful when absent.
    const capEnv = { ...process.env, ...resolveComputeCapEnv(python) };
    const out = execFileSync(exe, ["--palace", palaceDir, "mine", sourcePath, "--mode", "projects"], {
      env: capEnv, maxBuffer: 1 << 30, encoding: "utf8", timeout: 180_000,
    });
    const drawers = Number(/Drawers filed:\s*(\d+)/.exec(out)?.[1] ?? 0);
    // BANDS plane (S1) — runs AFTER the content mine (it reads the stored vectors); a mine that
    // filed nothing means no cohesion signal → bands gracefully skip.
    const bands = drawers > 0 ? runBandsSidecar(palaceDir) : { bands: 0, note: "bands-skipped: no content drawers" };
    return { drawers, structures: struct.structures, bands: bands.bands, forms: form.forms, note: `mined ${sourcePath} → ${drawers} drawers · ${struct.note} · ${bands.note} · ${form.note}` };
  } catch (e) {
    return { drawers: 0, structures: struct.structures, bands: 0, forms: form.forms, note: `ingest-skipped: mine fault (${(e as Error).message.slice(0, 120)}) · ${struct.note} · ${form.note}` };
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
  // Resolve the source to an ABSOLUTE path before ANY ingest leg runs: the structure · bands · form
  // sidecars run with `cwd: submoduleRoot` (the mempalace dir), so a relative sourcePath (the common
  // CLI form, `packages/foo`) would resolve against the WRONG cwd and the router would walk nothing
  // (0 structures → form-skips). The content mine inherits the process cwd and survived by luck; this
  // makes every leg agree on one absolute source (and records it durably in the manifest).
  const sourcePath = resolve(opts.sourcePath);
  const name = opts.name ?? (opts.sourcePath.replace(/[/\\]+$/, "").split(/[/\\]/).pop() || id);
  const ephemeral = opts.ephemeral ?? false;
  const ingest = opts.ingest ?? defaultCorpusIngest;
  const { drawers, structures, bands, forms, note } = ingest({ sourcePath, palaceDir: dir });
  const manifest: CorpusManifest = {
    id, name, sourcePath, createdAt: new Date().toISOString(),
    ephemeral, ...(ephemeral ? { pid: process.pid } : {}), drawers, structures, bands, forms, note,
  };
  writeCorpusRecord(dir, manifest);
  // Stamp the REAL sheaf-true sensorium manifest beside the leak-record (the compose_palace, transient).
  stampCorpusSensorium(dir, structures);
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
  if (!existsSync(dir) || readCorpusRecord(dir) === null) return { id, found: false, hits: [] };
  const { hits, note } = await search({ palaceDir: dir, query: keywords, limit });
  return { id, found: true, hits, ...(note ? { note } : {}) };
}

// ── promotion + dissolution (idempotent) ────────────────────────────────────────────────────────

export interface KeepResult { readonly id: string; readonly kept: boolean; readonly existed: boolean; }

/** Promote an ephemeral corpus to durable (ephemeral:false, pid dropped) — it survives exit now. Flips
 *  the sheaf-true sensorium manifest's `ephemeral` too, so the leak-record and the sensorium stay coherent. */
export function keepCorpus(id: string): KeepResult {
  const dir = corpusInstanceDir(id);
  const m = existsSync(dir) ? readCorpusRecord(dir) : null;
  if (m === null) return { id, kept: false, existed: false };
  const { pid: _pid, ...rest } = m;
  writeCorpusRecord(dir, { ...rest, ephemeral: false });
  // Keep the sensorium manifest coherent — its bytes are durable now.
  const sm = readSensoriumManifest(dir);
  if (sm && sm.ephemeral) { try { writeSensoriumManifest(dir, { ...sm, ephemeral: false }); } catch { /* best effort */ } }
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

/** A leaked scratch dir — a reap candidate (record-less, or an ephemeral whose owner pid is dead). */
export function listOrphans(): string[] {
  const orphans: string[] = [];
  for (const dir of instanceDirs()) {
    const m = readCorpusRecord(dir);
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
  /** structure-plane vectors the parse-router filed (S2); 0 ⇒ structure-skipped. */
  readonly structures: number;
  /** bands-plane adaptive lar_ffz cells the multi-scale FFZ sidecar filed (S1); 0 ⇒ bands-skipped. */
  readonly bands: number;
  /** form-plane constructions the induction sidecar surfaced (S3); 0 ⇒ form-skipped. */
  readonly forms: number;
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
  const guard = (): void => { if (!dissolved && existsSync(dir) && (readCorpusRecord(dir)?.ephemeral ?? true)) { try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ } } };
  const onSignal = (sig: NodeJS.Signals): void => { guard(); process.exit(sig === "SIGINT" ? 130 : 143); };
  process.once("exit", guard);
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  try {
    const analysis = opts.analysis ? await queryCorpus(id, opts.analysis, opts.search ?? defaultCorpusSearch) : undefined;
    if (opts.keep) {
      keepCorpus(id);
      dissolved = false;
      return { id, drawers: manifest.drawers ?? 0, structures: manifest.structures ?? 0, bands: manifest.bands ?? 0, forms: manifest.forms ?? 0, ...(manifest.note ? { note: manifest.note } : {}), ...(analysis ? { analysis } : {}), dissolved: false };
    }
    return { id, drawers: manifest.drawers ?? 0, structures: manifest.structures ?? 0, bands: manifest.bands ?? 0, forms: manifest.forms ?? 0, ...(manifest.note ? { note: manifest.note } : {}), ...(analysis ? { analysis } : {}), dissolved: true };
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
