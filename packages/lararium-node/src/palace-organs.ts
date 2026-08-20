/**
 * palace-organs — the ONE shared enumerator for the local palace organs (the durable stores the
 * operator's vessel stands), so setup (`lares vessel stand --init`) and teardown (`lares palace-teardown`)
 * read the SAME list and can never drift.
 *
 * SOVEREIGN ORGANS ONLY. Every organ this registry stands lives inside the lararium's own tree. Each
 * sensorium `#has` an IN-TREE `mempalace` cap (see {@link materializeMemorySensorium}) — a CURATED
 * memory store the node writes into "from the inside" (an AI's authored memories about that stream,
 * given a structured home).
 *
 * THE IN-TREE MEMPALACE RETIRES THE BINDING, NEVER THE COEXISTENCE (operator ruling, 2026-07-29).
 * Read the scope exactly, because the two readings differ by a whole capability:
 *   · RETIRED — every DEPENDENCY on an external `~/.mempalace`. The sovereign organs bind only in-tree,
 *     so nothing silently falls back onto a guest store and the content-cap-home / never-bound /
 *     confused-deputy hazards dissolve at the root.
 *   · KEPT — the capability to ACCEPT a guest install that already stands. `~/.mempalace` holds its own
 *     sovereignty as a SEPARATE capability the House may take up; when it does, the House owns the
 *     chat → sensorium → palace lifecycle, and it never writes into the guest tree or reads the guest's
 *     config (see `@lararium/mempalace` holder-cap: the House DECLARES its policy so it inherits none).
 *
 * So {@link initGuestMempalace} and {@link guestMempalaceOrgan} STAND — they carry the accept-lane, not
 * a fallback. A subtraction aimed at "the guest lane" MUST cut the binding and leave the accept-cap
 * whole; cutting both would delete a capability the operator holds by ruling.
 *
 * The sensoriums are PEERS of a guest install, never satellites of it: `memory` · `mesh` ·
 * `memetic-wikitext` each carry a content palace, and the `memory` one does the job an upstream
 * install does.
 *
 * The memory sensorium's own planes (the astral palaces made filesystem):
 *   - contentpalace     <memory>/content    — the LARARIUM-OWNED verbatim content plane (li/sheaf).
 *   - structurepalace   <memory>/structure  — the structural-AST store (li/sheaf).
 *   - formpalace        <memory>/form       — the living-grammar FORM-vector store (li/sheaf).
 *   - persistencepalace <memory>/persistence — the Testimony/witness store (cosheaf cap).
 *   - meshpalace        <lararium>/sensoriums/mesh — the `mesh` SENSORIUM (stood LAST: it couples to a
 *                 live node). It `#has` three nested child sensoriums — WHO · AUTHORITY · FLOW —
 *                 each its own dir + thin manifest. Here we wire only the directory STRUCTURE +
 *                 stamp the manifests; the feed/carriage + cap-content live elsewhere.
 *
 * Each organ carries a resolved `dir` (never an ambient default), an optional `init` that STANDS it
 * up when absent (idempotent: a present dir is never re-init'd), and a cheap `healthProbe` that
 * answers "did the store materialize?". The ChromaDB-backed instances create their collection lazily
 * on first holder `put`, so `init` only needs to ensure the directory exists.
 *
 * Meme: lar:///ha.ka.ba/lararium/mempalace/genesis-doc
 */

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { repoRoot } from "@lararium/mesh/node";
import { atomicWriteFileSync } from "./fs-atomic.js";
import {
  larMempalaceDir, larStructurePalaceDir, larFormPalaceDir, larPersistencePalaceDir, larContentDir, larMeshPalaceDir, memorySensoriumDir,
  meshSensoriumDir, meshWhoDir, meshAuthorityDir, meshFlowDir, resolveMempalaceExe,
  memeticWikitextSensoriumDir, memeticWikitextFormalDir, memeticWikitextInformalDir,
} from "./vessel-paths.js";
import { buildSensoriumManifest, readManifest, writeManifest } from "./sensorium.js";
import type { BuildSensoriumOptions } from "./sensorium.js";
import { defaultSensoriumBands } from "./memetic-wikitext-sensorium.js";

