/**
 * vessel-paths — the ONE resolver for the operator's runtime vessel state, consolidated onto the
 * XDG Base Directory layout (freedesktop.org). Persistent bytes, ephemeral scratch, transient runtime,
 * durable state, and config each land in their proper XDG home instead of one `~/.lares` monolith:
 *
 *   $XDG_DATA_HOME/lares    (~/.local/share/lares)  — persistent stores: the `memory` SENSORIUM
 *                                                     (content/structure/form) + the vessel substrate.
 *   $XDG_STATE_HOME/lares   (~/.local/state/lares)  — watermarks: harvest + harvest-stage + projection.
 *   $XDG_CACHE_HOME/lares   (~/.cache/lares)        — ephemeral scratch: corpus sensoriums (swept).
 *   $XDG_CONFIG_HOME/lares  (~/.config/lares)       — config.json.
 *   $XDG_RUNTIME_DIR/lares  (tmpfs, or os.tmpdir()) — transient spool (+ future sockets/locks/pids).
 *
 * The SENSORIUM consolidation (SHEAF-TRUE): content ← the verbatim mempalace, structure ← the
 * astpalace, form ← the formpalace, co-located under `<data>/sensoriums/memory/{content,structure,form}`
 * so the filetree IS the composition (sensorium.ts). bands + coupling are BASE caps — they live in the
 * manifest, never as dirs.
 *
 * THE STRANGLER (backward-compat for ONE migration cycle): every relocated resolver reads OLD-else-NEW
 * — probe the new XDG dir; when it materializes, use it; else fall back to the legacy `~/.lares` /
 * `~/.mempalace` spelling when THAT exists; on a truly-fresh vessel default to the new canonical dir.
 * A live box (legacy dirs present) therefore sees NO disruption until the operator migrates. The
 * env seams (`LAR_ROOT`, `MEMPALACE_PALACE_PATH`) are preserved and win over both.
 *
 * `LAR_ROOT` overrides the home root for ISOLATED instances (the test harness / staged pairs): each
 * pair gets its own tree with the XDG facets laid out beneath it (`<root>/data`, `<root>/state`, …),
 * so isolation holds and the UDS socket path always agrees. Both the CLI (local-connector) and the
 * node daemon (uds-channel) resolve through HERE.
 *
 * The mesh federation store consolidates too — as its OWN `mesh` SENSORIUM that `#has` three nested
 * child sensoriums (WHO · AUTHORITY · FLOW). {@link meshSensoriumDir} strangles `<data>/sensoriums/mesh`
 * (new) over the legacy `~/.lares/.meshpalace` (old), and the children hang below it. The mesh's own
 * caps stay minimal — its STRUCTURE is the three children, each carrying its own thin manifest.
 *
 * EXCLUDED from the move (deliberately): `larIdentityDir` (vessel-identity — a separate concern, left
 * at its legacy spelling).
 */

import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

// The XDG data-home + the OLD-else-NEW strangler + the mempalace content parent live in ONE cycle-free
// home — `@lararium/mempalace/xdg-base` — so vessel-paths and mempalace's palace-path derive the store
// parent from the SAME source (no value-duplication). Imported across the existing node → mempalace edge.
import { larDataHome, strangle, mempalaceContentParent } from "@lararium/mempalace/xdg-base";

// Re-export the data home so the historical `@lararium/node` surface (`larDataHome`) stays stable.
export { larDataHome };

// ── XDG base homes ──────────────────────────────────────────────────────────────────────────────
// Each honors its env var (unset → the freedesktop default), and roots under LAR_ROOT when isolated.

/** $XDG_STATE_HOME/lares — durable watermarks (harvest, harvest-stage, projection). */
export function larStateHome(): string {
  const root = process.env["LAR_ROOT"];
  return root ? join(root, "state")
              : join(process.env["XDG_STATE_HOME"]?.trim() || join(homedir(), ".local", "state"), "lares");
}

/** $XDG_CACHE_HOME/lares — ephemeral scratch (corpus sensoriums), safe to sweep. */
export function larCacheHome(): string {
  const root = process.env["LAR_ROOT"];
  return root ? join(root, "cache")
              : join(process.env["XDG_CACHE_HOME"]?.trim() || join(homedir(), ".cache"), "lares");
}

