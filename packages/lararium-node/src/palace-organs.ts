/**
 * palace-organs — the ONE shared enumerator for the local palace organs (the durable mempalace
 * instances the operator's vessel stands), so setup (`lares wake --init`) and teardown
 * (`lares palace-teardown`) read the SAME list and can never drift.
 *
 * The five organs (the astral palaces made filesystem):
 *   - mempalace   ~/.mempalace (or $MEMPALACE_PALACE_PATH) — the VERBATIM content store; the
 *                 worldline-KG knowledge_graph.sqlite3 lives INSIDE it, so it stands FIRST.
 *   - astpalace   ~/.lares/.astpalace   — the structural-AST store (a 2nd mempalace instance).
 *   - formpalace  ~/.lares/.formpalace  — the living-grammar FORM-vector store (a 3rd instance).
 *   - meshpalace  ~/.lares/.meshpalace  — the federation bridge STORE (stood LAST: it couples to a
 *                 live node; here we wire only the directory, the feed/carriage logic lives elsewhere).
 *
 * Each organ carries a resolved `dir` (never an ambient default), an optional `init` that STANDS it
 * up when absent (idempotent: a present dir is never re-init'd), and a cheap `healthProbe` that
 * answers "did the store materialize?". The ChromaDB-backed instances (ast/form/mesh) create their
 * collection lazily on first holder `put`, so `init` only needs to ensure the directory exists; the
 * verbatim mempalace needs the real `mempalace init` + the auto_save off-switch.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mempalace/genesis-doc
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";
import { repoRoot } from "@lararium/mesh/node";
import { larMempalaceDir, larAstPalaceDir, larFormPalaceDir, larMeshPalaceDir } from "./vessel-paths.js";

/** One ledger line from a setup pass — {@link setupPalaceOrgans} returns these (table/JSON-renderable). */
export interface PalaceSetupStep {
  /** the organ (or sub-step) name, e.g. "mempalace" | "mempalace:auto-save-off" | "astpalace" */
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

/** Prefer the user-installed mempalace CLI (~/.local/bin), fall back to PATH. */
function resolveMempalaceExe(): string {
  const exe = process.platform === "win32" ? "mempalace.exe" : "mempalace";
  const local = join(homedir(), ".local", "bin", exe);
  return existsSync(local) ? local : "mempalace";
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
      writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
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
    { name: "astpalace",  dir: larAstPalaceDir(),  init: ensureDirOrgan("astpalace",  larAstPalaceDir())  },
    { name: "formpalace", dir: larFormPalaceDir(), init: ensureDirOrgan("formpalace", larFormPalaceDir()) },
    { name: "meshpalace", dir: larMeshPalaceDir(), init: ensureDirOrgan("meshpalace", larMeshPalaceDir()) },
  ];
}

/** Did this organ already materialize? (its own probe, or `existsSync(dir)`). */
export function organHealthy(organ: PalaceOrgan): boolean {
  return organ.healthProbe ? organ.healthProbe() : existsSync(organ.dir);
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
  return steps;
}