/** One ledger line from a setup pass — {@link setupPalaceOrgans} returns these (table/JSON-renderable). */
export interface PalaceSetupStep {
  /** the organ (or sub-step) name, e.g. "mempalace" | "mempalace:auto-save-off" | "structurepalace" */
  readonly step: string;
  /** did this step DO work (true), or skip because the organ was already present (false)? */
  readonly ran: boolean;
  /** did the step (and its health probe) succeed? */
  readonly ok: boolean;
  /** a one-line human detail (what ran / why it skipped / the failure tail). */
  readonly detail: string;
}

/** A palace organ — a resolved store dir plus how to stand it up + probe it. */
export interface PalaceOrgan {
  /** stable organ name (the registry key + the ledger `step`). */
  readonly name: string;
  /** the resolved store directory — never an ambient default. */
  readonly dir: string;
  /** stand the organ up (called ONLY when {@link healthProbe} reads false). Returns extra ledger
   *  steps (the mempalace organ emits its init + the auto_save gate as two lines); may be empty. */
  readonly init?: () => PalaceSetupStep[];
  /** cheap "did the store materialize?" probe — defaults to `existsSync(dir)` at the call site. */
  readonly healthProbe?: () => boolean;
}

const PALACE_CONFIG = (): string => join(larMempalaceDir(), "config.json");

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Stand up the GUEST mempalace as a standalone sidecar: `mempalace init <repo> --yes --no-llm` when
 * no config exists (non-interactive, heuristics-only), then pin `hooks.auto_save = false` — THE
 * re-pollution gate (a fresh init defaults it true and the plugin hooks fire independent of
 * settings.json, so without this the `sessions` mega-wing returns on the first turn). Both legs
 * idempotent.
 *
 * The GUEST LANE, never the boot path. `wake --init` no longer calls this — writing `~/.mempalace`
 * from the boot contradicts the comparator ruling (`RUN-ARC.md:14`). `lares mempalace setup` calls
 * it, so the operator raises the guest DELIBERATELY: as a standalone sanity-check sidecar to compare
 * the sovereign sensorium against, or as the source of the one-way import Act (`guest-import.ts`).
 */
export function initGuestMempalace(): PalaceSetupStep[] {
  const steps: PalaceSetupStep[] = [];
  const mp = resolveMempalaceExe();
  const cfgPath = PALACE_CONFIG();

  if (!existsSync(cfgPath)) {
    try {
      const r = spawnSync(mp, ["init", repoRoot, "--yes", "--no-llm"], { timeout: 180_000, encoding: "utf8" });
      const ok = r.status === 0 && existsSync(cfgPath);
      steps.push({
        step: "mempalace",
        ran: true,
        ok,
        detail: ok
          ? `mempalace init ${repoRoot} --yes --no-llm`
          : `init failed: ${(r.stderr ?? r.error?.message ?? "").toString().trim().slice(0, 160)}`,
      });
    } catch (e) {
      steps.push({ step: "mempalace", ran: true, ok: false, detail: errText(e).slice(0, 160) });
    }
  } else {
    steps.push({ step: "mempalace", ran: false, ok: true, detail: "palace config present" });
  }

  // The auto_save off-switch — pinned each pass (read fresh, idempotent).
  try {
    const cfg = existsSync(cfgPath)
      ? (JSON.parse(readFileSync(cfgPath, "utf8")) as Record<string, unknown>)
      : {};
    const hooks = (cfg["hooks"] ?? {}) as Record<string, unknown>;
    if (hooks["auto_save"] !== false) {
      cfg["hooks"] = { ...hooks, auto_save: false };
      // Atomic (temp + rename): a crash mid-write must never tear the DURABLE palace config —
      // a torn config.json loses the auto_save re-pollution gate silently on the next boot.
      atomicWriteFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n");
      steps.push({ step: "mempalace:auto-save-off", ran: true, ok: true, detail: "hooks.auto_save=false (re-pollution gate)" });
    } else {
      steps.push({ step: "mempalace:auto-save-off", ran: false, ok: true, detail: "hooks.auto_save already false" });
    }
  } catch (e) {
    steps.push({ step: "mempalace:auto-save-off", ran: true, ok: false, detail: errText(e).slice(0, 160) });
  }

  return steps;
}

