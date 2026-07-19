/**
 * env — the ONE environment contract every CLI command and the test harness honor.
 *
 *   LAR_ROOT  — the CORPUS/resource root of ONE @daemon's holdings (bags · wikis · genesis).
 *               Explicit siting, never a silent global-tree default: an operator points each
 *               @daemon at ITS resources. The VESSEL STATE roots separately, in the operator's
 *               home (~/.lares, see larHome); LAR_ROOT also isolates that state for staged pairs.
 *   LAR_BAGS · LAR_WIKIS · LAR_GENESIS · LAR_CAS — per-resource overrides. Each resource sites
 *               INDEPENDENTLY (composable #has caps); unset → it derives off LAR_ROOT.
 *   LAR_DEV_REPO_ROOT — the named repo DEV-PRESET switch. Truthy → the repo checkout stands as the
 *               corpus root. A committed `<repo>/lar-dev-root.json` marker opts a checkout in the
 *               same way (this dev install carries one), so the local workflow keeps its zero-config feel.
 *   LAR_PORT  — daemon WS port. Default 8080.
 *   LAR_TARGET — harness mode selector ("staged" | "live"); the CLI ignores it, the harness reads it.
 *
 * The vessel-path resolvers live ONCE in @lararium/node (so the CLI and the daemon agree on the
 * storage dir + the UDS socket); re-exported here so commands keep importing them from `env`.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "@lararium/mesh/node";
import { larDataDir, loadVesselVerifyingKey } from "@lararium/node";

// The vessel runtime-state resolvers — defined once in @lararium/node, surfaced here.
export {
  larHome, larDataDir, larIdentityDir, larProjectionDir,
  larHarvestDir, larHarvestStageDir, larStructurePalaceDir, larFormPalaceDir,
} from "@lararium/node";

/** The committed marker that opts a checkout in as the repo dev-preset corpus root. */
const DEV_ROOT_MARKER = "lar-dev-root.json";

/**
 * Whether the repo DEV-PRESET stands — a NAMED opt-in, never a silent fallback. Truthy via the
 * `LAR_DEV_REPO_ROOT` env switch (CI / one-off), or a committed `<repo>/lar-dev-root.json` marker
 * (a checkout naming ITSELF the local corpus). Absent both, the repo never sites the corpus.
 */
export function repoPresetEnabled(): boolean {
  if (process.env["LAR_DEV_REPO_ROOT"]) return true;
  return existsSync(join(repoRoot, DEV_ROOT_MARKER));
}

/**
 * The pure corpus-root resolution — explicit siting first, the named preset second, a clean throw
 * last. Held separate from the process-env read so the resolution law tests deterministically.
 */
export function resolveLarRoot(opts: {
  larRootEnv?: string | undefined;
  presetEnabled: boolean;
  repoRoot: string;
}): string {
  if (opts.larRootEnv) return opts.larRootEnv;      // explicit per-@daemon siting (also the ephemeral sandbox)
  if (opts.presetEnabled) return opts.repoRoot;     // the named repo dev-preset opts in
  throw new Error(
    "no corpus root sited — set LAR_ROOT to this @daemon's resource tree, or enable the repo " +
    "dev-preset (LAR_DEV_REPO_ROOT=1, or a committed lar-dev-root.json marker). No silent repo default.",
  );
}

/**
 * CORPUS/resource root — the base each @daemon sites EXPLICITLY (bags · wikis · genesis derive off
 * it unless independently overridden). LAR_ROOT sites it; the named repo dev-preset opts the checkout
 * in; unconfigured throws a CLEAN error (mirroring operatorDid — no silent global-tree fallback).
 * The vessel STATE roots separately, in the home (see larHome).
 */
export function larRoot(): string {
  return resolveLarRoot({
    larRootEnv: process.env["LAR_ROOT"],
    presetEnabled: repoPresetEnabled(),
    repoRoot,
  });
}

// ── Composable resource caps ──────────────────────────────────────────────────────────────────────
// Each resource sites INDEPENDENTLY off its own env var (a #has cap the @daemon carries), else derives
// off the corpus root. A nameless-entity's resource cap-stack composes from these, resource by resource.

/** The bags dir — `LAR_BAGS`, else `<corpus>/bags`. The @daemon's holdings tree. */
export function larBagsDir(): string {
  return process.env["LAR_BAGS"] ?? join(larRoot(), "bags");
}

/** The wikis dir — `LAR_WIKIS`, else `<corpus>/wikis`. The projection tree. */
export function larWikisDir(): string {
  return process.env["LAR_WIKIS"] ?? join(larRoot(), "wikis");
}

/** The genesis dir — `LAR_GENESIS`, else `<corpus>/genesis`. Tracked seed (island.bin + bootstrap). */
export function larGenesisDir(): string {
  return process.env["LAR_GENESIS"] ?? join(larRoot(), "genesis");
}

/**
 * The CAS dir SEAM — `LAR_CAS`, else `<corpus>/cas`. Reserved for @cad's future content-addressed
 * store; the resolver sites the resource so @cad lands into a ready cap, no re-plumbing of the root.
 */
export function larCasDir(): string {
  return process.env["LAR_CAS"] ?? join(larRoot(), "cas");
}

/** The runtime bootstrap artifact — `<genesis>/social-bootstrap.json`. Routes through larGenesisDir
 *  so a LAR_GENESIS override carries. Genesis stays tracked seed, never runtime vessel state. */
export function larBootstrapPath(): string {
  return join(larGenesisDir(), "social-bootstrap.json");
}

/** Daemon WS port — LAR_PORT or 8080. */
export function larPort(): number {
  return Number(process.env["LAR_PORT"] ?? 8080);
}

/**
 * The operator's DID (0x + verifying key) from the instance's key file.
 * Throws a CLEAN error when absent — a placeholder string would only fail later as
 * "bad hex length" inside capability verification. No fallbacks.
 */
export async function operatorDid(): Promise<string> {
  try {
    return "0x" + (await loadVesselVerifyingKey(larDataDir()));
  } catch {
    throw new Error(`no operator key under ${larDataDir()} — run \`lares init\` (or point LAR_ROOT at an initialized instance)`);
  }
}
