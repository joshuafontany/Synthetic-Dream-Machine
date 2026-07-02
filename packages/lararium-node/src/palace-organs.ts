/**
 * palace-organs — the ONE shared enumerator for the local palace organs (the durable mempalace
 * instances the operator's vessel stands), so setup (`lares wake --init`) and teardown
 * (`lares palace-teardown`) read the SAME list and can never drift.
 *
 * The five organs (the astral palaces made filesystem):
 *   - mempalace   ~/.mempalace (or $MEMPALACE_PALACE_PATH) — the VERBATIM content store; the
 *                 worldline-KG knowledge_graph.sqlite3 lives INSIDE it, so it stands FIRST.
 *   - structurepalace   <memory>/structure  — the structural-AST store (a 2nd mempalace instance).
 *   - formpalace  <memory>/form       — the living-grammar FORM-vector store (a 3rd instance).
 *   - meshpalace  <data>/sensoriums/mesh — the `mesh` SENSORIUM (stood LAST: it couples to a live
 *                 node). It `#has` three nested child sensoriums — WHO · AUTHORITY · FLOW — each its
 *                 own dir + thin manifest; the mesh's own caps stay minimal. Here we wire only the
 *                 directory STRUCTURE + stamp the manifests; the feed/carriage + cap-content live elsewhere.
 *
 * Each organ carries a resolved `dir` (never an ambient default), an optional `init` that STANDS it
 * up when absent (idempotent: a present dir is never re-init'd), and a cheap `healthProbe` that
 * answers "did the store materialize?". The ChromaDB-backed instances (ast/form/mesh) create their
 * collection lazily on first holder `put`, so `init` only needs to ensure the directory exists; the
 * verbatim mempalace needs the real `mempalace init` + the auto_save off-switch.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mempalace/genesis-doc
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
 * Stand up the VERBATIM mempalace: `mempalace init <repo> --yes --no-llm` when no config exists
 * (non-interactive, heuristics-only), then pin `hooks.auto_save = false` — THE re-pollution gate
 * (a fresh init defaults it true and the plugin hooks fire independent of settings.json, so without
 * this the `sessions` mega-wing returns on the first turn). Both legs idempotent.
 */