/**
 * The persistence INFRASTRUCTURE every sensorium #has — a `has.persistence` cosheaf fiber cap
 * (`<dir>/persistence`, engine "persistence") plus the authority-mode policy (halfLife null: the
 * store never cools; only a defeater lowers standing). A sensorium is a nameless entity, and durable
 * witnessed memory is infrastructure it ALL carries — content/structure/form perceive, persistence
 * remembers. Returns the cap + policy to spread into a {@link BuildSensoriumOptions}.
 */
function persistenceInfra(sensoriumDir: string): {
  cap: { persistence: { absDir: string; engine: string; variance: "cosheaf" } };
  persistencePolicy: { halfLife: number | null };
} {
  return {
    cap: { persistence: { absDir: join(sensoriumDir, "persistence"), engine: "persistence", variance: "cosheaf" } },
    persistencePolicy: { halfLife: null },
  };
}

/** The persistence-organ for a sensorium dir — stands `<dir>/persistence` (lazy chroma collection). */
function persistenceOrgan(name: string, sensoriumDir: string): PalaceOrgan {
  const dir = join(sensoriumDir, "persistence");
  return { name, dir, init: ensureDirOrgan(name, dir) };
}

/** A ChromaDB-backed instance (ast/form/mesh) — its collection is created lazily on first holder
 *  `put`, so standing it up only means ensuring the store DIRECTORY exists. */
function ensureDirOrgan(name: string, dir: string): () => PalaceSetupStep[] {
  return () => {
    try {
      mkdirSync(dir, { recursive: true });
      return [{ step: name, ran: true, ok: existsSync(dir), detail: `store dir created (${dir})` }];
    } catch (e) {
      return [{ step: name, ran: true, ok: false, detail: errText(e).slice(0, 160) }];
    }
  };
}

/**
 * The GUEST organ — `~/.mempalace` (or `$MEMPALACE_PALACE_PATH`). Enumerated SEPARATELY from
 * {@link palaceOrgans} and reached only through the guest lane (`lares mempalace …`), never from
 * `wake --init`: the sovereign vessel must not write the comparator it measures itself against.
 */
export function guestMempalaceOrgan(): PalaceOrgan {
  const dir = larMempalaceDir();
  return { name: "mempalace", dir, init: initGuestMempalace, healthProbe: () => existsSync(join(dir, "config.json")) };
}

/**
 * The palace-organ registry — the ONE list both setup and teardown enumerate. SOVEREIGN ONLY: every
 * dir here sits inside the lararium's tree (the guest `~/.mempalace` rides {@link guestMempalaceOrgan}).
 * Resolved dirs, in dependency order: the memory sensorium's li planes first, then its cosheaf cap
 * store, then meshpalace last (it couples to a live node; the directory wiring is all we do here).
 */
