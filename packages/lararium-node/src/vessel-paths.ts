/**
 * vessel-paths — the ONE resolver for the operator's runtime vessel state, consolidated onto the
 * XDG Base Directory layout (freedesktop.org). Persistent bytes, ephemeral scratch, transient runtime,
 * durable state, and config each land in their proper XDG home instead of one `~/.lares` monolith:
 *
 *   $XDG_DATA_HOME/lares    (~/.local/share/lares)  — persistent stores: the `memory` SENSORIUM
 *                                                     (content/structure/form) + the vessel substrate.
 *   $XDG_STATE_HOME/lares   (~/.local/state/lares)  — watermarks: harvest + harvest-stage + projection.
 *   $XDG_CACHE_HOME/lares   (~/.cache/lares)        — ephemeral scratch: sensoriums (swept).
 *   $XDG_CONFIG_HOME/lares  (~/.config/lares)       — config.json.
 *   $XDG_RUNTIME_DIR/lares  (tmpfs, or os.tmpdir()) — transient spool (+ future sockets/locks/pids).
 *
 * The SENSORIUM consolidation (SHEAF-TRUE): content ← the contentpalace, structure ← the structurepalace,
 * form ← the formpalace, ALL THREE co-located under `<data>/sensoriums/memory/{content,structure,form}`
 * so the filetree IS the composition (sensorium.ts). The lararium OWNS its content plane: the sovereign
 * contentpalace inherits mempalace's exact base schema, holds content internally under the XDG data dir,
 * and adopting a user's mempalace history runs as a deliberate one-way import Act (`guest-import.ts`),
 * never a runtime binding. bands + coupling are BASE caps — they live in the manifest, never as dirs.
 *
 * The mesh federation store lives as its OWN `mesh` SENSORIUM that `#has` three nested child sensoriums
 * (WHO · AUTHORITY · FLOW) under `<data>/sensoriums/mesh`, the children hanging below it. The mesh's own
 * caps stay minimal — its STRUCTURE is the three children, each carrying its own thin manifest.
 *
 * Every resolver answers the canonical XDG dir deterministically — one canonical home, no `~/.lares`
 * fallback arm. The env shores
 * (`LAR_ROOT`, `MEMPALACE_PALACE_PATH`) are preserved and win.
 *
 * `LAR_ROOT` overrides the home root for ISOLATED instances (the test harness / staged pairs): each
 * pair gets its own tree with the XDG facets laid out beneath it (`<root>/data`, `<root>/state`, …),
 * so isolation holds and the UDS socket path always agrees. Both the CLI (local-connector) and the
 * node daemon (uds-channel) resolve through HERE.
 *
 * `larIdentityDir` (the sovereign root — a separate concern) resolves under the XDG state
 *  home (`<state>/identity`), beside — never inside — the wiped substrate store.
 */