/** $XDG_CONFIG_HOME/lares — config.json. */
export function larConfigHome(): string {
  const root = process.env["LAR_ROOT"];
  return root ? join(root, "config")
              : join(process.env["XDG_CONFIG_HOME"]?.trim() || join(homedir(), ".config"), "lares");
}

/** $XDG_RUNTIME_DIR/lares (tmpfs) — transient spool + future sockets/locks/pids. Isolated → under root. */
export function larRuntimeHome(): string {
  const root = process.env["LAR_ROOT"];
  if (root) return join(root, "run");
  return join(process.env["XDG_RUNTIME_DIR"]?.trim() || tmpdir(), "lares");
}

/** The vessel config file — `$XDG_CONFIG_HOME/lares/config.json`. */
export function larConfigPath(): string {
  return join(larConfigHome(), "config.json");
}

// ── The legacy vessel home (isolation base + still-legacy organs) ─────────────────────────────────

/** The legacy vessel home — `LAR_ROOT` (isolated instance) or `~/.lares`. Still hosts the not-yet-
 *  moved organs (identity, meshpalace) and every strangler's legacy fallback. */
export function larHome(): string {
  return process.env["LAR_ROOT"] ?? join(homedir(), ".lares");
}

// ── The `memory` sensorium (content · structure · form) ──────────────────────────────────────────

/** The `memory` sensorium dir — `<data>/sensoriums/memory`. Its manifest declares content/structure/
 *  form (fiber caps, leaf-dirs below) + bands/coupling (base caps, manifest-only). */
export function memorySensoriumDir(): string {
  return join(larDataHome(), "sensoriums", "memory");
}

/** The VERBATIM mempalace store dir (the `content` fiber cap) — `MEMPALACE_PALACE_PATH` (override,
 *  the relocation lever) else the strangler over `<memory>/content` (new) / `~/.mempalace` (legacy).
 *  This is the PARENT store (config.json + the `palace/` chroma dir + entities + locks + the
 *  worldline-KG knowledge_graph.sqlite3 that lives INSIDE it). The vendored mempalace subtree is
 *  never touched — the env lever relocates it; palace-path.ts derives the chroma from the SAME base. */
export function larMempalaceDir(): string {
  const env = process.env["MEMPALACE_PALACE_PATH"]?.trim();
  if (env) return env;
  // The pure XDG-derived parent (== `<memory>/content` new / `~/.mempalace` legacy) — the SAME source
  // mempalace's palace-path.ts derives its chroma dir from, so the two views stay byte-identical.
  return mempalaceContentParent();
}

/** The astpalace store dir (the `structure` fiber cap) — the strangler over `<memory>/structure`
 *  (new) / `~/.lares/.astpalace` (legacy). A 2nd mempalace instance holding the per-turn parse-tree
 *  AST keyed by structural hash. */
export function larAstPalaceDir(): string {
  return strangle(join(memorySensoriumDir(), "structure"), join(larHome(), ".astpalace"));
}

/** The formpalace store dir (the `form` fiber cap) — the strangler over `<memory>/form` (new) /
 *  `~/.lares/.formpalace` (legacy). A mempalace instance holding the per-turn living-grammar FORM
 *  vector, keyed by verbatim_sha (the cross-graph join to the content drawer). */
export function larFormPalaceDir(): string {
  return strangle(join(memorySensoriumDir(), "form"), join(larHome(), ".formpalace"));
}

// ── The `mesh` sensorium (WHO · AUTHORITY · FLOW) ─────────────────────────────────────────────────

/** The `mesh` sensorium dir — the strangler over `<data>/sensoriums/mesh` (new) / `~/.lares/.meshpalace`
 *  (legacy). Its manifest declares MINIMAL own caps + three nested children (who/authority/flow) as
 *  dumb `coupling.children[]` edges; the filetree IS the composition (sensorium.ts). The cross-Lararium
 *  federation feed/carriage lives elsewhere in the mesh domain — this is directory + structure only. */
export function meshSensoriumDir(): string {
  return strangle(join(larDataHome(), "sensoriums", "mesh"), join(larHome(), ".meshpalace"));
}

/** The WHO child-sensorium dir — `<mesh>/who`. Identity/presence: content (presence-embeddings) +
 *  structure (the presence-graph) fill here; the parallel populates the caps, the dir stays thin. */
export function meshWhoDir(): string {
  return join(meshSensoriumDir(), "who");
}

