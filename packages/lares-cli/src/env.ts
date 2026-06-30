/**
 * env — the ONE environment contract every CLI command and the test harness honor.
 *
 *   LAR_ROOT  — isolated-instance root. Default split: the CORPUS/code root is the repo
 *               (larRoot); the VESSEL STATE roots in the operator's home (~/.lares, see larHome).
 *               Setting LAR_ROOT overrides BOTH to one tree (the test harness / staged pairs).
 *   LAR_PORT  — daemon WS port. Default 8080.
 *   LAR_TARGET — harness mode selector ("staged" | "live"); the CLI ignores it, the harness reads it.
 *
 * The vessel-path resolvers live ONCE in @lararium/node (so the CLI and the daemon agree on the
 * storage dir + the UDS socket); re-exported here so commands keep importing them from `env`.
 */

import { join } from "node:path";
import { repoRoot } from "@lararium/mesh/node";
import { larDataDir, loadVesselVerifyingKey } from "@lararium/node";

// The vessel runtime-state resolvers — defined once in @lararium/node, surfaced here.
export {
  larHome, larDataDir, larIdentityDir, larProjectionDir,
  larHarvestDir, larHarvestStageDir, larAstPalaceDir, larFormPalaceDir,
} from "@lararium/node";

/** CORPUS/code root — LAR_ROOT or the repo root. (The vessel STATE roots in the home; see larHome.) */
export function larRoot(): string {
  return process.env["LAR_ROOT"] ?? repoRoot;
}

/** The runtime bootstrap artifact — `<larRoot>/genesis/social-bootstrap.json`. Genesis (the baked
 *  island.bin seed + this artifact) stays CORPUS-relative — tracked seed, not runtime vessel state. */
export function larBootstrapPath(): string {
  return join(larRoot(), "genesis", "social-bootstrap.json");
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