export function palaceOrgans(): PalaceOrgan[] {
  return [
    // The LARARIUM-OWNED content plane — the memory sensorium's verbatim ground, sovereign from the
    // guest `~/.mempalace`. Stands FIRST: recall reads it, and the other planes key against its cids.
    { name: "contentpalace", dir: larContentDir(), init: ensureDirOrgan("contentpalace", larContentDir()) },
    { name: "structurepalace",  dir: larStructurePalaceDir(),  init: ensureDirOrgan("structurepalace",  larStructurePalaceDir())  },
    { name: "formpalace", dir: larFormPalaceDir(), init: ensureDirOrgan("formpalace", larFormPalaceDir()) },
    // The `persistence` cosheaf cap store (the 5th part) — a caller-vector instance holding Testimony
    // atoms; the `memory` sensorium composes it (authority mode). Lazy collection like ast/form: init = ensure dir.
    { name: "persistencepalace", dir: larPersistencePalaceDir(), init: ensureDirOrgan("persistencepalace", larPersistencePalaceDir()) },
    // The memory sensorium's in-tree `mempalace` cap store (<memory>/mempalace) — the curated-memory
    // plane {@link materializeMemorySensorium} declares. Stood like every other plane (ensureDirOrgan:
    // mkdir; the chroma collection lands lazily on first put), the SAME way the memetic-wikitext peers
    // stand their `engine:"mempalace"` content caps. This sovereign in-tree store supersedes the retiring
    // external guest ~/.mempalace — one line here replaces the whole `initGuestMempalace` standing dance.
    { name: "mempalace", dir: join(memorySensoriumDir(), "mempalace"), init: ensureDirOrgan("mempalace", join(memorySensoriumDir(), "mempalace")) },
    // The `mesh` sensorium TREE — the parent dir plus its three nested children (who/authority/flow),
    // each enumerated so setup stands + teardown reaps them. Structure only; the parallel fills the caps.
    { name: "meshpalace",     dir: larMeshPalaceDir(),  init: ensureDirOrgan("meshpalace",     larMeshPalaceDir())  },
    { name: "mesh:who",       dir: meshWhoDir(),        init: ensureDirOrgan("mesh:who",       meshWhoDir())        },
    persistenceOrgan("mesh:who:persistence",       meshWhoDir()),
    { name: "mesh:authority", dir: meshAuthorityDir(),  init: ensureDirOrgan("mesh:authority", meshAuthorityDir())  },
    persistenceOrgan("mesh:authority:persistence", meshAuthorityDir()),
    { name: "mesh:flow",      dir: meshFlowDir(),       init: ensureDirOrgan("mesh:flow",      meshFlowDir())       },
    persistenceOrgan("mesh:flow:persistence",      meshFlowDir()),
    // The `memetic-wikitext` sensorium TREE — the top plus its two co-located PEER children (formal ⋈
    // informal), NEITHER on top. Structure only here (dirs + manifests); the peers' content stores fill
    // elsewhere. The top's coupling.children carry the peers; the coupling read runs the H¹ gate over them.
    { name: "memetic-wikitext",          dir: memeticWikitextSensoriumDir(), init: ensureDirOrgan("memetic-wikitext",          memeticWikitextSensoriumDir()) },
    { name: "memetic-wikitext:formal",   dir: memeticWikitextFormalDir(),    init: ensureDirOrgan("memetic-wikitext:formal",   memeticWikitextFormalDir())    },
    persistenceOrgan("memetic-wikitext:formal:persistence",   memeticWikitextFormalDir()),
    { name: "memetic-wikitext:informal", dir: memeticWikitextInformalDir(),  init: ensureDirOrgan("memetic-wikitext:informal", memeticWikitextInformalDir())  },
    persistenceOrgan("memetic-wikitext:informal:persistence", memeticWikitextInformalDir()),
  ];
}

/** Did this organ already materialize? (its own probe, or `existsSync(dir)`). */
export function organHealthy(organ: PalaceOrgan): boolean {
  return organ.healthProbe ? organ.healthProbe() : existsSync(organ.dir);
}

/**
 * Materialize ONE sensorium's self-describing manifest at `dir` — the SHEAF-TRUE marker that makes a
 * dir a sensorium (sensorium.ts). Idempotent + atomic: it mkdirs the dir, preserves the original mint
 * time on a rewrite (so an unchanged manifest stays byte-identical), and only (re)writes when the shape
 * actually drifted (cap dirs moved, children changed …). `opts` carries the resolved absolute dirs; the
 * builder chooses relative-when-inside / absolute-when-outside per cap. Never pass `created` — it is
 * derived from the existing manifest here.
 */
function materializeSensorium(step: string, dir: string, opts: Omit<BuildSensoriumOptions, "created">): PalaceSetupStep {
  try {
    mkdirSync(dir, { recursive: true });
    const existing = readManifest(dir);
    const desired = buildSensoriumManifest(dir, {
      ...opts,
      // Preserve the original mint time on a rewrite so an unchanged manifest is byte-identical.
      ...(existing ? { created: existing.created } : {}),
    });
    const drifted = !existing || JSON.stringify(existing) !== JSON.stringify(desired);
    if (drifted) {
      writeManifest(dir, desired);
      return { step, ran: true, ok: true, detail: `sensorium manifest written (${dir})` };
    }
    return { step, ran: false, ok: true, detail: "sensorium manifest present" };
  } catch (e) {
    return { step, ran: true, ok: false, detail: errText(e).slice(0, 160) };
  }
}

