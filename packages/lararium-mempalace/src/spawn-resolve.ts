/**
 * spawn-resolve — resolve HOW to spawn the read-only mempalace sidecar from a
 * daemon host (the @daemon seat).
 *
 * Option D, the read membrane: the @daemon host reaches mempalace THROUGH the
 * seat, never a raw CLI subprocess — so the spawn knowledge lives HERE, beside
 * MempalaceClient, not in the CLI (the dependency must not point node→cli).
 *
 * Venv-aware: prefers $VIRTUAL_ENV / ~/.venv (where mempalace + chromadb
 * pip-install) over the often PEP-668 externally-managed system python. Mirrors
 * the CLI's integration-check.resolvePython (kept in lockstep; that copy serves
 * `lares wake` before this package is in scope).
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";
import { repoRoot } from "@lararium/mesh/node";

let _python: string | null | undefined;

/** The Python interpreter that holds mempalace, or null when none responds. Cached. */
export function resolveMempalacePython(): string | null {
  if (_python !== undefined) return _python;
  const win = process.platform === "win32";
  const venvPy = (base: string): string => join(base, win ? "Scripts" : "bin", win ? "python.exe" : "python3");
  const cands: string[] = [];
  if (process.env["VIRTUAL_ENV"]) cands.push(venvPy(process.env["VIRTUAL_ENV"]));
  cands.push(venvPy(join(homedir(), ".venv")));
  cands.push("python3", "python", "py");
  for (const cand of cands) {
    try {
      const r = spawnSync(cand, ["--version"], { timeout: 5_000, stdio: "ignore" });
      if (r.error === undefined && r.status === 0) { _python = cand; return _python; }
    } catch { /* try next */ }
  }
  _python = null;
  return _python;
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
