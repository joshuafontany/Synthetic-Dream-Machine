/**
 * env — the ONE environment contract every CLI command and the test harness honor.
 *
 *   LAR_ROOT  — the CORPUS/resource root of ONE daemon's holdings (bags · wikis · genesis).
 *               Explicit siting, never a silent global-tree default: an operator points each
 *               daemon at ITS resources. The VESSEL STATE roots separately, in the operator's
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
import { larDataDir, loadVesselVerifyingKey, loadPersonaGroupRootVerifyingKey, runtimeCasOverride } from "@lararium/node";

// The vessel runtime-state resolvers — defined once in @lararium/node, surfaced here.
export {
  larHome, larDataDir, larIdentityDir, larProjectionDir, larSealHome, larBootstrapPath,
  larHarvestDir, larHarvestStageDir, larStructurePalaceDir, larFormPalaceDir,
  larariumDataHome,
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
  if (opts.larRootEnv) return opts.larRootEnv;      // explicit per-daemon siting (also the ephemeral sandbox)
  if (opts.presetEnabled) return opts.repoRoot;     // the named repo dev-preset opts in
  throw new Error(
    "no corpus root sited — set LAR_ROOT to this daemon's resource tree, or enable the repo " +
    "dev-preset (LAR_DEV_REPO_ROOT=1, or a committed lar-dev-root.json marker). No silent repo default.",
  );
}

/**
 * CORPUS/resource root — the base each daemon sites EXPLICITLY (bags · wikis · genesis derive off
 * it unless independently overridden). LAR_ROOT sites it; the named repo dev-preset opts the checkout
 * in; unconfigured throws a CLEAN error (mirroring vesselDid — no silent global-tree fallback).
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
// Each resource sites INDEPENDENTLY off its own env var (a #has cap the daemon carries), else derives
// off the corpus root. A nameless-entity's resource cap-stack composes from these, resource by resource.

/** The bags dir — `LAR_BAGS`, else `<corpus>/bags`. The daemon's holdings tree. */
export function larBagsDir(): string {
  return process.env["LAR_BAGS"] ?? join(larRoot(), "bags");
}

/** The wikis dir — `LAR_WIKIS`, else `<corpus>/wikis`. The projection tree. */
export function larWikisDir(): string {
  return process.env["LAR_WIKIS"] ?? join(larRoot(), "wikis");
}

/** The genesis dir — `LAR_GENESIS`, else `<corpus>/genesis`. TRACKED SEED ALONE (island + cas), identical
 *  for every vessel. The per-vessel bootstrap left it for the store — see larBootstrapPath. */
export function larGenesisDir(): string {
  return process.env["LAR_GENESIS"] ?? join(larRoot(), "genesis");
}

/**
 * The CAS dir — `LAR_CAS`, else `<vessel-state>/cas` (larDataDir-adjacent). The content-addressed
 * store holds RUNTIME vessel state, never the corpus/repo: its blobs rebuild from the `bags/` carriers
 * on each seed, so they stay OUT of the tracked tree. `bags`/`wikis`/`genesis` root off the corpus;
 * the CAS roots off the vessel-state home (like the store) — the one resource cap that is state, not corpus.
 */
export function larCasDir(): string {
  return runtimeCasOverride() ?? join(larDataDir(), "cas");   // LAR_CAS → config.vessel.cas → <state>/cas
}

/** Daemon WS port — LAR_PORT or 8080. */
export function larPort(): number {
  return Number(process.env["LAR_PORT"] ?? 8080);
}

// ── The two DIDs a vessel speaks — the True Name Model, held apart ────────────────────────────────
// The PLACE and the HUMAN carry DISTINCT keys, bound by a signed delegation edge that never merges
// them (mesh/device-delegation v2; node-vessel-identity states the invariant in full):
//   · vesselDid()      — the PLACE's own key, minted per-install, NEVER copied to another vessel.
//                        Every wire call presents THIS one: the Place is what asks.
//   · personaRootDid() — the HUMAN's PersonaGroup root, a distinct slot the founder custodies. It
//                        SIGNS delegation edges; it never rides a verb request.
// A single key copied across a user's vessels would present one collector to every verifier — one bit
// linking every self. Naming the two apart is what keeps the veil implementable.

/**
 * The VESSEL's DID (0x + verifying key) from this install's key file — the PLACE's own name, the
 * `requested-by` every cap-gated verb carries.
 *
 * Throws a CLEAN error when absent — a placeholder string would only fail later as
 * "bad hex length" inside capability verification. No fallbacks.
 */
export async function vesselDid(): Promise<string> {
  try {
    return "0x" + (await loadVesselVerifyingKey(larDataDir()));
  } catch {
    throw new Error(`no vessel key under ${larDataDir()} — run \`lares vessel found\` (or point LAR_ROOT at an initialized instance)`);
  }
}

/**
 * The PERSONA ROOT's DID (0x + verifying key) at `handleIndex` — the HUMAN this vessel delegates
 * through, the identifier peers PIN to verify the vessel's delegation edge offline. Reads the
 * PersonaGroup root; it NEVER falls back to the vessel key (that fallback would be the conflation
 * itself) and it never mints — a read stands no sovereign key up.
 *
 * Throws a CLEAN error when this vessel custodies no root there: a joinee holds the founder's public
 * DID plus a signed edge instead of a root, and an unfounded vessel holds neither.
 */
export async function personaRootDid(handleIndex = 0): Promise<string> {
  const vk = await loadPersonaGroupRootVerifyingKey(larDataDir(), handleIndex).catch(() => undefined);
  if (!vk) {
    throw new Error(
      `no persona root h${handleIndex} under ${larDataDir()} — this vessel custodies no operator root ` +
      `(found with \`lares vessel found\`, or read the pinned signer DID an admit payload carried)`,
    );
  }
  return "0x" + vk;
}