/** The AUTHORITY child-sensorium dir — `<mesh>/authority`. Caps/keyhive: the cap-grant store fills
 *  here; the parallel declares the content cap + engine, the dir stays thin. */
export function meshAuthorityDir(): string {
  return join(meshSensoriumDir(), "authority");
}

/** The FLOW child-sensorium dir — `<mesh>/flow`. Traffic/coupling, the coupling-lobe: its manifest
 *  RESERVES `coupling.children[]` for the node-stream edges the parallel's transfer-entropy read
 *  consults (effective-connectivity). We reserve the slot; the read lives elsewhere. */
export function meshFlowDir(): string {
  return join(meshSensoriumDir(), "flow");
}

/** The mesh-palace STORE dir — now the `mesh` SENSORIUM dir (== {@link meshSensoriumDir}). Kept as a
 *  named alias for surface stability (the palace-organ registry + the index re-export read it). */
export function larMeshPalaceDir(): string {
  return meshSensoriumDir();
}

// ── The ephemeral corpus multipalace (scratch sensoriums) ─────────────────────────────────────────

/** The scratch-sensorium root — the strangler over `<cache>/scratch/sensoriums` (new) /
 *  `~/.lares/.corpus` (legacy). Each `lares corpus` run mints a dissolvable child instance below it
 *  (ephemeral, sweepable; palace-teardown reaps every child). */
export function larCorpusDir(): string {
  return strangle(join(larCacheHome(), "scratch", "sensoriums"), join(larHome(), ".corpus"));
}

/** The scratch instance dir for one ephemeral corpus-sensorium, by its id, under {@link larCorpusDir}. */
export function corpusInstanceDir(id: string): string {
  return join(larCorpusDir(), id);
}

// ── The vessel substrate (Automerge Repo — NOT a sensorium) ──────────────────────────────────────

/** Storage dir — the Automerge Repo, vessel key, and UDS socket. The strangler over `<data>/vessel`
 *  (new) / `~/.lares/.lararium` (legacy). WIPED by `reset`. NOT a sensorium (it carries no sensory
 *  fiber caps) — kept distinct under `<data>/vessel`. */
export function larDataDir(): string {
  return strangle(join(larDataHome(), "vessel"), join(larHome(), ".lararium"));
}

/** Vessel identity dir — the keypair, PRESERVED across `reset`. EXCLUDED from the XDG move
 *  (vessel-identity is a separate concern); kept at its legacy spelling `~/.lares/.lararium-identity`. */
export function larIdentityDir(): string {
  return join(larHome(), ".lararium-identity");
}

// ── Durable watermarks (state) ────────────────────────────────────────────────────────────────────

/** Disk-projection state dir (the synced-tree watermark) — strangler `<state>/projection` (new) /
 *  `~/.lares/.lararium-projection` (legacy). */
export function larProjectionDir(): string {
  return strangle(join(larStateHome(), "projection"), join(larHome(), ".lararium-projection"));
}

/** Harvest watermark (lar_hv idempotency state) — strangler `<state>/harvest` (new) /
 *  `~/.lares/harvest` (legacy). */
export function larHarvestDir(): string {
  return strangle(join(larStateHome(), "harvest"), join(larHome(), "harvest"));
}

/** Harvest stage (normalized transcript copies) — strangler `<state>/harvest-stage` (new) /
 *  `~/.lares/harvest-stage` (legacy). */
export function larHarvestStageDir(): string {
  return strangle(join(larStateHome(), "harvest-stage"), join(larHome(), "harvest-stage"));
}

// NOTE: genesis/ (the baked island.bin seed + social-bootstrap.json) stays CORPUS-relative
// (larRoot / the repo), NOT here — it is tracked seed, not runtime state. See env.ts larBootstrapPath.

// ── Transient runtime (tmpfs) ────────────────────────────────────────────────────────────────────

/** TRANSIENT runtime dir (tmpfs) for write-then-delete spool — `$XDG_RUNTIME_DIR/lares` (tmpfs) or
 *  os.tmpdir() fallback, isolated under `<root>/run` for staged pairs. The capture nalu's flush
 *  BATCHES live here; they never need to survive a reboot (the WAL on disk — larDataDir/capture-nalu
 *  — is the durable layer), so keeping them off persistent disk removes SSD write-churn + fsync cost. */
export function larRuntimeDir(): string {
  return larRuntimeHome();
}
