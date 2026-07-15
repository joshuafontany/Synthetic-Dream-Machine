/**
 * spawn-resolve — resolve HOW to spawn the read-only mempalace sidecar from a
 * daemon host (the @daemon seat).
 *
 * Option D, the read membrane: the @daemon host reaches mempalace THROUGH the
 * seat, never a raw CLI subprocess — so the spawn knowledge lives HERE, beside
 * MempalaceClient, not in the CLI (the dependency must not point node→cli).
 *
 * ONE VENV — `~/.venv`, the root venv, beside `~/.lares`. The whole stack resolves the SAME
 * interpreter, and `lares wake --install` stands it.
 *
 * Two interpreters with different powers diverge SILENTLY, which is the whole hazard. A second venv
 * carries its own onnxruntime, its own chromadb, its own accelerators — so the machina embeds on the
 * GPU while a script beside it falls to CPU, and neither says a word. Worse, a resolver that honors
 * `$VIRTUAL_ENV` hands the choice to whatever the operator's shell last activated: the same command
 * spawns a different python depending on the terminal it runs in.
 *
 * So the resolution runs NARROW and it VERIFIES:
 *   1. `LARES_PYTHON` — the explicit operator override, for an isolated instance. Named, never guessed.
 *   2. `~/.venv` — THE venv.
 * and each candidate must actually IMPORT MEMPALACE. An interpreter that answers `--version` and cannot
 * import the package it exists to spawn passes a liveness check and fails the only question that matters;
 * it gets refused here rather than discovered three layers down.
 *
 * No `$VIRTUAL_ENV` capture, and no bare-`python3` fallback — a PEP-668 system python holds no chroma,
 * and falling back to it converts a clear "run `lares wake --install`" into an obscure import error.
 * `null` refuses loudly; the callers render the cure.
 *
 * Mirrors the CLI's integration-check.resolvePython (kept in lockstep; that copy serves `lares wake`
 * before this package is in scope).
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";
import { repoRoot } from "@lararium/mesh/node";

let _python: string | null | undefined;

/** `~/.venv` — THE venv. One interpreter for the whole stack; `lares wake --install` stands it. */
export function laresVenvPython(): string {
  const win = process.platform === "win32";
  return join(homedir(), ".venv", win ? "Scripts" : "bin", win ? "python.exe" : "python3");
}

/** Whether an interpreter can actually IMPORT mempalace — the only question a spawn cares about. */
function holdsMempalace(python: string, submoduleRoot: string): boolean {
  try {
    const r = spawnSync(python, ["-c", "import mempalace"], {
      timeout: 20_000,
      stdio: "ignore",
      env: { ...process.env, PYTHONPATH: submoduleRoot },
    });
    return r.error === undefined && r.status === 0;
  } catch {
    return false;
  }
}

/**
 * THE interpreter, verified to hold mempalace — or null, which the callers render as
 * "run `lares wake --install`". Cached for the process.
 */
export function resolveMempalacePython(): string | null {
  if (_python !== undefined) return _python;
  const root = join(repoRoot, "mempalace");
  const cands = [process.env["LARES_PYTHON"], laresVenvPython()].filter(Boolean) as string[];
  for (const cand of cands) {
    if (holdsMempalace(cand, root)) {
      _python = cand;
      return _python;
    }
  }
  _python = null;
  return _python;
}

/** Drop the cached interpreter (a fresh install stands a venv the last probe could not see). */
export function _resetPythonCache(): void {
  _python = undefined;
}

export interface MempalaceSpawn {
  /** <repo>/mempalace — the spawn cwd for `python -m mempalace.mcp_server`. */
  readonly submoduleRoot: string;
  /** The resolved venv-aware interpreter, or null when none holds mempalace. */
  readonly python: string | null;
  /** Whether the sidecar entry file exists under submoduleRoot. */
  readonly sidecarPresent: boolean;
}

/** Resolve everything MempalaceClient needs to spawn the read-only sidecar. */
export function resolveMempalaceSpawn(): MempalaceSpawn {
  const submoduleRoot = join(repoRoot, "mempalace");
  const sidecarPresent = existsSync(join(submoduleRoot, "mempalace", "mcp_server.py"));
  return { submoduleRoot, python: resolveMempalacePython(), sidecarPresent };
}

/**
 * The resolved inputs ANY mempalace sidecar spawn needs — the ONE shape every sidecar shares,
 * a `serve` holder (structurepalace · form_encoder) OR a batch sidecar (structure_router · bands_sidecar
 * · form_induction): the venv-aware python, the helper SCRIPT (CODE, so it lives at the repo root,
 * never LAR_ROOT), the mempalace `submoduleRoot` (spawn cwd + PYTHONPATH so `import mempalace`
 * resolves), and whether the script is present on disk. Structurally identical to
 * `@lararium/node`'s `ResolvedServeSpawn` — the callers destructure, never type-annotate.
 */
export interface SidecarSpawn {
  readonly python: string | null;
  readonly script: string;
  readonly submoduleRoot: string;
  readonly scriptPresent: boolean;
}

/** Resolve a {@link SidecarSpawn} for a script under `packages/lararium-mempalace/scripts/`.
 *  ONE body; each named resolver below binds its own `scriptFile` — the only per-sidecar divergence. */
