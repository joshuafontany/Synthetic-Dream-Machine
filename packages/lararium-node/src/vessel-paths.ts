/**
 * vessel-paths — the ONE resolver for the operator's runtime vessel state, rooted in the home.
 *
 * The corpus + code live in the repo (versioned); the vessel's RUNTIME STATE — storage · identity ·
 * projection · genesis · harvest · the UDS socket — lives in the operator's HOME (~/.lares). This is
 * the @daemon ontology made filesystem: the bound-operator's vessel-only worker belongs to the
 * operator, not to a checkout.
 *
 * `LAR_ROOT` overrides the home root for ISOLATED instances (the test harness / staged pairs): each
 * pair gets its own tree, the subdir layout unchanged. Both the CLI (local-connector) and the node
 * daemon (uds-channel) resolve through HERE, so the UDS socket path always agrees.
 *
 * The `.lararium*` subdir NAMES are kept (only the root moved from <repo> → ~/.lares), so every
 * existing derivation holds: identity = `dirname(dataDir)/.lararium-identity`, the reset wipe-zone,
 * the watch filter. Reset wipes `larDataDir` (.lararium); `larIdentityDir` is a sibling, preserved.
 */

import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

/** The vessel home — `LAR_ROOT` (isolated instance) or `~/.lares` (the operator default). */
export function larHome(): string {
  return process.env["LAR_ROOT"] ?? join(homedir(), ".lares");
}

/** The VERBATIM mempalace store dir — `MEMPALACE_PALACE_PATH` (override) or `~/.mempalace`. This is
 *  the PARENT store (chroma + config.json + entities + locks + the worldline-KG knowledge_graph.sqlite3
 *  that lives INSIDE it), the whole organ the teardown removes. NOTE it roots in the true homedir
 *  (or the env override), NOT larHome — the verbatim palace predates the ~/.lares vessel root and the
 *  vendored mempalace owns its own default. Use `MEMPALACE_PALACE_PATH` to isolate it for a test. */
export function larMempalaceDir(): string {
  return process.env["MEMPALACE_PALACE_PATH"]?.trim() || join(homedir(), ".mempalace");
}

/** The `.meshpalace` STORE dir — a mempalace instance fed by the @meshpalace Automerge doc (the
 *  cross-Lararium federation bridge). Sits at `~/.lares/.meshpalace`, PARALLEL to `.astpalace` +
 *  `.formpalace`. THIS resolver names the store dir ONLY — the @meshpalace feed/federation/carriage
 *  logic is a separate (mesh-domain) concern and lives elsewhere; here we only stand the directory. */
export function larMeshPalaceDir(): string {
  return join(larHome(), ".meshpalace");
}

/** The `.corpus` root — the ephemeral astral MULTIPALACE: each `lares corpus` run/open mints a SCRATCH
 *  mempalace instance under `~/.lares/.corpus/<corpus-id>/` (a 4th palace shape, same machinery,
 *  sweepable). Sits beside the durable palaces; every child is dissolvable + reapable so an interrupted
 *  run can never leak state (palace-teardown enumerates `.corpus/*`). */
export function larCorpusDir(): string {
  return join(larHome(), ".corpus");
}

/** The scratch instance dir for one ephemeral corpus-palace, by its id, under {@link larCorpusDir}. */
export function corpusInstanceDir(id: string): string {
  return join(larCorpusDir(), id);
}

/** Storage dir — the Automerge Repo, vessel key, and UDS socket. WIPED by `reset`. */
export function larDataDir(): string {
  return join(larHome(), ".lararium");
}

/** The `.astpalace` AST-store palace dir — a SECOND mempalace instance (same ChromaDB engine,
 *  separate palace) holding the per-turn parse-tree AST keyed by structural hash. Sits at
 *  `~/.lares/.astpalace`, PARALLEL to the verbatim palace (`~/.mempalace`) and `.meshpalace`,
 *  beside the wipe-zone rather than inside it (the recurrence tally is durable bridge state). */
export function larAstPalaceDir(): string {
  return join(larHome(), ".astpalace");
}

/** The `.formpalace` FORM-store palace dir — a mempalace instance holding the per-turn living-grammar
 *  FORM vector (the two-planes form-capture, encoded) in its "form" collection, keyed by verbatim_sha
 *  (the cross-graph join to the verbatim content drawer). Sits at `~/.lares/.formpalace`, PARALLEL to
 *  `.astpalace` + the verbatim palace; durable bridge state, beside the wipe-zone, never federates. */
export function larFormPalaceDir(): string {
  return join(larHome(), ".formpalace");
}

/** Vessel identity dir — the keypair, PRESERVED across `reset` (sibling of the wipe-zone). */
export function larIdentityDir(): string {
  return join(larHome(), ".lararium-identity");
}

/** Disk-projection state dir (the synced-tree watermark). */
export function larProjectionDir(): string {
  return join(larHome(), ".lararium-projection");
}

// NOTE: genesis/ (the baked island.bin seed + social-bootstrap.json) stays CORPUS-relative
// (larRoot / the repo), NOT here — it is tracked seed, not runtime state. See env.ts larBootstrapPath.

/** Harvest watermark (lar_hv idempotency state). */
export function larHarvestDir(): string {
  return join(larHome(), "harvest");
}

/** Harvest stage (normalized transcript copies). */
export function larHarvestStageDir(): string {
  return join(larHome(), "harvest-stage");
}

/** TRANSIENT runtime dir (tmpfs) for write-then-delete spool — `XDG_RUNTIME_DIR` (tmpfs, e.g.
 *  /run/user/<uid>) or os.tmpdir() fallback. The capture nalu's flush BATCHES live here: they
 *  never need to survive a reboot (the WAL on disk — larDataDir/capture-nalu — is the durable
 *  layer), so keeping them off persistent disk removes SSD write-churn + fsync cost. */
export function larRuntimeDir(): string {
  return join(process.env["XDG_RUNTIME_DIR"]?.trim() || tmpdir(), "lares");
}