/**
 * Seed a capture-bearing sensorium only while it lacks a declaration.
 *
 * Python owns the durable capture contract: its source drivers declare ordering,
 * worldline evidence, and cap-owned metadata beside the landed content.  Node
 * still stands an absent Memory root for a fresh vessel, but it never rewrites a
 * declaration that Python has enriched.  Re-validating the present marker keeps
 * malformed state loud without creating a second manifest authority.
 */
function seedCaptureSensorium(step: string, dir: string, opts: Omit<BuildSensoriumOptions, "created">): PalaceSetupStep {
  try {
    mkdirSync(dir, { recursive: true });
    if (readManifest(dir)) {
      return { step, ran: false, ok: true, detail: "capture sensorium manifest present" };
    }
    writeManifest(dir, buildSensoriumManifest(dir, opts));
    return { step, ran: true, ok: true, detail: `capture sensorium manifest seeded (${dir})` };
  } catch (e) {
    return { step, ran: true, ok: false, detail: errText(e).slice(0, 160) };
  }
}

/**
 * Materialize the `memory` sensorium's manifest — content/structure/form/persistence THIN fiber-cap
 * edges, plus an in-tree `mempalace` curated-memory cap. Content stays LARARIUM-OWNED at
 * `<memory>/content` (the RUN reads its OWN content). The `mempalace` cap adds a per-sensorium curated
 * memory store at `<memory>/mempalace` — the structured home for the memories an AI authors about this
 * stream (the "flat-file memories," given entity-graph / hallways structure). Each sensorium composes
 * its own (memory here; a future twain/kumulipo its own), which RETIRES the external guest `~/.mempalace`
 * and supersedes the one-mempalace / never-bound ruling — an in-tree sovereign store binds to nothing
 * external and can never silently fall back to a guest. bands rides as the base-cap membership-address
 * grain (NO dir); coupling stays empty (memory glues no sub-sensoriums).
 */
export function materializeMemorySensorium(): PalaceSetupStep {
  return seedCaptureSensorium("memory:manifest", memorySensoriumDir(), {
    sensorium: "memory",
    lar: "lar:///ha.ka.ba/lararium/api/living-grammar-palace#palace-instance",
    caps: {
      // The content plane is a LARARIUM-OWNED store (<memory>/content), NOT the guest ~/.mempalace.
      // Adopting an existing user mempalace runs as a deliberate import Act, never a runtime binding —
      // the lararium stops depending on a store it doesn't own.
      content:     { absDir: larContentDir(), engine: "content" },
      structure:   { absDir: larStructurePalaceDir(), engine: "structurepalace" },
      form:        { absDir: larFormPalaceDir(), engine: "formpalace" },
      // The 5th part — a COSHEAF fiber (standing depends on witness edges OUTSIDE the trace, ki not li).
      persistence: { absDir: larPersistencePalaceDir(), engine: "persistence", variance: "cosheaf" },
      // The MEMPALACE arm — a per-sensorium CURATED memory store the node writes INTO "from the inside":
      // the memories an AI authors about this stream (today scattered as flat files) given a structured
      // home (entity-graph · hallways · KG). IN-TREE at <sensorium>/mempalace, sovereign-owned, one per
      // sensorium — memory keeps its curated chat memories here; a twain/kumulipo sensorium keeps its own.
      // Adopting this in-tree mempalace RETIRES the external guest ~/.mempalace install entirely (no
      // external store → the content-cap-home / never-bound / confused-deputy hazards all dissolve).
      mempalace:   { absDir: join(memorySensoriumDir(), "mempalace"), engine: "mempalace" },
    },
    // BASE cap — the FFZ membership-address grain (li-side stamp metadata). No bytes stored.
    bands: { grain: "membership", computed: "capture" },
    // APERTURE declarations — memory runs the RHIZOME mood: grounding acts exist, so the beat cell
    // is EARNABLE, through the worldline fork-DAG. Declaration-carries-authority: the enricher
    // fills only what stands declared here.
    apertures: { beat: "worldline-dag" },
    // BASE cap — the persistence dials: authority/witness mode (halfLife null → the durable interoception
    // store never cools; only a defeater lowers standing). ORTHOGONAL to ephemeral (path-A un-fuse).
    persistencePolicy: { halfLife: null },
    // BASE cap — memory couples no sub-sensoriums (the `mesh` sensorium carries WHO/AUTHORITY/FLOW).
    children: [],
    ephemeral: false,
  });
}