function resolveSidecarSpawn(scriptFile: string): SidecarSpawn {
  const submoduleRoot = join(repoRoot, "mempalace");
  const script = join(repoRoot, "packages", "lararium-mempalace", "scripts", scriptFile);
  return { python: resolveMempalacePython(), script, submoduleRoot, scriptPresent: existsSync(script) };
}

// The five sidecars name themselves by their one divergent bit — the script file. The `*Spawn`
// type aliases keep each holder's declared surface stable (callers destructure the shared shape).

/**
 * `lares_mcp.py` — the LARES MCP surface (FastMCP): one @tool per lifecycle verb over the memory
 * sensorium (recall · recall_structure · recall_form · plane_record · harvest · status · worldline ·
 * kapae · un_kapae). NOT a palace holder — it takes `--palace <sensorium dir>` (the sensorium ROOT,
 * not a leaf store; it resolves `<palace>/content` itself) and speaks MCP over stdio to a harness.
 *
 * The seat `lares wake --claude/--codex/--copilot/--vscode` registers: a harness reaches memory
 * THROUGH the lares house, never around it into a palace of its own. One owner per palace.
 */
export type LaresMcpSpawn = SidecarSpawn;
export function resolveLaresMcpSpawn(): LaresMcpSpawn {
  return resolveSidecarSpawn("lares_mcp.py");
}

/** `structurepalace_io.py` — the persistent NDJSON `serve` holder for the `.structurepalace` AST store. */
export type StructurePalaceSpawn = SidecarSpawn;
export function resolveStructurePalaceSpawn(): StructurePalaceSpawn {
  return resolveSidecarSpawn("structurepalace_io.py");
}

/** `form_encoder.py` — the persistent NDJSON `serve` holder for the living-grammar FORM store. */
export type FormEncoderSpawn = SidecarSpawn;
export function resolveFormEncoderSpawn(): FormEncoderSpawn {
  return resolveSidecarSpawn("form_encoder.py");
}

/** `persistence_io.py` — the persistent NDJSON `serve` holder for a PersistencePalace (testimony) store. */
export type PersistencePalaceSpawn = SidecarSpawn;
export function resolvePersistencePalaceSpawn(): PersistencePalaceSpawn {
  return resolveSidecarSpawn("persistence_io.py");
}

/** `content_io.py` — the persistent NDJSON `serve` holder for a CONTENT store (non-memory targeted content). */
export type ContentPalaceSpawn = SidecarSpawn;
export function resolveContentPalaceSpawn(): ContentPalaceSpawn {
  return resolveSidecarSpawn("content_io.py");
}

/** `capture_session.py` — the Python-owned source-stream capture holder. */
export type CaptureSessionSpawn = SidecarSpawn;
export function resolveCaptureSessionSpawn(): CaptureSessionSpawn {
  return resolveSidecarSpawn("capture_session.py");
}

/** `capture_corpus.py` — the Python-owned rooted static-corpus pointer pipe. */
export type CorpusCaptureSpawn = SidecarSpawn;
export function resolveCorpusCaptureSpawn(): CorpusCaptureSpawn {
  return resolveSidecarSpawn("capture_corpus.py");
}

/** `embed_io.py` — the palace-less EMBED holder (text→vector), consuming the mempalace embedder. */
export type EmbedSpawn = SidecarSpawn;
export function resolveEmbedSpawn(): EmbedSpawn {
  return resolveSidecarSpawn("embed_io.py");
}

/** `search_io.py` — the SEARCH holder, consuming mempalace's hybrid `search_memories` over a palace. */
export type SearchSpawn = SidecarSpawn;
export function resolveSearchSpawn(): SearchSpawn {
  return resolveSidecarSpawn("search_io.py");
}

/** `kg_io.py serve` — the KG holder, consuming mempalace's KnowledgeGraph (read+write) over a palace. */
export type KgSpawn = SidecarSpawn;
export function resolveKgSpawn(): KgSpawn {
  return resolveSidecarSpawn("kg_io.py");
}

/** `meta_io.py` — the palace-less META-MODEL holder (content→entities+hall), consuming their extractors. */
export type MetaSpawn = SidecarSpawn;
export function resolveMetaSpawn(): MetaSpawn {
  return resolveSidecarSpawn("meta_io.py");
}

/** `graph_io.py serve` — the GRAPH holder, consuming mempalace palace_graph + hallways over a palace. */
export type GraphSpawn = SidecarSpawn;
export function resolveGraphSpawn(): GraphSpawn {
  return resolveSidecarSpawn("graph_io.py");
}

/** `structure_router.py` — the corpus STRUCTURE-plane parse router (batch, once per ingest). */
export type StructureRouterSpawn = SidecarSpawn;
export function resolveStructureRouterSpawn(): StructureRouterSpawn {
  return resolveSidecarSpawn("structure_router.py");
}

/** `bands_sidecar.py` — the corpus BANDS-plane multi-scale FFZ (batch, after content+structure). */
export type BandsSidecarSpawn = SidecarSpawn;
export function resolveBandsSidecarSpawn(): BandsSidecarSpawn {
  return resolveSidecarSpawn("bands_sidecar.py");
}

/** `form_induction.py` — the corpus FORM-plane BLIND grammar induction (batch, after structure). */
export type FormInductionSpawn = SidecarSpawn;
export function resolveFormInductionSpawn(): FormInductionSpawn {
  return resolveSidecarSpawn("form_induction.py");
}