import { existsSync, readdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

// The XDG data-home + the mempalace content parent live in ONE cycle-free
// home — `@lararium/mempalace/xdg-base` — so vessel-paths and mempalace's palace-path derive the store
// parent from the SAME source (no value-duplication). Imported across the existing node → mempalace edge.
import { larDataHome, mempalaceContentParent } from "@lararium/mempalace/xdg-base";

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

/** $XDG_CACHE_HOME/lares — ephemeral scratch (sensoriums), safe to sweep. */
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

/**
 * The ONE mempalace executable resolver (DRY) — prefer the user-installed CLI at `~/.local/bin`
 * (`mempalace.exe` on win32), fall back to the bare name on PATH. Both the palace-organ setup and the
 * sensorium-ingest leg resolve the exe through HERE so the win32 spelling + the local-bin preference never
 * fork across call sites.
 */
export function resolveMempalaceExe(): string {
  const exe = process.platform === "win32" ? "mempalace.exe" : "mempalace";
  const local = join(homedir(), ".local", "bin", exe);
  return existsSync(local) ? local : exe;
}

// ── The `~/.lares` vessel home (isolation base + vessel-identity) ─────────────────────────────────

/** The `~/.lares` vessel home — `LAR_ROOT` (isolated instance) or `~/.lares`. Hosts vessel-identity
 *  (a separate concern, kept at its `~/.lares` spelling). */
export function larHome(): string {
  return process.env["LAR_ROOT"] ?? join(homedir(), ".lares");
}

// ── The `memory` sensorium (content · structure · form) ──────────────────────────────────────────

/** The `memory` sensorium dir — `<data>/sensoriums/memory`. Its manifest declares content/structure/
 *  form/persistence (fiber caps, leaf-dirs below) + bands/coupling (base caps, manifest-only). */
export function memorySensoriumDir(): string {
  return join(larDataHome(), "sensoriums", "memory");
}

/**
 * THE LENS MAP — the memory sensorium's planes, keyed by the name the VERBS take as a parameter.
 *
 * `lares-query` exposes FOUR universal verbs (search · relate · structure · status) and takes the palace
 * as a LENS, so the surface stays four verbs wide however many planes stand. A verb multiplied per plane
 * (`recall_structure`, `recall_form`, …) grows as 4 caps x N palaces and buys nothing the parameter does
 * not already carry.
 *
 * `persistence` rides here as an ordinary lens, which names what it holds: the plane where a ki finding
 * earns standing through witness, and fades without it. Its store answers the same four verbs as any
 * other palace, because a palace IS its composed caps.
 *
 * Feed this straight to {@link makeLaresQuery}; it is the whole binding.
 */
export function memorySensoriumLenses(): Record<string, string> {
  const root = memorySensoriumDir();
  return {
    content: join(root, "content"),
    structure: join(root, "structure"),
    form: join(root, "form"),
    persistence: join(root, "persistence"),
  };
}

/** Resolve a sensorium NAME to its root dir — `<data>/sensoriums/<name>` (the manifest lives beneath it).
 *  The one place a `lares sense <sensorium> <verb>` address turns a name into a target root; `memory`
 *  resolves to {@link memorySensoriumDir} by construction (same join), so the default stays identical. */
export function sensoriumDir(name: string): string {
  return join(larDataHome(), "sensoriums", name);
}

/** Every sensorium standing under `<data>/sensoriums` — the ones a lens may name. */
export function sensoriumNames(): string[] {
  const root = join(larDataHome(), "sensoriums");
  try {
    return readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

/**
 * THE LENS MAP, over EVERY sensorium — keyed `<sensorium>/<plane>`.
 *
 * The palace rides as a PARAMETER, and a sensorium is just a wider palace: three of them stand here
 * (`memory` holds the journey, `memetic-wikitext` holds the canon, `mesh` holds the federation), each with
 * the same plane family. A lens map naming only one of them hands the verbs a door into one room and calls
 * it the house — the canon a caller asks for sits in a sensorium the map never mentioned, and the search
 * answers confidently from the wrong one.
 *
 * So the lens carries BOTH coordinates. The verb surface stays four wide; the address does the widening.
 * A bare plane name (`content`) still resolves against `memory`, which keeps the common read short.
 */
export function sensoriumLenses(): Record<string, string> {
  const root = join(larDataHome(), "sensoriums");
  const out: Record<string, string> = {};

  // DISCOVER the palaces; never declare them. A sensorium `#has` EITHER planes OR child sensoriums —
  // `memetic-wikitext` holds formal/informal, `mesh` holds who/authority/flow, and each child carries its
  // own plane family. A map that enumerated a fixed plane list one level down would address `memory` and
  // silently miss every canon plane two levels below it, then answer a canon query confidently from the
  // journey. So the walk asks the FILETREE what stands, and a dir holding a chroma store IS a palace —
  // the composition on disk names itself.
  const walk = (dir: string, key: string, depth: number): void => {
    if (depth > 4) return;
    if (existsSync(join(dir, "chroma.sqlite3"))) {
      out[key] = dir;
      return;                                   // a palace is a leaf; nothing composes below it
    }
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith(".")) {
        walk(join(dir, e.name), key ? `${key}/${e.name}` : e.name, depth + 1);
      }
    }
  };
  walk(root, "", 0);

  // The short form: a bare plane name reads the `memory` sensorium — the journey, and the common case.
  for (const [k, v] of Object.entries(memorySensoriumLenses())) {
    if (existsSync(join(v, "chroma.sqlite3"))) out[k] = v;
  }
  return out;
}

/** The GUEST mempalace store dir — `MEMPALACE_PALACE_PATH` (override, the relocation lever) else the
 *  upstream-default `~/.mempalace`. NOT a cap of the memory sensorium: the lararium owns its content
 *  plane internally at {@link larContentDir}, so this store stays a comparator, never the `content`
 *  fiber. This store is a GUEST — raised deliberately (`lares mempalace setup`), read
 *  as a comparator, imported FROM (`guest-import.ts`); never bound into at runtime, and never written
 *  by the boot (the S5 comparator ruling). This is the PARENT store (config.json + the `palace/` chroma
 *  dir + entities + locks + the worldline-KG knowledge_graph.sqlite3 that lives INSIDE it). The vendored
 *  mempalace subtree is never touched — the env lever relocates it; palace-path.ts derives the chroma
 *  from the SAME base. */
export function larMempalaceDir(): string {
  const env = process.env["MEMPALACE_PALACE_PATH"]?.trim();
  if (env) return env;
  // The upstream-default parent (`~/.mempalace`) — the SAME source mempalace's palace-path.ts derives
  // its chroma dir from, so the vessel view and the palace view stay byte-identical.
  return mempalaceContentParent();
}

/** The structurepalace store dir (the `structure` fiber cap) — `<memory>/structure`, inside the consolidated
 *  sensorium tree. A 2nd mempalace instance holding the per-turn parse-tree AST keyed by structural hash. */
export function larStructurePalaceDir(): string {
  return join(memorySensoriumDir(), "structure");
}

/** The formpalace store dir (the `form` fiber cap) — `<memory>/form`, inside the consolidated sensorium
 *  tree. A mempalace instance holding the per-turn living-grammar FORM vector, keyed by verbatim_sha
 *  (the cross-graph join to the content drawer). */
export function larFormPalaceDir(): string {
  return join(memorySensoriumDir(), "form");
}

/** The persistencepalace store dir (the `has.persistence` cosheaf cap — the 5th part) — `<memory>/persistence`,
 *  inside the consolidated sensorium tree. A caller-vector mempalace instance holding Testimony atoms +
 *  their witness-logs (standing derived by the keel). The `memory` sensorium composes it in authority mode. */
export function larPersistencePalaceDir(): string {
  return join(memorySensoriumDir(), "persistence");
}

/** The lararium-OWNED content store dir (the `content` fiber cap) — `<memory>/content`, inside the
 *  sensorium tree. The lararium owns its content plane rather than binding it to the guest
 *  `~/.mempalace`; adopting an existing user mempalace history runs as a deliberate import Act, never
 *  a runtime binding. Held by the content-palace (caller-vector, embed upstream / commit here). */
export function larContentDir(): string {
  return join(memorySensoriumDir(), "content");
}

// ── The `mesh` sensorium (WHO · AUTHORITY · FLOW) ─────────────────────────────────────────────────

/** The `mesh` sensorium dir — `<data>/sensoriums/mesh`. Its manifest declares MINIMAL own caps + three
 *  nested children (who/authority/flow) as dumb `coupling.children[]` edges; the filetree IS the
 *  composition (sensorium.ts). The cross-Lararium federation feed/carriage lives elsewhere in the mesh
 *  domain — this is directory + structure only. */
export function meshSensoriumDir(): string {
  return join(larDataHome(), "sensoriums", "mesh");
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

// ── The `memetic-wikitext` sensorium (FORMAL ⋈ INFORMAL peers, neither top) ───────────────────────

/** The `memetic-wikitext` sensorium dir — `<data>/sensoriums/memetic-wikitext`. A nameless nested
 *  entity that `#has` NO fiber cap and TWO PEER child-sensoria (formal ⋈ informal) as dumb
 *  `coupling.children[]` edges, NEITHER on top; the coupling plane reads the directed formal↔informal
 *  flow (memetic-wikitext-sensorium.ts). The filetree IS the composition (sensorium.ts). */
export function memeticWikitextSensoriumDir(): string {
  return join(larDataHome(), "sensoriums", "memetic-wikitext");
}

/** The FORMAL peer-sensorium dir — `<memetic-wikitext>/formal`. The memes-on-disk corpus (grammar/
 *  liturgy): a thin content-cap sensorium the parallel fills; the dir nests below the top so the tree
 *  relocates as one and teardown reaps it. */
export function memeticWikitextFormalDir(): string {
  return join(memeticWikitextSensoriumDir(), "formal");
}

/** The INFORMAL peer-sensorium dir — `<memetic-wikitext>/informal`. The chat-sessions corpus (pidgin):
 *  a thin content-cap sensorium the parallel fills; nested below the top with the formal peer. */
export function memeticWikitextInformalDir(): string {
  return join(memeticWikitextSensoriumDir(), "informal");
}

// ── The ephemeral sensorium multipalace (scratch sensoriums) ─────────────────────────────────────────

/** The scratch-sensorium root — `<cache>/scratch/sensoriums`. Each `lares sensorium` run mints a
 *  dissolvable child instance below it (ephemeral, sweepable; palace-teardown reaps every child). */
export function scratchSensoriumDir(): string {
  return join(larCacheHome(), "scratch", "sensoriums");
}

/** The scratch instance dir for one ephemeral sensorium, by its id, under {@link scratchSensoriumDir}. */
export function scratchSensoriumInstanceDir(id: string): string {
  return join(scratchSensoriumDir(), id);
}

// ── The vessel substrate (Automerge Repo — NOT a sensorium) ──────────────────────────────────────

/** Storage dir — the Automerge Repo, vessel key, and UDS socket, at `<data>/vessel`.
 *  WIPED by `reset`. NOT a sensorium (it carries no sensory fiber caps). */
export function larDataDir(): string {
  return join(larDataHome(), "vessel");
}

/** Vessel identity dir — the sovereign keypair + the veiled-Handle anchors, at
 *  `<state>/identity`. Sits in the XDG state home BESIDE (never inside) the wiped
 *  `<data>/vessel`, so every substrate verb (`reset`/`regenesis`/`rebuild`) reforges the
 *  CRDT store while the sovereign root survives untouched — the "share substrate, not
 *  sovereignty" law made a filesystem boundary. `reset` removes only `<state>/projection`
 *  under this same state home, so identity here stays out of the wipe zone. The ONE
 *  identity resolver — node-vessel-identity resolves any prior location onto it. */
export function larIdentityDir(): string {
  return join(larStateHome(), "identity");
}

// ── Durable watermarks (state) ────────────────────────────────────────────────────────────────────

/** Disk-projection state dir (the synced-tree watermark) — `<state>/projection`. */
export function larProjectionDir(): string {
  return join(larStateHome(), "projection");
}

/** Harvest watermark (lar_hv idempotency state) — `<state>/harvest`. */
export function larHarvestDir(): string {
  return join(larStateHome(), "harvest");
}

/** Harvest stage (normalized transcript copies) — `<state>/harvest-stage`. */
export function larHarvestStageDir(): string {
  return join(larStateHome(), "harvest-stage");
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