/**
 * Materialize the `mesh` sensorium TREE — the parent manifest that `#has` three nested children, plus
 * each child's own thin manifest. STRUCTURE only: every child declares an EMPTY `has` (clause-4 OPEN
 * record) so the parallel fills the actual stores/engines WITHOUT a structure change, and dumb edges
 * carry no role vocabulary. Returns one ledger step per manifest (parent + who/authority/flow).
 *
 *   mesh      lar:///ha.ka.ba/lararium/mesh            — minimal own caps; STRUCTURE = the 3 children.
 *   ├─ who        …/mesh/who        — identity/presence: content (presence-embeddings) + structure
 *   │                                 (the presence-graph) fill here; thin `has` until the parallel fills.
 *   ├─ authority  …/mesh/authority  — caps/keyhive: the cap-grant store; a thin content cap the parallel fills.
 *   └─ flow       …/mesh/flow       — traffic/coupling, the coupling-lobe: `coupling.children[]` RESERVED
 *                                     (empty) for the node-stream edges transfer-entropy reads. We reserve
 *                                     the slot; the read lives in the parallel's domain.
 */
export function materializeMeshSensorium(): PalaceSetupStep[] {
  const meshDir = meshSensoriumDir();
  const whoDir  = meshWhoDir();
  const authDir = meshAuthorityDir();
  const flowDir = meshFlowDir();
  const who  = persistenceInfra(whoDir);
  const auth = persistenceInfra(authDir);
  const flow = persistenceInfra(flowDir);
  return [
    materializeSensorium("mesh:manifest", meshDir, {
      sensorium: "mesh",
      lar: "lar:///ha.ka.ba/lararium/mesh",
      caps: {},
      children: [
        { sensorium: "who",       absDir: whoDir  },
        { sensorium: "authority", absDir: authDir },
        { sensorium: "flow",      absDir: flowDir },
      ],
      ephemeral: false,
    }),
    // Every sensorium carries the persistence infrastructure — the perceptual fibers (content/
    // structure) the parallel fills WHEN it perceives them; the persistence cap it #has from birth.
    materializeSensorium("mesh:who:manifest", whoDir, {
      sensorium: "who",
      lar: "lar:///ha.ka.ba/lararium/mesh/who",
      caps: { ...who.cap },
      persistencePolicy: who.persistencePolicy,
      ephemeral: false,
    }),
    materializeSensorium("mesh:authority:manifest", authDir, {
      sensorium: "authority",
      lar: "lar:///ha.ka.ba/lararium/mesh/authority",
      caps: { ...auth.cap },
      persistencePolicy: auth.persistencePolicy,
      ephemeral: false,
    }),
    materializeSensorium("mesh:flow:manifest", flowDir, {
      sensorium: "flow",
      lar: "lar:///ha.ka.ba/lararium/mesh/flow",
      caps: { ...flow.cap },
      persistencePolicy: flow.persistencePolicy,
      // BASE cap — the coupling-lobe RESERVES its child-edges (empty) for the node-stream effective-
      // connectivity the parallel's transfer-entropy read consults. Reserved slot; no read here.
      children: [],
      ephemeral: false,
    }),
  ];
}

