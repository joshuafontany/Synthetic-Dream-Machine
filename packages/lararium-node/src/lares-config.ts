/**
 * lares-config — the per-@daemon resource-override reader + the composable daemon resource caps.
 *
 * An operator sites ONE @daemon's corpus resources (bags · genesis · cas) away from the repo-relative
 * default by writing `~/.lares/config.json`. Genesis artifacts ride the repo checkout BY DEFAULT (tracked
 * seed), so the base stays repo-relative and a fresh clone with no config boots exactly as before; the
 * config file OVERRIDES a resource to a `~`-derived dir when the operator sites one.
 *
 * The reader stays PURE + well-guarded: a missing file yields an empty config (the repo-relative defaults
 * stand), a malformed file THROWS a clear error naming the path (a typo SURFACES, never silently degrades
 * the boot). The composable caps below resolve THROUGH it — each resource sites INDEPENDENTLY (a #has cap
 * the @daemon carries): its OWN env var first, the config file next, else it derives off the corpus root.
 * No silent global-tree fallback — the base names the repo checkout EXPLICITLY, never $HOME.
 *
 * This mirrors the CLI env-contract shape (lares-cli `env.ts`), on the daemon side: the CLI corpus-root
 * THROWS when unsited (an operator points each @daemon), whereas the daemon DEFAULTS repo-relative because
 * the genesis seed lives in the checkout — so a headless boot needs no config to stand.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "@lararium/mesh/node";
import { larHome } from "./vessel-paths.js";

/** Per-resource root overrides an operator may site in `~/.lares/config.json`. Each sites INDEPENDENTLY. */
export interface LaresResourceRoots {
  /** The @daemon's holdings tree — overrides `<corpus>/bags`. */
  readonly bags?:    string;
  /** The tracked genesis seed dir (island.bin + bootstrap + cas/) — overrides `<corpus>/genesis`. */
  readonly genesis?: string;
  /** The genesis CAS-SOURCE dir (the tracked `genesis/cas/<cid>` blobs) — overrides `<genesis>/cas`.
   *  NOT the runtime vessel cas (that roots off vessel storage and rides the `LAR_CAS` env lever). */
  readonly cas?:     string;
}

/** The `~/.lares/config.json` shape. `resources` carries the per-@daemon resource-root overrides. */
export interface LaresConfig {
  readonly resources?: LaresResourceRoots;
}

/** The per-@daemon config file — `~/.lares/config.json`. LAR_ROOT-isolated for staged pairs (larHome
 *  honors LAR_ROOT), so each isolated instance reads its OWN overrides. */
export function laresConfigPath(): string {
  return join(larHome(), "config.json");
}

/**
 * Read `~/.lares/config.json` — PURE + well-guarded. A missing file yields `{}` (the repo-relative
 * defaults stand); an unreadable or malformed file THROWS a clear error naming the path (a typo
 * SURFACES, never silently degrades the boot). The `path` param stays injectable so the reader tests
 * without touching the operator's home.
 */
export function loadLaresConfig(path: string = laresConfigPath()): LaresConfig {
  if (!existsSync(path)) return {};   // no override sited — the repo-relative defaults stand
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    throw new Error(`[lares config] cannot read ${path}: ${(err as Error).message}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`[lares config] malformed JSON in ${path}: ${(err as Error).message}`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    const got = parsed === null ? "null" : Array.isArray(parsed) ? "array" : typeof parsed;
    throw new Error(`[lares config] ${path} must hold a JSON object, got ${got}`);
  }
  return parsed as LaresConfig;
}

// ── The composable daemon resource caps ───────────────────────────────────────────────────────────
// Each resource sites INDEPENDENTLY: its OWN env var (ephemeral) → the config file (per-@daemon) →
// derives off the repo-relative corpus root (genesis artifacts stay checked-in by default). Precedence:
// env > config > repo-default. The config arg stays injectable so a caller reads the file ONCE per boot
// and threads it, and so the resolvers test deterministically.

/** The daemon corpus root — `LAR_ROOT` (isolated instance) else the repo checkout. Genesis artifacts
 *  ride the repo BY DEFAULT, so the base stays repo-relative; per-resource overrides sit BELOW it. */
export function daemonCorpusRoot(): string {
  return process.env["LAR_ROOT"] ?? repoRoot;
}

/** The genesis dir — `LAR_GENESIS` → `config.resources.genesis` → `<corpus>/genesis`. Tracked seed
 *  (island.bin + social-bootstrap + cas/). */
export function daemonGenesisDir(cfg: LaresConfig = loadLaresConfig()): string {
  return process.env["LAR_GENESIS"] ?? cfg.resources?.genesis ?? join(daemonCorpusRoot(), "genesis");
}

/** The bags dir — `LAR_BAGS` → `config.resources.bags` → `<corpus>/bags`. The @daemon's holdings tree. */
export function daemonBagsDir(cfg: LaresConfig = loadLaresConfig()): string {
  return process.env["LAR_BAGS"] ?? cfg.resources?.bags ?? join(daemonCorpusRoot(), "bags");
}

/** The genesis CAS-SOURCE dir — `config.resources.cas` → `<genesis>/cas`. The tracked byte source
 *  (`genesis/cas/<cid>`); it rides genesisDir by default so a `config.genesis` override carries it. This
 *  reads NO env var: `LAR_CAS` is the RUNTIME vessel-cas lever (a distinct resource, storage-rooted). */
export function daemonCasDir(cfg: LaresConfig = loadLaresConfig()): string {
  return cfg.resources?.cas ?? join(daemonGenesisDir(cfg), "cas");
}