function initMempalace(): PalaceSetupStep[] {
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
 * The palace-organ registry — the ONE list both setup and teardown enumerate. Resolved dirs, in
 * dependency order: mempalace first (the worldline-KG lives inside it), ast/form in any order,
 * meshpalace last (it couples to a live node; the directory wiring is all we do here).
 */
export function palaceOrgans(): PalaceOrgan[] {
  const mempalaceDir = larMempalaceDir();
  return [
    {
      name: "mempalace",
      dir: mempalaceDir,
      init: initMempalace,
      healthProbe: () => existsSync(join(mempalaceDir, "config.json")),
    },
    { name: "structurepalace",  dir: larStructurePalaceDir(),  init: ensureDirOrgan("structurepalace",  larStructurePalaceDir())  },
    { name: "formpalace", dir: larFormPalaceDir(), init: ensureDirOrgan("formpalace", larFormPalaceDir()) },
    // The `persistence` cosheaf cap store (the 5th part) — a caller-vector instance holding Testimony
    // atoms; the `memory` sensorium composes it (authority mode). Lazy collection like ast/form: init = ensure dir.
    { name: "persistencepalace", dir: larPersistencePalaceDir(), init: ensureDirOrgan("persistencepalace", larPersistencePalaceDir()) },
    // The LARARIUM-OWNED content plane (Option B) — a caller-vector content store the memory sensorium
    // owns (<memory>/content), sovereign from the guest ~/.mempalace. Lazy collection: init = ensure dir.
    { name: "contentpalace", dir: larContentDir(), init: ensureDirOrgan("contentpalace", larContentDir()) },
    // The `mesh` sensorium TREE — the parent dir plus its three nested children (who/authority/flow),
    // each enumerated so setup stands + teardown reaps them. Structure only; the parallel fills the caps.
    { name: "meshpalace",     dir: larMeshPalaceDir(),  init: ensureDirOrgan("meshpalace",     larMeshPalaceDir())  },
    { name: "mesh:who",       dir: meshWhoDir(),        init: ensureDirOrgan("mesh:who",       meshWhoDir())        },
    { name: "mesh:authority", dir: meshAuthorityDir(),  init: ensureDirOrgan("mesh:authority", meshAuthorityDir())  },
    { name: "mesh:flow",      dir: meshFlowDir(),       init: ensureDirOrgan("mesh:flow",      meshFlowDir())       },
    // The `memetic-wikitext` sensorium TREE — the top plus its two co-located PEER children (formal ⋈
    // informal), NEITHER on top. Structure only here (dirs + manifests); the peers' content stores fill
    // elsewhere. The top's coupling.children carry the peers; the coupling read runs the H¹ gate over them.
    { name: "memetic-wikitext",          dir: memeticWikitextSensoriumDir(), init: ensureDirOrgan("memetic-wikitext",          memeticWikitextSensoriumDir()) },
    { name: "memetic-wikitext:formal",   dir: memeticWikitextFormalDir(),    init: ensureDirOrgan("memetic-wikitext:formal",   memeticWikitextFormalDir())    },
    { name: "memetic-wikitext:informal", dir: memeticWikitextInformalDir(),  init: ensureDirOrgan("memetic-wikitext:informal", memeticWikitextInformalDir())  },
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
 * Materialize the `memory` sensorium's manifest — content/structure/form as THIN fiber-cap edges in a
 * MIXED layout: content ABSOLUTE (the content-cap-home ruling keeps it external at `~/.mempalace`),
 * structure/form RELATIVE (inside the tree) — {@link larMempalaceDir} et al. report where the bytes
 * actually are and {@link capDecl} chooses per cap. bands as the base-cap interval-grain (wavelet,
 * computed on read — NO dir), and an empty coupling (memory glues no sub-sensoriums).
 */
export function materializeMemorySensorium(): PalaceSetupStep {
  return materializeSensorium("memory:manifest", memorySensoriumDir(), {
    sensorium: "memory",
    lar: "lar:///ha.ka.ba/@lararium/api/living-grammar-palace#palace-instance",
    caps: {
      // Option B (sovereign memory): the content plane is a LARARIUM-OWNED store (<memory>/content),
      // NOT the guest ~/.mempalace. Adopting an existing user mempalace is a deliberate import Act
      // (SCRUM S3.2), never a runtime binding — the lararium stops depending on a store it doesn't own.
      content:     { absDir: larContentDir(), engine: "content" },
      structure:   { absDir: larStructurePalaceDir(), engine: "structurepalace" },
      form:        { absDir: larFormPalaceDir(), engine: "formpalace" },
      // The 5th part — a COSHEAF fiber (standing depends on witness edges OUTSIDE the trace, ki not li).
      persistence: { absDir: larPersistencePalaceDir(), engine: "persistence", variance: "cosheaf" },
    },
    // BASE cap — interval-grain metadata only; the wavelet bands compute on read, no bytes stored.
    bands: { grain: "wavelet", computed: "on-read" },
    // BASE cap — the persistence dials: authority/witness mode (halfLife null → the durable interoception
    // store never cools; only a defeater lowers standing). ORTHOGONAL to ephemeral (path-A un-fuse).
    persistencePolicy: { admitThreshold: 0.5, halfLife: null },
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
 *   mesh      lar:///ha.ka.ba/@lararium/mesh            — minimal own caps; STRUCTURE = the 3 children.
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
  return [
    materializeSensorium("mesh:manifest", meshDir, {
      sensorium: "mesh",
      lar: "lar:///ha.ka.ba/@lararium/mesh",
      caps: {},
      children: [
        { sensorium: "who",       absDir: whoDir  },
        { sensorium: "authority", absDir: authDir },
        { sensorium: "flow",      absDir: flowDir },
      ],
      ephemeral: false,
    }),
    materializeSensorium("mesh:who:manifest", whoDir, {
      sensorium: "who",
      lar: "lar:///ha.ka.ba/@lararium/mesh/who",
      caps: {},
      ephemeral: false,
    }),
    materializeSensorium("mesh:authority:manifest", authDir, {
      sensorium: "authority",
      lar: "lar:///ha.ka.ba/@lararium/mesh/authority",
      caps: {},
      ephemeral: false,
    }),
    materializeSensorium("mesh:flow:manifest", flowDir, {
      sensorium: "flow",
      lar: "lar:///ha.ka.ba/@lararium/mesh/flow",
      caps: {},
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
  return [
    materializeSensorium("memetic-wikitext:manifest", topDir, {
      sensorium: "memetic-wikitext",
      lar: "lar:///ha.ka.ba/@lares/api/lares/memetic-wikitext-sensorium",
      caps: {},                                        // the top holds NO byte-storing fiber cap
      bands,
      children: [
        { sensorium: "formal",   absDir: formalDir },
        { sensorium: "informal", absDir: informalDir },
      ],
      ephemeral: false,
    }),
    materializeSensorium("memetic-wikitext:formal:manifest", formalDir, {
      sensorium: "formal",
      lar: "lar:///ha.ka.ba/@lares/api/lares/memetic-wikitext-sensorium#formal",
      caps: { content: { absDir: formalDir, engine: "mempalace" } },   // the memes-on-disk corpus (self-cap → ".")
      bands,
      ephemeral: false,
    }),
    materializeSensorium("memetic-wikitext:informal:manifest", informalDir, {
      sensorium: "informal",
      lar: "lar:///ha.ka.ba/@lares/api/lares/memetic-wikitext-sensorium#informal",
      caps: { content: { absDir: informalDir, engine: "mempalace" } }, // the chat-sessions corpus (self-cap → ".")
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