/**
 * Materialize the `memetic-wikitext` sensorium TREE — the nameless top entity that `#has` NO fiber cap
 * and TWO co-located PEER children (formal ⋈ informal) as dumb `coupling.children[]` edges, NEITHER on
 * top (memetic-wikitext-sensorium.ts). Each peer carries a THIN `content` cap whose bytes ARE its own
 * dir (serialized `"."` — the self-cap). STRUCTURE only: the peers' content stores fill elsewhere; here
 * we stamp the three manifests so the tree self-describes and the coupling read has children to resolve.
 * Returns one ledger step per manifest (top + formal + informal).
 */
export function materializeMemeticWikitextSensorium(): PalaceSetupStep[] {
  const topDir      = memeticWikitextSensoriumDir();
  const formalDir   = memeticWikitextFormalDir();
  const informalDir = memeticWikitextInformalDir();
  const bands = defaultSensoriumBands();
  const formal   = persistenceInfra(formalDir);
  const informal = persistenceInfra(informalDir);
  return [
    materializeSensorium("memetic-wikitext:manifest", topDir, {
      sensorium: "memetic-wikitext",
      lar: "lar:///ha.ka.ba/lares/api/memetic-wikitext-sensorium",
      caps: {},                                        // the top holds NO byte-storing fiber cap
      bands,
      children: [
        { sensorium: "formal",   absDir: formalDir },
        { sensorium: "informal", absDir: informalDir },
      ],
      ephemeral: false,
    }),
    // Each peer carries the persistence infrastructure beside its content self-cap.
    materializeSensorium("memetic-wikitext:formal:manifest", formalDir, {
      sensorium: "formal",
      lar: "lar:///ha.ka.ba/lares/api/memetic-wikitext-sensorium#formal",
      caps: { content: { absDir: formalDir, engine: "mempalace" }, ...formal.cap },   // memes-on-disk corpus (self-cap → ".") + persistence
      persistencePolicy: formal.persistencePolicy,
      bands,
      ephemeral: false,
    }),
    materializeSensorium("memetic-wikitext:informal:manifest", informalDir, {
      sensorium: "informal",
      lar: "lar:///ha.ka.ba/lares/api/memetic-wikitext-sensorium#informal",
      caps: { content: { absDir: informalDir, engine: "mempalace" }, ...informal.cap }, // chat-sessions corpus (self-cap → ".") + persistence
      persistencePolicy: informal.persistencePolicy,
      bands,
      ephemeral: false,
    }),
  ];
}

/**
 * Stand up EVERY palace organ across the registry — wire-once / detect-existing, fully idempotent.
 * Each organ's step is `healthy ? {ran:false, ok:true, "present"} : init()`, and each init result is
 * re-probed so the ledger reports whether the store actually materialized. Returns the combined
 * `PalaceSetupStep[]` ledger (organs with no `init` only get probed). A re-run on a stood-up vessel
 * reads all "present".
 */
export function setupPalaceOrgans(): PalaceSetupStep[] {
  const steps: PalaceSetupStep[] = [];
  for (const organ of palaceOrgans()) {
    if (organHealthy(organ)) {
      steps.push({ step: organ.name, ran: false, ok: true, detail: "present" });
      continue;
    }
    if (!organ.init) {
      steps.push({ step: organ.name, ran: false, ok: false, detail: `absent + no init (${organ.dir})` });
      continue;
    }
    const initSteps = organ.init();
    // Cheap health probe: re-confirm the store materialized after init.
    const healthy = organHealthy(organ);
    for (const s of initSteps) {
      // The probe verdict gates the organ's PRIMARY step (named === organ.name); sub-steps pass through.
      steps.push(s.step === organ.name && s.ran ? { ...s, ok: s.ok && healthy } : s);
    }
  }
  // Stamp the SHEAF-TRUE manifests so each sensorium dir self-describes its cap-stack: the `memory`
  // sensorium, the `mesh` sensorium TREE (parent + who/authority/flow), then the `memetic-wikitext`
  // sensorium TREE (top + formal/informal peers).
  steps.push(materializeMemorySensorium());
  steps.push(...materializeMeshSensorium());
  steps.push(...materializeMemeticWikitextSensorium());
  return steps;
}
