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

/** Locate `astpalace_io.py` — CODE, so it lives at the repo root (never LAR_ROOT). The
 *  persistent NDJSON holder for the `.astpalace` mempalace instance (the AST store). */
export function resolveAstPalaceIo(): string {
  return join(repoRoot, "packages", "lararium-mempalace", "scripts", "astpalace_io.py");
}

/** What `makeAstPalace` needs to spawn the `.astpalace` holder: the venv-aware python,
 *  the helper script, and the submoduleRoot (PYTHONPATH so `import mempalace` resolves). */
export interface AstPalaceSpawn {
  readonly python: string | null;
  readonly script: string;
  readonly submoduleRoot: string;
  readonly scriptPresent: boolean;
}

/** Resolve everything the `.astpalace` holder needs (mirrors {@link resolveMempalaceSpawn}). */
export function resolveAstPalaceSpawn(): AstPalaceSpawn {
  const submoduleRoot = join(repoRoot, "mempalace");
  const script = resolveAstPalaceIo();
  return { python: resolveMempalacePython(), script, submoduleRoot, scriptPresent: existsSync(script) };
}

/** Locate `form_encoder.py` — CODE at the repo root. The persistent NDJSON holder for the
 *  living-grammar FORM store (the @daemon's two-planes Lares-INTEGRATION: encode + store). */
export function resolveFormEncoderIo(): string {
  return join(repoRoot, "packages", "lararium-mempalace", "scripts", "form_encoder.py");
}

/** What `makeFormPalace` needs to spawn the form-encoder holder (mirrors {@link AstPalaceSpawn}). */
export interface FormEncoderSpawn {
  readonly python: string | null;
  readonly script: string;
  readonly submoduleRoot: string;
  readonly scriptPresent: boolean;
}

/** Resolve everything the form-encoder holder needs (mirrors {@link resolveAstPalaceSpawn}). */
export function resolveFormEncoderSpawn(): FormEncoderSpawn {
  const submoduleRoot = join(repoRoot, "mempalace");
  const script = resolveFormEncoderIo();
  return { python: resolveMempalacePython(), script, submoduleRoot, scriptPresent: existsSync(script) };
}

/** Locate `structure_router.py` — CODE at the repo root. The corpus STRUCTURE-plane parse
 *  router: `parse(kind, bytes) -> tree` → the astpalace encoder → a structure chroma-palace
 *  (corpus.md #the-caps). A batch sidecar (not a serve holder), invoked once per corpus ingest. */
export function resolveStructureRouterIo(): string {
  return join(repoRoot, "packages", "lararium-mempalace", "scripts", "structure_router.py");
}

/** What the corpus ingest needs to run the structure router: the venv-aware python, the
 *  helper script, and the submoduleRoot (PYTHONPATH so the router's `import astpalace_io` /
 *  `import mempalace` resolve). Mirrors {@link resolveAstPalaceSpawn}. */
export interface StructureRouterSpawn {
  readonly python: string | null;
  readonly script: string;
  readonly submoduleRoot: string;
  readonly scriptPresent: boolean;
}

/** Resolve everything the structure router needs (mirrors {@link resolveAstPalaceSpawn}). */
export function resolveStructureRouterSpawn(): StructureRouterSpawn {
  const submoduleRoot = join(repoRoot, "mempalace");
  const script = resolveStructureRouterIo();
  return { python: resolveMempalacePython(), script, submoduleRoot, scriptPresent: existsSync(script) };
}

/** Locate `bands_sidecar.py` — CODE at the repo root. The corpus BANDS-plane multi-scale FFZ:
 *  a corpus's cohesion signal → MODWT-MRA spine + EWT/ssqueezepy servo + ecp/ruptures divisive
 *  tree + resampling-consensus gate → adaptive lar_ffz cells (corpus.md #the-bands). A batch
 *  sidecar (not a serve holder), invoked once per corpus ingest, after the content+structure mine. */
export function resolveBandsSidecarIo(): string {
  return join(repoRoot, "packages", "lararium-mempalace", "scripts", "bands_sidecar.py");
}

/** What the corpus ingest needs to run the bands sidecar: the venv-aware python, the helper
 *  script, and the submoduleRoot (PYTHONPATH so `analyze`'s `import mempalace` chroma readback
 *  resolves; `decompose` needs neither). Mirrors {@link StructureRouterSpawn}. */
export interface BandsSidecarSpawn {
  readonly python: string | null;
  readonly script: string;
  readonly submoduleRoot: string;
  readonly scriptPresent: boolean;
}

/** Resolve everything the bands sidecar needs (mirrors {@link resolveStructureRouterSpawn}). */
export function resolveBandsSidecarSpawn(): BandsSidecarSpawn {
  const submoduleRoot = join(repoRoot, "mempalace");
  const script = resolveBandsSidecarIo();
  return { python: resolveMempalacePython(), script, submoduleRoot, scriptPresent: existsSync(script) };
}

/** Locate `form_induction.py` — CODE at the repo root. The corpus FORM-plane BLIND grammar
 *  induction (S3): the accumulated STRUCTURE forest → TreeMiner + PrefixSpan/BIDE + ΔP →
 *  MDL-selected constructicon, keyed by structural hash (corpus.md #the-form-induction). An
 *  offline BATCH sidecar (not a serve holder), invoked once per corpus ingest, after structure. */
export function resolveFormInductionIo(): string {
  return join(repoRoot, "packages", "lararium-mempalace", "scripts", "form_induction.py");
}

/** What the corpus ingest needs to run the form-induction sidecar: the venv-aware python, the
 *  helper script, and the submoduleRoot (PYTHONPATH so `induce`'s chroma readback `import
 *  mempalace` resolves; the pure miners need neither). Mirrors {@link BandsSidecarSpawn}. */
export interface FormInductionSpawn {
  readonly python: string | null;
  readonly script: string;
  readonly submoduleRoot: string;
  readonly scriptPresent: boolean;
}

/** Resolve everything the form-induction sidecar needs (mirrors {@link resolveBandsSidecarSpawn}). */
export function resolveFormInductionSpawn(): FormInductionSpawn {
  const submoduleRoot = join(repoRoot, "mempalace");
  const script = resolveFormInductionIo();
  return { python: resolveMempalacePython(), script, submoduleRoot, scriptPresent: existsSync(script) };
}
